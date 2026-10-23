import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {createWorld,createLandscapeLayer,applyLandscapeBrush,createLandscapeImage,addLandscapeImage,updateLandscapeMaterial,packWorldRepository,loadWorldSource} from '../src/world-runtime/vendor/world-engine-contract.js';
import {hostedRepositorySource} from '../src/world-runtime/HostedRepository.js';import {localRepositorySource,isRepositoryContentPath} from '../src/world-runtime/LocalRepositoryFiles.js';
test('actual same-origin HTTP and folder pipelines preserve landscape component and hashed portable image',async()=>{
 let p=createWorld("Hosted landscape",32,32,9);p=createLandscapeLayer(p,{id:'paint',kind:'ground'});p=applyLandscapeBrush(p,{layerId:'paint',points:[[0,0,0]],radius:4,strength:1,falloff:.5,mode:'paint'});
 const image=createLandscapeImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/a0AAAAASUVORK5CYII=','Portable image');p=addLandscapeImage(p,image);p=updateLandscapeMaterial(p,p.landscape.materials[0].id,{imageRef:image.id});
 const packed=await packWorldRepository(p),seen=[];assert.ok([...packed.keys()].some(k=>k.startsWith('landscape-images/')));
 const server=createServer((req,res)=>{const key=req.url.slice('/world/'.length),bytes=packed.get(key);seen.push(key);if(!bytes){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Length':bytes.length});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const origin='http://127.0.0.1:'+server.address().port,loaded=await loadWorldSource(hostedRepositorySource(origin+'/world/',{origin}));assert.deepEqual(loaded.project.landscape,p.landscape);assert.ok(seen.some(k=>k.endsWith('/landscape.json')));assert.ok(seen.some(k=>k.startsWith('landscape-images/')));
 const folder=localRepositorySource([...packed].map(([path,bytes])=>({webkitRelativePath:'world/'+path,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})));assert.deepEqual((await loadWorldSource(folder)).project.landscape,p.landscape);
 }finally{await new Promise(r=>server.close(r));}
 for(const path of ['landscape-images/nohash.png','landscape-images/../key.pem','snapshots/'+'a'.repeat(64)+'/script.js'])assert.equal(isRepositoryContentPath(path),false);
});
