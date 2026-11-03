/** One bounded copy of an ordinary source frame, only for public portal travel.
 * drawImage runs synchronously after render: it never relies on a retained GL
 * default framebuffer. The live destination keeps rendering below the dissolve. */
export class PublicPortalMeld{
 constructor({canvas,document:doc=globalThis.document,window:win=globalThis.window,now=()=>performance.now(),duration=380}={}){
  Object.assign(this,{canvas,doc,win,now,duration});this.ticket=null;this.overlay=null;this.copies=0;this.shown=0;this.disposed=false;
  this.motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');this.invalidate=()=>this.cancel();
  for(const name of ['resize','pagehide','blur'])win.addEventListener(name,this.invalidate);
  canvas.addEventListener('webglcontextlost',this.invalidate);doc.addEventListener('visibilitychange',this.invalidate);this.motion?.addEventListener?.('change',this.invalidate);
 }
 request({source,generation,destinationWorldId}){
  this.cancel();if(this.disposed||this.motion?.matches||this.doc.visibilityState==='hidden')return null;
  const ticket={source,generation,destinationWorldId,width:this.canvas.width,height:this.canvas.height};
  this.ticket=ticket;return ticket;
 }
 authorize(ticket,active,generation){
  if(!ticket||ticket!==this.ticket||!ticket.captured||active?.identity?.worldId!==ticket.destinationWorldId){this.cancel(ticket);return;}
  ticket.active=active;ticket.activationGeneration=generation;
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
    context.drawImage(this.canvas,0,0,overlay.width,overlay.height);this.copies++;this.overlay=overlay;t.captured=true;this.doc.body.append(overlay);
   }catch{this.cancel();}return;
  }
  // The source can render more frames while asynchronous preparation finishes.
  if(!t.active){if(active!==t.source||generation!==t.generation)this.cancel();return;}
  if(active!==t.active||generation!==t.activationGeneration){this.cancel();return;}
  const time=this.now();if(t.started===undefined){t.started=time;this.shown++;this.overlay.style.display='block';}
  const progress=Math.min(1,(time-t.started)/this.duration);if(progress>=1){this.cancel();return;}
  const edge=-12+progress*145,mask=`radial-gradient(ellipse at 50% 52%, transparent ${Math.max(0,edge-16)}%, #000 ${Math.max(0,edge+8)}%)`;
  this.overlay.style.maskImage=mask;this.overlay.style.webkitMaskImage=mask;this.overlay.style.opacity=String((1-progress)**.7);
 }
 cancel(ticket=this.ticket){
  if(!ticket||ticket!==this.ticket)return;this.ticket=null;
  if(this.overlay){this.overlay.remove();this.overlay.width=1;this.overlay.height=1;this.overlay=null;}
 }
 diagnostics(){return {active:!!this.ticket?.active,captured:!!this.ticket?.captured,copies:this.copies,shown:this.shown,duration:this.duration};}
 dispose(){if(this.disposed)return;this.cancel();this.disposed=true;for(const name of ['resize','pagehide','blur'])this.win.removeEventListener(name,this.invalidate);this.canvas.removeEventListener('webglcontextlost',this.invalidate);this.doc.removeEventListener('visibilitychange',this.invalidate);this.motion?.removeEventListener?.('change',this.invalidate);}
}
