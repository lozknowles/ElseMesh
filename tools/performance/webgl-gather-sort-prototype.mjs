// Diagnostic prototype only. Serialize createWebGLGatherSorter.toString() into a page.
export function createWebGLGatherSorter(gl) {
 const limit=1048576,maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
 if(!gl.createVertexArray||maxTextureSize<4096||gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)<1)throw Error('WebGL2 with vertex texture fetch and 4096-wide integer targets required');
 let disposed=false,allocation=null;
 const programs=[],textures=[],framebuffers=[],vaos=[];
 const vertexHeader='#version 300 es\nprecision highp float;precision highp int;\n';
 const fragmentHeader='#version 300 es\nprecision highp float;precision highp int;\n';
 const triangle=vertexHeader+`void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0,1);}`;
 const initFragment=kind=>fragmentHeader+`
 ${kind==='r32ui'?'uniform highp usampler2D sourceKeys;':'uniform highp sampler2DArray sourceKeys;'}
 uniform int sourceWidth;uniform int pointCount;uniform int pairWidth;
 layout(location=0) out uvec2 pairValue;
 void main(){int index=int(gl_FragCoord.y)*pairWidth+int(gl_FragCoord.x);uint key=0x7f800000u;
 if(index<pointCount){ivec2 coord=ivec2(index%sourceWidth,index/sourceWidth);
 ${kind==='r32ui'?'key=texelFetch(sourceKeys,coord,0).r;':'uvec4 bytes=uvec4(round(texelFetch(sourceKeys,ivec3(coord,0),0)*255.0));key=bytes.x|(bytes.y<<8u)|(bytes.z<<16u)|(bytes.w<<24u);'}}
 pairValue=uvec2(key<0x7f800000u?(key|0x80000000u):0u,uint(index));}`;
 const gatherFragment=fragmentHeader+`
 uniform highp usampler2D sourcePairs;uniform int pairWidth;uniform int capacity;uniform int runLength;
 layout(location=0) out uvec2 pairValue;
 uvec2 fetchPair(int i){return texelFetch(sourcePairs,ivec2(i%pairWidth,i/pairWidth),0).rg;}
 bool precedes(uvec2 a,uvec2 b){return a.x>b.x||(a.x==b.x&&a.y<b.y);}
 void main(){int index=int(gl_FragCoord.y)*pairWidth+int(gl_FragCoord.x);
 if(index>=capacity){pairValue=uvec2(0u,uint(index));return;}
 int blockStart=(index/(runLength*2))*(runLength*2);int middle=min(blockStart+runLength,capacity);int blockEnd=min(blockStart+runLength*2,capacity);
 int aLen=middle-blockStart;int bLen=blockEnd-middle;int k=index-blockStart;
 int lo=max(0,k-bLen);int hi=min(k,aLen);
 // Merge-path partition for the prefix of length k. Bounds ensure every fetch
 // belongs to an existing run, including a partial final block or empty B.
 for(int step=0;step<21;step++){if(lo>=hi)break;int mid=lo+(hi-lo)/2;int j=k-mid;
  bool advance=false;if(mid<aLen&&j>0){advance=precedes(fetchPair(blockStart+mid),fetchPair(middle+j-1));}
  if(advance)lo=mid+1;else hi=mid;
 }
 int i=lo;int j=k-i;
 if(i>=aLen)pairValue=fetchPair(middle+j);
 else if(j>=bLen)pairValue=fetchPair(blockStart+i);
 else{uvec2 a=fetchPair(blockStart+i);uvec2 b=fetchPair(middle+j);pairValue=precedes(a,b)?a:b;}
 }`;
 const packFragment=fragmentHeader+`
 uniform highp usampler2D sourcePairs;uniform int pairWidth;uniform int capacity;
 layout(location=0) out uvec4 ordering;
 uint at(int index){if(index>=capacity)return 0u;uvec2 p=texelFetch(sourcePairs,ivec2(index%pairWidth,index/pairWidth),0).rg;return p.x!=0u?p.y:0u;}
 void main(){int base=(int(gl_FragCoord.y)*4096+int(gl_FragCoord.x))*4;ordering=uvec4(at(base),at(base+1),at(base+2),at(base+3));}`;
 function compile(vertex,fragment){
  const shaders=[];let program=null;
  try{for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Merge-sort shader compile: '+gl.getShaderInfoLog(shader));}
   program=gl.createProgram();if(!program)throw Error('Program allocation failed');for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Merge-sort program link: '+gl.getProgramInfoLog(program));programs.push(program);return program;
  }catch(error){if(program)gl.deleteProgram(program);throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}
 }
 const modes=[gl.BLEND,gl.DEPTH_TEST,gl.STENCIL_TEST,gl.SCISSOR_TEST,gl.CULL_FACE,gl.RASTERIZER_DISCARD,gl.DITHER,gl.POLYGON_OFFSET_FILL,gl.SAMPLE_ALPHA_TO_COVERAGE,gl.SAMPLE_COVERAGE];
 function captureState(){
  const activeTexture=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);
  const state={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),drawFramebuffer:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),readFramebuffer:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),viewport:Array.from(gl.getParameter(gl.VIEWPORT)),scissor:Array.from(gl.getParameter(gl.SCISSOR_BOX)),colorMask:Array.from(gl.getParameter(gl.COLOR_WRITEMASK)),activeTexture,texture2D:gl.getParameter(gl.TEXTURE_BINDING_2D),textureArray:gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY),sampler:gl.getParameter(gl.SAMPLER_BINDING),modes:modes.map(mode=>[mode,gl.isEnabled(mode)]),pack:gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING),packAlignment:gl.getParameter(gl.PACK_ALIGNMENT),packRowLength:gl.getParameter(gl.PACK_ROW_LENGTH),packSkipPixels:gl.getParameter(gl.PACK_SKIP_PIXELS),packSkipRows:gl.getParameter(gl.PACK_SKIP_ROWS)};
  gl.activeTexture(activeTexture);return state;
 }
 function restoreState(state){
  gl.useProgram(state.program);gl.bindVertexArray(state.vao);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,state.drawFramebuffer);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,state.readFramebuffer);gl.viewport(...state.viewport);gl.scissor(...state.scissor);gl.colorMask(...state.colorMask);
  for(const [mode,enabled] of state.modes)enabled?gl.enable(mode):gl.disable(mode);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,state.texture2D);gl.bindTexture(gl.TEXTURE_2D_ARRAY,state.textureArray);gl.bindSampler(0,state.sampler);gl.activeTexture(state.activeTexture);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER,state.pack);gl.pixelStorei(gl.PACK_ALIGNMENT,state.packAlignment);gl.pixelStorei(gl.PACK_ROW_LENGTH,state.packRowLength);gl.pixelStorei(gl.PACK_SKIP_PIXELS,state.packSkipPixels);gl.pixelStorei(gl.PACK_SKIP_ROWS,state.packSkipRows);
 }
 function scoped(operation){const state=captureState();try{return operation();}finally{restoreState(state);}}
 function configure(){for(const mode of modes)gl.disable(mode);gl.colorMask(true,true,true,true);gl.activeTexture(gl.TEXTURE0);gl.bindSampler(0,null);gl.bindVertexArray(vao);}
 function uniform(program,name,value){gl.uniform1i(gl.getUniformLocation(program,name),value);}
 function target(width,height,format){
  const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();if(!texture||!framebuffer){if(texture)gl.deleteTexture(texture);if(framebuffer)gl.deleteFramebuffer(framebuffer);throw Error('Sort target allocation failed');}
  textures.push(texture);framebuffers.push(framebuffer);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texStorage2D(gl.TEXTURE_2D,1,format,width,height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Merge-sort framebuffer incomplete');return {texture,framebuffer,width,height};
 }
 function releaseAllocation(){for(const framebuffer of framebuffers.splice(0))gl.deleteFramebuffer(framebuffer);for(const texture of textures.splice(0))gl.deleteTexture(texture);allocation=null;}
 function allocate(capacity){
  if(allocation?.capacity===capacity)return allocation;
  releaseAllocation();const pairWidth=Math.min(2048,capacity),pairHeight=Math.ceil(capacity/pairWidth),orderingHeight=Math.ceil(capacity/16384);
  if(pairHeight>maxTextureSize||orderingHeight>maxTextureSize)throw Error('Sort targets exceed texture limits');
  try{allocation={capacity,pairWidth,pairHeight,pairs:[target(pairWidth,pairHeight,gl.RG32UI),target(pairWidth,pairHeight,gl.RG32UI)],ordering:target(4096,orderingHeight,gl.RGBA32UI)};return allocation;}catch(error){releaseAllocation();throw error;}
 }
 let vao,initR32,initRgba,merge,pack;
 try{initR32=compile(triangle,initFragment('r32ui'));initRgba=compile(triangle,initFragment('rgba8-array'));merge=compile(triangle,gatherFragment);pack=compile(triangle,packFragment);vao=gl.createVertexArray();if(!vao)throw Error('VAO allocation failed');vaos.push(vao);}
 catch(error){for(const program of programs)gl.deleteProgram(program);for(const vertexArray of vaos)gl.deleteVertexArray(vertexArray);throw error;}
 const api={
  sort({sourceTexture,sourceKind='r32ui',sourceWidth=2048,count,capacity=Math.ceil(count/16384)*16384}={}){
   if(disposed)throw Error('Sorter disposed');if(gl.isContextLost())throw Error('WebGL context lost');
   if(gl.getParameter(gl.TRANSFORM_FEEDBACK_ACTIVE))throw Error('Caller must end transform feedback before diagnostic sort');
   if(!['r32ui','rgba8-array'].includes(sourceKind)||!sourceTexture||!gl.isTexture(sourceTexture))throw Error('Existing key texture and supported sourceKind required');
   if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(capacity)||capacity<1||capacity<count||capacity>limit||!Number.isSafeInteger(sourceWidth)||sourceWidth<1||sourceWidth>maxTextureSize||Math.ceil(count/sourceWidth)>maxTextureSize)throw Error('Invalid bounded count/capacity/source width');
   return scoped(()=>{
    configure();const resources=allocate(capacity),{pairWidth,pairHeight}=resources;resources.finalPairs=null;let output=resources.pairs[0],scratch=resources.pairs[1],passes=0;
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,output.framebuffer);gl.viewport(0,0,pairWidth,pairHeight);const init=sourceKind==='r32ui'?initR32:initRgba;gl.useProgram(init);gl.bindTexture(sourceKind==='r32ui'?gl.TEXTURE_2D:gl.TEXTURE_2D_ARRAY,sourceTexture);uniform(init,'sourceKeys',0);uniform(init,'sourceWidth',sourceWidth);uniform(init,'pointCount',count);uniform(init,'pairWidth',pairWidth);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.useProgram(merge);uniform(merge,'sourcePairs',0);uniform(merge,'pairWidth',pairWidth);uniform(merge,'capacity',capacity);
    for(let runLength=1;runLength<capacity;runLength*=2){if(++passes>20)throw Error('Merge pass bound exceeded');gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,scratch.framebuffer);gl.bindTexture(gl.TEXTURE_2D,output.texture);uniform(merge,'runLength',runLength);gl.drawArrays(gl.TRIANGLES,0,3);[output,scratch]=[scratch,output];}
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,resources.ordering.framebuffer);gl.viewport(0,0,4096,resources.ordering.height);gl.useProgram(pack);gl.bindTexture(gl.TEXTURE_2D,output.texture);uniform(pack,'sourcePairs',0);uniform(pack,'pairWidth',pairWidth);uniform(pack,'capacity',capacity);gl.drawArrays(gl.TRIANGLES,0,3);
    allocation.finalPairs=output;allocation.count=count;allocation.passes=passes;
    return {diagnosticOnly:true,algorithm:'fragment-merge-path-gather',count,capacity,passes,pairTexture:output.texture,pairWidth,pairHeight,orderingTexture:resources.ordering.texture,orderingWidth:4096,orderingHeight:resources.ordering.height,activeCount:null,ownsTextures:true};
   });
  },
  readResultForValidation(){
   if(disposed||!allocation?.finalPairs)throw Error('No current sort result');
   return scoped(()=>{const result=allocation,pairPixels=new Uint32Array(result.pairWidth*result.pairHeight*4),pairs=new Uint32Array(result.capacity*2),ordering=new Uint32Array(4096*result.ordering.height*4);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.pixelStorei(gl.PACK_ALIGNMENT,1);gl.pixelStorei(gl.PACK_ROW_LENGTH,0);gl.pixelStorei(gl.PACK_SKIP_PIXELS,0);gl.pixelStorei(gl.PACK_SKIP_ROWS,0);
    // WebGL2 portable unsigned-integer readback uses RGBA_INTEGER even for RG32UI.
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,result.finalPairs.framebuffer);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,result.pairWidth,result.pairHeight,gl.RGBA_INTEGER,gl.UNSIGNED_INT,pairPixels);
    for(let index=0;index<result.capacity;index++){pairs[index*2]=pairPixels[index*4];pairs[index*2+1]=pairPixels[index*4+1];}
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,result.ordering.framebuffer);gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(0,0,4096,result.ordering.height,gl.RGBA_INTEGER,gl.UNSIGNED_INT,ordering);
    let activeCount=0;for(let index=0;index<result.capacity;index++)if(pairs[index*2]!==0)activeCount++;
    return {diagnosticOnly:true,count:result.count,capacity:result.capacity,activeCount,pairs:pairs.subarray(0,result.capacity*2),ordering,passes:result.passes};
   });
  },
  dispose(){if(disposed)return;disposed=true;releaseAllocation();for(const program of programs.splice(0))gl.deleteProgram(program);for(const vertexArray of vaos.splice(0))gl.deleteVertexArray(vertexArray);},
  notes:['Experimental fullscreen fragment merge-path gather; exact unsigned descending stable-index order. Invalid key >=+Infinity and padding sort last; packed invalid ordering is zero.','sort submits GPU work only; readResultForValidation explicitly performs synchronous diagnostic readback.','Raw shared GL state is captured/restored. Caller must serialize against renderer work; integration should also call renderer.resetState() and restore its target to reconcile renderer caches.','Returned textures remain sorter-owned and are reused or deleted on capacity change/dispose; consume before the next sort.','No GPU timing queries, waits, finish, readPixels, fences or buffer readback are issued by sort.']
 };
 return api;
}
