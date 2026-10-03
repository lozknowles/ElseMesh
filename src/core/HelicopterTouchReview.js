// Explicit local-only test setup; flight and exit still use the normal game inputs.
export function installHelicopterTouchReview(app) {
  const panel=document.createElement('section');
  panel.setAttribute('aria-label','Helicopter touch review');
  panel.style.cssText='position:fixed;top:70px;left:8px;z-index:15000;background:#102b31e8;color:white;padding:8px;max-width:260px;font:12px monospace';
  const start=document.createElement('button');start.textContent='Prepare helicopter touch test';
  const output=document.createElement('output');output.setAttribute('aria-label','Helicopter touch state');output.style.display='block';
  panel.append(start,output);document.body.append(panel);
  start.onclick=()=>{
    if(document.getElementById('loader')?.style.display!=='none')return;
    const heli=app.thirdIsland,p=app.player,n=heli.loz.cinematic;
    if(heli.active)return;
    app.setFreeCam(false);app.qs.delete('view');
    p.mode='walk';p.position.set(n.x,n.y,n.z);p.velocity.set(0,0,0);
    if(!heli.collectKey())throw Error('Review could not collect rental key');
    p.position.set(heli.state.x,heli.state.y,heli.state.z);
    if(!heli.enter())throw Error('Review could not board helicopter');
    app.input.resume();
  };
  // Synthetic pointer integration checks for browsers without held-touch automation.
  // These exercise the actual button listeners and physics, not native touch capture.
  for(const [label,eventType,control] of [
    ['Synthetic Up hold','pointerdown','up'],['Synthetic Down hold','pointerdown','down'],
    ['Synthetic release','pointerup',null],['Synthetic cancel','pointercancel',null],
  ]) {
    const button=document.createElement('button');button.textContent=label;
    button.onclick=()=>{
      for(const name of control?[control]:['up','down']) {
        const target=document.querySelector(`[aria-label="Helicopter ${name} — hold"]`);
        if(!target)continue;
        const capture=target.setPointerCapture;
        try {
          // Synthetic pointers cannot obtain native capture. Stub only during dispatch.
          target.setPointerCapture=()=>{};
          target.dispatchEvent(new PointerEvent(eventType,{pointerId:name==='up'?901:902,pointerType:'touch',bubbles:true,cancelable:true}));
        } finally { target.setPointerCapture=capture; }
      }
    };
    panel.append(button);
  }
  setInterval(()=>{
    const h=app.thirdIsland,s=h.state;
    const report={active:h.active,mode:app.player.mode,grounded:s.grounded,y:s.y,
      agl:s.y-h.ground(s.x,s.z),speed:Math.hypot(s.vx,s.vz),rpm:s.rpm,
      up:app.input.down('Space'),down:app.input.down('KeyC'),touch:app.input.touchInterface,
      message:h.lastMessage};
    output.dataset.raw=JSON.stringify(report);
    output.textContent=`${report.mode} | AGL ${report.agl.toFixed(2)}m | ${report.grounded?'grounded':'airborne'} | speed ${report.speed.toFixed(2)} | Up ${report.up} Down ${report.down}`;
  },100);
}
