import test from 'node:test';
import assert from 'node:assert/strict';
import {GPU} from '../src/engine/gpu/GPU.js';
import {Texture} from '../src/engine/gpu/Texture.js';
test('texture disposal defers exact old handle until recorded commands submit',()=>{
 const previous={encoder:GPU.encoder,queue:GPU.queue,hooks:GPU._submitHooks};
 const order=[],old={destroy(){order.push('destroy-old');}},replacement={destroy(){order.push('destroy-new');}};
 try{
  GPU._submitHooks=[];GPU.encoder={finish(){order.push('finish');return {};}};GPU.queue={submit(){order.push('submit');}};
  const texture=new Texture();texture.gpu=old;texture._views.set('cached',{});const version=texture.version;
  texture.destroy();assert.equal(texture.gpu,null);assert.equal(texture._views.size,0);assert.equal(texture.version,version+1);assert.deepEqual(order,[]);
  texture.destroy();assert.equal(GPU._submitHooks.length,1,'double disposal scheduled twice');
  texture.gpu=replacement;GPU.submit();assert.deepEqual(order,['finish','submit','destroy-old']);assert.equal(texture.gpu,replacement,'deferred disposal destroyed a replacement');
  texture.destroy();assert.deepEqual(order,['finish','submit','destroy-old','destroy-new']);
 }finally{GPU.encoder=previous.encoder;GPU.queue=previous.queue;GPU._submitHooks=previous.hooks;}
});
