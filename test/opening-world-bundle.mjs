import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readOpeningWorld,loadOpeningWorld,validateOpeningWorld} from '../src/world-runtime/OpeningWorld.js';
import {repositoryDigest} from '../src/world-runtime/vendor/world-engine-contract.js';

const worldId='elsemesh.world:fixture';
const repository='https://github.com/example/fixture/tree/'+'a'.repeat(40);
const manifest=new TextEncoder().encode(JSON.stringify({world:{worldId}}));
const digest=await repositoryDigest(manifest);
const bundled={schema:'elsemesh.opening-world/2',repository,worldId,contentDigest:digest,bundlePath:'worlds/loz-opening/'};

test('bundled configuration retains an immutable repository identity and a restricted relative path',()=>{
 assert.equal(validateOpeningWorld(bundled).bundled,true);
 for(const bundlePath of ['https://example.org/world/','/worlds/loz-opening/','../worlds/loz-opening/','./worlds/../private/','./worlds/.git/','./worlds/loz-opening/?x=1'])assert.throws(()=>validateOpeningWorld({...bundled,bundlePath}));
 assert.throws(()=>validateOpeningWorld({...bundled,repository:'https://github.com/example/fixture/tree/main'}));
 assert.throws(()=>validateOpeningWorld({...bundled,contentDigest:'0'.repeat(64),unexpected:true}));
});

test('nested offline package reads its own world and never requests GitHub',async()=>{
 const urls=[],root='http://127.0.0.1:8088/subdir/';
 const fetcher=async url=>{urls.push(String(url));if(String(url)===root+'opening-world.json')return new Response(JSON.stringify(bundled));if(String(url)===root+'worlds/loz-opening/world.json')return new Response(manifest);throw Error('Unexpected request');};
 const config=await readOpeningWorld({fetcher,baseURL:root+'index.html'});
 let activation;
 const app={host:{generation:0,active:null},portals:{activateOffline:async active=>active===app.host.active},load:async(source,options)=>{
  assert.equal(source.kind,'local');assert.equal(options.expectedWorldId,worldId);
  assert.deepEqual(await source.read('world.json',1048576),manifest);
  app.host.active={identity:{worldId,contentDigest:digest}};
  activation=true;return true;
 }};
 const active=await loadOpeningWorld(app,config,{fetcher,baseURL:root+'index.html'});
 assert.equal(active,app.host.active);assert.equal(activation,true);
 assert.deepEqual(urls,[root+'opening-world.json',root+'worlds/loz-opening/world.json',root+'worlds/loz-opening/world.json']);
});

test('wrong bundled manifest digest stops before scene activation',async()=>{
 const fetcher=async()=>new Response(new TextEncoder().encode('{"world":{"worldId":"wrong"}}'));
 const app={host:{generation:0},load(){throw Error('Must not load');}};
 await assert.rejects(loadOpeningWorld(app,bundled,{fetcher,baseURL:'http://localhost/subdir/index.html'}),/manifest does not match/);
});

test('missing optional opening config selects repository chooser',async()=>{
 assert.equal(await readOpeningWorld({fetcher:async()=>new Response('',{status:404}),baseURL:'http://localhost/index.html'}),null);
});
