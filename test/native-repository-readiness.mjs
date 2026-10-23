import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,PerspectiveCamera,Vector3} from '../src/engine/index.js';
import {Material} from '../src/engine/render/Material.js';
import {prepareNativeRepositoryResources,ReadiedRepositoryAvatar} from '../src/world-runtime/NativeRepositoryReadiness.js';
function setup(){
 const root=new Group(),material=new Material();root.add(new Mesh(new BoxGeometry(),material));let release;
 const calls=[],mr={precompiling:false,pipelines:new Map(),render(root,pass){assert.equal(this.precompiling,true);calls.push(pass);this.pipelines.set(material.id+'.'+pass.kind+pass.late+JSON.stringify(pass.defines),{handle:{pipeline:{},failed:false}});}};
 const gpu={submit(){calls.push('submit');},pipelinesReady:()=>new Promise(r=>release=r),queue:{onSubmittedWorkDone:async()=>calls.push('done')}},targets=[];
 const targetFactory=formats=>{const texture=()=>({view:()=>({}),destroy(){this.destroyed=true;}});const t={formats,textures:formats.map(texture),depthTexture:texture()};targets.push(t);return t;};
 return {root,mr,gpu,targetFactory,calls,targets,release:()=>release()};
}
test('exact main late shadow and clipped preview variants requested before async readiness; flags restore before await',async()=>{
 const f=setup(),pending=prepareNativeRepositoryResources({meshRenderer:f.mr,camera:{},root:f.root,gpu:f.gpu,targetFactory:f.targetFactory});assert.equal(f.mr.precompiling,false);assert.equal(f.calls.length,5);
 assert.deepEqual(f.calls.slice(0,4).map(p=>[p.kind,!!p.late,p.defines]),[['main',false,undefined],['main',true,undefined],['depth',false,undefined],['color',false,{PORTAL_CLIP:1}]]);
 f.release();const result=await pending;assert.equal(result.ready,true);assert.equal(result.pipelines,4);assert.equal(f.calls.at(-1),'done');assert.ok(f.targets.every(t=>t.textures.every(v=>v.destroyed)&&t.depthTexture.destroyed));
});
test('failed native pipeline rejects readiness and releases staging resources',async()=>{const f=setup(),pending=prepareNativeRepositoryResources({meshRenderer:f.mr,camera:{},root:f.root,gpu:f.gpu,targetFactory:f.targetFactory});for(const p of f.mr.pipelines.values())p.handle.failed=true;f.release();await assert.rejects(pending,/pipeline failed/);assert.equal(f.mr.precompiling,false);assert.ok(f.targets.every(t=>t.depthTexture.destroyed));});
test('synchronous compilation setup error restores source rendering state',async()=>{const f=setup();f.mr.render=()=>{throw Error('setup failed');};await assert.rejects(prepareNativeRepositoryResources({meshRenderer:f.mr,camera:{},root:f.root,gpu:f.gpu,targetFactory:f.targetFactory}),/setup failed/);assert.equal(f.mr.precompiling,false);});

test('original character readiness suppresses inherited procedural stand-ins and reveals only prepared model',()=>{
 class PendingCharacter extends ReadiedRepositoryAvatar{async loadCharacter(){}}
 const scene=new Group(),boat={model:{wheelPivot:{position:new Vector3()},lines:{deckY:0},group:new Group()},getYaw:()=>0},avatar=new PendingCharacter(scene,boat),camera=new PerspectiveCamera();
 avatar.cinematic={x:0,y:0,z:0,yaw:0,walk:false,mode:'walk'};avatar.update(.016,{},camera,true);assert.equal(avatar.group.visible,false,'pending original GLB never draws stand-in');
 const modelGroup=new Group();modelGroup.visible=false;avatar.scanned={group:modelGroup,current:'idle',play(){},update(){},dispose(){}};avatar.update(.016,{},camera,true);assert.equal(avatar.group.visible,false,'compiled variants pending');
 modelGroup.visible=true;avatar.update(.016,{},camera,true);assert.equal(avatar.group.visible,true);assert.ok(avatar.proceduralParts.every(part=>!part.visible));avatar.dispose();
});
