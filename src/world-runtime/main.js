import * as N from '../engine/index.js';
import { Engine } from '../core/Engine.js';
import { Input } from '../core/Input.js';
import { GPU } from '../engine/gpu/GPU.js';
import { G } from '../engine/render/Frame.js';
import { SceneRenderer } from '../core/SceneRenderer.js';
import { SunShadows } from '../engine/render/Shadows.js';
import { Atmosphere, SUN_ILLUMINANCE } from '../sky/Atmosphere.js';
import { Sky, sunDirectionFromTime } from '../sky/Sky.js';
import { SkyProClouds } from '../sky/SkyProClouds.js';
import { Environment } from '../sky/Environment.js';
import { PostFX } from '../post/PostFX.js';
import { NativeWeather } from './NativeWeather.js';
import { createDryWorldMedium, terrainMistBase } from './DriftingMist.js';
import { hostedRepositorySource } from './HostedRepository.js';
import { localRepositorySource } from './LocalRepositoryFiles.js';
import { RepositorySession } from './RepositorySession.js';
import { RepositoryWorldHost } from './RepositoryWorldHost.js';
import { parseGitHubWorldLocation, resolveGitHubWorldSource } from './vendor/world-engine-contract.js';

const status=document.querySelector('#status'),hud=document.querySelector('#hud'),terminal=document.querySelector('#terminal');
const report=message=>status.textContent=message;
async function init(){
 const engine=new Engine(document.querySelector('#app'));engine.maxOutputPixels=1000000;await engine.init();engine.meshRenderer.syncPipelines=true;
 const input=new Input(engine.canvas,{keyboardLookBlocked:()=>terminal.open});
 const atmosphere=new Atmosphere(engine),sky=new Sky(atmosphere),clouds=new SkyProClouds(engine,atmosphere);await clouds.ready;sky.clouds=clouds;
 const environment=new Environment(engine,engine.scene,sky,128),shadows=new SunShadows({size:1024}),weather=new NativeWeather();engine.scene.add(weather.group);
 const renderer=new SceneRenderer(engine.meshRenderer,engine.scene,engine.camera);renderer.background=sky.background;renderer.waterMaterial={needsSSRDepth:false};
 const medium=createDryWorldMedium(renderer.sceneRT.depthTexture),post=new PostFX(engine,{sceneRenderer:renderer,camera:engine.camera,underwater:medium,clouds});
 if(post.motionBlur.strength)post.motionBlur.strength.value=0;
 const host=new RepositoryWorldHost({engine,input,onChange:active=>{post.taau.resetHistory();medium.uniforms.fields.base.value=terrainMistBase(active.project.terrain);report(active.project.metadata.name+' · '+active.identity.location+' · '+active.identity.contentDigest.slice(0,12));},onInteract:(computer,active)=>{
  input._clearTransientInput();document.exitPointerLock?.();document.querySelector('#computer-info').textContent='Computer '+computer.id+' · sign '+(computer.computer.targetSignId??'not assigned');
  document.querySelector('#computer-controls').textContent='Connect an authorised world session for controls.';terminal.showModal();window.dispatchEvent(new CustomEvent('repository-computer',{detail:{computer,active}}));
 }});
 document.querySelector('#terminal-close').onclick=()=>{terminal.close();engine.canvas.focus();};
 const app={engine,input,host,renderer,post,weather,gpu:GPU,session:null,load:async(source,options)=>{report('Validating and building candidate world…');try{return await host.load(source,options);}catch(error){report('World rejected: '+error.message);throw error;}},checkUpdate:options=>host.checkUpdate(options)};
 window.__repositoryWorldApp=app;
 const sessionStatus=document.querySelector('#session-status');
 host.beforeActivate=async()=>{document.querySelector('#apply-update').disabled=true;document.querySelector('#update-status').textContent='';app.session?.disconnect();if(terminal.open)terminal.close();};
 const makeSession=()=>new RepositorySession(host,{trustedOwners:new Set([document.querySelector('#session-url').value.trim()]),onStatus:value=>sessionStatus.textContent=value});
 document.querySelector('#session-identity').onclick=()=>void(async()=>{const session=app.session??makeSession();document.querySelector('#public-identity').textContent=JSON.stringify(await session.publicIdentity(),null,2);})().catch(error=>sessionStatus.textContent=error.message);
 document.querySelector('#session-connect').onclick=()=>void(async()=>{const file=document.querySelector('#admission').files[0];if(!file||file.size>100000)throw Error('Select an operator admission JSON under 100 KB.');const proof=JSON.parse(await file.text());app.session?.disconnect();app.session=makeSession();await app.session.connect(proof);})().catch(error=>sessionStatus.textContent=error.message);
 document.querySelector('#session-disconnect').onclick=()=>app.session?.disconnect();
 window.addEventListener('repository-computer',event=>{
  const target=event.detail.computer.computer.targetSignId,controls=document.querySelector('#computer-controls');controls.textContent='';
  if(!target){controls.textContent='No neon sign is assigned to this computer.';return;}
  const authored=host.active.project.objects.find(o=>o.id===target&&o.kind==='neon-sign');
  if(!authored){controls.textContent='The assigned sign is missing.';return;}
  const config=structuredClone(host.overlay?.signs?.find(s=>s.id===target)?.config??authored.neon),fields={};
  for(const [key,label,type] of [['text','Text','text'],['color','Colour','color'],['brightness','Brightness','number'],['size','Letter size','number']]){const row=document.createElement('label');row.textContent=label;const field=document.createElement('input');field.type=type;field.value=config[key];if(type==='number')field.step='.1';fields[key]=field;row.append(field);controls.append(row);}
  const effect=document.createElement('select');for(const mode of ['steady','flicker','pulse','flash','sequence','colour-cycle','faulty','timed']){const option=document.createElement('option');option.value=mode;option.textContent=mode;effect.append(option);}effect.value=config.effect.mode;controls.append(effect);
  const apply=document.createElement('button');apply.textContent='Apply sign settings';apply.onclick=()=>{try{const next={...config,text:fields.text.value,color:fields.color.value,brightness:Number(fields.brightness.value),size:Number(fields.size.value),effect:{...config.effect,mode:effect.value}};if(app.session?.connected)app.session.setConfig(target,next);else host.setLocalConfig(target,next);}catch(error){sessionStatus.textContent=error.message;}};controls.append(apply);
  for(const [label,powered] of [['Power on',true],['Power off',false]]){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{try{if(app.session?.connected)app.session.setPower(target,powered);else host.setLocalPower(target,powered);}catch(error){sessionStatus.textContent=error.message;}};controls.append(button);}
 });
 const loadFiles=async files=>app.load(localRepositorySource(files));
 document.querySelector('#check-update').onclick=()=>void app.checkUpdate().then(update=>{const apply=document.querySelector('#apply-update');apply.disabled=!update;document.querySelector('#update-status').textContent=update?`Checked revision ${update.fromCommit??update.fromDigest} → ${update.toCommit??update.toDigest}. Apply to reload and disconnect this session.`:'No newer revision found.';}).catch(error=>{document.querySelector('#apply-update').disabled=true;report(error.message);});
 document.querySelector('#apply-update').onclick=()=>{document.querySelector('#apply-update').disabled=true;void host.applyUpdate().catch(error=>report(error.message));};
 document.querySelector('#folder').onclick=()=>document.querySelector('#files').click();document.querySelector('#files').onchange=e=>void loadFiles(e.target.files).catch(error=>{report('World rejected: '+error.message);console.error(error);});
 document.querySelector('#hosted-open').onclick=()=>void(async()=>{await app.load(hostedRepositorySource(document.querySelector('#hosted-url').value));})().catch(error=>report('World rejected: '+error.message));
 document.querySelector('#remote').onclick=()=>void(async()=>{const source=await resolveGitHubWorldSource(parseGitHubWorldLocation(document.querySelector('#github').value));await app.load(source);})().catch(error=>report(error.message));
 engine.start((dt,time)=>{
  try{
   GPU.beginFrame();G.time.value=time;G.dt.value=dt;G.exposure.value=.55;
   if(!terminal.open)host.update(dt,time);input.endFrame();
   const env=host.environment()??{timeOfDay:14,cloudCoverage:.49,windSpeed:6,sunAzimuth:0};clouds.coverage.value=env.cloudCoverage??.49;G.windSpeed.value=env.windSpeed??6;
   medium.uniforms.fields.storm.value=env.weather==='storm'?1:0;medium.uniforms.fields.density.value=env.mistDensity??.004;medium.uniforms.fields.speed.value=env.mistSpeed??2;medium.uniforms.fields.height.value=env.mistHeight??9;
   const dir=sunDirectionFromTime(env.timeOfDay??14).applyAxisAngle(new N.Vector3(0,1,0),env.sunAzimuth??0);atmosphere.sunDir.value.copy(dir);
   const night=N.MathUtils.smoothstep(-dir.y,.02,.18);G.night.value=night;sky.starIntensity.value=night;const moon=new N.Vector3(-dir.x,Math.abs(dir.y)*.8+.25,-dir.z).normalize();sky.moonDir.value.copy(moon);G.sunDir.value.copy(dir.y>-.07?dir:moon);
   const weatherState=weather.update(time,engine.camera,host.active?.player.yaw??0,env,()=>{});medium.uniforms.fields.lightning.value=weatherState.flash;
   atmosphere.update(dt,engine.camera.position.y);
   if(atmosphere.sunTransmittance){const t=atmosphere.sunTransmittance;if(dir.y>-.07)G.sunColor.value.setRGB(...t).multiplyScalar(SUN_ILLUMINANCE*N.MathUtils.smoothstep(dir.y,-.03,.02));else G.sunColor.value.setRGB(.6,.7,1).multiplyScalar(.12*night);const a=atmosphere.skyIrradiance,k=.012*night;G.skyIrradiance.value.setRGB(a[0]+k*.6,a[1]+k*.7,a[2]+k);G.horizonColor.value.setRGB(...atmosphere.horizon);}
   clouds.update(dt,engine.camera);environment.update(dt);post.beginFrame();shadows.render(engine.scene,engine.meshRenderer,shadows.update(engine.camera,G.sunDir.value));renderer.render();post.render();post.endFrame();GPU.submit();
   const active=host.active;hud.textContent=active?`${active.project.metadata.name} · ${active.player.mode} · ${active.player.position.toArray().map(v=>v.toFixed(1)).join(', ')}${host.nearestComputer()?' · E: use computer':''}`:'Open a repository to explore';
   app.diagnostics={frames:engine.frame,worldId:active?.identity.worldId,contentDigest:active?.identity.contentDigest,position:active?.player.position.toArray(),mode:active?.player.mode,grounded:active?.player.grounded,boxes:active?.colliders.boxes.length,assets:active?.assets,weather:weatherState,environment:env,neons:[]};active?.root.traverse(node=>{if(node.userData.neonState)app.diagnostics.neons.push(node.userData.neonState);});
  }catch(error){engine.stop();report('Runtime failed: '+error.message);console.error(error);app.error=error.message;}
 });
 window.addEventListener('pagehide',()=>{host.dispose();engine.stop();GPU.device?.destroy();});report('ElseMesh ready. Open a world repository folder or public GitHub source.');
 window.dispatchEvent(new CustomEvent('repository-world-ready',{detail:app}));
}
init().catch(error=>{console.error(error);report(error.message);});
