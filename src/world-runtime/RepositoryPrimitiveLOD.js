import {registerGeometryLOD} from '../engine/render/PresentationLOD.js';

// Same installed parametric shape, dimensions, caps and material. Only small
// projected curved primitives use fewer segments; authored GLBs are untouched.
export function installRepositoryPrimitiveLOD(mesh, kind, {api, convertGeometry, retire = dispose => dispose()} = {}) {
 let source;
 if (kind === 'sphere') source = new api.SphereGeometry(.8, 12, 8);
 else if (kind === 'cylinder') source = new api.CylinderGeometry(.65, .65, 1.6, 12);
 else if (kind === 'cone') source = new api.ConeGeometry(.8, 1.6, 12);
 else return null;
 const reduced = convertGeometry ? convertGeometry(source) : source;
 if (convertGeometry) source.dispose();
 const full = mesh.geometry;
 full.computeBoundingSphere();
 reduced.boundingSphere = full.boundingSphere;
 const controller = registerGeometryLOD(mesh, {bindings: [{mesh, geometries: [full, reduced]}], center: full.boundingSphere.center.toArray(), radius: full.boundingSphere.radius, thresholds: [30]});
 let disposed = false;
 mesh.userData.disposePresentationLOD = () => {if (disposed) return; disposed = true; controller.dispose(); retire(() => reduced.dispose());};
 return controller;
}
