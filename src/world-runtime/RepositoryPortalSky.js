import {FullscreenPass} from '../engine/render/FullscreenPass.js';
import {GPU} from '../engine/gpu/GPU.js';
import {DEPTH_FORMAT} from '../engine/render/SceneRenderer.js';

/** One shared HDR sky pass for mapped portal views; Sky/cloud resources remain externally owned. */
export class RepositoryPortalSky {
 constructor({sky,Pass=FullscreenPass,gpu=GPU,mrt=false}={}){
  this.options={sky,Pass,gpu};
  if(!sky)throw Error('Portal sky requires the existing shared Sky');
  this.pass=new Pass({
   label:'repository portal sky',
   modules:[sky.module],
   colorFormats:mrt?['rgba16float','rgba16float','rgba8unorm']:['rgba16float'],
   depthFormat:DEPTH_FORMAT,depthCompare:'equal',depthWrite:false,depth:0,blend:'none',
   code:mrt?`
struct PortalSkyOutput { @location(0) color:vec4f, @location(1) velocity:vec4f, @location(2) mask:vec4f };
@fragment fn fs(in:FSIn)->PortalSkyOutput{
 var out:PortalSkyOutput;
 out.color=vec4f(skyRadiance(viewRay(in.pos.xy*frame.invResolution),true),1.0);
 out.velocity=vec4f(0.0);out.mask=vec4f(0.0);return out;
}
`:/* wgsl */`
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
 createMRT(){return new RepositoryPortalSky({...this.options,mrt:true});}
 dispose(){this.ready=false;this.pass=null;}
 isReady(){return this.ready&&!!this.pass?.handle?.pipeline&&!this.pass?.handle.failed;}
 draw(renderPass,frameBlock,camera){
  if(!camera||camera.reversedDepth===false)throw Error('Portal sky requires reversed-depth camera');
  if(!this.isReady())throw Error('Portal sky pipeline is unavailable');
  this.pass.draw(renderPass,frameBlock);
 }
}
