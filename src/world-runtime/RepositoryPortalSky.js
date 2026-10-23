import {FullscreenPass} from '../engine/render/FullscreenPass.js';
import {GPU} from '../engine/gpu/GPU.js';
import {DEPTH_FORMAT} from '../engine/render/SceneRenderer.js';

/** One shared HDR sky pass for mapped portal views; Sky/cloud resources remain externally owned. */
export class RepositoryPortalSky {
 constructor({sky,Pass=FullscreenPass,gpu=GPU}={}){
  if(!sky)throw Error('Portal sky requires the existing shared Sky');
  this.pass=new Pass({
   label:'repository portal sky',
   modules:[sky.module],
   colorFormats:['rgba16float'],
   depthFormat:DEPTH_FORMAT,depthCompare:'equal',depthWrite:false,depth:0,blend:'none',
   code:/* wgsl */`
fn fragment( in: FSIn ) -> vec4f {
 let uv = in.pos.xy * frame.invResolution;
 return vec4f( skyRadianceWithClouds( viewRay( uv ), true ), 1.0 );
}
`
  });
  this.ready=false;
  this.readyPromise=Promise.resolve().then(()=>gpu.pipelinesReady()).then(()=>{
   // pipelinesReady settles failed async compiles too; never invoke GPU.ready's sync fallback.
   if(!this.pass.handle?.pipeline||this.pass.handle.failed)throw Error('Portal sky pipeline is unavailable');
   this.ready=true;return true;
  });
  void this.readyPromise.catch(()=>{});
 }
 isReady(){return this.ready&&!!this.pass.handle?.pipeline&&!this.pass.handle.failed;}
 draw(renderPass,frameBlock,camera){
  if(!camera||camera.reversedDepth===false)throw Error('Portal sky requires reversed-depth camera');
  if(!this.isReady())throw Error('Portal sky pipeline is unavailable');
  this.pass.draw(renderPass,frameBlock);
 }
}
