// Installed presentation policy only. Authored data, colliders, materials and
// canonical mesh geometry are never rewritten by native draw-list selection.
const bindingsByMesh = new WeakMap();

export function registerGeometryLOD(root, {bindings, center = [0, 0, 0], radius, thresholds = [48, 24]} = {}) {
 if (!root?.userData || root.userData.presentationLOD || !Array.isArray(bindings) || !bindings.length ||
     !Array.isArray(center) || center.length !== 3 || !center.every(Number.isFinite) || !Number.isFinite(radius) || radius <= 0 ||
     !Array.isArray(thresholds) || !thresholds.length || thresholds.some((n, i) => !Number.isFinite(n) || n <= 0 || i && n >= thresholds[i - 1])) throw Error('Invalid presentation LOD');
 for (const {mesh, geometries} of bindings) {
  if (!mesh?.geometry || bindingsByMesh.has(mesh) || !Array.isArray(geometries) || geometries.length !== thresholds.length + 1 || geometries[0] !== mesh.geometry || geometries.some(g => !g?.getAttribute?.('position'))) throw Error('Invalid presentation LOD geometry');
 }
 const controller = {root, bindings, center: [...center], radius, thresholds: [...thresholds], views: new WeakMap(), disposed: false,
  dispose() {if (this.disposed) return; this.disposed = true; for (const {mesh} of bindings) bindingsByMesh.delete(mesh); if (root.userData.presentationLOD === this) delete root.userData.presentationLOD; this.views = new WeakMap();}
 };
 // Object3D cloning serializes userData. Internal ownership references must
 // remain outside that authored/serializable metadata channel.
 Object.defineProperty(root.userData, 'presentationLOD', {value: controller, configurable: true});
 for (const binding of bindings) bindingsByMesh.set(binding.mesh, {controller, binding});
 return controller;
}

export function projectedLODPixels(controller, camera, height) {
 const m = controller.root.matrixWorld?.elements, v = camera?.matrixWorldInverse?.elements, p = camera?.projectionMatrix?.elements;
 if (!m || !v || !p || !Number.isFinite(height) || height <= 0) return Infinity;
 const [x, y, z] = controller.center;
 const wx = m[0]*x+m[4]*y+m[8]*z+m[12], wy = m[1]*x+m[5]*y+m[9]*z+m[13], wz = m[2]*x+m[6]*y+m[10]*z+m[14];
 // Induced-norm bound stays conservative under nonuniform scale and shear.
 const norm1 = Math.max(Math.abs(m[0])+Math.abs(m[1])+Math.abs(m[2]), Math.abs(m[4])+Math.abs(m[5])+Math.abs(m[6]), Math.abs(m[8])+Math.abs(m[9])+Math.abs(m[10]));
 const normInf = Math.max(Math.abs(m[0])+Math.abs(m[4])+Math.abs(m[8]), Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]), Math.abs(m[2])+Math.abs(m[6])+Math.abs(m[10]));
 const radius = controller.radius * Math.sqrt(norm1 * normInf);
 const depth = -(v[2]*wx+v[6]*wy+v[10]*wz+v[14]);
 const viewY = v[1]*wx+v[5]*wy+v[9]*wz+v[13];
 if (![radius, depth, viewY, p[5]].every(Number.isFinite) || depth <= radius + (camera.near ?? 0)) return Infinity;
 if (camera.isOrthographicCamera) return height * radius * Math.abs(p[5]);
 if (!camera.isPerspectiveCamera) return Infinity;
 // Off-axis spheres subtend more vertical pixels than an on-axis sphere at
 // the same depth. Include the center height (portal oblique clipping only
 // changes the depth row of its perspective projection).
 const denominator = depth*depth-radius*radius;
 return height * radius * Math.abs(p[5]) * Math.sqrt(denominator + viewY*viewY) / denominator;
}

export function presentationLODLevel(controller, camera, height) {
 if (controller.disposed || !camera) return 0;
 const pixels = projectedLODPixels(controller, camera, height);
 let level = controller.views.get(camera) ?? 0;
 while (level < controller.thresholds.length && pixels < controller.thresholds[level] * .88) level++;
 while (level > 0 && pixels > controller.thresholds[level - 1] * 1.12) level--;
 controller.views.set(camera, level);
 return level;
}

export function presentationGeometryForView(mesh, camera, height) {
 const record = bindingsByMesh.get(mesh);
 if (!record || record.controller.disposed) return mesh.geometry;
 return record.binding.geometries[presentationLODLevel(record.controller, camera, height)];
}

// Used for WebGL's synchronous command generation and optional resource warming.
// Nested views and exceptional draws restore the geometry they borrowed.
export function withGeometryLODLevel(controller, level, draw) {
 const saved = [];
 try {
  if (!controller.disposed) for (const {mesh, geometries} of controller.bindings) {saved.push([mesh, mesh.geometry]); mesh.geometry = geometries[level] ?? geometries[0];}
  return draw();
 } finally {for (const [mesh, geometry] of saved) mesh.geometry = geometry;}
}

export function withPresentationLOD(scene, camera, height, draw) {
 const controllers = [];
 scene.traverse(node => {const c = node.userData?.presentationLOD; if (c && !c.disposed) controllers.push(c);});
 if (!controllers.length) return draw();
 camera.updateWorldMatrix?.(true, false); camera.updateMatrixWorld?.();
 for (const c of controllers) c.root.updateWorldMatrix(true, false);
 const saved = [];
 try {
  for (const c of controllers) {const level = presentationLODLevel(c, camera, height); for (const {mesh, geometries} of c.bindings) {saved.push([mesh, mesh.geometry]); mesh.geometry = geometries[level];}}
  return draw();
 } finally {for (let i = saved.length - 1; i >= 0; i--) saved[i][0].geometry = saved[i][1];}
}

export function installWebGLPresentationLOD(renderer) {
 const render = renderer.render;
 renderer.render = function(scene, camera) {
  // Three renders shadows inside render(); keep their canonical geometry until
  // a separate shadow LOD policy is qualified. Our normal WebGL path has no shadows.
  if (this.shadowMap?.enabled || this.presentationLODPreparing) return render.call(this, scene, camera);
  const target = this.getRenderTarget?.();
  const viewport = this.getViewport?.({set(x,y,z,w){this.w=w; return this;}, copy(v){this.w=v.w; return this;}});
  const viewportHeight = viewport?.w * (this.getPixelRatio?.() ?? 1);
  const height = target?.height ?? (Number.isFinite(viewportHeight) ? viewportHeight : this.domElement?.height);
  return withPresentationLOD(scene, camera, height, () => render.call(this, scene, camera));
 };
}
