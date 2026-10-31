import room from './table-tennis-profile.json' with {type:'json'};

const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const SUNSET_SPLAT_PROFILE=freeze({name:'Sunset',asset:{sha256:'66334b9bcea5abb6b2a310c44c584fd7fdc8fb999db9c718c785473c41019298',bytes:12690032,count:719538},physics:{sha256:'eedaeb18bfa8eacbee42c10d105b67d519f9351fb75879f4306645cf1d3a3757',bytes:7943873},transform:{position:[1.585657106720535,1.235958392161293,-1.757775309929035],rotation:[-Math.PI/2,0,0],scale:11.2307273607188},reviewSha256:'f2c78d4f576dd04e112b824b948e00ec4843816370bad0cd836e740a0ef882ac'});
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const vector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
// This import is an application-owned immutable pin, never descriptor input.
if(!exact(room,['name','asset','physics','transform','reviewSha256'])||room.name!=='Table Tennis Room'||!exact(room.asset,['sha256','bytes','count'])||!exact(room.physics,['sha256','bytes'])||!exact(room.transform,['position','rotation','scale'])||!hash(room.asset.sha256)||!hash(room.physics.sha256)||!hash(room.reviewSha256)||room.asset.count!==719538||!Number.isSafeInteger(room.asset.bytes)||room.asset.bytes<1||room.asset.bytes>16*1024*1024||!Number.isSafeInteger(room.physics.bytes)||room.physics.bytes<1||room.physics.bytes>8*1024*1024||!vector(room.transform.position)||!vector(room.transform.rotation)||!Number.isFinite(room.transform.scale)||room.transform.scale<=0||room.transform.scale>1000||room.asset.sha256===SUNSET_SPLAT_PROFILE.asset.sha256)throw Error('Invalid pinned Table Tennis Room profile.');
export const TABLE_TENNIS_SPLAT_PROFILE=freeze(room);
export const QUALIFIED_SPLAT_PROFILES=Object.freeze([SUNSET_SPLAT_PROFILE,TABLE_TENNIS_SPLAT_PROFILE]);
const sameAsset=(a,b)=>a?.sha256===b.sha256&&a.bytes===b.bytes&&a.count===b.count;
const samePhysics=(a,b)=>a?.sha256===b.sha256&&a.bytes===b.bytes;
const sameVector=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((value,index)=>value===b[index]);
/** Asset selection grants no capability until the complete reviewed tuple matches. */
export function assertQualifiedSplatProfile(project){
 const scene=project?.splatScene,profile=QUALIFIED_SPLAT_PROFILES.find(value=>sameAsset(scene?.asset,value.asset));
 if(project?.nativeIsland||!profile)throw Error('Experimental splat renderer accepts only the exact qualified Sunset or Table Tennis Room pinned scene.');
 if(!samePhysics(scene.physics,profile.physics))throw Error('Experimental splat physics must match the exact pinned reviewed corridor.');
 if(scene.scaleStatus!=='assumed-gameplay'||scene.transform?.scale!==profile.transform.scale||!sameVector(scene.transform?.position,profile.transform.position)||!sameVector(scene.transform?.rotation,profile.transform.rotation)||scene.provenance?.reviewSha256!==profile.reviewSha256)throw Error('Experimental splat renderer requires the exact pinned Sunset game transform and reviewed source provenance, or the exact pinned Table Tennis Room profile.');
 return profile;
}
/** Legacy readiness fixtures may enroll only the unchanged Sunset asset. */
export function assertQualifiedReadinessProfile({asset,project}={}){
 const profile=project?assertQualifiedSplatProfile(project):SUNSET_SPLAT_PROFILE;
 if(!sameAsset(asset,profile.asset))throw Error('Pinned Spark readiness registration requires its verified prepared adapter.');
 return profile;
}
