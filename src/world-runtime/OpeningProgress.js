const stages=Object.freeze({
 'starting':{value:0,label:'Starting graphics…'},
 'renderer-ready':{value:12,label:'Graphics ready. Finding your world…'},
 'reading-world':{value:20,label:'Reading the opening world…'},
 'manifest-verified':{value:35,label:'World identity verified. Loading resources…'},
 'world-validated':{value:50,label:'World data validated. Building the island…'},
 'scene-built':{value:68,label:'Island built. Preparing graphics…'},
 'resources-ready':{value:84,label:'Graphics prepared. Entering the world…'},
 'world-ready':{value:96,label:'World ready. Drawing the first view…'},
 'first-frame':{value:100,label:'Ready to explore.'}
});
export class OpeningProgress {
 constructor({root,label,bar,percent}){
  Object.assign(this,{root,label,bar,percent});this.value=0;this.stage='starting';this.failed=false;this.render();
 }
 advance(stage){
  const next=stages[stage];if(!next||this.failed||next.value<this.value)return false;
  this.stage=stage;this.value=next.value;this.render();return true;
 }
 fail(message){
  this.failed=true;if(this.root)this.root.dataset.failed='';
  if(this.label)this.label.textContent='Opening world could not load: '+message;
  this.renderValue();
 }
 renderValue(){if(this.bar)this.bar.value=this.value;if(this.percent)this.percent.textContent=this.value+'%';}
 render(){this.renderValue();if(this.label)this.label.textContent=stages[this.stage].label;}
}
