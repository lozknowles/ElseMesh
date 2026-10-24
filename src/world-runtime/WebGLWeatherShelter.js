import { T, writeRainQuads, quadIndices, RAIN_PARTICLES } from './vendor/world-engine-contract.js';
import { repositoryWeatherShelters, excludeShelteredRain, MAX_WEATHER_SHELTERS } from './WeatherShelter.js';

const fogFunctions=`
uniform int weatherShelterCount;
uniform mat4 weatherShelterInverse[4];
uniform vec3 weatherShelterMin[4];
uniform vec3 weatherShelterMax[4];
varying vec3 vWeatherWorld;
float weatherExteriorDistance(vec3 start,vec3 end){
 float lows[4];float highs[4];
 for(int i=0;i<4;i++){
  float lo=1.0;float hi=1.0;
  if(i<weatherShelterCount){
   vec3 a=(weatherShelterInverse[i]*vec4(start,1.0)).xyz;
   vec3 b=(weatherShelterInverse[i]*vec4(end,1.0)).xyz;
   lo=0.0;hi=1.0;
   for(int axis=0;axis<3;axis++){
    float d=b[axis]-a[axis];
    if(abs(d)<0.0000001){if(a[axis]<weatherShelterMin[i][axis]||a[axis]>weatherShelterMax[i][axis])hi=-1.0;}
    else {float x=(weatherShelterMin[i][axis]-a[axis])/d;float y=(weatherShelterMax[i][axis]-a[axis])/d;lo=max(lo,min(x,y));hi=min(hi,max(x,y));}
   }
   if(hi<=lo){lo=1.0;hi=1.0;}
  }
  lows[i]=lo;highs[i]=hi;
 }
 for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)if(lows[j]<lows[i]){float a=lows[i];lows[i]=lows[j];lows[j]=a;a=highs[i];highs[i]=highs[j];highs[j]=a;}
 float covered=0.0;float last=0.0;
 for(int i=0;i<4;i++){covered+=max(0.0,highs[i]-max(lows[i],last));last=max(last,highs[i]);}
 return distance(start,end)*(1.0-covered);
}`;
export function updateWebGLWeatherShelter(engine,active,time,underwater){
 let state=engine.scene.userData.weatherShelter;
 if(!state){
  const uniforms={weatherShelterCount:{value:0},weatherShelterInverse:{value:Array.from({length:MAX_WEATHER_SHELTERS},()=>new T.Matrix4())},weatherShelterMin:{value:Array.from({length:MAX_WEATHER_SHELTERS},()=>new T.Vector3())},weatherShelterMax:{value:Array.from({length:MAX_WEATHER_SHELTERS},()=>new T.Vector3())}};
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(RAIN_PARTICLES*12),3));geometry.setIndex(quadIndices(RAIN_PARTICLES));
  const rain=new T.Mesh(geometry,new T.MeshBasicMaterial({color:'#c4e3ef',transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide,fog:true}));rain.frustumCulled=false;rain.name='repository exterior rain';engine.scene.add(rain);
  state={uniforms,rain,installed:new WeakSet()};engine.scene.userData.weatherShelter=state;
 }
 const shelters=repositoryWeatherShelters(active?.project),visible=underwater?[]:shelters;
 state.uniforms.weatherShelterCount.value=visible.length;
 visible.forEach((v,i)=>{state.uniforms.weatherShelterInverse.value[i].fromArray(v.inverse);state.uniforms.weatherShelterMin.value[i].fromArray(v.min);state.uniforms.weatherShelterMax.value[i].fromArray(v.max);});
 engine.scene.traverse(node=>{for(const material of [].concat(node.material??[])){
  if(state.installed.has(material)||material.fog===false)continue;state.installed.add(material);
  const prior=material.onBeforeCompile,priorKey=material.customProgramCacheKey.bind(material);
  const key=priorKey();material.customProgramCacheKey=()=>key+'|weather-shelter-v1';
  material.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);Object.assign(shader.uniforms,state.uniforms);
   shader.vertexShader='varying vec3 vWeatherWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\nvWeatherWorld=cameraPosition+transpose(mat3(viewMatrix))*mvPosition.xyz;');
   shader.fragmentShader=fogFunctions+'\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
    float exterior=weatherExteriorDistance(cameraPosition,vWeatherWorld);
    #ifdef FOG_EXP2
     float fogFactor=1.0-exp(-fogDensity*fogDensity*exterior*exterior);
    #else
     float fogFactor=smoothstep(fogNear,fogFar,exterior);
    #endif
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);
   #endif`);
  };material.needsUpdate=true;
 }});
 const attribute=state.rain.geometry.getAttribute('position'),env=active?.project.environment??{};
 const count=underwater?0:excludeShelteredRain(attribute.array,writeRainQuads(attribute.array,time,engine.camera.position.toArray(),env),shelters);
 attribute.needsUpdate=true;state.rain.geometry.setDrawRange(0,count*6);state.rain.visible=count>0;
 return {shelters:shelters.length,particles:count,logicalCollisionRoof:shelters.some(v=>v.logicalCollisionRoof)};
}
