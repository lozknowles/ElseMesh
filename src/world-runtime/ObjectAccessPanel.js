import {supportedObjectActions,accessObjectLabel} from './ObjectControlsHelp.js';
const element=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
/** Private grant data is rendered only from the authority's administrator response. */
export class ObjectAccessPanel {
 constructor({client,host,parent,onStatus=()=>{}}){Object.assign(this,{client,host,onStatus});this.root=element('details');this.root.id='object-access';this.root.append(element('summary','Access'));this.body=element('div');this.root.append(this.body);parent.append(this.root);this.render(null);}
 render(snapshot){
  const fingerprint=JSON.stringify([snapshot&&{...snapshot,context:undefined,expiresAt:undefined},this.host.active?.identity.contentDigest]);if(fingerprint===this.fingerprint)return;this.fingerprint=fingerprint;
  const worldId=this.host.active?.identity.worldId;
  if(this.selectionWorldId!==worldId){this.selectedPlayer=null;this.selectedObject=null;this.selectionWorldId=worldId;}
  else{this.selectedPlayer=this.body.querySelector('[aria-label="Player for access"]')?.value||this.selectedPlayer;this.selectedObject=this.body.querySelector('[aria-label="Object for access"]')?.value||this.selectedObject;}
  this.body.replaceChildren();this.body.append(element('p',snapshot?snapshot.policyMode:'Connect to the world owner to view object access.'));
  if(!snapshot)return;
  this.body.append(element('p','Computer access needs a player grant and permission in this world. Sign controls also need permission for the linked sign.'));
  const grants=snapshot.grants??[],rules=snapshot.rules??[];
  if(!snapshot.isAdmin){this.body.append(element('p',grants.length?'Your grants: '+grants.map(g=>accessObjectLabel(this.host.active?.project,g.objectId)+' · '+g.action).join(', '):'Access restricted'));return;}
  this.body.append(element('p','Administrator · changes take effect for active sessions.'));
  const player=element('select');player.setAttribute('aria-label','Player for access');
  for(const item of snapshot.players??[]){const option=element('option',item.label+' · '+item.nodeId);option.value=item.nodeId;player.append(option);}
  const target=element('select');target.setAttribute('aria-label','Object for access');
  const project=this.host.active?.project;
  const supported=supportedObjectActions(project);
  for(const rule of supported){const option=element('option',accessObjectLabel(project,rule.objectId));option.value=rule.objectId;target.append(option);}
  if((snapshot.players??[]).some(p=>p.nodeId===this.selectedPlayer))player.value=this.selectedPlayer;
  if(supported.some(r=>r.objectId===this.selectedObject))target.value=this.selectedObject;
  this.selectedPlayer=player.value;this.selectedObject=target.value;
  this.body.append(player,target);const actions=element('div');this.body.append(actions);
  const draw=()=>{actions.replaceChildren();const rule=supported.find(r=>r.objectId===target.value);for(const action of rule?.actions??[]){const label=element('label',action+' '),checkbox=element('input');checkbox.type='checkbox';const inWorld=rules.some(r=>r.objectId===target.value&&r.actions.includes(action));checkbox.disabled=!inWorld;if(!inWorld)label.append(document.createTextNode('Access restricted by world policy '));checkbox.checked=grants.some(g=>g.playerNodeId===player.value&&g.objectId===target.value&&g.action===action);checkbox.onchange=async()=>{checkbox.disabled=true;try{await this.client.update({expectedRevision:snapshot.policyRevision,playerNodeId:player.value,objectId:target.value,action,allowed:checkbox.checked});this.onStatus('Access updated');}catch(error){checkbox.checked=!checkbox.checked;this.onStatus(error.message);}finally{checkbox.disabled=false;}};label.append(checkbox);actions.append(label);}if(!rule?.actions?.length)actions.append(element('p','Access restricted'));};
  player.onchange=()=>{this.selectedPlayer=player.value;draw();};target.onchange=()=>{this.selectedObject=target.value;draw();};draw();
 }
}
