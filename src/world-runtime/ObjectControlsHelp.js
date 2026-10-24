export function accessObjectLabel(project,objectId){
 const object=project?.objects?.find(o=>o.id===objectId),terminal=project?.terminals?.find(t=>t.objectId===objectId);
 const name=object?.name?.trim()||({c64:'Commodore 64',bbc:'BBC Micro',sun:'Sun workstation'}[terminal?.kind])||(object?.kind==='neon-sign'?'Neon sign':'Computer');
 const shortId=objectId.length>20?objectId.slice(0,8)+'…'+objectId.slice(-6):objectId;
 return name+' · '+shortId;
}
export function supportedObjectActions(project){
 const terminalIds=new Set((project?.terminals??[]).map(t=>t.objectId));
 return (project?.objects??[]).flatMap(o=>o.kind==='computer'||terminalIds.has(o.id)?[{objectId:o.id,actions:['computer.use']}]:o.kind==='neon-sign'?[{objectId:o.id,actions:['neon.power','neon.configure']}]:[]);
}
export function objectActionRows(project,snapshot,{fresh=false}={}){
 const present=new Map((project?.objects??[]).map(o=>[o.id,o])),rules=supportedObjectActions(project);
 return rules.filter(r=>present.has(r.objectId)).flatMap(rule=>rule.actions.map(action=>{
  const object=present.get(rule.objectId),effective=snapshot?.effectiveActions?.find(r=>r.objectId===rule.objectId)?.actions??[];
  return {objectId:rule.objectId,action,label:accessObjectLabel(project,object.id)+' · '+({'computer.use':'Use computer','neon.power':'Switch sign power','neon.configure':'Configure sign'}[action]??action),allowed:fresh&&effective.includes(action),known:fresh};
 }));
}
export class ObjectControlsHelp {
 constructor({getProject,getSnapshot,getPlayerNodeId,isFresh,replayWelcome=()=>{},hasWelcome=()=>false,canOpen=()=>true,onOpen=()=>{},onClose=()=>{}}){
  Object.assign(this,{getProject,getSnapshot,getPlayerNodeId,isFresh,replayWelcome,hasWelcome,canOpen,onOpen,onClose});
  this.dialog=document.createElement('dialog');this.dialog.id='object-controls-help';this.dialog.setAttribute('aria-label','Controls and interactions');this.dialog.style.cssText='max-width:min(600px,90vw);max-height:85vh;overflow:auto;background:#152129;color:#eff7fb;border:1px solid #64818f;border-radius:12px;padding:24px';
  this.body=document.createElement('div');this.dialog.append(this.body);const close=document.createElement('button');close.textContent='Close · F1';close.onclick=()=>this.close();this.dialog.append(close);this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});document.body.append(this.dialog);
  this.key=event=>{if(event.code!=='F1')return;event.preventDefault();if(this.dialog.open)this.close();else if(this.canOpen()){this.render();this.onOpen();document.exitPointerLock?.();this.dialog.showModal();}};window.addEventListener('keydown',this.key);
 }
 get open(){return this.dialog.open;}
 render(){
  this.body.replaceChildren();const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;this.body.append(e);return e;};
  add('h2','Controls and interactions');add('p','W A S D / arrow keys: move and look · Mouse: look · Space: jump · Shift: run · V: change view · K: appearance · H: world panel · F1: help');
  add('p','E: interact with a nearby computer. Sign controls are inside its linked computer.');
  if(this.hasWelcome()){const replay=document.createElement('button');replay.textContent='Replay world welcome';replay.onclick=()=>{this.close();this.replayWelcome();};this.body.append(replay);}
  const rows=objectActionRows(this.getProject(),this.getSnapshot(),{playerNodeId:this.getPlayerNodeId(),fresh:this.isFresh()});
  if(!rows.length)add('p','No supported computer or sign interactions in this world.');
  for(const row of rows){const p=document.createElement('p'),label=document.createElement(row.allowed?'span':'s');label.textContent=row.label;p.append(label,document.createTextNode(row.allowed?' · Available':row.known?' · Access restricted':' · Access unavailable'));this.body.append(p);}
 }
 close(){if(!this.open)return;this.dialog.close();this.onClose();}
 dispose(){this.close();window.removeEventListener('keydown',this.key);this.dialog.remove();}
}
