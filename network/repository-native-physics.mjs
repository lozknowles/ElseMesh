import {createNativeIslandResourceReader} from '../src/world-runtime/vendor/world-engine-contract.js';
import {sampleNativeField} from '../src/world-runtime/NativeIslandTerrain.js';
/** Admission-only verified fine heights. The returned immutable sampler does no I/O. */
export async function prepareNativeIslandPhysics(project,read){
 if(!project.nativeIsland)return null;
 const native=project.nativeIsland,grid=native.grid,reader=createNativeIslandResourceReader(project,read),refs=native.resources.filter(r=>r.channel==='height'&&r.level===0);
 if(refs.length!==256||grid.resolution!==2048||grid.size!==2048)throw Error('Native physics needs complete original fine heights.');
 const heights=new Float32Array(2048*2048),seen=new Set();let next=0,bytes=0;
 async function worker(){while(next<refs.length){const ref=refs[next++];if(ref.width!==128||ref.height!==128||ref.channels!==1||ref.format!=='f32le'||ref.x%128||ref.z%128||seen.has(ref.x+':'+ref.z))throw Error('Native physics height dimensions/coverage differ.');seen.add(ref.x+':'+ref.z);const decoded=await reader(ref.id),data=decoded.data;if(!(data instanceof Float32Array)||data.length!==16384)throw Error('Invalid decoded native physics heights.');for(let z=0;z<128;z++)heights.set(data.subarray(z*128,(z+1)*128),(ref.z+z)*2048+ref.x);bytes+=ref.bytes;}}
 await Promise.all(Array.from({length:4},worker));
 if(seen.size!==256||bytes!==16*1024*1024)throw Error('Incomplete native physics height admission.');
 const origin=grid.origin[0],size=grid.size;
 return Object.freeze({bytes,tiles:seen.size,heightAt:(x,z)=>sampleNativeField(heights,2048,origin,size,x,z)});
}
