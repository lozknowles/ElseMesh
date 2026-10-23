import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshRenderer} from '../src/engine/render/MeshRenderer.js';
import {Material} from '../src/engine/render/Material.js';
import {BoxGeometry,Mesh} from '../src/engine/index.js';
function setup(){const r=new MeshRenderer();r._layout=()=>({key:'fixture',layout:[]});return r;}
const pipeline=()=>({handle:{pipeline:null,failed:false}});
test('disposing one candidate removes only its exact pipelines and all historical layouts',()=>{
 const r=setup(),geometry=new BoxGeometry(),a=new Material(),b=new Material(),object=new Mesh(geometry,a);
 const old=r._cachedLayout(object,geometry,a),pa=pipeline();r._cachePipeline(a,'a-v0',pa);old.pipelines.set('main',{p:pa});
 a.needsUpdate=true;const current=r._cachedLayout(object,geometry,a),pa1=pipeline();r._cachePipeline(a,'a-v1',pa1);current.pipelines.set('main',{p:pa1});
 const other=r._cachedLayout(object,geometry,b),pb=pipeline();r._cachePipeline(b,'b',pb);other.pipelines.set('main',{p:pb});assert.equal(a._listeners.length,1);
 a.dispose();assert.deepEqual([...r.pipelines.keys()],['b']);assert.equal(r.stats.pipelines,1);assert.equal(old.pipelines.size,0);assert.equal(current.pipelines.size,0);assert.equal(other.pipelines.size,1);assert.equal(r._layouts.get(geometry).size,1);
 a.dispose();assert.equal(r.pipelines.get('b'),pb);assert.throws(()=>r._cachedLayout(object,geometry,a),/Disposed material/);assert.throws(()=>r._cachePipeline(a,'revived',pipeline()),/Disposed material/);
});
test('renderer ownership never clears another renderer or another material layout',()=>{
 const a=setup(),b=setup(),geometry=new BoxGeometry(),material=new Material(),other=new Material(),object=new Mesh(geometry,material);
 const la=a._cachedLayout(object,geometry,material),lb=b._cachedLayout(object,geometry,material);assert.notEqual(la,lb);assert.equal(material._listeners.length,2);
 a._cachePipeline(material,'owned',pipeline());b._cachePipeline(material,'owned',pipeline());b._cachePipeline(other,'other',pipeline());
 material.dispose();assert.equal(a.pipelines.size,0);assert.equal(b.pipelines.size,1);assert.ok(b.pipelines.has('other'));assert.equal(a._layouts.get(geometry).size,0);assert.equal(b._layouts.get(geometry).size,0);
});
test('pending async handle completion cannot reinsert or revive a disposed material cache',async()=>{
 const r=setup(),material=new Material(),p=pipeline();r._cachePipeline(material,'pending',p);let finish;
 const pending=new Promise(resolve=>finish=()=>{p.handle.pipeline={ready:true};resolve();});material.dispose();finish();await pending;assert.equal(r.pipelines.size,0);assert.equal(r.stats.pipelines,0);assert.throws(()=>r._cachePipeline(material,'pending',p),/Disposed material/);
});
test('repeated candidate visits return cache and layout entries to the active baseline',()=>{
 const r=setup(),geometry=new BoxGeometry(),active=new Material(),object=new Mesh(geometry,active);r._cachedLayout(object,geometry,active);r._cachePipeline(active,'active',pipeline());
 for(let visit=0;visit<100;visit++){const candidate=new Material();for(let version=0;version<3;version++){candidate.needsUpdate=true;const layout=r._cachedLayout(object,geometry,candidate),p=pipeline();layout.pipelines.set('main',{p});r._cachePipeline(candidate,'visit-'+visit+'-'+version,p);}candidate.dispose();assert.equal(r.pipelines.size,1);assert.equal(r.stats.pipelines,1);assert.equal(r._layouts.get(geometry).size,1);}
 assert.ok(r.pipelines.has('active'));
});

test('disposal leaves a replaced cache entry owned by another material intact',()=>{
 const r=setup(),a=new Material(),b=new Material(),one=pipeline(),two=pipeline();r._cachePipeline(a,'key',one);r._cachePipeline(b,'key',two);a.dispose();assert.equal(r.pipelines.get('key'),two);assert.equal(r.stats.pipelines,1);b.dispose();assert.equal(r.pipelines.size,0);
});
