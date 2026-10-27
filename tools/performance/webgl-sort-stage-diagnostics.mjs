// Diagnostic only: caller must suspend application GL work for this async scope.
export async function profileWebGLMergeStages(gl,sorter,options) {
 const startedAt=performance.now(),deadline=startedAt+20000,extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 if(!extension)return {diagnosticOnly:true,status:'unavailable',reason:'GPU timer query extension unavailable'};
 const shaders=[],programs=[],textures=[],framebuffers=[],queries=new Set(),vaos=[],stages=[],totalsBefore=[],totalsAfter=[],points=[],fragments=[];
 const originalDraw=gl.drawArrays,modes=[gl.BLEND,gl.DEPTH_TEST,gl.STENCIL_TEST,gl.SCISSOR_TEST,gl.CULL_FACE,gl.RASTERIZER_DISCARD,gl.DITHER,gl.POLYGON_OFFSET_FILL,gl.SAMPLE_ALPHA_TO_COVERAGE,gl.SAMPLE_COVERAGE];
 let activeQuery=null,wrapper=null,shape=null,status='running',error=null,comparison=null;
 const activeTexture=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);
 const saved={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),draw:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),read:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),viewport:Array.from(gl.getParameter(gl.VIEWPORT)),scissor:Array.from(gl.getParameter(gl.SCISSOR_BOX)),mask:Array.from(gl.getParameter(gl.COLOR_WRITEMASK)),texture2D:gl.getParameter(gl.TEXTURE_BINDING_2D),textureArray:gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY),sampler:gl.getParameter(gl.SAMPLER_BINDING),activeTexture,modes:modes.map(mode=>[mode,gl.isEnabled(mode)]),pack:gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING),arrayBuffer:gl.getParameter(gl.ARRAY_BUFFER_BINDING),packAlignment:gl.getParameter(gl.PACK_ALIGNMENT),packRowLength:gl.getParameter(gl.PACK_ROW_LENGTH),packSkipPixels:gl.getParameter(gl.PACK_SKIP_PIXELS),packSkipRows:gl.getParameter(gl.PACK_SKIP_ROWS)};gl.activeTexture(activeTexture);
 const check=()=>{if(performance.now()>=deadline)throw Error('Stage diagnostic exceeded 20 seconds');if(gl.isContextLost())throw Error('WebGL context lost');if(gl.getParameter(extension.GPU_DISJOINT_EXT))throw Error('Disjoint GPU timer results invalid');};
 const begin=()=>{check();if(activeQuery||gl.getQuery(extension.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))throw Error('Nested or external GPU timer query');const query=gl.createQuery();if(!query)throw Error('Query allocation failed');queries.add(query);gl.beginQuery(extension.TIME_ELAPSED_EXT,query);activeQuery=query;return query;};
 const end=()=>{gl.endQuery(extension.TIME_ELAPSED_EXT);activeQuery=null;};
 const result=async query=>{gl.flush();for(;;){check();if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){const ns=gl.getQueryParameter(query,gl.QUERY_RESULT);gl.deleteQuery(query);queries.delete(query);return ns/1e6;}await new Promise(resolve=>setTimeout(resolve,4));}};
 const time=async operation=>{const query=begin();try{operation();}finally{end();}return result(query);};
 const compile=(vertex,fragment)=>{const program=gl.createProgram();if(!program)throw Error('Program allocation failed');programs.push(program);for(const[type,source]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));return program;};
 const header='#version 300 es\nprecision highp float;precision highp int;\n';
 const triangle=header+'void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0,1);}';
 const pointVertex=header+`uniform highp usampler2D inputPairs;uniform int targetWidth;uniform int targetHeight;flat out uvec2 pairValue;void main(){ivec2 pixel=ivec2(gl_VertexID%targetWidth,gl_VertexID/targetWidth);pairValue=texelFetch(inputPairs,pixel,0).rg;gl_Position=vec4((vec2(pixel)+vec2(.5))/vec2(targetWidth,targetHeight)*2.0-1.0,0,1);gl_PointSize=1.0;}`;
 const pointFragment=header+'flat in uvec2 pairValue;layout(location=0)out uvec2 outputPair;void main(){outputPair=pairValue;}';
 const copyFragment=header+'uniform highp usampler2D inputPairs;layout(location=0)out uvec2 outputPair;void main(){outputPair=texelFetch(inputPairs,ivec2(gl_FragCoord.xy),0).rg;}';
 const target=()=>{const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();if(texture)textures.push(texture);if(framebuffer)framebuffers.push(framebuffer);if(!texture||!framebuffer)throw Error('Identity target allocation failed');gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG32UI,shape.pairWidth,shape.pairHeight);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Identity framebuffer incomplete');return {texture,framebuffer};};
 const stats=values=>({samples:values,meanMs:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,minMs:values.length?Math.min(...values):null,maxMs:values.length?Math.max(...values):null});
 try {
  check();if(gl.getParameter(gl.TRANSFORM_FEEDBACK_ACTIVE))throw Error('End transform feedback before stage diagnostic');
  // Two whole-sort reference samples before pass instrumentation, then two after.
  for(let index=0;index<2;index++)totalsBefore.push(await time(()=>{shape=sorter.sort(options);}));
  const issued=[];let ordinal=0;
  wrapper=function(...args){const index=ordinal++,query=begin(),start=performance.now();try{return originalDraw.apply(this,args);}finally{end();issued.push({index,query,start,end:performance.now(),mode:args[0],vertices:args[2]});}};
  gl.drawArrays=wrapper;
  try{shape=sorter.sort(options);}finally{if(gl.drawArrays===wrapper)gl.drawArrays=originalDraw;}
  if(issued.length!==shape.passes+2)throw Error('Unexpected sorter draw count');
  for(const item of issued){const gpuMs=await result(item.query);stages.push({stage:item.index===0?'init':item.index===issued.length-1?'pack':'merge-'+item.index,runLength:item.index>0&&item.index<issued.length-1?2**(item.index-1):null,vertices:item.vertices,gpuMs,cpuSubmissionMs:item.end-item.start});}
  const pointProgram=compile(pointVertex,pointFragment),fragmentProgram=compile(triangle,copyFragment),pointTarget=target(),fragmentTarget=target(),vao=gl.createVertexArray();if(!vao)throw Error('Identity VAO allocation failed');vaos.push(vao);
  const drawIdentity=(program,output,point)=>{
   for(const mode of modes)gl.disable(mode);gl.colorMask(true,true,true,true);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindSampler(0,null);gl.bindTexture(gl.TEXTURE_2D,shape.pairTexture);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,output.framebuffer);gl.viewport(0,0,shape.pairWidth,shape.pairHeight);gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'inputPairs'),0);
   if(point){gl.uniform1i(gl.getUniformLocation(program,'targetWidth'),shape.pairWidth);gl.uniform1i(gl.getUniformLocation(program,'targetHeight'),shape.pairHeight);}
   originalDraw.call(gl,point?gl.POINTS:gl.TRIANGLES,0,point?shape.capacity:3);
  };
  // Alternate both controls for two warmup and five measured cycles.
  for(let cycle=0;cycle<7;cycle++){
   for(const point of cycle%2?[false,true]:[true,false]){const elapsed=await time(()=>drawIdentity(point?pointProgram:fragmentProgram,point?pointTarget:fragmentTarget,point));if(cycle>=2)(point?points:fragments).push(elapsed);}
  }
  if(options.validateCopies!==false){
   const read=framebuffer=>{check();const pixels=new Uint32Array(shape.pairWidth*shape.pairHeight*4);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.pixelStorei(gl.PACK_ALIGNMENT,1);gl.pixelStorei(gl.PACK_ROW_LENGTH,0);gl.pixelStorei(gl.PACK_SKIP_PIXELS,0);gl.pixelStorei(gl.PACK_SKIP_ROWS,0);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,framebuffer);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,shape.pairWidth,shape.pairHeight,gl.RGBA_INTEGER,gl.UNSIGNED_INT,pixels);const errorCode=gl.getError();if(errorCode!==gl.NO_ERROR)throw Error('Identity validation GL error: '+errorCode);return pixels;};
   const originalTarget=gl.createFramebuffer();if(!originalTarget)throw Error('Original pair validation FBO allocation failed');framebuffers.push(originalTarget);gl.bindFramebuffer(gl.FRAMEBUFFER,originalTarget);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,shape.pairTexture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Original validation framebuffer incomplete');
   const original=read(originalTarget),point=read(pointTarget.framebuffer),fragment=read(fragmentTarget.framebuffer);let pointDifferences=0,fragmentDifferences=0,pointFragmentDifferences=0,firstPointDifference=null,firstFragmentDifference=null;
   for(let index=0;index<shape.capacity;index++){if((index&16383)===0)check();for(let component=0;component<2;component++){const offset=index*4+component;if(point[offset]!==original[offset]){pointDifferences++;firstPointDifference??=index;}if(fragment[offset]!==original[offset]){fragmentDifferences++;firstFragmentDifference??=index;}if(point[offset]!==fragment[offset])pointFragmentDifferences++;}}
   comparison={comparedPairs:shape.capacity,comparedComponents:shape.capacity*2,pointDifferences,fragmentDifferences,pointFragmentDifferences,firstPointDifference,firstFragmentDifference,identical:pointDifferences===0&&fragmentDifferences===0};
  }
  for(let index=0;index<2;index++)totalsAfter.push(await time(()=>sorter.sort(options)));
  check();status='complete';
 }catch(value){status='unavailable-or-failed';error=String(value?.stack??value);}
 finally {
  if(gl.drawArrays===wrapper)gl.drawArrays=originalDraw;
  if(activeQuery){try{end();}catch{activeQuery=null;}}
  for(const query of queries)gl.deleteQuery(query);for(const framebuffer of framebuffers)gl.deleteFramebuffer(framebuffer);for(const texture of textures)gl.deleteTexture(texture);for(const program of programs)gl.deleteProgram(program);for(const shader of shaders)gl.deleteShader(shader);for(const vao of vaos)gl.deleteVertexArray(vao);
  gl.useProgram(saved.program);gl.bindVertexArray(saved.vao);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,saved.draw);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,saved.read);gl.viewport(...saved.viewport);gl.scissor(...saved.scissor);gl.colorMask(...saved.mask);for(const[mode,enabled]of saved.modes)enabled?gl.enable(mode):gl.disable(mode);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,saved.texture2D);gl.bindTexture(gl.TEXTURE_2D_ARRAY,saved.textureArray);gl.bindSampler(0,saved.sampler);gl.activeTexture(saved.activeTexture);gl.bindBuffer(gl.ARRAY_BUFFER,saved.arrayBuffer);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,saved.pack);gl.pixelStorei(gl.PACK_ALIGNMENT,saved.packAlignment);gl.pixelStorei(gl.PACK_ROW_LENGTH,saved.packRowLength);gl.pixelStorei(gl.PACK_SKIP_PIXELS,saved.packSkipPixels);gl.pixelStorei(gl.PACK_SKIP_ROWS,saved.packSkipRows);
 }
 return {diagnosticOnly:true,status,error,elapsedMs:performance.now()-startedAt,count:shape?.count??options.count,capacity:shape?.capacity??options.capacity,stages,stageSumMs:stages.reduce((sum,item)=>sum+item.gpuMs,0),wholeSortBefore:stats(totalsBefore),wholeSortAfter:stats(totalsAfter),identityPoints:stats(points),identityFragment:stats(fragments),exactCopyComparison:comparison,caveats:['One instrumented sort; per-pass queries perturb submission and GPU scheduling. Compare whole-sort controls before/after.','Identity POINTS and fragment copies are controls only, not sorting results or a measured replacement algorithm.','Caller must suspend other GL work throughout awaits; restore renderer cache/target after this raw diagnostic scope.','Copy validation uses explicit synchronous readPixels outside all timing queries. Timer disjoint/context loss/deadline rejects evidence.']};
}
