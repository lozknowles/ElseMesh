/** One bounded copy of an ordinary source frame, only for public portal travel.
 * drawImage runs synchronously after render: it never relies on a retained GL
 * default framebuffer. The live destination keeps rendering below the dissolve. */
export class PublicPortalMeld{
 constructor({canvas,document:doc=globalThis.document,window:win=globalThis.window,now=()=>performance.now(),duration=380,getContext=()=>null}={}){
  Object.assign(this,{canvas,doc,win,now,duration,getContext});this.ticket=null;this.overlay=null;this.copies=0;this.shown=0;this.sequence=0;this.finished=0;this.last=null;this.disposed=false;
  this.motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');this.invalidate=()=>this.cancel();
  for(const name of ['resize','pagehide','blur'])win.addEventListener(name,this.invalidate);
  canvas.addEventListener('webglcontextlost',this.invalidate);doc.addEventListener('visibilitychange',this.invalidate);this.motion?.addEventListener?.('change',this.invalidate);
 }
 request({source,generation,destinationWorldId}){
  this.cancel();if(this.disposed||this.motion?.matches||this.doc.visibilityState==='hidden')return null;
  const ticket={id:++this.sequence,source,generation,destinationWorldId,width:this.canvas.width,height:this.canvas.height};
  this.ticket=ticket;return ticket;
 }
 authorize(ticket,active,generation){
  if(!ticket||ticket!==this.ticket||!ticket.captured||active?.identity?.worldId!==ticket.destinationWorldId){this.cancel(ticket);return;}
  ticket.active=active;ticket.activationGeneration=generation;ticket.authorizedAt=this.now();
 }
 afterFrame({active,generation,eligible=true}={}){
  const t=this.ticket;if(!t)return;
  if(!eligible||this.motion?.matches||this.doc.visibilityState==='hidden'||this.canvas.width!==t.width||this.canvas.height!==t.height){this.cancel();return;}
  if(!t.captured){
   if(active!==t.source||generation!==t.generation){this.cancel();return;}
   try{
    const rect=this.canvas.getBoundingClientRect(),overlay=this.doc.createElement('canvas');
    overlay.width=t.width;overlay.height=t.height;
    overlay.setAttribute('aria-hidden','true');overlay.dataset.publicPortalMeld='';
    overlay.style.cssText=`position:fixed;pointer-events:none;z-index:8;display:none;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
    const context=overlay.getContext('2d',{alpha:false});if(!context)throw Error('Snapshot unavailable');
    context.drawImage(this.canvas,0,0,overlay.width,overlay.height);this.copies++;this.overlay=overlay;t.captured=true;t.capturedAt=this.now();this.doc.body.append(overlay);
   }catch{this.cancel();}return;
  }
  // The source can render more frames while asynchronous preparation finishes.
  if(!t.active){if(active!==t.source||generation!==t.generation)this.cancel();return;}
  if(active!==t.active||generation!==t.activationGeneration){this.cancel();return;}
  if(t.started===undefined)this.start(t);
 }
 start(t){
  const overlay=this.overlay;t.started=this.now();this.shown++;
  // Opacity alone can run on the compositor while a cold destination stalls the
  // game loop. Base opacity stays zero, so a delayed finish callback cannot leave
  // a frozen source visible. No subsequent game frame drives this animation.
  overlay.style.display='block';overlay.style.opacity='0';overlay.style.willChange='opacity';
  const finish=()=>{
   if(this.ticket!==t)return;
   const current=this.getContext();
   if(!current||current.active===t.active&&current.generation===t.activationGeneration){this.finished++;t.finishedAt=this.now();}
   this.cancel(t);
  };
  try{
   if(typeof overlay.animate==='function'){
    t.method='waapi';t.animation=overlay.animate([{opacity:1},{opacity:0}],{duration:this.duration,easing:'ease-out',fill:'none'});t.animation.onfinish=finish;
   }else{
    t.method='css';t.style=this.doc.createElement('style');t.style.textContent='@keyframes public-portal-meld-fade{from{opacity:1}to{opacity:0}}';this.doc.body.append(t.style);
    overlay.addEventListener('animationend',finish,{once:true});overlay.style.animation=`public-portal-meld-fade ${this.duration}ms ease-out both`;
    t.cleanupTimer=setTimeout(finish,this.duration+100);
   }
  }catch{this.cancel(t);}
 }
 cancel(ticket=this.ticket){
  if(!ticket||ticket!==this.ticket)return;this.last={id:ticket.id,capturedAt:ticket.capturedAt,authorizedAt:ticket.authorizedAt,startedAt:ticket.started,finishedAt:ticket.finishedAt,method:ticket.method};this.ticket=null;
  clearTimeout(ticket.cleanupTimer);if(ticket.animation){ticket.animation.onfinish=null;ticket.animation.cancel();}ticket.style?.remove();
  if(this.overlay){this.overlay.remove();this.overlay.width=1;this.overlay.height=1;this.overlay=null;}
 }
 diagnostics(){const t=this.ticket;return {active:!!t?.active,captured:!!t?.captured,copies:this.copies,shown:this.shown,finished:this.finished,duration:this.duration,id:t?.id,startedAt:t?.started,method:t?.method,animationTime:t?.animation?.currentTime,animationState:t?.animation?.playState,last:this.last};}
 dispose(){if(this.disposed)return;this.cancel();this.disposed=true;for(const name of ['resize','pagehide','blur'])this.win.removeEventListener(name,this.invalidate);this.canvas.removeEventListener('webglcontextlost',this.invalidate);this.doc.removeEventListener('visibilitychange',this.invalidate);this.motion?.removeEventListener?.('change',this.invalidate);}
}
