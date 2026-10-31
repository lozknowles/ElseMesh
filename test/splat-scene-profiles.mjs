import test from 'node:test';
import assert from 'node:assert/strict';
import {QUALIFIED_SPLAT_PROFILES,SUNSET_SPLAT_PROFILE,TABLE_TENNIS_SPLAT_PROFILE,assertQualifiedSplatProfile,assertQualifiedReadinessProfile} from '../src/world-runtime/SplatSceneProfiles.js';
import {assertSupportedSplatScene,createSplatSceneAdapter,PINNED_SUNSET_SOG,PINNED_SUNSET_TRANSFORM,PINNED_SUNSET_REVIEW_SHA256} from '../src/world-runtime/SplatSceneAdapter.js';
import {PINNED_SUNSET_PHYSICS,assertPinnedSunsetPhysics} from '../src/world-runtime/SplatSceneSource.js';
import {prepareSplatWorldPhysics} from '../network/splat-world-physics.mjs';
import {T,createWorld} from '../src/world-runtime/vendor/world-engine-contract.js';
import {registerPinnedSparkReadiness} from '../src/world-runtime/SplatReadinessContract.js';
function project(profile){return {...createWorld('Profile admission'),splatScene:{schema:'elsemesh.splat-scene/1',asset:{...profile.asset,path:'splat-scenes/'+profile.asset.sha256+'.sog'},physics:{...profile.physics,path:'splat-scenes/'+profile.physics.sha256+'.json'},transform:structuredClone(profile.transform),scaleStatus:'assumed-gameplay',provenance:{videoSha256:'a'.repeat(64),plySha256:'a'.repeat(64),reviewSha256:profile.reviewSha256,qualificationSha256:'a'.repeat(64)}}};}
test('fixed coherent profiles retain legacy exports and the same bounded accumulator count',()=>{
 assert.equal(QUALIFIED_SPLAT_PROFILES.length,2);assert.equal(PINNED_SUNSET_SOG,SUNSET_SPLAT_PROFILE.asset);assert.equal(PINNED_SUNSET_PHYSICS,SUNSET_SPLAT_PROFILE.physics);assert.equal(PINNED_SUNSET_TRANSFORM,SUNSET_SPLAT_PROFILE.transform);assert.equal(PINNED_SUNSET_REVIEW_SHA256,SUNSET_SPLAT_PROFILE.reviewSha256);
 for(const profile of QUALIFIED_SPLAT_PROFILES){const p=project(profile);assert.equal(profile.asset.count,719538);assert.ok(Object.isFrozen(profile.transform.position));assert.equal(assertQualifiedSplatProfile(p),profile);assert.deepEqual(assertSupportedSplatScene(p),p.splatScene);assert.equal(assertQualifiedReadinessProfile({asset:p.splatScene.asset,project:p}),profile);}
 assertPinnedSunsetPhysics(project(SUNSET_SPLAT_PROFILE));assert.throws(()=>assertPinnedSunsetPhysics(project(TABLE_TENNIS_SPLAT_PROFILE)),/pinned/);
});
test('readiness cannot enroll the Room from an asset-only or mismatched profile claim',()=>{
 assert.equal(assertQualifiedReadinessProfile({asset:SUNSET_SPLAT_PROFILE.asset}),SUNSET_SPLAT_PROFILE);
 assert.throws(()=>assertQualifiedReadinessProfile({asset:TABLE_TENNIS_SPLAT_PROFILE.asset}),/verified prepared adapter/);
 assert.throws(()=>assertQualifiedReadinessProfile({asset:TABLE_TENNIS_SPLAT_PROFILE.asset,project:project(SUNSET_SPLAT_PROFILE)}),/verified prepared adapter/);
});
test('Room readiness registers the existing packed layout only with its coherent reviewed project',()=>{
 const p=project(TABLE_TENNIS_SPLAT_PROFILE),target=new T.WebGLArrayRenderTarget(2048,352,1,{format:T.RGBAIntegerFormat,type:T.UnsignedIntType,minFilter:T.NearestFilter,magFilter:T.NearestFilter,generateMipmaps:false});
 target.textures=[target.texture,target.texture.clone()];
 const ordering=new T.DataTexture(new Uint32Array(4),1,1),uniforms={ordering:{value:ordering},extSplats:{value:target.texture},extSplats2:{value:target.texture}},material=new T.ShaderMaterial({uniforms}),spark=new T.Mesh(new T.PlaneGeometry(),material),accumulator={target,extSplats:false,covSplats:false};
 Object.assign(spark,{uniforms,accumExtSplats:false,covSplats:false,display:accumulator,current:accumulator,accumulators:[]});const root=new T.Group();root.add(spark);const adapter={root,spark,state:{warmed:true,status:'ready',disposed:false,numSplats:719538}};
 try{assert.throws(()=>registerPinnedSparkReadiness(adapter,{asset:p.splatScene.asset}),/verified prepared adapter/);const contract=registerPinnedSparkReadiness(adapter,{asset:p.splatScene.asset,project:p});assert.equal(contract.diagnostics().active,true);contract.dispose();}finally{for(const texture of target.textures)texture.dispose();target.dispose();ordering.dispose();material.dispose();spark.geometry.dispose();}
});
test('unknown and mixed profile tuples reject before renderer or owner resource reads',async()=>{
 for(const profile of QUALIFIED_SPLAT_PROFILES){const other=profile===SUNSET_SPLAT_PROFILE?TABLE_TENNIS_SPLAT_PROFILE:SUNSET_SPLAT_PROFILE;
  for(const change of [p=>p.splatScene.asset.sha256='b'.repeat(64),p=>p.splatScene.asset.bytes--,p=>p.splatScene.asset.count--,p=>p.splatScene.physics={...p.splatScene.physics,...other.physics},p=>p.splatScene.physics.bytes--,p=>p.splatScene.transform.scale+=1e-10,p=>p.splatScene.transform.position[0]+=1e-10,p=>p.splatScene.transform.rotation[0]+=1e-10,p=>p.splatScene.provenance.reviewSha256=other.reviewSha256,p=>p.nativeIsland={}]){
   const p=project(profile);change(p);let reads=0;const read=async()=>{reads++;throw Error('unexpected resource read');};assert.throws(()=>assertQualifiedSplatProfile(p),/pinned/);await assert.rejects(createSplatSceneAdapter(p,{read}));await assert.rejects(prepareSplatWorldPhysics(p,read));assert.equal(reads,0);
  }
 }
});
