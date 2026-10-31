import {GRAPHICS_DEFAULTS,GRAPHICS_PRESETS,validateGraphicsPreferences,GraphicsQualityModel} from './GraphicsQuality.js';
import {GraphicsExperiments} from './GraphicsExperiments.js';
import {isGameMenuShortcut,gameMenuEnvironment} from './GraphicsRuntimeState.js';
import './GraphicsPanel.css';

const STORAGE='elsemesh.graphics/1';
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
const numeric=value=>Number(value);
/** Public runtime controls. Timing comes only from the existing game callback. */
export class GraphicsPanel {
 constructor({app,captureQuality=false,onOpen=()=>{},onClose=()=>{},canOpen=()=>true,storage}={}){
  this.app=app;this.onOpen=onOpen;this.onClose=onClose;this.canOpen=canOpen;this.disposed=false;this.contextLost=false;this.nextRefresh=0;this.appliedRevision=-1;
  try{this.storage=storage??window.localStorage;}catch{this.storage=null;}
  let preferences={...GRAPHICS_DEFAULTS};
  try{const saved=JSON.parse(this.storage?.getItem(STORAGE)??'null');if(saved?.version===1)preferences=validateGraphicsPreferences(saved.preferences);}catch{}
  if(captureQuality)preferences={...GRAPHICS_DEFAULTS,...GRAPHICS_PRESETS.capture};
  this.model=new GraphicsQualityModel(preferences);this.experiments=new GraphicsExperiments(app);
  this.timeOfDay=null;this.build();this.apply();this.refresh();
  this.keydown=event=>{if(!isGameMenuShortcut(event,document.activeElement)||this.otherDialogOpen()||!this.open&&!this.canOpen())return;event.preventDefault();if(this.open)this.close();else this.show();};
  window.addEventListener('keydown',this.keydown);
  this.visibility=()=>{this.model.observe(performance.now(),{eligible:false,visible:false});};
  this.lost=()=>{this.contextLost=true;this.experiments.reset();this.visibility();this.refresh();};
  this.restored=()=>{this.contextLost=false;this.model.configure(this.model.snapshot().settings);this.appliedRevision=-1;this.apply();this.refresh();};
  document.addEventListener('visibilitychange',this.visibility);
  app.engine.canvas.addEventListener('webglcontextlost',this.lost);
  app.engine.canvas.addEventListener('webglcontextrestored',this.restored);
  this.legacy=document.querySelector('#render-quality');
  if(this.legacy){this.legacyLabel=this.legacy.closest('label');this.legacyHidden=this.legacyLabel?.hidden;this.legacyHandler=this.legacy.onchange;if(this.legacyLabel)this.legacyLabel.hidden=true;this.legacyChange=()=>this.setPreset(this.legacy.value);this.legacy.onchange=this.legacyChange;}
 }
 get open(){return this.dialog.open;}
 build(){
  this.button=element('button','Menu · M','repository-graphics-button');this.button.type='button';this.button.id='graphics-open';this.button.setAttribute('aria-haspopup','dialog');this.button.setAttribute('aria-keyshortcuts','M');
  this.dialog=element('dialog',null,'repository-graphics');this.dialog.id='graphics-panel';this.dialog.setAttribute('aria-labelledby','graphics-title');
  const header=element('header'),heading=element('h2','Game menu');heading.id='graphics-title';const close=element('button','Close');close.type='button';close.id='graphics-close';header.append(heading,close);
  this.readout=element('div',null,'graphics-readout');this.fps=element('strong','Measuring…');this.pacing=element('span');this.dimensions=element('span');this.readout.append(this.fps,this.pacing,this.dimensions);
  this.status=element('p',null,'graphics-status');this.status.id='graphics-status';this.status.setAttribute('role','status');
  this.form=element('div',null,'graphics-fields');this.controls={};
  const select=(key,label,options,description,onChange)=>{
   const field=element('label',null,'graphics-field'),title=element('span',label),input=element('select');input.id='graphics-'+key;
   for(const [value,text]of options){const option=element('option',text);option.value=String(value);if(value==='custom')option.disabled=true;input.append(option);}
   const help=element('small',description);field.append(title,input,help);input.addEventListener('change',()=>onChange(input.value));this.form.append(field);this.controls[key]=input;return input;
  };
  select('preset','Quality preset',[['performance','Performance'],['standard','Standard'],['capture','High detail'],['custom','Custom']],'Choose a starting point; individual controls remain available.',value=>this.setPreset(value));
  select('mode','Frame-rate mode',[['manual','Manual quality'],['target30','Target 30 FPS']],'Adaptive mode tests resolution changes within your limits. It cannot guarantee 30 FPS.',value=>this.setPreferences({mode:value}));
  select('maxOutputPixels','Screen resolution limit',[[500000,'Performance · 0.5 million pixels'],[921600,'720p limit · 1280 × 720 pixels'],[1000000,'Standard · 1 million pixels'],[1500000,'Detailed · 1.5 million pixels'],[2073600,'1080p limit · 1920 × 1080 pixels'],[2100000,'High · 2.1 million pixels']],'Maximum pixel count; keeps your screen’s shape. Actual resolution is shown above and may be lower with adaptive quality.',value=>this.setPreferences({maxOutputPixels:numeric(value)}));
  select('timeOfDay','Current world time',[['world','World default'],[6,'Dawn · 06:00'],[9,'Morning · 09:00'],[12,'Noon · 12:00'],[15,'Afternoon · 15:00'],[18,'Dusk · 18:00'],[21,'Evening · 21:00'],[0,'Night · 00:00']],'Resets when you travel. Scanned rooms keep their captured lighting.',value=>{this.timeOfDay=value==='world'?null:numeric(value);this.refresh();});
  select('portalLongEdge','Portal detail',[[256,'Low · 256 pixels'],[384,'Medium · 384 pixels'],[512,'Standard · 512 pixels'],[768,'Detailed · 768 pixels'],[1024,'High · 1024 pixels']],'Maximum long edge of the portal image. Higher settings retain finer detail.',value=>this.setPreferences({portalLongEdge:numeric(value)}));
  select('minimumScale','Adaptive quality floor',[[.85,'Preserve detail · 85%'],[.7,'Balanced · 70%'],[.5,'Maximum performance · 50%']],'Minimum linear resolution relative to your chosen detail limits. World geometry and effects stay intact.',value=>this.setPreferences({minimumScale:numeric(value)}));
  const experiments=element('fieldset');experiments.className='graphics-experiments';experiments.append(element('legend','Rendering techniques'));
  const toggle=(key,label,help,action)=>{const row=element('label',null,'graphics-toggle'),input=element('input');input.type='checkbox';input.id='graphics-'+key;input.disabled=this.app.backend!=='webgl2';const copy=element('span',label);copy.append(element('small',help));row.append(input,copy);experiments.append(row);input.addEventListener('change',()=>{action(input.checked);this.model.configure(this.model.snapshot().settings);this.apply();this.refresh();});this.controls[key]=input;};
  toggle('prepass','Wall occlusion optimisation','Validated for the Warehouse walls. Enabled by default; switches off outside eligible scenes.',value=>this.experiments.setPrepass(value));
  this.prepassStatus=element('p',null,'graphics-note');this.prepassStatus.id='graphics-prepass-status';experiments.append(this.prepassStatus);
  toggle('farTrees','Distant-tree draw order · experimental','Session only. May improve overdraw, but can change foliage overlap. Off by default.',value=>this.experiments.setFarTrees(value));
  this.experimentStatus=element('p',null,'graphics-note');experiments.append(this.experimentStatus);
  const pending=element('details',null,'graphics-research');pending.append(element('summary','Other experiments'));
  pending.append(element('p','Turn-only sort reuse and GPU sorting still need whole-game performance and lifecycle validation. Neither is available as a runtime switch yet.'));
  pending.append(element('p','A reduced sorting-frequency trial did not give a repeatable walking FPS improvement, so it is not offered here.'));
  this.storageNote=element('p',null,'graphics-note');const footer=element('footer'),reset=element('button','Restore defaults');reset.type='button';reset.id='graphics-reset';reset.onclick=()=>this.reset();footer.append(reset);
  this.dialog.append(header,this.readout,this.status,this.form,experiments,pending,this.storageNote,footer);document.body.append(this.button,this.dialog);
  this.button.onclick=()=>this.show();close.onclick=()=>this.close();
  this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});
  this.dialog.addEventListener('close',()=>{if(!this.open)this.finishClose();});
 }
 otherDialogOpen(){return [...document.querySelectorAll('dialog[open]')].some(dialog=>dialog!==this.dialog);}
 show(){if(this.disposed||this.open||this.otherDialogOpen()||!this.canOpen())return;if(this.inputHeld)this.finishClose();this.onOpen();this.inputHeld=true;document.exitPointerLock?.();this.refresh();this.dialog.showModal();}
 finishClose(){if(!this.inputHeld)return;this.inputHeld=false;this.onClose();this.app.engine.canvas.focus();}
 close(){if(this.open)this.dialog.close();this.finishClose();}
 save(){try{this.storage?.setItem(STORAGE,JSON.stringify({version:1,preferences:this.model.snapshot().settings}));this.storageNote.textContent=this.storage?'Quality preferences saved on this device. Experiments are session only.':'Preferences are temporary because local storage is unavailable.';}catch{this.storageNote.textContent='Preferences are temporary because local storage is unavailable.';}}
 setPreferences(patch){this.model.configure({...this.model.snapshot().settings,...patch});this.apply();this.save();this.refresh();return this.snapshot();}
 setPreset(name){if(!GRAPHICS_PRESETS[name])return this.snapshot();return this.setPreferences({...GRAPHICS_DEFAULTS,...GRAPHICS_PRESETS[name]});}
 apply(){
  if(this.disposed||this.contextLost)return;const state=this.model.snapshot();if(state.revision===this.appliedRevision)return;
  const engine=this.app.engine,views=this.app.portals.views;
  if(engine.maxOutputPixels!==state.effective.maxOutputPixels){engine.maxOutputPixels=state.effective.maxOutputPixels;engine.resize();this.app.post?.taau?.resetHistory();}
  views.maxLongEdge=state.effective.portalLongEdge;
  // Forked preview views must inherit the current preference too.
  if(views.forkOptions)views.forkOptions.maxLongEdge=state.effective.portalLongEdge;
  this.appliedRevision=state.revision;
 }
 beforeFrame(timestamp,{eligible=true}={}){
  if(this.disposed)return;this.experiments.refresh();this.model.observe(timestamp,{eligible:eligible&&!this.contextLost,visible:!document.hidden});this.apply();
  if(timestamp>=this.nextRefresh){this.nextRefresh=timestamp+500;this.refresh();}
 }
 environment(base){return gameMenuEnvironment(base,this.timeOfDay);}
 worldChanging(){if(this.timeOfDay!==null)this.app.host.active?.nativeIsland?.setEnvironment(this.app.host.environment());this.timeOfDay=null;this.close();this.experiments.reset({keepSunset:true});this.model.configure(this.model.snapshot().settings);this.apply();this.refresh();}
 reset(){this.timeOfDay=null;this.experiments.reset();this.model.configure({...GRAPHICS_DEFAULTS});this.apply();try{this.storage?.removeItem(STORAGE);}catch{}this.storageNote.textContent='Standard quality and world time restored. Saved overrides and experiments cleared.';this.refresh();return this.snapshot();}
 snapshot(){return{...this.model.snapshot(),experiments:this.experiments.snapshot(),backend:this.app.backend,renderSize:[this.app.engine.width,this.app.engine.height],contextLost:this.contextLost};}
 refresh(){
  if(this.disposed)return;const state=this.snapshot(),s=state.settings,e=state.effective;
  this.button.textContent=state.fps>0?`Menu · M · ${state.fps.toFixed(0)} FPS`:'Menu · M';
  this.fps.textContent=state.fps>0?`${state.fps.toFixed(1)} FPS`:'Measuring…';
  this.pacing.textContent=state.p95Ms>0?`95% of frame intervals: ${state.p95Ms.toFixed(1)} ms or less`:'Frame pacing appears after warmup.';
  this.dimensions.textContent=`${state.renderSize[0]} × ${state.renderSize[1]} screen · portal cap ${Math.round(e.portalLongEdge)} px · ${state.backend.toUpperCase()}`;
  this.status.textContent=this.contextLost?'Graphics connection lost. Waiting for recovery.':state.status;
  for(const key of ['mode','maxOutputPixels','portalLongEdge','minimumScale'])this.controls[key].value=String(s[key]);
  this.controls.timeOfDay.value=this.timeOfDay===null?'world':String(this.timeOfDay);
  this.controls.minimumScale.disabled=s.mode!=='target30';
  const preset=Object.keys(GRAPHICS_PRESETS).find(name=>{const p=GRAPHICS_PRESETS[name];return s.maxOutputPixels===p.maxOutputPixels&&s.portalLongEdge===p.portalLongEdge;})??'custom';this.controls.preset.value=preset;if(this.legacy)this.legacy.value=preset==='capture'?'capture':'standard';
  this.controls.prepass.checked=state.experiments.prepass;this.controls.farTrees.checked=state.experiments.farTrees;
  const prepass=state.experiments;this.prepassStatus.textContent=!prepass.supported?'Wall optimisation is unavailable in this renderer.':!prepass.prepass?'Wall optimisation: off.':prepass.prepassUsed?'Wall optimisation: active.':prepass.prepassUsed===null?'Wall optimisation: enabled; waiting for a frame.':prepass.prepassReason==='no-eligible-occluders'?'Wall optimisation: enabled; unavailable in this scene.':'Wall optimisation: enabled; not used for this view.';
  this.experimentStatus.textContent=!state.experiments.supported?'These techniques are available in WebGL mode.':state.experiments.farTrees?`${state.experiments.changedTreeBatches} distant-tree batches changed. Restore defaults to return to the validated order.`:'Experimental draw ordering is off. Sorting and readback behaviour are unchanged.';
 }
 dispose(){
  if(this.disposed)return;this.close();this.disposed=true;window.removeEventListener('keydown',this.keydown);this.experiments.dispose();document.removeEventListener('visibilitychange',this.visibility);this.app.engine.canvas.removeEventListener('webglcontextlost',this.lost);this.app.engine.canvas.removeEventListener('webglcontextrestored',this.restored);this.button.remove();this.dialog.remove();if(this.legacy?.onchange===this.legacyChange){this.legacy.onchange=this.legacyHandler;if(this.legacyLabel)this.legacyLabel.hidden=this.legacyHidden;}
 }
}
