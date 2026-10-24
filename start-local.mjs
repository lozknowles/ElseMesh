import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {dirname,extname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=await realpath(dirname(fileURLToPath(import.meta.url)));
const port=Number(process.env.ELSEMESH_PORT??18888);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('ELSEMESH_PORT must be a number from 1024 to 65535.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.bin':'application/octet-stream','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const url=new URL(req.url,'http://127.0.0.1:'+port),name=decodeURIComponent(url.pathname);
  if(name.includes('\\')||name.includes('\0')||name.split('/').some(part=>part==='..'||part.startsWith('.'))){res.writeHead(404);res.end();return;}
  const file=await realpath(join(root,name==='/'?'index.html':name));
  const rel=relative(root,file),info=await stat(file);
  if(!rel||rel.startsWith('..')||!info.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log('Loz\'s Warehouse Island: http://127.0.0.1:'+port+'/'));
