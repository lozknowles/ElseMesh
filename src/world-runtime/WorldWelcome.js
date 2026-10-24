import {verifyRuntimeSignature} from './RepositorySession.js';
import {canonical} from './vendor/world-engine-contract.js';
export function validWorldWelcome(value){return value&&value.schema==='elsemesh.world-welcome/1'&&typeof value.text==='string'&&value.text.trim().length>0&&value.text.length<=2000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.text)&&typeof value.audio==='boolean'&&Object.keys(value).every(k=>['schema','text','audio'].includes(k));}
export async function worldWelcomeHash(value){if(!value)return null;if(!validWorldWelcome(value))throw Error('Invalid world welcome');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));return 'sha256:'+Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');}
/** The runtime's sole native TTS owner. Other runtime voices use separate audio APIs. */
export class LocalWelcomeSpeech {
 constructor({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,isMuted=()=>false}={}){Object.assign(this,{synthesis,Utterance,isMuted});this.own=null;}
 play(text){
  this.stop();const s=this.synthesis;if(!s||!this.Utterance||this.isMuted()||s.speaking||s.pending)return false;
  const voices=s.getVoices(),voice=voices.find(v=>v.localService===true&&String(v.lang).startsWith('en'))??voices.find(v=>v.localService===true);if(!voice)return false;
  const u=new this.Utterance(text);u.voice=voice;this.own=u;const finish=()=>{if(this.own===u)this.own=null;};u.onend=finish;u.onerror=finish;
  try{s.speak(u);return true;}catch{finish();return false;}
 }
 stop(){if(this.own){this.synthesis.cancel();this.own=null;}}
 tick(){if(this.isMuted())this.stop();}
 dispose(){this.stop();}
}
/** First visit means first acknowledged visible text. A crash before ack can repeat it. */
export class WorldWelcomeController {
 constructor({getContext,present,clear=()=>{},speech=null,storage,verify=verifyRuntimeSignature,now=()=>Date.now()}){
  if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
  Object.assign(this,{getContext,present,clear,speech,storage,verify,now});this.epoch=0;this.current=null;this.nextAt=0;this.busy=false;this.localSeen=new Set();
  try{this.localPlayerId=storage?.getItem('elsemesh.local-player/1');if(!this.localPlayerId){this.localPlayerId=crypto.randomUUID();storage?.setItem('elsemesh.local-player/1',this.localPlayerId);}}catch{this.localPlayerId=crypto.randomUUID();}
 }
 context(){const c=this.getContext();if(!c?.ready||!c.visible||!c.active)return null;return {...c};}
 same(c){const n=this.context();return !!n&&n.active===c.active&&n.transport===c.transport&&n.connection===c.connection&&n.worldId===c.worldId&&n.contentDigest===c.contentDigest&&n.sessionId===c.sessionId&&n.generation===c.generation&&n.authorityEpoch===c.authorityEpoch&&n.ownerMode===c.ownerMode;}
 reset(){this.epoch++;this.current=null;this.nextAt=0;this.speech?.stop();this.clear();}
 async request(operation,extra={},c=this.current.context){
  const epoch=this.epoch,welcomeRequestId=crypto.randomUUID(),hash=this.current.hash,presentationId=this.current.presentationId;
  const r=await c.transport.request(operation,{worldId:c.worldId,contentDigest:c.contentDigest,sessionId:c.sessionId,generation:c.generation,authorityEpoch:c.authorityEpoch,welcomeHash:hash,presentationId,welcomeRequestId,...extra},{nonfatal:true});
  const contact=c.transport.ownerConfig?.contacts?.find(x=>x.worldId===c.worldId),now=this.now();
  const valid=r&&contact&&r.protocol==='elsemesh.world-welcome-result/1'&&r.welcomeRequestId===welcomeRequestId&&r.operation===operation&&r.signer===contact.authorityNodeId&&r.playerNodeId===c.playerNodeId&&r.worldId===c.worldId&&r.contentDigest===c.contentDigest&&r.sessionId===c.sessionId&&r.generation===c.generation&&r.authorityEpoch===c.authorityEpoch&&r.welcomeHash===hash&&Number.isSafeInteger(r.issuedAt)&&Number.isSafeInteger(r.expiresAt)&&r.issuedAt<=now+1000&&r.expiresAt>now&&r.expiresAt-r.issuedAt>0&&r.expiresAt-r.issuedAt<=3000;
  if(!valid||!await this.verify(r,new Set([contact.authorityNodeId]))||epoch!==this.epoch||!this.same(c)||r.expiresAt<=this.now())throw Error('Welcome unavailable');
  if(r.allowed!==true)throw Error(r.message==='Access restricted'?'Access restricted':'Welcome unavailable');return r.result;
 }
 async work(c,epoch){
  const state=this.current,welcome=c.active.project.welcome;
  if(!state.initialized){state.hash=await worldWelcomeHash(welcome);state.initialized=true;}
  if(epoch!==this.epoch||!this.same(c))return;
  if(!c.ownerMode){
   if(!welcome){state.done=true;return;}
   const key='elsemesh.world-welcome-seen/1:'+this.localPlayerId+':'+encodeURIComponent(c.worldId);let seen=this.localSeen.has(key);
   try{seen=seen||this.storage?.getItem(key)==='1';}catch{}
   if(!seen){if(!this.present(welcome,c))return;this.localSeen.add(key);try{this.storage?.setItem(key,'1');}catch{}if(welcome.audio)this.speech?.play(welcome.text);}
   state.done=true;return;
  }
  if(state.claimId){
   const result=await this.request('world-welcome-ack',{claimId:state.claimId});
   if(result?.seen===true)state.done=true;return;
  }
  const result=await this.request('world-welcome-read');
  if(result?.seen===true||result?.configured===false){state.done=true;return;}
  if(result?.pending){this.nextAt=Math.min(this.now()+10000,Math.max(this.now()+1000,result.retryAt??0));return;}
  if(!validWorldWelcome(result?.welcome)||await worldWelcomeHash(result.welcome)!==state.hash||typeof result.claimId!=='string'||!Number.isSafeInteger(result.claimExpiresAt)||result.claimExpiresAt<=this.now()||result.claimExpiresAt>this.now()+11000)throw Error('Welcome unavailable');
  if(epoch!==this.epoch||!this.same(c))return;
  if(!state.presented){if(!this.present(result.welcome,c))return;state.presented=true;if(result.welcome.audio)this.speech?.play(result.welcome.text);}
  state.claimId=result.claimId;state.claimExpiresAt=result.claimExpiresAt;
  const ack=await this.request('world-welcome-ack',{claimId:state.claimId});if(ack?.seen===true)state.done=true;
 }
 tick(){
  this.speech?.tick();const c=this.context();
  if(this.current&&!this.same(this.current.context))this.reset();
  if(!c)return;
  if(!this.current)this.current={context:c,presentationId:crypto.randomUUID(),initialized:false,done:false};
  const state=this.current;if(state.done||this.busy||this.now()<this.nextAt)return;
  if(state.claimId&&state.claimExpiresAt<=this.now())state.claimId=null;
  this.busy=true;this.nextAt=this.now()+1000;const epoch=this.epoch;
  void this.work(c,epoch).catch(()=>{}).finally(()=>{this.busy=false;});
 }
 replay(){const c=this.context(),welcome=c?.active.project.welcome;if(!c||!validWorldWelcome(welcome)||!this.present(welcome,c))return false;if(welcome.audio)this.speech?.play(welcome.text);return true;}
 dispose(){this.reset();this.speech?.dispose();}
}
export class WorldWelcomeView {
 constructor({isMuted=()=>false,onMute=()=>{},onReplayAudio=()=>{}}={}){
  this.root=document.createElement('aside');this.root.id='world-welcome';this.root.setAttribute('aria-label','World welcome');this.root.style.cssText='position:fixed;left:18px;bottom:64px;z-index:30;width:min(420px,85vw);max-height:60vh;overflow:auto;padding:18px;background:#152129ed;color:#eff7fb;border:1px solid #64818f;border-radius:12px';this.root.hidden=true;
  const title=document.createElement('h2');title.textContent='Welcome';this.text=document.createElement('p');this.text.style.whiteSpace='pre-wrap';this.text.setAttribute('aria-live','polite');
  this.play=document.createElement('button');this.play.textContent='Play welcome';this.play.onclick=onReplayAudio;
  const label=document.createElement('label'),mute=document.createElement('input');mute.type='checkbox';mute.checked=isMuted();mute.onchange=()=>onMute(mute.checked);label.append(mute,document.createTextNode('Mute welcome audio'));
  const close=document.createElement('button');close.textContent='Dismiss';close.onclick=()=>this.hide();this.root.append(title,this.text,this.play,label,close);document.body.append(this.root);
 }
 show(welcome){if(document.visibilityState==='hidden')return false;this.text.textContent=welcome.text;this.play.hidden=!welcome.audio;this.root.hidden=false;return true;}
 hide(){this.root.hidden=true;}
 dispose(){this.root.remove();}
}
