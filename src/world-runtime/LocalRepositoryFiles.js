// File metadata is indexed without reading bytes. Only paths requested by the
// shared repository manifest loader can be opened; unrelated files stay unread.
export const isRepositoryContentPath=path=>path==='world.json'||/^(snapshots\/[a-f0-9]{64}\/(metadata|terrain|objects|features|environment|spawn|geography|assets|connections|landscape)\.json|assets\/[a-f0-9]{64}\.glb|landscape-images\/[a-f0-9]{64}\.(png|jpg)|imagery\/[a-f0-9]{64}\.(png|jpg))$/.test(path);
export function localRepositorySource(files){
 const list=Array.from(files??[]);if(!list.length)throw Error('Choose a world repository folder.');
 const index=new Map();let root;
 for(const file of list){
  const path=file.webkitRelativePath;
  if(typeof path!=='string'||!path||path.length>2000||path.includes('\\')||path.startsWith('/')||path.includes('\0'))throw Error('Repository files need safe paths relative to one selected folder.');
  const parts=path.split('/');if(parts.length<2||parts.some(part=>!part||part==='.'||part==='..'))throw Error('Repository file path is not safe.');
  if(root===undefined)root=parts[0];else if(parts[0]!==root)throw Error('Select one repository folder at a time.');
  const relative=parts.slice(1).join('/');if(index.has(relative))throw Error('Duplicate repository file path: '+relative);
  index.set(relative,file);
 }
 if(!index.has('world.json'))throw Error('The selected folder must contain world.json at its root.');
 return {kind:'local',label:root,read:async(path,maxBytes)=>{
  if(!isRepositoryContentPath(path))throw Error('Repository content path is not allowed.');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Repository byte limit is invalid.');
  const file=index.get(path);if(!file)throw Error('Repository file missing: '+path);
  if(!Number.isSafeInteger(file.size)||file.size<0||file.size>maxBytes)throw Error('Repository file exceeds its byte limit: '+path);
  const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.byteLength>maxBytes||bytes.byteLength!==file.size)throw Error('Repository file size changed: '+path);return bytes;
 }};
}
