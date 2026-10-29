import {
	ColliderGrid
}
from './ColliderGrid.js';
// Ground-only acceleration. The complete 2 m grid is retained for every rebuild:
// any unsupported geometry, bounded-work failure or query error delegates to it.
// Capsule/ray grids and the original collider record order are never changed.
export const GROUND_HIERARCHY_LIMITS = Object.freeze({
	records:65536, leafSize:8, depth:20
}
);
export class GroundColliderHierarchy {
	constructor(records,fallback){
		this.records=records;
		this.length=records.length;
		// This is the admission/overflow and fallback policy, not hierarchy cells.
		// Ordinary eligible queries traverse the hierarchy while usingFallback=false.
		Object.defineProperty(this,'cellSize',{
			value:2,enumerable:true
		}
		);
		this.fallback=fallback?.records===records&&fallback.length===records.length&&fallback.cellSize===2?fallback:new ColliderGrid(records,'box',2);
		this.usingFallback=false;
		this.fallbackReason=null;
		this.partitionFallbacks=0;
		try{
			this._build(records);
		}
		catch(error){
			this._fallback(error?.message??'construction-error');
		}
	}
	_fallback(reason){
		this.usingFallback=true;
		this.fallbackReason=reason;
		this.bounds=null;
		this.ids=null;
		this.nodeBounds=null;
		this.left=null;
		this.right=null;
		this.starts=null;
		this.ends=null;
		this.depths=null;
		this.stack=null;
		this.nodeCapacity=0;
		this.nodeCount=0;
		this.leafCount=0;
		this.maxDepth=0;
		this.root=-1;
		this.overflow=this.fallback.overflow;
		this.candidates=this.fallback.candidates;
	}
	_build(records){
		if(records.length>GROUND_HIERARCHY_LIMITS.records)throw Error('record-limit');
		this.length=records.length;
		this.bounds=new Float64Array(records.length*4);
		this.overflow=[];
		this.ids=new Uint32Array(records.length);
		let count=0;
		this.candidates=[];
		this.lastWork={
		}
		;
		this.partitionFallbacks=0;
		for(let i=0;i<records.length;i++){
			const r=records[i],x=r.center.x,z=r.center.z,det=r.cos*r.cos+r.sin*r.sin;
			let rx=Math.max(r.radius,(Math.abs(r.cos)*r.half.x+Math.abs(r.sin)*r.half.z)/det),rz=Math.max(r.radius,(Math.abs(r.sin)*r.half.x+Math.abs(r.cos)*r.half.z)/det);
			if(r.half.x<0||r.half.z<0||Math.abs(det-1)>1e-6||det<1e-12)rx=NaN;
			const p=i*4,a=x-rx-1e-7,b=z-rz-1e-7,c=x+rx+1e-7,d=z+rz+1e-7;
			this.bounds[p]=a;
			this.bounds[p+1]=b;
			this.bounds[p+2]=c;
			this.bounds[p+3]=d;
			const x0=Math.floor(a/2),z0=Math.floor(b/2),x1=Math.floor(c/2),z1=Math.floor(d/2);
			if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(c)||!Number.isFinite(d))throw Error('invalid-bounds');
			if(!Number.isSafeInteger(x0)||!Number.isSafeInteger(z0)||!Number.isSafeInteger(x1)||!Number.isSafeInteger(z1))throw Error('unsafe-cell-bounds');
			if(rx<0||rz<0||(x1-x0+1)*(z1-z0+1)>256)this.overflow.push(i);
			else this.ids[count++]=i;
		}
		this.ids=this.ids.subarray(0,count);
		let leaves=1;
		while(leaves<Math.ceil(count/8))leaves*=2;
		this.nodeCapacity=count?2*leaves-1:0;
		this.nodeCount=0;
		this.leafCount=0;
		this.maxDepth=0;
		this.nodeBounds=new Float64Array(this.nodeCapacity*4);
		this.left=new Int32Array(this.nodeCapacity);
		this.right=new Int32Array(this.nodeCapacity);
		this.starts=new Uint32Array(this.nodeCapacity);
		this.ends=new Uint32Array(this.nodeCapacity);
		this.depths=new Uint8Array(this.nodeCapacity);
		this.left.fill(-1);
		this.right.fill(-1);
		this.stack=new Uint32Array(32);
		this.root=count?0:-1;
		if(!count)return;
		this.nodeCount=1;
		this.ends[0]=count;
		let stackSize=1;
		this.stack[0]=0;
		while(stackSize){
			const n=this.stack[--stackSize],start=this.starts[n],end=this.ends[n],depth=this.depths[n];
			this.maxDepth=Math.max(this.maxDepth,depth);
			if(depth>GROUND_HIERARCHY_LIMITS.depth)throw Error('depth-limit');
			let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity,minCX=Infinity,minCZ=Infinity,maxCX=-Infinity,maxCZ=-Infinity;
			for(let k=start;k<end;k++){
				const p=this.ids[k]*4,a=this.bounds[p],b=this.bounds[p+1],c=this.bounds[p+2],d=this.bounds[p+3],cx=(a+c)/2,cz=(b+d)/2;
				minX=Math.min(minX,a);
				minZ=Math.min(minZ,b);
				maxX=Math.max(maxX,c);
				maxZ=Math.max(maxZ,d);
				minCX=Math.min(minCX,cx);
				minCZ=Math.min(minCZ,cz);
				maxCX=Math.max(maxCX,cx);
				maxCZ=Math.max(maxCZ,cz);
			}
			const p=n*4;
			this.nodeBounds[p]=minX;
			this.nodeBounds[p+1]=minZ;
			this.nodeBounds[p+2]=maxX;
			this.nodeBounds[p+3]=maxZ;
			if(end-start<=8){
				this.leafCount++;
				continue;
			}
			const axis=maxCX-minCX>=maxCZ-minCZ?0:1,mid=(start+end)>>>1;
			if(!this._partition(start,end,mid,axis))throw Error('partition-work-limit');
			const l=this.nodeCount++,r=this.nodeCount++;
			if(r>=this.nodeCapacity||stackSize+2>this.stack.length)throw Error('node-stack-limit');
			this.left[n]=l;
			this.right[n]=r;
			this.starts[l]=start;
			this.ends[l]=mid;
			this.starts[r]=mid;
			this.ends[r]=end;
			this.depths[l]=this.depths[r]=depth+1;
			this.stack[stackSize++]=r;
			this.stack[stackSize++]=l;
		}
	}
	_compare(a,b,axis){
		const p=a*4+axis,q=b*4+axis,value=(this.bounds[p]+this.bounds[p+2])-(this.bounds[q]+this.bounds[q+2]);
		if(!Number.isFinite(value))throw Error('nonfinite-partition');
		return value||a-b;
	}
	_partition(start,end,target,axis){
		let lo=start,hi=end-1,iterations=0,work=0;
		const budget=32*(end-start);
		while(lo<hi){
			if(++iterations>64||work>budget){
				this.partitionFallbacks++;
				return false;
			}
			let a=this.ids[lo],b=this.ids[(lo+hi)>>>1],c=this.ids[hi];
			if(this._compare(a,b,axis)>0){
				const t=a;
				a=b;
				b=t;
			}
			if(this._compare(b,c,axis)>0){
				const t=b;
				b=c;
				c=t;
			}
			if(this._compare(a,b,axis)>0){
				const t=a;
				a=b;
				b=t;
			}
			const pivot=b;
			let i=lo,j=hi;
			while(i<=j){
				while(i<=hi&&this._compare(this.ids[i],pivot,axis)<0){
					i++;
					work++;
				}
				while(j>=lo&&this._compare(this.ids[j],pivot,axis)>0){
					j--;
					work++;
				}
				if(i<=j){
					const t=this.ids[i];
					this.ids[i++]=this.ids[j];
					this.ids[j--]=t;
					work+=2;
				}
			}
			if(target<=j)hi=j;
			else if(target>=i)lo=i;
			else return true;
		}
		return true;
	}
	query(minX,minZ,maxX,maxZ,after=-1){
		if(this.usingFallback)return this._queryFallback(minX,minZ,maxX,maxZ,after);
		try{
			return this._query(minX,minZ,maxX,maxZ,after);
		}
		catch(error){
			this._fallback(error?.message??'query-error');
			return this._queryFallback(minX,minZ,maxX,maxZ,after);
		}
	}
	_queryFallback(minX,minZ,maxX,maxZ,after){
		// Grid work is not instrumented here. Unknown counts must not look like
		// a successful zero-work hierarchy traversal, including after query errors.
		this.lastWork={nodes:null,entries:null,overflow:null,fallback:true};
		return this.fallback.query(minX,minZ,maxX,maxZ,after);
	}
	_query(minX,minZ,maxX,maxZ,after){
		const out=this.candidates;
		out.length=0;
		this.lastWork={
			nodes:0,entries:0,overflow:0,fallback:false
		}
		;
		const x0=Math.floor(minX/2),z0=Math.floor(minZ/2),x1=Math.floor(maxX/2),z1=Math.floor(maxZ/2);
		if(!Number.isSafeInteger(x0)||!Number.isSafeInteger(z0)||!Number.isSafeInteger(x1)||!Number.isSafeInteger(z1)||x1<x0||z1<z0||(x1-x0+1)*(z1-z0+1)>4096){
			return this._queryFallback(minX,minZ,maxX,maxZ,after);
		}
		let stackSize=0;
		if(this.root>=0)this.stack[stackSize++]=this.root;
		while(stackSize){
			const n=this.stack[--stackSize],p=n*4;
			this.lastWork.nodes++;
			if(!(this.nodeBounds[p]<=maxX&&this.nodeBounds[p+2]>=minX&&this.nodeBounds[p+1]<=maxZ&&this.nodeBounds[p+3]>=minZ))continue;
			if(this.left[n]>=0){
				this.stack[stackSize++]=this.right[n];
				this.stack[stackSize++]=this.left[n];
				continue;
			}
			for(let k=this.starts[n];k<this.ends[n];k++){
				this.lastWork.entries++;
				const i=this.ids[k];
				if(i<=after)continue;
				const p=i*4;
				if(this.bounds[p]<=maxX&&this.bounds[p+2]>=minX&&this.bounds[p+1]<=maxZ&&this.bounds[p+3]>=minZ)out.push(i);
			}
		}
		for(const i of this.overflow){
			this.lastWork.overflow++;
			if(i>after)out.push(i);
		}
		out.sort((a,b)=>a-b);
		return out;
	}
	storage(){
		if(this.usingFallback)return {
			usingFallback:true,fallbackReason:this.fallbackReason,nodes:0,arrayBufferBytes:0,partitionFallbacks:this.partitionFallbacks
		}
		;
		return {
			usingFallback:false,fallbackReason:null,nodes:this.nodeCount,nodeCapacity:this.nodeCapacity,leaves:this.leafCount,maxDepth:this.maxDepth,partitionFallbacks:this.partitionFallbacks,arrayBufferBytes:this.bounds.byteLength+this.ids.buffer.byteLength+this.nodeBounds.byteLength+this.left.byteLength+this.right.byteLength+this.starts.byteLength+this.ends.byteLength+this.depths.byteLength+this.stack.byteLength,overflowIndexSlots:this.overflow.length
		}
		;
	}
}
