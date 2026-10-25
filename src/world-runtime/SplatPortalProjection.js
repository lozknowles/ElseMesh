import {T} from './vendor/world-engine-contract.js';

// Pure projection helper for Spark's Gaussian-center culling. The caller restores
// its base camera projection each draw; no local portal/travel controller is imported.
export function applyPortalObliqueProjection(camera,destination){
 // Same outward normal and .015 m margin as portalDestinationPlane, without a caller-module cycle.
 const normal=new T.Vector3(Math.sin(destination.yaw||0),0,Math.cos(destination.yaw||0));
 const plane=new T.Plane(normal,-normal.dot(new T.Vector3(...destination.position))-.015).applyMatrix4(camera.matrixWorldInverse);
 const normalLength=plane.normal.length();
 if(!Number.isFinite(normalLength)||normalLength<1e-10)throw Error('Degenerate portal clipping plane.');
 plane.normalize();
 if(!Number.isFinite(plane.constant)||Math.abs(plane.constant)<1e-7)throw Error('Camera coincides with portal clipping plane.');
 const clip=new T.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
 const p=camera.projectionMatrix.elements;
 const q=new T.Vector4((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);
 const dot=clip.dot(q);
 if(!Number.isFinite(dot)||Math.abs(dot)<1e-10)throw Error('Degenerate portal oblique projection.');
 clip.multiplyScalar(2/dot);
 const row=[clip.x,clip.y,clip.z+1,clip.w];
 if(!row.every(Number.isFinite))throw Error('Invalid portal oblique projection.');
 [p[2],p[6],p[10],p[14]]=row;
 camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 return camera;
}

