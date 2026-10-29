// Server-owned local admission bounds. No world schema or browser input controls these.
export const LOCAL_SPAWN = Object.freeze({ spacing: .8, radius: 3.2, maxHeightChange: .4, supportTolerance: .08, maxCandidates: 49 });
const offsets = [];
for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x*x+z*z <= 16) offsets.push([x,z]);
offsets.sort((a,b) => a[0]*a[0]+a[1]*a[1]-b[0]*b[0]-b[1]*b[1] || a[0]-b[0] || a[1]-b[1]);
/** Project through immutable, admitted world support, then use normal arrival clearance. */
export function createLocalSpawnCandidates({ position, supportAt, clearance }) {
  const authored = [...position];
  return () => offsets.flatMap(([dx,dz]) => {
    const x=authored[0]+dx*LOCAL_SPAWN.spacing,z=authored[2]+dz*LOCAL_SPAWN.spacing;
    const y=supportAt(x,z,authored[1]+LOCAL_SPAWN.maxHeightChange);
    if (!Number.isFinite(y) || Math.abs(y-authored[1])>LOCAL_SPAWN.maxHeightChange+1e-7) return [];
    const p=dx===0&&dz===0&&Math.abs(y-authored[1])<=LOCAL_SPAWN.supportTolerance ? [...authored] : [x,y,z];
    return clearance(p)===true ? [p] : [];
  });
}
