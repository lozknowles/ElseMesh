import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as N from '../src/engine/index.js';
import {T} from '../src/world-runtime/vendor/world-engine-contract.js';
import {Material} from '../src/engine/render/Material.js';
import {SkinnedModel} from '../src/engine/render/Skinning.js';
import {SkinBounds} from '../src/engine/render/SkinBounds.js';
import {StorageBuffer} from '../src/engine/gpu/Texture.js';
import {parseGLB} from '../src/engine/loaders/GLTF.js';
import {projectMediaScreen,collectMediaScreenOccluders,mediaScreenUnobstructed} from '../src/world-runtime/MediaScreen.js';
const config={schema:'elsemesh.media-screen/1',provider:'youtube',videoId:'N-V7VpmoPkU',width:6.4};
function stockModel(t){
 // Exact installed GLB vertices/joints/weights + native Mesh shape and SkinnedModel pose path.
 // Joint upload is mocked: this is CPU source proof, not GPU/audible acceptance.
 t.mock.method(StorageBuffer.prototype,'write',()=>{});
 const bytes=readFileSync(new URL('../public/models/characters/stock-player.glb',import.meta.url)),g=parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),model=new SkinnedModel(g),node=g.nodes.find(n=>n.mesh!==undefined&&n.skin!==undefined);
 for(const primitive of g.meshes[node.mesh]){
  const a=primitive.attributes,weights=Float32Array.from(a.WEIGHTS_0.array);
  for(let i=0;i<weights.length;i+=4){const sum=weights[i]+weights[i+1]+weights[i+2]+weights[i+3];for(let k=0;k<4;k++)weights[i+k]/=sum;}
  const geometry=new N.BufferGeometry();geometry.setAttribute('position',new N.BufferAttribute(a.POSITION.array,3));geometry.setAttribute('skinIndex',new N.BufferAttribute(Uint32Array.from(a.JOINTS_0.array),4));geometry.setAttribute('skinWeight',new N.BufferAttribute(weights,4));
  const material=new Material({attributes:{skinIndex:'vec4u',skinWeight:'vec4f'},storage:{skinJoints:{storage:model.jointBuffer,access:'read'}}}),mesh=new N.Mesh(geometry,material);mesh.name='stock-player-native-shader-skin';model.meshes.push(mesh);model.materials.push(material);model.group.add(mesh);
 }
 assert(model.meshes.every(m=>m.isMesh&&!m.isSkinnedMesh));assert(model.meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0)>1000);
 return model;
}
function view(){
 const camera=new T.PerspectiveCamera(65,16/9,.1,1000);camera.position.set(6.5,4.65,-82);camera.lookAt(6.5,5.2,-89.8);camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
 const projection=projectMediaScreen(camera,new T.Matrix4().makeTranslation(6.5,5.2,-89.8),config,{left:0,top:0,width:1280,height:720}),active={root:new N.Group(),project:{environment:{windSpeed:5}}};
 return {camera,projection,active};
}
test('real native shader-skinned stock avatar uses current guarded pose bounds, never cached bind pose',t=>{
 const model=stockModel(t),f=view(),options={camera:f.camera,projection:f.projection,screenObjectId:'tv',avatarRoots:[model.group]},collect=()=>collectMediaScreenOccluders(f.active,options);
 let proof=collect();assert.equal(proof.complete,false);assert.match(proof.reasons.join(';'),/Native skinned mesh lacks trusted finite posed bounds/);
 model.enableAnimatedBounds();const clip=model.clipNames().find(n=>/walk/i.test(n));assert(clip);model.play(clip,{fade:.001});model.update(0);
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(const mesh of model.meshes){assert(mesh.skinBounds instanceof SkinBounds);const s=mesh.skinBounds.sphere;for(let k=0;k<3;k++){low[k]=Math.min(low[k],s.center.toArray()[k]-s.radius);high[k]=Math.max(high[k],s.center.toArray()[k]+s.radius);}}
 const center=low.map((v,k)=>(v+high[k])/2),extent=Math.max(...high.map((v,k)=>v-low[k])),scale=2/(high[1]-low[1]),shift=extent*10;
 model.group.scale.setScalar(scale);model.group.position.set(6.5-(center[0]+shift)*scale,5-center[1]*scale,-86-center[2]*scale);
 proof=collect();assert.equal(proof.complete,true,proof.reasons.join(';'));assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),true,'avatar is initially outside the complete TV sight cone');
 const before=model.meshes[0].skinBounds.sphere.center.x,root=model.gltf.roots[0];model.poseModifier=local=>{local[root].t[0]+=shift;};model.update(model.clipDuration(clip)/3);
 assert((model.meshes[0].skinBounds.sphere.center.x-before)*scale>5,'real joint matrices move the posed vertices well beyond bind-pose geometry');
 proof=collect();assert.equal(proof.complete,true,proof.reasons.join(';'));assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),false,'posed avatar now occludes TV even though original native Mesh geometry is unchanged');
 model.poseModifier=null;model.update(model.clipDuration(clip)/3);proof=collect();assert.equal(proof.complete,true);assert.equal(mediaScreenUnobstructed(f.projection,f.camera,proof.bounds,proof),true,'pose bounds are evaluated again after the avatar leaves');
 const trusted=model.meshes[0].skinBounds,oldRadius=trusted.sphere.radius;trusted.sphere.radius=Infinity;proof=collect();assert.equal(proof.complete,false);trusted.sphere.radius=oldRadius;model.meshes[0].skinBounds={valid:true,sphere:trusted.sphere};proof=collect();assert.equal(proof.complete,false,'untrusted posed-bound lookalikes cannot authorize visibility');model.meshes[0].skinBounds=trusted;
 for(const mesh of model.meshes){mesh.geometry.dispose();mesh.material.dispose();}
});
