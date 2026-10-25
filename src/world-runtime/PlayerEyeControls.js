/** Keeps the local body under neutral walk physics while another player's eyes
 * are displayed. It never writes position, camera orientation or network state.
 */
export class PlayerEyeControls {
 constructor({input,canvas,getPlayer,canActivate=()=>true,canResume=()=>true,document=globalThis.document}={}){
  if(!input?.suspend||!input?.resume||!canvas?.addEventListener||typeof getPlayer!=='function'||typeof canActivate!=='function'||typeof canResume!=='function')throw Error('Invalid player-eye controls dependencies.');
  Object.assign(this,{input,canvas,getPlayer,canActivate,canResume,document});this.active=false;this.disposed=false;this.priorEnabled=false;
  this.blockPointer=event=>{if(this.active){event.preventDefault();event.stopImmediatePropagation();}};
  this.pointerEvents=['pointerdown','mousedown','click'];for(const name of this.pointerEvents)canvas.addEventListener(name,this.blockPointer,true);
 }
 allowed(){try{return this.getPlayer()?.mode==='walk'&&this.canActivate()===true;}catch{return false;}}
 neutralize(){this.input.suspend();this.input.consumeWheel?.();const player=this.getPlayer();if(player?.velocity){player.velocity.x=0;player.velocity.z=0;}}
 activate(){
  if(this.disposed)return false;if(this.active)return this.maintain();if(!this.allowed())return false;
  this.priorEnabled=this.input.enabled===true;this.active=true;
  try{this.neutralize();try{this.document?.exitPointerLock?.()?.catch?.(()=>{});}catch{}return true;}catch(error){this.deactivate();throw error;}
 }
 maintain(){if(!this.active||this.disposed)return false;if(!this.allowed()){this.deactivate();return false;}this.neutralize();return true;}
 deactivate(){
  if(!this.active)return;this.active=false;
  try{this.input.suspend();this.input.consumeWheel?.();let resume=false;try{resume=this.priorEnabled&&this.canResume()===true;}catch{}if(resume)this.input.resume();}
  finally{this.priorEnabled=false;this.canvas.focus?.();}
 }
 dispose(){if(this.disposed)return;try{this.deactivate();}finally{this.disposed=true;for(const name of this.pointerEvents)this.canvas.removeEventListener(name,this.blockPointer,true);}}
}
