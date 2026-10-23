import{q as Zs,s as jr,v as Xr,w as ir,z as rr,y as Yr,F as Kr,H as Zr,bu as Qr,bq as Jr,bx as ea,aW as ta,aX as sa,aY as ia,aU as ra,aS as aa,aA as na,aD as oa,aP as la,bi as ar,ay as Ls,aM as ha,V as vt,aZ as qt,J as ca,a6 as Qs,aK as ua,aL as da,a5 as hs,by as Js,aa as fa,a4 as pa}from"./weather-CDoYKw06.js";const Ct=Math.PI/180,es=180/Math.PI,$=[];for(let a=0;a<256;a++)$[a]=(a<16?"0":"")+a.toString(16);function ts(){const a=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,s=Math.random()*4294967295|0;return($[a&255]+$[a>>8&255]+$[a>>16&255]+$[a>>24&255]+"-"+$[e&255]+$[e>>8&255]+"-"+$[e>>16&15|64]+$[e>>24&255]+"-"+$[t&63|128]+$[t>>8&255]+"-"+$[t>>16&255]+$[t>>24&255]+$[s&255]+$[s>>8&255]+$[s>>16&255]+$[s>>24&255]).toLowerCase()}const ma=(a,e,t)=>Math.max(e,Math.min(t,a)),nr=(a,e)=>(a%e+e)%e,va=(a,e,t,s,i)=>s+(a-e)*(i-s)/(t-e),xa=(a,e,t)=>a!==e?(t-a)/(e-a):0,or=(a,e,t)=>(1-t)*a+t*e,ga=(a,e,t,s)=>or(a,e,1-Math.exp(-t*s)),ya=(a,e=1)=>e-Math.abs(nr(a,e*2)-e);function wa(a,e,t){return a<=e?0:a>=t?1:(a=(a-e)/(t-e),a*a*(3-2*a))}function ba(a,e,t){return a<=e?0:a>=t?1:(a=(a-e)/(t-e),a*a*a*(a*(a*6-15)+10))}const Sa=(a,e)=>a+Math.floor(Math.random()*(e-a+1)),_a=(a,e)=>a+Math.random()*(e-a),Ma=a=>a*(.5-Math.random());let ei=1234567;function za(a){a!==void 0&&(ei=a);let e=ei+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}const Pa=a=>a*Ct,Ta=a=>a*es,Aa=a=>(a&a-1)===0&&a!==0,ka=a=>Math.pow(2,Math.ceil(Math.log(a)/Math.LN2)),Ca=a=>Math.pow(2,Math.floor(Math.log(a)/Math.LN2));function lr(a,e){switch(e.constructor){case Float32Array:case Float64Array:return a;case Uint32Array:return a/4294967295;case Uint16Array:return a/65535;case Uint8Array:case Uint8ClampedArray:return a/255;case Int32Array:return Math.max(a/2147483647,-1);case Int16Array:return Math.max(a/32767,-1);case Int8Array:return Math.max(a/127,-1);default:return a}}function hr(a,e){switch(e.constructor){case Float32Array:case Float64Array:return a;case Uint32Array:return Math.round(a*4294967295);case Uint16Array:return Math.round(a*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(a*255);case Int32Array:return Math.round(a*2147483647);case Int16Array:return Math.round(a*32767);case Int8Array:return Math.round(a*127);default:return a}}const He={normalize:hr,denormalize:lr,DEG2RAD:Ct,RAD2DEG:es,generateUUID:ts,clamp:ma,euclideanModulo:nr,mapLinear:va,inverseLerp:xa,lerp:or,damp:ga,pingpong:ya,smoothstep:wa,smootherstep:ba,randInt:Sa,randFloat:_a,randFloatSpread:Ma,seededRandom:za,degToRad:Pa,radToDeg:Ta,isPowerOfTwo:Aa,ceilPowerOfTwo:ka,floorPowerOfTwo:Ca};class I{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){return e===0?this.x=t:this.y=t,this}getComponent(e){return e===0?this.x:this.y}clone(){return new I(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,s=this.y,i=e.elements;return this.x=i[0]*t+i[3]*s+i[6],this.y=i[1]*t+i[4]*s+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const s=this.length();return this.divideScalar(s||1).multiplyScalar(Math.max(e,Math.min(t,s)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());return t===0?Math.PI/2:Math.acos(Math.max(-1,Math.min(1,this.dot(e)/t)))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,s=this.y-e.y;return t*t+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,s){return this.x=e.x+(t.x-e.x)*s,this.y=e.y+(t.y-e.y)*s,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const s=Math.cos(t),i=Math.sin(t),r=this.x-e.x,n=this.y-e.y;return this.x=r*s-n*i+e.x,this.y=r*i+n*s+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}I.prototype.isVector2=!0;class oe{constructor(e=0,t=0,s=0,i=1){this._x=e,this._y=t,this._z=s,this._w=i,this._onChangeCallback=Da}static slerpFlat(e,t,s,i,r,n,o){const l=new oe().fromArray(s,i),h=new oe().fromArray(r,n);l.slerp(h,o).toArray(e,t)}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,s,i){return this._x=e,this._y=t,this._z=s,this._w=i,this._onChangeCallback(),this}clone(){return new oe(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}identity(){return this.set(0,0,0,1)}setFromEuler(e,t=!0){const s=e._x,i=e._y,r=e._z,n=e._order,o=Math.cos(s/2),l=Math.cos(i/2),h=Math.cos(r/2),c=Math.sin(s/2),u=Math.sin(i/2),d=Math.sin(r/2);switch(n){case"XYZ":this._x=c*l*h+o*u*d,this._y=o*u*h-c*l*d,this._z=o*l*d+c*u*h,this._w=o*l*h-c*u*d;break;case"YXZ":this._x=c*l*h+o*u*d,this._y=o*u*h-c*l*d,this._z=o*l*d-c*u*h,this._w=o*l*h+c*u*d;break;case"ZXY":this._x=c*l*h-o*u*d,this._y=o*u*h+c*l*d,this._z=o*l*d+c*u*h,this._w=o*l*h-c*u*d;break;case"ZYX":this._x=c*l*h-o*u*d,this._y=o*u*h+c*l*d,this._z=o*l*d-c*u*h,this._w=o*l*h+c*u*d;break;case"YZX":this._x=c*l*h+o*u*d,this._y=o*u*h+c*l*d,this._z=o*l*d-c*u*h,this._w=o*l*h-c*u*d;break;case"XZY":this._x=c*l*h-o*u*d,this._y=o*u*h-c*l*d,this._z=o*l*d+c*u*h,this._w=o*l*h+c*u*d;break;default:throw new Error("Quaternion.setFromEuler: unknown order "+n)}return t&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const s=t/2,i=Math.sin(s);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(s),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,s=t[0],i=t[4],r=t[8],n=t[1],o=t[5],l=t[9],h=t[2],c=t[6],u=t[10],d=s+o+u;if(d>0){const m=.5/Math.sqrt(d+1);this._w=.25/m,this._x=(c-l)*m,this._y=(r-h)*m,this._z=(n-i)*m}else if(s>o&&s>u){const m=2*Math.sqrt(1+s-o-u);this._w=(c-l)/m,this._x=.25*m,this._y=(i+n)/m,this._z=(r+h)/m}else if(o>u){const m=2*Math.sqrt(1+o-s-u);this._w=(r-h)/m,this._x=(i+n)/m,this._y=.25*m,this._z=(l+c)/m}else{const m=2*Math.sqrt(1+u-s-o);this._w=(n-i)/m,this._x=(r+h)/m,this._y=(l+c)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let s=e.x*t.x+e.y*t.y+e.z*t.z+1;return s<Number.EPSILON?(s=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=s):(this._x=0,this._y=-e.z,this._z=e.y,this._w=s)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=s),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Math.max(-1,Math.min(1,this.dot(e)))))}rotateTowards(e,t){const s=this.angleTo(e);return s===0?this:this.slerp(e,Math.min(1,t/s))}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this.lengthSq())}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const s=e._x,i=e._y,r=e._z,n=e._w,o=t._x,l=t._y,h=t._z,c=t._w;return this._x=s*c+n*o+i*h-r*l,this._y=i*c+n*l+r*o-s*h,this._z=r*c+n*h+s*l-i*o,this._w=n*c-s*o-i*l-r*h,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const s=this._x,i=this._y,r=this._z,n=this._w;let o=n*e._w+s*e._x+i*e._y+r*e._z,l=e._x,h=e._y,c=e._z,u=e._w;if(o<0&&(l=-l,h=-h,c=-c,u=-u,o=-o),o>=1)return this;const d=1-o*o;if(d<=Number.EPSILON){const x=1-t;return this._w=x*n+t*u,this._x=x*s+t*l,this._y=x*i+t*h,this._z=x*r+t*c,this.normalize()}const m=Math.sqrt(d),v=Math.atan2(m,o),p=Math.sin((1-t)*v)/m,f=Math.sin(t*v)/m;return this._w=n*p+u*f,this._x=s*p+l*f,this._y=i*p+h*f,this._z=r*p+c*f,this._onChangeCallback(),this}slerpQuaternions(e,t,s){return this.copy(e).slerp(t,s)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),s=Math.random(),i=Math.sqrt(1-s),r=Math.sqrt(s);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this.set(e.getX(t),e.getY(t),e.getZ(t),e.getW(t))}_onChange(e){return this._onChangeCallback=e,this}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}function Da(){}oe.prototype.isQuaternion=!0;const ti=new oe;class S{constructor(e=0,t=0,s=0){this.x=e,this.y=t,this.z=s}set(e,t,s){return s===void 0&&(s=this.z),this.x=e,this.y=t,this.z=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){return e===0?this.x=t:e===1?this.y=t:this.z=t,this}getComponent(e){return e===0?this.x:e===1?this.y:this.z}clone(){return new S(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}applyEuler(e){return this.applyQuaternion(ti.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ti.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,s=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*s+r[6]*i,this.y=r[1]*t+r[4]*s+r[7]*i,this.z=r[2]*t+r[5]*s+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,s=this.y,i=this.z,r=e.elements,n=1/(r[3]*t+r[7]*s+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*s+r[8]*i+r[12])*n,this.y=(r[1]*t+r[5]*s+r[9]*i+r[13])*n,this.z=(r[2]*t+r[6]*s+r[10]*i+r[14])*n,this}applyQuaternion(e){const t=this.x,s=this.y,i=this.z,r=e.x,n=e.y,o=e.z,l=e.w,h=2*(n*i-o*s),c=2*(o*t-r*i),u=2*(r*s-n*t);return this.x=t+l*h+n*u-o*c,this.y=s+l*c+o*h-r*u,this.z=i+l*u+r*c-n*h,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,s=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*s+r[8]*i,this.y=r[1]*t+r[5]*s+r[9]*i,this.z=r[2]*t+r[6]*s+r[10]*i,this.normalize()}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const s=this.length();return this.divideScalar(s||1).multiplyScalar(Math.max(e,Math.min(t,s)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,s){return this.x=e.x+(t.x-e.x)*s,this.y=e.y+(t.y-e.y)*s,this.z=e.z+(t.z-e.z)*s,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const s=e.x,i=e.y,r=e.z,n=t.x,o=t.y,l=t.z;return this.x=i*l-r*o,this.y=r*n-s*l,this.z=s*o-i*n,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const s=e.dot(this)/t;return this.copy(e).multiplyScalar(s)}projectOnPlane(e){const t=this.dot(e)/(e.lengthSq()||1);return this.addScaledVector(e,-t)}reflect(e){return this.addScaledVector(e,-2*this.dot(e))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());return t===0?Math.PI/2:Math.acos(Math.max(-1,Math.min(1,this.dot(e)/t)))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,s=this.y-e.y,i=this.z-e.z;return t*t+s*s+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,s){const i=Math.sin(t)*e;return this.x=i*Math.sin(s),this.y=Math.cos(t)*e,this.z=i*Math.cos(s),this}setFromCylindricalCoords(e,t,s){return this.x=e*Math.sin(t),this.y=s,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),s=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.set(t,s,i)}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,s=Math.sqrt(1-t*t);return this.x=s*Math.cos(e),this.y=t,this.z=s*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}S.prototype.isVector3=!0;class Q{constructor(e=0,t=0,s=0,i=1){this.x=e,this.y=t,this.z=s,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,s,i){return this.x=e,this.y=t,this.z=s,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){return this["xyzw"[e]]=t,this}getComponent(e){return this["xyzw"[e]]}clone(){return new Q(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix4(e){const t=this.x,s=this.y,i=this.z,r=this.w,n=e.elements;return this.x=n[0]*t+n[4]*s+n[8]*i+n[12]*r,this.y=n[1]*t+n[5]*s+n[9]*i+n[13]*r,this.z=n[2]*t+n[6]*s+n[10]*i+n[14]*r,this.w=n[3]*t+n[7]*s+n[11]*i+n[15]*r,this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.dot(this)}length(){return Math.sqrt(this.dot(this))}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,s){return this.x=e.x+(t.x-e.x)*s,this.y=e.y+(t.y-e.y)*s,this.z=e.z+(t.z-e.z)*s,this.w=e.w+(t.w-e.w)*s,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}Q.prototype.isVector4=!0;const La=2e3,tt=2001,cs=new S,Oe=new S,Rt=new S,ae=new S,Ia=new oe,si=new S(1,1,1),ii=new S;class C{constructor(e,t,s,i,r,n,o,l,h,c,u,d,m,v,p,f){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,s,i,r,n,o,l,h,c,u,d,m,v,p,f)}set(e,t,s,i,r,n,o,l,h,c,u,d,m,v,p,f){const x=this.elements;return x[0]=e,x[4]=t,x[8]=s,x[12]=i,x[1]=r,x[5]=n,x[9]=o,x[13]=l,x[2]=h,x[6]=c,x[10]=u,x[14]=d,x[3]=m,x[7]=v,x[11]=p,x[15]=f,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)}clone(){return new C().fromArray(this.elements)}copy(e){const t=this.elements,s=e.elements;for(let i=0;i<16;i++)t[i]=s[i];return this}copyPosition(e){const t=this.elements,s=e.elements;return t[12]=s[12],t[13]=s[13],t[14]=s[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1)}extractBasis(e,t,s){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),s.setFromMatrixColumn(this,2),this}makeBasis(e,t,s){return this.set(e.x,t.x,s.x,0,e.y,t.y,s.y,0,e.z,t.z,s.z,0,0,0,0,1)}extractRotation(e){const t=this.elements,s=e.elements,i=1/cs.setFromMatrixColumn(e,0).length(),r=1/cs.setFromMatrixColumn(e,1).length(),n=1/cs.setFromMatrixColumn(e,2).length();return t[0]=s[0]*i,t[1]=s[1]*i,t[2]=s[2]*i,t[3]=0,t[4]=s[4]*r,t[5]=s[5]*r,t[6]=s[6]*r,t[7]=0,t[8]=s[8]*n,t[9]=s[9]*n,t[10]=s[10]*n,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){return this.compose(ii,Ia.setFromEuler(e,!1),si)}makeRotationFromQuaternion(e){return this.compose(ii,e,si)}lookAt(e,t,s){const i=this.elements;return ae.subVectors(e,t),ae.lengthSq()===0&&(ae.z=1),ae.normalize(),Oe.crossVectors(s,ae),Oe.lengthSq()===0&&(Math.abs(s.z)===1?ae.x+=1e-4:ae.z+=1e-4,ae.normalize(),Oe.crossVectors(s,ae)),Oe.normalize(),Rt.crossVectors(ae,Oe),i[0]=Oe.x,i[4]=Rt.x,i[8]=ae.x,i[1]=Oe.y,i[5]=Rt.y,i[9]=ae.y,i[2]=Oe.z,i[6]=Rt.z,i[10]=ae.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const s=e.elements,i=t.elements,r=this.elements,n=s[0],o=s[4],l=s[8],h=s[12],c=s[1],u=s[5],d=s[9],m=s[13],v=s[2],p=s[6],f=s[10],x=s[14],w=s[3],y=s[7],g=s[11],b=s[15],M=i[0],_=i[4],P=i[8],T=i[12],A=i[1],k=i[5],F=i[9],V=i[13],me=i[2],E=i[6],je=i[10],Xe=i[14],Ye=i[3],ze=i[7],ve=i[11],xe=i[15];return r[0]=n*M+o*A+l*me+h*Ye,r[4]=n*_+o*k+l*E+h*ze,r[8]=n*P+o*F+l*je+h*ve,r[12]=n*T+o*V+l*Xe+h*xe,r[1]=c*M+u*A+d*me+m*Ye,r[5]=c*_+u*k+d*E+m*ze,r[9]=c*P+u*F+d*je+m*ve,r[13]=c*T+u*V+d*Xe+m*xe,r[2]=v*M+p*A+f*me+x*Ye,r[6]=v*_+p*k+f*E+x*ze,r[10]=v*P+p*F+f*je+x*ve,r[14]=v*T+p*V+f*Xe+x*xe,r[3]=w*M+y*A+g*me+b*Ye,r[7]=w*_+y*k+g*E+b*ze,r[11]=w*P+y*F+g*je+b*ve,r[15]=w*T+y*V+g*Xe+b*xe,this}multiplyScalar(e){const t=this.elements;for(let s=0;s<16;s++)t[s]*=e;return this}determinant(){const e=this.elements,t=e[0],s=e[4],i=e[8],r=e[12],n=e[1],o=e[5],l=e[9],h=e[13],c=e[2],u=e[6],d=e[10],m=e[14],v=e[3],p=e[7],f=e[11],x=e[15],w=d*x-m*f,y=u*x-m*p,g=u*f-d*p,b=c*x-m*v,M=c*f-d*v,_=c*p-u*v;return t*(o*w-l*y+h*g)-s*(n*w-l*b+h*M)+i*(n*y-o*b+h*_)-r*(n*g-o*M+l*_)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,s){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=s),this}invert(){const e=this.elements,t=e[0],s=e[1],i=e[2],r=e[3],n=e[4],o=e[5],l=e[6],h=e[7],c=e[8],u=e[9],d=e[10],m=e[11],v=e[12],p=e[13],f=e[14],x=e[15],w=t*o-s*n,y=t*l-i*n,g=t*h-r*n,b=s*l-i*o,M=s*h-r*o,_=i*h-r*l,P=c*p-u*v,T=c*f-d*v,A=c*x-m*v,k=u*f-d*p,F=u*x-m*p,V=d*x-m*f,me=w*V-y*F+g*k+b*A-M*T+_*P;if(me===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/me;return e[0]=(o*V-l*F+h*k)*E,e[1]=(i*F-s*V-r*k)*E,e[2]=(p*_-f*M+x*b)*E,e[3]=(d*M-u*_-m*b)*E,e[4]=(l*A-n*V-h*T)*E,e[5]=(t*V-i*A+r*T)*E,e[6]=(f*g-v*_-x*y)*E,e[7]=(c*_-d*g+m*y)*E,e[8]=(n*F-o*A+h*P)*E,e[9]=(s*A-t*F-r*P)*E,e[10]=(v*M-p*g+x*w)*E,e[11]=(u*g-c*M-m*w)*E,e[12]=(o*T-n*k-l*P)*E,e[13]=(t*k-s*T+i*P)*E,e[14]=(p*y-v*b-f*w)*E,e[15]=(c*b-u*y+d*w)*E,this}scale(e){const t=this.elements;return t[0]*=e.x,t[4]*=e.y,t[8]*=e.z,t[1]*=e.x,t[5]*=e.y,t[9]*=e.z,t[2]*=e.x,t[6]*=e.y,t[10]*=e.z,t[3]*=e.x,t[7]*=e.y,t[11]*=e.z,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],s=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,s,i))}makeTranslation(e,t,s){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,s,0,0,0,1)}makeRotationX(e){const t=Math.cos(e),s=Math.sin(e);return this.set(1,0,0,0,0,t,-s,0,0,s,t,0,0,0,0,1)}makeRotationY(e){const t=Math.cos(e),s=Math.sin(e);return this.set(t,0,s,0,0,1,0,0,-s,0,t,0,0,0,0,1)}makeRotationZ(e){const t=Math.cos(e),s=Math.sin(e);return this.set(t,-s,0,0,s,t,0,0,0,0,1,0,0,0,0,1)}makeRotationAxis(e,t){const s=Math.cos(t),i=Math.sin(t),r=1-s,n=e.x,o=e.y,l=e.z,h=r*n,c=r*o;return this.set(h*n+s,h*o-i*l,h*l+i*o,0,h*o+i*l,c*o+s,c*l-i*n,0,h*l-i*o,c*l+i*n,r*l*l+s,0,0,0,0,1)}makeScale(e,t,s){return this.set(e,0,0,0,0,t,0,0,0,0,s,0,0,0,0,1)}makeShear(e,t,s,i,r,n){return this.set(1,s,r,0,e,1,n,0,t,i,1,0,0,0,0,1)}compose(e,t,s){const i=this.elements,r=t._x,n=t._y,o=t._z,l=t._w,h=r+r,c=n+n,u=o+o,d=r*h,m=r*c,v=r*u,p=n*c,f=n*u,x=o*u,w=l*h,y=l*c,g=l*u,b=s.x,M=s.y,_=s.z;return i[0]=(1-(p+x))*b,i[1]=(m+g)*b,i[2]=(v-y)*b,i[3]=0,i[4]=(m-g)*M,i[5]=(1-(d+x))*M,i[6]=(f+w)*M,i[7]=0,i[8]=(v+y)*_,i[9]=(f-w)*_,i[10]=(1-(d+p))*_,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,s){const i=this.elements;let r=Math.hypot(i[0],i[1],i[2]);const n=Math.hypot(i[4],i[5],i[6]),o=Math.hypot(i[8],i[9],i[10]);this.determinant()<0&&(r=-r),e.x=i[12],e.y=i[13],e.z=i[14];const l=Ra.copy(this),h=l.elements,c=1/r,u=1/n,d=1/o;return h[0]*=c,h[1]*=c,h[2]*=c,h[4]*=u,h[5]*=u,h[6]*=u,h[8]*=d,h[9]*=d,h[10]*=d,t.setFromRotationMatrix(l),s.x=r,s.y=n,s.z=o,this}makePerspective(e,t,s,i,r,n,o=tt,l=!0){const h=this.elements,c=2*r/(t-e),u=2*r/(s-i),d=(t+e)/(t-e),m=(s+i)/(s-i);let v,p;const f=n===1/0;if(l){if(o!==tt)throw new Error("Matrix4.makePerspective: reversed depth requires WebGPU clip space");v=f?0:r/(n-r),p=f?r:n*r/(n-r)}else o===tt?(v=f?-1:-n/(n-r),p=f?-r:-n*r/(n-r)):(v=f?-1:-(n+r)/(n-r),p=f?-2*r:-2*n*r/(n-r));return h[0]=c,h[4]=0,h[8]=d,h[12]=0,h[1]=0,h[5]=u,h[9]=m,h[13]=0,h[2]=0,h[6]=0,h[10]=v,h[14]=p,h[3]=0,h[7]=0,h[11]=-1,h[15]=0,this}makeOrthographic(e,t,s,i,r,n,o=tt,l=!0){const h=this.elements,c=1/(t-e),u=1/(s-i),d=1/(n-r),m=(t+e)*c,v=(s+i)*u;let p,f;return l?(p=n*d,f=d):o===tt?(p=-r*d,f=-d):(p=-(n+r)*d,f=-2*d),h[0]=2*c,h[4]=0,h[8]=0,h[12]=-m,h[1]=0,h[5]=2*u,h[9]=0,h[13]=-v,h[2]=0,h[6]=0,h[10]=f,h[14]=p,h[3]=0,h[7]=0,h[11]=0,h[15]=1,this}equals(e){for(let t=0;t<16;t++)if(this.elements[t]!==e.elements[t])return!1;return!0}fromArray(e,t=0){for(let s=0;s<16;s++)this.elements[s]=e[s+t];return this}toArray(e=[],t=0){const s=this.elements;for(let i=0;i<16;i++)e[t+i]=s[i];return e}}C.prototype.isMatrix4=!0;const Ra=new C,ri=new C,ai=new oe,lt=a=>Math.max(-1,Math.min(1,a));class Me{constructor(e=0,t=0,s=0,i=Me.DEFAULT_ORDER){this._x=e,this._y=t,this._z=s,this._order=i,this._onChangeCallback=Fa}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,s,i=this._order){return this._x=e,this._y=t,this._z=s,this._order=i,this._onChangeCallback(),this}clone(){return new Me(this._x,this._y,this._z,this._order)}copy(e){return this.set(e._x,e._y,e._z,e._order)}setFromRotationMatrix(e,t=this._order,s=!0){const i=e.elements,r=i[0],n=i[4],o=i[8],l=i[1],h=i[5],c=i[9],u=i[2],d=i[6],m=i[10],v=.9999999;switch(t){case"XYZ":this._y=Math.asin(lt(o)),Math.abs(o)<v?(this._x=Math.atan2(-c,m),this._z=Math.atan2(-n,r)):(this._x=Math.atan2(d,h),this._z=0);break;case"YXZ":this._x=Math.asin(-lt(c)),Math.abs(c)<v?(this._y=Math.atan2(o,m),this._z=Math.atan2(l,h)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(lt(d)),Math.abs(d)<v?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-n,h)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-lt(u)),Math.abs(u)<v?(this._x=Math.atan2(d,m),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-n,h));break;case"YZX":this._z=Math.asin(lt(l)),Math.abs(l)<v?(this._x=Math.atan2(-c,h),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,m));break;case"XZY":this._z=Math.asin(-lt(n)),Math.abs(n)<v?(this._x=Math.atan2(d,h),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-c,m),this._y=0);break;default:throw new Error("Euler.setFromRotationMatrix: unknown order "+t)}return this._order=t,s&&this._onChangeCallback(),this}setFromQuaternion(e,t,s){return ri.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ri,t,s)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ai.setFromEuler(this),this.setFromQuaternion(ai,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}function Fa(){}Me.DEFAULT_ORDER="XYZ";Me.prototype.isEuler=!0;class qe{constructor(e,t,s,i,r,n,o,l,h){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,s,i,r,n,o,l,h)}set(e,t,s,i,r,n,o,l,h){const c=this.elements;return c[0]=e,c[1]=i,c[2]=o,c[3]=t,c[4]=r,c[5]=l,c[6]=s,c[7]=n,c[8]=h,this}identity(){return this.set(1,0,0,0,1,0,0,0,1)}copy(e){const t=this.elements,s=e.elements;for(let i=0;i<9;i++)t[i]=s[i];return this}clone(){return new qe().fromArray(this.elements)}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10])}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const s=e.elements,i=t.elements,r=this.elements,n=s[0],o=s[3],l=s[6],h=s[1],c=s[4],u=s[7],d=s[2],m=s[5],v=s[8],p=i[0],f=i[3],x=i[6],w=i[1],y=i[4],g=i[7],b=i[2],M=i[5],_=i[8];return r[0]=n*p+o*w+l*b,r[3]=n*f+o*y+l*M,r[6]=n*x+o*g+l*_,r[1]=h*p+c*w+u*b,r[4]=h*f+c*y+u*M,r[7]=h*x+c*g+u*_,r[2]=d*p+m*w+v*b,r[5]=d*f+m*y+v*M,r[8]=d*x+m*g+v*_,this}multiplyScalar(e){const t=this.elements;for(let s=0;s<9;s++)t[s]*=e;return this}determinant(){const e=this.elements,t=e[0],s=e[1],i=e[2],r=e[3],n=e[4],o=e[5],l=e[6],h=e[7],c=e[8];return t*n*c-t*o*h-s*r*c+s*o*l+i*r*h-i*n*l}invert(){const e=this.elements,t=e[0],s=e[1],i=e[2],r=e[3],n=e[4],o=e[5],l=e[6],h=e[7],c=e[8],u=c*n-o*h,d=o*l-c*r,m=h*r-n*l,v=t*u+s*d+i*m;if(v===0)return this.set(0,0,0,0,0,0,0,0,0);const p=1/v;return e[0]=u*p,e[1]=(i*h-c*s)*p,e[2]=(o*s-i*n)*p,e[3]=d*p,e[4]=(c*t-i*l)*p,e[5]=(i*r-o*t)*p,e[6]=m*p,e[7]=(s*l-h*t)*p,e[8]=(n*t-s*r)*p,this}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}makeTranslation(e,t){return e.isVector2&&(t=e.y,e=e.x),this.set(1,0,e,0,1,t,0,0,1)}makeRotation(e){const t=Math.cos(e),s=Math.sin(e);return this.set(t,-s,0,s,t,0,0,0,1)}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1)}setUvTransform(e,t,s,i,r,n,o){const l=Math.cos(r),h=Math.sin(r);return this.set(s*l,s*h,-s*(l*n+h*o)+n+e,-i*h,i*l,-i*(-h*n+l*o)+o+t,0,0,1)}scale(e,t){return this.premultiply(us.makeScale(e,t))}rotate(e){return this.premultiply(us.makeRotation(-e))}translate(e,t){return this.premultiply(us.makeTranslation(e,t))}equals(e){for(let t=0;t<9;t++)if(this.elements[t]!==e.elements[t])return!1;return!0}fromArray(e,t=0){for(let s=0;s<9;s++)this.elements[s]=e[s+t];return this}toArray(e=[],t=0){for(let s=0;s<9;s++)e[t+s]=this.elements[s];return e}}qe.prototype.isMatrix3=!0;const us=new qe,Pe="srgb",Ft="srgb-linear",ht=a=>a<.04045?a*.0773993808:Math.pow(a*.9478672986+.0521327014,2.4),le=a=>a<.0031308?a*12.92:1.055*Math.pow(a,.41666)-.055,bt=a=>Math.max(0,Math.min(1,a)),Ba=(a,e)=>(a%e+e)%e;function ds(a,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?a+(e-a)*6*t:t<1/2?e:t<2/3?a+(e-a)*6*(2/3-t):a}const Bt={h:0,s:0,l:0};class ee{constructor(e,t,s){this.r=1,this.g=1,this.b=1,this.set(e,t,s)}set(e,t,s){if(t===void 0&&s===void 0){if(e===void 0)return this;e&&e.isColor?this.copy(e):typeof e=="number"?this.setHex(e):typeof e=="string"&&this.setStyle(e)}else this.setRGB(e,t,s);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Pe){return e=Math.floor(e),this.setRGB((e>>16&255)/255,(e>>8&255)/255,(e&255)/255,t)}setRGB(e,t,s,i=Ft){return i===Pe&&(e=ht(e),t=ht(t),s=ht(s)),this.r=e,this.g=t,this.b=s,this}setHSL(e,t,s,i=Ft){if(e=Ba(e,1),t=bt(t),s=bt(s),t===0)return this.setRGB(s,s,s,i);const r=s<=.5?s*(1+t):s+t-s*t,n=2*s-r;return this.setRGB(ds(n,r,e+1/3),ds(n,r,e),ds(n,r,e-1/3),i)}setStyle(e,t=Pe){let s;if(s=/^#([A-Fa-f\d]+)$/.exec(e)){const i=s[1];if(i.length===3)return this.setRGB(parseInt(i[0],16)/15,parseInt(i[1],16)/15,parseInt(i[2],16)/15,t);if(i.length===6)return this.setHex(parseInt(i,16),t)}else if(s=/^rgba?\(\s*([\d.]+)(%?)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*[\d.]+\s*)?\)$/.exec(e)){const i=s[2]==="%"?100:255;return this.setRGB(Math.min(1,s[1]/i),Math.min(1,s[3]/i),Math.min(1,s[4]/i),t)}else{if(s=/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*[\d.]+\s*)?\)$/.exec(e))return this.setHSL(s[1]/360,s[2]/100,s[3]/100,t);if(Is[e.toLowerCase()]!==void 0)return this.setHex(Is[e.toLowerCase()],t)}return console.warn("Color: unknown color "+e),this}clone(){return new ee(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ht(e.r),this.g=ht(e.g),this.b=ht(e.b),this}copyLinearToSRGB(e){return this.r=le(e.r),this.g=le(e.g),this.b=le(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this)}convertLinearToSRGB(){return this.copyLinearToSRGB(this)}getHex(e=Pe){let t=this.r,s=this.g,i=this.b;return e===Pe&&(t=le(t),s=le(s),i=le(i)),Math.round(bt(t)*255)*65536+Math.round(bt(s)*255)*256+Math.round(bt(i)*255)}getHexString(e=Pe){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ft){let s=this.r,i=this.g,r=this.b;t===Pe&&(s=le(s),i=le(i),r=le(r));const n=Math.max(s,i,r),o=Math.min(s,i,r);let l=0,h=0;const c=(o+n)/2;if(o!==n){const u=n-o;h=c<=.5?u/(n+o):u/(2-n-o),n===s?l=(i-r)/u+(i<r?6:0):n===i?l=(r-s)/u+2:l=(s-i)/u+4,l/=6}return e.h=l,e.s=h,e.l=c,e}getRGB(e,t=Ft){return e.r=this.r,e.g=this.g,e.b=this.b,t===Pe&&(e.r=le(e.r),e.g=le(e.g),e.b=le(e.b)),e}getStyle(e=Pe){const t=this.getRGB({},e);return`rgb(${Math.round(t.r*255)},${Math.round(t.g*255)},${Math.round(t.b*255)})`}offsetHSL(e,t,s){return this.getHSL(Bt),this.setHSL(Bt.h+e,Bt.s+t,Bt.l+s)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,s){return this.r=e.r+(t.r-e.r)*s,this.g=e.g+(t.g-e.g)*s,this.b=e.b+(t.b-e.b)*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}ee.prototype.isColor=!0;const Is={black:0,white:16777215,red:16711680,green:32768,lime:65280,blue:255,yellow:16776960,cyan:65535,magenta:16711935,gray:8421504,grey:8421504,orange:16753920};ee.NAMES=Is;const ge=new S,Te=Array.from({length:8},()=>new S);class Be{constructor(e=new S(1/0,1/0,1/0),t=new S(-1/0,-1/0,-1/0)){this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0;t<e.length;t+=3)this.expandByPoint(ge.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0;t<e.count;t++)this.expandByPoint(ge.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(const t of e)this.expandByPoint(t);return this}setFromCenterAndSize(e,t){return ge.copy(t).multiplyScalar(.5),this.min.copy(e).sub(ge),this.max.copy(e).add(ge),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new Be().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const s=e.geometry;if(s!==void 0){const i=s.getAttribute("position");if(t&&i!==void 0)for(let r=0;r<i.count;r++)this.expandByPoint(ge.fromBufferAttribute(i,r).applyMatrix4(e.matrixWorld));else s.boundingBox===null&&s.computeBoundingBox(),ni.copy(s.boundingBox).applyMatrix4(e.matrixWorld),this.union(ni)}for(const i of e.children)this.expandByObject(i,t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,ge),ge.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,s;const i=e.normal;return i.x>0?(t=i.x*this.min.x,s=i.x*this.max.x):(t=i.x*this.max.x,s=i.x*this.min.x),i.y>0?(t+=i.y*this.min.y,s+=i.y*this.max.y):(t+=i.y*this.max.y,s+=i.y*this.min.y),i.z>0?(t+=i.z*this.min.z,s+=i.z*this.max.z):(t+=i.z*this.max.z,s+=i.z*this.min.z),t<=-e.constant&&s>=-e.constant}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ge).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?(e.makeEmpty(),e):(this.getCenter(e.center),e.radius=this.getSize(ge).length()*.5,e)}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){if(this.isEmpty())return this;const t=this.min,s=this.max;return Te[0].set(t.x,t.y,t.z).applyMatrix4(e),Te[1].set(t.x,t.y,s.z).applyMatrix4(e),Te[2].set(t.x,s.y,t.z).applyMatrix4(e),Te[3].set(t.x,s.y,s.z).applyMatrix4(e),Te[4].set(s.x,t.y,t.z).applyMatrix4(e),Te[5].set(s.x,t.y,s.z).applyMatrix4(e),Te[6].set(s.x,s.y,t.z).applyMatrix4(e),Te[7].set(s.x,s.y,s.z).applyMatrix4(e),this.setFromPoints(Te)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}Be.prototype.isBox3=!0;const ni=new Be,Ea=new Be,fs=new S;class Ee{constructor(e=new S,t=-1){this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){t!==void 0?this.center.copy(t):Ea.setFromPoints(e).getCenter(this.center);let s=0;for(const i of e)s=Math.max(s,this.center.distanceToSquared(i));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}clone(){return new Ee().copy(this)}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const s=this.center.distanceToSquared(e);return t.copy(e),s>this.radius*this.radius&&t.sub(this.center).normalize().multiplyScalar(this.radius).add(this.center),t}getBoundingBox(e){return this.isEmpty()?e.makeEmpty():(e.set(this.center,this.center),e.expandByScalar(this.radius))}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;fs.subVectors(e,this.center);const t=fs.lengthSq();if(t>this.radius*this.radius){const s=Math.sqrt(t),i=(s-this.radius)*.5;this.center.addScaledVector(fs,i/s),this.radius+=i}return this}union(e){if(e.isEmpty())return this;if(this.isEmpty())return this.copy(e);const t=this.center.distanceTo(e.center);if(t+e.radius<=this.radius)return this;if(t+this.radius<=e.radius)return this.copy(e);const s=(t+this.radius+e.radius)*.5;return this.center.lerp(e.center,(s-this.radius)/t),this.radius=s,this}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}}Ee.prototype.isSphere=!0;const oi=new S,Na=new S,Oa=new qe;class Ce{constructor(e=new S(1,0,0),t=0){this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,s,i){return this.normal.set(e,t,s),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(e),this}setFromCoplanarPoints(e,t,s){const i=oi.subVectors(s,t).cross(Na.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e)}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}clone(){return new Ce().copy(this)}normalize(){const e=this.normal.length();if(e===0)return this;const t=1/e;return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}applyMatrix4(e,t){const s=t||Oa.getNormalMatrix(e),i=this.coplanarPoint(oi).applyMatrix4(e),r=this.normal.applyMatrix3(s).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}}Ce.prototype.isPlane=!0;const li=new Ee,Et=new S;class ss{constructor(e=new Ce,t=new Ce,s=new Ce,i=new Ce,r=new Ce,n=new Ce){this.planes=[e,t,s,i,r,n]}set(e,t,s,i,r,n){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(s),o[3].copy(i),o[4].copy(r),o[5].copy(n),this}copy(e){for(let t=0;t<6;t++)this.planes[t].copy(e.planes[t]);return this}clone(){return new ss().copy(this)}setFromProjectionMatrix(e,t=tt,s=!0){const i=this.planes,r=e.elements,n=r[0],o=r[4],l=r[8],h=r[12],c=r[1],u=r[5],d=r[9],m=r[13],v=r[2],p=r[6],f=r[10],x=r[14],w=r[3],y=r[7],g=r[11],b=r[15];return i[0].setComponents(w+n,y+o,g+l,b+h).normalize(),i[1].setComponents(w-n,y-o,g-l,b-h).normalize(),i[2].setComponents(w+c,y+u,g+d,b+m).normalize(),i[3].setComponents(w-c,y-u,g-d,b-m).normalize(),s?(i[4].setComponents(w-v,y-p,g-f,b-x).normalize(),i[5].setComponents(v,p,f,x).normalize()):t===La?(i[4].setComponents(w+v,y+p,g+f,b+x).normalize(),i[5].setComponents(w-v,y-p,g-f,b-x).normalize()):(i[4].setComponents(v,p,f,x).normalize(),i[5].setComponents(w-v,y-p,g-f,b-x).normalize()),this}intersectsObject(e){const t=e.geometry;return t.boundingSphere===null&&t.computeBoundingSphere(),li.copy(t.boundingSphere).applyMatrix4(e.matrixWorld),this.intersectsSphere(li)}intersectsSphere(e){const t=this.planes,s=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(s)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let s=0;s<6;s++){const i=t[s].normal;if(Et.x=i.x>0?e.max.x:e.min.x,Et.y=i.y>0?e.max.y:e.min.y,Et.z=i.z>0?e.max.z:e.min.z,t[s].distanceToPoint(Et)<0)return!1}return!0}containsPoint(e){for(let t=0;t<6;t++)if(this.planes[t].distanceToPoint(e)<0)return!1;return!0}}const ps=()=>typeof performance<"u"?performance.now():Date.now();class Ua{constructor(){this._startTime=ps(),this._previousTime=0,this._currentTime=0,this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=()=>{e.hidden===!1&&this.reset()},e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=ps()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:ps())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}const Wa=new Float32Array(1);new Uint32Array(Wa.buffer);class is{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const s=this._listeners;s[e]===void 0&&(s[e]=[]),s[e].includes(t)||s[e].push(t)}hasEventListener(e,t){const s=this._listeners;return s!==void 0&&s[e]!==void 0&&s[e].includes(t)}removeEventListener(e,t){const s=this._listeners&&this._listeners[e];if(s===void 0)return;const i=s.indexOf(t);i!==-1&&s.splice(i,1)}dispatchEvent(e){const t=this._listeners&&this._listeners[e.type];if(t!==void 0){e.target=this;for(const s of t.slice())s.call(this,e);e.target=null}}}class Va{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Ga=0;const hi=new S,ct=new oe,Ae=new C,Nt=new S,St=new S,Ha=new S,$a=new oe,ci=new S(1,0,0),ui=new S(0,1,0),di=new S(0,0,1),fi={type:"added"},qa={type:"removed"},ms={type:"childadded",child:null},vs={type:"childremoved",child:null};class ne extends is{constructor(){super(),Object.defineProperty(this,"id",{value:Ga++}),this.uuid=ts(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ne.DEFAULT_UP.clone();const e=new S,t=new Me,s=new oe,i=new S(1,1,1);t._onChange(()=>s.setFromEuler(t,!1)),s._onChange(()=>t.setFromQuaternion(s,void 0,!1)),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:s},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new C},normalMatrix:{value:new qe}}),this.matrix=new C,this.matrixWorld=new C,this.matrixAutoUpdate=ne.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ne.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Va,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.userData={}}onBeforeRender(){}onAfterRender(){}onBeforeShadow(){}onAfterShadow(){}dispose(){this.dispatchEvent({type:"dispose"})}applyMatrix4(e){return this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ct.setFromAxisAngle(e,t),this.quaternion.multiply(ct),this}rotateOnWorldAxis(e,t){return ct.setFromAxisAngle(e,t),this.quaternion.premultiply(ct),this}rotateX(e){return this.rotateOnAxis(ci,e)}rotateY(e){return this.rotateOnAxis(ui,e)}rotateZ(e){return this.rotateOnAxis(di,e)}translateOnAxis(e,t){return hi.copy(e).applyQuaternion(this.quaternion),this.position.add(hi.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ci,e)}translateY(e){return this.translateOnAxis(ui,e)}translateZ(e){return this.translateOnAxis(di,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ae.copy(this.matrixWorld).invert())}lookAt(e,t,s){e.isVector3?Nt.copy(e):Nt.set(e,t,s);const i=this.parent;this.updateWorldMatrix(!0,!1),St.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ae.lookAt(St,Nt,this.up):Ae.lookAt(Nt,St,this.up),this.quaternion.setFromRotationMatrix(Ae),i&&(Ae.extractRotation(i.matrixWorld),ct.setFromRotationMatrix(Ae),this.quaternion.premultiply(ct.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?this:(e&&e.isObject3D&&(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(fi),ms.child=e,this.dispatchEvent(ms),ms.child=null),this)}remove(e){if(arguments.length>1){for(let s=0;s<arguments.length;s++)this.remove(arguments[s]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(qa),vs.child=e,this.dispatchEvent(vs),vs.child=null),this}removeFromParent(){return this.parent!==null&&this.parent.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ae.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ae.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ae),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(fi),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(const s of this.children){const i=s.getObjectByProperty(e,t);if(i!==void 0)return i}}getObjectsByProperty(e,t,s=[]){this[e]===t&&s.push(this);for(const i of this.children)i.getObjectsByProperty(e,t,s);return s}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(St,e,Ha),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(St,$a,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}traverse(e){e(this);const t=this.children;for(let s=0,i=t.length;s<i;s++)t[s].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let s=0,i=t.length;s<i;s++)t[s].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let s=0,i=t.length;s<i;s++){const r=t[s];(r.matrixWorldAutoUpdate===!0||e===!0)&&r.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(s===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(s.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let r=0,n=i.length;r<n;r++)i[r].matrixWorldAutoUpdate===!0&&i[r].updateWorldMatrix(!1,!0)}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,e.onBeforeRender!==ne.prototype.onBeforeRender&&(this.onBeforeRender=e.onBeforeRender),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(const s of e.children)this.add(s.clone());return this}}ne.DEFAULT_UP=new S(0,1,0);ne.DEFAULT_MATRIX_AUTO_UPDATE=!0;ne.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;ne.prototype.isObject3D=!0;class Fe extends ne{constructor(){super(),this.type="Group"}}Fe.prototype.isGroup=!0;class Ns extends ne{constructor(){super(),this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Me,this.environmentIntensity=1,this.environmentRotation=new Me,this.overrideMaterial=null}copy(e,t){return super.copy(e,t),this.background=e.background,this.environment=e.environment,this.fog=e.fog,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentRotation.copy(e.environmentRotation),this.environmentIntensity=e.environmentIntensity,this.overrideMaterial=e.overrideMaterial,this.matrixAutoUpdate=e.matrixAutoUpdate,this}}Ns.prototype.isScene=!0;const cr=35044,K=new S,xs=new I,ur={getComponent(a,e){const t=this.array[this._idx(a,e)];return this.normalized?lr(t,this.array):t},setComponent(a,e,t){return this.array[this._idx(a,e)]=this.normalized?hr(t,this.array):t,this},getX(a){return this.getComponent(a,0)},getY(a){return this.getComponent(a,1)},getZ(a){return this.getComponent(a,2)},getW(a){return this.getComponent(a,3)},setX(a,e){return this.setComponent(a,0,e)},setY(a,e){return this.setComponent(a,1,e)},setZ(a,e){return this.setComponent(a,2,e)},setW(a,e){return this.setComponent(a,3,e)},setXY(a,e,t){return this.setComponent(a,0,e),this.setComponent(a,1,t)},setXYZ(a,e,t,s){return this.setComponent(a,0,e),this.setComponent(a,1,t),this.setComponent(a,2,s)},setXYZW(a,e,t,s,i){return this.setComponent(a,0,e),this.setComponent(a,1,t),this.setComponent(a,2,s),this.setComponent(a,3,i)},applyMatrix3(a){if(this.itemSize===2)for(let e=0;e<this.count;e++)xs.fromBufferAttribute(this,e).applyMatrix3(a),this.setXY(e,xs.x,xs.y);else if(this.itemSize===3)for(let e=0;e<this.count;e++)K.fromBufferAttribute(this,e).applyMatrix3(a),this.setXYZ(e,K.x,K.y,K.z);return this},applyMatrix4(a){for(let e=0;e<this.count;e++)K.fromBufferAttribute(this,e).applyMatrix4(a),this.setXYZ(e,K.x,K.y,K.z);return this},applyNormalMatrix(a){for(let e=0;e<this.count;e++)K.fromBufferAttribute(this,e).applyNormalMatrix(a),this.setXYZ(e,K.x,K.y,K.z);return this},transformDirection(a){for(let e=0;e<this.count;e++)K.fromBufferAttribute(this,e).transformDirection(a),this.setXYZ(e,K.x,K.y,K.z);return this}};class te extends is{constructor(e,t,s=!1){if(super(),Array.isArray(e))throw new TypeError("BufferAttribute: array should be a Typed Array.");this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=s,this.usage=cr,this.updateRanges=[],this.gpuType=1015,this.version=0,this.onUploadCallback=dr}set needsUpdate(e){e===!0&&this.version++}_idx(e,t){return e*this.itemSize+t}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}onUpload(e){return this.onUploadCallback=e,this}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,s){const i=this.itemSize;e*=i,s*=t.itemSize;for(let r=0;r<i;r++)this.array[e+r]=t.array[s+r];return this}copyArray(e){return this.array.set(e),this}set(e,t=0){return this.array.set(e,t),this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}dispose(){this.dispatchEvent({type:"dispose"})}}Object.assign(te.prototype,ur);te.prototype.isBufferAttribute=!0;function dr(){}class ja extends te{constructor(e,t,s){super(new Uint16Array(e),t,s)}}class Xa extends te{constructor(e,t,s){super(new Uint32Array(e),t,s)}}class jt extends te{constructor(e,t,s){super(new Float32Array(e),t,s)}}class Dt extends te{constructor(e,t,s,i=1){super(e,t,s),this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(){return new Dt(this.array,this.itemSize).copy(this)}}Dt.prototype.isInstancedBufferAttribute=!0;class fr extends is{constructor(e,t){super(),this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=cr,this.updateRanges=[],this.version=0,this.uuid=ts(),this.onUploadCallback=dr}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}set(e,t=0){return this.array.set(e,t),this}onUpload(e){return this.onUploadCallback=e,this}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,s){e*=this.stride,s*=t.stride;for(let i=0;i<this.stride;i++)this.array[e+i]=t.array[s+i];return this}clone(){return new this.constructor(new this.array.constructor(this.array),this.stride).copy(this)}dispose(){this.dispatchEvent({type:"dispose"})}}fr.prototype.isInterleavedBuffer=!0;class Os extends fr{constructor(e,t,s=1){super(e,t),this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(){return new Os(new this.array.constructor(this.array),this.stride,this.meshPerAttribute)}}Os.prototype.isInstancedInterleavedBuffer=!0;class pr{constructor(e,t,s,i=!1){this.name="",this.data=e,this.itemSize=t,this.offset=s,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}_idx(e,t){return e*this.data.stride+this.offset+t}clone(){const e=new this.array.constructor(this.count*this.itemSize);for(let t=0;t<this.count;t++)for(let s=0;s<this.itemSize;s++)e[t*this.itemSize+s]=this.array[this._idx(t,s)];return new te(e,this.itemSize,this.normalized)}}Object.assign(pr.prototype,ur);pr.prototype.isInterleavedBufferAttribute=!0;let Ya=0;const Ue=new C,Ka=new qe,pi=new oe,Za=new Be,ut=new S,Ot=new S;function Qa(a){for(let e=a.length-1;e>=0;--e)if(a[e]>=65535)return!0;return!1}class ie extends is{constructor(){super(),Object.defineProperty(this,"id",{value:Ya++}),this.uuid=ts(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Qa(e)?Xa:ja)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this.attributesVersion=(this.attributesVersion||0)+1,this}deleteAttribute(e){return delete this.attributes[e],this.attributesVersion=(this.attributesVersion||0)+1,this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,s=0){this.groups.push({start:e,count:t,materialIndex:s})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const s=this.attributes.normal;s!==void 0&&(s.applyNormalMatrix(Ka.getNormalMatrix(e)),s.needsUpdate=!0);const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return this.applyMatrix4(Ue.makeRotationFromQuaternion(e))}rotateX(e){return this.applyMatrix4(Ue.makeRotationX(e))}rotateY(e){return this.applyMatrix4(Ue.makeRotationY(e))}rotateZ(e){return this.applyMatrix4(Ue.makeRotationZ(e))}translate(e,t,s){return this.applyMatrix4(Ue.makeTranslation(e,t,s))}scale(e,t,s){return this.applyMatrix4(Ue.makeScale(e,t,s))}lookAt(e){return Ue.lookAt(e,ut.set(0,0,0),new S(0,1,0)),pi.setFromRotationMatrix(Ue),this.applyQuaternion(pi)}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ot).negate(),this.translate(Ot.x,Ot.y,Ot.z)}setFromPoints(e){const t=[];for(const s of e)t.push(s.x,s.y,s.z||0);return this.setAttribute("position",new jt(t,3))}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Be);const e=this.attributes.position;if(e===void 0){this.boundingBox.makeEmpty();return}this.boundingBox.setFromBufferAttribute(e)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ee);const e=this.attributes.position;if(e===void 0){this.boundingSphere.makeEmpty();return}const t=this.boundingSphere.center;Za.setFromBufferAttribute(e).getCenter(t);let s=0;for(let i=0;i<e.count;i++)s=Math.max(s,t.distanceToSquared(ut.fromBufferAttribute(e,i)));this.boundingSphere.radius=Math.sqrt(s)}computeTangents(){const e=this.index,t=this.attributes.position,s=this.attributes.normal,i=this.attributes.uv;if(e===null||t===void 0||s===void 0||i===void 0){console.error("BufferGeometry.computeTangents(): missing required attributes (index, position, normal or uv)");return}const r=t.count;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new te(new Float32Array(4*r),4));const n=this.getAttribute("tangent"),o=[],l=[];for(let P=0;P<r;P++)o[P]=new S,l[P]=new S;const h=new S,c=new S,u=new S,d=new I,m=new I,v=new I,p=new S,f=new S,x=(P,T,A)=>{h.fromBufferAttribute(t,P),c.fromBufferAttribute(t,T),u.fromBufferAttribute(t,A),d.fromBufferAttribute(i,P),m.fromBufferAttribute(i,T),v.fromBufferAttribute(i,A),c.sub(h),u.sub(h),m.sub(d),v.sub(d);const k=1/(m.x*v.y-v.x*m.y);isFinite(k)&&(p.copy(c).multiplyScalar(v.y).addScaledVector(u,-m.y).multiplyScalar(k),f.copy(u).multiplyScalar(m.x).addScaledVector(c,-v.x).multiplyScalar(k),o[P].add(p),o[T].add(p),o[A].add(p),l[P].add(f),l[T].add(f),l[A].add(f))},w=this.groups.length?this.groups:[{start:0,count:e.count}];for(const P of w)for(let T=P.start;T<P.start+P.count;T+=3)x(e.getX(T),e.getX(T+1),e.getX(T+2));const y=new S,g=new S,b=new S,M=new S,_=P=>{g.fromBufferAttribute(s,P),b.copy(g);const T=o[P];y.copy(T).sub(g.multiplyScalar(g.dot(T))).normalize(),M.crossVectors(b,T);const A=M.dot(l[P])<0?-1:1;n.setXYZW(P,y.x,y.y,y.z,A)};for(const P of w)for(let T=P.start;T<P.start+P.count;T++)_(e.getX(T))}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t===void 0)return;let s=this.getAttribute("normal");if(s===void 0||s.count!==t.count)s=new te(new Float32Array(t.count*3),3),this.setAttribute("normal",s);else for(let d=0;d<s.count;d++)s.setXYZ(d,0,0,0);const i=new S,r=new S,n=new S,o=new S,l=new S,h=new S,c=new S,u=new S;if(e)for(let d=0,m=e.count;d<m;d+=3){const v=e.getX(d),p=e.getX(d+1),f=e.getX(d+2);i.fromBufferAttribute(t,v),r.fromBufferAttribute(t,p),n.fromBufferAttribute(t,f),o.subVectors(n,r),l.subVectors(i,r),o.cross(l),h.fromBufferAttribute(s,v),c.fromBufferAttribute(s,p),u.fromBufferAttribute(s,f),h.add(o),c.add(o),u.add(o),s.setXYZ(v,h.x,h.y,h.z),s.setXYZ(p,c.x,c.y,c.z),s.setXYZ(f,u.x,u.y,u.z)}else for(let d=0,m=t.count;d<m;d+=3)i.fromBufferAttribute(t,d),r.fromBufferAttribute(t,d+1),n.fromBufferAttribute(t,d+2),o.subVectors(n,r),l.subVectors(i,r),o.cross(l),s.setXYZ(d,o.x,o.y,o.z),s.setXYZ(d+1,o.x,o.y,o.z),s.setXYZ(d+2,o.x,o.y,o.z);this.normalizeNormals(),s.needsUpdate=!0}normalizeNormals(){const e=this.attributes.normal;for(let t=0,s=e.count;t<s;t++)ut.fromBufferAttribute(e,t).normalize(),e.setXYZ(t,ut.x,ut.y,ut.z)}toNonIndexed(){if(this.index===null)return console.warn("BufferGeometry.toNonIndexed(): geometry is already non-indexed."),this;const e=new ie,t=this.index,s=i=>{const r=i.itemSize,n=new i.array.constructor(t.count*r);for(let o=0;o<t.count;o++){const l=t.getX(o);for(let h=0;h<r;h++)n[o*r+h]=i.array[i._idx(l,h)]}return new te(n,r,i.normalized)};for(const i in this.attributes)e.setAttribute(i,s(this.attributes[i]));for(const i in this.morphAttributes)e.morphAttributes[i]=this.morphAttributes[i].map(s);e.morphTargetsRelative=this.morphTargetsRelative;for(const i of this.groups)e.addGroup(i.start,i.count,i.materialIndex);return e}clone(){return new ie().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.name=e.name,e.index!==null&&this.setIndex(e.index.clone());for(const t in e.attributes)this.setAttribute(t,e.attributes[t].clone());for(const t in e.morphAttributes)this.morphAttributes[t]=e.morphAttributes[t].map(s=>s.clone());this.morphTargetsRelative=e.morphTargetsRelative;for(const t of e.groups)this.addGroup(t.start,t.count,t.materialIndex);return e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}ie.prototype.isBufferGeometry=!0;class Us extends ie{constructor(){super(),this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}clone(){return new Us().copy(this)}}Us.prototype.isInstancedBufferGeometry=!0;class ce extends ne{constructor(e=new ie,t=null){super(),this.type="Mesh",this.geometry=e,this.material=t,this.count=1}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this.count=e.count,this}}ce.prototype.isMesh=!0;const _t=new C,mi=new Be,vi=new Ee;class Lt extends ce{constructor(e,t,s){super(e,t),this.type="InstancedMesh",this.instanceMatrix=new Dt(new Float32Array(s*16),16),this.instanceColor=null,this.count=s,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<s;i++)this.setMatrixAt(i,_t.identity())}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}getColorAt(e,t){return t.fromArray(this.instanceColor.array,e*3)}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Dt(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Be),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let t=0;t<this.count;t++)this.getMatrixAt(t,_t),mi.copy(e.boundingBox).applyMatrix4(_t),this.boundingBox.union(mi)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Ee),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let t=0;t<this.count;t++)this.getMatrixAt(t,_t),vi.copy(e.boundingSphere).applyMatrix4(_t),this.boundingSphere.union(vi)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}clone(e){return new Lt(this.geometry,this.material,this.count).copy(this,e)}dispose(){this.dispatchEvent({type:"dispose"})}}Lt.prototype.isInstancedMesh=!0;const We=new S,xi=new I,gi=new I;class Ws extends ne{constructor(){super(),this.type="Camera",this.matrixWorldInverse=new C,this.projectionMatrix=new C,this.projectionMatrixInverse=new C,this.coordinateSystem=tt,this.reversedDepth=!0}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this.reversedDepth=e.reversedDepth,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}Ws.prototype.isCamera=!0;function mr(a,e,t,s,i,r,n){a.view===null&&(a.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1});const o=a.view;o.enabled=!0,o.fullWidth=e,o.fullHeight=t,o.offsetX=s,o.offsetY=i,o.width=r,o.height=n,a.updateProjectionMatrix()}class vr extends Ws{constructor(e=50,t=1,s=.1,i=2e3){super(),this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=s,this.far=i,this.infiniteFar=!1,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.infiniteFar=e.infiniteFar,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=es*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){return .5*this.getFilmHeight()/Math.tan(Ct*.5*this.fov)}getEffectiveFOV(){return es*2*Math.atan(Math.tan(Ct*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,s){We.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(We.x,We.y).multiplyScalar(-e/We.z),We.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),s.set(We.x,We.y).multiplyScalar(-e/We.z)}getViewSize(e,t){return this.getViewBounds(e,xi,gi),t.subVectors(gi,xi)}setViewOffset(e,t,s,i,r,n){this.aspect=e/t,mr(this,e,t,s,i,r,n)}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Ct*.5*this.fov)/this.zoom,s=2*t,i=this.aspect*s,r=-.5*i;const n=this.view;if(n!==null&&n.enabled){const h=n.fullWidth,c=n.fullHeight;r+=n.offsetX*i/h,t-=n.offsetY*s/c,i*=n.width/h,s*=n.height/c}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth());const l=this.infiniteFar?1/0:this.far;this.projectionMatrix.makePerspective(r,r+i,t,t-s,e,l,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}}vr.prototype.isPerspectiveCamera=!0;class Ja extends Ws{constructor(e=-1,t=1,s=1,i=-1,r=.1,n=2e3){super(),this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=s,this.bottom=i,this.near=r,this.far=n,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,s,i,r,n){mr(this,e,t,s,i,r,n)}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),s=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=s-e,n=s+e,o=i+t,l=i-t;const h=this.view;if(h!==null&&h.enabled){const c=(this.right-this.left)/h.fullWidth/this.zoom,u=(this.top-this.bottom)/h.fullHeight/this.zoom;r+=c*h.offsetX,n=r+c*h.width,o-=u*h.offsetY,l=o-u*h.height}this.projectionMatrix.makeOrthographic(r,n,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}}Ja.prototype.isOrthographicCamera=!0;function xr(a,e,t,s,i){e&&a.setIndex(e),a.setAttribute("position",new jt(t,3)),a.setAttribute("normal",new jt(s,3)),a.setAttribute("uv",new jt(i,2))}class en extends ie{constructor(e=1,t=32,s=16,i=0,r=Math.PI*2,n=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:s,phiStart:i,phiLength:r,thetaStart:n,thetaLength:o},t=Math.max(3,Math.floor(t)),s=Math.max(2,Math.floor(s));const l=Math.min(n+o,Math.PI);let h=0;const c=[],u=[],d=[],m=[],v=[],p=new S;for(let f=0;f<=s;f++){const x=[],w=f/s;let y=0;f===0&&n===0?y=.5/t:f===s&&l===Math.PI&&(y=-.5/t);for(let g=0;g<=t;g++){const b=g/t,M=Math.sin(n+w*o);p.set(-e*Math.cos(i+b*r)*M,e*Math.cos(n+w*o),e*Math.sin(i+b*r)*M),d.push(p.x,p.y,p.z),p.normalize(),m.push(p.x,p.y,p.z),v.push(b+y,1-w),x.push(h++)}c.push(x)}for(let f=0;f<s;f++)for(let x=0;x<t;x++){const w=c[f][x+1],y=c[f][x],g=c[f+1][x],b=c[f+1][x+1];(f!==0||n>0)&&u.push(w,y,b),(f!==s-1||l<Math.PI)&&u.push(y,g,b)}xr(this,u,d,m,v)}}class gr extends ie{constructor(e=1,t=1,s=1,i=32,r=1,n=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:s,radialSegments:i,heightSegments:r,openEnded:n,thetaStart:o,thetaLength:l},i=Math.floor(i),r=Math.floor(r);const h=[],c=[],u=[],d=[],m=[],v=s/2;let p=0,f=0;const x=new S;{let y=0;const g=(t-e)/s;for(let b=0;b<=r;b++){const M=[],_=b/r,P=_*(t-e)+e;for(let T=0;T<=i;T++){const A=T/i,k=A*l+o,F=Math.sin(k),V=Math.cos(k);c.push(P*F,-_*s+v,P*V),x.set(F,g,V).normalize(),u.push(x.x,x.y,x.z),d.push(A,1-_),M.push(p++)}m.push(M)}for(let b=0;b<i;b++)for(let M=0;M<r;M++){const _=m[M][b],P=m[M+1][b],T=m[M+1][b+1],A=m[M][b+1];(e>0||M!==0)&&(h.push(_,P,A),y+=3),(t>0||M!==r-1)&&(h.push(P,T,A),y+=3)}this.addGroup(f,y,0),f+=y}const w=y=>{const g=p,b=y===!0?e:t,M=y===!0?1:-1;let _=0;for(let T=1;T<=i;T++)c.push(0,v*M,0),u.push(0,M,0),d.push(.5,.5),p++;const P=p;for(let T=0;T<=i;T++){const A=T/i,k=A*l+o,F=Math.cos(k),V=Math.sin(k);c.push(b*V,v*M,b*F),u.push(0,M,0),d.push(F*.5+.5,V*.5*M+.5),p++}for(let T=0;T<i;T++){const A=g+T,k=P+T;y===!0?h.push(k,k+1,A):h.push(k+1,k,A),_+=3}this.addGroup(f,_,y===!0?1:2),f+=_};n===!1&&(e>0&&w(!0),t>0&&w(!1)),xr(this,h,c,u,d)}}class tn extends gr{constructor(e=1,t=1,s=32,i=1,r=!1,n=0,o=Math.PI*2){super(0,e,t,s,i,r,n,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:s,heightSegments:i,openEnded:r,thetaStart:n,thetaLength:o}}}const z={device:null,queue:null,adapter:null,context:null,canvas:null,format:"bgra8unorm",features:new Set,limits:null,hasTimestamp:!1,hasFloat32Filterable:!1,encoder:null,frame:0,samplers:null,_submitHooks:[],async init({canvas:a=null,requiredLimits:e={},headless:t=!1}={}){if(!navigator.gpu)throw new Error("WebGPU is not available in this browser.");const s=await navigator.gpu.requestAdapter({powerPreference:"high-performance"})||await navigator.gpu.requestAdapter();if(!s)throw new Error("No WebGPU adapter found.");this.adapter=s;const i=s.limits,r={maxSampledTexturesPerShaderStage:32,maxSamplersPerShaderStage:16,maxStorageBuffersPerShaderStage:10,maxStorageTexturesPerShaderStage:8,maxComputeWorkgroupStorageSize:32768,maxColorAttachmentBytesPerSample:64,maxStorageBuffersInVertexStage:4,maxStorageBuffersInFragmentStage:8,maxStorageTexturesInFragmentStage:4,maxBindingsPerBindGroup:1e3,maxBufferSize:1024*1024*1024,maxStorageBufferBindingSize:512*1024*1024,...e},n={};for(const c in r)i[c]!==void 0&&(n[c]=Math.min(r[c],i[c]));const l=["float32-filterable","timestamp-query","rg11b10ufloat-renderable","float32-blendable","shader-f16","clip-distances"].filter(c=>s.features.has(c));this.features=new Set(l),this.hasTimestamp=this.features.has("timestamp-query"),this.hasFloat32Filterable=this.features.has("float32-filterable");const h=await s.requestDevice({requiredFeatures:l,requiredLimits:n});return this.device=h,this.queue=h.queue,this.limits=h.limits,h.lost.then(c=>console.error("WebGPU device lost:",c.message)),h.addEventListener&&h.addEventListener("uncapturederror",c=>console.error("WebGPU:",c.error.message.split(`
`).slice(0,6).join(`
`))),a&&!t&&(this.canvas=a,this.context=a.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.context.configure({device:h,format:this.format,alphaMode:"opaque",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_DST})),this._createSamplers(),this},_createSamplers(){const a=this.device,e=s=>a.createSampler(s),t={magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"};this.samplers={linearRepeat:e({...t,addressModeU:"repeat",addressModeV:"repeat",addressModeW:"repeat"}),linearClamp:e({...t,addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",addressModeW:"clamp-to-edge"}),linearMirror:e({...t,addressModeU:"mirror-repeat",addressModeV:"mirror-repeat",addressModeW:"mirror-repeat"}),anisoRepeat:e({...t,addressModeU:"repeat",addressModeV:"repeat",addressModeW:"repeat",maxAnisotropy:8}),aniso4Repeat:e({...t,addressModeU:"repeat",addressModeV:"repeat",addressModeW:"repeat",maxAnisotropy:4}),anisoClamp:e({...t,addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",maxAnisotropy:8}),nearestClamp:e({magFilter:"nearest",minFilter:"nearest",mipmapFilter:"nearest",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",addressModeW:"clamp-to-edge"}),nearestRepeat:e({magFilter:"nearest",minFilter:"nearest",mipmapFilter:"nearest",addressModeU:"repeat",addressModeV:"repeat",addressModeW:"repeat"}),shadow:e({magFilter:"linear",minFilter:"linear",compare:"less",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"})}},beginFrame(){return this.frame++,this.getEncoder()},getEncoder(){return this.encoder||(this.encoder=this.device.createCommandEncoder()),this.encoder},submit(){if(!this.encoder)return;const a=this._submitHooks;this._submitHooks=[];for(const e of a)e.before&&e.before(this.encoder);this.queue.submit([this.encoder.finish()]),this.encoder=null;for(const e of a)e.after&&e.after()},onSubmit(a,e){this._submitHooks.push({before:a,after:e})},_pending:new Set,syncCompiles:[],renderPipeline(a){return this._async(a,"render")},computePipeline(a){return this._async(a,"compute")},_async(a,e){const t={pipeline:null,label:a.label,desc:a,kind:e,failed:!1},s=Promise.resolve().then(()=>t.pipeline?void 0:(e==="render"?this.device.createRenderPipelineAsync:this.device.createComputePipelineAsync).call(this.device,a).then(r=>{t.pipeline||(t.pipeline=r),t.desc=null},r=>{t.failed=!0,console.error(`WebGPU: pipeline "${a.label}" failed: ${r.message.split(`
`).slice(0,6).join(`
`)}`)})).finally(()=>this._pending.delete(s));return this._pending.add(s),t},ready(a){return a.pipeline||a.failed||(this.syncCompiles.push(a.label),a.pipeline=a.kind==="render"?this.device.createRenderPipeline(a.desc):this.device.createComputePipeline(a.desc)),a.pipeline},async pipelinesReady(){for(;this._pending.size;)await Promise.all([...this._pending])},computePass(a,e,t){const s=this.getEncoder().beginComputePass({label:a,timestampWrites:t});e(s),s.end()}},sn={r8unorm:{bytes:1,sample:"float"},rg8unorm:{bytes:2,sample:"float"},rgba8unorm:{bytes:4,sample:"float"},"rgba8unorm-srgb":{bytes:4,sample:"float"},bgra8unorm:{bytes:4,sample:"float"},r16float:{bytes:2,sample:"float"},rg16float:{bytes:4,sample:"float"},rgba16float:{bytes:8,sample:"float"},rg11b10ufloat:{bytes:4,sample:"float"},r32float:{bytes:4,sample:"unfilterable-float"},rg32float:{bytes:8,sample:"unfilterable-float"},rgba32float:{bytes:16,sample:"unfilterable-float"},r32uint:{bytes:4,sample:"uint"},rg32uint:{bytes:8,sample:"uint"},rgba32uint:{bytes:16,sample:"uint"},r32sint:{bytes:4,sample:"sint"},r8uint:{bytes:1,sample:"uint"},rgba8uint:{bytes:4,sample:"uint"},depth32float:{bytes:4,sample:"depth"},depth24plus:{bytes:4,sample:"depth"},"depth24plus-stencil8":{bytes:4,sample:"depth"}};function yr(a){const e=sn[a];if(!e)throw new Error("Unknown texture format "+a);return e}function rn(a){const e=yr(a).sample;return e==="unfilterable-float"&&z.hasFloat32Filterable?"float":e}let an=0;class W{constructor(e={}){this.id=an++,this.label=e.label||e.name||"texture"+this.id,this.width=Math.max(1,e.width||1),this.height=Math.max(1,e.height||1),this.depth=Math.max(1,e.depth||(e.dimension==="cube"?6:1)),this.dimension=e.dimension||"2d",this.format=e.format||"rgba8unorm",this.mipsOption=e.mips??!1,this.sampleCount=e.sampleCount||1;const t=e.usage||["sample","copyDst"];this.usageList=t,this.sampler=e.sampler||"linearClamp",this.gpu=null,this.version=0,this._views=new Map,this.isTexture=!0,e.data&&(this.pendingData=e.data)}get mipLevelCount(){return this.mipsOption===!0?Math.floor(Math.log2(Math.max(this.width,this.height,this.dimension==="3d"?this.depth:1)))+1:typeof this.mipsOption=="number"?this.mipsOption:1}get usage(){let e=0;for(const t of this.usageList)e|={sample:GPUTextureUsage.TEXTURE_BINDING,render:GPUTextureUsage.RENDER_ATTACHMENT,storage:GPUTextureUsage.STORAGE_BINDING,copySrc:GPUTextureUsage.COPY_SRC,copyDst:GPUTextureUsage.COPY_DST}[t];return this.mipLevelCount>1&&(e|=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING),e}get isDepth(){return this.format.startsWith("depth")}get sampleType(){return rn(this.format)}wgslType(e=this.defaultViewDimension){const t=this.sampleType;if(t==="depth")return{"2d":"texture_depth_2d","2d-array":"texture_depth_2d_array",cube:"texture_depth_cube"}[e];const s=t==="uint"?"u32":t==="sint"?"i32":"f32";return`texture_${e.replace("-","_")}<${s}>`}get defaultViewDimension(){return this.dimension}getGPU(){return this.gpu||this._create(),this.gpu}_create(){const e=this.dimension==="3d"?"3d":"2d";if(this.gpu=z.device.createTexture({label:this.label,size:{width:this.width,height:this.height,depthOrArrayLayers:this.depth},dimension:e,format:this.format,mipLevelCount:this.mipLevelCount,sampleCount:this.sampleCount,usage:this.usage}),this._views.clear(),this.version++,this.pendingData){const t=this.pendingData;this.pendingData=null,this.upload(t)}}view(e=null){const t=this.getGPU(),s=e?JSON.stringify(e):"";let i=this._views.get(s);return i||(i=t.createView({label:this.label+s,dimension:e?.dimension||this.defaultViewDimension,...e||{}}),this._views.set(s,i)),i}resize(e,t,s=this.depth){if(e=Math.max(1,Math.floor(e)),t=Math.max(1,Math.floor(t)),e===this.width&&t===this.height&&s===this.depth&&this.gpu)return!1;if(this.width=e,this.height=t,this.depth=s,this.gpu){const i=this.gpu;z.onSubmit(null,()=>i.destroy()),this.gpu=null}return this._create(),!0}upload(e,{mip:t=0,layer:s=0,layers:i=null,width:r=null,height:n=null,x:o=0,y:l=0}={}){if(!this.gpu){if(t===0&&s===0&&!r){this.pendingData=e,this.getGPU();return}this.getGPU()}const h=yr(this.format).bytes,c=r||Math.max(1,this.width>>t),u=n||Math.max(1,this.height>>t),d=i||(this.dimension==="3d"?Math.max(1,this.depth>>t):this.depth-s),m=e instanceof ArrayBuffer?e:e.buffer,v=e instanceof ArrayBuffer?0:e.byteOffset;z.queue.writeTexture({texture:this.gpu,mipLevel:t,origin:{x:o,y:l,z:s}},m,{offset:v,bytesPerRow:c*h,rowsPerImage:u},{width:c,height:u,depthOrArrayLayers:d})}destroy(){this.gpu&&this.gpu.destroy(),this.gpu=null,this.version++}}class j{constructor(e,t,{colors:s=["rgba16float"],depth:i=null,label:r="rt",mips:n=!1,usage:o=["sample","render","copySrc","copyDst"],depthUsage:l=["sample","render","copySrc","copyDst"],scale:h=1}={}){this.label=r,this.width=Math.max(1,e|0),this.height=Math.max(1,t|0),this.scale=h,this.textures=s.map((c,u)=>{const d=typeof c=="string"?{format:c}:c;return new W({label:`${r}.${d.name||u}`,width:this.width,height:this.height,format:d.format,mips:d.mips??n,usage:d.usage||o})}),this.depthTexture=i?new W({label:r+".depth",width:this.width,height:this.height,format:i,usage:l}):null}get texture(){return this.textures[0]}get formats(){return this.textures.map(e=>e.format)}setSize(e,t){if(e=Math.max(1,e|0),t=Math.max(1,t|0),e===this.width&&t===this.height)return!1;this.width=e,this.height=t;for(const s of this.textures)s.resize(e,t);return this.depthTexture&&this.depthTexture.resize(e,t),!0}}let nn=0;class $e{constructor({label:e,count:t,type:s="vec4f",stride:i=null,data:r=null,usage:n=[]}){if(this.id=nn++,this.label=e||"buffer"+this.id,this.count=t,this.type=s,this.stride=i||{f32:4,u32:4,i32:4,"atomic<u32>":4,"atomic<i32>":4,vec2f:8,vec2u:8,vec3f:16,vec4f:16,vec4u:16,vec4i:16,mat4x4f:64}[s],!this.stride)throw new Error(`StorageBuffer ${this.label}: pass a stride for ${s}`);this.byteLength=Math.max(16,t*this.stride),this.extraUsage=n,this.gpu=null,this.version=0,this.pendingData=r,this.isStorageBuffer=!0}getGPU(){if(!this.gpu){let e=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC;for(const t of this.extraUsage)e|={vertex:GPUBufferUsage.VERTEX,index:GPUBufferUsage.INDEX,indirect:GPUBufferUsage.INDIRECT,uniform:GPUBufferUsage.UNIFORM}[t];if(this.gpu=z.device.createBuffer({label:this.label,size:Math.ceil(this.byteLength/4)*4,usage:e}),this.version++,this.pendingData){const t=this.pendingData;this.pendingData=null,this.write(t)}}return this.gpu}write(e,t=0){if(!this.gpu){if(t===0){this.pendingData=e,this.getGPU();return}this.getGPU()}z.queue.writeBuffer(this.gpu,t,e.buffer||e,e.byteOffset||0,e.byteLength??void 0)}destroy(){this.gpu&&this.gpu.destroy(),this.gpu=null}}const yi=new Map;let Ut=null;function on(a){let e=yi.get(a);return e||(Ut||(Ut=z.device.createShaderModule({label:"mipmap",code:`
		struct VSOut { @builtin( position ) pos: vec4f, @location( 0 ) uv: vec2f };
		@vertex fn vs( @builtin( vertex_index ) i: u32 ) -> VSOut {
			let p = vec2f( f32( ( i << 1u ) & 2u ), f32( i & 2u ) );
			var o: VSOut;
			o.pos = vec4f( p * 2.0 - 1.0, 0.0, 1.0 );
			o.uv = vec2f( p.x, 1.0 - p.y );
			return o;
		}
		@group( 0 ) @binding( 0 ) var src: texture_2d<f32>;
		@group( 0 ) @binding( 1 ) var smp: sampler;
		@fragment fn fs( in: VSOut ) -> @location( 0 ) vec4f {
			return textureSampleLevel( src, smp, in.uv, 0.0 );
		}
	`})),e=z.device.createRenderPipeline({label:"mipmap "+a,layout:"auto",vertex:{module:Ut,entryPoint:"vs"},fragment:{module:Ut,entryPoint:"fs",targets:[{format:a}]},primitive:{topology:"triangle-list"}}),yi.set(a,e),e)}const wi=new WeakMap;function ln(a,e,t){let s=wi.get(a);if(s&&s.gpu===e)return s;const i=a.mipLevelCount,r=a.dimension==="3d"?1:a.depth,n=[],o=t.getBindGroupLayout(0);for(let l=0;l<r;l++)for(let h=1;h<i;h++){const c=e.createView({dimension:"2d",baseMipLevel:h-1,mipLevelCount:1,baseArrayLayer:l,arrayLayerCount:1}),u=e.createView({dimension:"2d",baseMipLevel:h,mipLevelCount:1,baseArrayLayer:l,arrayLayerCount:1}),d=z.device.createBindGroup({label:"mipmap "+a.label,layout:o,entries:[{binding:0,resource:c},{binding:1,resource:z.samplers.linearClamp}]});n.push({bg:d,desc:{label:"mipmap",colorAttachments:[{view:u,loadOp:"clear",storeOp:"store",clearValue:[0,0,0,0]}]}})}return s={gpu:e,pipeline:t,steps:n},wi.set(a,s),s}function wr(a,e=z.getEncoder()){if(a.mipLevelCount<2)return;const t=a.getGPU(),s=on(a.format),{steps:i}=ln(a,t,s);for(let r=0;r<i.length;r++){const n=e.beginRenderPass(i[r].desc);n.setPipeline(s),n.setBindGroup(0,i[r].bg),n.draw(3),n.end()}}const bi={f32:{size:4,align:4,n:1},i32:{size:4,align:4,n:1,int:!0},u32:{size:4,align:4,n:1,uint:!0},vec2f:{size:8,align:8,n:2},vec3f:{size:12,align:16,n:3},vec4f:{size:16,align:16,n:4},vec2i:{size:8,align:8,n:2,int:!0},vec4i:{size:16,align:16,n:4,int:!0},vec2u:{size:8,align:8,n:2,uint:!0},vec4u:{size:16,align:16,n:4,uint:!0},mat3x3f:{size:48,align:16,n:12,mat3:!0},mat4x4f:{size:64,align:16,n:16}};function hn(a){const e=/^(\w+)(?:\[(\d+)\])?$/.exec(a);if(!e||!bi[e[1]])throw new Error("Unsupported uniform type "+a);const t=bi[e[1]],s=e[2]?Number(e[2]):0;if(s&&t.align<16)throw new Error(`uniform array ${a}: element must be 16-byte aligned (use vec4f)`);return{name:e[1],base:t,count:s}}function Si(a,e,t,s,i,r){const{base:n}=i,o=n.int?t:n.uint?e:a;if(typeof r=="number"||typeof r=="boolean"){o[s]=Number(r);return}if(r!=null){if(r.isMatrix4||r.isMatrix3){const l=r.elements;if(n.mat3)if(l.length===9)for(let h=0;h<3;h++)for(let c=0;c<3;c++)a[s+h*4+c]=l[h*3+c];else for(let h=0;h<3;h++)for(let c=0;c<3;c++)a[s+h*4+c]=l[h*4+c];else for(let h=0;h<16;h++)a[s+h]=l[h];return}if(r.isColor){o[s]=r.r,o[s+1]=r.g,o[s+2]=r.b,n.n===4&&(o[s+3]=1);return}if(r.isVector2){o[s]=r.x,o[s+1]=r.y;return}if(r.isVector3){o[s]=r.x,o[s+1]=r.y,o[s+2]=r.z;return}if(r.isVector4||r.isQuaternion){o[s]=r.x,o[s+1]=r.y,o[s+2]=r.z,o[s+3]=r.w;return}if(ArrayBuffer.isView(r)||Array.isArray(r)){for(let l=0;l<Math.min(r.length,n.n);l++)o[s+l]=r[l];return}throw new Error("Cannot write uniform value "+r)}}let cn=0;class U{constructor(e,t,{label:s}={}){this.structName=e,this.label=s||e,this.id=cn++,this.layout={},this.fields={},this.order=[];let i=0,r=16;for(const o in t){const l=t[o],h=Array.isArray(l)?l[0]:l,c=Array.isArray(l)?l[1]:void 0,u=hn(h),d=u.base.align;r=Math.max(r,d),i=Math.ceil(i/d)*d;const m=u.count?Math.ceil(u.base.size/16)*16:u.base.size,v=u.count?m*u.count:u.base.size;this.layout[o]={offset:i,type:u,typeStr:h,stride:m,size:v},this.order.push(o),this.fields[o]={value:c!==void 0?c:un(u)},i+=v}this.byteLength=Math.max(16,Math.ceil(i/r)*r),this.data=new ArrayBuffer(this.byteLength),this.f32=new Float32Array(this.data),this.u32=new Uint32Array(this.data),this.i32=new Int32Array(this.data),this.buffer=null,this.version=0;const n=this;this.values=new Proxy({},{get:(o,l)=>n.fields[l]&&n.fields[l].value,set:(o,l,h)=>(n.set(l,h),!0)})}get wgsl(){let e=`struct ${this.structName} {
`;for(const t of this.order){const{type:s}=this.layout[t];e+=s.count?`	${t}: array<${s.name}, ${s.count}>,
`:`	${t}: ${s.name},
`}return e+`};
`}set(e,t){const s=this.fields[e];if(!s)throw new Error(`${this.structName}: no uniform ${e}`);s.value&&typeof s.value=="object"&&!Array.isArray(s.value)&&s.value.copy&&t&&t.constructor===s.value.constructor?s.value.copy(t):s.value=t}get(e){return this.fields[e].value}_pack(){this.onBeforePack&&this.onBeforePack(this);const{f32:e,u32:t,i32:s,fields:i}=this,r=this._plan||this._makePlan();for(let n=0;n<r.length;n++){const{name:o,o:l,type:h,stride:c,count:u,n:d}=r[n],m=i[o].value;if(typeof m=="number"){(h.base.int?s:h.base.uint?t:e)[l]=m;continue}if(u){if(!m)continue;if(typeof m[0]=="number"){const v=h.base.int?s:h.base.uint?t:e,p=Math.min(u,m.length/d);for(let f=0;f<p;f++){const x=l+f*c,w=f*d,y=Math.min(d,m.length-w);for(let g=0;g<y;g++)v[x+g]=m[w+g]}}else{const v=Math.min(u,m.length);for(let p=0;p<v;p++)Si(e,t,s,l+p*c,h,m[p])}}else Si(e,t,s,l,h,m)}}_makePlan(){return this._plan=this.order.map(e=>{const{offset:t,type:s,stride:i}=this.layout[e];return{name:e,o:t/4,type:s,stride:i/4,count:s.count,n:s.base.n}}),this._plan}getBuffer(){return this.buffer||(this.buffer=z.device.createBuffer({label:this.label,size:this.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this._last=new Uint32Array(this.byteLength/4),this._last.fill(4294967295)),this.buffer}upload(e){if(e!==void 0&&e===this._token&&this.buffer)return this.buffer;this._token=e;const t=this.getBuffer();this._pack();const s=this.u32,i=this._last;let r=!1;for(let n=0;n<s.length;n++)if(s[n]!==i[n]){r=!0;break}return r&&(i.set(s),z.queue.writeBuffer(t,0,this.data)),t}}function un(a){return a.count?null:a.base.n===1?0:new Array(a.base.n).fill(0)}let _i=0;const dn={color:["vec3f",null],opacity:["f32",1],emissive:["vec3f",null],roughness:["f32",1],metalness:["f32",0],alphaTest:["f32",0]};class Y{constructor(e={}){this.id=_i++,this.isMaterial=!0,this.name=e.name||"material"+this.id,this.version=0,this.modules=e.modules||[],this.varyings=e.varyings||{},this.attributes=e.attributes||{},this.vertex=e.vertex||"",this.surface=e.surface||"",this.output=e.output||"",this.shadow=e.shadow||"",this.defines={...e.defines||{}},this.lit=e.lit!==!1,this.side=e.side||"front",this.transparent=!!e.transparent,this.blending=e.blending||(this.transparent?"normal":"none"),this.depthWrite=e.depthWrite??!this.transparent,this.depthTest=e.depthTest??!0,this.depthCompare=e.depthCompare||null,this.depthBias=e.depthBias||0,this.depthBiasSlopeScale=e.depthBiasSlopeScale||0,this.colorWrite=e.colorWrite??!0,this.topology=e.topology||"triangle-list",this.visible=e.visible??!0,this.vertexColors=!!e.vertexColors,this.velocityWeight=e.velocityWeight??1,this.underwaterLighting=e.underwaterLighting||"full",this.appliesHillShadow=!!e.appliesHillShadow,this.localLightsCheap=!!e.localLightsCheap,this.receiveShadows=e.receiveShadows??!0,this.userData=e.userData||{};const t={...dn};for(const i in e.uniforms||{})t[i]=e.uniforms[i];this.uniformBlock=new U("MaterialParams"+this.id,t,{label:this.name}),this.uniforms=this.uniformBlock.fields;const s=this.uniforms;s.color.value=Wt(e.color,new ee(1,1,1)),s.emissive.value=Wt(e.emissive,new ee(0,0,0)),e.roughness!==void 0&&(s.roughness.value=e.roughness),e.metalness!==void 0&&(s.metalness.value=e.metalness),e.opacity!==void 0&&(s.opacity.value=e.opacity),e.alphaTest!==void 0&&(s.alphaTest.value=e.alphaTest),this.bindings={};for(const i in e.textures||{}){const r=e.textures[i];this.bindings[i]=r&&r.isTexture?{texture:r}:typeof r=="function"?{texture:r}:r}for(const i in e.storage||{}){const r=e.storage[i];this.bindings[i]=r&&r.isStorageBuffer?{storage:r,access:"read"}:r}Object.assign(this.bindings,e.bindings||{}),this._listeners=[]}get color(){return this.uniforms.color.value}set color(e){this.uniforms.color.value=Wt(e,this.uniforms.color.value)}get emissive(){return this.uniforms.emissive.value}set emissive(e){this.uniforms.emissive.value=Wt(e,this.uniforms.emissive.value)}get roughness(){return this.uniforms.roughness.value}set roughness(e){this.uniforms.roughness.value=e}get metalness(){return this.uniforms.metalness.value}set metalness(e){this.uniforms.metalness.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms.opacity.value=e}get alphaTest(){return this.uniforms.alphaTest.value}set alphaTest(e){e>0!=this.uniforms.alphaTest.value>0&&(this.needsUpdate=!0),this.uniforms.alphaTest.value=e}set(e,t){this.uniformBlock.set(e,t)}set needsUpdate(e){e&&this.version++}setDefine(e,t){this.defines[e]!==t&&(this.defines[e]=t,this.version++)}pipelineKey(){return`${this.id}.${this.version}.${this.side}.${this.transparent}.${typeof this.blending=="string"?this.blending:JSON.stringify(this.blending)}.${this.depthWrite}.${this.depthTest}.${this.depthCompare}.${this.colorWrite}.${this.topology}.${this.alphaTest>0}.${this.underwaterLighting}.${this.appliesHillShadow}.${this.localLightsCheap}.${this.receiveShadows}.${this.depthBias}.${this.depthBiasSlopeScale}.${this.vertexColors}`}allDefines(){return{...this.defines,UNDERWATER_LIGHTING:{none:0,lite:1,full:2}[this.underwaterLighting]??2,HILL_SHADOW_SELF:this.appliesHillShadow?1:0,LOCAL_LIGHTS_CHEAP:this.localLightsCheap?1:0,ALPHA_TEST:this.alphaTest>0?1:0,DOUBLE_SIDED:this.side==="double"?1:0,BACK_SIDE:this.side==="back"?1:0,TRANSPARENT:this.transparent?1:0,RECEIVE_SHADOWS:this.receiveShadows?1:0}}addEventListener(e,t){e==="dispose"&&this._listeners.push(t)}dispose(){for(const e of this._listeners)e({target:this})}clone(){const e=Object.create(Object.getPrototypeOf(this));return Object.assign(e,this),e.id=_i++,e.version=0,e.defines={...this.defines},e.bindings={...this.bindings},e.uniformBlock=new U("MaterialParams"+e.id,Object.fromEntries(this.uniformBlock.order.map(t=>[t,[this.uniformBlock.layout[t].typeStr,br(this.uniforms[t].value)]])),{label:e.name}),e.uniforms=e.uniformBlock.fields,e._listeners=[],e}}function br(a){return a&&typeof a=="object"&&a.clone?a.clone():Array.isArray(a)?a.map(br):a}function Wt(a,e){return a==null?e:a.isColor?e.copy?e.copy(a):a.clone():typeof a=="number"||typeof a=="string"?e.set(a):Array.isArray(a)?e.setRGB(a[0],a[1],a[2]):a.isVector3?e.setRGB(a.x,a.y,a.z):e}function Xt(a){if(!a||a==="none")return;if(typeof a=="object")return a;const e=(t,s,i="add")=>({srcFactor:t,dstFactor:s,operation:i});switch(a){case"normal":return{color:e("src-alpha","one-minus-src-alpha"),alpha:e("one","one-minus-src-alpha")};case"premultiplied":return{color:e("one","one-minus-src-alpha"),alpha:e("one","one-minus-src-alpha")};case"additive":return{color:e("src-alpha","one"),alpha:e("zero","one")};case"add":return{color:e("one","one"),alpha:e("one","one")};case"multiply":return{color:e("dst","zero"),alpha:e("zero","one")};case"min":return{color:e("one","one","min"),alpha:e("one","one","min")};case"max":return{color:e("one","one","max"),alpha:e("one","one","max")}}throw new Error("unknown blending "+a)}function fn(a){const e=a.geometry,t=Array.isArray(a.material)?a.material:[a.material],s=e.index?.count??e.getAttribute("position").count,i=e.groups.length?e.groups:[{start:0,count:s,materialIndex:0}],r=[];for(const n of i){const o=Math.max(0,n.start,e.drawRange.start),l=Math.min(s,n.start+n.count,e.drawRange.start+e.drawRange.count);if(l<=o)continue;const h=t[n.materialIndex??0];if(!h)continue;const c=[];for(let d=o;d<l;d++)c.push(e.index?e.index.getX(d):d);const u=e.clone();if(u.clearGroups(),u.setIndex(c),u.setDrawRange(0,c.length),u.applyMatrix4(a.matrixWorld),a.matrixWorld.determinant()<0){for(let d=0;d+2<c.length;d+=3)[c[d+1],c[d+2]]=[c[d+2],c[d+1]];u.setIndex(c)}r.push({geometry:u,material:h})}return r}function pn(a){const e=a.image,t=e?.width??e?.videoWidth,s=e?.height??e?.videoHeight;if(!t||!s)throw new Error("Base-color image has no decoded pixels.");if(t>8192||s>8192)throw new Error("Base-color image exceeds the native preview limit.");const i=new W({label:"builder-asset-base-color",width:t,height:s,format:"rgba8unorm-srgb",mips:!0,usage:["sample","copyDst"]});try{return z.queue.copyExternalImageToTexture({source:e,flipY:!!a.flipY},{texture:i.getGPU(),premultipliedAlpha:!1},[t,s]),wr(i),i}catch(r){throw i.destroy(),r}}const Mi=a=>a===1e3?"repeat":a===1002?"mirror-repeat":"clamp-to-edge";function Sr(a,e,t){const s=new Fe,i={primitives:[],warnings:[]},r=new Map,n=new Map,o=[];a.scene.updateMatrixWorld(!0);const l=h=>{if(n.has(h))return n.get(h);const c=a.materialIndices.get(h)??h.userData.gltfMaterialIndex??-1,u=e.materialOverrides?.find(g=>g.materialIndex===c);let d=new ee(h.color?.r??1,h.color?.g??1,h.color?.b??1);u?.color!==void 0&&(d=new ee(u.color));const m=u?.roughness??h.roughness??1,v=u?.metalness??h.metalness??0;let p=null,f={},x={},w="";if(h.map)try{p=r.get(h.map),p||(p=pn(h.map),r.set(h.map,p),o.push(p));const g=h.map;g.matrixAutoUpdate&&g.updateMatrix();const b=g.matrix.elements;x={assetUVRow0:["vec3f",[b[0],b[3],b[6]]],assetUVRow1:["vec3f",[b[1],b[4],b[7]]]},f={assetAlbedo:{texture:p},assetSampler:{sampler:z.device.createSampler({addressModeU:Mi(g.wrapS),addressModeV:Mi(g.wrapT),minFilter:"linear",magFilter:"linear",mipmapFilter:"linear",maxAnisotropy:4})}},w=`
  let assetUV=vec2f(dot(mat.assetUVRow0,vec3f(in.uv,1.0)),dot(mat.assetUVRow1,vec3f(in.uv,1.0)));
  let assetTexel=textureSample(assetAlbedo,assetSampler,assetUV);
  s.albedo *= assetTexel.rgb;
  s.alpha *= assetTexel.a;
`}catch(g){i.warnings.push(`Material ${c}: ${g.message}`)}(h.normalMap||h.roughnessMap||h.metalnessMap||h.aoMap||h.emissiveMap)&&i.warnings.push(`Material ${c}: normal/ORM/AO/emissive textures are omitted.`);const y=new Y({name:`builder-asset-slot-${c}`,color:d,roughness:m,metalness:v,opacity:h.opacity??1,alphaTest:h.alphaTest??0,transparent:h.transparent??!1,depthWrite:h.depthWrite??!0,side:h.side===2?"double":h.side===1?"back":"front",lit:!h.isMeshBasicMaterial,vertexColors:h.vertexColors??!1,emissive:new ee(h.emissive?.r??0,h.emissive?.g??0,h.emissive?.b??0).multiplyScalar(h.emissiveIntensity??1),bindings:f,uniforms:x,surface:w});return n.set(h,{material:y,slot:c,textured:!!p}),n.get(h)};try{return a.scene.traverse(h=>{if(!(!h.isMesh||!h.visible)){(h.isSkinnedMesh||h.morphTargetInfluences?.length)&&i.warnings.push("Skinning/morph animation is shown as static geometry.");for(const c of fn(h)){if(c.material.map?.channel){const f=c.geometry.getAttribute(`uv${c.material.map.channel}`);f?c.geometry.setAttribute("uv",f):i.warnings.push(`Material ${c.material.userData.gltfMaterialIndex??-1}: requested UV channel is missing.`)}const u=l(c.material),d=t(c.geometry);c.geometry.dispose();const m=new ce(d,u.material);m.castShadow=!0,m.receiveShadow=!0,u.material.transparent&&m.layers.set(2),s.add(m);const v=d.getAttribute("position"),p=d.index?.getX(0)??0;i.primitives.push({node:h.name,materialIndex:u.slot,indices:d.index?.count??0,firstPosition:[v.getX(p),v.getY(p),v.getZ(p)],color:[u.material.color.r,u.material.color.g,u.material.color.b],roughness:u.material.roughness,metalness:u.material.metalness,textured:u.textured})}}}),s.userData.assetDiagnostics=i,s.userData.disposeAssetTextures=()=>{const h=()=>o.forEach(c=>c.destroy());z.encoder?z.onSubmit(null,h):h()},{group:s,diagnostics:i}}catch(h){throw s.traverse(c=>c.geometry?.dispose()),n.forEach(c=>c.material.dispose()),o.forEach(c=>c.destroy()),h}}async function mn(a){const e=await Jr(a);if(!e)return{textures:{},uniforms:{},surface:"",dispose(){},diagnostics:{tiles:0}};const t=new W({label:"landscape-color",width:e.size,height:e.size,format:"rgba8unorm",data:e.data}),s=new W({label:"landscape-rough",width:e.size,height:e.size,format:"rgba8unorm",data:e.rough}),i=new W({label:"landscape-index",width:ea,height:1,format:"rgba32float",data:e.index});return{textures:{landscapeColor:t,landscapeRough:s,landscapeIndex:i},uniforms:{landscapeSize:["vec4f",[e.size,e.side,a.terrain.width,a.terrain.depth]]},surface:`
 let lc=(in.P.xz+mat.landscapeSize.zw*0.5)/16.0;let tile=floor(lc);
 var hash=i32(((i32(tile.x)*17+i32(tile.y)*31)%4096+4096)%4096);var slot=0.0;
 for(var probe=0;probe<256;probe++){let entry=textureLoad(landscapeIndex,vec2i(hash,0),0);if(entry.z<0.5){break;}if(all(abs(entry.xy-tile)<vec2f(0.1))){slot=entry.z;break;}hash=(hash+1)%4096;}
 let n=max(0.0,slot-1.0);let atlasSlot=vec2f(n%mat.landscapeSize.y,floor(n/mat.landscapeSize.y));
 let luv=(atlasSlot*66.0+1.0+fract(lc)*64.0)/mat.landscapeSize.x;
 let land=textureSampleLevel(landscapeColor,smpLinearClamp,luv,0.0);let landR=textureSampleLevel(landscapeRough,smpLinearClamp,luv,0.0);
 if(slot>0.5){s.albedo=mix(s.albedo,land.rgb,land.a);s.roughness=mix(s.roughness,landR.r,landR.a);}
`,diagnostics:{tiles:e.tiles,size:e.size},dispose(){const r=()=>{t.destroy(),s.destroy(),i.destroy()};z.encoder?z.onSubmit(null,r):r()}}}async function vn(a,e){const t=new Fe,s=new C,i=new oe,r=new S,n=new Map,o=[];let l=0,h=0;try{for(const v of Zs(a).values()){const p=v[0];if(p.assetRef)continue;l+=v.length;const f=[p.kind,p.treeSpecies,p.seed%4].join("/");let x=n.get(f);x||(x=jr(p.kind,p.treeSpecies,p.seed%4).map(w=>{const y=e(w.geometry);return w.geometry.dispose(),{geometry:y,semantic:w.semantic,material:new Y({name:"landscape-"+p.kind,color:w.color,roughness:.9,side:"double"})}}),n.set(f,x));for(const w of x){const y=new Lt(w.geometry,w.material,v.length);v.forEach((g,b)=>{i.setFromEuler(new Me(...g.rotation)),r.fromArray(g.scale),s.compose(new S(...g.position),i,r),y.setMatrixAt(b,s),y.setColorAt(b,Xr(g,w.semantic))}),y.instanceMatrix.needsUpdate=!0,y.instanceColor&&(y.instanceColor.needsUpdate=!0),y.computeBoundingSphere(),y.castShadow=p.kind!=="grass",t.add(y),h++}}const c=Zs(a);for(const v of new Set([...c.values()].map(p=>p[0].assetRef).filter(Boolean))){const p=a.assets.find(w=>w.id===v);if(!p)throw new Error("Landscape GLB asset missing: "+v);const f=await ir(await(await fetch(p.dataUrl)).arrayBuffer());let x;try{x=Sr(f,{materialOverrides:[]},e),o.push(x.group)}finally{rr(f.scene)}for(const w of c.values())if(w[0].assetRef===v){l+=w.length;for(const y of x.group.children){const g=new Lt(y.geometry,y.material,w.length);w.forEach((b,M)=>{i.setFromEuler(new Me(...b.rotation)),s.compose(new S(...b.position),i,new S(...b.scale)),g.setMatrixAt(M,s),g.setColorAt(M,Yr(b))}),g.instanceMatrix.needsUpdate=!0,g.instanceColor&&(g.instanceColor.needsUpdate=!0),g.computeBoundingSphere(),g.castShadow=!0,y.material.transparent&&g.layers.set(2),t.add(g),h++}}}t.userData.disposeAssetTextures=()=>o.forEach(v=>v.userData.disposeAssetTextures?.());const u=Kr(a),d=e(u),m=new ce(d,new Y({name:"landscape-water",color:"#4f9fba",roughness:.23,metalness:.25,transparent:!0,opacity:.72,side:"double"}));return m.layers.set(2),t.add(m),t.userData.updateLandscape=v=>{Zr(a,u,v);const p=u.getAttribute("position"),f=d.getAttribute("position");f.array.set(p.array),f.needsUpdate=!0},t.userData.disposeLandscape=()=>u.dispose(),t.userData.landscapeStats={instances:l,draws:h,colliders:Qr(a).shapes.length,sharedVariants:n.size,waterVertices:u.getAttribute("position").count},t}catch(c){const u=new Set,d=new Set;throw t.traverse(m=>{m.geometry&&u.add(m.geometry),m.material&&d.add(m.material)}),u.forEach(m=>m.dispose()),d.forEach(m=>m.dispose()),o.forEach(m=>m.userData.disposeAssetTextures?.()),c}}const _r=[["smpLinearRepeat","linearRepeat","filtering"],["smpLinearClamp","linearClamp","filtering"],["smpLinearMirror","linearMirror","filtering"],["smpAnisoRepeat","anisoRepeat","filtering"],["smpAnisoClamp","anisoClamp","filtering"],["smpAniso4Repeat","aniso4Repeat","filtering"],["smpNearestClamp","nearestClamp","non-filtering"],["smpNearestRepeat","nearestRepeat","non-filtering"],["smpShadow","shadow","comparison"]];let xn=0;class N{constructor({name:e,deps:t=[],code:s="",bindings:i={},uniforms:r=null,uniformName:n=null}){this.id=xn++,this.name=e||"module"+this.id,this.deps=t.filter(Boolean),this.code=s,this.bindings={...i},r&&(this.bindings[n||gn(r.structName)]={uniform:r}),this.isShaderModule=!0}}function gn(a){return a[0].toLowerCase()+a.slice(1)}function Rs(a){const e=[],t=new Set,s=i=>{if(!(!i||t.has(i))){t.add(i);for(const r of i.deps)s(r);e.push(i)}};for(const i of a)s(i);return e}function zi(a,e={}){const t=a.split(`
`),s=[],i=[],r=()=>i.length===0||i[i.length-1].active,n=o=>{o=o.trim();let l;if(l=/^!\s*(\w+)$/.exec(o))return!Pi(e[l[1]]);if(l=/^(\w+)\s*(==|!=|>=|<=|>|<)\s*([\w.'"-]+)$/.exec(o)){const h=e[l[1]];let c=l[3].replace(/^['"]|['"]$/g,"");switch(!isNaN(Number(c))&&typeof h=="number"&&(c=Number(c)),l[2]){case"==":return h==c;case"!=":return h!=c;case">=":return h>=c;case"<=":return h<=c;case">":return h>c;case"<":return h<c}}return/\|\|/.test(o)?o.split("||").some(h=>n(h)):/&&/.test(o)?o.split("&&").every(h=>n(h)):Pi(e[o])};for(const o of t){const l=o.trim();let h;if(h=/^#(if|ifdef|ifndef)\s+(.*)$/.exec(l)){const c=r();let u;h[1]==="ifdef"?u=e[h[2].trim()]!==void 0:h[1]==="ifndef"?u=e[h[2].trim()]===void 0:u=n(h[2]),i.push({active:c&&u,taken:u,parent:c});continue}if(h=/^#elif\s+(.*)$/.exec(l)){const c=i[i.length-1],u=!c.taken&&n(h[1]);c.active=c.parent&&u,c.taken=c.taken||u;continue}if(l==="#else"){const c=i[i.length-1];c.active=c.parent&&!c.taken,c.taken=!0;continue}if(l==="#endif"){i.pop();continue}r()&&s.push(o)}if(i.length)throw new Error("preprocess: unterminated #if");return s.join(`
`)}function Pi(a){return a!=null&&a!==!1&&a!==0&&a!=="0"}function pe(a){return typeof a=="function"?a():a}function yn(a,e,t){const s=GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,i=t==="compute"?GPUShaderStage.COMPUTE:s;if(e.uniform){const r=e.uniform;return{layout:{visibility:i,buffer:{type:"uniform"}},decl:`var<uniform> ${a}: ${r.structName};`,struct:r}}if(e.uniformBuffer)return{layout:{visibility:i,buffer:{type:"uniform"}},decl:`var<uniform> ${a}: ${e.wgslType};`};if(e.storage){const r=pe(e.storage),n=e.access||"read",o=e.wgslType||`array<${e.type||r.type}>`;return{layout:{visibility:t==="compute"?i:n==="read"?s:GPUShaderStage.FRAGMENT,buffer:{type:n==="read"?"read-only-storage":"storage"}},decl:`var<storage, ${n==="read"?"read":"read_write"}> ${a}: ${o};`}}if(e.storageTexture){const r=pe(e.storageTexture),n=e.access||"write",o=e.viewDimension||e.view?.dimension||r.defaultViewDimension;return{layout:{visibility:t==="compute"?i:GPUShaderStage.FRAGMENT,storageTexture:{access:n==="write"?"write-only":n==="read"?"read-only":"read-write",format:r.format,viewDimension:o}},decl:`var ${a}: texture_storage_${o.replace("-","_")}<${r.format}, ${n}>;`}}if(e.texture){const r=pe(e.texture),n=e.viewDimension||e.view?.dimension||r.defaultViewDimension;let o=e.sampleType||r.sampleType,l=e.wgslType||r.wgslType(n);return e.sampleType==="unfilterable-float"&&r.isDepth&&(l=`texture_${n.replace("-","_")}<f32>`),{layout:{visibility:i,texture:{sampleType:o,viewDimension:n,multisampled:r.sampleCount>1}},decl:`var ${a}: ${l};`}}if(e.sampler)return{layout:{visibility:i,sampler:{type:e.samplerType||"filtering"}},decl:`var ${a}: ${e.samplerType==="comparison"?"sampler_comparison":"sampler"};`};throw new Error(`binding ${a}: unknown spec`)}function wn(a){if(a.uniform)return{buffer:a.uniform.getBuffer()};if(a.uniformBuffer)return{buffer:pe(a.uniformBuffer)};if(a.storage){const e=pe(a.storage),t=e.getGPU?e.getGPU():e;return a.offset!==void 0?{buffer:t,offset:a.offset,size:a.size}:{buffer:t}}if(a.storageTexture)return pe(a.storageTexture).view(a.view||{dimension:a.viewDimension||pe(a.storageTexture).defaultViewDimension,mipLevelCount:1,baseMipLevel:a.mip||0});if(a.texture){const e=pe(a.texture);return a.view||a.viewDimension?e.view({...a.view||{},dimension:a.viewDimension||a.view.dimension}):e.view()}if(a.sampler)return typeof a.sampler=="string"?z.samplers[a.sampler]:a.sampler;throw new Error("unknown binding")}const Mr=0,zr=1,Pr=2,Tr=3,bn=4;function Sn(a){return a.uniform?Mr:a.uniformBuffer?zr:a.storage?Pr:a.storageTexture||a.texture?Tr:bn}const _n=4,Ti=new Map;function Ar(a,e){const t=JSON.stringify(a);let s=Ti.get(t);return s||(s=z.device.createBindGroupLayout({label:e,entries:a}),Ti.set(t,s)),s}class Vs{constructor(e,t,s="bindings",i=null,r=null){if(this.label=s,this.stage=t,this.names=Object.keys(e),this.specs=e,this.described=this.names.map(o=>yn(o,e[o],t)),i)for(let o=0;o<this.names.length;o++){const l=this.described[o].layout,h=i[this.names[o]];h==="fragment"&&l.visibility&GPUShaderStage.FRAGMENT&&(l.visibility=GPUShaderStage.FRAGMENT),h==="vertex"&&l.visibility&GPUShaderStage.VERTEX&&(l.visibility=GPUShaderStage.VERTEX)}if(r)for(let o=0;o<this.names.length;o++){const l=this.described[o];r.has(this.names[o])&&(l.layout.buffer={type:"read-only-storage"},l.decl=l.decl.replace(/^var<uniform>/,"var<storage, read>"))}this.layout=Ar(this.described.map((o,l)=>({binding:l,...o.layout})),s),this.group=null;const n=this.names.length;this._specs=this.names.map(o=>e[o]),this._kinds=this._specs.map(Sn),this._blocks=this._specs.filter(o=>o.uniform).map(o=>o.uniform),this._objs=new Array(n).fill(null),this._vers=new Array(n).fill(0),this._entry=null,this._cache=[],this._token=null}declarations(e){return this.described.map((t,s)=>`@group(${e}) @binding(${s}) ${t.decl}`).join(`
`)}structs(){const e=[];for(const t of this.described)t.struct&&!e.includes(t.struct)&&e.push(t.struct);return e}getBindGroup(e){if(e!==void 0&&e===this._token&&this.group)return this.group;this._token=e;const t=this._specs,s=this._kinds,i=this._objs,r=this._vers,n=t.length;for(let c=0;c<n;c++){const u=t[c];let d=null,m=0;switch(s[c]){case Mr:d=u.uniform;break;case zr:d=pe(u.uniformBuffer);break;case Pr:d=pe(u.storage),d.getGPU&&(d.getGPU(),m=d.version);break;case Tr:d=pe(u.storageTexture||u.texture),d&&d.getGPU&&(d.getGPU(),m=d.version);break;default:d=u.sampler}i[c]=d,r[c]=m}const o=this._blocks;for(let c=0;c<o.length;c++)o[c].upload(e);if(this._entry&&this._matches(this._entry))return this.group;const l=this._cache;for(let c=0;c<l.length;c++){const u=l[c];if(!(u===this._entry||!this._matches(u)))return this._entry=u,this.group=u.group,this.group}const h=new Array(n);for(let c=0;c<n;c++)h[c]={binding:c,resource:wn(t[c])};return this.group=z.device.createBindGroup({label:this.label,layout:this.layout,entries:h}),this._entry={objs:i.slice(),vers:r.slice(),group:this.group},l.unshift(this._entry),l.length>_n&&l.pop(),this.group}_matches(e){const t=this._objs,s=this._vers,i=e.objs,r=e.vers;for(let n=0;n<t.length;n++)if(t[n]!==i[n]||s[n]!==r[n])return!1;return!0}}let Gs=null,xt=null;function Mn(a){Gs=a,xt=null}function kr(a){if(xt||(xt={}),!xt[a]){const e={frame:{uniform:Gs}};for(const[t,s,i]of _r)e[t]={sampler:s,samplerType:i};xt[a]=new Vs(e,a,"group0-"+a)}return xt[a]}const Ai=new WeakMap;function Cr(a,e="render"){if(a===Gs)return kr(e);let t=Ai.get(a);if(t||Ai.set(a,t={}),!t[e]){const s={frame:{uniform:a}};for(const[i,r,n]of _r)s[i]={sampler:r,samplerType:n};t[e]=new Vs(s,e,"group0-"+a.label)}return t[e]}function Hs({modules:a=[],bindings:e={},code:t="",defines:s={},stage:i="render",label:r="shader",header:n=""}){const o=Rs(a),l={};for(const p of o)for(const f in p.bindings){if(l[f]&&l[f]!==p.bindings[f]&&!zn(l[f],p.bindings[f]))throw new Error(`${r}: binding ${f} declared twice (${p.name})`);l[f]=p.bindings[f]}for(const p in e)l[p]=e[p];let h=null,c=null;if(i==="render"&&/@vertex\s+fn\s+vs\b/.test(t)){let p="";for(const _ of o)p+=_.code+`
`;const f=zi(p+t,s),x=ki(f,"vs"),w=/@fragment\s+fn\s+fs\b/.test(f)?ki(f,"fs"):null;h={};for(const _ in l)!x.has(_)&&(!w||w.has(_))?h[_]="fragment":w&&!w.has(_)&&x.has(_)&&(h[_]="vertex");c=new Set;const y=z.limits||{},g=(y.maxUniformBuffersPerShaderStage||12)-2,b={vertex:y.maxStorageBuffersInVertexStage??4,fragment:y.maxStorageBuffersInFragmentStage??y.maxStorageBuffersPerShaderStage??8},M=(_,P)=>!h[_]||h[_]===P;for(const _ of["fragment","vertex"]){const P=Object.keys(l).filter(k=>l[k].uniform&&M(k,_)&&!c.has(k));let T=Object.keys(l).filter(k=>(l[k].storage||c.has(k))&&M(k,_)).length;P.sort((k,F)=>(h[k]===_?0:1)-(h[F]===_?0:1));let A=P.length;for(const k of P){if(A<=g||T>=b[_])break;c.add(k),T++,A--}}}const u=new Vs(l,i,r+".g1",h,c),d=kr(i),m=[...new Set([...d.structs(),...u.structs()])];let v="";z.features.has("shader-f16")&&s.F16&&(v+=`enable f16;
`),s.CLIP_DISTANCES&&(v+=`enable clip_distances;
`),/diagnostic\s*\(\s*off\s*,\s*derivative_uniformity/.test(n)||(v+=`diagnostic( off, derivative_uniformity );
`),v+=n,v+=m.map(p=>p.wgsl).join(`
`)+`
`,v+=d.declarations(0)+`
`,v+=u.declarations(1)+`
`;for(const p of o)v+=`// ---- ${p.name}
${p.code}
`;return v+=t,{code:zi(v,s),bindings:u,group0:d,modules:o}}function ki(a,e){const t=new Map,s=/\bfn\s+([A-Za-z_]\w*)\s*\(/g;let i;for(;i=s.exec(a);){const l=a.indexOf("{",i.index);if(l<0)break;let h=0,c=l;for(;c<a.length;c++){const d=a[c];if(d==="{")h++;else if(d==="}"&&--h===0)break}(!/@(vertex|fragment|compute)[^;{}]*$/.test(a.slice(Math.max(0,i.index-80),i.index))||i[1]===e)&&t.set(i[1],a.slice(i.index,c+1)),s.lastIndex=c+1}const r=new Set,n=[e],o=new Set;for(;n.length;){const l=n.pop();if(!(o.has(l)||!t.has(l))){o.add(l);for(const h of t.get(l).match(/[A-Za-z_]\w*/g)||[])r.add(h),t.has(h)&&!o.has(h)&&n.push(h)}}return r}function zn(a,e){const t=Object.keys(a),s=Object.keys(e);return t.length===s.length&&t.every(i=>a[i]===e[i])}const Ci=new Map;function $s(a,e){let t=Ci.get(a);return t||(t=z.device.createShaderModule({label:e,code:a}),Ci.set(a,t),t.getCompilationInfo&&t.getCompilationInfo().then(s=>{const i=s.messages.filter(n=>n.type==="error");if(!i.length)return;const r=a.split(`
`);for(const n of i){const o=Math.max(0,n.lineNum-4),l=Math.min(r.length,n.lineNum+2),h=r.slice(o,l).map((c,u)=>`${o+u+1}${o+u+1===n.lineNum?">":" "} ${c}`).join(`
`);console.error(`WGSL error in ${e} (${n.lineNum}:${n.linePos}): ${n.message}
${h}`)}}),t)}const B=new N({name:"common",code:`
const PI: f32 = 3.141592653589793;
const TWO_PI: f32 = 6.283185307179586;
const INV_PI: f32 = 0.3183098861837907;
const EPS: f32 = 1e-5;

fn sat( x: f32 ) -> f32 { return clamp( x, 0.0, 1.0 ); }
fn sat3( x: vec3f ) -> vec3f { return clamp( x, vec3f( 0.0 ), vec3f( 1.0 ) ); }
fn pow2( x: f32 ) -> f32 { return x * x; }
fn pow4( x: f32 ) -> f32 { let y = x * x; return y * y; }
fn pow5( x: f32 ) -> f32 { let y = x * x; return y * y * x; }
fn luminance( c: vec3f ) -> f32 { return dot( c, vec3f( 0.2126, 0.7152, 0.0722 ) ); }
fn remap( x: f32, a: f32, b: f32, c: f32, d: f32 ) -> f32 { return c + ( x - a ) * ( d - c ) / ( b - a ); }
fn remapClamp( x: f32, a: f32, b: f32, c: f32, d: f32 ) -> f32 { return mix( c, d, sat( ( x - a ) / ( b - a ) ) ); }
fn rotate2( v: vec2f, a: f32 ) -> vec2f { let c = cos( a ); let s = sin( a ); return vec2f( c * v.x - s * v.y, s * v.x + c * v.y ); }

// ---- depth (reversed-Z: 1 at the near plane, 0 at far / infinity)

// positive view-space distance along the view axis from a depth-buffer value
fn viewDepth( d: f32 ) -> f32 {
	let v = frame.invProj * vec4f( 0.0, 0.0, d, 1.0 );
	return - v.z / v.w;
}

// uv (0..1, y down) + depth -> world / view position
fn ndcFromUv( uv: vec2f, d: f32 ) -> vec4f { return vec4f( uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, d, 1.0 ); }
fn worldFromDepth( uv: vec2f, d: f32 ) -> vec3f {
	let p = frame.invViewProj * ndcFromUv( uv, d );
	return p.xyz / p.w;
}
fn viewFromDepth( uv: vec2f, d: f32 ) -> vec3f {
	let p = frame.invProj * ndcFromUv( uv, d );
	return p.xyz / p.w;
}
// world direction of the camera ray through uv
fn viewRay( uv: vec2f ) -> vec3f {
	let p = frame.invViewProj * ndcFromUv( uv, 0.5 );
	return normalize( p.xyz / p.w - frame.cameraPos );
}
// world position -> uv (y down) and depth
fn projectToUv( P: vec3f ) -> vec3f {
	let c = frame.viewProjNoJitter * vec4f( P, 1.0 );
	let n = c.xyz / c.w;
	return vec3f( n.x * 0.5 + 0.5, 0.5 - n.y * 0.5, n.z );
}
fn isSky( d: f32 ) -> bool { return d <= 0.0; }

// ---- hashes

fn pcg( v: u32 ) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ( ( state >> ( ( state >> 28u ) + 4u ) ) ^ state ) * 277803737u;
	return ( word >> 22u ) ^ word;
}
fn pcg3( v0: vec3u ) -> vec3u {
	var v = v0 * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> vec3u( 16u );
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	return v;
}
fn u32ToUnit( h: u32 ) -> f32 { return f32( h >> 8u ) * ( 1.0 / 16777216.0 ) + ( 0.5 / 16777216.0 ); }
// float hash in [0, 1) of a float seed (TSL hash())
fn hash11( p: f32 ) -> f32 { return u32ToUnit( pcg( bitcast<u32>( p ) ^ 0x9e3779b9u ) ); }
fn hash21( p: vec2f ) -> f32 { return u32ToUnit( pcg( bitcast<u32>( p.x ) ^ pcg( bitcast<u32>( p.y ) ) ) ); }
fn hash31( p: vec3f ) -> f32 { return u32ToUnit( pcg3( bitcast<vec3u>( p ) ).x ); }
fn hash22( p: vec2f ) -> vec2f {
	let h = pcg3( vec3u( bitcast<vec2u>( p ), 0x51ed270bu ) );
	return vec2f( u32ToUnit( h.x ), u32ToUnit( h.y ) );
}
fn hash33( p: vec3f ) -> vec3f {
	let h = pcg3( bitcast<vec3u>( p ) );
	return vec3f( u32ToUnit( h.x ), u32ToUnit( h.y ), u32ToUnit( h.z ) );
}
fn hashU( a: u32, b: u32 ) -> f32 { return u32ToUnit( pcg( a ^ pcg( b ) ) ); }
fn ihash3( p: vec3i ) -> vec3u { return pcg3( bitcast<vec3u>( p ) ); }

// Jimenez interleaved gradient noise at a pixel (0..1)
fn interleavedGradientNoise( px: vec2f ) -> f32 { return fract( 52.9829189 * fract( dot( px, vec2f( 0.06711056, 0.00583715 ) ) ) ); }

// i-th of n points of a Vogel disc (unit radius), rotated by phi
fn vogelDiskSample( i: i32, n: i32, phi: f32 ) -> vec2f {
	let r = sqrt( ( f32( i ) + 0.5 ) / f32( n ) );
	let theta = f32( i ) * 2.399963229728653 + phi;
	return vec2f( cos( theta ), sin( theta ) ) * r;
}

// ---- gradient noise: MaterialX (three's MaterialXNoise.js) bit for bit — the same Jenkins
// lookup3 hash, gradients, quintic fade and gradient scales (0.6616 in 2D, 0.982 in 3D), so the
// procedural patterns land where they did in the three.js version.

fn _mxRotl( x: u32, k: u32 ) -> u32 { return ( x << k ) | ( x >> ( 32u - k ) ); }
fn _mxFinal( a0: u32, b0: u32, c0: u32 ) -> u32 {
	var a = a0; var b = b0; var c = c0;
	c ^= b; c -= _mxRotl( b, 14u );
	a ^= c; a -= _mxRotl( c, 11u );
	b ^= a; b -= _mxRotl( a, 25u );
	c ^= b; c -= _mxRotl( b, 16u );
	a ^= c; a -= _mxRotl( c, 4u );
	b ^= a; b -= _mxRotl( a, 14u );
	c ^= b; c -= _mxRotl( b, 24u );
	return c;
}
fn mxHash2( x: i32, y: i32 ) -> u32 { let s = 0xdeadbeefu + ( 2u << 2u ) + 13u; return _mxFinal( s + u32( x ), s + u32( y ), s ); }
fn mxHash3( x: i32, y: i32, z: i32 ) -> u32 { let s = 0xdeadbeefu + ( 3u << 2u ) + 13u; return _mxFinal( s + u32( x ), s + u32( y ), s + u32( z ) ); }
fn _mxGrad2( hash: u32, x: f32, y: f32 ) -> f32 {
	let h = hash & 7u;
	let u = select( y, x, h < 4u );
	let v = 2.0 * select( x, y, h < 4u );
	return select( u, - u, ( h & 1u ) != 0u ) + select( v, - v, ( h & 2u ) != 0u );
}
fn _gradDot3( h: u32, p: vec3f ) -> f32 {
	let hh = h & 15u;
	let u = select( p.y, p.x, hh < 8u );
	let v = select( select( p.z, p.x, hh == 12u || hh == 14u ), p.y, hh < 4u );
	return select( u, - u, ( hh & 1u ) != 0u ) + select( v, - v, ( hh & 2u ) != 0u );
}
fn _fade3( t: vec3f ) -> vec3f { return t * t * t * ( t * ( t * 6.0 - 15.0 ) + 10.0 ); }
fn _h3( i: vec3i ) -> u32 { return mxHash3( i.x, i.y, i.z ); }

fn perlin3( p: vec3f ) -> f32 {
	let fl = floor( p );
	let i = vec3i( fl );
	let f = p - fl;
	let u = _fade3( f );
	let n000 = _gradDot3( _h3( i ), f );
	let n100 = _gradDot3( _h3( i + vec3i( 1, 0, 0 ) ), f - vec3f( 1.0, 0.0, 0.0 ) );
	let n010 = _gradDot3( _h3( i + vec3i( 0, 1, 0 ) ), f - vec3f( 0.0, 1.0, 0.0 ) );
	let n110 = _gradDot3( _h3( i + vec3i( 1, 1, 0 ) ), f - vec3f( 1.0, 1.0, 0.0 ) );
	let n001 = _gradDot3( _h3( i + vec3i( 0, 0, 1 ) ), f - vec3f( 0.0, 0.0, 1.0 ) );
	let n101 = _gradDot3( _h3( i + vec3i( 1, 0, 1 ) ), f - vec3f( 1.0, 0.0, 1.0 ) );
	let n011 = _gradDot3( _h3( i + vec3i( 0, 1, 1 ) ), f - vec3f( 0.0, 1.0, 1.0 ) );
	let n111 = _gradDot3( _h3( i + vec3i( 1, 1, 1 ) ), f - vec3f( 1.0, 1.0, 1.0 ) );
	let x0 = mix( mix( n000, n100, u.x ), mix( n010, n110, u.x ), u.y );
	let x1 = mix( mix( n001, n101, u.x ), mix( n011, n111, u.x ), u.y );
	return mix( x0, x1, u.z ) * 0.982;
}
fn perlin2( p: vec2f ) -> f32 {
	let fl = floor( p );
	let X = i32( fl.x ); let Y = i32( fl.y );
	let fx = p.x - fl.x; let fy = p.y - fl.y;
	let u = _fade3( vec3f( fx, fy, 0.0 ) );
	let v0 = _mxGrad2( mxHash2( X, Y ), fx, fy );
	let v1 = _mxGrad2( mxHash2( X + 1, Y ), fx - 1.0, fy );
	let v2 = _mxGrad2( mxHash2( X, Y + 1 ), fx, fy - 1.0 );
	let v3 = _mxGrad2( mxHash2( X + 1, Y + 1 ), fx - 1.0, fy - 1.0 );
	let s1 = 1.0 - u.x;
	return ( ( 1.0 - u.y ) * ( v0 * s1 + v1 * u.x ) + u.y * ( v2 * s1 + v3 * u.x ) ) * 0.6616;
}
fn mx_noise_float3( p: vec3f ) -> f32 { return perlin3( p ); }
fn mx_noise_float2( p: vec2f ) -> f32 { return perlin2( p ); }
// MaterialX vec3 noise: one hash per corner, its three low bytes pick the gradients
fn _mxGrad3v( h: u32, p: vec3f ) -> vec3f { return vec3f( _gradDot3( h & 0xffu, p ), _gradDot3( ( h >> 8u ) & 0xffu, p ), _gradDot3( ( h >> 16u ) & 0xffu, p ) ); }
fn mx_noise_vec3( p: vec3f ) -> vec3f {
	let fl = floor( p );
	let i = vec3i( fl );
	let f = p - fl;
	let u = _fade3( f );
	let n000 = _mxGrad3v( _h3( i ), f );
	let n100 = _mxGrad3v( _h3( i + vec3i( 1, 0, 0 ) ), f - vec3f( 1.0, 0.0, 0.0 ) );
	let n010 = _mxGrad3v( _h3( i + vec3i( 0, 1, 0 ) ), f - vec3f( 0.0, 1.0, 0.0 ) );
	let n110 = _mxGrad3v( _h3( i + vec3i( 1, 1, 0 ) ), f - vec3f( 1.0, 1.0, 0.0 ) );
	let n001 = _mxGrad3v( _h3( i + vec3i( 0, 0, 1 ) ), f - vec3f( 0.0, 0.0, 1.0 ) );
	let n101 = _mxGrad3v( _h3( i + vec3i( 1, 0, 1 ) ), f - vec3f( 1.0, 0.0, 1.0 ) );
	let n011 = _mxGrad3v( _h3( i + vec3i( 0, 1, 1 ) ), f - vec3f( 0.0, 1.0, 1.0 ) );
	let n111 = _mxGrad3v( _h3( i + vec3i( 1, 1, 1 ) ), f - vec3f( 1.0, 1.0, 1.0 ) );
	let x0 = mix( mix( n000, n100, u.x ), mix( n010, n110, u.x ), u.y );
	let x1 = mix( mix( n001, n101, u.x ), mix( n011, n111, u.x ), u.y );
	return mix( x0, x1, u.z ) * 0.982;
}
fn mx_fractal_noise_float3( p: vec3f, octaves: i32, lacunarity: f32, diminish: f32 ) -> f32 {
	var r = 0.0; var amp = 1.0; var q = p;
	for ( var i = 0; i < octaves; i++ ) { r += amp * perlin3( q ); amp *= diminish; q *= lacunarity; }
	return r;
}
fn mx_cell_noise_float3( p: vec3f ) -> f32 { let i = vec3i( floor( p ) ); return f32( mxHash3( i.x, i.y, i.z ) ) / f32( 0xffffffffu ); }
fn mx_cell_noise_float2( p: vec2f ) -> f32 { let i = vec2i( floor( p ) ); return f32( mxHash2( i.x, i.y ) ) / f32( 0xffffffffu ); }
// distances to the nearest two feature points (F1, F2), jitter 0..1
fn mx_worley_noise_vec2_3( p: vec3f, jitter: f32 ) -> vec2f {
	let i = vec3i( floor( p ) );
	let f = fract( p );
	var d1 = 1e9; var d2 = 1e9;
	for ( var z = -1; z <= 1; z++ ) { for ( var y = -1; y <= 1; y++ ) { for ( var x = -1; x <= 1; x++ ) {
		let c = vec3i( x, y, z );
		let h = ihash3( i + c );
		let o = vec3f( f32( c.x ), f32( c.y ), f32( c.z ) ) + ( vec3f( u32ToUnit( h.x ), u32ToUnit( h.y ), u32ToUnit( h.z ) ) - 0.5 ) * jitter + 0.5 - f;
		let d = dot( o, o );
		if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) { d2 = d; }
	} } }
	return sqrt( vec2f( d1, d2 ) );
}
fn mx_worley_noise_vec2_2( p: vec2f, jitter: f32 ) -> vec2f {
	let i = vec2i( floor( p ) );
	let f = fract( p );
	var d1 = 1e9; var d2 = 1e9;
	for ( var y = -1; y <= 1; y++ ) { for ( var x = -1; x <= 1; x++ ) {
		let c = vec2i( x, y );
		let h = ihash3( vec3i( i + c, 0 ) );
		let o = vec2f( f32( c.x ), f32( c.y ) ) + ( vec2f( u32ToUnit( h.x ), u32ToUnit( h.y ) ) - 0.5 ) * jitter + 0.5 - f;
		let d = dot( o, o );
		if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) { d2 = d; }
	} }
	return sqrt( vec2f( d1, d2 ) );
}

// ---- normals

// orthonormal basis around n (Frisvad / Duff et al.)
fn basis( n: vec3f ) -> mat3x3f {
	let s = select( -1.0, 1.0, n.z >= 0.0 );
	let a = -1.0 / ( s + n.z );
	let b = n.x * n.y * a;
	let t = vec3f( 1.0 + s * n.x * n.x * a, s * b, -s * n.x );
	let bt = vec3f( b, s + n.y * n.y * a, -n.y );
	return mat3x3f( t, bt, n );
}

// Perturb a world-space normal by a height field sampled with screen-space derivatives
// (Mikkelsen, "Bump Mapping Unparametrized Surfaces"; TSL perturbNormal equivalent).
// dhdx / dhdy: dpdx / dpdy of the height (in metres) at this pixel.
fn perturbNormalByHeight( P: vec3f, N: vec3f, dhdx: f32, dhdy: f32, strength: f32 ) -> vec3f {
	let dPdx = dpdx( P );
	let dPdy = dpdy( P );
	let r1 = cross( dPdy, N );
	let r2 = cross( N, dPdx );
	let det = dot( dPdx, r1 );
	let grad = sign( det ) * ( dhdx * r1 + dhdy * r2 ) * strength;
	return normalize( abs( det ) * N - grad );
}

// tangent-space normal map sample (xy in -1..1) applied with a derivative-based TBN
fn perturbNormalByMap( P: vec3f, N: vec3f, uv: vec2f, mapN: vec3f ) -> vec3f {
	let dp1 = dpdx( P ); let dp2 = dpdy( P );
	let duv1 = dpdx( uv ); let duv2 = dpdy( uv );
	let dp2perp = cross( dp2, N ); let dp1perp = cross( N, dp1 );
	let T = dp2perp * duv1.x + dp1perp * duv2.x;
	let B = dp2perp * duv1.y + dp1perp * duv2.y;
	let invmax = inverseSqrt( max( max( dot( T, T ), dot( B, B ) ), 1e-20 ) );
	return normalize( mat3x3f( T * invmax, B * invmax, N ) * mapN );
}

// ---- color

fn srgbToLinear( c: vec3f ) -> vec3f {
	return select( pow( ( c + 0.055 ) / 1.055, vec3f( 2.4 ) ), c / 12.92, c <= vec3f( 0.04045 ) );
}
fn linearToSrgb( c: vec3f ) -> vec3f {
	return select( 1.055 * pow( c, vec3f( 1.0 / 2.4 ) ) - 0.055, c * 12.92, c <= vec3f( 0.0031308 ) );
}
`}),It={hooks:{},version:0,set(a,e){this.hooks[a]=e,this.version++},modules(){return Object.values(this.hooks).filter(Boolean)}},Dr={directModulation:"fn hookDirectModulation( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 1.0 ); }",ambientModulation:"fn hookAmbientModulation( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 1.0 ); }",shadowPosition:"fn hookShadowPosition( P: vec3f, N: vec3f, pixel: vec2f ) -> vec3f { return P; }",bounce:"fn hookBounce( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 0.0 ); }",localLights:"fn hookLocalLights( s: Surface, P: vec3f, N: vec3f, V: vec3f, acc: ptr<function, LightAccum> ) {}",envSpecular:"fn hookEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f { let t = sat( R.y * 0.5 + 0.5 ); return mix( frame.horizonColor * 0.6, frame.skyIrradiance * PI, t ) * frame.envIntensity; }",envDiffuse:"fn hookEnvDiffuse( N: vec3f ) -> vec3f { return mix( frame.horizonColor * 0.25, frame.skyIrradiance, N.y * 0.5 + 0.5 ) * frame.envIntensity; }"};function Pn(){const a=[];for(const e in Dr){const t=It.hooks[e];t?a.push(t):a.push(Tn(e))}return a}const Di={};function Tn(a){return Di[a]||(Di[a]=new N({name:"hook-"+a+"-default",deps:[wt],code:Dr[a]}))}const At=new U("SunShadow",{matrices:["mat4x4f[4]",[new C,new C,new C,new C]],cascades:["vec4f[4]",[new Q,new Q,new Q,new Q]],count:["u32",0],mapSize:["f32",2048],bias:["f32",2e-5],fade:["f32",1],pcssCascades:["u32",1],sunAngularDiameter:["f32",.00925],enabled:["f32",0],pad:["f32",0],blend:["vec4f[4]",[new Q,new Q,new Q,new Q]]});let Lr=null;function An(a){Lr=a}const Ir=new N({name:"sunShadow",deps:[B],uniforms:At,uniformName:"shadowParams",bindings:{sunShadowMap:{texture:()=>Lr,viewDimension:"2d-array"}},code:`
fn shadowCascadeOf( viewDist: f32 ) -> i32 {
	for ( var i = 0; i < i32( shadowParams.count ); i++ ) { if ( viewDist < shadowParams.cascades[ i ].x ) { return i; } }
	return -1;
}

fn _shadowTap( uv: vec2f, layer: i32, z: f32 ) -> f32 {
	return textureSampleCompareLevel( sunShadowMap, smpShadow, uv, layer, z );
}

// shadow map depth (0 near .. 1 far, standard Z) at uv
fn _shadowDepth( uv: vec2f, layer: i32 ) -> f32 {
	let dim = vec2f( textureDimensions( sunShadowMap ) );
	let px = vec2i( clamp( uv * dim, vec2f( 0.0 ), dim - 1.0 ) );
	return textureLoad( sunShadowMap, px, layer, 0 );
}

// Contact-hardening sun shadows (PCSS, the former SunShadowFilter) on the near cascades. The penumbra of a
// real sun shadow grows with the distance from the occluder to the receiver (the sun is a 0.53 deg disc):
// sharp where an object touches the ground, soft under a palm crown 10 m up. Per pixel:
//  1. blocker search: average depth of the occluders around the pixel (raw depth loads, no sampler)
//  2. penumbra width = occluder-receiver distance * sun diameter, converted to this cascade's texels
//  3. percentage-closer filtering over that width
// Both sample sets are Vogel disks rotated per pixel and per frame (interleaved gradient noise): the
// TAA resolves the noise into a smooth gradient. Farther cascades: three's PCFShadowFilter (5 Vogel taps
// of hardware comparisons over one texel, rotated per pixel).
const SHADOW_MAX_OCCLUDER_HEIGHT: f32 = 30.0; // m: search radius covers penumbrae of occluders up to this far above
const SHADOW_SEARCH_TAPS: i32 = 8;
const SHADOW_FILTER_TAPS: i32 = 12;

fn sunShadowCascade( P: vec3f, N: vec3f, c: i32, noise: f32, pcfNoise: f32 ) -> f32 {
	return _sunShadowCascade( P, N, c, noise, pcfNoise, true );
}

// pcss = false: the 5-tap PCF filter in every cascade (no blocker search)
fn _sunShadowCascade( P: vec3f, N: vec3f, c: i32, noise: f32, pcfNoise: f32, pcss: bool ) -> f32 {
	let info = shadowParams.cascades[ c ];
	let Pb = P + N * info.z;
	let sc = shadowParams.matrices[ c ] * vec4f( Pb, 1.0 );
	let uvz = vec3f( sc.x * 0.5 + 0.5, 0.5 - sc.y * 0.5, sc.z );
	if ( any( uvz.xy < vec2f( 0.0 ) ) || any( uvz.xy > vec2f( 1.0 ) ) || uvz.z > 1.0 ) { return 1.0; }
	let z = uvz.z - shadowParams.bias;
	let texel = 1.0 / shadowParams.mapSize;
	if ( pcss && u32( c ) < shadowParams.pcssCascades ) {
		// moved every frame (Jimenez 2014): a noise pattern fixed on screen would never average out
		let phi = noise * TWO_PI;
		let width = info.y * shadowParams.mapSize; // cascade width (m)
		let range = info.w; // depth range (m)
		let SD = shadowParams.sunAngularDiameter;
		// 1. blockers within the widest penumbra this cascade can show. The texel straight along the light
		// ray comes first: a thin occluder (a log, a rope, a rail) can fall between the disk taps, which
		// left lit dots inside its umbra.
		let searchUV = max( min( SHADOW_MAX_OCCLUDER_HEIGHT * SD / width, texel * 24.0 ), texel * 1.5 );
		let d0 = _shadowDepth( uvz.xy, c );
		var blockSum = select( 0.0, d0, d0 < z );
		var blockCount = select( 0.0, 1.0, d0 < z );
		for ( var i = 0; i < SHADOW_SEARCH_TAPS; i++ ) {
			let d = _shadowDepth( uvz.xy + vogelDiskSample( i, SHADOW_SEARCH_TAPS, phi ) * searchUV, c );
			// standard depth: an occluder is closer to the light = smaller depth
			if ( d < z ) { blockSum += d; blockCount += 1.0; }
		}
		if ( blockCount < 0.5 ) { return 1.0; }
		// 2. occluder-receiver distance (orthographic: depth is linear over the camera range)
		let dz = abs( blockSum / blockCount - z ) * range;
		let penumbraUV = clamp( dz * SD / width, texel * 1.2, texel * 32.0 );
		// 3. PCF over the penumbra
		var sum = 0.0;
		for ( var i = 0; i < SHADOW_FILTER_TAPS; i++ ) {
			let d = _shadowDepth( uvz.xy + vogelDiskSample( i, SHADOW_FILTER_TAPS, phi + 1.7 ) * penumbraUV, c );
			sum += select( 0.0, 1.0, z <= d );
		}
		return sum / f32( SHADOW_FILTER_TAPS );
	}
	// three's PCFShadowFilter: 5 samples on a Vogel disk of one texel, rotated per pixel
	let phiP = pcfNoise * TWO_PI;
	var sum = 0.0;
	for ( var i = 0; i < 5; i++ ) {
		sum += _shadowTap( uvz.xy + vogelDiskSample( i, 5, phiP ) * texel, c, z );
	}
	return sum / 5.0;
}

// visibility of the sun at P (1 = lit); pixel = fragment coordinate for the dither.
// Cascade seams blended over a band that grows with their distance (SoftCSMShadowNode: a quarter of it,
// 2.5 m at the 10 m seam, 15 m at 60 m, and the last cascade fades out over its final 100 m); each
// cascade's map is widened to cover its part of the overlap.
fn sunShadow( P: vec3f, N: vec3f, pixel: vec2f ) -> f32 {
	return _sunShadow( P, N, pixel, true );
}

// sunShadow with the plain 5-tap PCF filter everywhere (surfaces whose own detail hides penumbrae: water)
fn sunShadowPCF( P: vec3f, N: vec3f, pixel: vec2f ) -> f32 {
	return _sunShadow( P, N, pixel, false );
}

fn _sunShadow( P: vec3f, N: vec3f, pixel: vec2f, pcss: bool ) -> f32 {
	if ( shadowParams.enabled < 0.5 ) { return 1.0; }
	let dist = dot( P - frame.cameraPos, - vec3f( frame.view[ 0 ][ 2 ], frame.view[ 1 ][ 2 ], frame.view[ 2 ][ 2 ] ) );
	let noise = interleavedGradientNoise( pixel + f32( frame.frameIndex % 64u ) * 5.588238 );
	let pcfNoise = interleavedGradientNoise( pixel );
	if ( shadowParams.fade < 0.5 ) {
		let c = shadowCascadeOf( dist );
		if ( c < 0 ) { return 1.0; }
		return _sunShadowCascade( P, N, c, noise, pcfNoise, pcss );
	}
	var ret = 1.0;
	let last = i32( shadowParams.count ) - 1;
	for ( var i = 0; i <= last; i++ ) {
		let b = shadowParams.blend[ i ]; // x, y: cascade range, z / w: blend margin at its near / far seam
		let center = ( b.x + b.y ) * 0.5;
		let margin = max( select( b.w, b.z, dist < center ), 1e-5 );
		let csmX = b.x - margin * 0.5;
		let csmY = select( b.y + margin * 0.5, b.y, i == last );
		if ( dist >= csmX && dist <= csmY ) {
			var ratio = clamp( min( dist - csmX, csmY - dist ) / margin, 0.0, 1.0 );
			// no fade at the near edge of the first cascade
			if ( i == 0 && dist <= center ) { ratio = 1.0; }
			ret -= ( 1.0 - _sunShadowCascade( P, N, i, noise, pcfNoise, pcss ) ) * ratio;
		}
	}
	return max( ret, 0.0 );
}

// one depth comparison in cascade c (1 = lit; outside the map: lit). For volumetric marches (haze shafts,
// motes) where the jitter and the temporal resolve do the filtering.
fn sunShadowCascadeHard( P: vec3f, c: i32 ) -> f32 {
	let sc = shadowParams.matrices[ c ] * vec4f( P, 1.0 );
	let uv = vec2f( sc.x * 0.5 + 0.5, 0.5 - sc.y * 0.5 );
	if ( any( uv <= vec2f( 0.0 ) ) || any( uv >= vec2f( 1.0 ) ) || sc.z > 1.0 ) { return 1.0; }
	return select( 0.0, 1.0, sc.z - 2e-5 <= _shadowDepth( uv, c ) );
}
// same in the cascade covering P (by view distance), 1 beyond the last one or with shadows off
fn sunShadowHard( P: vec3f ) -> f32 {
	if ( shadowParams.enabled < 0.5 ) { return 1.0; }
	let dist = dot( P - frame.cameraPos, - vec3f( frame.view[ 0 ][ 2 ], frame.view[ 1 ][ 2 ], frame.view[ 2 ][ 2 ] ) );
	let c = shadowCascadeOf( dist );
	if ( c < 0 ) { return 1.0; }
	return sunShadowCascadeHard( P, c );
}
`}),wt=new N({name:"surface",deps:[B],code:`
struct Surface {
	albedo: vec3f,
	alpha: f32,
	normal: vec3f,      // world space, shading normal
	roughness: f32,
	emissive: vec3f,
	metalness: f32,
	translucency: vec3f, // fraction of the direct light transmitted through thin foliage (x lightColor)
	ao: f32,
	sheenColor: vec3f,
	specularIntensity: f32,
	clearcoat: f32,
	clearcoatRoughness: f32,
	sheenRoughness: f32,
	ior: f32,
	clearcoatNormal: vec3f,
	envIntensity: f32,
};

fn defaultSurface( N: vec3f ) -> Surface {
	var s: Surface;
	s.albedo = vec3f( 1.0 ); s.alpha = 1.0; s.normal = N; s.roughness = 1.0; s.metalness = 0.0;
	s.emissive = vec3f( 0.0 ); s.translucency = vec3f( 0.0 ); s.ao = 1.0; s.sheenColor = vec3f( 0.0 );
	s.specularIntensity = 1.0; s.clearcoat = 0.0; s.clearcoatRoughness = 0.0; s.sheenRoughness = 1.0;
	s.ior = 1.5; s.clearcoatNormal = N; s.envIntensity = 1.0;
	return s;
}

// screen derivatives of the lit position, taken at the top of shadeSurface (every lane of the quad
// is live there; the sun hooks run in a branch, where derivatives are undefined)
var<private> lightDPdx: vec3f = vec3f( 0.0 );
var<private> lightDPdy: vec3f = vec3f( 0.0 );

struct LightAccum {
	directDiffuse: vec3f,
	directSpecular: vec3f,
	indirectDiffuse: vec3f,
	indirectSpecular: vec3f,
};

fn F_Schlick( f0: vec3f, f90: f32, dotVH: f32 ) -> vec3f {
	let fresnel = exp2( ( -5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + f90 * fresnel;
}
fn V_GGX_SmithCorrelated( alpha: f32, dotNL: f32, dotNV: f32 ) -> f32 {
	let a2 = alpha * alpha;
	let gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * dotNV * dotNV );
	let gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * dotNL * dotNL );
	return 0.5 / max( gv + gl, EPS );
}
fn D_GGX( alpha: f32, dotNH: f32 ) -> f32 {
	let a2 = alpha * alpha;
	let d = dotNH * dotNH * ( a2 - 1.0 ) + 1.0;
	return INV_PI * a2 / ( d * d );
}
fn BRDF_GGX( L: vec3f, V: vec3f, N: vec3f, f0: vec3f, f90: f32, roughness: f32 ) -> vec3f {
	let alpha = roughness * roughness;
	let H = normalize( L + V );
	let dotNL = sat( dot( N, L ) ); let dotNV = sat( dot( N, V ) );
	let dotNH = sat( dot( N, H ) ); let dotVH = sat( dot( V, H ) );
	return F_Schlick( f0, f90, dotVH ) * V_GGX_SmithCorrelated( alpha, dotNL, dotNV ) * D_GGX( alpha, dotNH );
}
// Charlie sheen (Estevez & Kulla)
fn D_Charlie( roughness: f32, dotNH: f32 ) -> f32 {
	let a = roughness * roughness;
	let invA = 1.0 / a;
	let cos2h = dotNH * dotNH;
	let sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invA ) * pow( sin2h, invA * 0.5 ) / ( 2.0 * PI );
}
fn V_Neubelt( dotNV: f32, dotNL: f32 ) -> f32 { return sat( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) ); }
fn BRDF_Sheen( L: vec3f, V: vec3f, N: vec3f, color: vec3f, roughness: f32 ) -> vec3f {
	let H = normalize( L + V );
	return color * D_Charlie( roughness, sat( dot( N, H ) ) ) * V_Neubelt( sat( dot( N, V ) ), sat( dot( N, L ) ) );
}
// analytical approximation of the split-sum DFG term (Karis)
fn DFGApprox( dotNV: f32, roughness: f32 ) -> vec2f {
	let c0 = vec4f( -1.0, -0.0275, -0.572, 0.022 );
	let c1 = vec4f( 1.0, 0.0425, 1.04, -0.04 );
	let r = roughness * c0 + c1;
	let a004 = min( r.x * r.x, exp2( -9.28 * dotNV ) ) * r.x + r.y;
	return vec2f( -1.04, 1.04 ) * a004 + r.zw;
}
// multi-scattering specular energy compensation (Fdez-Aguera), as three's computeMultiscattering
fn multiscatter( N: vec3f, V: vec3f, specColor: vec3f, specF90: f32, roughness: f32, single: ptr<function, vec3f>, multi: ptr<function, vec3f> ) {
	let fab = DFGApprox( sat( dot( N, V ) ), roughness );
	let Fr = specColor;
	let FssEss = Fr * fab.x + specF90 * fab.y;
	let Ess = fab.x + fab.y;
	let Ems = 1.0 - Ess;
	let Favg = Fr + ( 1.0 - Fr ) * 0.047619;
	let Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	*single += FssEss;
	*multi += Fms * Ems;
}
`}),gs=new N({name:"lighting",deps:[B,wt,Ir],code:`
// STUDIO_LIGHTING (a pass define, e.g. the fish portraits of the catch card): the world hooks are
// skipped (no shadows, caustics, cloud / hill shadow, bounce, local lights, underwater tint) and the
// environment is a neutral photo studio: a grey sweep lit from above plus one large softbox whose
// azimuth is frame.debug.x (radians, animatable). The key light is frame.sunDir / frame.sunColor of
// the view's own frame block.
fn studioEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f {
	let sweep = mix( vec3f( 0.035, 0.04, 0.045 ), vec3f( 0.55, 0.57, 0.6 ), smoothstep( -0.35, 0.85, R.y ) );
	let az = atan2( R.x, R.z ) - frame.debug.x;
	let w = 0.35 + roughness * 1.6;
	let box = exp( - az * az / ( w * w ) ) * smoothstep( -0.05, 0.3, R.y ) * smoothstep( 0.98, 0.55, R.y );
	return ( sweep + box * vec3f( 2.4, 2.35, 2.25 ) / ( 1.0 + roughness * 3.0 ) ) * frame.envIntensity;
}
fn studioEnvDiffuse( N: vec3f ) -> vec3f {
	return mix( vec3f( 0.05, 0.055, 0.06 ), vec3f( 0.3, 0.31, 0.33 ), N.y * 0.5 + 0.5 ) * frame.envIntensity;
}

fn shadeSurface( s: Surface, P: vec3f, V: vec3f, pixel: vec2f ) -> vec3f {
	let N = s.normal;
	let rough = clamp( s.roughness, 0.03, 1.0 );
	let diffuseColor = s.albedo * ( 1.0 - s.metalness );
	let specF0 = mix( vec3f( 0.04 ) * s.specularIntensity, s.albedo, s.metalness );
	let specF90 = mix( s.specularIntensity, 1.0, s.metalness );
	var acc: LightAccum;
	acc.directDiffuse = vec3f( 0.0 ); acc.directSpecular = vec3f( 0.0 );
	acc.indirectDiffuse = vec3f( 0.0 ); acc.indirectSpecular = vec3f( 0.0 );

	lightDPdx = dpdx( P );
	lightDPdy = dpdy( P );

	// ---- sun / moon
	let L = frame.sunDir;
	let dotNL = sat( dot( N, L ) );
#if STUDIO_LIGHTING
	let lightColor = frame.sunColor;
#else
	// Faces turned away from the sun with no transmission get nothing from it: the modulation hooks
	// (clouds, hill shadow, caustics) and the shadow filters only run for the rest, and the filters
	// only where the hooks left light (their derivatives are taken ahead: lightDPdx / lightDPdy)
	var lightColor = vec3f( 0.0 );
	if ( dotNL > 0.0 || any( s.translucency > vec3f( 0.0 ) ) ) {
		lightColor = frame.sunColor * hookDirectModulation( P, N );
#if MATERIAL_SUN_MODULATION
		// per-material key-light multiplier (the former TerrainLightingModel: heightfield hill shadow)
		lightColor *= materialSunModulation( P, N );
#endif
		let geomN = N;
		var shadow = 0.0;
		if ( any( lightColor > vec3f( 0.0 ) ) ) {
#if REFRACTION_CLIP
			// the water's refraction source (seen blurred through the water): one hard shadow tap
			shadow = sunShadowHard( hookShadowPosition( P, geomN, pixel ) );
#else
			shadow = sunShadow( hookShadowPosition( P, geomN, pixel ), geomN, pixel );
#endif
		}
		lightColor *= shadow;
	}
#endif
	let irradiance = dotNL * lightColor;
	acc.directDiffuse += irradiance * diffuseColor * INV_PI;
	acc.directSpecular += irradiance * BRDF_GGX( L, V, N, specF0, specF90, rough );
#if SHEEN
	acc.directSpecular += irradiance * BRDF_Sheen( L, V, N, s.sheenColor, max( s.sheenRoughness, 0.07 ) );
#endif
	// thin-surface transmission (foliage): lit from behind as well
	acc.directDiffuse += s.translucency * lightColor;
#if CLEARCOAT
	let ccN = s.clearcoatNormal;
	let ccNL = sat( dot( ccN, L ) );
	let ccSpec = ccNL * lightColor * BRDF_GGX( L, V, ccN, vec3f( 0.04 ), 1.0, clamp( s.clearcoatRoughness, 0.03, 1.0 ) );
#endif

	// ---- local lights (lanterns, windows, boat lights, flashlight)
#if !STUDIO_LIGHTING
	hookLocalLights( s, P, N, V, &acc );
#endif

	// ---- indirect: environment + ground bounce
	// (three's PhysicalLightingModel: env irradiance goes through the multiscatter-compensated
	// diffuse; the ground bounce is plain Lambert)
	let R = reflect( -V, N );
	let Rr = normalize( mix( R, N, rough * rough ) );
#if STUDIO_LIGHTING
	let envIrr = studioEnvDiffuse( N ) * PI * s.envIntensity;
	let radiance = studioEnvSpecular( Rr, rough ) * s.envIntensity;
#else
	let envIrr = hookEnvDiffuse( N ) * PI * s.envIntensity;
	let radiance = hookEnvSpecular( Rr, rough ) * s.envIntensity;
#endif
	var single = vec3f( 0.0 ); var multi = vec3f( 0.0 );
	multiscatter( N, V, specF0, specF90, rough, &single, &multi );
	let totalScatter = single + multi;
	let diffuseMS = diffuseColor * ( 1.0 - max( max( totalScatter.r, totalScatter.g ), totalScatter.b ) );
	acc.indirectSpecular += radiance * single + multi * envIrr * INV_PI;
#if STUDIO_LIGHTING
	acc.indirectDiffuse += diffuseMS * envIrr * INV_PI;
#else
	acc.indirectDiffuse += diffuseMS * envIrr * INV_PI + hookBounce( P, N ) * diffuseColor;
#endif

	// ambient occlusion (specular occlusion after Lagarde)
	let dotNV = sat( dot( N, V ) );
	let specAO = sat( pow( dotNV + s.ao, exp2( -16.0 * rough - 1.0 ) ) - 1.0 + s.ao );
	acc.indirectDiffuse *= s.ao;
	acc.indirectSpecular *= specAO;
#if STUDIO_LIGHTING
	let amb = vec3f( 1.0 );
#else
	let amb = hookAmbientModulation( P, N );
#endif
	acc.indirectDiffuse *= amb;
	acc.indirectSpecular *= amb;

	var color = acc.directDiffuse + acc.directSpecular + acc.indirectDiffuse + acc.indirectSpecular;
#if SHEEN
	color += s.sheenColor * envIrr * INV_PI * 0.5 * s.ao * amb;
#endif
#if CLEARCOAT
	let ccNV = sat( dot( ccN, V ) );
	let Fcc = F_Schlick( vec3f( 0.04 ), 1.0, ccNV ) * s.clearcoat;
#if STUDIO_LIGHTING
	let ccRad = studioEnvSpecular( reflect( -V, ccN ), clamp( s.clearcoatRoughness, 0.03, 1.0 ) ) * amb * specAO;
#else
	let ccRad = hookEnvSpecular( reflect( -V, ccN ), clamp( s.clearcoatRoughness, 0.03, 1.0 ) ) * amb * specAO;
#endif
	color = color * ( 1.0 - Fcc ) + ( ccSpec * s.clearcoat + ccRad * Fcc );
#endif
	return color + s.emissive;
}
`}),kn={position:"vec3f",normal:"vec3f",uv:"vec2f",color:"vec4f"},Cn={normal:"vec3f( 0.0, 1.0, 0.0 )",uv:"vec2f( 0.0 )",color:"vec4f( 1.0 )"},Dn=/^(u32|i32|vec[234][ui])$/;function Ln(a){return a==="f32"?"0.0":a==="u32"?"0u":a==="i32"?"0i":`${a}()`}function In(a,e,t){const s=t.kind,i=new Set(e.map(x=>x.name)),r=a.allDefines();r.PASS_MAIN=s==="main"?1:0,r.PASS_DEPTH=s==="depth"?1:0,r.PASS_COLOR=s==="color"?1:0,r.PASS_LATE=t.late?1:0,r.LIT=a.lit?1:0,r.INSTANCED=i.has("instanceMatrix0")?1:0,r.INSTANCE_COLOR=i.has("instanceColor")?1:0,Object.assign(r,t.defines||{}),r.CLIP_DISTANCES=r.REFRACTION_CLIP&&z.features.has("clip-distances")?1:0;let n=`struct VertexIn {
`;for(const x of e)n+=`	@location( ${x.location} ) ${x.name}: ${x.wgsl},
`;n+=`	@builtin( instance_index ) instance: u32,
	@builtin( vertex_index ) vertex: u32,
};
`;let o=`struct VertexData {
	position: vec3f,
	normal: vec3f,
	uv: vec2f,
	color: vec4f,
	model: mat4x4f,
	prevModel: mat4x4f,
	instance: u32,
	vertex: u32,
	worldOffset: vec3f,
	prevWorldOffset: vec3f,
	useWorld: bool,
	worldPos: vec3f,
	worldNormal: vec3f,
	prevWorldPos: vec3f,
`;for(const x in a.attributes)o+=`	${x}: ${a.attributes[x]},
`;o+=`};
`;const l=s==="main";let h=0,c=`struct VSOut {
	@builtin( position ) clip: vec4f,
`;c+=`	@location( ${h++} ) worldPos: vec3f,
`,c+=`	@location( ${h++} ) normal: vec3f,
`,c+=`	@location( ${h++} ) uv: vec2f,
`,c+=`	@location( ${h++} ) color: vec4f,
`,l&&(c+=`	@location( ${h++} ) curClip: vec4f,
`,c+=`	@location( ${h++} ) prevClip: vec4f,
`);for(const x in a.varyings){const w=a.varyings[x];c+=`	@location( ${h++} )${Dn.test(w)?" @interpolate( flat )":""} ${x}: ${w},
`}if(c+=`};
`,r.CLIP_DISTANCES){const x=[...c.matchAll(/\s(\w+): [^,]+,\n/g)].map(w=>w[1]);c+=c.replace("struct VSOut {","struct VSOutClip {").replace(/};\n$/,`	@builtin( clip_distances ) clipDistances: array<f32, 1>,
};
`),c+=`fn vsClip( o: VSOut, d: f32 ) -> VSOutClip {
	var c: VSOutClip;
${x.map(w=>`	c.${w} = o.${w};
`).join("")}	c.clipDistances[ 0 ] = d;
	return c;
}
`}let u="";for(const x in kn)if(i.has(x)){const w=e.find(y=>y.name===x);x==="color"&&w.wgsl==="vec3f"?u+=`	v.color = vec4f( i.color, 1.0 );
`:u+=`	v.${x} = i.${x};
`}else x!=="position"&&(u+=`	v.${x} = ${Cn[x]};
`);for(const x in a.attributes)u+=i.has(x)?`	v.${x} = i.${x};
`:`	v.${x} = ${Ln(a.attributes[x])};
`;const d=`
struct Draw {
	model: mat4x4f,
	prevModel: mat4x4f,
	params: vec4f,  // x: object id, y: user, z: user, w: user
	params2: vec4f,
};
@group( 2 ) @binding( 0 ) var<uniform> draw: Draw;

${n}
${o}
${c}

struct FragInput {
	vs: VSOut,
	P: vec3f,
	N: vec3f,
	V: vec3f,
	uv: vec2f,
	color: vec4f,
	front: bool,
	pixel: vec2f,
};

struct FragResult {
	color: vec4f,
	velocity: vec4f,
	mask: vec4f,
};

fn cofactor3( m: mat4x4f ) -> mat3x3f {
	let a = m[ 0 ].xyz; let b = m[ 1 ].xyz; let c = m[ 2 ].xyz;
	return mat3x3f( cross( b, c ), cross( c, a ), cross( a, b ) );
}

fn materialVertex( v: ptr<function, VertexData>, o: ptr<function, VSOut> ) {
${a.vertex}
}

fn materialSurface( in: FragInput, s: ptr<function, Surface> ) {
${a.surface}
}

fn materialOutput( in: FragInput, s: Surface, r: ptr<function, FragResult> ) {
${a.output}
}

#if CLIP_DISTANCES
@vertex fn vs( i: VertexIn ) -> VSOutClip {
#else
@vertex fn vs( i: VertexIn ) -> VSOut {
#endif
	var v: VertexData;
${u}#if !HAS_POSITION
	v.position = vec3f( 0.0 );
#endif
	v.instance = i.instance;
	v.vertex = i.vertex;
#if INSTANCED
	let im = mat4x4f( i.instanceMatrix0, i.instanceMatrix1, i.instanceMatrix2, i.instanceMatrix3 );
	v.model = draw.model * im;
	v.prevModel = draw.prevModel * im;
#else
	v.model = draw.model;
	v.prevModel = draw.prevModel;
#endif
#if INSTANCE_COLOR
	v.color = vec4f( v.color.rgb * i.instanceColor, v.color.a );
#endif
	v.worldOffset = vec3f( 0.0 );
	v.prevWorldOffset = vec3f( 1e30 );
	v.useWorld = false;
	v.prevWorldPos = vec3f( 1e30 );
	var o: VSOut;
	materialVertex( &v, &o );
	var wp: vec3f;
	var wn: vec3f;
	var pwp: vec3f;
	if ( v.useWorld ) {
		wp = v.worldPos;
		wn = v.worldNormal;
		pwp = select( v.prevWorldPos, wp, v.prevWorldPos.x > 1e29 );
	} else {
		let lp = vec4f( v.position, 1.0 );
		wp = ( v.model * lp ).xyz + v.worldOffset;
		wn = cofactor3( v.model ) * v.normal;
		pwp = ( v.prevModel * lp ).xyz + select( v.prevWorldOffset, v.worldOffset, v.prevWorldOffset.x > 1e29 );
	}
	o.worldPos = wp;
	o.normal = wn;
	o.uv = v.uv;
	o.color = v.color;
	o.clip = frame.viewProj * vec4f( wp, 1.0 );
#if PASS_MAIN
	o.curClip = frame.viewProjNoJitter * vec4f( wp, 1.0 );
	o.prevClip = frame.prevViewProjNoJitter * vec4f( pwp, 1.0 );
#endif
#if CLIP_DISTANCES
	return vsClip( o, frame.seaLevel + REFRACTION_CLIP_MARGIN - wp.y );
#else
	return o;
#endif
}

#if PASS_MAIN && !PASS_LATE && LIT && !IS_WATER && !ALPHA_TEST && !STUDIO_LIGHTING
// Deep under the water, seen from above it: the water drawn over this pixel shows the refraction
// pass (ocean/RefractionPass.js) at its refracted end point, never this pixel's own colour. The end
// point is predicted as the water shader traces it (flat surface, the seabed at P's depth, a margin
// for the wave slopes); where it would leave the screen the water takes the refraction pass' edge.
const SUBMERGED_DEPTH: f32 = 2.5; // m below sea level: below the deepest wave troughs
fn submergedHidden( P: vec3f ) -> bool {
	let sea = frame.seaLevel;
	if ( P.y > sea - SUBMERGED_DEPTH || frame.cameraPos.y < sea + 1.0 ) { return false; }
	let V = normalize( P - frame.cameraPos );
	let pos = frame.cameraPos + V * ( ( frame.cameraPos.y - sea ) / max( - V.y, 1e-4 ) );
	let Tr = refract( V, vec3f( 0.0, 1.0, 0.0 ), 1.0 / 1.333 );
	let Tv = normalize( vec3f( Tr.x, min( Tr.y, -0.08 ), Tr.z ) );
	let L = ( sea - P.y ) / max( - Tv.y, 0.04 );
	let c = frame.viewProj * vec4f( pos + Tv * min( L, 80.0 ), 1.0 );
	let uv = c.xy / max( c.w, 1e-4 ) * vec2f( 0.5, -0.5 ) + 0.5;
	return all( uv > vec2f( 0.1 ) ) && all( uv < vec2f( 0.9 ) ) && c.w > 0.0;
}
#endif

fn fragInput( vs: VSOut, front: bool ) -> FragInput {
	var in: FragInput;
	in.vs = vs;
	in.P = vs.worldPos;
	var N = normalize( vs.normal );
#if DOUBLE_SIDED
	N = select( -N, N, front );
#endif
#if BACK_SIDE
	N = -N;
#endif
	in.N = N;
	in.V = normalize( frame.cameraPos - vs.worldPos );
	in.uv = vs.uv;
	in.color = vs.color;
	in.front = front;
	in.pixel = vs.clip.xy;
	return in;
}

fn surfaceOf( in: FragInput ) -> Surface {
	var s = defaultSurface( in.N );
	s.albedo = mat.color * in.color.rgb;
	s.alpha = mat.opacity * in.color.a;
	s.roughness = mat.roughness;
	s.metalness = mat.metalness;
	s.emissive = mat.emissive;
	materialSurface( in, &s );
	return s;
}

#if PASS_DEPTH
#if NEEDS_DEPTH_FRAGMENT
@fragment fn fs( vs: VSOut, @builtin( front_facing ) front: bool ) {
	let in = fragInput( vs, front );
#if HAS_SHADOW_HOOK
	if ( ! materialShadow( in ) ) { discard; }
#else
	let s = surfaceOf( in );
	if ( s.alpha < mat.alphaTest ) { discard; }
#endif
}
#endif
#else

#if PASS_MAIN
struct FragOut {
	@location( 0 ) color: vec4f,
	@location( 1 ) velocity: vec4f,
	@location( 2 ) mask: vec4f,
};
#else
struct FragOut {
	@location( 0 ) color: vec4f,
};
#endif

@fragment fn fs( vs: VSOut, @builtin( front_facing ) front: bool ) -> FragOut {
	let in = fragInput( vs, front );
#if REFRACTION_CLIP
#if !CLIP_DISTANCES
	// the water's refraction source only holds what is under the water (pass.defines)
	if ( in.P.y > frame.seaLevel + REFRACTION_CLIP_MARGIN ) { discard; }
#endif
#endif
#if PASS_MAIN && !PASS_LATE && LIT && !IS_WATER && !ALPHA_TEST && !STUDIO_LIGHTING
	// hidden under the water (see submergedHidden): an ambient colour, keeping depth and motion
	if ( submergedHidden( in.P ) ) {
		var so: FragOut;
		so.color = vec4f( mat.color * in.color.rgb * hookEnvDiffuse( in.N ) * hookAmbientModulation( in.P, in.N ), 1.0 );
		let cur0 = vs.curClip.xy / vs.curClip.w;
		let prev0 = vs.prevClip.xy / vs.prevClip.w;
		so.velocity = vec4f( ( cur0 - prev0 ) * vec2f( 0.5, -0.5 ), 0.0, 1.0 );
		so.mask = vec4f( 0.0 );
		return so;
	}
#endif
	var s = surfaceOf( in );
#if ALPHA_TEST
	if ( s.alpha < mat.alphaTest ) { discard; }
#endif
	s.normal = normalize( s.normal );
	s.clearcoatNormal = normalize( s.clearcoatNormal );
	var r: FragResult;
#if LIT
	r.color = vec4f( shadeSurface( s, in.P, in.V, in.pixel ), s.alpha );
#else
	r.color = vec4f( s.albedo + s.emissive, s.alpha );
#endif
#if PASS_MAIN
	let cur = vs.curClip.xy / vs.curClip.w;
	let prev = vs.prevClip.xy / vs.prevClip.w;
	r.velocity = vec4f( ( cur - prev ) * vec2f( 0.5, -0.5 ), 0.0, 1.0 );
#else
	r.velocity = vec4f( 0.0 );
#endif
	r.mask = vec4f( 0.0 );
	materialOutput( in, s, &r );
	var out: FragOut;
	out.color = r.color;
#if PASS_MAIN
#if PASS_LATE
	// premultiplied: opaque outputs overwrite, blended ones weight their motion by coverage
#if VELOCITY_OPAQUE
	// the fragment owns the motion of its pixel even when its colour is blended (AirMotes specks)
	let a = VELOCITY_WEIGHT;
#else
	let a = select( 1.0, r.color.a, TRANSPARENT_F ) * VELOCITY_WEIGHT;
#endif
	out.velocity = vec4f( r.velocity.xy * a, 0.0, a );
#else
	out.velocity = r.velocity;
#endif
	out.mask = r.mask;
#endif
	return out;
}
#endif
`,m=a.shadow?`fn materialShadow( in: FragInput ) -> bool {
${a.shadow}
}
`:"";r.HAS_SHADOW_HOOK=a.shadow?1:0,r.NEEDS_DEPTH_FRAGMENT=s==="depth"&&(a.alphaTest>0||a.shadow)?1:0,r.HAS_POSITION=i.has("position")?1:0;const v=d.replace("fn fragInput(",m+"fn fragInput(").replace(/\bTRANSPARENT_F\b/g,a.transparent?"true":"false").replace(/\bVELOCITY_WEIGHT\b/g,Li(a.velocityWeight)).replace(/\bREFRACTION_CLIP_MARGIN\b/g,Li((t.defines&&t.defines.REFRACTION_CLIP_MARGIN)??0));let p=[B,wt,...a.modules];return(s!=="depth"||Rs(a.modules).includes(gs))&&(p=[B,wt,...Pn(),gs,...a.modules]),a.lightingHooks===!1&&!Rs(a.modules).includes(gs)&&(p=[B,wt,Ir,...a.modules]),{code:v,modules:p,defines:r,bindings:{mat:{uniform:a.uniformBlock},...a.bindings},hasFragment:s!=="depth"||r.NEEDS_DEPTH_FRAGMENT===1}}function Li(a){const e=String(a);return e.includes(".")||e.includes("e")?e:e+".0"}const Rr={view:"mat4x4f",proj:"mat4x4f",viewProj:"mat4x4f",invView:"mat4x4f",invProj:"mat4x4f",invViewProj:"mat4x4f",viewProjNoJitter:"mat4x4f",prevViewProjNoJitter:"mat4x4f",cameraPos:["vec3f",new S],near:["f32",.1],prevCameraPos:["vec3f",new S],far:["f32",6e4],resolution:["vec2f",new I(1,1)],invResolution:["vec2f",new I(1,1)],outputResolution:["vec2f",new I(1,1)],jitter:["vec2f",new I],prevJitter:["vec2f",new I],frameIndex:["u32",0],time:["f32",0],dt:["f32",1/60],seaLevel:["f32",0],sunDir:["vec3f",new S(.3,.6,-.7).normalize()],night:["f32",0],sunColor:["vec3f",new ee(1,1,1)],exposure:["f32",1],skyIrradiance:["vec3f",new ee(.3,.4,.6)],cameraUnderwater:["f32",0],horizonColor:["vec3f",new ee(.6,.7,.8)],cameraWaterHeight:["f32",0],waterAbsorption:["vec3f",new S(.42,.075,.035)],windSpeed:["f32",7],waterScattering:["vec3f",new S(.012,.018,.024)],envIntensity:["f32",1],windDir:["vec2f",new I(.35,.94).normalize()],reversedDepth:["f32",1],pad0:["f32",0],debug:["vec4f",new Q]},Rn=["view","proj","viewProj","invView","invProj","invViewProj","viewProjNoJitter","prevViewProjNoJitter","cameraPos","near","prevCameraPos","far","resolution","invResolution","jitter","prevJitter","reversedDepth"],re=new U("Frame",Rr,{label:"frame"});Mn(re);function Fn(a){const e=new U("Frame",Rr,{label:a});return e.onBeforePack=()=>{for(const t of re.order)Rn.includes(t)||(e.fields[t].value=re.fields[t].value)},e}const Z=re.fields,H={time:Z.time,dt:Z.dt,seaLevel:Z.seaLevel,sunDir:Z.sunDir,sunColor:Z.sunColor,skyIrradiance:Z.skyIrradiance,horizonColor:Z.horizonColor,waterAbsorption:Z.waterAbsorption,waterScattering:Z.waterScattering,cameraUnderwater:Z.cameraUnderwater,cameraWaterHeight:Z.cameraWaterHeight,exposure:Z.exposure,windDir:Z.windDir,windSpeed:Z.windSpeed,night:Z.night,envIntensity:Z.envIntensity},Ii=new C;function Fr(a,e,t,{jitterX:s=0,jitterY:i=0,prevViewProj:r=null,prevCameraPos:n=null,block:o=re}={}){const l=o.fields;a.updateMatrixWorld(),a.matrixWorldInverse&&a.matrixWorldInverse.copy(a.matrixWorld).invert();const h=a.matrixWorldInverse,c=a.projectionMatrix;l.view.value=h.clone(),l.proj.value=c.clone();const u=new C().multiplyMatrices(c,h);l.viewProjNoJitter.value=u.clone();const d=2*s/e,m=2*i/t;Ii.makeTranslation(d,m,0);const v=new C().multiplyMatrices(Ii,u);l.viewProj.value=v,l.invView.value=a.matrixWorld.clone(),l.invProj.value=c.clone().invert(),l.invViewProj.value=v.clone().invert(),l.prevViewProjNoJitter.value=r?r.clone():u.clone(),l.cameraPos.value=new S().setFromMatrixPosition(a.matrixWorld),l.prevCameraPos.value=n?n.clone():l.cameraPos.value.clone(),l.near.value=a.near,l.far.value=a.far,l.resolution.value=new I(e,t),l.invResolution.value=new I(1/e,1/t),l.prevJitter.value=l.jitter.value?l.jitter.value.clone():new I,l.jitter.value=new I(d,m),l.reversedDepth.value=a.reversedDepth===!1?0:1}class Bn{constructor(){this.free=[]}acquire(){return this.free.pop()||{opaque:[],transparent:[],records:[],used:0}}release(e){for(let t=0;t<e.used;t++){const s=e.records[t];s.object=s.geometry=s.material=null}e.used=0,e.opaque.length=e.transparent.length=0,this.free.push(e)}}const En=(a,e)=>a.renderOrder-e.renderOrder||a.pipeKey-e.pipeKey||a.z-e.z,Nn=(a,e)=>a.renderOrder-e.renderOrder||e.z-a.z,On=(a,e)=>a.depthBucket-e.depthBucket||a.pipeKey-e.pipeKey||a.z-e.z,Ri=new WeakMap;let Un=0;const dt=256,Fi=40;class Wn{constructor(){this.pipelines=new Map,this.geometries=new WeakMap,this.capacity=8192,this.drawBuffer=null,this.drawData=null,this.drawCount=0,this.frame=-1,this.stats={draws:0,triangles:0,pipelines:0},this.optimizeSceneTransforms=!0,this._sceneTransformScopes=new WeakMap,this.optimizeSceneSubmission=!0,this.optimizeOpaqueDepthSort=!1,this.submissionStats={listLeases:0,drawRecordAllocations:0,pipelineBinds:0,vertexBindsSkipped:0,indexBindsSkipped:0,drawBindsSkipped:0},this._drawListPool=new Bn,this._collectionStates=[],this._collectionDepth=0,this._submissionStates=[],this._submissionDepth=0,this.drawLayout=null,this.drawBindGroup=null,this.syncPipelines=!0}_ensureDrawBuffer(){this.drawBuffer&&this.drawData.byteLength>=this.capacity*dt||(this.drawBuffer&&this.drawBuffer.destroy(),this.drawBuffer=z.device.createBuffer({label:"draws",size:this.capacity*dt,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.drawData=new Float32Array(this.capacity*dt/4),this.drawLayout=Ar([{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform",hasDynamicOffset:!0,minBindingSize:Fi*4}}],"draw"),this.drawBindGroup=z.device.createBindGroup({label:"draws",layout:this.drawLayout,entries:[{binding:0,resource:{buffer:this.drawBuffer,size:Fi*4}}]}))}_beginFrame(){this.frame!==z.frame&&(this.frame=z.frame,this._ensureDrawBuffer(),this.drawCount>this.capacity*.75&&(this.capacity*=2,this._ensureDrawBuffer()),this.drawCount=0,z.onSubmit(()=>{this.drawCount&&z.queue.writeBuffer(this.drawBuffer,0,this.drawData.buffer,0,this.drawCount*dt)}),this.stats.draws=0,this.stats.triangles=0)}_slot(e){let t=e.__draw;if(t||(t=e.__draw={frame:-1,slot:0,cur:new Float32Array(16),prev:new Float32Array(16),has:!1}),t.frame===z.frame)return t.slot;if(this.drawCount>=this.capacity)throw new Error("MeshRenderer: draw buffer full");t.frame=z.frame,t.slot=this.drawCount++;const s=e.matrixWorld.elements;t.has&&!e.resetVelocity?t.prev.set(t.cur):t.prev.set(s),t.cur.set(s),t.has=!0,e.resetVelocity=!1;const i=t.slot*dt/4,r=this.drawData;r.set(t.cur,i),r.set(e.staticVelocity?t.cur:t.prev,i+16);const n=e.drawParams;if(r[i+32]=e.id??0,r[i+33]=n?n[0]:0,r[i+34]=n?n[1]:0,r[i+35]=n?n[2]:0,n&&n.length>3)for(let o=0;o<4;o++)r[i+36+o]=n[3+o]??0;return t.slot}_geometryGPU(e){let t=this.geometries.get(e);return t||(t={buffers:new Map,index:null,indexVersion:-1},this.geometries.set(e,t),e.addEventListener&&e.addEventListener("dispose",()=>{for(const s of t.buffers.values())s.buffer.destroy();t.index&&t.index.buffer.destroy(),this.geometries.delete(e)})),t}_attributeBuffer(e,t){const s=this._geometryGPU(e),i=t.isInterleavedBufferAttribute?t.data:t;if(i.gpuBuffer)return i.gpuBuffer.getGPU?i.gpuBuffer.getGPU():i.gpuBuffer;let r=s.buffers.get(i);const n=i.version??0;if(r&&r.version===n&&r.array===i.array)return r.buffer;const o=Vn(t);if((!r||r.size<o.byteLength)&&(r&&r.buffer.destroy(),r={buffer:z.device.createBuffer({label:t.name||"attribute",size:Math.max(16,Yt(o.byteLength)),usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),size:o.byteLength,version:-1},s.buffers.set(i,r)),r.version!==n){const l=i.updateRanges&&i.updateRanges.length&&r.version>=0?i.updateRanges:null;if(l&&o.array===i.array){const h=i.array.BYTES_PER_ELEMENT;for(const c of l)z.queue.writeBuffer(r.buffer,c.start*h,i.array.buffer,i.array.byteOffset+c.start*h,Yt(c.count*h));i.clearUpdateRanges?i.clearUpdateRanges():i.updateRanges.length=0}else Bi(r.buffer,o);r.version=n}return r.array=i.array,r.buffer}_indexBuffer(e){const t=e.index;if(!t)return null;const s=this._geometryGPU(e);if(s.indexRef&&s.indexSrc===t.array&&s.indexVersion===(t.version??0))return s.indexRef;const i=t.array instanceof Uint16Array||t.array instanceof Uint32Array?t.array:new Uint32Array(t.array);return(!s.index||s.index.size<i.byteLength)&&(s.index&&s.index.buffer.destroy(),s.index={buffer:z.device.createBuffer({label:"index",size:Math.max(16,Yt(i.byteLength)),usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),size:i.byteLength},s.indexVersion=-1),s.indexVersion!==(t.version??0)&&(Bi(s.index.buffer,i),s.indexVersion=t.version??0),s.indexSrc=t.array,s.indexRef={buffer:s.index.buffer,format:i instanceof Uint16Array?"uint16":"uint32"},s.indexRef}_cachedLayout(e,t,s){let i=Ri.get(t);i||Ri.set(t,i=new Map);const r=e.isInstancedMesh?e.instanceColor?2:1:0,n=r?s.id+":"+r:s.id;let o=i.get(n);if(o&&o.version===s.version&&o.attrsVersion===t.attributesVersion&&(!r||o.instanceMatrix===e.instanceMatrix)){const c=o.refs,u=o.names,d=t.attributes;let m=!0;for(let v=0;v<u.length;v++)if(d[u[v]]!==c[v]){m=!1;break}if(m)return o.vl}const l=this._layout(e,t,s),h=l.layout.filter(c=>!c.name.startsWith("instance")).map(c=>c.name);return o={version:s.version,attrsVersion:t.attributesVersion,instanceMatrix:e.instanceMatrix,names:h,refs:h.map(c=>t.attributes[c]),vl:l},l.pipelines=new Map,i.set(n,o),l}_layout(e,t,s){const i=[],r=["position","normal","uv","color",...Object.keys(s.attributes)];for(const u of r){const d=t.attributes[u];d&&!(u==="color"&&!s.vertexColors&&!s.attributes.color)&&i.push({name:u,attr:d})}if(e.isInstancedMesh){for(let u=0;u<4;u++)i.push({name:"instanceMatrix"+u,attr:e.instanceMatrix,column:u});e.instanceColor&&i.push({name:"instanceColor",attr:e.instanceColor})}const n=[],o=[],l=new Map;let h=0;for(const u of i){const d=u.attr,m=d.isInterleavedBufferAttribute?d.data:d,v=!!(d.isInstancedBufferAttribute||m.isInstancedInterleavedBuffer||d.meshPerAttribute||m.meshPerAttribute)||u.name.startsWith("instance"),p=Br(d);let f=l.get(m);if(f===void 0){f=n.length,l.set(m,f);const g=d.isInterleavedBufferAttribute?d.data.stride*p.bytesPerComponent:d.itemSize*p.bytesPerComponent;n.push({src:m,attr:d,layout:{arrayStride:p.converted?p.itemSize*4:g,stepMode:v?"instance":"vertex",attributes:[]}})}let x=d.isInterleavedBufferAttribute?d.offset*p.bytesPerComponent:0,w=p.format,y=p.wgsl;u.column!==void 0&&(x=u.column*16,w="float32x4",y="vec4f"),n[f].layout.attributes.push({shaderLocation:h,offset:x,format:w}),(u.name==="position"||u.name==="normal")&&(y="vec3f"),u.name==="uv"&&(y="vec2f"),u.name==="color"&&(y=d.itemSize===4?"vec4f":"vec3f"),u.name==="instanceColor"&&(y="vec3f"),s.attributes[u.name]&&(y=s.attributes[u.name]),o.push({name:u.name,wgsl:y,location:h,instanced:v}),h++}return{key:o.map(u=>`${u.name}:${u.wgsl}`).join(",")+"|"+n.map(u=>`${u.layout.arrayStride}/${u.layout.stepMode}/${u.layout.attributes.map(d=>d.format+"@"+d.offset).join(";")}`).join(","),layout:o,buffers:n}}_pipeline(e,t,s){e.__pkFrame!==z.frame&&(e.__pk=e.pipelineKey()+"|"+It.version,e.__pkFrame=z.frame);const i=s.passKey;let r=t.pipelines&&t.pipelines.get(i);if(r&&r.materialKey===e.__pk)return r.p;const n=`${e.__pk}|${t.key}|${i}`;let o=this.pipelines.get(n);return o||(o=this._createPipeline(e,t,s,n)),t.pipelines&&t.pipelines.set(i,{materialKey:e.__pk,p:o}),o}_createPipeline(e,t,s,i){const r=In(e,t.layout,s),n=Hs({modules:r.modules,bindings:r.bindings,code:r.code,defines:r.defines,stage:"render",label:e.name}),o=$s(n.code,e.name);this._ensureDrawBuffer();const l=z.device.createPipelineLayout({bindGroupLayouts:[n.group0.layout,n.bindings.layout,this.drawLayout]}),h=Xt(e.blending);let c=[];s.kind==="main"?c=[{format:s.colorFormats[0],blend:e.transparent||s.late?h:void 0,writeMask:e.colorWrite?GPUColorWrite.ALL:0},{format:s.colorFormats[1],blend:s.late?Xt("premultiplied"):void 0,writeMask:e.colorWrite?GPUColorWrite.ALL:0},{format:s.colorFormats[2],blend:Xt("normal"),writeMask:e.colorWrite?GPUColorWrite.ALL:0}]:s.kind==="color"&&(c=s.colorFormats.map(f=>({format:f,blend:h,writeMask:e.colorWrite?GPUColorWrite.ALL:0})));const u=e.side,d=s.cullOverride||(u==="double"?"none":u==="back"?"front":"back"),m=e.depthTest?e.depthCompare||s.depthCompare:"always",v={label:e.name+" "+s.kind,layout:l,vertex:{module:o,entryPoint:"vs",buffers:t.buffers.map(f=>f.layout)},primitive:{topology:e.topology,cullMode:d,frontFace:"ccw"}};r.hasFragment&&(v.fragment={module:o,entryPoint:"fs",targets:c}),s.depthFormat&&(v.depthStencil={format:s.depthFormat,depthWriteEnabled:e.depthWrite,depthCompare:m,depthBias:s.kind==="depth"?s.depthBias||0:e.depthBias,depthBiasSlopeScale:s.kind==="depth"?s.depthBiasSlopeScale||0:e.depthBiasSlopeScale});const p={handle:z.renderPipeline(v),bindings:n.bindings,label:v.label};return this.pipelines.set(i,p),this.stats.pipelines=this.pipelines.size,p}withSceneTransforms(e,t){if(!this.optimizeSceneTransforms||this.precompiling)return t();const s=this._sceneTransformScopes.get(e);this._sceneTransformScopes.set(e,{frame:z.frame,updated:!1});try{return t()}finally{s?this._sceneTransformScopes.set(e,s):this._sceneTransformScopes.delete(e)}}invalidateSceneTransforms(e){const t=this._sceneTransformScopes.get(e);t&&(t.updated=!1)}collect(e,{camera:t,layerMask:s=4294967295,filter:i=null,kind:r="main",cull:n=!0,late:o=!1},l=null){const h=this._collectionDepth++,c=this._collectionStates[h]||(this._collectionStates[h]={frustum:new ss,sphere:new Ee,vp:new C,view:new C,camPos:new S,sortItems:[]}),u=l||{opaque:[],transparent:[]};c.camera=t,c.layerMask=s,c.filter=i,c.kind=r,c.cull=n,c.lists=u,c.pooled=l,c.all=this.precompiling,c.depthSort=this.optimizeOpaqueDepthSort&&!this.precompiling&&r==="main"&&!o&&!!t?.isPerspectiveCamera;try{c.camPos.set(0,0,0),t&&(t.updateMatrixWorld(),c.view.copy(t.matrixWorldInverse.copy(t.matrixWorld).invert()),c.vp.multiplyMatrices(t.projectionMatrix,c.view),c.frustum.setFromProjectionMatrix(c.vp,t.coordinateSystem,t.reversedDepth!==!1),c.camPos.setFromMatrixPosition(t.matrixWorld));const d=this.optimizeSceneTransforms&&!this.precompiling?this._sceneTransformScopes.get(e):null;return(!d||!d.updated||d.frame!==z.frame)&&(e.updateMatrixWorld(),d&&(d.frame=z.frame,d.updated=!0)),this._collectObject(e,c),u.opaque.sort(En),c.depthSort&&this._sortOpaqueDepth(u.opaque,c.sortItems),u.transparent.sort(Nn),u}finally{c.camera=c.filter=c.lists=c.pooled=null,c.sortItems.length=0,this._collectionDepth--}}_collectObject(e,t){const{all:s,camera:i}=t;if(!(!e.visible&&!s)){e.isMesh&&e.material&&e.geometry&&(e.layers.mask&t.layerMask)!==0&&(!t.filter||t.filter(e))&&(t.kind!=="depth"||e.castShadow)&&(s||!t.cull||!i||e.frustumCulled===!1||this._inFrustum(e,t))&&(e.onBeforeRender&&e.onBeforeRender(null,null,i,e.geometry,e.material,null),(e.visible||s)&&this._addItems(e,t));for(const r of e.children)this._collectObject(r,t)}}_inFrustum(e,t){let s=null;return e.isInstancedMesh?(!e.boundingSphere&&e.computeBoundingSphere&&e.computeBoundingSphere(),s=e.boundingSphere):(e.geometry.boundingSphere||e.geometry.computeBoundingSphere(),s=e.geometry.boundingSphere),!s||s.radius<0||!Number.isFinite(s.radius)?!0:(t.sphere.copy(s).applyMatrix4(e.matrixWorld),t.frustum.intersectsSphere(t.sphere))}_addItems(e,t){const s=e.geometry,i=Array.isArray(e.material)?e.material:null,r=e.matrixWorld.elements,n=t.camPos,o=r[12]-n.x,l=r[13]-n.y,h=r[14]-n.z,c=o*o+l*l+h*h,u=s.drawRange?.start??0,d=s.drawRange?.count??1/0;let m=-1;if(t.depthSort&&e.frustumCulled!==!1&&!e.isInstancedMesh&&s.boundingSphere&&Number.isFinite(s.boundingSphere.radius)&&s.boundingSphere.radius>=0){const v=t.sphere.copy(s.boundingSphere).applyMatrix4(e.matrixWorld),p=t.view.elements,f=v.center,x=-(p[2]*f.x+p[6]*f.y+p[10]*f.z+p[14])-v.radius;m=Math.floor(Math.max(0,x)/32)}if(i&&s.groups&&s.groups.length)for(const v of s.groups){const p=Math.max(v.start,u),f=Math.min(v.start+v.count,u+d);f>p&&this._pushItem(e,s,i[v.materialIndex],p,f-p,c,m,t)}else this._pushItem(e,s,i?i[0]:e.material,u,d,c,m,t)}_pushItem(e,t,s,i,r,n,o,l){if(!s||!s.visible&&!l.all)return;let h;if(l.pooled){const c=l.pooled,u=c.used++;h=c.records[u],h||(h=c.records[u]={},this.submissionStats.drawRecordAllocations++)}else h={};h.object=e,h.geometry=t,h.material=s,h.start=i,h.count=r,h.z=n,h.renderOrder=e.renderOrder||0,h.pipeKey=s.id,h.depthBucket=!s.transparent&&s.depthTest&&s.depthWrite&&s.blending==="none"&&!s.depthCompare&&s.topology==="triangle-list"?o:-1,(s.transparent?l.lists.transparent:l.lists.opaque).push(h)}_sortOpaqueDepth(e,t){let s=0;for(;s<e.length;){if(e[s].depthBucket<0){s++;continue}let i=s+1;const r=e[s].renderOrder;for(;i<e.length&&e[i].depthBucket>=0&&e[i].renderOrder===r;)i++;if(i-s>1){for(let n=s;n<i;n++)t.push(e[n]);t.sort(On);for(let n=s;n<i;n++)e[n]=t[n-s];t.length=0}s=i}}render(e,t){this._beginFrame(),t={kind:"main",late:!1,colorFormats:[],depthFormat:null,depthCompare:"greater-equal",frameBlock:re,layerMask:4294967295,...t},t.passKey=`${t.kind}.${t.late?1:0}.${t.colorFormats.join(",")}.${t.depthFormat}.${t.depthCompare}.${t.cullOverride||""}.${t.defines?JSON.stringify(t.defines):""}`;const s=this.optimizeSceneSubmission&&!t.items&&!this.precompiling?this._drawListPool.acquire():null;s&&this.submissionStats.listLeases++;try{this._renderPass(t.items||this.collect(e,t,s),t)}finally{s&&this._drawListPool.release(s)}}_renderPass(e,t){const s=z.getEncoder(),i=(t.colorViews||[]).map((o,l)=>{const h=t.clearColors?t.clearColors[l]:null;return{view:o,loadOp:h?"clear":"load",storeOp:"store",clearValue:h||[0,0,0,0]}}),r={label:t.label||t.kind,colorAttachments:i};t.depthView&&(r.depthStencilAttachment={view:t.depthView,depthLoadOp:t.clearDepth===null||t.clearDepth===void 0?"load":"clear",depthStoreOp:"store",depthClearValue:t.clearDepth??0}),t.timestampWrites&&(r.timestampWrites=t.timestampWrites);const n=s.beginRenderPass(r);t.viewport&&n.setViewport(...t.viewport),n.setBindGroup(0,Cr(t.frameBlock,"render").getBindGroup()),this.drawItems(n,e.opaque,t),t.betweenLists&&t.betweenLists(n),this.drawItems(n,e.transparent,t),t.after&&t.after(n),n.end()}drawItems(e,t,s){if(!this.optimizeSceneSubmission||this.precompiling)return this._drawItems(e,t,s,null);const i=this._submissionDepth++,r=this._submissionStates[i]||(this._submissionStates[i]={vertexBuffers:[],offsets:new Uint32Array(1),indexBuffer:null,indexFormat:null,drawGroup:null,drawOffset:-1});try{return this._drawItems(e,t,s,r)}finally{r.vertexBuffers.length=0,r.indexBuffer=r.indexFormat=r.drawGroup=null,r.drawOffset=-1,this._submissionDepth--}}_drawItems(e,t,s,i){let r=null,n=null;const o=++Un;for(const l of t){const{object:h,geometry:c,material:u}=l;if(!c.attributes.position&&!c.vertexCount&&!c.indirect)continue;let d,m;if(this.precompiling){try{d=this._cachedLayout(h,c,u),m=this._pipeline(u,d,s)}catch{continue}continue}d=this._cachedLayout(h,c,u),m=this._pipeline(u,d,s);const v=m.handle.pipeline||(this.syncPipelines?z.ready(m.handle):null);if(!v)continue;m!==r&&(e.setPipeline(v),this.submissionStats.pipelineBinds++,r=m);const p=m.bindings.getBindGroup(o);p!==n&&(e.setBindGroup(1,p),n=p);const f=this._slot(h)*dt;i?i.drawGroup!==this.drawBindGroup||i.drawOffset!==f?(i.offsets[0]=f,e.setBindGroup(2,this.drawBindGroup,i.offsets,0,1),i.drawGroup=this.drawBindGroup,i.drawOffset=f):this.submissionStats.drawBindsSkipped++:e.setBindGroup(2,this.drawBindGroup,[f]);for(let y=0;y<d.buffers.length;y++){const g=this._attributeBuffer(c,d.buffers[y].attr);!i||i.vertexBuffers[y]!==g?(e.setVertexBuffer(y,g),i&&(i.vertexBuffers[y]=g)):this.submissionStats.vertexBindsSkipped++}const x=h.isInstancedMesh?h.count:c.instanceCount??1;if(x===0)continue;const w=this._indexBuffer(c);if(c.indirect){const y=c.indirect.buffer.getGPU?c.indirect.buffer.getGPU():c.indirect.buffer,g=c.indirect.offsets;w&&this._bindIndex(e,w,i);const b=g?g.length:1;for(let M=0;M<b;M++){const _=g?g[M]:c.indirect.offset||0;w?e.drawIndexedIndirect(y,_):e.drawIndirect(y,_),this.stats.draws++}continue}if(w){const y=Math.min(l.count,c.index.count-l.start);if(y<=0)continue;this._bindIndex(e,w,i),e.drawIndexed(y,x===1/0?1:x,l.start,0,0),this.stats.triangles+=y/3*x}else{const y=c.attributes.position?c.attributes.position.count:c.vertexCount,g=Math.min(l.count,y-l.start);if(g<=0)continue;e.draw(g,x,l.start,0),this.stats.triangles+=g/3*x}this.stats.draws++}}_bindIndex(e,t,s){!s||s.indexBuffer!==t.buffer||s.indexFormat!==t.format?(e.setIndexBuffer(t.buffer,t.format),s&&(s.indexBuffer=t.buffer,s.indexFormat=t.format)):this.submissionStats.indexBindsSkipped++}}function Yt(a){return Math.ceil(a/4)*4}function Bi(a,e){if(e.byteLength%4===0){z.queue.writeBuffer(a,0,e.buffer,e.byteOffset,e.byteLength);return}const t=new Uint8Array(Yt(e.byteLength));t.set(new Uint8Array(e.buffer,e.byteOffset,e.byteLength)),z.queue.writeBuffer(a,0,t)}const Ei=new WeakMap;function Vn(a){const e=a.isInterleavedBufferAttribute?a.data:a;if(!Br(a).converted)return e.array;let s=Ei.get(e);if(s&&s.version===e.version)return s.array;const i=a.count,r=a.itemSize,n=new Float32Array(i*r),o=a.normalized?Gn(e.array):1;for(let l=0;l<i*r;l++)n[l]=e.array[l]/o;return Ei.set(e,{version:e.version,array:n}),n}function Gn(a){return a instanceof Uint8Array?255:a instanceof Int8Array?127:a instanceof Uint16Array?65535:a instanceof Int16Array?32767:1}function Br(a){const t=(a.isInterleavedBufferAttribute?a.data:a).array,s=a.itemSize,i=a.normalized,r=o=>s===1?o:`vec${s}${o==="f32"?"f":o==="u32"?"u":"i"}`;if(t instanceof Float32Array)return{format:s===1?"float32":`float32x${s}`,wgsl:r("f32"),bytesPerComponent:4,itemSize:s};if(t instanceof Uint32Array)return{format:s===1?"uint32":`uint32x${s}`,wgsl:r("u32"),bytesPerComponent:4,itemSize:s};if(t instanceof Int32Array)return{format:s===1?"sint32":`sint32x${s}`,wgsl:r("i32"),bytesPerComponent:4,itemSize:s};const n={Uint8Array:["uint8","unorm8",1],Int8Array:["sint8","snorm8",1],Uint16Array:["uint16","unorm16",2],Int16Array:["sint16","snorm16",2]}[t.constructor.name];if(n&&(s===2||s===4)&&!a.isInterleavedBufferAttribute){const o=(i?n[1]:n[0])+"x"+s,l=r(i?"f32":t instanceof Uint8Array||t instanceof Uint16Array?"u32":"i32");return{format:o,wgsl:l,bytesPerComponent:n[2],itemSize:s}}return{format:s===1?"float32":`float32x${s}`,wgsl:r("f32"),bytesPerComponent:4,itemSize:s,converted:!0}}class Hn{constructor(){this.sample={wallDt:0,valid:!1,reset:!0},this.invalidate()}invalidate(){this.previous=null}update(e,t=!1){const s=this.sample;if(s.wallDt=0,s.valid=!1,s.reset=!0,t||!Number.isFinite(e))return this.invalidate(),s;const i=this.previous;return this.previous=e,i===null||e<=i||(s.wallDt=(e-i)/1e3,s.valid=!0,s.reset=!1),s}}class $n{constructor(e){this.container=e,this.renderScale=1,this.maxOutputPixels=1/0,this.clock=new Ua,this._frameTiming=new Hn,this.activeFrameTiming=null,this.frame=0,this.onResize=[]}async init(){const e=document.createElement("canvas");e.tabIndex=0,this.container.appendChild(e),this.canvas=e,this.domElement=e,await z.init({canvas:e}),this.meshRenderer=new Wn,this.meshRenderer.syncPipelines=!1,this.camera=new vr(62,window.innerWidth/window.innerHeight,.06,6e4),this.scene=new Ns,window.addEventListener("resize",()=>this.resize()),this.resize()}setRenderScale(e){this.renderScale=e,this.resize()}get width(){return this.canvas.width}get height(){return this.canvas.height}resize(){const e=window.innerWidth,t=window.innerHeight,s=Math.min(this.renderScale,Math.sqrt(this.maxOutputPixels/(e*t)));this.canvas.width=Math.max(1,Math.floor(e*s)),this.canvas.height=Math.max(1,Math.floor(t*s)),this.canvas.style.width=e+"px",this.canvas.style.height=t+"px",this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),re.fields.outputResolution.value.set(this.canvas.width,this.canvas.height);for(const i of this.onResize)i(e,t)}currentTexture(){return z.context.getCurrentTexture()}start(e){this.stop(),this._running=!0,this._frameTiming.invalidate(),this.clock.reset(),this._visibilityDocument=typeof document>"u"?null:document,this._visibilityDocument&&(this.clock.connect(this._visibilityDocument),this._visibilityHandler=()=>this._frameTiming.invalidate(),this._visibilityDocument.addEventListener("visibilitychange",this._visibilityHandler));const t=s=>{if(!this._running||this._loop!==t)return;this.clock.update(s);const i=this._visibilityDocument?.hidden===!0,r=this._frameTiming.update(s,i);if(!i){const n=r.valid?Math.max(0,Math.min(this.clock.getDelta(),.1)):0;this.frame++,this.activeFrameTiming=r;try{e(n,this.clock.getElapsed(),r)}finally{this.activeFrameTiming=null}}this._running&&this._loop===t&&(this._raf=requestAnimationFrame(t))};this._loop=t,this._raf=requestAnimationFrame(t)}stop(){this._running=!1,this._loop=null,this._raf!==void 0&&cancelAnimationFrame(this._raf),this._raf=void 0,this.clock.disconnect(),this._visibilityHandler&&(this._visibilityDocument.removeEventListener("visibilitychange",this._visibilityHandler),this._visibilityHandler=null),this._visibilityDocument=null,this._frameTiming.invalidate()}}const qn=`
struct FSIn { @builtin( position ) pos: vec4f, @location( 0 ) uv: vec2f };
@vertex fn vs( @builtin( vertex_index ) i: u32 ) -> FSIn {
	let p = vec2f( f32( ( i << 1u ) & 2u ), f32( i & 2u ) );
	var o: FSIn;
	o.pos = vec4f( p * 2.0 - 1.0, FS_DEPTH, 1.0 );
	o.uv = vec2f( p.x, 1.0 - p.y );
	return o;
}
`;class X{constructor({label:e="fullscreen",modules:t=[],bindings:s={},code:i,colorFormats:r=["rgba16float"],blend:n="none",defines:o={},depthFormat:l=null,depthCompare:h="always",depthWrite:c=!1,depth:u=0,writeMasks:d=null,blends:m=null}){this.label=e,this.colorFormats=r;const v=i.includes("@fragment")?i:`${i}
@fragment fn fs( in: FSIn ) -> @location( 0 ) vec4f { return fragment( in ); }
`,p=Hs({modules:[B,...t],bindings:s,code:qn.replace("FS_DEPTH",u.toFixed(6))+v,defines:o,stage:"render",label:e});this.source=p.code,this.bindings=p.bindings;const f=$s(p.code,e),x={label:e,layout:z.device.createPipelineLayout({bindGroupLayouts:[p.group0.layout,p.bindings.layout]}),vertex:{module:f,entryPoint:"vs"},fragment:{module:f,entryPoint:"fs",targets:r.map((w,y)=>({format:w,blend:Xt(m?m[y]:y===0?n:"none"),writeMask:d?d[y]:GPUColorWrite.ALL}))},primitive:{topology:"triangle-list"}};l&&(x.depthStencil={format:l,depthCompare:h,depthWriteEnabled:c}),this.handle=z.renderPipeline(x),this.timestampWrites=null}get pipeline(){return z.ready(this.handle)}draw(e,t=re){e.setPipeline(z.ready(this.handle)),e.setBindGroup(0,Cr(t,"render").getBindGroup()),e.setBindGroup(1,this.bindings.getBindGroup()),e.draw(3)}render({colorViews:e,clear:t=null,viewport:s=null,frameBlock:i=re,depthView:r=null,encoder:n=z.getEncoder()}={}){const o=e.map(c=>c.isTexture?c.view({dimension:"2d",mipLevelCount:1}):c),l={label:this.label,colorAttachments:o.map(c=>({view:c,loadOp:t?"clear":"load",storeOp:"store",clearValue:t||[0,0,0,0]}))};r&&(l.depthStencilAttachment={view:r,depthLoadOp:"load",depthStoreOp:"store"}),this.timestampWrites&&(l.timestampWrites=this.timestampWrites);const h=n.beginRenderPass(l);s&&h.setViewport(...s),this.draw(h,i),h.end()}}const Ni=new S,jn=new Ee,Oi=new ss,Xn=new C,Yn=new C,ys={OPAQUE:0,WATER:1,TRANSPARENT:2},Kn=["rgba16float","rgba16float","rgba8unorm"],gt="depth32float";class Zn{constructor(e,t,s){this.meshRenderer=e,this.scene=t,this.camera=s,this.scale=1,this.width=1,this.height=1,this.sceneRT=new j(1,1,{colors:[{format:"rgba16float",name:"color"},{format:"rgba16float",name:"velocity"},{format:"rgba8unorm",name:"waterMask"}],depth:gt,label:"scene"}),this.velocityTexture=this.sceneRT.textures[1],this.waterMaskTexture=this.sceneRT.textures[2],this.opaqueCopy=new j(1,1,{colors:["rgba16float"],depth:gt,label:"opaqueCopy"}),this.opaqueDepthHalf=new j(1,1,{colors:["r16float"],label:"opaqueDepthHalf"}),this._depthHalfPass=null,this.optimizeWaterDepthCopy=!0,this.waterMaterial=null,this.hullMaskRT=new j(1,1,{colors:["r16float"],depth:gt,label:"hullMask"}),this.hullMaskScene=new Ns,this.hullMaskMaterial=new Y({name:"hullMask",lit:!1,side:"double",surface:"s.albedo = vec3f( length( in.P - frame.cameraPos ), 0.0, 0.0 ); s.emissive = vec3f( 0.0 );"}),this.hullMasks=[],this.hullMaskActive={value:0},this.background=null,this.clearColor=[0,0,0,1],this.onBeforeWater=null}setSize(e,t){this.width=e,this.height=t,this.sceneRT.setSize(e,t),this.opaqueCopy.setSize(e,t),this.opaqueDepthHalf.setSize(e,t),this.hullMaskRT.setSize(e,t)}addHullMask(e,t){e.computeBoundingBox(),e.computeBoundingSphere();const s=new ce(e,this.hullMaskMaterial);return s.matrixAutoUpdate=!1,s.frustumCulled=!1,this.hullMaskScene.add(s),this.hullMasks.push({mesh:s,object:t,box:e.boundingBox.clone().expandByScalar(.05),sphere:e.boundingSphere}),s}_renderHullMasks(e){let t=0;Oi.setFromProjectionMatrix(Xn.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse));for(const i of this.hullMasks){i.object.updateWorldMatrix(!0,!1),i.mesh.matrix.copy(i.object.matrixWorld),i.mesh.matrixWorld.copy(i.object.matrixWorld),Ni.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Yn.copy(i.object.matrixWorld).invert());const r=!i.box.containsPoint(Ni)&&Oi.intersectsSphere(jn.copy(i.sphere).applyMatrix4(i.object.matrixWorld));i.mesh.visible=r,r&&t++}if(this.hullMaskActive.value=t>0?1:0,!t)return;const s=this.hullMaskRT;this.meshRenderer.render(this.hullMaskScene,{label:"hull mask",kind:"color",camera:e,colorViews:[s.texture.view()],colorFormats:s.formats,clearColors:[[0,0,0,0]],depthView:s.depthTexture.view(),depthFormat:gt,clearDepth:0,cull:!1})}render(){const{scene:e,camera:t,meshRenderer:s}=this,i=this.sceneRT,r=i.textures.map(h=>h.view()),n={camera:t,colorViews:r,colorFormats:i.formats,depthView:i.depthTexture.view(),depthFormat:gt,kind:"main"};s.render(e,{...n,label:"opaque",layerMask:1<<ys.OPAQUE,clearColors:[this.clearColor,[0,0,0,0],[0,0,0,0]],clearDepth:0,after:this.background?h=>this.background.draw(h):null});const o=z.getEncoder(),l={width:i.width,height:i.height};o.copyTextureToTexture({texture:i.texture.getGPU()},{texture:this.opaqueCopy.texture.getGPU()},l),o.copyTextureToTexture({texture:i.depthTexture.getGPU()},{texture:this.opaqueCopy.depthTexture.getGPU()},l),this._depthHalfPass||(this._depthHalfPass=new X({label:"opaque depth half",colorFormats:["r16float"],bindings:{srcDepth:{texture:()=>this.opaqueCopy.depthTexture}},code:"fn fragment( in: FSIn ) -> vec4f { return vec4f( textureLoad( srcDepth, vec2i( in.pos.xy ), 0 ), 0.0, 0.0, 1.0 ); }"})),(!this.optimizeWaterDepthCopy||this.waterMaterial?.needsSSRDepth!==!1)&&this._depthHalfPass.render({colorViews:[this.opaqueDepthHalf.texture],clear:[0,0,0,0]}),this.hullMasks.length>0&&this._renderHullMasks(t),this.onBeforeWater&&this.onBeforeWater(),s.render(e,{...n,label:"water + transparent",late:!0,layerMask:1<<ys.WATER|1<<ys.TRANSPARENT})}}const Fs=[];for(let a=0;a<8;a++)Fs.push(new S);const Mt=new S,Qn=new S(0,1,0),Ui=new C,Jn=new S,eo=new Q;class to{constructor({size:e=2048,splits:t=[10,60,400],lightMargin:s=200,normalBias:i=[.015,.06,.3],bias:r=2e-5,pcssCascades:n=1}={}){this.size=e,this.splits=t,this.count=t.length,this.lightMargin=s,this.normalBias=i,this.periods=t.map((l,h)=>h===0?1:h===1?2:4),this.texture=new W({label:"sunShadowMap",width:e,height:e,depth:this.count,dimension:"2d-array",format:"depth32float",usage:["sample","render"]}),An(this.texture),this.cascades=t.map((l,h)=>({camera:{matrixWorld:new C,matrixWorldInverse:new C,projectionMatrix:new C,near:0,far:1,reversedDepth:!1,updateMatrixWorld(){},isCamera:!0,isShadowCamera:!0},block:Fn("shadowView"+h),viewProj:new C,radius:0,dirty:!0})),this.enabled=!0,this.layerMask=4294967295,this.frame=0,this.lastSun=new S(0,-2,0);const o=At.fields;o.count.value=this.count,o.mapSize.value=e,o.bias.value=r,o.pcssCascades.value=n,o.enabled.value=1}_margin(e){const t=this.splits[this.count-1],s=e/t;return Math.max(.25*s*s,.25*s)*t}_fit(e,t,s){const i=this.cascades[e],r=e===0?0:this.splits[e-1],n=this.splits[e],o=this._margin(r),l=this._margin(n),h=Math.max(t.near,r-o*.5),c=e===this.count-1?n:n+l*.5;At.fields.blend.value[e]=new Q(r,n,o,l);const u=Math.tan(t.fov*Math.PI/360),d=u*t.aspect;let m=0;for(const A of[h,c])for(const k of[-1,1])for(const F of[-1,1])Fs[m++].set(k*d*A,F*u*A,-A).applyMatrix4(t.matrixWorld);const v=Math.min(c,(h+c)/2*(1+d*d+u*u));Mt.set(0,0,-v).applyMatrix4(t.matrixWorld);let p=0;for(const A of Fs)p=Math.max(p,A.distanceTo(Mt));p=Math.ceil(p*16)/16,i.radius=p;const f=i.camera,x=s,w=Math.abs(x.y)>.99?Jn.set(1,0,0):Qn;f.matrixWorld.lookAt(x,new S(0,0,0),w),Ui.copy(f.matrixWorld).invert();const y=2*p/this.size,g=eo.set(Mt.x,Mt.y,Mt.z,1).applyMatrix4(Ui);g.x=Math.round(g.x/y)*y,g.y=Math.round(g.y/y)*y;const b=p+this.lightMargin,M=new S(g.x,g.y,g.z+b).applyMatrix4(f.matrixWorld);f.matrixWorld.setPosition(M),f.matrixWorldInverse.copy(f.matrixWorld).invert();const _=.1,P=b+p;f.near=_,f.far=P,so(f.projectionMatrix,-p,p,p,-p,_,P),i.viewProj.multiplyMatrices(f.projectionMatrix,f.matrixWorldInverse);const T=At.fields;T.matrices.value[e]=i.viewProj.clone(),T.cascades.value[e]=new Q(c,y,this.normalBias[e]??.05,P-_)}update(e,t){if(this.frame++,At.fields.enabled.value=this.enabled&&t.y>-.05?1:0,!this.enabled)return[];e.updateMatrixWorld();const s=this.lastSun.angleTo(t)>1e-4;this.lastSun.copy(t);const i=[];for(let r=0;r<this.count;r++)(s||this.cascades[r].dirty||(this.frame+r)%this.periods[r]===0)&&(this._fit(r,e,t),this.cascades[r].dirty=!1,i.push(r));return i}render(e,t,s){for(const i of s){const r=this.cascades[i];Fr(r.camera,this.size,this.size,{block:r.block}),t.render(e,{label:"shadow cascade "+i,kind:"depth",camera:r.camera,frameBlock:r.block,depthView:this.texture.view({dimension:"2d",baseArrayLayer:i,arrayLayerCount:1}),depthFormat:"depth32float",clearDepth:1,depthCompare:"less-equal",layerMask:this.layerMask,depthBias:2,depthBiasSlopeScale:1.5})}}}function so(a,e,t,s,i,r,n){const o=1/(t-e),l=1/(s-i),h=1/(n-r);return a.set(2*o,0,0,-(t+e)*o,0,2*l,0,-(s+i)*l,0,0,-h,-r*h,0,0,0,1),a}class J{constructor({label:e="kernel",modules:t=[],bindings:s={},code:i,workgroupSize:r=[64,1,1],defines:n={},entryPoint:o="main"}){this.label=e,this.workgroupSize=r;const[l,h=1,c=1]=r,u=i.replace(/\bWG_X\b/g,l).replace(/\bWG_Y\b/g,h).replace(/\bWG_Z\b/g,c),d=Hs({modules:t,bindings:s,code:u,defines:n,stage:"compute",label:e});this.source=d.code,this.bindings=d.bindings,this.group0=d.group0;const m=$s(d.code,e);this.handle=z.computePipeline({label:e,layout:z.device.createPipelineLayout({bindGroupLayouts:[d.group0.layout,d.bindings.layout]}),compute:{module:m,entryPoint:o}}),this.timestampWrites=null}get pipeline(){return z.ready(this.handle)}dispatch(e,{pass:t=null,indirect:s=null}={}){const[i,r=1,n=1]=Array.isArray(e)?e:[e];if(!s&&(i===0||r===0||n===0))return;const o=l=>{l.setPipeline(z.ready(this.handle)),l.setBindGroup(0,this.group0.getBindGroup()),l.setBindGroup(1,this.bindings.getBindGroup()),s?l.dispatchWorkgroupsIndirect(s.buffer.getGPU?s.buffer.getGPU():s.buffer,s.offset||0):l.dispatchWorkgroups(i,r,n)};t?o(t):z.computePass(this.label,o,this.timestampWrites||void 0)}groups(e,t=1,s=1){const[i,r=1,n=1]=this.workgroupSize;return[Math.ceil(e/i),Math.ceil(t/r),Math.ceil(s/n)]}}class io{constructor({byteLength:e,ring:t=3,label:s="readback"}){this.byteLength=Math.ceil(e/4)*4,this.label=s,this.ring=[];for(let i=0;i<t;i++)this.ring.push({buffer:null,busy:!1,frame:0});this.latest=null,this.frame=-1,this.onData=null}_slot(){for(const e of this.ring)if(!e.busy)return e.buffer||(e.buffer=z.device.createBuffer({label:this.label,size:this.byteLength,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST})),e;return null}request(e,t=0){const s=this._slot();if(!s)return!1;s.busy=!0,s.frame=z.frame;const i=e.getGPU?e.getGPU():e;return z.getEncoder().copyBufferToBuffer(i,t,s.buffer,0,this.byteLength),z.onSubmit(null,()=>{s.buffer.mapAsync(GPUMapMode.READ).then(()=>{const r=s.buffer.getMappedRange().slice(0);s.buffer.unmap(),s.busy=!1,s.frame>=this.frame&&(this.latest=r,this.frame=s.frame,this.onData&&this.onData(r,s.frame))}).catch(()=>{s.busy=!1})}),!0}}const Bs=6360,ro=6460,Kt=11,ao=.004675*1.15,De=256,Le=64,de=32,ye=192,we=108,Wi=Math.log(1.02),R=a=>{const e=String(a);return e.includes(".")||e.includes("e")?e:e+".0"};function ws(a,e,t){return new W({label:t,width:a,height:e,format:"rgba16float",usage:["sample","storage"]})}function no(){return`
const ATMO_RG: f32 = ${R(Bs)};
const ATMO_RT: f32 = ${R(ro)};

struct AtmosphereMedium {
	rayScat: vec3f,
	mieScat: f32,
	extinction: vec3f,
	scattering: vec3f,
};

fn atmosphereMedium( hKm: f32 ) -> AtmosphereMedium {
	let rayDensity = exp( - hKm / 8.0 );
	let mieDensity = exp( - hKm / 1.2 );
	let ozoneDensity = max( 0.0, 1.0 - abs( hKm - 25.0 ) / 15.0 );
	var m: AtmosphereMedium;
	m.rayScat = vec3f( 5.802e-3, 13.558e-3, 33.1e-3 ) * rayDensity * atmosphereParams.rayleighScale;
	m.mieScat = 3.996e-3 * mieDensity * atmosphereParams.mieScale;
	let mieExt = 4.440e-3 * mieDensity * atmosphereParams.mieScale;
	let ozoneAbs = vec3f( 0.650e-3, 1.881e-3, 0.085e-3 ) * ozoneDensity * atmosphereParams.ozoneScale;
	m.extinction = m.rayScat + mieExt + ozoneAbs;
	m.scattering = m.rayScat + m.mieScat;
	return m;
}

// (r, mu) -> transmittance LUT uv
fn atmosphereTransmittanceUV( r: f32, mu: f32 ) -> vec2f {
	let H = sqrt( ATMO_RT * ATMO_RT - ATMO_RG * ATMO_RG );
	let rho = sqrt( max( r * r - ATMO_RG * ATMO_RG, 0.0 ) );
	let disc = r * r * ( mu * mu - 1.0 ) + ATMO_RT * ATMO_RT;
	let d = max( 0.0, - r * mu + sqrt( max( disc, 0.0 ) ) );
	let dMin = ATMO_RT - r;
	let dMax = rho + H;
	let xMu = ( d - dMin ) / ( dMax - dMin );
	let xR = rho / H;
	// unit -> sub-uv
	return vec2f( ( xMu + ${R(.5/De)} ) * ${R(De/(De+1))}, ( xR + ${R(.5/Le)} ) * ${R(Le/(Le+1))} );
}

// nearest positive ray-sphere intersection from ro (km, planet centered), -1 if none
fn atmosphereRaySphereNearest( ro: vec3f, rd: vec3f, radius: f32 ) -> f32 {
	let b = dot( ro, rd );
	let c = dot( ro, ro ) - radius * radius;
	let disc = b * b - c;
	let sq = sqrt( max( disc, 0.0 ) );
	let t0 = - b - sq;
	let t1 = - b + sq;
	return select( select( select( -1.0, t1, t1 > 0.0 ), t0, t0 > 0.0 ), -1.0, disc < 0.0 );
}
`}class oo{constructor(e=null){this.renderer=e,this.transmittanceLUT=ws(De,Le,"atmoTransmittance"),this.multiScatLUT=ws(de,de,"atmoMultiScat"),this.skyViewLUT=ws(ye,we,"atmoSkyView"),this.params=new U("AtmosphereParams",{rayleighScale:["f32",1],mieScale:["f32",1],mieG:["f32",.8],ozoneScale:["f32",1],groundAlbedo:["vec3f",new ee(.06,.08,.1)],viewHeight:["f32",Bs+.002],sunIlluminance:["vec3f",new ee(Kt,Kt,Kt)],pad0:["f32",0],sunDir:["vec3f",new S(.3,.6,-.7).normalize()],pad1:["f32",0]},{label:"atmosphere"});const t=this.params.fields;this.rayleighScale=t.rayleighScale,this.mieScale=t.mieScale,this.mieG=t.mieG,this.ozoneScale=t.ozoneScale,this.groundAlbedo=t.groundAlbedo,this.viewHeight=t.viewHeight,this.sunIlluminance=t.sunIlluminance,this.sunDir=t.sunDir,this.irrBuffer=new $e({label:"atmoIrr",count:4,type:"vec4f"}),this.readback=new io({byteLength:48,label:"atmoIrrReadback"}),this.readback.onData=s=>this._onIrradiance(s),this._buildModules(),this._build(),this.needsStatic=!0,this._irrPending=!1,this._irrTimer=0,this.skyIrradiance=null,this.sunTransmittance=null,this.horizon=null,this.onIrradiance=null}_buildModules(){this.coreModule=new N({name:"atmosphereCore",deps:[B],uniforms:this.params,uniformName:"atmosphereParams",code:no()}),this.transmittanceModule=new N({name:"atmosphereTransmittance",deps:[this.coreModule],bindings:{atmosphereTransmittanceLUT:{texture:this.transmittanceLUT}},code:`
fn atmosphereSampleTransmittance( r: f32, mu: f32 ) -> vec3f {
	return textureSampleLevel( atmosphereTransmittanceLUT, smpLinearClamp, atmosphereTransmittanceUV( r, mu ), 0.0 ).rgb;
}
// Transmittance from the viewer toward direction dir (for sun disk / sun light color).
fn atmosphereTransmittanceToSpace( dir: vec3f ) -> vec3f {
	return atmosphereSampleTransmittance( atmosphereParams.viewHeight, dir.y );
}
`}),this.multiScatModule=new N({name:"atmosphereMultiScat",deps:[this.coreModule],bindings:{atmosphereMultiScatLUT:{texture:this.multiScatLUT}},code:`
fn atmosphereSampleMultiScat( r: f32, cosSun: f32 ) -> vec3f {
	let uv = vec2f( cosSun * 0.5 + 0.5, ( r - ATMO_RG ) / ( ATMO_RT - ATMO_RG ) );
	let suv = uv * ${R((de-1)/de)} + ${R(.5/de)};
	return textureSampleLevel( atmosphereMultiScatLUT, smpLinearClamp, suv, 0.0 ).rgb;
}
`}),this.module=new N({name:"atmosphere",deps:[this.transmittanceModule],bindings:{atmosphereSkyViewLUT:{texture:this.skyViewLUT}},code:`
// Sky luminance (no sun disk) for world direction dir (normalized).
fn atmosphereSkyLuminance( dir: vec3f ) -> vec3f {
	let viewH = atmosphereParams.viewHeight;
	let vHorizon = sqrt( max( viewH * viewH - ATMO_RG * ATMO_RG, 0.0 ) );
	let beta = acos( vHorizon / viewH );
	let zenithHorizonAngle = PI - beta;
	let viewZenithAngle = acos( clamp( dir.y, -1.0, 1.0 ) );

	let vCoordA = ( 1.0 - sqrt( max( 1.0 - viewZenithAngle / zenithHorizonAngle, 0.0 ) ) ) * 0.5;
	let vCoordB = sqrt( max( ( viewZenithAngle - zenithHorizonAngle ) / beta, 0.0 ) ) * 0.5 + 0.5;
	let v = select( vCoordB, vCoordA, viewZenithAngle < zenithHorizonAngle );

	// azimuth relative to sun
	let sunH = normalize( vec2f( atmosphereParams.sunDir.x, atmosphereParams.sunDir.z ) + vec2f( 1e-5, 0.0 ) );
	let dirH = normalize( vec2f( dir.x, dir.z ) + vec2f( 1e-5, 0.0 ) );
	let lightViewCos = dot( sunH, dirH );
	let u = sqrt( clamp( lightViewCos * -0.5 + 0.5, 0.0, 1.0 ) );

	let suv = vec2f( u * ${R((ye-1)/ye)} + ${R(.5/ye)}, v * ${R((we-1)/we)} + ${R(.5/we)} );
	return textureSampleLevel( atmosphereSkyViewLUT, smpLinearClamp, suv, 0.0 ).rgb;
}
`})}_build(){this.transmittanceKernel=new J({label:"Atmosphere Transmittance",modules:[this.coreModule],bindings:{outLUT:{storageTexture:this.transmittanceLUT}},workgroupSize:[8,8,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let px = gid.xy;
	let uv = ( vec2f( px ) + 0.5 ) / vec2f( ${R(De)}, ${R(Le)} );
	let xMu = ( uv.x - ${R(.5/De)} ) * ${R(De/(De-1))};
	let xR = ( uv.y - ${R(.5/Le)} ) * ${R(Le/(Le-1))};
	let H = sqrt( ATMO_RT * ATMO_RT - ATMO_RG * ATMO_RG );
	let rho = xR * H;
	let r = sqrt( rho * rho + ATMO_RG * ATMO_RG );
	let dMin = ATMO_RT - r;
	let dMax = rho + H;
	let d = dMin + xMu * ( dMax - dMin );
	let mu = clamp( select( ( H * H - rho * rho - d * d ) / ( 2.0 * r * d ), 1.0, d == 0.0 ), -1.0, 1.0 );

	let ro = vec3f( 0.0, r, 0.0 );
	let rd = vec3f( sqrt( max( 1.0 - mu * mu, 0.0 ) ), mu, 0.0 );
	let tMax = atmosphereRaySphereNearest( ro, rd, ATMO_RT );
	let steps = 40;
	let dt = tMax / f32( steps );
	var od = vec3f( 0.0 );
	for ( var i = 0; i < steps; i++ ) {
		let t = ( f32( i ) + 0.5 ) * dt;
		let p = ro + rd * t;
		let h = length( p ) - ATMO_RG;
		od += atmosphereMedium( h ).extinction * dt;
	}
	textureStore( outLUT, px, vec4f( exp( - od ), 1.0 ) );
}
`}),this.multiScatKernel=new J({label:"Atmosphere MultiScat",modules:[this.transmittanceModule],bindings:{outLUT:{storageTexture:this.multiScatLUT}},workgroupSize:[8,8,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let px = gid.xy;
	let uv = ( ( vec2f( px ) + 0.5 ) / ${R(de)} - ${R(.5/de)} ) * ${R(de/(de-1))};
	let cosSun = uv.x * 2.0 - 1.0;
	let r = ATMO_RG + clamp( uv.y, 0.001, 0.999 ) * ( ATMO_RT - ATMO_RG );
	let sunDir = normalize( vec3f( 0.0, cosSun, - sqrt( max( 1.0 - cosSun * cosSun, 0.0 ) ) ) );
	let ro = vec3f( 0.0, r, 0.0 );

	var Lsum = vec3f( 0.0 );
	var fmsSum = vec3f( 0.0 );
	const SQ = 8;
	let isoPhase = 1.0 / ( 4.0 * PI );

	for ( var i = 0; i < SQ * SQ; i++ ) {
		let ii = ( f32( i % SQ ) + 0.5 ) / f32( SQ );
		let jj = ( f32( i / SQ ) + 0.5 ) / f32( SQ );
		let theta = ii * 2.0 * PI;
		let phi = acos( 1.0 - jj * 2.0 );
		let rd = vec3f( cos( theta ) * sin( phi ), cos( phi ), sin( theta ) * sin( phi ) );

		let tBottom = atmosphereRaySphereNearest( ro, rd, ATMO_RG );
		let tTop = atmosphereRaySphereNearest( ro, rd, ATMO_RT );
		let hitGround = tBottom > 0.0;
		let tMax = select( tTop, tBottom, hitGround );
		let steps = 20;
		let dt = tMax / f32( steps );
		var throughput = vec3f( 1.0 );
		var L = vec3f( 0.0 );
		var fms = vec3f( 0.0 );

		for ( var s = 0; s < steps; s++ ) {
			let t = ( f32( s ) + 0.3 ) * dt;
			let p = ro + rd * t;
			let pr = length( p );
			let m = atmosphereMedium( pr - ATMO_RG );
			let up = p / pr;
			let cosSunP = dot( up, sunDir );
			let Tsun = atmosphereSampleTransmittance( pr, cosSunP );
			let shadowT = atmosphereRaySphereNearest( p, sunDir, ATMO_RG );
			let earthShadow = select( 1.0, 0.0, shadowT > 0.0 );
			let S = Tsun * earthShadow * m.scattering * isoPhase;
			let Tstep = exp( - m.extinction * dt );
			let ext = max( m.extinction, vec3f( 1e-6 ) );
			L += throughput * ( S - S * Tstep ) / ext;
			fms += throughput * ( m.scattering - m.scattering * Tstep ) / ext;
			throughput *= Tstep;
		}

		if ( hitGround ) {
			let p = ro + rd * tMax;
			let up = normalize( p );
			let cosS = dot( up, sunDir );
			let Tsun = atmosphereSampleTransmittance( ATMO_RG, cosS );
			L += Tsun * throughput * max( cosS, 0.0 ) * atmosphereParams.groundAlbedo / PI;
		}

		Lsum += L * ( 4.0 * PI / f32( SQ * SQ ) );
		fmsSum += fms * ( 4.0 * PI / f32( SQ * SQ ) );
	}

	let Lin = Lsum * isoPhase;
	let fmsAvg = fmsSum * isoPhase;
	let Lms = Lin / ( vec3f( 1.0 ) - fmsAvg );
	textureStore( outLUT, px, vec4f( Lms, 1.0 ) );
}
`}),this.skyViewKernel=new J({label:"Atmosphere SkyView",modules:[this.transmittanceModule,this.multiScatModule],bindings:{outLUT:{storageTexture:this.skyViewLUT}},workgroupSize:[8,8,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let px = gid.xy;
	if ( px.x >= ${ye}u || px.y >= ${we}u ) { return; }
	let uv = ( vec2f( px ) + 0.5 ) / vec2f( ${R(ye)}, ${R(we)} );
	let u = ( uv.x - ${R(.5/ye)} ) * ${R(ye/(ye-1))};
	let v = ( uv.y - ${R(.5/we)} ) * ${R(we/(we-1))};

	let viewH = atmosphereParams.viewHeight;
	let vHorizon = sqrt( max( viewH * viewH - ATMO_RG * ATMO_RG, 0.0 ) );
	let beta = acos( vHorizon / viewH );
	let zenithHorizonAngle = PI - beta;

	var vzA = 0.0;
	if ( v < 0.5 ) {
		var c = v * 2.0;
		c = 1.0 - c;
		c = c * c;
		c = 1.0 - c;
		vzA = zenithHorizonAngle * c;
	} else {
		var c = v * 2.0 - 1.0;
		c = c * c;
		vzA = zenithHorizonAngle + beta * c;
	}

	let cosViewZenith = cos( vzA );
	let sinViewZenith = sin( vzA );
	let cu = u * u;
	let lightViewCos = - ( cu * 2.0 - 1.0 );
	let lightViewSin = sqrt( max( 1.0 - lightViewCos * lightViewCos, 0.0 ) );

	// local frame: up = +y, sun azimuth along +x
	let sunCosZ = atmosphereParams.sunDir.y;
	let sunSinZ = sqrt( max( 1.0 - sunCosZ * sunCosZ, 0.0 ) );
	let sunDir = vec3f( sunSinZ, sunCosZ, 0.0 );
	let rd = vec3f( sinViewZenith * lightViewCos, cosViewZenith, sinViewZenith * lightViewSin );
	let ro = vec3f( 0.0, viewH, 0.0 );

	let tBottom = atmosphereRaySphereNearest( ro, rd, ATMO_RG );
	let tTop = atmosphereRaySphereNearest( ro, rd, ATMO_RT );
	let tMax = select( tTop, tBottom, tBottom > 0.0 );
	let steps = 32;
	let cosTheta = dot( rd, sunDir );
	let rayPhase = ${R(3/(16*Math.PI))} * ( cosTheta * cosTheta + 1.0 );
	let g = atmosphereParams.mieG;
	let g2 = g * g;
	// Cornette-Shanks
	let miePhase = ${R(3/(8*Math.PI))} * ( ( 1.0 - g2 ) * ( cosTheta * cosTheta + 1.0 ) )
		/ ( ( g2 + 2.0 ) * pow( max( g2 + 1.0 - g * cosTheta * 2.0, 1e-4 ), 1.5 ) );

	var throughput = vec3f( 1.0 );
	var L = vec3f( 0.0 );

	for ( var i = 0; i < steps; i++ ) {
		// quadratic step distribution
		let t0 = f32( i ) / f32( steps );
		let t1 = ( f32( i ) + 1.0 ) / f32( steps );
		let ta = t0 * t0 * tMax;
		let tb = t1 * t1 * tMax;
		let t = mix( ta, tb, 0.3 );
		let dt = tb - ta;
		let p = ro + rd * t;
		let pr = length( p );
		let m = atmosphereMedium( pr - ATMO_RG );
		let up = p / pr;
		let cosSunP = dot( up, sunDir );
		let Tsun = atmosphereSampleTransmittance( pr, cosSunP );
		let shadowT = atmosphereRaySphereNearest( p, sunDir, ATMO_RG );
		let earthShadow = select( 1.0, 0.0, shadowT > 0.0 );
		let ms = atmosphereSampleMultiScat( pr, cosSunP );
		let phaseScat = m.rayScat * rayPhase + vec3f( m.mieScat * miePhase );
		let S = Tsun * earthShadow * phaseScat + ms * m.scattering;
		let Tstep = exp( - m.extinction * dt );
		let ext = max( m.extinction, vec3f( 1e-6 ) );
		L += throughput * ( S - S * Tstep ) / ext;
		throughput *= Tstep;
	}

	textureStore( outLUT, px, vec4f( L * atmosphereParams.sunIlluminance, 1.0 ) );
}
`}),this.irradianceKernel=new J({label:"Atmosphere Irradiance",modules:[this.module],bindings:{irr:{storage:this.irrBuffer,access:"read_write"}},workgroupSize:[1,1,1],code:`
@compute @workgroup_size( 1 )
fn main() {
	var sum = vec3f( 0.0 );
	const N = 16;
	for ( var i = 0; i < N * N; i++ ) {
		let a = ( f32( i % N ) + 0.5 ) / f32( N );
		let b = ( f32( i / N ) + 0.5 ) / f32( N );
		// cosine-weighted hemisphere
		let r = sqrt( b );
		let phi = a * 2.0 * PI;
		let dir = vec3f( r * cos( phi ), sqrt( max( 1.0 - b, 0.0 ) ), r * sin( phi ) );
		sum += atmosphereSkyLuminance( dir );
	}
	// E = PI * mean(L) for cosine-weighted samples; store E/PI (radiance-equivalent irradiance)
	irr[ 0 ] = vec4f( sum / f32( N * N ), 1.0 );
	// sun transmittance at sea level for the current sun direction
	let Ts = atmosphereSampleTransmittance( ATMO_RG + 0.001, atmosphereParams.sunDir.y );
	irr[ 1 ] = vec4f( Ts, 1.0 );
	// horizon color (average around the horizon)
	var hs = vec3f( 0.0 );
	for ( var i = 0; i < 16; i++ ) {
		let phi = f32( i ) * ( 2.0 * PI / 16.0 );
		hs += atmosphereSkyLuminance( normalize( vec3f( cos( phi ), 0.03, sin( phi ) ) ) );
	}
	irr[ 2 ] = vec4f( hs / 16.0, 1.0 );
}
`})}update(e,t){const s=Math.max(.5,t+.5),i=s<100?Math.round(s/2)*2:Math.exp(Math.round(Math.log(s)/Wi)*Wi);this.viewHeight.value=Bs+Math.max(.001,i/1e3);let r=!1;this.needsStatic&&(this.needsStatic=!1,r=!0,this.transmittanceKernel.dispatch([De/8,Le/8,1]),this.multiScatKernel.dispatch([de/8,de/8,1])),this.params._pack();const n=this.params.u32,o=this._svLast||(this._svLast=new Uint32Array(n.length));for(let l=0;l<n.length&&!r;l++)r=n[l]!==o[l];(r||!this._svValid)&&(o.set(n),this._svValid=!0,this.skyViewKernel.dispatch([ye/8,Math.ceil(we/8),1])),this._irrTimer-=e,this._irrTimer<=0&&!this._irrPending&&(this._irrTimer=.25,this.irradianceKernel.dispatch(1),this.readback.request(this.irrBuffer)&&(this._irrPending=!0))}_onIrradiance(e){const t=new Float32Array(e);this.skyIrradiance=[t[0],t[1],t[2]],this.sunTransmittance=[t[4],t[5],t[6]],this.horizon=[t[8],t[9],t[10]],this._irrPending=!1,this.onIrradiance&&this.onIrradiance(this)}invalidate(){this.needsStatic=!0,this._svValid=!1}}const bs=160,Vi=.1,Ss=new S(.3,.2,1).normalize(),Gi=.08,be=a=>{const e=String(a);return e.includes(".")||e.includes("e")?e:e+".0"};class lo{constructor(e){this.atmosphere=e,this.clouds=null,this.params=new U("SkyParams",{moonDir:["vec3f",new S(-.3,.5,.8).normalize()],sunDiskIntensity:["f32",1],starIntensity:["f32",0]},{label:"sky"}),this.sunDiskIntensity=this.params.fields.sunDiskIntensity,this.moonDir=this.params.fields.moonDir,this.starIntensity=this.params.fields.starIntensity,this._module=null,this._background=null}get module(){return this._module||(this._module=this._buildModule()),this._module}_buildModule(){const e=this.clouds,t=[B,this.atmosphere.module];e&&t.push(e.module);const s=i=>e?`let c = ${i}( dir );
	return base * c.a + c.rgb;`:"return base;";return new N({name:"sky",deps:t,uniforms:this.params,uniformName:"skyParams",code:`
// hash without sine (D. Hoskins): keeps full precision for large integer coordinates
fn skyHash13( p: vec3f ) -> f32 {
	var p3 = fract( p * vec3f( 0.1031, 0.1030, 0.0973 ) );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

// Sun disk radiance along dir (already includes atmospheric transmittance).
fn skySunDisk( dir: vec3f ) -> vec3f {
	let cosA = dot( dir, atmosphereParams.sunDir ); // the real sun (frame.sunDir is the moon at night)
	let ang = acos( clamp( cosA, -1.0, 1.0 ) );
	let r = ang / ${be(ao)};
	let mask = smoothstep( 1.0, 0.9, r );
	let mu = sqrt( max( 1.0 - r * r, 0.0 ) );
	let limb = 1.0 - 0.6 * ( 1.0 - mu );
	let T = atmosphereTransmittanceToSpace( dir );
	// physically the disk radiance is E / solid angle (~1.6e5); clamp for fp16 targets
	return T * mask * limb * 2500.0 * skyParams.sunDiskIntensity * smoothstep( -0.02, 0.0, dir.y );
}

// Stars: one candidate per cell of a cube-face grid, jittered inside it, with a power law
// magnitude distribution (few bright stars, many faint ones), denser along the Milky Way. They
// come out after civil twilight: the brightest first, the faintest once the sky is fully dark.
fn skyStars( dir: vec3f ) -> vec3f {
	// cube face coordinates
	let a = abs( dir );
	let onX = a.x > a.y && a.x > a.z;
	let onY = a.y > a.z;
	let face = select( select( sign( dir.z ) + 8.0, sign( dir.y ) + 5.0, onY ), sign( dir.x ) + 2.0, onX );
	let uv = select( select( dir.xy / a.z, dir.xz / a.y, onY ), dir.yz / a.x, onX ) * ${be(bs)};
	let cell = vec3f( floor( uv ), face );
	let h = skyHash13( cell );
	let bx = dot( dir, vec3f( ${be(Ss.x)}, ${be(Ss.y)}, ${be(Ss.z)} ) ) * 4.0;
	let band = exp( - bx * bx );
	// the cell holds a star with probability P (higher along the Milky Way); an independent
	// uniform u ranks its brightness: N( < m ) ~ 10^( m / 2 ), brightest about magnitude -1
	let has = h < band * 0.035 + 0.025;
	let uc = max( skyHash13( cell + 7.7 ), 2e-4 );
	let m = log2( uc ) * 0.602 + 6.5;
	// limiting magnitude: -1 when the sun is 6 deg below the horizon, 6.5 below 16 deg
	let dark = 1.0 - smoothstep( -0.28, -0.1, atmosphereParams.sunDir.y );
	let vis = smoothstep( m - 0.6, m + 0.6, dark * 7.5 - 1.0 ) * select( 0.0, 1.0, has );
	// angular distance to the star (isotropic whatever the cube face distortion), in cells
	let sp = ( floor( uv ) + vec2f( skyHash13( cell + 3.1 ), skyHash13( cell + 5.7 ) ) * 0.4 + 0.3 ) / ${be(bs)};
	let sdir = normalize( select( select( vec3f( sp, sign( dir.z ) ), vec3f( sp.x, sign( dir.y ), sp.y ), onY ), vec3f( sign( dir.x ), sp ), onX ) );
	let d = length( dir - sdir ) * ${be(bs)};
	// flux relative to a magnitude 6.5 star; bright stars look bigger (glare), not just clipped
	let flux = pow( uc, -0.8 );
	let size = log2( flux ) * 0.08 + 1.0;
	let psf = exp( d * d / ( size * size ) * ${be(-.5/(Vi*Vi))} ) / ( size * size );
	// subtle scintillation, stronger low in the sky
	let tw = sin( frame.time * ( skyHash13( cell + 13.3 ) * 9.0 + 5.0 ) + h * 60.0 ) * mix( 0.18, 0.06, sat( dir.y * 2.0 ) ) + 1.0;
	let col = mix( vec3f( 1.0, 0.8, 0.6 ), vec3f( 0.75, 0.85, 1.0 ), skyHash13( cell + 17.0 ) ) * 0.5 + 0.5;
	let star = col * ( psf * flux * vis * tw * 0.0075 );
	// diffuse glow of the Milky Way
	let glow = vec3f( 0.55, 0.6, 0.75 ) * ( band * dark * 0.0035 );
	// atmospheric extinction toward the horizon
	return ( star + glow ) * skyParams.starIntensity * smoothstep( 0.0, 0.2, dir.y );
}

fn skyMoon( dir: vec3f ) -> vec3f {
	let cosA = dot( dir, skyParams.moonDir );
	let ang = acos( clamp( cosA, -1.0, 1.0 ) );
	let r = ang / 0.0048;
	let mask = smoothstep( 1.0, 0.92, r );
	return vec3f( 0.9, 0.92, 1.0 ) * mask * 3.0 * skyParams.starIntensity * smoothstep( -0.02, 0.02, dir.y );
}

// Faint blue-grey moonlit sky (a little brighter toward the horizon) and the moon's aureole.
// Physically dim: about the level of the app's night ambient light.
fn skyMoonSky( dir: vec3f ) -> vec3f {
	let cosA = dot( dir, skyParams.moonDir );
	let ang = acos( clamp( cosA, -1.0, 1.0 ) );
	let aureole = exp( ang * -14.0 ) * 2.4 + exp( ang * -2.5 ) * 0.9;
	let grad = mix( 1.7, 1.0, sat( dir.y * 3.0 ) );
	let up = smoothstep( -0.05, 0.15, skyParams.moonDir.y );
	return vec3f( 0.005, 0.0068, 0.0105 ) * ( grad + aureole ) * frame.night * up;
}

// Everything behind the clouds except the sun and moon disks. The night terms are only
// evaluated at night (uniform branch).
fn skyBackground( dir: vec3f, starK: f32 ) -> vec3f {
	var L = atmosphereSkyLuminance( dir );
	if ( skyParams.starIntensity > 0.001 ) {
		L += skyMoonSky( dir ) + skyStars( dir ) * starK;
	}
	return L;
}

// Full sky radiance for a direction (no clouds).
fn skyRadiance( dir: vec3f, withSun: bool ) -> vec3f {
	var L = skyBackground( dir, 1.0 ) + skyMoon( dir );
	if ( withSun ) { L += skySunDisk( dir ); }
	return L;
}

// Sky with clouds composited (low resolution cloud panorama). withSun = false (environment
// map): no sun or moon disk, the key light is lit directly.
fn skyRadianceWithClouds( dir: vec3f, withSun: bool ) -> vec3f {
	var base: vec3f;
	if ( withSun ) { base = skyBackground( dir, 1.0 ) + skyMoon( dir ) + skySunDisk( dir ); }
	else { base = skyBackground( dir, ${be(Gi)} ); }
	${s("cloudsSample")}
}

// Water reflections: no moon disk (the water's specular lobe reflects the key light) and only a
// trace of the stars, which rough water would spread into flickering sparkles.
fn skyReflectionRadiance( dir: vec3f ) -> vec3f {
	let base = skyBackground( dir, ${be(Gi)} );
	${s("cloudsSample")}
}

// Main view background: full resolution clouds for the camera's view (the sun's disc behind them
// with cloudsSunTransmittance: no sun through the cut-off remainder of thick cloud)
fn skyViewRadiance( dir: vec3f ) -> vec3f {
	let base = skyBackground( dir, 1.0 ) + skyMoon( dir );
	let sun = skySunDisk( dir );
	${e?`let c = cloudsSampleView( dir );
	return base * c.a + sun * cloudsSunTransmittance( c.a ) + c.rgb;`:"return base + sun;"}
}
`})}get background(){if(!this._background){const e=new X({label:"sky background",modules:[this.module],colorFormats:Kn,depthFormat:gt,depthCompare:"equal",depthWrite:!1,depth:0,code:`
struct SkyOut {
	@location( 0 ) color: vec4f,
	@location( 1 ) velocity: vec4f,
	@location( 2 ) mask: vec4f,
};
@fragment fn fs( in: FSIn ) -> SkyOut {
	let uv = in.pos.xy * frame.invResolution;
	let dir = viewRay( uv );
	var o: SkyOut;
	o.color = vec4f( skyViewRadiance( dir ), 1.0 );
	// a direction at infinity: only the camera rotation moves it
	let c = frame.viewProjNoJitter * vec4f( dir, 0.0 );
	let p = frame.prevViewProjNoJitter * vec4f( dir, 0.0 );
	let cur = c.xy / max( abs( c.w ), 1e-6 ) * sign( c.w );
	let prev = p.xy / max( abs( p.w ), 1e-6 ) * sign( p.w );
	o.velocity = vec4f( select( vec2f( 0.0 ), ( cur - prev ) * vec2f( 0.5, -0.5 ), c.w > 1e-6 && p.w > 1e-6 ), 0.0, 1.0 );
	o.mask = vec4f( 0.0 );
	return o;
}
`});this._background={pass:e,draw:t=>e.draw(t)}}return this._background}backgroundNode(){return this.background}}function ho(a,e=24,t=6,s=new S){const i=He.degToRad(e),r=He.degToRad(t),n=He.degToRad((a-12)*15),o=-Math.cos(r)*Math.sin(n),l=Math.cos(i)*Math.sin(r)-Math.sin(i)*Math.cos(r)*Math.cos(n),h=Math.sin(i)*Math.sin(r)+Math.cos(i)*Math.cos(r)*Math.cos(n);return s.set(o,h,-l).normalize()}async function co(a,e){if(globalThis.__assetImage)return globalThis.__assetImage(a,e);const t=await createImageBitmap(new Blob([a],{type:e}),{colorSpaceConversion:"none",premultiplyAlpha:"none"}),i=new OffscreenCanvas(t.width,t.height).getContext("2d",{willReadFrequently:!0});i.drawImage(t,0,0);const r=t.width,n=t.height,o=i.getImageData(0,0,r,n).data;return t.close&&t.close(),{data:new Uint8Array(o.buffer,o.byteOffset,o.byteLength),width:r,height:n}}const uo={},Se=a=>{const e=Number(a).toString();return/[.eE]/.test(e)?e:e+".0"},Vt=Math.PI/180,Hi={atmosphere:{multipleScattering:.99},shape:{altitude:4e3,thickness:5200,density:.019,coverage:.49,horizonCoverageStart:2e4,horizonCoverageRamp:45e3,horizonCoverageAmount:.12,edgeSoftness:.095,edgeSoftnessFalloff:1,weatherScale:29e3,baseScale:7500,baseStrength:.69,erosionScaleBaseMultiplier:.13,erosionStrengthBase:.24,erosionStrengthPeak:2.15,erosionShape:1,baseWeatherStrength:.54,baseWeatherHeightStart:0,baseWeatherHeightEnd:.13},lighting:{scatteringAlbedo:1,powderStrength:.7,ambientIntensity:.7,groundBounceAlbedo:[.009134058699157796,.015208514418949472,.018500220124016652],baseShadowStrength:.88,baseShadowHeight:.13,moonGain:.65},wind:{speed:12,evolutionSpeed:60.8*12/89,skew:1750},fade:{hazeDensityScale:.62,horizonMeltStart:25e3,horizonMeltEnd:45e3},weather:{resolution:1024,mainMass:[4,5,0,1.32],detail:[6,6,1,.13],coverage:.26}},$i={historyDivisor:2,lattice:4,maxSteps:256,lightTaps:6,stepMeters:25,fullLightingAlpha:.5,lightReuseSteps:3,historyWeight:.9},Gt=512,_s=160,Ke=4,ke=256,fo=3e4,G=()=>[0,0,0,0],po=`
const SC_EARTH: f32 = 6371.0;
const SC_FAR: f32 = 250000.0;
const SC_AP_DIST: f32 = ${Se(fo)};

fn scRay( uv: vec2f ) -> vec3f {
	let ndc = vec2f( uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0 );
	return normalize( scf.forward.xyz + scf.right.xyz * ( ndc.x * scf.right.w * scf.position.w )
		+ scf.up.xyz * ( ndc.y * scf.position.w ) );
}
fn scSourceUV( pixel: vec2f ) -> vec2f {
	return ( pixel * scf.sampling.z + scf.sampling.xy + 0.5 ) / scf.viewport.zw;
}
fn scProjectPrevious( p: vec3f ) -> vec3f {
	let v = p - scf.previousPosition.xyz;
	let z = dot( v, scf.previousForward.xyz );
	let denom = max( z, 0.001 ) * scf.previousPosition.w;
	return vec3f( vec2f( dot( v, scf.previousRight.xyz ) / ( denom * scf.previousRight.w ),
		-dot( v, scf.previousUp.xyz ) / denom ) * 0.5 + 0.5, z );
}
fn scHG( mu: f32, g: f32 ) -> f32 {
	let d = max( 1.0 + g * g - 2.0 * g * mu, 0.001 );
	return ( 1.0 - g * g ) / ( 4.0 * PI * d * sqrt( d ) );
}
// normalized droplet phase: 80% forward / 20% backscatter; each higher order halves the asymmetry
fn scPhases( mu: f32 ) -> vec3f {
	return vec3f( scHG( mu, 0.8 ), scHG( mu, 0.4 ), scHG( mu, 0.2 ) ) * 0.8
		+ vec3f( scHG( mu, -0.2 ), scHG( mu, -0.1 ), scHG( mu, -0.05 ) ) * 0.2;
}

// ---- density (sky-pro density.wgsl)
struct ScCandidate {
	conservative: f32, edge: f32, top: f32, floorMask: f32,
	shellHeight: f32, localHeight: f32, coverage: f32, position: vec3f,
};
fn scShellHeight( p: vec3f ) -> f32 {
	let horizontal = p.xz - scf.position.xz;
	// parabolic radial height avoids subtracting two ~6,371,000 m f32 values
	let altitude = p.y + dot( horizontal, horizontal ) / ( 2.0 * SC_EARTH * 1000.0 );
	return ( altitude - scs.shell.x ) / scs.shell.y;
}
fn scConeLod( footprint: f32, scale: f32 ) -> f32 { return max( 0.0, log2( max( footprint * 64.0 / scale, 1.0 ) ) ); }
fn scCandidate( p: vec3f, coverage: f32, lod: f32 ) -> ScCandidate {
	let h = scShellHeight( p );
	var result: ScCandidate;
	result.conservative = 0.0;
	if ( h < -0.1 || h > 1.3 || coverage <= 0.0 ) { return result; }
	let windDirection = scs.wind.xy;
	let shapePosition = p - vec3f( scf.wind.x, 0.0, scf.wind.y )
		- vec3f( windDirection.x, 0.0, windDirection.y ) * ( scs.wind.z * max( h, 0.0 ) - scf.wind.z );
	let weather = textureSampleLevel( scWeatherMap, smpLinearRepeat, ( p.xz - scf.wind.xy ) / scs.shape.x, 0.0 ).r;
	let edge = max( scs.base.y * exp2( -max( h, 0.0 ) * scs.base.z ), 0.0001 );
	// an all-one noise sample bounds top dilation; a failed bound avoids the volume fetch
	let maximumTop = weather + coverage - 1.0 + 1.34 * scs.shape.z * coverage;
	if ( maximumTop < h - edge ) { return result; }
	let required = ( 1.0 - smoothstep( scs.base.w, max( scs.erosion.w, scs.base.w + 0.001 ), h ) ) * scs.base.x;
	let floorMask = smoothstep( required - 0.1, required, weather );
	if ( floorMask <= 0.0 ) { return result; }
	let baseSample = textureSampleLevel( scNoise, smpLinearRepeat, shapePosition / scs.shape.y, lod ).rgb;
	let dilation = dot( baseSample, vec3f( 0.7, 0.41, 0.23 ) ) * scs.shape.z;
	let top = weather + coverage - 1.0 + dilation * coverage;
	result.conservative = smoothstep( -edge, edge, top - h ) * smoothstep( -edge, edge, h ) * floorMask;
	result.edge = edge; result.top = top; result.floorMask = floorMask;
	result.shellHeight = h; result.localHeight = clamp( h / max( top, 0.001 ), 0.0, 1.0 );
	result.coverage = coverage; result.position = shapePosition;
	return result;
}
fn scErodedDensity( c: ScCandidate, lod: f32 ) -> f32 {
	if ( c.conservative <= 0.0 ) { return 0.0; }
	let strength = mix( scs.erosion.x, scs.erosion.y, c.localHeight );
	let maximumErosion = 0.173 * strength * c.coverage;
	if ( min( c.top - c.shellHeight, c.shellHeight ) >= maximumErosion + c.edge ) { return c.floorMask; }
	let s = textureSampleLevel( scNoise, smpLinearRepeat, c.position / ( scs.shape.y * scs.shape.w ), lod ).rgb;
	let field = mix( 1.0 - s, s, scs.erosion.z );
	let erosion = dot( field, vec3f( 0.113, 0.04, 0.02 ) ) * strength * c.coverage;
	return smoothstep( -c.edge, c.edge, c.top - erosion - c.shellHeight )
		* smoothstep( -c.edge, c.edge, c.shellHeight - erosion ) * c.floorMask;
}
fn scLightDensity( p: vec3f, coverage: f32, lods: vec2f, cheap: bool ) -> f32 {
	let c = scCandidate( p, coverage, lods.x );
	if ( cheap ) { return c.conservative; }
	return scErodedDensity( c, lods.y );
}
fn scShellRoots( direction: vec3f, altitude: f32, originHeight: f32 ) -> vec2f {
	let radius = SC_EARTH * 1000.0;
	let b = ( radius + originHeight ) * direction.y;
	let c = ( originHeight - altitude ) * ( 2.0 * radius + originHeight + altitude );
	let h = b * b - c;
	if ( h < 0.0 ) { return vec2f( -1.0 ); }
	let q = -b - select( -sqrt( h ), sqrt( h ), b >= 0.0 );
	let other = c / select( -0.0001, q, abs( q ) > 0.0001 );
	return vec2f( min( q, other ), max( q, other ) );
}
fn scCloudInterval( dir: vec3f, originHeight: f32 ) -> vec2f {
	let inner = scShellRoots( dir, scs.shell.x, originHeight );
	let outer = scShellRoots( dir, scs.shell.x + scs.shell.y, originHeight );
	var start = 0.0; var end = min( outer.y, SC_FAR );
	if ( outer.y <= 0.0 ) { return vec2f( 0.0 ); }
	if ( originHeight < scs.shell.x ) { start = max( inner.y, 0.0 ); }
	else {
		if ( originHeight > scs.shell.x + scs.shell.y ) { start = max( outer.x, 0.0 ); }
		if ( inner.x >= 0.0 ) { end = min( end, inner.x ); }
	}
	let ground = scShellRoots( dir, 0.0, originHeight );
	if ( ground.x > 0.0 ) { end = min( end, ground.x ); }
	return vec2f( start, end );
}
`,mo=`
fn scCoverageAt( t: f32 ) -> f32 {
	return scs.shell.w + scs.horizon.z * smoothstep( scs.horizon.x, scs.horizon.x + max( scs.horizon.y, 1.0 ), t );
}
fn scHeightAlongRay( t: f32, dir: vec3f, originHeight: f32 ) -> f32 {
	let altitude = originHeight + dir.y * t + dot( dir.xz, dir.xz ) * t * t / ( 2.0 * SC_EARTH * 1000.0 );
	return ( altitude - scs.shell.x ) / scs.shell.y;
}
fn scCellIsEmpty( t: f32, end: f32, dir: vec3f, originHeight: f32, maximumWeather: f32 ) -> bool {
	let turningPoint = -dir.y * SC_EARTH * 1000.0 / max( dot( dir.xz, dir.xz ), 0.000001 );
	let minHeight = scHeightAlongRay( clamp( turningPoint, t, end ), dir, originHeight );
	let maxHeight = max( scHeightAlongRay( t, dir, originHeight ), scHeightAlongRay( end, dir, originHeight ) );
	let coverage = scCoverageAt( end );
	let maximumTop = maximumWeather + coverage - 1.0 + 1.34 * scs.shape.z * coverage;
	let edgeHeight = select( maxHeight, minHeight, scs.base.z >= 0.0 );
	let edge = max( scs.base.y * exp2( -max( edgeHeight, 0.0 ) * scs.base.z ), 0.0001 );
	let required = ( 1.0 - smoothstep( scs.base.w, max( scs.erosion.w, scs.base.w + 0.001 ), maxHeight ) ) * scs.base.x;
	return maximumTop < minHeight - edge || maximumWeather <= required - 0.1;
}
fn scLightOpticalDepth( p: vec3f, coverage: f32, lods: vec2f, cheap: bool ) -> f32 {
	var opticalDepth = 0.0;
	for ( var i = 1u; i < 8u; i++ ) {
		if ( i >= u32( scf.march.z ) ) { break; }
		let tap = scf.lightOffsets[ i ];
		opticalDepth += scLightDensity( p + tap.xyz, coverage, max( lods, scf.lightLods[ i ].xy ), cheap ) * tap.w * scs.shell.z;
		if ( opticalDepth >= 32.0 ) { break; }
	}
	return opticalDepth;
}
fn scLightEnergy( opticalDepth: f32, phase: vec3f ) -> f32 {
	let quarter = exp( -opticalDepth * 0.25 );
	let halfT = quarter * quarter;
	return dot( vec3f( halfT * halfT, halfT * 0.5, quarter * 0.25 ), phase );
}

// ElseMesh's sky (the atmosphere's sky view LUT; the night sky's ambient)
fn scSky( dir: vec3f ) -> vec3f {
	return atmosphereSkyLuminance( dir ) + frame.skyIrradiance * frame.night;
}
// key light: the sun while it is the app's key light, seen from cloud altitude, else the moon
fn scDirect() -> vec3f {
	let isMoon = dot( frame.sunDir, atmosphereParams.sunDir ) < 0.9999;
	let sunE = atmosphereSampleTransmittance( 6360.0 + scs.shell.x * 0.001, frame.sunDir.y ) * atmosphereParams.sunIlluminance;
	return select( sunE, frame.sunColor, isMoon );
}

struct ScMarch { color: vec3f, alpha: f32, depth: f32, steps: u32 };

fn scMarch( origin: vec3f, dir: vec3f, dither: f32, pixelConeAngle: f32, stepConeAngle: f32, maxSteps: u32, useBounds: bool ) -> ScMarch {
	var out: ScMarch;
	out.color = vec3f( 0.0 ); out.alpha = 0.0; out.depth = SC_FAR; out.steps = 0u;
	let interval = scCloudInterval( dir, origin.y );
	var color = vec3f( 0.0 ); var transmission = 1.0; var weightedDepth = 0.0;
	var steps = 0u;
	if ( interval.y > interval.x && scs.shell.w > 0.0 && scs.shell.z > 0.0 ) {
		let L = frame.sunDir;
		let lightCosine = dot( dir, L );
		let phase = scPhases( lightCosine );
		let direct = scDirect();
		let zenith = scSky( vec3f( 0.0, 1.0, 0.0 ) );
		let horizon = scSky( normalize( vec3f( L.x, 0.03, L.z ) + vec3f( 1e-5, 0.0, 0.0 ) ) );
		let bounce = scs.bounce.rgb * direct * max( L.y, 0.0 );
		var t = interval.x + dither * scf.march.x;
		var coarse = true; var emptyRun = 0u; var accumulatedDepth = 0.0;
		var refineEnd = -1.0;
		var cellEnd = -1.0; var cellStart = -1.0; var maximumWeather = 1.0;
		var shadowAt = -SC_FAR; var shadowDensity = -1.0; var shadowTau = 0.0; var skyTau = 0.0; var shadowCheap = false;
		let hasDirectLight = max( direct.x, max( direct.y, direct.z ) ) > 0.00001;
		for ( var i = 0u; i < maxSteps; i++ ) {
			if ( t >= interval.y || transmission < 0.003 ) { break; }
			steps++;
			if ( coarse && useBounds ) {
				if ( t >= cellEnd || t < cellStart ) {
					let size = vec2i( textureDimensions( scWeatherBounds ) );
					let grid = ( origin.xz + dir.xz * t - scf.wind.xy ) / scs.shape.x * vec2f( size );
					let cell = vec2i( floor( grid ) );
					maximumWeather = textureLoad( scWeatherBounds, ( ( cell % size ) + size ) % size, 0 ).r;
					let distance = select( fract( grid ), 1.0 - fract( grid ), dir.xz >= vec2f( 0.0 ) )
						/ max( abs( dir.xz ) * vec2f( size ) / scs.shape.x, vec2f( 0.0000001 ) );
					cellStart = t; cellEnd = min( interval.y, t + max( min( distance.x, distance.y ), 0.05 ) );
				}
				if ( scCellIsEmpty( t, cellEnd, dir, origin.y, maximumWeather ) ) { t = cellEnd + 0.05; continue; }
			}
			let footprint = t * pixelConeAngle;
			let fineStep = max( scf.march.x, t * stepConeAngle * 1.5 );
			let p = origin + dir * t;
			let coverage = scCoverageAt( t );
			let baseLod = scConeLod( footprint, scs.shape.y );
			let c = scCandidate( p, coverage, baseLod );
			let erosionLod = scConeLod( footprint, scs.shape.y * scs.shape.w );
			if ( coarse ) {
				if ( c.conservative > 0.0 ) {
					if ( scErodedDensity( c, erosionLod ) > 0.0 ) {
						refineEnd = t;
						t = max( interval.x, t - fineStep * 4.0 ) + fineStep;
						t = min( t, refineEnd );
						coarse = false; emptyRun = 0u;
						continue;
					}
				}
				t += fineStep * 4.0;
				continue;
			}
			let density = scErodedDensity( c, erosionLod );
			if ( density <= 0.0 ) {
				shadowAt = -SC_FAR;
				emptyRun++;
				if ( t < refineEnd ) { t = min( t + fineStep, refineEnd ); continue; }
				if ( emptyRun >= 4u ) { coarse = true; }
				t += select( fineStep, fineStep * 4.0, coarse ); continue;
			}
			emptyRun = 0u; refineEnd = -1.0;
			let sigmaT = density * scs.shell.z;
			let surfaceStep = clamp( 0.5 / max( sigmaT, 0.000001 ), fineStep * 0.15, fineStep );
			let stepLength = min( mix( surfaceStep, fineStep * 3.0, smoothstep( 1.0, 3.0, accumulatedDepth ) ), interval.y - t );
			let height = clamp( c.shellHeight, 0.0, 1.0 );
			let baseShadow = mix( 1.0, mix( 0.15, 1.0, smoothstep( 0.0, max( scs.shadow.y, 0.001 ), height ) ), scs.shadow.x );
			// darken thin margins away from the sun; keep the forward scattered silver linings
			let powderWeight = scs.cloudLight.y * ( 1.0 - smoothstep( 0.2, 0.95, lightCosine ) );
			let powder = mix( 1.0, 1.0 - exp( -density * 2.0 ), powderWeight );
			var energy = 0.0;
			let cheap = ( 1.0 - transmission ) >= scf.march.w;
			let reuseDistance = min( fineStep * scf.display.y, max( 20.0, scs.shape.y * scs.shape.w * 0.03 ) );
			if ( abs( t - shadowAt ) >= reuseDistance || abs( density - shadowDensity ) > 0.08 || cheap != shadowCheap ) {
				let lods = vec2f( baseLod, erosionLod );
				if ( hasDirectLight ) { shadowTau = scLightOpticalDepth( p, coverage, lods, cheap ); }
				let skyLods = lods + vec2f( 1.0 );
				skyTau = ( scLightDensity( p + vec3f( 0.0, 125.0, 0.0 ), coverage, skyLods, true ) * 250.0
					+ scLightDensity( p + vec3f( 0.0, 600.0, 0.0 ), coverage, skyLods, true ) * 700.0 ) * scs.shell.z;
				shadowAt = t; shadowDensity = density; shadowCheap = cheap;
			}
			if ( hasDirectLight ) {
				energy = scLightEnergy( shadowTau + sigmaT * scf.lightOffsets[ 0 ].w, phase );
			}
			let skyVisibility = 0.2 + 0.8 / ( 1.0 + ( skyTau + sigmaT * 25.0 ) * 0.35 );
			let ambient = ( mix( mix( zenith, horizon, 0.55 ), zenith, sqrt( height ) ) * skyVisibility + bounce * ( 1.0 - height ) )
				* scs.cloudLight.z * ( 1.0 + scs.cloudLight.w );
			let light = ( direct * energy * powder * baseShadow + ambient ) * scs.cloudLight.x;
			let stepT = exp( -sigmaT * stepLength );
			let alpha = transmission * ( 1.0 - stepT );
			color += alpha * light; weightedDepth += alpha * t;
			transmission *= stepT; accumulatedDepth += sigmaT * stepLength; t += stepLength;
		}
	}
	let alpha = 1.0 - transmission;
	var depth = SC_FAR;
	if ( alpha > 0.0 ) {
		depth = weightedDepth / alpha;
		// aerial perspective (distance toward the sky behind), then the far melt into the sky
		let sky = scSky( dir );
		let ap = exp( -depth / SC_AP_DIST );
		color = color * ap + sky * alpha * ( 1.0 - ap );
		let melt = smoothstep( scs.fade.y, max( scs.fade.z, scs.fade.y + 1.0 ), depth );
		color = mix( color, sky * alpha, melt );
	}
	out.color = color; out.alpha = alpha; out.depth = depth; out.steps = steps;
	return out;
}
`,vo=`
fn scHash33( cell: vec3u ) -> vec3u {
	var p = cell * 1664525u + 1013904223u;
	p.x += p.y * p.z; p.y += p.z * p.x; p.z += p.x * p.y;
	p = p ^ ( p >> vec3u( 16u ) );
	p.x += p.y * p.z; p.y += p.z * p.x; p.z += p.x * p.y;
	return p;
}
fn scGradient( cell: vec3i, period: i32, offset: vec3f ) -> f32 {
	let wrapped = vec3u( ( ( cell % vec3i( period ) ) + vec3i( period ) ) % vec3i( period ) );
	let h = ( scHash33( wrapped ).x >> 24u ) & 15u;
	let u = select( offset.y, offset.x, h < 8u );
	let v = select( select( offset.z, offset.x, h == 12u || h == 14u ), offset.y, h < 4u );
	return select( -u, u, ( h & 1u ) == 0u ) + select( -v, v, ( h & 2u ) == 0u );
}
fn scPerlin( p: vec3f, period: i32 ) -> f32 {
	let cell = vec3i( floor( p ) ); let fr = fract( p ); let w = fr * fr * fr * ( fr * ( fr * 6.0 - 15.0 ) + 10.0 );
	return mix( mix( mix( scGradient( cell, period, fr ), scGradient( cell + vec3i( 1, 0, 0 ), period, fr - vec3f( 1, 0, 0 ) ), w.x ),
		mix( scGradient( cell + vec3i( 0, 1, 0 ), period, fr - vec3f( 0, 1, 0 ) ), scGradient( cell + vec3i( 1, 1, 0 ), period, fr - vec3f( 1, 1, 0 ) ), w.x ), w.y ),
		mix( mix( scGradient( cell + vec3i( 0, 0, 1 ), period, fr - vec3f( 0, 0, 1 ) ), scGradient( cell + vec3i( 1, 0, 1 ), period, fr - vec3f( 1, 0, 1 ) ), w.x ),
		mix( scGradient( cell + vec3i( 0, 1, 1 ), period, fr - vec3f( 0, 1, 1 ) ), scGradient( cell + vec3i( 1, 1, 1 ), period, fr - vec3f( 1, 1, 1 ) ), w.x ), w.y ), w.z );
}
fn scFbm( uv: vec2f, profile: vec4f ) -> f32 {
	var frequency = max( 1.0, round( profile.x ) ); var weight = 0.5;
	var sum = 0.0; var weights = 0.0;
	for ( var i = 0u; i < u32( profile.y ); i++ ) {
		sum += scPerlin( vec3f( uv, profile.z * 13.37 + 0.5 ) * frequency, i32( frequency ) ) * weight;
		weights += weight; weight *= 0.5; frequency *= 2.0;
	}
	return sum / max( weights, 0.001 ) * 0.5 + 0.5;
}
`;class xo{constructor(e,t){this.renderer=e,this.atmosphere=t;const s=Hi,i=s.shape,r=s.lighting;this.frameBlock=new U("SkyCloudFrame",{position:["vec4f",G()],right:["vec4f",G()],up:["vec4f",G()],forward:["vec4f",G()],previousPosition:["vec4f",G()],previousRight:["vec4f",G()],previousUp:["vec4f",G()],previousForward:["vec4f",G()],viewport:["vec4f",G()],sampling:["vec4f",G()],clock:["vec4f",G()],wind:["vec4f",G()],windDelta:["vec4f",G()],march:["vec4f",G()],temporal:["vec4f",G()],display:["vec4f",G()],pano:["vec4f",G()],shadow:["vec4f",G()],lightOffsets:["vec4f[8]",new Float32Array(32)],lightLods:["vec4f[8]",new Float32Array(32)]},{label:"sky clouds frame"}),this.settingsBlock=new U("SkyCloudSettings",{shell:["vec4f",[i.altitude,i.thickness,i.density,i.coverage]],shape:["vec4f",[i.weatherScale,i.baseScale,i.baseStrength,i.erosionScaleBaseMultiplier]],erosion:["vec4f",[i.erosionStrengthBase,i.erosionStrengthPeak,i.erosionShape,i.baseWeatherHeightEnd]],base:["vec4f",[i.baseWeatherStrength,i.edgeSoftness,Math.log2(Math.max(i.edgeSoftnessFalloff,.001))*i.thickness*.001,i.baseWeatherHeightStart]],horizon:["vec4f",[i.horizonCoverageStart,i.horizonCoverageRamp,i.horizonCoverageAmount,0]],cloudLight:["vec4f",[r.scatteringAlbedo,r.powderStrength,r.ambientIntensity,s.atmosphere.multipleScattering]],shadow:["vec4f",[r.baseShadowStrength,r.baseShadowHeight,r.moonGain,0]],bounce:["vec4f",[...r.groundBounceAlbedo,0]],wind:["vec4f",[0,1,s.wind.skew,0]],fade:["vec4f",[s.fade.hazeDensityScale,s.fade.horizonMeltStart,s.fade.horizonMeltEnd,0]],weatherMass:["vec4f",s.weather.mainMass.slice()],weatherDetail:["vec4f",s.weather.detail.slice()],weather:["vec4f",[s.weather.coverage,0,0,0]]},{label:"sky clouds settings"}),this.F=this.frameBlock.fields,this.S=this.settingsBlock.fields,this.coverage={value:i.coverage},this.resolutionScale=1,this.outputSize=null,this.noise=new W({label:"cloud shape noise 64³",width:64,height:64,depth:64,dimension:"3d",format:"rgba8unorm",usage:["sample","copyDst"]}),this.blue=new W({label:"cloud blue noise",width:64,height:64,format:"r8unorm",usage:["sample","copyDst"]});const n=s.weather.resolution;this.weatherMap=new W({label:"cloud weather",width:n,height:n,format:"rgba8unorm",usage:["sample","storage"]}),this.weatherBounds=new W({label:"cloud weather bounds",width:64,height:64,format:"rgba8unorm",usage:["sample","storage"]});const o=(l,h=4,c=4,u="rgba16float")=>new W({label:l,width:h,height:c,format:u,usage:["sample","storage"]});this.source=o("cloud radiance"),this.sourceMeta=o("cloud depth + cost"),this.colors=[o("cloud history A"),o("cloud history B")],this.metas=[o("cloud history meta A"),o("cloud history meta B")],this.panorama=o("cloud panorama",Gt,_s),this.shadowMap=o("cloud shadow",ke,ke,"r32float"),this._pp=0,this.viewTex=this.colors[0],this.ready=this._loadNoise(),this._buildModules(),this._buildKernels(),this._w=0,this._h=0,this._scale=1,this.sourceWidth=1,this.sourceHeight=1,this.historyWidth=1,this.historyHeight=1,this.frameIndex=0,this.historyValid=!1,this.weatherDirty=!0,this.panoWarm=!0,this._windX=0,this._windZ=0,this._evolution=0,this._elapsed=0,this._prevCam=null,this._prevLight=new S,this._lastCoverage=-1}async _loadNoise(){const e=uo&&"/"||"/",t=async u=>{const d=await fetch(e+"clouds/"+u);if(!d.ok)throw new Error(`clouds: ${u} HTTP ${d.status}`);return d},[s,i]=await Promise.all([t("baseShape64.bin"),t("blueNoise.bin")]),r=new Uint8Array(await new Response(s.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()),n=new DataView(r.buffer,r.byteOffset,r.byteLength);if(n.getUint32(0,!0)!==828004942)throw new Error("clouds: bad noise blob");const o=[n.getUint16(6,!0),n.getUint16(8,!0),n.getUint16(10,!0)],l=n.getUint8(12),h=this.noise;h.gpu=z.device.createTexture({label:h.label,dimension:"3d",size:o,mipLevelCount:l,format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),h.mipsOption=l,h._views.clear(),h.version++;let c=16;for(let u=0;u<l;u++){const d=o.map(v=>Math.max(1,v>>u)),m=d[0]*d[1]*d[2]*4;z.queue.writeTexture({texture:h.gpu,mipLevel:u},r,{offset:c,bytesPerRow:d[0]*4,rowsPerImage:d[1]},d),c+=m}this.blue.upload(new Uint8Array(await i.arrayBuffer()))}_buildModules(){const e=this.atmosphere;this.uniformModule=new N({name:"skyCloudsUniforms",deps:[B],bindings:{scf:{uniform:this.frameBlock},scs:{uniform:this.settingsBlock}}}),this.coreModule=new N({name:"skyCloudsCore",deps:[this.uniformModule],bindings:{scNoise:{texture:this.noise},scWeatherMap:{texture:this.weatherMap}},code:po}),this.marchModule=new N({name:"skyCloudsMarch",deps:[this.coreModule,e.module,e.transmittanceModule],bindings:{scWeatherBounds:{texture:this.weatherBounds}},code:mo}),this.params=new U("CloudsParams",{viewRight:["vec3f",new S(1,0,0)],viewUp:["vec3f",new S(0,1,0)],viewFwd:["vec3f",new S(0,0,-1)],viewTan:["vec2f",new I(1,1)],viewValid:["f32",0],shadowCenter:["vec2f",new I],shadowSize:["f32",12e3],shadowStrength:["f32",.85]},{label:"clouds"});const t=this.params.fields;this.viewCam={right:t.viewRight,up:t.viewUp,fwd:t.viewFwd,tan:t.viewTan},this.viewValid=t.viewValid,this.shadowCenter=t.shadowCenter,this.shadowSize=t.shadowSize,this.shadowStrength=t.shadowStrength,this.shadowModule=new N({name:"cloudsShadow",deps:[B],uniforms:this.params,uniformName:"cloudsParams",bindings:{cloudsShadowMap:{texture:this.shadowMap}},code:`
// cloud shadow transmittance (1 = clear) at a world position. Manual bilinear filtering of an
// unfilterable texture: costs no sampler in the (sampler hungry) scene materials.
fn cloudsShadowTap( i: vec2i ) -> f32 { return textureLoad( cloudsShadowMap, clamp( i, vec2i( 0 ), vec2i( ${ke-1} ) ), 0 ).x; }
// (the last lookup is remembered: the scene lighting hooks ask for the same point several times)
var<private> cloudsShadowMemoXZ: vec2f = vec2f( 3.0e38 );
var<private> cloudsShadowMemo: f32 = 1.0;
fn cloudsShadow( worldXZ: vec2f ) -> f32 {
	if ( all( worldXZ == cloudsShadowMemoXZ ) ) { return cloudsShadowMemo; }
	cloudsShadowMemoXZ = worldXZ;
	cloudsShadowMemo = _cloudsShadow( worldXZ );
	return cloudsShadowMemo;
}
fn _cloudsShadow( worldXZ: vec2f ) -> f32 {
	let uv = ( worldXZ - cloudsParams.shadowCenter ) / cloudsParams.shadowSize + 0.5;
	let st = uv * ${Se(ke)} - 0.5;
	let i0 = vec2i( floor( st ) );
	let fr = fract( st );
	let s = mix( mix( cloudsShadowTap( i0 ), cloudsShadowTap( i0 + vec2i( 1, 0 ) ), fr.x ), mix( cloudsShadowTap( i0 + vec2i( 0, 1 ) ), cloudsShadowTap( i0 + vec2i( 1, 1 ) ), fr.x ), fr.y );
	let e = abs( uv - 0.5 );
	let inside = smoothstep( 0.5, 0.42, max( e.x, e.y ) );
	return mix( 1.0, s, cloudsParams.shadowStrength * inside );
}
`}),this.module=new N({name:"clouds",deps:[B,this.shadowModule],uniforms:this.params,uniformName:"cloudsParams",bindings:{cloudsPanorama:{texture:this.panorama},cloudsView:{texture:()=>this.viewTex}},code:`
// vec4( rgb in-scattered radiance, a transmittance ) for a view direction (panorama)
fn cloudsSample( dir: vec3f ) -> vec4f {
	let az = atan2( dir.z, dir.x );
	let u = fract( az / ${Se(2*Math.PI)} );
	let elev = - acos( clamp( dir.y, -1.0, 1.0 ) ) + ${Se(Math.PI/2)};
	let t = clamp( ( elev + ${Se(4*Vt)} ) / ${Se(94*Vt)}, 0.0, 1.0 );
	let s = textureSampleLevel( cloudsPanorama, smpLinearRepeat, vec2f( u, sqrt( t ) ), 0.0 );
	let below = smoothstep( -0.07, -0.03, dir.y );
	return vec4f( s.rgb * below, mix( 1.0, s.a, below ) );
}

// Transmittance for the sun's disc behind the clouds. The cloud march stops once less than 0.3 % of
// the light gets through and reports that remainder, which (noisy from frame to frame) let a
// clamped sun disc of 2500x the sky shine and sparkle through thick cloud: below ~0.4 % it is dark.
fn cloudsSunTransmittance( T: f32 ) -> f32 { return T * smoothstep( 0.004, 0.04, T ); }

// The main view's clouds: the temporally reconstructed half resolution history, looked up with the
// camera it was resolved for; outside it (or before any trace) the panorama
fn cloudsSampleView( dir: vec3f ) -> vec4f {
	let x = dot( dir, cloudsParams.viewRight );
	let y = dot( dir, cloudsParams.viewUp );
	let z = dot( dir, cloudsParams.viewFwd );
	let uv = vec2f( x / max( z, 1e-4 ) / cloudsParams.viewTan.x * 0.5 + 0.5, 0.5 - y / max( z, 1e-4 ) / cloudsParams.viewTan.y * 0.5 );
	let inside = cloudsParams.viewValid > 0.5 && z > 0.01 && all( uv >= vec2f( 0.0 ) ) && all( uv <= vec2f( 1.0 ) );
	if ( inside ) {
		let v = max( textureSampleLevel( cloudsView, smpLinearClamp, uv, 0.0 ), vec4f( 0.0 ) );
		let above = smoothstep( -0.05, -0.03, dir.y );
		return vec4f( v.rgb * above, 1.0 - min( v.a, 1.0 ) * above );
	}
	return cloudsSample( dir );
}
`})}_buildKernels(){const e="@compute @workgroup_size( WG_X, WG_Y, WG_Z ) fn main( @builtin( global_invocation_id ) id: vec3u )",t=(o,l,h,c)=>new J({label:o,modules:l,bindings:h,code:c,workgroupSize:[8,8,1]});this.weatherKernel=t("Cloud Weather",[this.uniformModule],{scOut:{storageTexture:this.weatherMap}},vo+`
${e} {
	let size = textureDimensions( scOut );
	if ( any( id.xy >= size ) ) { return; }
	let uv = vec2f( id.xy ) / vec2f( size );
	let mass = clamp( ( scFbm( uv, scs.weatherMass ) - 0.5 ) * scs.weatherMass.w + 0.5, 0.0, 1.0 );
	let detail = ( scFbm( uv, scs.weatherDetail ) * 2.0 - 1.0 ) * scs.weatherDetail.w;
	textureStore( scOut, id.xy, vec4f( clamp( mass + detail + scs.weather.x - 0.5, 0.0, 1.0 ), 0.0, 0.0, 1.0 ) );
}`),this.boundsKernel=t("Cloud Weather Bounds",[this.coreModule],{scOut:{storageTexture:this.weatherBounds}},`
${e} {
	let size = textureDimensions( scOut );
	if ( any( id.xy >= size ) ) { return; }
	let sourceSize = vec2i( textureDimensions( scWeatherMap ) );
	let scale = vec2f( sourceSize ) / vec2f( size );
	// both bilinear neighbours at cell boundaries, including the repeat seam
	let lo = vec2i( floor( vec2f( id.xy ) * scale - 0.5 ) );
	let hi = vec2i( ceil( vec2f( id.xy + 1u ) * scale - 0.5 ) );
	var maximum = 0.0;
	for ( var y = lo.y; y <= hi.y; y++ ) {
		for ( var x = lo.x; x <= hi.x; x++ ) {
			let p = ( ( vec2i( x, y ) % sourceSize ) + sourceSize ) % sourceSize;
			maximum = max( maximum, textureLoad( scWeatherMap, p, 0 ).r );
		}
	}
	textureStore( scOut, id.xy, vec4f( min( 1.0, maximum + 1.0 / 255.0 ), 0.0, 0.0, 1.0 ) );
}`),this.traceKernel=t("Clouds Trace",[this.marchModule],{scBlue:{texture:this.blue},scOutColor:{storageTexture:this.source},scOutMeta:{storageTexture:this.sourceMeta}},`
${e} {
	let size = textureDimensions( scOutColor );
	if ( any( id.xy >= size ) ) { return; }
	let uv = scSourceUV( vec2f( id.xy ) );
	let dir = scRay( uv );
	let noise = textureLoad( scBlue, vec2i( id.xy % 64u ), 0 ).r;
	let dither = select( 0.5, fract( noise + scf.clock.x * 0.61803398875 ), scf.temporal.x > 0.0 );
	let pixelConeAngle = 2.0 * scf.position.w / scf.viewport.y;
	let stepConeAngle = 2.0 * scf.position.w / scf.viewport.w;
	let m = scMarch( scf.position.xyz, dir, dither, pixelConeAngle, stepConeAngle, u32( scf.march.y ), scf.display.y > 0.0 );
	textureStore( scOutColor, id.xy, vec4f( m.color, m.alpha ) );
	// km depth fits half float; the metadata also records the normalized primary sample cost
	textureStore( scOutMeta, id.xy, vec4f( m.depth * 0.001, 1.0, f32( m.steps ) / scf.march.y, 0.0 ) );
}`);const s=()=>this.colors[this._pp],i=()=>this.metas[this._pp],r=()=>this.colors[1-this._pp],n=()=>this.metas[1-this._pp];this.temporalKernel=new J({label:"Clouds Resolve",modules:[this.coreModule],workgroupSize:[8,8,1],bindings:{scCurrentColor:{texture:this.source},scCurrentMeta:{texture:this.sourceMeta},scPreviousColor:{texture:r},scPreviousMeta:{texture:n},scOutputColor:{storageTexture:s},scOutputMeta:{storageTexture:i}},code:`
var<workgroup> scTileColor: array<vec4f, 121>;
var<workgroup> scTileMeta: array<vec4f, 121>;
fn scSourceClamp( p: vec2i ) -> vec2i { return clamp( p, vec2i( 0 ), vec2i( textureDimensions( scCurrentColor ) ) - 1 ); }
fn scTileIndex( p: vec2i, origin: vec2i, width: u32 ) -> u32 {
	let local = vec2u( scSourceClamp( p ) - origin );
	return local.y * width + local.x;
}
fn scHistoryAt( uv: vec2f, size: vec2f ) -> vec4f {
	// five tap Catmull-Rom: detail survives repeated history warps
	let position = uv * size;
	let center = floor( position - 0.5 ) + 0.5;
	let fr = position - center;
	let w0 = fr * ( fr * ( -0.5 * fr + 1.0 ) - 0.5 );
	let w1 = fr * fr * ( 1.5 * fr - 2.5 ) + 1.0;
	let w2 = fr * ( fr * ( -1.5 * fr + 2.0 ) + 0.5 );
	let w3 = fr * fr * ( 0.5 * fr - 0.5 );
	let w12 = w1 + w2;
	let uv0 = ( center - 1.0 ) / size;
	let uv3 = ( center + 2.0 ) / size;
	let uv12 = ( center + w2 / w12 ) / size;
	let weights = vec4f( w12.x * w0.y, w0.x * w12.y, w12.x * w12.y, w3.x * w12.y );
	let bottomWeight = w12.x * w3.y;
	let value = textureSampleLevel( scPreviousColor, smpLinearClamp, vec2f( uv12.x, uv0.y ), 0.0 ) * weights.x
		+ textureSampleLevel( scPreviousColor, smpLinearClamp, vec2f( uv0.x, uv12.y ), 0.0 ) * weights.y
		+ textureSampleLevel( scPreviousColor, smpLinearClamp, uv12, 0.0 ) * weights.z
		+ textureSampleLevel( scPreviousColor, smpLinearClamp, vec2f( uv3.x, uv12.y ), 0.0 ) * weights.w
		+ textureSampleLevel( scPreviousColor, smpLinearClamp, vec2f( uv12.x, uv3.y ), 0.0 ) * bottomWeight;
	return value / ( dot( weights, vec4f( 1.0 ) ) + bottomWeight );
}
fn scFreshHistoryWeight( color: vec4f, depth: f32 ) -> f32 {
	let retain = select( mix( 0.25, 0.65, smoothstep( 8.0, 30.0, depth ) ), 0.25, color.a < 0.0001 );
	return min( scf.temporal.x, retain ) * ( 1.0 - scf.temporal.y );
}
fn scResolve( pixel: vec2u, color: vec4f, depth: f32, carriedDepth: f32, cost: f32, weight: f32 ) {
	textureStore( scOutputColor, pixel, vec4f( max( color.rgb, vec3f( 0.0 ) ), clamp( color.a, 0.0, 1.0 ) ) );
	textureStore( scOutputMeta, pixel, vec4f( depth, carriedDepth, cost, weight ) );
}
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) id: vec3u, @builtin( local_invocation_index ) thread: u32, @builtin( workgroup_id ) group: vec3u ) {
	let size = textureDimensions( scOutputColor );
	let tileWidth = u32( ceil( 8.0 / scf.sampling.z ) ) + 3u;
	let tileOrigin = vec2i( floor( ( vec2f( group.xy * 8u ) - scf.sampling.xy ) / scf.sampling.z ) ) - 1;
	for ( var index = thread; index < tileWidth * tileWidth; index += 64u ) {
		let p = scSourceClamp( tileOrigin + vec2i( i32( index % tileWidth ), i32( index / tileWidth ) ) );
		scTileColor[ index ] = textureLoad( scCurrentColor, p, 0 );
		scTileMeta[ index ] = textureLoad( scCurrentMeta, p, 0 );
	}
	workgroupBarrier();
	if ( any( id.xy >= size ) ) { return; }
	let uv = ( vec2f( id.xy ) + 0.5 ) / vec2f( size );
	let lattice = u32( scf.sampling.z );
	let fresh = all( id.xy % lattice == vec2u( scf.sampling.xy ) );
	let source = ( vec2f( id.xy ) - scf.sampling.xy ) / scf.sampling.z;
	let center = scSourceClamp( vec2i( round( source ) ) );
	let metadata = scTileMeta[ scTileIndex( center, tileOrigin, tileWidth ) ];
	let central = scTileColor[ scTileIndex( center, tileOrigin, tileWidth ) ];
	let currentDepth = max( metadata.x, 0.001 );
	let stored = textureLoad( scPreviousMeta, vec2i( id.xy ), 0 );
	let historyValid = scf.sampling.w > 0.5 && scf.temporal.x > 0.0;

	// a still view: untouched slots keep their colour and depth exactly
	if ( scf.temporal.z > 0.5 && historyValid && stored.y >= 0.001 ) {
		let history = textureLoad( scPreviousColor, vec2i( id.xy ), 0 );
		if ( fresh ) {
			let weight = scFreshHistoryWeight( central, currentDepth );
			scResolve( id.xy, mix( central, history, weight ), currentDepth, currentDepth, metadata.z, weight );
		} else {
			scResolve( id.xy, history, stored.x, stored.y, stored.z, 1.0 );
		}
		return;
	}

	var color = vec4f( 0.0 ); var weightSum = 0.0;
	let base = vec2i( floor( source ) ); let fraction = fract( source );
	for ( var y = 0; y < 2; y++ ) {
		for ( var x = 0; x < 2; x++ ) {
			let pos = scSourceClamp( base + vec2i( x, y ) );
			let index = scTileIndex( pos, tileOrigin, tileWidth );
			let tap = scTileColor[ index ]; let depth = scTileMeta[ index ].x;
			let bilinear = select( 1.0 - fraction.x, fraction.x, x == 1 ) * select( 1.0 - fraction.y, fraction.y, y == 1 );
			let weight = bilinear * exp( -abs( depth - metadata.x ) / max( 0.1, metadata.x * 0.1 ) - abs( tap.a - central.a ) * 4.0 );
			color += tap * weight; weightSum += weight;
		}
	}
	color = select( central, color / max( weightSum, 0.00001 ), weightSum > 0.00001 );
	if ( fresh ) { color = central; }
	if ( ! historyValid ) {
		scResolve( id.xy, color, currentDepth, currentDepth, metadata.z, 0.0 );
		return;
	}

	var low = color; var high = color;
	var reprojectionDepth = select( SC_FAR * 0.001, stored.y, stored.y >= 0.001 );
	for ( var y = -1; y <= 1; y++ ) {
		for ( var x = -1; x <= 1; x++ ) {
			let tap = scTileColor[ scTileIndex( center + vec2i( x, y ), tileOrigin, tileWidth ) ];
			low = min( low, tap ); high = max( high, tap );
			let neighbor = clamp( vec2i( id.xy ) + vec2i( x, y ), vec2i( 0 ), vec2i( size ) - 1 );
			let depth = textureLoad( scPreviousMeta, neighbor, 0 ).y;
			if ( depth >= 0.001 ) { reprojectionDepth = min( reprojectionDepth, depth ); }
		}
	}
	if ( stored.y < 0.001 ) { reprojectionDepth = min( reprojectionDepth, currentDepth ); }
	var world = scf.position.xyz + scRay( uv ) * ( reprojectionDepth * 1000.0 );
	world -= vec3f( scf.windDelta.x, 0.0, scf.windDelta.y );
	let previous = scProjectPrevious( world );
	let previousPixel = clamp( vec2i( previous.xy * vec2f( size ) ), vec2i( 0 ), vec2i( size ) - 1 );
	let oldMeta = textureLoad( scPreviousMeta, previousPixel, 0 );
	let valid = previous.z > 0.0 && all( previous.xy >= vec2f( 0.0 ) ) && all( previous.xy <= vec2f( 1.0 ) ) && oldMeta.y >= 0.001;
	var carriedDepth = currentDepth; var historyFraction = 0.0;
	if ( valid ) {
		let history = clamp( scHistoryAt( previous.xy, vec2f( size ) ), low, high );
		let motionPixels = length( ( previous.xy - uv ) * vec2f( size ) );
		historyFraction = select( 1.0, scFreshHistoryWeight( central, currentDepth ), fresh );
		color = mix( color, history, historyFraction );
		let expectedDepth = length( world - scf.previousPosition.xyz ) * 0.001;
		if ( ! fresh && ( motionPixels <= 0.5 || abs( oldMeta.y - expectedDepth ) < max( 0.001, expectedDepth * 0.15 ) ) ) {
			carriedDepth = oldMeta.y;
		}
	}
	scResolve( id.xy, color, currentDepth, carriedDepth, metadata.z, historyFraction );
}`}),this.panoKernel=t("Clouds Panorama",[this.marchModule],{scPano:{storageTexture:this.panorama}},`
${e} {
	let size = textureDimensions( scPano );
	let texel = id.xy * u32( scf.pano.z ) + vec2u( scf.pano.xy );
	if ( any( texel >= size ) ) { return; }
	let uv = ( vec2f( texel ) + 0.5 ) / vec2f( size );
	let elev = uv.y * uv.y * ${Se(94*Vt)} - ${Se(4*Vt)};
	let az = uv.x * ${Se(2*Math.PI)};
	let dir = vec3f( cos( elev ) * cos( az ), sin( elev ), cos( elev ) * sin( az ) );
	let cone = ${Se(2*Math.PI/Gt)};
	let m = scMarch( scf.position.xyz, dir, 0.5, cone, cone, 128u, true );
	textureStore( scPano, texel, vec4f( m.color, 1.0 - m.alpha ) );
}`),this.shadowKernel=t("Clouds Shadow",[this.marchModule],{scShadow:{storageTexture:this.shadowMap}},`
${e} {
	let size = textureDimensions( scShadow );
	// a quarter of the rows per frame (w = phase), or all of them (w < 0)
	let full = scf.shadow.w < 0.0;
	let texel = select( vec2u( id.x, id.y * 4u + u32( max( scf.shadow.w, 0.0 ) ) ), id.xy, full );
	if ( any( texel >= size ) ) { return; }
	let xz = scf.shadow.xy + ( ( vec2f( texel ) + 0.5 ) / vec2f( size ) - 0.5 ) * scf.shadow.z;
	let L = frame.sunDir;
	let ly = max( L.y, 0.08 );
	let t0 = scs.shell.x / ly;
	let t1 = ( scs.shell.x + scs.shell.y ) / ly;
	let n = 16;
	let dt = ( t1 - t0 ) / f32( n );
	var tau = 0.0;
	for ( var i = 0; i < n; i++ ) {
		let t = t0 + ( f32( i ) + 0.5 ) * dt;
		let p = vec3f( xz.x, 0.0, xz.y ) + vec3f( L.x, ly, L.z ) * t;
		tau += scLightDensity( p, scs.shell.w, vec2f( 2.0, 2.0 ), false ) * scs.shell.z * dt;
		if ( tau > 12.0 ) { break; }
	}
	// multiple scattering lets some light through even thick cloud (as the view's octaves do)
	let T = exp( -tau ) * 0.8 + exp( -tau * 0.25 ) * 0.2;
	textureStore( scShadow, texel, vec4f( T, 0.0, 0.0, 1.0 ) );
}`)}_drawingBufferSize(){if(this.outputSize)return this.outputSize;const e=re.fields.outputResolution.value;if(e&&e.x>0)return e;const t=z.canvas;return{x:t?t.width:1280,y:t?t.height:720}}_allocate(e,t){const s=$i,i=this.resolutionScale;this.sourceWidth=Math.max(1,Math.ceil(e*i/s.historyDivisor/s.lattice)),this.sourceHeight=Math.max(1,Math.ceil(t*i/s.historyDivisor/s.lattice)),this.historyWidth=this.sourceWidth*s.lattice,this.historyHeight=this.sourceHeight*s.lattice,this.source.resize(this.sourceWidth,this.sourceHeight),this.sourceMeta.resize(this.sourceWidth,this.sourceHeight);for(const r of[...this.colors,...this.metas])r.resize(this.historyWidth,this.historyHeight);this.historyValid=!1}update(e,t){const s=$i,i=Hi,r=this.F,n=this.S;e=Math.min(.1,Math.max(0,e));const o=this._drawingBufferSize();(o.x!==this._w||o.y!==this._h||this.resolutionScale!==this._scale)&&(this._w=o.x,this._h=o.y,this._scale=this.resolutionScale,this._allocate(o.x,o.y));const l=this.coverage.value;l!==this._lastCoverage&&(n.shell.value[3]=l,this._lastCoverage=l,this.historyValid=!1,this.panoWarm=!0);const h=H.windDir.value,c=Math.hypot(h.x,h.y)||1,u=h.x/c,d=h.y/c;if(n.wind.value[0]=u,n.wind.value[1]=d,this.weatherDirty){const L=this.weatherMap.width;this.weatherKernel.dispatch([L/8,L/8,1]),this.boundsKernel.dispatch([8,8,1]),this.weatherDirty=!1}t.updateMatrixWorld();const m=t.matrixWorld.elements,v=t.position,p=Math.tan(He.degToRad(t.fov*.5))/(t.zoom||1),f=t.aspect,x=[m[0],m[1],m[2]],w=[m[4],m[5],m[6]],y=[-m[8],-m[9],-m[10]],g=L=>{const ue=Math.hypot(L[0],L[1],L[2])||1;return[L[0]/ue,L[1]/ue,L[2]/ue]},b=g(x),M=g(w),_=g(y),P={position:[v.x,v.y,v.z,p],right:[...b,f],up:[...M,0],forward:[..._,0]},T=this._prevCam;(!T||Math.hypot(v.x-T.position[0],v.y-T.position[1],v.z-T.position[2])>1e3||_[0]*T.forward[0]+_[1]*T.forward[1]+_[2]*T.forward[2]<.7||Math.abs(p-T.position[3])>.01)&&(this.historyValid=!1);const A=H.sunDir.value;A.dot(this._prevLight)<.999&&(this.historyValid=!1,this.panoWarm=!0),this._prevLight.copy(A);const k=this.historyValid&&T?T:P;r.position.value=P.position,r.right.value=P.right,r.up.value=P.up,r.forward.value=P.forward,r.previousPosition.value=k.position,r.previousRight.value=k.right,r.previousUp.value=k.up,r.previousForward.value=k.forward,this._prevCam=P;const F=s.lattice,V=this.frameIndex%(F*F);let me=0,E=0;for(let L=0;1<<L<F;L++){const ue=V>>L*2&3;me|=(ue>>1^ue&1)<<Math.log2(F)-L-1,E|=(ue&1)<<Math.log2(F)-L-1}r.viewport.value=[o.x*this.resolutionScale,o.y*this.resolutionScale,this.historyWidth,this.historyHeight],r.sampling.value=[me,E,F,this.historyValid?1:0],this._elapsed+=e;const je=i.wind.speed,Xe=u*je*e,Ye=d*je*e;this._windX+=Xe,this._windZ+=Ye,this._evolution+=i.wind.evolutionSpeed*e,r.clock.value=[this.frameIndex%4096,this._elapsed,e,0],r.wind.value=[this._windX,this._windZ,this._evolution,0],r.windDelta.value=[Xe,Ye,0,0],r.march.value=[s.stepMeters,s.maxSteps,s.lightTaps,s.fullLightingAlpha],r.temporal.value=[s.historyWeight,Math.min(1,i.wind.evolutionSpeed*e/100),0,0],r.display.value=[0,s.lightReuseSteps,0,0];const ze=A.x,ve=A.y,xe=A.z;let it=xe,rt=0,at=-ze;Math.abs(ve)>.99&&(it=0,rt=-xe,at=ve);const as=1/Math.hypot(it,rt,at);it*=as,rt*=as,at*=as;const Gr=ve*at-xe*rt,Hr=xe*it-ze*at,$r=ze*rt-ve*it,Ne=r.lightOffsets.value,qs=r.lightLods.value;Ne[0]=0,Ne[1]=0,Ne[2]=0,Ne[3]=25;const ns=i.shape;for(let L=1;L<8;L++){const ue=1.7**L,nt=25*((ue-1)/.7+ue*.5),Xs=L*2.399963,Ys=Math.sqrt((L+.5)/s.lightTaps),os=Math.cos(Xs)*Ys*.05*nt,ls=Math.sin(Xs)*Ys*.05*nt,ot=L*4;Ne[ot]=ze*nt+it*os+Gr*ls,Ne[ot+1]=ve*nt+rt*os+Hr*ls,Ne[ot+2]=xe*nt+at*os+$r*ls,Ne[ot+3]=25*ue;const Ks=nt*.1;qs[ot]=Math.max(0,Math.log2(Ks*64/ns.baseScale)),qs[ot+1]=Math.max(0,Math.log2(Ks*64/(ns.baseScale*ns.erosionScaleBaseMultiplier)))}const js=this.frameIndex%4;if(js===0||!this._shadowInit){const L=this.shadowSize.value/ke*4;this.shadowCenter.value.set(Math.round(v.x/L)*L,Math.round(v.z/L)*L)}r.shadow.value=[this.shadowCenter.value.x,this.shadowCenter.value.y,this.shadowSize.value,js];const qr=H.cameraUnderwater&&H.cameraUnderwater.value>.5;if(this._shadowInit?this.shadowKernel.dispatch([ke/8,ke/32,1]):(r.shadow.value=[this.shadowCenter.value.x,this.shadowCenter.value.y,this.shadowSize.value,-1],this.shadowKernel.dispatch([ke/8,ke/8,1]),this._shadowInit=!0),this.panoWarm)r.pano.value=[0,0,1,0],this.panoKernel.dispatch([Gt/8,_s/8,1]),this.panoWarm=!1;else{const L=this.frameIndex%(Ke*Ke);r.pano.value=[L%Ke,Math.floor(L/Ke),Ke,0],this.panoKernel.dispatch([Math.ceil(Gt/Ke/8),Math.ceil(_s/Ke/8),1])}if(qr)this.viewValid.value=0,this.historyValid=!1;else{this.traceKernel.dispatch([Math.ceil(this.sourceWidth/8),Math.ceil(this.sourceHeight/8),1]),this.temporalKernel.dispatch([Math.ceil(this.historyWidth/8),Math.ceil(this.historyHeight/8),1]),this.viewTex=this.colors[this._pp],this._pp=1-this._pp;const L=this.viewCam;L.right.value.set(b[0],b[1],b[2]),L.up.value.set(M[0],M[1],M[2]),L.fwd.value.set(_[0],_[1],_[2]),L.tan.value.set(p*f,p),this.viewValid.value=1,this.historyValid=!0}this.frameIndex++}resetHistory(){this.historyValid=!1}invalidate(){this.panoWarm=!0,this.resetHistory()}}class go{constructor(e,t=e.label){const s=e.width;if(e.height!==s||s&s-1||s<32||s>512)throw new Error("ComputeMips: square power-of-two 32..512 only");this.res=s,this.layers=e.dimension==="3d"?1:e.depth;const i=e.mipLevelCount,r=Math.min(5,i-1),n=d=>({storageTexture:e,access:"write",view:{dimension:"2d-array",baseMipLevel:d,mipLevelCount:1}}),o=d=>({texture:e,view:{dimension:"2d-array",baseMipLevel:d,mipLevelCount:1}}),l=(d,m,v,p)=>`
	if ( lx < ${v}u && ly < ${v}u ) {
		let i = ly * ${4*v}u + lx * 2u;
		let v = ( ${d}[ i ] + ${d}[ i + 1u ] + ${d}[ i + ${2*v}u ] + ${d}[ i + ${2*v+1}u ] ) * 0.25;
		textureStore( out${p}, vec2u( gx * ${v}u + lx, gy * ${v}u + ly ), layer, v );
		${m?`${m}[ ly * ${v}u + lx ] = v;`:""}
	}
	workgroupBarrier();`,h={src0:o(0)};let c="";for(let d=1;d<=r;d++)h["out"+d]=n(d);for(let d=2,m=8;d<=r;d++,m>>=1)c+=l("s"+(d-1),d<r?"s"+d:null,m,d);this.kernelA=new J({label:t+" mips A",bindings:h,workgroupSize:[16,16,1],code:`
var<workgroup> s1: array<vec4f, 256>;
var<workgroup> s2: array<vec4f, 64>;
var<workgroup> s3: array<vec4f, 16>;
var<workgroup> s4: array<vec4f, 4>;
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( local_invocation_id ) lid: vec3u, @builtin( workgroup_id ) wid: vec3u ) {
	let lx = lid.x; let ly = lid.y;
	let gx = wid.x; let gy = wid.y; let layer = wid.z;
	let x1 = gx * 16u + lx; let y1 = gy * 16u + ly;
	let p = vec2u( x1, y1 ) * 2u;
	let v1 = ( textureLoad( src0, p, layer, 0 ) + textureLoad( src0, p + vec2u( 1u, 0u ), layer, 0 ) + textureLoad( src0, p + vec2u( 0u, 1u ), layer, 0 ) + textureLoad( src0, p + vec2u( 1u, 1u ), layer, 0 ) ) * 0.25;
	textureStore( out1, vec2u( x1, y1 ), layer, v1 );
	s1[ ly * 16u + lx ] = v1;
	workgroupBarrier();
${c}
}`}),this.kernelB=null;const u=s>>5;if(i>6&&u>1){const d={src5:o(5)};let m="",v="",p="s5";for(let f=6,x=u>>1;f<i&&x>=1;f++,x>>=1){d["out"+f]=n(f);const w=x>1&&f<i-1?"s"+f:null;w&&(v+=`var<workgroup> ${w}: array<vec4f, ${x*x}>;
`),m+=l(p,w,x,f),p=w}this.kernelB=new J({label:t+" mips B",bindings:d,workgroupSize:[u,u,1],code:`
var<workgroup> s5: array<vec4f, ${u*u}>;
${v}
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( local_invocation_id ) lid: vec3u, @builtin( workgroup_id ) wid: vec3u ) {
	let lx = lid.x; let ly = lid.y; let layer = wid.z;
	let gx = 0u; let gy = 0u;
	s5[ ly * ${u}u + lx ] = textureLoad( src5, vec2u( lx, ly ), layer, 0 );
	workgroupBarrier();
${m}
}`})}}dispatch(e=null){const t=e?{pass:e}:void 0;this.kernelA.dispatch([this.res/32,this.res/32,this.layers],t),this.kernelB&&this.kernelB.dispatch([1,1,this.layers],t)}}const zt=6,se=32,ft=a=>{const e=String(a);return e.includes(".")||e.includes("e")?e:e+".0"},Ms=`
fn envCubeDir( face: u32, x: u32, y: u32, size: u32 ) -> vec3f {
	let u = ( f32( x ) + 0.5 ) / f32( size ) * 2.0 - 1.0;
	let v = ( f32( y ) + 0.5 ) / f32( size ) * 2.0 - 1.0;
	var d: vec3f;
	switch ( face ) {
		case 0u: { d = vec3f( 1.0, -v, -u ); }
		case 1u: { d = vec3f( -1.0, -v, u ); }
		case 2u: { d = vec3f( u, 1.0, v ); }
		case 3u: { d = vec3f( u, -1.0, -v ); }
		case 4u: { d = vec3f( u, -v, 1.0 ); }
		default: { d = vec3f( -u, -v, -1.0 ); }
	}
	return normalize( d );
}
`;class yo{constructor(e,t,s,i=128){this.renderer=e,this.scene=t,this.sky=s,this.size=i,t&&(t.environmentIntensity=1),this.source=new W({label:"envSource",width:i,height:i,dimension:"cube",format:"rgba16float",mips:!0,usage:["sample","storage","render"]});const r=n=>new W({label:n,width:i,height:i,dimension:"cube",format:"rgba16float",mips:zt,usage:["sample","storage"]});this.targets=[r("envSpecularA"),r("envSpecularB")],this.front=0,this.sh=[new $e({label:"envSH_A",count:9,type:"vec4f",data:wo()}),new $e({label:"envSH_B",count:9,type:"vec4f"})],this.lastSun=new S(0,-2,0),this.timer=0,this.interval=3,this.step=-1,this.primed=!1,this._build(),this.steps=this._buildSteps()}_build(){const e=this.sky,t=this.size;this.faceParams=[],this.faceKernels=[];for(let i=0;i<6;i++)this.faceKernels.push(new J({label:"Env Face "+i,modules:[B,e.module],bindings:{outCube:{storageTexture:this.source,viewDimension:"2d-array"}},workgroupSize:[8,8,1],code:`${Ms}
@compute @workgroup_size( WG_X, WG_Y, WG_Z ) fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	if ( gid.x >= ${t}u || gid.y >= ${t}u ) { return; }
	let dir = envCubeDir( ${i}u, gid.x, gid.y, ${t}u );
	// no sun or moon disk: the key light is lit directly
	textureStore( outCube, gid.xy, ${i}, vec4f( skyRadianceWithClouds( dir, false ), 1.0 ) );
}`}));this.filterKernels=[[],[]];for(let i=0;i<2;i++)for(let r=0;r<zt;r++){const n=r/(zt-1),o=t>>r;this.filterKernels[i].push(new J({label:"Env GGX "+r,modules:[B],bindings:{srcCube:{texture:this.source,viewDimension:"cube"},outCube:{storageTexture:this.targets[i],view:{dimension:"2d-array",baseMipLevel:r,mipLevelCount:1}}},workgroupSize:[8,8,1],code:`${Ms}
fn hammersley( i: u32, n: u32 ) -> vec2f {
	var b = i;
	b = ( b << 16u ) | ( b >> 16u );
	b = ( ( b & 0x55555555u ) << 1u ) | ( ( b & 0xAAAAAAAAu ) >> 1u );
	b = ( ( b & 0x33333333u ) << 2u ) | ( ( b & 0xCCCCCCCCu ) >> 2u );
	b = ( ( b & 0x0F0F0F0Fu ) << 4u ) | ( ( b & 0xF0F0F0F0u ) >> 4u );
	b = ( ( b & 0x00FF00FFu ) << 8u ) | ( ( b & 0xFF00FF00u ) >> 8u );
	return vec2f( f32( i ) / f32( n ), f32( b ) * 2.3283064365386963e-10 );
}
@compute @workgroup_size( WG_X, WG_Y, WG_Z ) fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	if ( gid.x >= ${o}u || gid.y >= ${o}u ) { return; }
	let N = envCubeDir( gid.z, gid.x, gid.y, ${o}u );
${r===0?`
	textureStore( outCube, gid.xy, gid.z, vec4f( textureSampleLevel( srcCube, smpLinearClamp, N, 0.0 ).rgb, 1.0 ) );
}`:`
	// filtered importance sampling (Karis 2013 / GPU Gems 3 ch. 20), N = V = R
	let alpha = ${ft(n*n)};
	let a2 = alpha * alpha;
	let tb = basis( N );
	const COUNT = 96u;
	let saTexel = ${ft(4*Math.PI/(6*t*t))};
	var sum = vec3f( 0.0 );
	var wsum = 0.0;
	for ( var i = 0u; i < COUNT; i++ ) {
		let xi = hammersley( i, COUNT );
		let phi = TWO_PI * xi.x;
		let cosT = sqrt( ( 1.0 - xi.y ) / ( 1.0 + ( a2 - 1.0 ) * xi.y ) );
		let sinT = sqrt( 1.0 - cosT * cosT );
		let H = tb * vec3f( sinT * cos( phi ), sinT * sin( phi ), cosT );
		let L = 2.0 * dot( N, H ) * H - N;
		let NdotL = dot( N, L );
		if ( NdotL > 0.0 ) {
			let NdotH = cosT;
			let d = NdotH * NdotH * ( a2 - 1.0 ) + 1.0;
			let D = a2 / ( PI * d * d );
			let pdf = D * 0.25; // D * NdotH / ( 4 VdotH ), N = V
			let saSample = 1.0 / ( f32( COUNT ) * pdf + 1e-4 );
			let lod = clamp( 0.5 * log2( saSample / saTexel ) + 1.0, 0.0, ${ft(Math.log2(t))} );
			sum += textureSampleLevel( srcCube, smpLinearClamp, L, lod ).rgb * NdotL;
			wsum += NdotL;
		}
	}
	textureStore( outCube, gid.xy, gid.z, vec4f( sum / max( wsum, 1e-4 ), 1.0 ) );
}`}`}))}const s=Math.max(0,Math.log2(t/se));this.shKernels=[0,1].map(i=>new J({label:"Env SH",modules:[B],bindings:{srcCube:{texture:this.source,viewDimension:"2d-array"},shOut:{storage:this.sh[i],access:"read_write"}},workgroupSize:[128,1,1],code:`${Ms}
var<workgroup> acc: array<array<vec3f, 9>, 128>;
@compute @workgroup_size( 128 ) fn main( @builtin( local_invocation_index ) li: u32 ) {
	var c: array<vec3f, 9>;
	for ( var k = 0; k < 9; k++ ) { c[ k ] = vec3f( 0.0 ); }
	let total = ${6*se*se}u;
	for ( var idx = li; idx < total; idx += 128u ) {
		let face = idx / ${se*se}u;
		let r = idx % ${se*se}u;
		let x = r % ${se}u; let y = r / ${se}u;
		let d = envCubeDir( face, x, y, ${se}u );
		// solid angle of the texel
		let u = ( f32( x ) + 0.5 ) / ${ft(se)} * 2.0 - 1.0;
		let v = ( f32( y ) + 0.5 ) / ${ft(se)} * 2.0 - 1.0;
		let tmp = 1.0 + u * u + v * v;
		let w = 4.0 / ( sqrt( tmp ) * tmp ) * ${ft(1/(se*se))};
		let L = textureLoad( srcCube, vec2u( x, y ), face, ${s} ).rgb * w;
		c[ 0 ] += L * 0.282095;
		c[ 1 ] += L * 0.488603 * d.y;
		c[ 2 ] += L * 0.488603 * d.z;
		c[ 3 ] += L * 0.488603 * d.x;
		c[ 4 ] += L * 1.092548 * d.x * d.y;
		c[ 5 ] += L * 1.092548 * d.y * d.z;
		c[ 6 ] += L * 0.315392 * ( 3.0 * d.z * d.z - 1.0 );
		c[ 7 ] += L * 1.092548 * d.x * d.z;
		c[ 8 ] += L * 0.546274 * ( d.x * d.x - d.y * d.y );
	}
	acc[ li ] = c;
	workgroupBarrier();
	for ( var s = 64u; s > 0u; s >>= 1u ) {
		if ( li < s ) { for ( var k = 0; k < 9; k++ ) { acc[ li ][ k ] += acc[ li + s ][ k ]; } }
		workgroupBarrier();
	}
	if ( li == 0u ) {
		// cosine lobe convolution (A0 = PI, A1 = 2 PI / 3, A2 = PI / 4), stored as irradiance / PI
		let A = array<f32, 9>( 1.0, 0.6666667, 0.6666667, 0.6666667, 0.25, 0.25, 0.25, 0.25, 0.25 );
		for ( var k = 0; k < 9; k++ ) { shOut[ k ] = vec4f( acc[ 0 ][ k ] * A[ k ], 0.0 ); }
	}
}`})),this.envUniforms=new U("EnvParams",{levels:["f32",zt-1]},{label:"env"}),It.set("envSpecular",new N({name:"hook-envSpecular",deps:[B],uniforms:this.envUniforms,uniformName:"envParams",bindings:{envSpecularCube:{texture:()=>this.targets[this.front],viewDimension:"cube"}},code:`
fn hookEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f {
	return textureSampleLevel( envSpecularCube, smpLinearClamp, R, roughness * envParams.levels ).rgb * frame.envIntensity;
}
`})),It.set("envDiffuse",new N({name:"hook-envDiffuse",deps:[B],bindings:{envSH:{storage:()=>this.sh[this.front],access:"read",type:"vec4f"}},code:`
fn hookEnvDiffuse( N: vec3f ) -> vec3f {
	let d = N;
	var e = envSH[ 0 ].rgb * 0.282095
		+ envSH[ 1 ].rgb * 0.488603 * d.y + envSH[ 2 ].rgb * 0.488603 * d.z + envSH[ 3 ].rgb * 0.488603 * d.x
		+ envSH[ 4 ].rgb * 1.092548 * d.x * d.y + envSH[ 5 ].rgb * 1.092548 * d.y * d.z
		+ envSH[ 6 ].rgb * 0.315392 * ( 3.0 * d.z * d.z - 1.0 ) + envSH[ 7 ].rgb * 1.092548 * d.x * d.z
		+ envSH[ 8 ].rgb * 0.546274 * ( d.x * d.x - d.y * d.y );
	return max( e, vec3f( 0.0 ) ) * frame.envIntensity;
}
`}))}_buildSteps(){const e=[],t=this.size;for(let i=0;i<6;i++)e.push(()=>this.faceKernels[i].dispatch([t/8,t/8,1]));const s=this._mips||(this._mips=new go(this.source,"envSource"));e.push(()=>s.dispatch());for(let i=0;i<zt;i++){const r=Math.max(1,Math.ceil((t>>i)/8));e.push(()=>this.filterKernels[1-this.front][i].dispatch([r,r,6]))}return e.push(()=>this.shKernels[1-this.front].dispatch(1)),e.push(()=>{this.front=1-this.front}),e}update(e,t=!1){this.timer-=e;const s=this.sky.atmosphere.sunDir.value;if(t||!this.primed){this.primed=!0,this.timer=this.interval,this.lastSun.copy(s);for(const i of this.steps)i();this.step=-1;return}if(this.step<0){if(!(s.angleTo(this.lastSun)>.004)&&this.timer>0)return;this.timer=this.interval,this.lastSun.copy(s),this.step=0}this.steps[this.step++](),this.step===this.steps.length&&(this.step=-1)}get texture(){return this.targets[this.front]}}function wo(){const a=new Float32Array(36),e=[.3,.4,.6];for(let t=0;t<3;t++)a[t]=e[t]/.282095;return a}const Zt=8,zs=()=>Array.from({length:Zt},()=>new Q),Er=new U("LocalLightParams",{pos:[`vec4f[${Zt}]`,zs()],col:[`vec4f[${Zt}]`,zs()],dir:[`vec4f[${Zt}]`,zs()],count:["i32",0],flashOn:["f32",0],flashCone:["vec2f",new I(.99,.82)],flashPos:["vec3f",new S],flashDir:["vec3f",new S(0,0,-1)],flashCol:["vec3f",new S]},{label:"localLights"}),Ie=Er.fields;Ie.pos.value;Ie.col.value;Ie.dir.value;Ie.count;Ie.flashOn,Ie.flashPos,Ie.flashDir,Ie.flashCol,Ie.flashCone;const Nr=new N({name:"localLights",deps:[B,wt],uniforms:Er,uniformName:"localLights",code:`
// spot profile shared by the shading, the beam and the snow: hot centre, soft edge, faint spill
fn localLightsSpotProfile( cd: f32, cosInner: f32, cosOuter: f32 ) -> f32 {
	let m = smoothstep( cosOuter, cosInner, cd );
	return max( m * m, smoothstep( cosOuter - 0.55, cosOuter, cd ) * 0.05 );
}

fn hookLocalLights( s: Surface, P: vec3f, N: vec3f, V: vec3f, acc: ptr<function, LightAccum> ) {
#if !IS_WATER && !NO_LOCAL_LIGHTS
	let diffuseColor = s.albedo * ( 1.0 - s.metalness );
	let specF0 = mix( vec3f( 0.04 ) * s.specularIntensity, s.albedo, s.metalness );
	let specF90 = mix( s.specularIntensity, 1.0, s.metalness );
	let rough = clamp( s.roughness, 0.03, 1.0 );
	for ( var i = 0; i < localLights.count; i++ ) {
		let p = localLights.pos[ i ];
		let d = p.xyz - P;
		let d2 = dot( d, d );
		if ( d2 < p.w ) {
			let c = localLights.col[ i ];
			let sd = localLights.dir[ i ];
			let L = d * inverseSqrt( max( d2, 1e-6 ) );
			// smooth range window (1 - (d/r)^4)^2 on the inverse-square law
			let x = d2 / p.w;
			let win = sat( 1.0 - x * x );
			// spot: hot centre, soft edge at the outer cone, faint wide spill
			let spot = localLightsSpotProfile( dot( -L, sd.xyz ), c.w, sd.w );
			// Beer-Lambert over the underwater part of the path (straight, mean sea level): red dies
			// within metres, so what the torch lights far away under water is dim and blue-green
			let r = d2 * inverseSqrt( max( d2, 1e-6 ) );
			let under = sat( ( frame.seaLevel - min( P.y, p.y ) ) / max( abs( p.y - P.y ), 1e-3 ) );
			let Tw = exp( -( frame.waterAbsorption + frame.waterScattering ) * ( r * under ) );
			// the + 0.15 m^2 softens the near field of a lamp's finite size (no hot spot on the post)
			let lightColor = c.xyz * Tw * ( win * win * spot / ( d2 + 0.15 ) );
			let irradiance = max( dot( N, L ), 0.0 ) * lightColor;
#if LOCAL_LIGHTS_CHEAP
			// foliage (heavy overdraw): Lambert only
			( *acc ).directDiffuse += irradiance * diffuseColor * INV_PI;
#else
			( *acc ).directDiffuse += irradiance * diffuseColor * INV_PI;
			( *acc ).directSpecular += irradiance * BRDF_GGX( L, V, N, specF0, specF90, rough );
#if SHEEN
			( *acc ).directSpecular += irradiance * BRDF_Sheen( L, V, N, s.sheenColor, max( s.sheenRoughness, 0.07 ) );
#endif
#endif
		}
	}
#endif
}
`});It.set("localLights",Nr);const bo=.35;new N({name:"underwater-flash",deps:[Nr],code:`
fn uwFlashOn() -> f32 { return localLights.flashOn; }
fn uwFlashPos() -> vec3f { return localLights.flashPos; }
fn uwFlashDir() -> vec3f { return localLights.flashDir; }
fn uwFlashCol() -> vec3f { return localLights.flashCol; }
fn uwFlashCone() -> vec2f { return localLights.flashCone; }
`});const So=[60,300,180,240,120,0],_o=[0,.5,.25,.75];class Mo{constructor(e,t,{samples:s=16,depthIsColor:i=!1}={}){this.depthTexture=e,this.depthIsColor=i,this.camera=t,this.resolutionScale=1,this.useTemporalFiltering=!1,this.uniforms=new U("GTAOParams",{proj:["mat4x4f",new C],invProj:["mat4x4f",new C],resolution:["vec2f",new I],radius:["f32",.25],thickness:["f32",1],distanceExponent:["f32",1],distanceFallOff:["f32",1],scale:["f32",1],temporalDirection:["f32",0],temporalOffset:["f32",0],resolutionScaleU:["f32",0]},{label:"gtao"});const r=this.uniforms.fields;this.radius=r.radius,this.thickness=r.thickness,this.distanceExponent=r.distanceExponent,this.distanceFallOff=r.distanceFallOff,this.scale=r.scale,this.samples={value:s},this.target=new j(1,1,{colors:["r8unorm"],label:"GTAO.AO"}),this.noiseTexture=zo(),this._currentSamples=-1,this._pass=null,this._frame=0,this._jp=new C}get texture(){return this.target.texture}getTextureNode(){return this.target.texture}setSize(e,t){e=Math.round(this.resolutionScale*e),t=Math.round(this.resolutionScale*t),this.uniforms.fields.resolutionScaleU.value=this.resolutionScale,this.uniforms.fields.resolution.value.set(e,t),this.target.setSize(e,t)}_build(){const e=this.samples.value,t=e<30?3:5,s=Math.ceil(e/t);this._pass=new X({label:"GTAO",colorFormats:["r8unorm"],bindings:{gtao:{uniform:this.uniforms},gtaoDepth:{texture:()=>this.depthTexture},gtaoNoise:{texture:this.noiseTexture}},code:`
const GTAO_DIRECTIONS: i32 = ${t};
const GTAO_STEPS: i32 = ${s};

// (a colour depth copy may mark texels negative: under the water, no AO wanted; see PostFX)
fn gtaoSampleDepthRaw( uv: vec2f ) -> f32 {
	let s = vec2i( textureDimensions( gtaoDepth ) );
	return textureLoad( gtaoDepth, clamp( vec2i( floor( uv * vec2f( s ) ) ), vec2i( 0 ), s - 1 ), 0 )${this.depthIsColor?".x":""};
}
fn gtaoSampleDepth( uv: vec2f ) -> f32 { return abs( gtaoSampleDepthRaw( uv ) ); }
fn gtaoLoad( p: vec2i ) -> f32 {
	let s = vec2i( textureDimensions( gtaoDepth ) );
	return abs( textureLoad( gtaoDepth, clamp( p, vec2i( 0 ), s - 1 ), 0 )${this.depthIsColor?".x":""} );
}
// three's getViewPosition (WebGPU coordinate system)
fn gtaoViewPosition( uv: vec2f, depth: f32 ) -> vec3f {
	let sp = vec2f( uv.x, 1.0 - uv.y ) * 2.0 - 1.0;
	let v = gtao.invProj * vec4f( sp, depth, 1.0 );
	return v.xyz / v.w;
}
fn gtaoScreenFromClip( c: vec4f ) -> vec2f {
	let s = c.xy / c.w * 0.5 + 0.5;
	return vec2f( s.x, 1.0 - s.y );
}
// three's getNormalFromDepth
fn gtaoNormalFromDepth( uv: vec2f ) -> vec3f {
	let size = vec2f( textureDimensions( gtaoDepth ) );
	let p = vec2i( uv * size );
	let c0 = gtaoLoad( p );
	let l2 = gtaoLoad( p - vec2i( 2, 0 ) ); let l1 = gtaoLoad( p - vec2i( 1, 0 ) );
	let r1 = gtaoLoad( p + vec2i( 1, 0 ) ); let r2 = gtaoLoad( p + vec2i( 2, 0 ) );
	let b2 = gtaoLoad( p + vec2i( 0, 2 ) ); let b1 = gtaoLoad( p + vec2i( 0, 1 ) );
	let t1 = gtaoLoad( p - vec2i( 0, 1 ) ); let t2 = gtaoLoad( p - vec2i( 0, 2 ) );
	let dl = abs( ( 2.0 * l1 - l2 ) - c0 );
	let dr = abs( ( 2.0 * r1 - r2 ) - c0 );
	let db = abs( ( 2.0 * b1 - b2 ) - c0 );
	let dt = abs( ( 2.0 * t1 - t2 ) - c0 );
	let ce = gtaoViewPosition( uv, c0 );
	let dpdx = select( - ce + gtaoViewPosition( uv + vec2f( 1.0 / size.x, 0.0 ), r1 ), ce - gtaoViewPosition( uv - vec2f( 1.0 / size.x, 0.0 ), l1 ), dl < dr );
	let dpdy = select( - ce + gtaoViewPosition( uv - vec2f( 0.0, 1.0 / size.y ), t1 ), ce - gtaoViewPosition( uv + vec2f( 0.0, 1.0 / size.y ), b1 ), db < dt );
	return normalize( cross( dpdx, dpdy ) );
}
fn gtaoRand( uv: vec2f ) -> f32 {
	let dt = dot( uv, vec2f( 12.9898, 78.233 ) );
	let sn = dt - PI * floor( dt / PI );
	return fract( sin( sn ) * 43758.5453 );
}

fn fragment( in: FSIn ) -> vec4f {
	let uvNode = in.uv;
	// Sidestep the nearest-rounding during depth access for the unjittered center pixel to avoid banding
	var depth: f32;
	if ( gtao.resolutionScaleU < 1.0 ) {
		let g = abs( textureGather( ${this.depthIsColor?"0, ":""}gtaoDepth, smpNearestClamp, uvNode ) );
		depth = min( min( g.x, g.y ), min( g.z, g.w ) );
	} else {
		depth = gtaoSampleDepth( uvNode );
	}
	// nothing there (sky: the depth is reversed-Z, 0 at infinity): unoccluded, and never shown
	if ( depth <= 0.0 || gtaoSampleDepthRaw( uvNode ) < 0.0 ) { return vec4f( 1.0 ); }
	let viewPosition = gtaoViewPosition( uvNode, depth );
	let viewNormal = gtaoNormalFromDepth( uvNode );
	let radius = gtao.radius;
	let invRadius = 1.0 / radius;
	let viewDir = normalize( - viewPosition );
	let clipPosition = gtao.proj * vec4f( viewPosition, 1.0 );

	// 5x5 magic square rotation noise (nearest, repeat)
	let noiseRes = vec2f( textureDimensions( gtaoNoise ) );
	let noiseUv = vec2f( uvNode.x, 1.0 - uvNode.y ) * ( gtao.resolution / noiseRes );
	let nt = vec2i( floor( fract( noiseUv ) * noiseRes ) );
	let noiseTexel = textureLoad( gtaoNoise, nt, 0 );
	let randomVec = noiseTexel.xyz * 2.0 - 1.0;
	let tangent = normalize( vec3f( randomVec.xy, 0.0 ) );
	let bitangent = vec3f( - tangent.y, tangent.x, 0.0 );
	let kernelMatrix = mat3x3f( tangent, bitangent, vec3f( 0.0, 0.0, 1.0 ) );

	let invSteps = 1.0 / f32( GTAO_STEPS );
	var ao = 0.0;
	// Per-step phase jitter for spatio-temporal decorrelation.
	let noiseJitterIdx = gtao.temporalDirection * 0.02;
	let stepJitter = interleavedGradientNoise( in.pos.xy + gtao.temporalOffset ) + gtaoRand( ( uvNode + noiseJitterIdx ) * 2.0 - 1.0 );

	// Each iteration analyzes one vertical "slice" of the 3D space around the fragment.
	for ( var i = 0; i < GTAO_DIRECTIONS; i++ ) {
		let angle = f32( i ) / f32( GTAO_DIRECTIONS ) * PI + gtao.temporalDirection;
		let sampleDir = kernelMatrix * vec3f( cos( angle ), sin( angle ), 0.0 );
		let clipDirRadius = gtao.proj * vec4f( sampleDir, 0.0 ) * radius;
		let sliceBitangent = normalize( cross( sampleDir, viewDir ) );
		let sliceTangent = cross( sliceBitangent, viewDir );
		// Project the view normal onto the slice plane (remove component along sliceBitangent).
		// The unnormalized length is the foreshortening weight applied at slice integration.
		// (Activision GTAO paper, Section 3.2 "Per-pixel sampling".)
		let projNRaw = viewNormal - sliceBitangent * dot( viewNormal, sliceBitangent );
		let projNLen = length( projNRaw );
		let projN = projNRaw / max( projNLen, 0.0001 );
		// gamma: angle of projN within the slice plane, signed by the tangent direction.
		let nSin = dot( projN, sliceTangent );
		let nCos = clamp( dot( projN, viewDir ), 0.0, 1.0 );
		let signNSin = select( -1.0, 1.0, nSin >= 0.0 );
		let angleN = signNSin * acos( nCos );
		let tangentToNormalInSlice = cross( projN, sliceBitangent );
		let cosHorizon = dot( viewDir, tangentToNormalInSlice );
		var cosHorizons = vec2f( cosHorizon, - cosHorizon );
		// For each slice, the inner loop performs ray marching to find the horizons.
		for ( var j = 0; j < GTAO_STEPS; j++ ) {
			// Quadratic step distribution ( sampleDist = t^2 ) concentrates samples in the
			// near-field. (Blender's Eevee adaptation)
			let t = ( f32( j ) + 1.0 + stepJitter ) * invSteps;
			let sampleDist = t * t;
			let clipOffset = clipDirRadius * sampleDist;
			// The loop marches in two opposite directions (x and y) along the slice's line to find the horizon on both sides.
			// x
			let sampleScreenPositionX = gtaoScreenFromClip( clipPosition + clipOffset );
			let sampleDepthX = gtaoSampleDepth( sampleScreenPositionX );
			let viewDeltaX = gtaoViewPosition( sampleScreenPositionX, sampleDepthX ) - viewPosition;
			let lenX = length( viewDeltaX );
			// Manual normalize guards against zero-length delta.
			let sHX = dot( viewDir, viewDeltaX ) / max( lenX, 0.0001 );
			// Sphere falloff: ( dist / radius )^2 fades the sample's horizon contribution
			// back toward the prior horizon as it approaches the radius boundary.
			// (squared variant of the paper's near-field attenuation;
			// Activision GTAO paper, Section 4.3 "Bounding the sampling area")
			let distFacX = min( lenX * invRadius, 1.0 );
			let distFacSqX = distFacX * distFacX;
			if ( abs( viewDeltaX.z ) < gtao.thickness ) {
				cosHorizons.x = mix( max( cosHorizons.x, sHX ), cosHorizons.x, distFacSqX );
			}
			// y
			let sampleScreenPositionY = gtaoScreenFromClip( clipPosition - clipOffset );
			let sampleDepthY = gtaoSampleDepth( sampleScreenPositionY );
			let viewDeltaY = gtaoViewPosition( sampleScreenPositionY, sampleDepthY ) - viewPosition;
			let lenY = length( viewDeltaY );
			let sHY = dot( viewDir, viewDeltaY ) / max( lenY, 0.0001 );
			let distFacY = min( lenY * invRadius, 1.0 );
			let distFacSqY = distFacY * distFacY;
			if ( abs( viewDeltaY.z ) < gtao.thickness ) {
				cosHorizons.y = mix( max( cosHorizons.y, sHY ), cosHorizons.y, distFacSqY );
			}
		}
		// Cosine-weighted inner integral, closed-form (Activision GTAO paper, Eq. 7).
		// Per horizon h_i:    term_i = -cos( 2 h_i - gamma ) + cos( gamma ) + 2 h_i sin( gamma )
		// The 0.25 factor is 1/2 (integral normalization) x 1/2 (averaging the two horizons).
		// In this slice setup sliceTangent = cross( sliceBitangent, viewDir ) works out
		// opposite to sampleDir, so the +sampleDir samples (cosHorizons.x) live on the
		// -T side of the slice and -sampleDir samples (cosHorizons.y) on the +T side.
		// gamma is signed by +T (sliceTangent), so hPos must read from cosHorizons.y.
		let hPos = acos( clamp( cosHorizons.y, -1.0, 1.0 ) );
		let hNeg = - acos( clamp( cosHorizons.x, -1.0, 1.0 ) );
		let termPos = - cos( hPos * 2.0 - angleN ) + nCos + hPos * 2.0 * nSin;
		let termNeg = - cos( hNeg * 2.0 - angleN ) + nCos + hNeg * 2.0 * nSin;
		let a = ( termPos + termNeg ) * 0.25;
		// |projN| is the foreshortening weight from the per-slice normal projection.
		ao += projNLen * a;
	}
	ao = clamp( ao / f32( GTAO_DIRECTIONS ), 0.0, 1.0 );
	ao = pow( ao, gtao.scale );
	return vec4f( ao, 0.0, 0.0, 1.0 );
}
`}),this._currentSamples=e}advanceFrame(){const e=this.uniforms.fields;if(this.useTemporalFiltering===!0){const t=this._frame++;e.temporalDirection.value=So[t%6]/360,e.temporalOffset.value=_o[t%4]}else e.temporalDirection.value=0,e.temporalOffset.value=1}render(){this.advanceFrame();const e=this.uniforms.fields;this.samples.value!==this._currentSamples&&this._build();const t=re.fields,s=t.jitter.value;this._jp.makeTranslation(s.x,s.y,0).multiply(t.proj.value),e.proj.value.copy(this._jp),e.invProj.value.copy(this._jp).invert(),this._pass.render({colorViews:[this.target.texture],clear:[1,1,1,1]})}}function zo(a=5){const e=Math.floor(a)%2===0?Math.floor(a)+1:Math.floor(a),t=Po(e),s=t.length,i=new Uint8Array(s*4);for(let r=0;r<s;++r){const n=t[r],o=2*Math.PI*n/s,l=new S(Math.cos(o),Math.sin(o),0).normalize();i[r*4]=(l.x*.5+.5)*255,i[r*4+1]=(l.y*.5+.5)*255,i[r*4+2]=127,i[r*4+3]=255}return new W({label:"GTAO.noise",width:e,height:e,format:"rgba8unorm",data:i,sampler:"nearestRepeat"})}function Po(a){const e=Math.floor(a)%2===0?Math.floor(a)+1:Math.floor(a),t=e*e,s=Array(t).fill(0);let i=Math.floor(e/2),r=e-1;for(let n=1;n<=t;){if(i===-1&&r===e?(r=e-2,i=0):(r===e&&(r=0),i<0&&(i=e-1)),s[i*e+r]!==0){r-=2,i++;continue}else s[i*e+r]=n++;r++,i--}return s}const To={},Pt=[0,0,0,0],qi=`
fn aaIn( uv: vec2f ) -> vec3f { return textureSampleLevel( aaSrc, smpLinearClamp, uv, 0.0 ).rgb; }
// display-like value for edge detection: exposed, Reinhard on the max channel, square root
fn aaP( c: vec3f ) -> vec3f {
	let e = max( c, vec3f( 0.0 ) ) * aaExposure[ 0 ] * frame.exposure;
	return sqrt( e / ( 1.0 + max( e.r, max( e.g, e.b ) ) ) );
}
fn aaLuma( uv: vec2f ) -> f32 { return dot( aaP( aaIn( uv ) ), vec3f( 0.3, 0.59, 0.11 ) ); }
`;class Ao{constructor({src:e,exposure:t}){this.src=e,this.exposure=t,this.edges=new j(1,1,{colors:["rgba8unorm"],label:"smaaEdges"}),this.weights=new j(1,1,{colors:["rgba8unorm"],label:"smaaWeights"}),this.area=null,this.search=null,this._passes=null,this._load()}async _load(){const e=To&&"/"||"/",t=async(s,i)=>{const r=new Uint8Array(await(await fetch(e+"textures/smaa/"+s)).arrayBuffer()),n=await co(r,"image/png");return new W({label:i,width:n.width,height:n.height,format:"rgba8unorm",data:n.data})};try{[this.area,this.search]=await Promise.all([t("area.png","smaaArea"),t("search.png","smaaSearch")])}catch(s){console.warn("SMAA textures failed to load",s)}}_build(){const e={aaSrc:{texture:this.src},aaExposure:{storage:this.exposure,access:"read"}},t=new X({label:"AA none",colorFormats:["rgba16float"],bindings:{aaSrc:{texture:this.src}},code:"fn fragment( in: FSIn ) -> vec4f { return textureSampleLevel( aaSrc, smpLinearClamp, in.uv, 0.0 ); }"}),s=new X({label:"FXAA",colorFormats:["rgba16float"],bindings:e,code:qi+`
fn fragment( in: FSIn ) -> vec4f {
	var FXAA_STEPS = array<f32, 6>( 1.0, 1.5, 2.0, 2.0, 2.0, 4.0 );
	let uv = in.uv;
	let ts = 1.0 / vec2f( textureDimensions( aaSrc ) );
	let m = aaLuma( uv );
	let n = aaLuma( uv + ts * vec2f( 0.0, -1.0 ) ); let e = aaLuma( uv + ts * vec2f( 1.0, 0.0 ) );
	let s = aaLuma( uv + ts * vec2f( 0.0, 1.0 ) ); let w = aaLuma( uv + ts * vec2f( -1.0, 0.0 ) );
	let ne = aaLuma( uv + ts * vec2f( 1.0, -1.0 ) ); let nw = aaLuma( uv + ts * vec2f( -1.0, -1.0 ) );
	let se = aaLuma( uv + ts * vec2f( 1.0, 1.0 ) ); let sw = aaLuma( uv + ts * vec2f( -1.0, 1.0 ) );
	let highest = max( max( max( s, e ), max( n, w ) ), m );
	let lowest = min( min( min( s, e ), min( n, w ) ), m );
	let contrast = highest - lowest;
	if ( contrast < max( 0.0312, 0.063 * highest ) ) { return vec4f( aaIn( uv ), 1.0 ); }

	// sub-pixel blend
	var f = ( 2.0 * ( s + e + n + w ) + ( se + sw + ne + nw ) ) / 12.0;
	f = clamp( abs( f - m ) / max( contrast, 1e-6 ), 0.0, 1.0 );
	let bf = smoothstep( 0.0, 1.0, f );
	let pixelBlend = bf * bf;

	// edge orientation and the side the edge lies on
	let horizontal = abs( s + n - 2.0 * m ) * 2.0 + abs( se + ne - 2.0 * e ) + abs( sw + nw - 2.0 * w );
	let vertical = abs( e + w - 2.0 * m ) * 2.0 + abs( se + sw - 2.0 * s ) + abs( ne + nw - 2.0 * n );
	let isH = horizontal >= vertical;
	let pL = select( e, s, isH ); let nL = select( w, n, isH );
	let pG = abs( pL - m ); let nG = abs( nL - m );
	var pixelStep = select( ts.x, ts.y, isH );
	var oppL = pL; var grad = pG;
	if ( pG < nG ) { pixelStep = - pixelStep; oppL = nL; grad = nG; }

	// walk along the edge both ways to its ends
	var uvEdge = uv;
	var edgeStep = vec2f( 0.0, ts.y );
	if ( isH ) { uvEdge.y += pixelStep * 0.5; edgeStep = vec2f( ts.x, 0.0 ); } else { uvEdge.x += pixelStep * 0.5; }
	let edgeL = ( m + oppL ) * 0.5;
	let gt = grad * 0.25;
	var puv = uvEdge + edgeStep * FXAA_STEPS[ 0 ];
	var pD = aaLuma( puv ) - edgeL;
	var pEnd = abs( pD ) >= gt;
	for ( var i = 1; i < 6 && ! pEnd; i++ ) { puv += edgeStep * FXAA_STEPS[ i ]; pD = aaLuma( puv ) - edgeL; pEnd = abs( pD ) >= gt; }
	if ( ! pEnd ) { puv += edgeStep * 8.0; }
	var nuv = uvEdge - edgeStep * FXAA_STEPS[ 0 ];
	var nD = aaLuma( nuv ) - edgeL;
	var nEnd = abs( nD ) >= gt;
	for ( var i = 1; i < 6 && ! nEnd; i++ ) { nuv -= edgeStep * FXAA_STEPS[ i ]; nD = aaLuma( nuv ) - edgeL; nEnd = abs( nD ) >= gt; }
	if ( ! nEnd ) { nuv -= edgeStep * 8.0; }
	let pDist = select( puv.y - uv.y, puv.x - uv.x, isH );
	let nDist = select( uv.y - nuv.y, uv.x - nuv.x, isH );
	let shortest = min( pDist, nDist );
	let deltaSign = select( nD >= 0.0, pD >= 0.0, pDist <= nDist );
	let edgeBlend = select( 0.5 - shortest / ( pDist + nDist ), 0.0, deltaSign == ( m - edgeL >= 0.0 ) );

	let fb = max( pixelBlend, edgeBlend );
	var fuv = uv;
	if ( isH ) { fuv.y += pixelStep * fb; } else { fuv.x += pixelStep * fb; }
	return vec4f( aaIn( fuv ), 1.0 );
}
`});this._passes={none:t,fxaa:s}}_buildSMAA(){const e={aaSrc:{texture:this.src},aaExposure:{storage:this.exposure,access:"read"}},t=new X({label:"SMAA edges",colorFormats:["rgba8unorm"],bindings:e,code:qi+`
fn smaaDelta( a: vec3f, b: vec3f ) -> f32 { let t = abs( a - b ); return max( t.r, max( t.g, t.b ) ); }
fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let px = 1.0 / vec2f( textureDimensions( aaSrc ) );
	let C = aaP( aaIn( uv ) );
	var delta = vec4f( smaaDelta( C, aaP( aaIn( uv + vec2f( - px.x, 0.0 ) ) ) ), smaaDelta( C, aaP( aaIn( uv + vec2f( 0.0, - px.y ) ) ) ), 0.0, 0.0 );
	var edges = step( vec2f( 0.1 ), delta.xy );
	if ( dot( edges, vec2f( 1.0 ) ) == 0.0 ) { return vec4f( 0.0 ); }
	delta.z = smaaDelta( C, aaP( aaIn( uv + vec2f( px.x, 0.0 ) ) ) );
	delta.w = smaaDelta( C, aaP( aaIn( uv + vec2f( 0.0, px.y ) ) ) );
	var maxDelta = max( max( delta.x, delta.y ), max( delta.z, delta.w ) );
	let dLL = smaaDelta( C, aaP( aaIn( uv + vec2f( - 2.0 * px.x, 0.0 ) ) ) );
	let dTT = smaaDelta( C, aaP( aaIn( uv + vec2f( 0.0, - 2.0 * px.y ) ) ) );
	maxDelta = max( maxDelta, max( dLL, dTT ) );
	// local contrast adaptation
	edges *= step( vec2f( 0.5 * maxDelta ), delta.xy );
	return vec4f( edges, 0.0, 0.0 );
}
`}),s=new X({label:"SMAA weights",colorFormats:["rgba8unorm"],bindings:{aaEdges:{texture:()=>this.edges.texture},aaArea:{texture:()=>this.area},aaSearch:{texture:()=>this.search}},code:`
const SMAA_STEPS: i32 = 8;
fn smaaE( uv: vec2f ) -> vec2f { return textureSampleLevel( aaEdges, smpLinearClamp, uv, 0.0 ).rg; }
fn smaaSearchLength( e: vec2f, bias: f32, scale: f32 ) -> f32 {
	return 255.0 * textureSampleLevel( aaSearch, smpNearestClamp, vec2f( bias + e.x * scale, e.y ), 0.0 ).r;
}
fn smaaArea( dist: vec2f, e1: f32, e2: f32, offset: f32 ) -> vec2f {
	let ps = vec2f( 1.0 / 160.0, 1.0 / 560.0 );
	var tc = ps * ( 16.0 * round( 4.0 * vec2f( e1, e2 ) ) + dist ) + 0.5 * ps;
	tc.y += offset / 7.0;
	return textureSampleLevel( aaArea, smpLinearClamp, tc, 0.0 ).rg;
}
fn smaaXLeft( tc: vec2f, end: f32, inv: vec2f ) -> f32 {
	var e = vec2f( 0.0, 1.0 ); var c = tc;
	for ( var i = 0; i < SMAA_STEPS; i++ ) {
		e = smaaE( c ); c.x -= 2.0 * inv.x;
		if ( c.x <= end || e.y <= 0.8281 || e.x != 0.0 ) { break; }
	}
	c.x += 0.25 * inv.x + inv.x + 2.0 * inv.x;
	return c.x - inv.x * smaaSearchLength( e, 0.0, 0.5 );
}
fn smaaXRight( tc: vec2f, end: f32, inv: vec2f ) -> f32 {
	var e = vec2f( 0.0, 1.0 ); var c = tc;
	for ( var i = 0; i < SMAA_STEPS; i++ ) {
		e = smaaE( c ); c.x += 2.0 * inv.x;
		if ( c.x >= end || e.y <= 0.8281 || e.x != 0.0 ) { break; }
	}
	c.x -= 0.25 * inv.x + inv.x + 2.0 * inv.x;
	return c.x + inv.x * smaaSearchLength( e, 0.5, 0.5 );
}
fn smaaYUp( tc: vec2f, end: f32, inv: vec2f ) -> f32 {
	var e = vec2f( 1.0, 0.0 ); var c = tc;
	for ( var i = 0; i < SMAA_STEPS; i++ ) {
		e = smaaE( c ); c.y -= 2.0 * inv.y;
		if ( c.y <= end || e.x <= 0.8281 || e.y != 0.0 ) { break; }
	}
	c.y += 0.25 * inv.y + inv.y + 2.0 * inv.y;
	return c.y - inv.y * smaaSearchLength( e.yx, 0.0, 0.5 );
}
fn smaaYDown( tc: vec2f, end: f32, inv: vec2f ) -> f32 {
	var e = vec2f( 1.0, 0.0 ); var c = tc;
	for ( var i = 0; i < SMAA_STEPS; i++ ) {
		e = smaaE( c ); c.y += 2.0 * inv.y;
		if ( c.y >= end || e.x <= 0.8281 || e.y != 0.0 ) { break; }
	}
	c.y -= 0.25 * inv.y + inv.y + 2.0 * inv.y;
	return c.y + inv.y * smaaSearchLength( e.yx, 0.5, 0.5 );
}
fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let inv = 1.0 / vec2f( textureDimensions( aaEdges ) );
	let pix = uv / inv;
	let o0 = vec4f( uv, uv ) + vec4f( inv, inv ) * vec4f( -0.25, -0.125, 1.25, -0.125 );
	let o1 = vec4f( uv, uv ) + vec4f( inv, inv ) * vec4f( -0.125, -0.25, -0.125, 1.25 );
	let o2 = vec4f( o0.xz, o1.yw ) + vec4f( -2.0, 2.0, -2.0, 2.0 ) * vec4f( inv.xx, inv.yy ) * f32( SMAA_STEPS );
	var w = vec4f( 0.0 );
	let e = smaaE( uv );
	if ( e.y > 0.0 ) {
		// edge at north: distances to its ends left and right, and the crossing edges there
		let xl = smaaXLeft( o0.xy, o2.x, inv );
		let e1 = textureSampleLevel( aaEdges, smpLinearClamp, vec2f( xl, o1.y ), 0.0 ).r;
		let xr = smaaXRight( o0.zw, o2.y, inv );
		let d = vec2f( xl, xr ) / inv.x - pix.x;
		let e2 = textureSampleLevel( aaEdges, smpLinearClamp, vec2f( xr + inv.x, o1.y ), 0.0 ).r;
		let a = smaaArea( sqrt( abs( d ) ), e1, e2, 0.0 );
		w = vec4f( a, w.zw );
	}
	if ( e.x > 0.0 ) {
		// edge at west: up and down
		let yu = smaaYUp( o1.xy, o2.z, inv );
		let e1 = textureSampleLevel( aaEdges, smpLinearClamp, vec2f( o0.x, yu ), 0.0 ).g;
		let yd = smaaYDown( o1.zw, o2.w, inv );
		let d = vec2f( yu, yd ) / inv.y - pix.y;
		let e2 = textureSampleLevel( aaEdges, smpLinearClamp, vec2f( o0.x, yd + inv.y ), 0.0 ).g;
		let a = smaaArea( sqrt( abs( d ) ), e1, e2, 0.0 );
		w = vec4f( w.xy, a );
	}
	return w;
}
`}),i=new X({label:"SMAA blend",colorFormats:["rgba16float"],bindings:{aaSrc:{texture:this.src},aaWeights:{texture:()=>this.weights.texture}},code:`
fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let inv = 1.0 / vec2f( textureDimensions( aaWeights ) );
	let w0 = textureSampleLevel( aaWeights, smpLinearClamp, uv, 0.0 );
	let a = vec4f( w0.x, textureSampleLevel( aaWeights, smpLinearClamp, uv + vec2f( 0.0, inv.y ), 0.0 ).y,
		w0.z, textureSampleLevel( aaWeights, smpLinearClamp, uv + vec2f( inv.x, 0.0 ), 0.0 ).w );
	let C = textureSampleLevel( aaSrc, smpLinearClamp, uv, 0.0 );
	if ( dot( a, vec4f( 1.0 ) ) < 1e-5 ) { return C; }
	// the line with the largest weight through each direction; the stronger direction wins
	var off = vec2f( select( - a.z, a.w, a.w > a.z ), select( - a.x, a.y, a.y > a.x ) );
	if ( abs( off.x ) > abs( off.y ) ) { off.y = 0.0; } else { off.x = 0.0; }
	let Cop = textureSampleLevel( aaSrc, smpLinearClamp, uv + sign( off ) * inv, 0.0 );
	return mix( C, Cop, max( abs( off.x ), abs( off.y ) ) );
}
`});Object.assign(this._passes,{edges:t,weights:s,blend:i}),this._smaa=!0}render(e,t){this._passes||this._build();const s=this._passes;if(e==="smaa"&&this.area&&this.search){this._smaa||this._buildSMAA();const i=typeof this.src=="function"?this.src():this.src;this.edges.setSize(i.width,i.height),this.weights.setSize(i.width,i.height),s.edges.render({colorViews:[this.edges.texture],clear:Pt}),s.weights.render({colorViews:[this.weights.texture],clear:Pt}),s.blend.render({colorViews:[t],clear:Pt})}else e==="fxaa"||e==="smaa"?s.fxaa.render({colorViews:[t],clear:Pt}):s.none.render({colorViews:[t],clear:Pt})}}const ji=[0,0,0,0];function Xi(a,e){let t=1,s=0;for(;a>0;)t/=e,s+=t*(a%e),a=Math.floor(a/e);return s}class ko{static DEBUG_VIEWS=["Off","Locks (green: holding, blue: new)","Luma instability (red)","Clamped (red) / kept (green)","New frame weight","Motion (px / frame)","Resampling blur (blue)","Still pixels kept (yellow)"];constructor(e,t,s,i,r=null,n=null){this.beauty=e,this.depthTexture=t,this.velocityTexture=s,this.waterMaskTexture=r,this.camera=i,this.exposure=n||new $e({label:"taauExposure",count:1,type:"f32",data:new Float32Array([1])}),this.uniforms=new U("TAAUParams",{prevInvViewProj:["mat4x4f",new C],jitterOffset:["vec2f",new I],cameraNearFar:["vec2f",new I(.1,1e3)],depthThreshold:["f32",5e-4],edgeDepthDiff:["f32",.001],hasWaterMask:["f32",r?1:0],jitterPhases:["f32",8],reset:["f32",1],debugView:["f32",0],boxStill:["f32",3],boxMotion:["f32",1],maxAccumulation:["f32",2],motionAccumulation:["f32",10],blurComp:["f32",.5],locks:["f32",1],instability:["f32",1],lockThreshold:["f32",1.05],staticKeep:["f32",1]},{label:"taau"}),this.settings=this.uniforms.fields,this.jitterPhaseOverride=4,this.jitterScale=.5,this.jitterMoving=.35,this._camMotion=0,this._camPrev=null,this.debugView=0;const o=this.uniforms.fields;this._jitterOffset=o.jitterOffset,this._jitterIndex=0,this._outW=1;const l=()=>({colors:[{format:"rgba16float",name:"color"},{format:"rgba16float",name:"lock"},{format:"rgba8unorm",name:"lumaHistory"}],label:"taauHistory"});this.history=[new j(1,1,l()),new j(1,1,l())],this._cur=0,this._prevDepth=new W({label:"taauPrevDepth",width:1,height:1,format:"depth32float",usage:["sample","copyDst"]}),this._hasPrevInvVP=!1,this._needsRestart=!0,this._build()}get texture(){return this.history[this._cur].textures[0]}get output(){return this.debugView>0&&this._debugTarget?this._debugTarget.texture:this.texture}getTextureNode(){return this.texture}resetHistory(){this._needsRestart=!0,this._hasPrevInvVP=!1,this._nextPrev=null,this._camPrev=null}setSize(e,t){const s=this.history[0].setSize(e,t);this.history[1].setSize(e,t),this._outW=e,s&&(this._needsRestart=!0)}_beautyTexture(){return typeof this.beauty=="function"?this.beauty():this.beauty}jitter(){const e=this._beautyTexture(),t=e&&e.width?this._outW/e.width:1,s=this.jitterPhaseOverride||Math.max(1,Math.ceil(8*t*t));this.uniforms.fields.jitterPhases.value=s;const i=this._jitterIndex%s,r=this.jitterScale*(1+(this.jitterMoving-1)*this._cameraMotion());this.jitterNow=r;const n=(Xi(i+1,2)-.5)*r,o=(Xi(i+1,3)-.5)*r;return this._jitterOffset.value.set(n,o),[n,o]}_cameraMotion(){const e=this.camera&&this.camera.matrixWorld;if(!e)return 0;const t=e.elements,s=[t[12],t[13],t[14],t[8],t[9],t[10]];let i=0;if(this._camPrev){const r=this._camPrev,n=Math.hypot(s[0]-r[0],s[1]-r[1],s[2]-r[2]),o=Math.hypot(s[3]-r[3],s[4]-r[4],s[5]-r[5]);i=Math.min(1,Math.max((n-.002)/.008,(o-5e-4)/.0015)),i=Math.max(0,i)}return this._camPrev=s,this._camMotion=i>this._camMotion?i:this._camMotion+(i-this._camMotion)*.15,this._camMotion}clearViewOffset(){this._jitterIndex=(this._jitterIndex+1)%1024}_build(){const e=()=>this._beautyTexture(),t=n=>({taau:{uniform:this.uniforms},taauBeauty:{texture:e},taauDepth:{texture:()=>this.depthTexture},taauPrevDepth:{texture:()=>this._prevDepth},taauVelocity:{texture:()=>this.velocityTexture},taauMask:{texture:()=>this.waterMaskTexture||this.velocityTexture},taauHistory:{texture:()=>this.history[n].textures[0]},taauLock:{texture:()=>this.history[n].textures[1]},taauLumaHistory:{texture:()=>this.history[n].textures[2]},taauExposure:{storage:this.exposure,access:"read"}}),s=`
const TAAU_EPS = 1e-3;
const TAAU_LANCZOS_WEIGHT_SCALE = 1.0 / 12.0;
const TAAU_AVG_LANCZOS_WEIGHT_PER_FRAME = 0.74 / 12.0;

fn taauToYCoCg( c: vec3f ) -> vec3f {
	return vec3f( dot( c, vec3f( 0.25, 0.5, 0.25 ) ), dot( c, vec3f( 0.5, 0.0, -0.5 ) ), dot( c, vec3f( -0.25, 0.5, -0.25 ) ) );
}
fn taauFromYCoCg( c: vec3f ) -> vec3f { return vec3f( c.x + c.y - c.z, c.x + c.z, c.x - c.y - c.z ); }
// FSR2 Tonemap / InverseTonemap (max channel Reinhard)
fn taauTonemap( c: vec3f ) -> vec3f { return c / ( max( max( 0.0, c.r ), max( c.g, c.b ) ) + 1.0 ); }
fn taauTonemapInverse( c: vec3f ) -> vec3f { return c / max( 1e-4, 1.0 - max( c.r, max( c.g, c.b ) ) ); }
fn taauMinDivMax( a: f32, b: f32 ) -> f32 { let m = max( a, b ); return select( 0.0, min( a, b ) / m, m != 0.0 ); }
// Lanczos-2 of the squared distance (FSR2 Lanczos2ApproxSq)
fn taauLanczos2Sq( x2In: f32 ) -> f32 {
	let x2 = min( x2In, 4.0 );
	let a = 0.4 * x2 - 1.0;
	let b = 0.25 * x2 - 1.0;
	return ( 1.5625 * a * a - 0.5625 ) * ( b * b );
}
// luma for the lock logic (FSR2 ComputeLockInputLuma: perceived lightness of the tone mapped colour, ^1/6)
fn taauLockLuma( rgb: vec3f ) -> f32 {
	let l = luminance( taauTonemap( rgb ) );
	let p = select( pow( l, 1.0 / 3.0 ) * 116.0 - 16.0, l * ( 24389.0 / 27.0 ), l <= 216.0 / 24389.0 ) * 0.01;
	return pow( max( p, 0.0 ), 1.0 / 6.0 );
}

// Catmull-Rom history lookup with 5 bilinear taps (the 4 corner taps are dropped)
fn taauSampleHistory( uvIn: vec2f ) -> vec4f {
	let size = vec2f( textureDimensions( taauHistory ) );
	let samplePos = uvIn * size;
	let texPos1 = floor( samplePos - 0.5 ) + 0.5;
	let f = samplePos - texPos1;
	let w0 = f * ( f * ( f * -0.5 + 1.0 ) - 0.5 );
	let w1 = f * f * ( f * 1.5 - 2.5 ) + 1.0;
	let w2 = f * ( f * ( f * -1.5 + 2.0 ) + 0.5 );
	let w3 = f * f * ( f * 0.5 - 0.5 );
	let w12 = w1 + w2;
	let tp0 = ( texPos1 - 1.0 ) / size;
	let tp3 = ( texPos1 + 2.0 ) / size;
	let tp12 = ( texPos1 + w2 / w12 ) / size;
	let wa = w12.x * w0.y; let wb = w0.x * w12.y; let wc = w12.x * w12.y; let wd = w3.x * w12.y; let we = w12.x * w3.y;
	let sum = textureSampleLevel( taauHistory, smpLinearClamp, vec2f( tp12.x, tp0.y ), 0.0 ) * wa
		+ textureSampleLevel( taauHistory, smpLinearClamp, vec2f( tp0.x, tp12.y ), 0.0 ) * wb
		+ textureSampleLevel( taauHistory, smpLinearClamp, vec2f( tp12.x, tp12.y ), 0.0 ) * wc
		+ textureSampleLevel( taauHistory, smpLinearClamp, vec2f( tp3.x, tp12.y ), 0.0 ) * wd
		+ textureSampleLevel( taauHistory, smpLinearClamp, vec2f( tp12.x, tp3.y ), 0.0 ) * we;
	return max( sum / ( wa + wb + wc + wd + we ), vec4f( 0.0 ) );
}

fn taauLoadBeauty( p: vec2i ) -> vec4f {
	let s = vec2i( textureDimensions( taauBeauty ) );
	return textureLoad( taauBeauty, clamp( p, vec2i( 0 ), s - 1 ), 0 );
}

// standard (0 near .. 1 far) perspective depth of the reversed-Z buffer at p (clamped)
fn taauDepthAt( p: vec2i ) -> f32 {
	let s = vec2i( textureDimensions( taauDepth ) );
	return 1.0 - textureLoad( taauDepth, clamp( p, vec2i( 0 ), s - 1 ), 0 );
}

// last frame's depth at uv, reprojected into this frame's camera (standard perspective depth)
fn taauPreviousDepth( uv: vec2f ) -> f32 {
	let s = vec2i( textureDimensions( taauPrevDepth ) );
	let d = textureLoad( taauPrevDepth, clamp( vec2i( uv * vec2f( s ) ), vec2i( 0 ), s - 1 ), 0 );
	let pw = taau.prevInvViewProj * vec4f( uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, d, 1.0 );
	let world = pw.xyz / pw.w;
	let viewZ = ( frame.view * vec4f( world, 1.0 ) ).z;
	let near = taau.cameraNearFar.x; let far = taau.cameraNearFar.y;
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}

fn taauInside( uv: vec2f ) -> bool { return all( uv >= vec2f( 0.0 ) ) && all( uv <= vec2f( 1.0 ) ); }

struct TaauOut { @location( 0 ) color: vec4f, @location( 1 ) lock: vec4f, @location( 2 ) lumaHistory: vec4f, DEBUG_FIELD };
@fragment fn fs( in: FSIn ) -> TaauOut {
	let uv = in.uv;
	let inSize = vec2f( textureDimensions( taauBeauty ) );
	let outSize = vec2f( textureDimensions( taauHistory ) );
	let downscale = inSize / outSize; // FSR2 DownscaleFactor (render / display)
	let exposure = taauExposure[ 0 ] * frame.exposure;

	// output pixel centre in input pixels; the input tap whose jittered sample is closest
	let pIn = uv * inSize;
	let closestTap = vec2i( round( pIn - ( vec2f( 0.5 ) + taau.jitterOffset ) ) );

	// ---- reprojection (three's TAAUNode): velocity of the nearest depth in the 3x3, disocclusion
	var closestDepth = 2.0;
	var closestPositionTexel = vec2i( 0 );
	var farthestDepth = -1.0;
	for ( var y = -1; y <= 1; y++ ) {
		for ( var x = -1; x <= 1; x++ ) {
			let neighbor = closestTap + vec2i( x, y );
			let depth = taauDepthAt( neighbor );
			if ( depth < closestDepth ) {
				closestDepth = depth;
				closestPositionTexel = neighbor;
			}
			farthestDepth = max( farthestDepth, depth );
		}
	}
	let vs = vec2i( textureDimensions( taauVelocity ) );
	let velocity = textureLoad( taauVelocity, clamp( closestPositionTexel, vec2i( 0 ), vs - 1 ), 0 ).xy;
	let historyUV = uv - velocity;
	let hrVelocity = length( velocity * outSize ); // output pixels per frame
	let isEdge = farthestDepth - closestDepth > taau.edgeDepthDiff;
	let isDisocclusion = closestDepth - taauPreviousDepth( historyUV ) > taau.depthThreshold;
	// the water surface keeps its history (its depth changes with the waves, not with occlusion)
	let ms = vec2i( textureDimensions( taauMask ) );
	let isWater = taau.hasWaterMask > 0.5 && textureLoad( taauMask, clamp( closestTap, vec2i( 0 ), ms - 1 ), 0 ).g > 0.5;
	let isExistingSample = taauInside( historyUV );
	let depthClip = select( 0.0, 1.0, isDisocclusion && ! isEdge && ! isWater );
	let isNewSample = ! isExistingSample || taau.reset > 0.5;

	// ---- history (FSR2 ReprojectHistoryColor / ReprojectHistoryLockStatus)
	var historyColor = vec3f( 0.0 );
	var lockStatus = vec2f( 0.0 );
	var temporalReactive = 0.0;
	var inMotionLastFrame = false;
	var blurPrev = 0.0;
	if ( ! isNewSample ) {
		historyColor = taauToYCoCg( min( taauSampleHistory( historyUV ).rgb * exposure, vec3f( 65504.0 ) ) );
		let ls = textureSampleLevel( taauLock, smpLinearClamp, historyUV, 0.0 );
		lockStatus = ls.xy;
		temporalReactive = sat( abs( ls.z ) );
		inMotionLastFrame = ls.z < 0.0;
		blurPrev = ls.w;
	}

	// ---- the 3x3 input taps: prepared (exposed) YCoCg colour, lock luma
	var samples: array<vec3f, 9>;
	var lumas: array<f32, 9>;
	var lumaSum = 0.0;
	for ( var i = 0; i < 9; i++ ) {
		let tap = closestTap + vec2i( i % 3 - 1, i / 3 - 1 );
		let rgb = min( max( taauLoadBeauty( tap ).rgb, vec3f( 0.0 ) ) * exposure, vec3f( 65504.0 ) );
		samples[ i ] = taauToYCoCg( rgb );
		lumas[ i ] = taauLockLuma( rgb );
		lumaSum += lumas[ i ];
	}

	// ---- new lock: the centre tap is a thin feature (FSR2 ComputeThinFeatureConfidence)
	var newLock = false;
	{
		let nucleus = lumas[ 4 ];
		var mask = 1u << 4u;
		var dMin = 3.4e38;
		var dMax = 0.0;
		for ( var i = 0; i < 9; i++ ) {
			if ( i == 4 ) { continue; }
			let l = lumas[ i ];
			let diff = max( l, nucleus ) / min( l, nucleus );
			if ( diff > 0.0 && diff < taau.lockThreshold ) { mask |= 1u << u32( i ); } else { dMin = min( dMin, l ); dMax = max( dMax, l ); }
		}
		let isRidge = nucleus > dMax || nucleus < dMin;
		let q0 = ( 1u << 0u ) | ( 1u << 1u ) | ( 1u << 3u ) | ( 1u << 4u );
		let q1 = ( 1u << 1u ) | ( 1u << 2u ) | ( 1u << 4u ) | ( 1u << 5u );
		let q2 = ( 1u << 3u ) | ( 1u << 4u ) | ( 1u << 6u ) | ( 1u << 7u );
		let q3 = ( 1u << 4u ) | ( 1u << 5u ) | ( 1u << 7u ) | ( 1u << 8u );
		newLock = isRidge && ( mask & q0 ) != q0 && ( mask & q1 ) != q1 && ( mask & q2 ) != q2 && ( mask & q3 ) != q3;
	}

	// ---- lock status (FSR2 UpdateLockStatus). The shading change luma is the local mean lock luma
	// (FSR2 reads a coarse mip of the luma)
	var thisFrameReactive = temporalReactive;
	let shadingLuma = lumaSum / 9.0;
	if ( lockStatus.y == 0.0 ) { lockStatus.y = shadingLuma; }
	let luminanceDiff = 1.0 - taauMinDivMax( lockStatus.y, shadingLuma );
	if ( newLock ) {
		lockStatus.y = shadingLuma;
		lockStatus.x = select( 1.0, 2.0, lockStatus.x != 0.0 );
	} else if ( lockStatus.x <= 1.0 ) {
		lockStatus.y = mix( lockStatus.y, shadingLuma, 0.5 );
	} else if ( luminanceDiff > 0.1 ) {
		lockStatus.x = 0.0;
	}
	thisFrameReactive = max( thisFrameReactive, sat( ( luminanceDiff - 0.1 ) * 10.0 ) );
	lockStatus.x *= 1.0 - thisFrameReactive;
	lockStatus.x *= select( 0.0, 1.0, depthClip < 0.1 );
	let lockContribution = sat( sat( sat( lockStatus.x - 1.0 ) * 4.0 ) * sat( taauMinDivMax( lockStatus.y, shadingLuma ) ) ) * taau.locks;

	// ---- this frame at the output pixel: Lanczos-2 over the 3x3 taps, and the rectification box
	// (FSR2 ComputeUpsampledColorAndWeight)
	let kernelReactive = max( thisFrameReactive, select( 0.0, 1.0, isNewSample ) );
	let maxKernelWeight = min( 1.99, 1.0 + ( 1.0 / downscale.x - 1.0 ) );
	let kernelBiasMax = maxKernelWeight * ( 1.0 - kernelReactive );
	let kernelBiasMin = max( 1.0, ( 1.0 + kernelBiasMax ) * 0.3 );
	let kernelBias = mix( kernelBiasMax, kernelBiasMin, max( 0.25 * depthClip, kernelReactive ) );
	let rectCurveBias = mix( -2.0, -3.0, sat( hrVelocity / 50.0 ) );
	var colorSum = vec3f( 0.0 );
	var weightSum = 0.0;
	var boxCenter = vec3f( 0.0 );
	var boxVec = vec3f( 0.0 );
	var boxWeight = 0.0;
	var aabbMin = vec3f( 3.4e38 );
	var aabbMax = vec3f( -3.4e38 );
	let iSize = vec2i( inSize );
	for ( var i = 0; i < 9; i++ ) {
		let tap = closestTap + vec2i( i % 3 - 1, i / 3 - 1 );
		let offset = vec2f( tap ) + vec2f( 0.5 ) + taau.jitterOffset - pIn; // sample position - output position
		let onScreen = all( tap >= vec2i( 0 ) ) && all( tap < iSize );
		let ob = offset * kernelBias;
		let w = select( 0.0, taauLanczos2Sq( dot( ob, ob ) ), onScreen );
		let c = samples[ i ];
		colorSum += c * w;
		weightSum += w;
		let bw = exp( rectCurveBias * dot( offset, offset ) );
		boxCenter += c * bw;
		boxVec += c * c * bw;
		boxWeight += bw;
		aabbMin = min( aabbMin, c );
		aabbMax = max( aabbMax, c );
	}
	boxCenter /= boxWeight;
	boxVec = sqrt( abs( boxVec / boxWeight - boxCenter * boxCenter ) );
	var upsampledWeight = select( 0.0, weightSum, weightSum > TAAU_EPS );
	var upsampled = vec3f( 0.0 );
	if ( upsampledWeight > TAAU_EPS ) {
		// deringing: the Lanczos lobes can't leave the neighbourhood's range
		upsampled = clamp( colorSum / upsampledWeight, aabbMin, aabbMax );
		upsampledWeight *= TAAU_LANCZOS_WEIGHT_SCALE;
	}

	// ---- luma instability (FSR2 ComputeLumaInstabilityFactor): the local luma returning to an older
	// value instead of the last one
	var lumaInstability = 0.0;
	var lumaHist = vec4f( 0.0 );
	var staticKeep = 0.0;
	{
		var curLuma = boxCenter.x / ( 1.0 + max( 0.0, boxCenter.x ) );
		curLuma = round( curLuma * 255.0 ) / 255.0;
		let sampleHist = max( depthClip, luminanceDiff ) < 0.1 && ! isNewSample;
		if ( sampleHist ) { lumaHist = textureSampleLevel( taauLumaHistory, smpLinearClamp, historyUV, 0.0 ); }
		let d0 = curLuma - lumaHist.x;
		var dmin = abs( d0 );
		if ( dmin >= 1.0 / 255.0 ) {
			for ( var i = 1; i < 4; i++ ) {
				let d1 = curLuma - lumaHist[ i ];
				if ( sign( d0 ) == sign( d1 ) ) { dmin = min( dmin, abs( d1 ) ); }
			}
			let boxSizeFactor = pow( sat( boxVec.x / 0.1 ), 6.0 );
			lumaInstability = select( 0.0, 1.0, dmin != abs( d0 ) ) * boxSizeFactor;
			lumaInstability = select( 0.0, 1.0, lumaInstability > 1.0 / 255.0 );
		}
		lumaInstability *= select( 0.0, 1.0, lumaHist.w != 0.0 ) * taau.instability;
		// Still pixels (not in FSR2): with the camera and the surface still, a clamp can only be the
		// jitter's doing (a sub-pixel plank gap that the 3x3 misses in this frame's samples), unless the
		// lighting changed. A real change (a shadow moving in) leaves the local luma away from all of
		// the last 4 frames'; the jitter brings it back to one of them. Such pixels keep their history.
		let dAll = min( min( abs( curLuma - lumaHist.x ), abs( curLuma - lumaHist.y ) ), min( abs( curLuma - lumaHist.z ), abs( curLuma - lumaHist.w ) ) );
		staticKeep = taau.staticKeep * select( 0.0, 1.0, hrVelocity < 0.05 && lumaHist.w != 0.0 && ! isWater ) * sat( 1.0 - ( dAll - 0.01 ) / 0.03 );
		lumaHist = vec4f( curLuma, lumaHist.xyz );
	}

	// ---- accumulation weight (FSR2 ComputeBaseAccumulationWeight)
	var accumulation = taau.maxAccumulation * select( 0.0, 1.0, isExistingSample ) * ( 1.0 - thisFrameReactive ) * ( 1.0 - depthClip );
	accumulation = min( accumulation, mix( accumulation, upsampledWeight * taau.motionAccumulation, max( select( 0.0, 1.0, inMotionLastFrame ), sat( hrVelocity * 10.0 ) ) ) );
	accumulation = min( accumulation, mix( accumulation, upsampledWeight, sat( hrVelocity / 20.0 ) ) );

	// Resampling blur (not in FSR2): even the Catmull-Rom loses fine detail when it samples between
	// texels, and in motion the history is resampled that way every frame (at 0.2 px ~80% of the
	// finest detail survives a resample). The blur the history has gathered (the variance its
	// resamples added, f (1 - f) per axis, decayed by the blend) caps the accumulation, so a blurred
	// history takes a larger share of the sharp new frame; a still camera resamples at texel centres.
	let hf = fract( historyUV * outSize - 0.5 );
	let hv = hf * ( 1.0 - hf );
	let blurAcc = blurPrev + hv.x + hv.y;
	let blurAlpha = min( blurAcc * taau.blurComp, select( 1.0, 0.15, isWater ) );
	accumulation = min( accumulation, upsampledWeight * ( 1.0 - blurAlpha ) / max( blurAlpha, 1e-3 ) );

	var outColor: vec3f;
	var alphaOut = 1.0;
	var dbgClamp = vec2f( 0.0 );
	if ( isNewSample ) {
		outColor = taauFromYCoCg( upsampled );
	} else {
		// rectify (FSR2 RectifyHistory): clamp to the variance box, but keep locked and oscillating
		// pixels' history; a clamp drops the accumulated weight
		// FSR2 widens the box while still by the upscale factor (1 at native: a 1 sigma box that clamped
		// the sub-pixel plank gaps out of the history, frame after frame); at least 3 sigma here
		let scaleInfluence = max( taau.boxStill, min( 20.0, pow( 1.0 / abs( downscale.x * downscale.y ), 3.0 ) ) );
		let boxScaleT = max( depthClip, sat( hrVelocity / 20.0 ) );
		let boxScale = mix( scaleInfluence, taau.boxMotion, boxScaleT );
		let boxMin = max( aabbMin, boxCenter - boxVec * boxScale );
		let boxMax = min( aabbMax, boxCenter + boxVec * boxScale );
		if ( any( boxMin > historyColor ) || any( historyColor > boxMax ) ) {
			let clamped = clamp( historyColor, boxMin, boxMax );
			// (not on the water: its glints move on their own and would leave trails)
			let contribution = select( sat( max( max( lumaInstability, lockContribution ), staticKeep ) ), 0.0, isWater );
			dbgClamp = vec2f( length( clamped - historyColor ) / max( boxVec.x * 2.0, 0.02 ), contribution );
			historyColor = mix( clamped, historyColor, contribution );
			accumulation = mix( min( accumulation, 0.1 ), accumulation, contribution );
		}
		// accumulate (FSR2 Accumulate), blending tone mapped colours
		let acc = max( TAAU_EPS, accumulation + upsampledWeight );
		let alpha = upsampledWeight / acc;
		alphaOut = alpha;
		let up = taauToYCoCg( taauTonemap( taauFromYCoCg( upsampled ) ) );
		let hi = taauToYCoCg( taauTonemap( taauFromYCoCg( historyColor ) ) );
		outColor = taauTonemapInverse( taauFromYCoCg( mix( hi, up, alpha ) ) );
	}

	// ---- lock lifetime (FSR2 FinalizeLockStatus)
	if ( ! taauInside( uv + velocity ) ) {
		lockStatus.x = 0.0;
	} else {
		lockStatus.x = max( 0.0, lockStatus.x - upsampledWeight / ( taau.jitterPhases * TAAU_AVG_LANCZOS_WEIGHT_PER_FRAME ) );
	}

	// ---- temporal reactive factor for the next frame (FSR2 ComputeTemporalReactiveFactor)
	var newReactive = min( 0.99, thisFrameReactive );
	newReactive = max( newReactive, mix( newReactive, 0.4, sat( hrVelocity ) ) );
	newReactive = max( newReactive * newReactive, depthClip * 0.1 );
	newReactive = select( newReactive, 1.0, isNewSample );
	if ( sat( hrVelocity * 10.0 ) >= 1.0 ) { newReactive = -max( TAAU_EPS, newReactive ); }

	var out: TaauOut;
	out.color = vec4f( max( outColor, vec3f( 0.0 ) ) / exposure, 1.0 );
	out.lock = vec4f( lockStatus, newReactive, select( blurAcc * ( 1.0 - alphaOut ), 0.0, isNewSample ) );
	out.lumaHistory = lumaHist;
DEBUG_OUTPUT
	return out;
}
`,i=["rgba16float","rgba16float","rgba8unorm"],r=s.replace(", DEBUG_FIELD","").replace(`DEBUG_OUTPUT
`,"");this._resolve=[0,1].map(n=>new X({label:"TAAU",bindings:t(n),colorFormats:i,code:r})),this._buildDebug=()=>{const n=s.replace("DEBUG_FIELD","@location( 3 ) debug: vec4f").replace("DEBUG_OUTPUT",`
	// grey image, the chosen quantity over it (colours are divided by the exposure: the final pass
	// multiplies them back)
	let gray = vec3f( luminance( taauTonemap( outColor * exposure ) ) * 0.35 );
	let view = u32( taau.debugView );
	var v = gray;
	if ( view == 1u ) { v = gray + vec3f( 0.0, lockContribution, select( 0.0, 1.0, newLock ) ); }
	else if ( view == 2u ) { v = gray + vec3f( lumaInstability, 0.0, 0.0 ); }
	else if ( view == 3u ) { v = gray + vec3f( sat( dbgClamp.x ) * ( 1.0 - dbgClamp.y ), sat( dbgClamp.x ) * dbgClamp.y, 0.0 ); }
	else if ( view == 7u ) { v = gray + vec3f( staticKeep * 0.8, staticKeep * 0.8, 0.0 ); }
	else if ( view == 4u ) { v = vec3f( sat( alphaOut * 3.0 ) ); }
	else if ( view == 5u ) { v = gray + vec3f( sat( hrVelocity / 4.0 ), sat( hrVelocity / 16.0 ), 0.0 ); }
	else if ( view == 6u ) { v = gray + vec3f( 0.0, 0.0, sat( blurAlpha * 2.0 ) ); }
	out.debug = vec4f( v / max( exposure, 1e-4 ), 1.0 );`),o=[...i,"rgba16float"];this._resolveDebug=[0,1].map(l=>new X({label:"TAAU debug",bindings:t(l),colorFormats:o,code:n})),this._debugTarget=new j(1,1,{colors:["rgba16float"],label:"taauDebug"})}}render(){const e=re.fields,t=this.uniforms.fields;t.cameraNearFar.value.set(e.near.value,e.far.value),this._hasPrevInvVP||t.prevInvViewProj.value.copy(e.invViewProj.value),this._hasPrevInvVP=!0;const s=this.depthTexture;(this._prevDepth.width!==s.width||this._prevDepth.height!==s.height)&&(this._prevDepth.resize(s.width,s.height),this._needsRestart=!0),t.reset.value=this._needsRestart?1:0,this._needsRestart=!1;const i=1-this._cur;if(this.debugView>0){this._resolveDebug||this._buildDebug();const n=this.history[i];this._debugTarget.setSize(n.textures[0].width,n.textures[0].height),t.debugView.value=this.debugView,this._resolveDebug[this._cur].render({colorViews:[...n.textures,this._debugTarget.texture],clear:ji})}else this._resolve[this._cur].render({colorViews:this.history[i].textures,clear:ji});this._cur=i;const r=this.depthTexture;z.getEncoder().copyTextureToTexture({texture:r.getGPU()},{texture:this._prevDepth.getGPU()},{width:r.width,height:r.height})}endFrame(){this._nextPrev=this._nextPrev||new C,this._nextPrev.copy(re.fields.invViewProj.value)}advance(){this._nextPrev&&this.uniforms.fields.prevInvViewProj.value.copy(this._nextPrev)}}class Co{constructor(){this.uniforms=new U("LensParams",{wet:["f32",0],age:["f32",100],seed:["f32",0],aspect:["f32",16/9]},{label:"lens"});const e=this.uniforms.fields;this.wet=e.wet,this.age=e.age,this.seed=e.seed,this.aspect=e.aspect,this.duration=9,this._wasUnder=!1,this.module=new N({name:"lens",uniforms:this.uniforms,uniformName:"lensParams",code:Do})}update(e,t){t?this.wet.value=0:(this._wasUnder&&(this.wet.value=1,this.age.value=0,this.seed.value=Math.random()*97),this.age.value+=e,this.wet.value=Math.max(0,this.wet.value-e/this.duration)),this._wasUnder=t}build(){return this.module}}const Do=`
// integer hash (pcg2d) of the float bits: no transcendentals (18 cells x 2 hashes per pixel)
fn lensHash2( p: vec2f ) -> vec2f {
	var v = bitcast<vec2u>( p ) * 1664525u + 1013904223u;
	v.x += v.y * 1664525u; v.y += v.x * 1664525u;
	v = v ^ ( v >> vec2u( 16u ) );
	v.x += v.y * 1664525u; v.y += v.x * 1664525u;
	v = v ^ ( v >> vec2u( 16u ) );
	return vec2f( v >> vec2u( 8u ) ) / 16777216.0;
}

struct LensAcc { n2: vec2f, cover: f32, trail: f32 };

// one layer of droplets (clinging, or sliding: heavy drops that start sliding after a delay)
fn lensLayer( p: vec2f, cell: f32, rMin: f32, rMax: f32, density: f32, slide: bool, acc: ptr<function, LensAcc> ) {
	let wet = lensParams.wet; let age = lensParams.age; let seed = lensParams.seed;
	let c0 = floor( p / cell );
	for ( var j = -1; j <= 1; j++ ) {
		for ( var i = -1; i <= 1; i++ ) {
			let c = c0 + vec2f( f32( i ), f32( j ) );
			let h = lensHash2( c + seed );
			// no drop in this cell: it adds nothing (skip the outline math, most cells are empty)
			if ( h.x >= density ) { continue; }
			let h2 = lensHash2( c + seed + 17.3 );
			var center = ( c + ( vec2f( 0.2 ) + h2 * 0.6 ) ) * cell;
			// evaporation shrinks drops; big ones last longer
			let life = clamp( wet * 1.6 - h2.y * 0.6, 0.0, 1.0 );
			let r = mix( rMin, rMax, h.y * h.y ) * sqrt( life );
			if ( slide ) {
				// heavy drops start sliding after a delay and accelerate
				let t0 = h2.x * 3.0 + 0.4;
				let s = max( age - t0, 0.0 );
				let dy = s * s * ( r * 3.5 );
				center.y += dy;
				// wet streak above a sliding drop
				let dxT = abs( p.x - center.x );
				let above = center.y - p.y;
				let tr = smoothstep( r * 0.45, 0.0, dxT ) * smoothstep( 0.0, 0.01, above ) * smoothstep( dy + 0.01, 0.0, above );
				( *acc ).trail = max( ( *acc ).trail, tr * life );
			}
			// irregular outline: a few lobes, sliding drops stretched vertically
			let d = ( p - center ) * vec2f( 1.0, select( 1.0, 0.8, slide ) );
			// outside the largest outline (wobble <= 1.18): no coverage, skip the lobes
			let rB = max( r * 1.18, 1e-4 );
			if ( dot( d, d ) >= rB * rB ) { continue; }
			let ang = atan2( d.y, d.x );
			let wobble = 1.0 + sin( ang * 3.0 + h.x * 40.0 ) * 0.12 + sin( ang * 5.0 + h2.y * 30.0 ) * 0.06;
			let q = d / max( r * wobble, 1e-4 );
			let rq = dot( q, q );
			let a = smoothstep( 1.0, 0.7, rq );
			if ( a > ( *acc ).cover ) {
				( *acc ).n2 = q;
				( *acc ).cover = a;
			}
		}
	}
}

fn lensDroplets( uv: vec2f ) -> vec3f {
	var col = lensSharp( uv );
	let wet = lensParams.wet;
	if ( wet > 0.001 ) {
		let aspect = lensParams.aspect;
		let p = vec2f( uv.x * aspect, uv.y ); // y grows downward on screen

		// ---- droplets (two layers: clinging small drops, sliding large drops)
		var acc: LensAcc;
		acc.n2 = vec2f( 0.0 ); // droplet normal (xy) of the drop covering this pixel
		acc.cover = 0.0; // soft coverage (drops are out of focus)
		acc.trail = 0.0;
		lensLayer( p, 0.05, 0.003, 0.011, wet * 0.5, false, &acc );
		lensLayer( p, 0.13, 0.01, 0.026, wet * 0.22, true, &acc );

		if ( acc.cover > 0.001 ) {
			let n2 = acc.n2;
			let r2 = min( dot( n2, n2 ), 1.0 );
			let nz = sqrt( max( 1.0 - r2, 0.0 ) );
			// a drop is a strong fisheye lens: the image inside is inverted and blurred
			let off = n2 * -0.05 * ( 1.0 - nz * 0.5 );
			let inside = lensBlurred( uv + vec2f( off.x / aspect, off.y ) );
			let edge = smoothstep( 0.45, 1.0, r2 );
			let highlight = smoothstep( 0.3, 0.0, length( n2 - vec2f( -0.3, -0.4 ) ) ) * 0.35;
			let dropCol = inside * mix( 1.04, 0.7, edge ) + inside * highlight;
			col = mix( col, dropCol, acc.cover );
		}

		// wet trails: slight blur and darkening
		col = mix( col, lensBlurred( uv ) * 0.9, acc.trail * 0.6 );
	}
	return col;
}
`,Ht=7,Yi=.3,Lo=[{a:.72,r:.018,tint:[1,.85,.6],k:.55},{a:.44,r:.045,tint:[.55,.9,1],k:.35},{a:.16,r:.022,tint:[.8,1,.7],k:.45},{a:-.18,r:.07,tint:[.6,.75,1],k:.22},{a:-.42,r:.03,tint:[1,.7,.9],k:.4},{a:-.75,r:.11,tint:[.7,1,.85],k:.14},{a:-1.15,r:.05,tint:[1,.8,.55],k:.28}],Ps=24,O=a=>{const e=String(a);return e.includes(".")||e.includes("e")?e:e+".0"};class Io{constructor({depthTexture:e,clouds:t=null,sunDir:s}){this.sunDir=s,this.uniforms=new U("FlareParams",{sunDir:["vec3f",new S(0,1,0)],strength:["f32",1],sunUV:["vec2f",new I(.5,.5)],inView:["f32",0],aboveWater:["f32",1],aspect:["f32",16/9],discPx:["f32",6],dt:["f32",1/60]},{label:"flare"});const i=this.uniforms.fields;this.strength=i.strength,this.sunUV=i.sunUV,this.inView=i.inView,this.aboveWater=i.aboveWater,this.aspect=i.aspect,this.discPx=i.discPx,this.dt=i.dt,this.visibility=new $e({label:"flareVisibility",count:1,type:"f32",data:new Float32Array([0])}),this.depthTexture=e,this.clouds=t;let r="";for(let l=0;l<Ps;l++){const h=Math.sqrt((l+.5)/Ps),c=l*2.39996323;r+=`	sky += flareSkyTap( c + vec2f( ${O(Math.cos(c)*h)}, ${O(Math.sin(c)*h)} ) * flareParams.discPx, size );
`}const n=!!(t&&t.module);this.kernel=new J({label:"Lens Flare Visibility",modules:[B,n?t.module:null].filter(Boolean),bindings:{flareParams:{uniform:this.uniforms},flareDepth:{texture:()=>this.depthTexture},flareVisRW:{storage:this.visibility,access:"read_write"}},workgroupSize:[1,1,1],code:`
fn flareSkyTap( p: vec2f, size: vec2i ) -> f32 {
	let q = clamp( vec2i( p ), vec2i( 0 ), size - 1 );
	// reversed depth: the sky is at 0
	return select( 0.0, 1.0, textureLoad( flareDepth, q, 0 ) < 1e-7 );
}
@compute @workgroup_size( 1 )
fn main() {
	let size = vec2i( textureDimensions( flareDepth ) );
	let c = flareParams.sunUV * vec2f( size );
	var sky = 0.0;
${r}
	let cloudT = ${n?"cloudsSunTransmittance( cloudsSampleView( flareParams.sunDir ).a )":"1.0"};
	let up = smoothstep( -0.02, 0.04, flareParams.sunDir.y );
	let tgt = sky / ${O(Ps)} * cloudT * up * flareParams.inView * flareParams.aboveWater;
	let v = flareVisRW[ 0 ];
	flareVisRW[ 0 ] = mix( v, tgt, 1.0 - exp( flareParams.dt * -14.0 ) );
}
`});let o="";for(const l of Lo)o+=`
	{
		let pd = flarePolyDist( p - s * ${O(l.a)} );
		let body = vec3f( smoothstep( ${O(l.r*.975)}, ${O(l.r*.975*.9)}, pd ), smoothstep( ${O(l.r)}, ${O(l.r*.9)}, pd ), smoothstep( ${O(l.r*1.025)}, ${O(l.r*1.025*.9)}, pd ) );
		let rim = smoothstep( ${O(l.r*.55)}, ${O(l.r)}, pd ) * 0.7 + 0.3;
		// smaller ghosts concentrate the same reflected energy: brighter
		ghosts += body * rim * vec3f( ${l.tint.map(O).join(", ")} ) * ${O(l.k*.0028/(l.r*l.r))};
	}`;this.module=new N({name:"flare",deps:[B],uniforms:this.uniforms,uniformName:"flareParams",bindings:{flareVis:{storage:this.visibility,access:"read"}},code:`
const FLARE_SEG: f32 = ${O(2*Math.PI/Ht)};

// aperture polygon: distance scaled so the polygon edge sits at the given radius
fn flarePolyDist( d: vec2f ) -> f32 {
	let a = atan2( d.y, d.x ) + ${O(Yi)};
	return length( d ) * cos( floor( a / FLARE_SEG + 0.5 ) * FLARE_SEG - a );
}

// HDR flare light for this screen position (added before exposure / tone mapping)
fn flareLight( uv: vec2f ) -> vec3f {
	let asp = vec2f( flareParams.aspect, 1.0 );
	let p = ( uv - 0.5 ) * asp * vec2f( 1.0, -1.0 );
	let s = ( flareParams.sunUV - 0.5 ) * asp * vec2f( 1.0, -1.0 );
	let vis = flareVis[ 0 ];
	// light arriving from the sun disc (the key light colour follows the atmosphere's
	// transmittance; at night the moon is the key light and flares only faintly)
	let light = frame.sunColor * vis * flareParams.strength * 0.02;
	if ( vis <= 0.0 ) { return vec3f( 0.0 ); }

	var ghosts = vec3f( 0.0 );
${o}

	// fade the ghosts as the sun nears the centre (they collapse onto it and vanish)
	let offAxis = smoothstep( 0.02, 0.2, length( s ) );

	// halo: dispersive ring about the image centre
	let rc = length( p );
	let halo = vec3f( smoothstep( 0.03, 0.0, abs( rc - 0.43 ) ), smoothstep( 0.03, 0.0, abs( rc - 0.445 ) ), smoothstep( 0.03, 0.0, abs( rc - 0.46 ) ) ) * smoothstep( 0.25, 0.8, length( s ) ) * 0.12;

	// starburst and veiling glare around the sun (distances in image heights)
	let q = p - s;
	let rq = max( length( q ), 1e-4 );
	let aq = atan2( q.y, q.x ) + ${O(Yi)};
	let px = 1.0 / max( frame.outputResolution.y, 1.0 );
	// the nearest spike (two per blade) and this pixel's distance from its line
	let seg = ${O(Math.PI/Ht)};
	let k = floor( aq / seg + 0.5 );
	let perp = abs( sin( aq - k * seg ) ) * rq;
	let ki = k - ${O(2*Ht)} * floor( k / ${O(2*Ht)} ); // same spike across the atan2 seam
	let h1 = fract( sin( ki * 12.9898 + 4.1 ) * 43758.5453 );
	let h2 = fract( sin( ki * 78.233 + 1.7 ) * 43758.5453 );
	// thin at the disc, a little softer outward (same energy across the line: dimmer as it widens)
	let width = px * 0.8 + rq * 0.003;
	let line = exp( - ( perp * perp ) / ( width * width ) ) * ( px * 0.8 / width );
	let len = 0.05 + 0.08 * h1;
	let lenC = vec3f( len * 1.12, len, len * 0.88 );
	let taper = exp( - rq / lenC - ( rq * rq ) / ( lenC * lenC * 4.0 ) );
	let spikes = line * taper * ( 0.45 + 0.55 * h2 ) * 1.4;
	// fine streaks around the disc: smooth angular noise, short
	let t = ( aq * ${O(1/(2*Math.PI))} + 0.5 ) * 48.0;
	let ti = floor( t );
	let hA = fract( sin( ( ti - 48.0 * floor( ti / 48.0 ) ) * 91.345 ) * 43758.5453 );
	let hB = fract( sin( ( ti + 1.0 - 48.0 * floor( ( ti + 1.0 ) / 48.0 ) ) * 91.345 ) * 43758.5453 );
	let n = mix( hA, hB, smoothstep( 0.0, 1.0, t - ti ) );
	let fine = pow( n, 5.0 ) * exp( - rq / 0.03 ) * 0.3;
	let glow = exp( rq * -5.0 ) * 0.05 + exp( rq * -40.0 ) * 0.4;
	let burst = spikes + vec3f( fine + glow );

	return light * ( ghosts * offAxis + halo + burst );
}
`})}update(e,t,{aboveWater:s=!0}={}){const i=this.uniforms.fields.sunDir.value.copy(this.sunDir.value||this.sunDir);e.updateMatrixWorld();const r=Ro.copy(e.position).addScaledVector(i,1e3).project(e),n=Fo.set(0,0,-1).applyQuaternion(e.quaternion).dot(i)>.05;this.sunUV.value.set(r.x*.5+.5,.5-r.y*.5);const o=Math.max(Math.abs(r.x),Math.abs(r.y));this.inView.value=n?He.clamp((1-o)/.1,0,1):0,this.aboveWater.value=s?1:0,this.aspect.value=e.aspect,this.dt.value=Math.min(t,.1);const l=this._depthH||1080;this.discPx.value=Math.max(1.5,.004625/Math.tan(He.degToRad(e.fov)*.5)*l*.5)}setDepthHeight(e){this._depthH=e}}const Ro=new S,Fo=new S,Qt=20,Tt=10,kt=400,Ts=224,Ki=`
const MB_TILE: f32 = ${Qt}.0;
const MB_MAX_TILES_X: i32 = ${kt};

// uv motion (current - previous) of the pixel at uv with reversed-Z depth d (sky = 0): sky pixels
// reproject their far-plane points with last frame's unjittered camera
fn mbUvVelocity( vel: vec4f, uv: vec2f, d: f32 ) -> vec2f {
	let ndc = ( uv * 2.0 - 1.0 ) * vec2f( 1.0, -1.0 );
	let prev = mbParams.skyReproj * vec4f( ndc, 0.0, 1.0 );
	return select( ( ndc - prev.xy / prev.w ) * vec2f( 0.5, -0.5 ), vel.xy, d > 1e-7 );
}

// uv velocity -> half streak vector in output pixels (shutter applied, capped at one tile)
fn mbToPx( vel: vec2f ) -> vec2f {
	let v = vel * mbParams.outSize * ( mbParams.shutter * 0.5 );
	let l = length( v );
	return v * min( 1.0, MB_TILE / max( l, 1e-6 ) );
}
`;class Bo{constructor({velocityTexture:e,depthTexture:t,color:s}){this.uniforms=new U("MotionBlurParams",{skyReproj:["mat4x4f",new C],outSize:["vec2f",new I(1,1)],tileCount:["vec2f",new I(1,1)],shutter:["f32",0],frameIndex:["f32",0]},{label:"motionBlur"});const i=this.uniforms.fields;this.shutter=i.shutter,this.outSize=i.outSize,this.tileCount=i.tileCount,this.frameIndex=i.frameIndex,this.skyReproj=i.skyReproj,this._vp=new C,this._prevVP=new C,this._hasPrev=!1,this.color=s,this.velocityTexture=e,this.depthTexture=t,this.tileMax=new $e({label:"mbTileMax",count:kt*Ts,type:"vec4f"}),this.neighborMax=new $e({label:"mbNeighborMax",count:kt*Ts,type:"vec4f"}),this._frame=0,this._buildKernels();const r=()=>typeof this.color=="function"?this.color():this.color;this.module=new N({name:"motionBlur",deps:[B],uniforms:this.uniforms,uniformName:"mbParams",bindings:{mbVelocity:{texture:()=>this.velocityTexture},mbDepth:{texture:()=>this.depthTexture},mbColor:{texture:r},mbNeighbor:{storage:this.neighborMax,access:"read"}},code:Ki+`
fn mbTexel( uv: vec2f, inSize: vec2f ) -> vec2i { return clamp( vec2i( uv * inSize ), vec2i( 0 ), vec2i( inSize ) - 1 ); }
fn mbSample( uv: vec2f ) -> vec3f { return textureSampleLevel( mbColor, smpLinearClamp, uv, 0.0 ).rgb; }

// Motion-blurred colour at uv. sharpColor = the (sharpened) unblurred colour at uv, returned
// unchanged where nothing moves; the blur itself reads the unsharpened resolved image, so
// sharpening never acts on blurred pixels.
fn mbApply( sharpColor: vec3f, uvIn: vec2f ) -> vec3f {
	var out = sharpColor;
	if ( mbParams.shutter > 0.0 ) {
		let pix = uvIn * mbParams.outSize;
		let tile = clamp( vec2i( floor( pix / MB_TILE ) ), vec2i( 0 ), vec2i( mbParams.tileCount ) - 1 );
		let nm = mbNeighbor[ tile.y * MB_MAX_TILES_X + tile.x ];
		let nmLen = nm.z;
		if ( nmLen >= 0.5 ) {
			let inSize = vec2f( textureDimensions( mbVelocity ) );
			let cX = mbTexel( uvIn, inSize );
			let dX = textureLoad( mbDepth, cX, 0 );
			let vX = mbToPx( mbUvVelocity( textureLoad( mbVelocity, cX, 0 ), uvIn, dX ) );
			let lenX = length( vX );
			// interleaved gradient noise, shifted every frame
			let pn = floor( pix ) + mbParams.frameIndex * 5.588238;
			let jitter = fract( fract( dot( pn, vec2f( 0.06711056, 0.00583715 ) ) ) * 52.9829189 ) - 0.5;
			// sample pairs: ~3 px apart along the streak, 2..6 pairs
			let pairs = i32( clamp( ceil( nmLen / 3.0 ), 2.0, 6.0 ) );
			let invSize = 1.0 / mbParams.outSize;
			var acc = vec3f( 0.0 );
			let fade = sat( nmLen - 0.5 ); // continuous with the early-out below 0.5 px

			if ( nm.w > nmLen * 0.75 ) {
				// fast path: all streaks in the neighbourhood alike (camera rotation, distant scenery):
				// a plain directional average along the pixel's own motion
				for ( var i = 0; i < pairs; i++ ) {
					let tt = ( f32( i ) + 0.5 + jitter ) / f32( pairs );
					let o = vX * tt * invSize;
					acc += mbSample( uvIn + o );
					acc += mbSample( uvIn - o );
				}
				out = mix( sharpColor, acc / ( f32( pairs ) * 2.0 ), fade );
			} else {
				// full reconstruction: soft depth classification of each sample against the centre
				var wSum = 0.0;
				let dirX = select( nm.xy, vX, lenX > 0.5 );
				for ( var i = 0; i < pairs; i++ ) {
					let tt = ( f32( i ) + 0.5 + jitter ) / f32( pairs );
					// alternate between the neighbourhood's dominant direction and the pixel's own (Jimenez 2014)
					let dir = select( nm.xy, dirX, ( i & 1 ) == 1 );
					let off = dir * tt;
					let offLen = length( off );
					for ( var k = 0; k < 2; k++ ) {
						let sgn = select( -1.0, 1.0, k == 0 );
						let uvY = uvIn + off * invSize * sgn;
						let tY = mbTexel( uvY, inSize );
						let dY = textureLoad( mbDepth, tY, 0 );
						let lenY = length( mbToPx( mbUvVelocity( textureLoad( mbVelocity, tY, 0 ), uvY, dY ) ) );
						// reversed-Z depth ~ 1/distance: q > 0 when the sample is farther than the centre
						let q = ( dX - dY ) / max( max( dX, dY ), 1e-12 );
						let behind = sat( q * 40.0 + 0.5 );
						// a sample behind the centre shows through the centre's own streak; one in front
						// covers the centre when its streak reaches it (1 px soft cylinders)
						let spreadX = sat( lenX - max( offLen - 1.0, 0.0 ) );
						let spreadY = sat( lenY - max( offLen - 1.0, 0.0 ) );
						let w = behind * spreadX + ( 1.0 - behind ) * spreadY;
						acc += mbSample( uvY ) * w;
						wSum += w;
					}
				}
				// whatever the samples don't cover is this pixel's own (sharpened) colour
				let n = f32( pairs ) * 2.0;
				let res = acc / n + sharpColor * max( 1.0 - wSum / n, 0.0 );
				out = mix( sharpColor, res, fade );
			}
		}
	}
	return out;
}
`})}_buildKernels(){const e=Tt*Tt;let t="";for(let r=64;r>0;r>>=1)t+=`
	if ( t < ${r}u && t + ${r}u < ${e}u ) {
		let a = mbShared[ t ];
		let b = mbShared[ t + ${r}u ];
		let m = select( a, b, b.z > a.z );
		mbShared[ t ] = vec4f( m.xyz, min( a.w, b.w ) );
	}
	workgroupBarrier();`;const s={mbParams:{uniform:this.uniforms}};this.tileKernel=new J({label:"Motion Blur Tiles",modules:[B],bindings:{...s,mbVelocity:{texture:()=>this.velocityTexture},mbDepth:{texture:()=>this.depthTexture},mbTileMaxRW:{storage:this.tileMax,access:"read_write"}},workgroupSize:[Tt,Tt,1],code:Ki+`
var<workgroup> mbShared: array<vec4f, ${e}>;
@compute @workgroup_size( WG_X, WG_Y, 1 )
fn main( @builtin( local_invocation_id ) lid: vec3u, @builtin( workgroup_id ) wid: vec3u ) {
	let t = lid.y * ${Tt}u + lid.x;
	let inSize = vec2i( textureDimensions( mbVelocity ) );
	var best = vec2f( 0.0 ); var bestL = 0.0; var minL = 1e8;
	for ( var k = 0; k < 4; k++ ) {
		let o = vec2u( u32( k & 1 ), u32( k >> 1u ) );
		let p = vec2f( wid.xy * ${Qt}u + lid.xy * 2u + o ) + 0.5;
		let q = min( vec2i( p / mbParams.outSize * vec2f( inSize ) ), inSize - 1 );
		let v = mbToPx( mbUvVelocity( textureLoad( mbVelocity, q, 0 ), p / mbParams.outSize, textureLoad( mbDepth, q, 0 ) ) );
		let l = dot( v, v );
		if ( l > bestL ) {
			bestL = l;
			best = v;
		}
		minL = min( minL, l );
	}
	mbShared[ t ] = vec4f( best, bestL, minL );
	workgroupBarrier();
${t}
	if ( t == 0u ) {
		let r = mbShared[ 0 ];
		let idx = i32( wid.y ) * MB_MAX_TILES_X + i32( wid.x );
		// xy = longest half streak (px), z = its length, w = shortest length in the tile
		mbTileMaxRW[ idx ] = vec4f( r.xy, sqrt( r.z ), sqrt( r.w ) );
	}
}
`});let i="";for(let r=-1;r<=1;r++)for(let n=-1;n<=1;n++){let o="m.z > best.z";if(n!==0&&r!==0){const l=[-n*Math.SQRT1_2,-r*Math.SQRT1_2];o+=` && abs( dot( m.xy, vec2f( ${l[0]}, ${l[1]} ) ) ) > m.z * 0.7`}i+=`
		{
			let x = clamp( tx + ${n}, 0, nx - 1 ); let y = clamp( ty + ${r}, 0, ny - 1 );
			let m = mbTileMaxR[ y * MB_MAX_TILES_X + x ];
			if ( ${o} ) { best = m; }
			minL = min( minL, m.w );
		}`}this.neighborKernel=new J({label:"Motion Blur Neighbourhood",modules:[B],bindings:{...s,mbTileMaxR:{storage:this.tileMax,access:"read"},mbNeighborRW:{storage:this.neighborMax,access:"read_write"}},workgroupSize:[8,8,1],code:`
const MB_MAX_TILES_X: i32 = ${kt};
@compute @workgroup_size( WG_X, WG_Y, 1 )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let tx = i32( gid.x ); let ty = i32( gid.y );
	let nx = i32( mbParams.tileCount.x ); let ny = i32( mbParams.tileCount.y );
	if ( tx < nx && ty < ny ) {
		var best = vec4f( 0.0 ); var minL = 1e8;
${i}
		// xy = dominant half streak (px), z = its length, w = shortest streak in the neighbourhood
		mbNeighborRW[ ty * MB_MAX_TILES_X + tx ] = vec4f( best.xyz, minL );
	}
}
`})}updateCamera(e){e.updateMatrixWorld(),e.matrixWorldInverse&&e.matrixWorldInverse.copy(e.matrixWorld).invert(),this._vp.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._hasPrev||this._prevVP.copy(this._vp),this._hasPrev=!0,this.skyReproj.value.copy(this._vp).invert().premultiply(this._prevVP),this._prevVP.copy(this._vp)}compute(e,t){if(this.shutter.value<=0)return;const s=Math.min(kt,Math.ceil(e/Qt)),i=Math.min(Ts,Math.ceil(t/Qt));this.outSize.value.set(e,t),this.tileCount.value.set(s,i),this._frame=(this._frame+1)%64,this.frameIndex.value=this._frame,this.tileKernel.dispatch([s,i,1]),this.neighborKernel.dispatch([Math.ceil(s/8),Math.ceil(i/8),1])}}const Ze=[0,0,0,0],Eo=`
fn RRTAndODTFit( v: vec3f ) -> vec3f {
	let a = v * ( v + 0.0245786 ) - 0.000090537;
	let b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
fn acesFilmicToneMapping( colorIn: vec3f, exposure: f32 ) -> vec3f {
	let ACESInputMat = transpose( mat3x3f(
		0.59719, 0.35458, 0.04823,
		0.07600, 0.90834, 0.01566,
		0.02840, 0.13383, 0.83777 ) );
	let ACESOutputMat = transpose( mat3x3f(
		1.60475, -0.53108, -0.07367,
		-0.10208, 1.10813, -0.00605,
		-0.00327, -0.07276, 1.07602 ) );
	var color = colorIn * exposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return clamp( color, vec3f( 0.0 ), vec3f( 1.0 ) );
}
`;class No{constructor(e,{sceneRenderer:t,camera:s,underwater:i,clouds:r=null,sunDir:n=null,haze:o=null}){this.renderer=e,this.camera=s,this.sceneRenderer=t,this.underwater=i,this.scale=1,this.optimizeDisabledEffects=!0,this.outputTexture=null,this.outputSize=null,this.outputFormat=z.context?z.format:"rgba8unorm",this.uniforms=new U("PostParams",{optimizeDisabledEffects:["f32",0],aoStrength:["f32",1],bloom:["f32",.05],vignette:["f32",.28],saturation:["f32",1.06],contrast:["f32",1.04],warmth:["f32",.02],grain:["f32",.012],sharpen:["f32",.45]},{label:"post"}),this.params=this.uniforms.fields,this.aeUniforms=new U("AutoExposureParams",{enabled:["f32",1],refLum:["f32",.25],min:["f32",.6],max:["f32",6],up:["f32",1.6],down:["f32",1.1]},{label:"autoExposure"}),this.autoExposure={...this.aeUniforms.fields,ref:this.aeUniforms.fields.refLum},this.exposure=new $e({label:"autoExposure",count:1,type:"f32",data:new Float32Array([1])});const l=t.sceneRT,h=t.opaqueCopy;this.sceneColor=l.texture,this.opaqueDepth=h.depthTexture,this.finalDepth=l.depthTexture,this.aoDepth=new j(1,1,{colors:["r16float"],label:"aoDepth"}),this._aoDepthPass=new X({label:"AO depth",colorFormats:["r16float"],bindings:{aoFullDepth:{texture:()=>this.opaqueDepth},aoFinalDepth:{texture:()=>this.finalDepth}},code:`
// negative where the water covers the opaque surface: its AO is never shown (the beauty pass skips
// covered pixels), so GTAO leaves those texels alone; everything else reads the magnitude
fn fragment( in: FSIn ) -> vec4f {
	let s = vec2i( textureDimensions( aoFullDepth ) );
	let p = min( vec2i( in.pos.xy ) * 2, s - 1 );
	let d = textureLoad( aoFullDepth, p, 0 );
	let covered = textureLoad( aoFinalDepth, p, 0 ) > d + 1e-7;
	return vec4f( select( d, - d, covered ), 0.0, 0.0, 1.0 );
}
`}),this.aoPass=new Mo(this.aoDepth.texture,s,{samples:12,depthIsColor:!0}),this.aoPass.resolutionScale=.5,this.aoPass.radius.value=2.2,this.aoPass.thickness.value=2,this.aoPass.distanceExponent.value=1.4,this.aoPass.scale.value=1.6,this.aoPass.samples.value=12,this.aoPass.useTemporalFiltering=!0,this.aoBlurX=new j(1,1,{colors:["r16float"],label:"aoBlurX"}),this.aoBlurY=new j(1,1,{colors:["r16float"],label:"aoBlurY"});const c=(u,d,m)=>{let v="";for(let p=-2;p<=2;p++)v+=`
	{
		let uvK = in.uv + vec2f( ${d*p}.0, ${m*p}.0 ) / size;
		let rel = abs( postDepthOpaque( uvK ) - dC ) / max( dC, 1e-7 );
		let w = 1.0 / pow2( rel * 40.0 + 1.0 );
		sum += textureSampleLevel( aoSrc, smpLinearClamp, uvK, 0.0 ).r * w;
		wSum += w;
	}`;return new X({label:"AO blur "+(d?"x":"y"),colorFormats:["r16float"],bindings:{aoSrc:{texture:u},postAODepth:{texture:()=>this.aoDepth.texture}},code:`
fn postDepthOpaque( uv: vec2f ) -> f32 {
	let s = vec2i( textureDimensions( postAODepth ) );
	return abs( textureLoad( postAODepth, clamp( vec2i( floor( uv * vec2f( s ) ) ), vec2i( 0 ), s - 1 ), 0 ).r );
}
fn fragment( in: FSIn ) -> vec4f {
	let size = vec2f( textureDimensions( aoSrc ) );
	let dC = postDepthOpaque( in.uv );
	var sum = 0.0; var wSum = 0.0;
${v}
	return vec4f( sum / wSum, 0.0, 0.0, 1.0 );
}
`})};this._aoBlurXPass=c(()=>this.aoPass.texture,1,0),this._aoBlurYPass=c(()=>this.aoBlurX.texture,0,1),this.medium=new j(1,1,{colors:["r8unorm"],label:"medium"}),i.mediumTexture=this.medium.texture,this.haze=o,o&&(o.mediumTexture=this.medium.texture),this.beauty=new j(1,1,{colors:["rgba16float"],label:"beauty"}),this.smaaIn=new j(1,1,{colors:["rgba16float"],label:"smaaBeforeTAA"}),this.taau=new ko(()=>this.aaMode==="smaataa"?this.smaaIn.texture:this.beauty.texture,this.finalDepth,t.velocityTexture,s,t.waterMaskTexture,this.exposure),this.aaMode="taa",this.aa=new Ao({src:()=>this.beauty.texture,exposure:this.exposure}),this.motionBlur=new Bo({velocityTexture:t.velocityTexture,depthTexture:l.depthTexture,color:()=>this.taau.output}),this.flare=n?new Io({depthTexture:l.depthTexture,clouds:r,sunDir:n}):null,this.lens=new Co,this._outW=0,this._outH=0,this._inW=0,this._inH=0,this._prevVP=new C,this._prevCamPos=new S,this._hasPrev=!1,this._size=new I,this._built=!1,this.profiler=null}_build(){this._built=!0;const e=this.underwater,t=this.haze;if(this._mediumPass=new X({label:"medium",colorFormats:["r8unorm"],modules:[e.module],code:"fn fragment( in: FSIn ) -> vec4f { return vec4f( underwaterMedium( in.uv ), 0.0, 0.0, 1.0 ); }"}),this._beautyPass=new X({label:"beauty (AO + haze + underwater)",colorFormats:["rgba16float"],modules:[e.compositeModule,t?t.compositeModule:null].filter(Boolean),defines:t?t._defines():{},bindings:{post:{uniform:this.uniforms},postScene:{texture:()=>this.sceneColor},postOpaqueDepth:{texture:()=>this.opaqueDepth},postFinalDepth:{texture:()=>this.finalDepth},postAO:{texture:()=>this.aoBlurY.texture},postAODepth:{texture:()=>this.aoDepth.texture}},code:`
fn postDepthLoad( uv: vec2f, which: i32 ) -> f32 {
	if ( which == 0 ) {
		let s = vec2i( textureDimensions( postOpaqueDepth ) );
		return textureLoad( postOpaqueDepth, clamp( vec2i( floor( uv * vec2f( s ) ) ), vec2i( 0 ), s - 1 ), 0 );
	}
	let s = vec2i( textureDimensions( postFinalDepth ) );
	return textureLoad( postFinalDepth, clamp( vec2i( floor( uv * vec2f( s ) ) ), vec2i( 0 ), s - 1 ), 0 );
}

fn postColorAO( uv: vec2f ) -> vec3f {
	let c = textureSampleLevel( postScene, smpLinearClamp, uv, 0.0 ).rgb;
	if ( post.optimizeDisabledEffects > 0.5 && post.aoStrength == 0.0 ) { return c; }
	let dO = postDepthLoad( uv, 0 );
	let dF = postDepthLoad( uv, 1 );
	// reversed depth: sky = 0; water in front of the opaque surface has a larger depth value
	let isSky = dO < 1e-7;
	let covered = dF > dO + 1e-7;
	// no AO there (k = 0 below): skip the upsample
	if ( isSky || covered ) { return c; }
	// depth-aware upsample of the half-res AO: the 4 nearest AO texels, weighted by how close
	// their depth is to this pixel's (no dark halos bleeding across depth edges)
	// (the AO texels' depths: the half resolution copy the AO was computed from)
	let aoSizeI = vec2i( textureDimensions( postAO ) );
	let pa = uv * vec2f( aoSizeI ) - 0.5;
	let i0 = floor( pa );
	let fr = pa - i0;
	var aSum = 0.0; var wSum = 1e-4;
	for ( var k = 0; k < 4; k++ ) {
		let o = vec2i( k & 1, k >> 1u );
		let pT = clamp( vec2i( i0 ) + o, vec2i( 0 ), aoSizeI - 1 );
		let dT = abs( textureLoad( postAODepth, pT, 0 ).r );
		let wBil = select( 1.0 - fr.x, fr.x, o.x == 1 ) * select( 1.0 - fr.y, fr.y, o.y == 1 );
		// reversed-Z depth ~ near / z, so the relative depth difference ~ |dT - dO| / dO
		let rel = abs( dT - dO ) / max( dO, 1e-7 );
		let wDepth = 1.0 / pow2( rel * 40.0 + 1.0 );
		let wt = wBil * wDepth + 1e-5;
		aSum += textureLoad( postAO, pT, 0 ).r * wt;
		wSum += wt;
	}
	let a = aSum / wSum;
	// multi-bounce approximation (Jimenez 2016) for a typical outdoor albedo of ~0.35
	let aMB = max( a, ( ( a * 0.382 - 1.036 ) * a + 1.654 ) * a );
	// AO only removes ambient light: full effect where the pixel is lit by the sky alone,
	// a third of it on sunlit surfaces (still grounds objects without dirty halos)
	let ambientOnly = 1.0 - smoothstep( 0.12, 0.9, luminance( c ) );
	let k = select( post.aoStrength * mix( 0.35, 1.0, ambientOnly ), 0.0, isSky || covered );
	return c * mix( 1.0, aMB, k );
}

fn postSceneSample( uv: vec2f ) -> vec3f {
	${t?"return hazeApply( uv, vec4f( postColorAO( uv ), 1.0 ) ).rgb;":"return postColorAO( uv );"}
}

fn fragment( in: FSIn ) -> vec4f {
	return underwaterComposite( in.uv, in.pos.xy );
}
`}),this.aoPass._pass||this.aoPass._build(),t&&!t._passes&&t._build(),e.renderShafts&&e.shaftPass,this._buildBloom(),this._buildMeter(),this._buildFinal(),this.profiler)for(const[s,i]of this.passes())this.profiler.track("post "+s,i)}_buildBloom(){const e=o=>new j(1,1,{colors:["rgba16float"],label:o});this.bloomScales=[.5,.25,.125,.0625,.03125],this.bloomDown=this.bloomScales.map((o,l)=>e("bloomDown"+(l+1))),this.bloomUp=this.bloomScales.slice(0,4).map((o,l)=>e("bloomUp"+(l+1)));const t=`
fn bTap( uv: vec2f, texel: vec2f, x: f32, y: f32 ) -> vec3f { return textureSampleLevel( bSrc, smpLinearClamp, uv + texel * vec2f( x, y ), 0.0 ).rgb; }
fn karis( c: vec3f ) -> vec3f { return c / ( luminance( c ) + 1.0 ); }
`,s=(o,l)=>new X({label:"bloom down",colorFormats:["rgba16float"],bindings:{bSrc:{texture:o}},code:t+`
fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let texel = 1.0 / vec2f( textureDimensions( bSrc ) );
	let a = bTap( uv, texel, -2.0, -2.0 ); let b = bTap( uv, texel, 0.0, -2.0 ); let c = bTap( uv, texel, 2.0, -2.0 );
	let d = bTap( uv, texel, -2.0, 0.0 ); let e = bTap( uv, texel, 0.0, 0.0 ); let f = bTap( uv, texel, 2.0, 0.0 );
	let g = bTap( uv, texel, -2.0, 2.0 ); let h = bTap( uv, texel, 0.0, 2.0 ); let i = bTap( uv, texel, 2.0, 2.0 );
	let j = bTap( uv, texel, -1.0, -1.0 ); let k = bTap( uv, texel, 1.0, -1.0 ); let l = bTap( uv, texel, -1.0, 1.0 ); let m = bTap( uv, texel, 1.0, 1.0 );
${l?`
	// weighted groups of four (Karis average) suppress fireflies
	let g0 = karis( ( j + k + l + m ) * 0.25 ) * 0.5;
	let g1 = karis( ( a + b + d + e ) * 0.25 ) * 0.125;
	let g2 = karis( ( b + c + e + f ) * 0.25 ) * 0.125;
	let g3 = karis( ( d + e + g + h ) * 0.25 ) * 0.125;
	let g4 = karis( ( e + f + h + i ) * 0.25 ) * 0.125;
	let s = g0 + g1 + g2 + g3 + g4;
	// undo the Karis tonemap on the result
	return vec4f( s / max( 1.0 - luminance( s ), 0.02 ), 1.0 );`:`
	let s = e * 0.125 + ( a + c + g + i ) * 0.03125 + ( b + d + f + h ) * 0.0625 + ( j + k + l + m ) * 0.125;
	return vec4f( s, 1.0 );`}
}
`}),i=(o,l)=>new X({label:"bloom up",colorFormats:["rgba16float"],bindings:{bSrc:{texture:o},bBase:{texture:l}},code:t+`
fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let texel = 1.0 / vec2f( textureDimensions( bSrc ) );
	let s = ( bTap( uv, texel, 0.0, 0.0 ) * 4.0
		+ ( bTap( uv, texel, -1.0, 0.0 ) + bTap( uv, texel, 1.0, 0.0 ) + bTap( uv, texel, 0.0, -1.0 ) + bTap( uv, texel, 0.0, 1.0 ) ) * 2.0
		+ ( bTap( uv, texel, -1.0, -1.0 ) + bTap( uv, texel, 1.0, -1.0 ) + bTap( uv, texel, -1.0, 1.0 ) + bTap( uv, texel, 1.0, 1.0 ) ) ) / 16.0;
	return vec4f( textureSampleLevel( bBase, smpLinearClamp, uv, 0.0 ).rgb + s, 1.0 );
}
`}),r=this.bloomDown,n=this.bloomUp;this._bloomPasses=[[s(()=>this.taau.texture,!0),r[0]],[s(()=>r[0].texture,!1),r[1]],[s(()=>r[1].texture,!1),r[2]],[s(()=>r[2].texture,!1),r[3]],[s(()=>r[3].texture,!1),r[4]],[i(()=>r[4].texture,()=>r[3].texture),n[3]],[i(()=>n[3].texture,()=>r[2].texture),n[2]],[i(()=>n[2].texture,()=>r[1].texture),n[1]],[i(()=>n[1].texture,()=>r[0].texture),n[0]]],this.bloomTex=n[0],this.half=r[0],this.meterRT=r[3]}_buildMeter(){let t="";for(let s=256/2;s>0;s>>=1)t+=`
	if ( t < ${s}u ) {
		sumL[ t ] += sumL[ t + ${s}u ];
		sumW[ t ] += sumW[ t + ${s}u ];
	}
	workgroupBarrier();`;this.meterKernel=new J({label:"Auto Exposure",modules:[B],bindings:{ae:{uniform:this.aeUniforms},aeTex:{texture:()=>this.meterRT.texture},aeExposure:{storage:this.exposure,access:"read_write"}},workgroupSize:[256,1,1],code:`
var<workgroup> sumL: array<f32, 256>;
var<workgroup> sumW: array<f32, 256>;
@compute @workgroup_size( WG_X, 1, 1 )
fn main( @builtin( local_invocation_id ) lid: vec3u ) {
	let t = lid.x;
	let size = textureDimensions( aeTex );
	let n = size.x * size.y;
	var accL = 0.0; var accW = 0.0;
	for ( var i = 0u; i < 160u; i++ ) {
		let idx = t + i * 256u;
		if ( idx < n ) {
			let x = idx % size.x; let y = idx / size.x;
			let c = textureLoad( aeTex, vec2i( i32( x ), i32( y ) ), 0 ).rgb;
			let l = log2( max( luminance( c ), 1e-4 ) );
			let uvc = vec2f( ( f32( x ) + 0.5 ) / f32( size.x ), ( f32( y ) + 0.5 ) / f32( size.y ) ) - 0.5;
			let w = max( 1.0 - length( uvc * vec2f( 1.0, 1.4 ) ) * 1.2, 0.15 );
			accL += l * w;
			accW += w;
		}
	}
	sumL[ t ] = accL;
	sumW[ t ] = accW;
	workgroupBarrier();
${t}
	if ( t == 0u ) {
		let avg = exp2( sumL[ 0 ] / max( sumW[ 0 ], 1e-4 ) );
		// the eye only partly compensates: dark scenes stay darker (dusk and night must not
		// look like day), and at night at most one extra stop
		let ratio = ae.refLum / avg;
		let partial = select( ratio, pow( ratio, 0.8 ), ratio > 1.0 );
		let tgt = clamp( partial, ae.min, mix( ae.max, 2.0, frame.night ) );
		let cur = aeExposure[ 0 ];
		let rate = select( ae.down, ae.up, tgt > cur );
		let k = 1.0 - exp( - frame.dt * rate );
		let next = exp2( mix( log2( max( cur, 1e-3 ) ), log2( tgt ), k ) );
		aeExposure[ 0 ] = select( 1.0, next, ae.enabled > 0.5 );
	}
}
`})}_buildFinal(){const e=[B,this.motionBlur.module,this.lens.module];this.flare&&e.push(this.flare.module),this._finalPass=new X({label:"final (grade + tonemap)",colorFormats:[this.outputFormat],modules:e,bindings:{post:{uniform:this.uniforms},postResolved:{texture:()=>this.taau.output},postBloom:{texture:()=>this.bloomTex.texture},postHalf:{texture:()=>this.half.texture},postExposure:{storage:this.exposure,access:"read"}},code:Eo+`
fn tm( c: vec3f ) -> vec3f { return c / ( max( c.r, max( c.g, c.b ) ) + 1.0 ); }
fn loadResolved( p: vec2i ) -> vec3f { return textureLoad( postResolved, p, 0 ).rgb; }

// RCAS (AMD FSR1 robust contrast-adaptive sharpening) on the resolved image: TAA converges to a
// slightly soft image, RCAS restores the detail without halos (the lobe is limited by local
// contrast). Done on a tonemapped proxy of the HDR values and inverted afterwards.
fn rcas( uvIn: vec2f ) -> vec3f {
	let size = vec2i( textureDimensions( postResolved ) );
	let pc = clamp( vec2i( uvIn * vec2f( size ) ), vec2i( 1 ), size - 2 );
	let e = tm( loadResolved( pc ) );
	let b = tm( loadResolved( pc + vec2i( 0, -1 ) ) ); let d = tm( loadResolved( pc + vec2i( -1, 0 ) ) );
	let f = tm( loadResolved( pc + vec2i( 1, 0 ) ) ); let h = tm( loadResolved( pc + vec2i( 0, 1 ) ) );
	let mn4 = min( min( b, d ), min( f, h ) );
	let mx4 = max( max( b, d ), max( f, h ) );
	let hitMin = min( mn4, e ) / ( mx4 * 4.0 + 1e-5 );
	let hitMax = ( vec3f( 1.0 ) - max( mx4, e ) ) / ( mn4 * 4.0 - 4.0 );
	let lobeRGB = max( - hitMin, hitMax );
	// the sky (depth 0) is only sharpened lightly: clouds and cirrus are soft by nature, and the lobe
	// turned their sampling noise into fine grain (mbDepth: the scene depth, bound by the blur module)
	let dS = textureLoad( mbDepth, clamp( vec2i( uvIn * vec2f( textureDimensions( mbDepth ) ) ), vec2i( 0 ), vec2i( textureDimensions( mbDepth ) ) - 1 ), 0 );
	let skyK = select( 1.0, 0.3, dS < 1e-7 );
	let lobe = max( ${-.1875}, min( max( lobeRGB.r, max( lobeRGB.g, lobeRGB.b ) ), 0.0 ) ) * post.sharpen * skyK;
	let r = max( ( ( b + d + f + h ) * lobe + e ) / ( lobe * 4.0 + 1.0 ), vec3f( 0.0 ) );
	// back to HDR (inverse of the max-channel Reinhard)
	return r / max( 1.0 - max( r.r, max( r.g, r.b ) ), 1e-3 );
}

// integer hash (per pixel and frame) -> [0, 1)
fn postHash( p: vec2u, f: u32 ) -> f32 {
	var x = p.x * 1664525u + p.y * 1013904223u + f * 2654435761u;
	x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u;
	return f32( x >> 8u ) / 16777216.0;
}

fn bloomAt( uv: vec2f ) -> vec3f {
	if ( post.optimizeDisabledEffects > 0.5 && post.bloom == 0.0 ) { return vec3f( 0.0 ); }
	return textureSampleLevel( postBloom, smpLinearClamp, uv, 0.0 ).rgb * post.bloom;
}

fn lensSharp( uv: vec2f ) -> vec3f {
	var c = mbApply( rcas( uv ), uv ) + bloomAt( uv );
${this.flare?"	c += flareLight( uv );":""}
	return c;
}
fn lensBlurred( uv: vec2f ) -> vec3f { return textureSampleLevel( postHalf, smpLinearClamp, uv, 0.0 ).rgb + bloomAt( uv ); }

fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	var c = lensDroplets( uv ) * postExposure[ 0 ];
	// white balance nudge + saturation + contrast around mid grey (in linear HDR)
	c = c * vec3f( 1.0 + post.warmth, 1.0, 1.0 - post.warmth );
	let l = luminance( c );
	c = mix( vec3f( l ), c, post.saturation );
	c = pow( max( c, vec3f( 0.0 ) ) / 0.18, vec3f( post.contrast ) ) * 0.18;
	// vignette (elliptical, soft)
	let dv = ( uv - 0.5 ) * vec2f( 1.0, 0.8 );
	let v = 1.0 - smoothstep( 0.25, 0.75, length( dv ) ) * post.vignette;
	c = c * v;
	// fine film grain (luminance-weighted): triangular white noise on the real pixel grid, new every
	// frame (a fixed pattern on a fixed grid showed as diagonal hatching in dark gradients)
	let px = vec2u( in.pos.xy );
	let fi = frame.frameIndex;
	let n = ( postHash( px, fi ) + postHash( px + vec2u( 7919u, 104729u ), fi ) - 1.0 ) * 0.5;
	c = c + c * ( n * post.grain );
	// renderOutput: ACES filmic tone mapping with the exposure, sRGB transfer
	let t = acesFilmicToneMapping( c, frame.exposure );
	// +-1 LSB triangular dither before the 8-bit output: no banding in the sky gradients
	let dq = ( postHash( px + vec2u( 31337u, 271u ), fi ) + postHash( px + vec2u( 1013u, 65537u ), fi ) - 1.0 ) / 255.0;
	return vec4f( linearToSrgb( t ) + vec3f( dq ), 1.0 );
}
`})}_outputSize(){if(this.outputSize)return this.outputSize;const e=this.renderer;return e&&e.width?{width:e.width,height:e.height}:z.canvas?{width:z.canvas.width,height:z.canvas.height}:{width:1,height:1}}_resize(){const{width:e,height:t}=this._outputSize(),s=Math.max(1,Math.round(e*this.scale)),i=Math.max(1,Math.round(t*this.scale));if(e===this._outW&&t===this._outH&&s===this._inW&&i===this._inH)return;this._outW=e,this._outH=t,this._inW=s,this._inH=i,this.sceneRenderer.setSize(s,i),this.beauty.setSize(s,i),this.smaaIn.setSize(s,i),this.medium.setSize(s,i),this.underwater.setSize&&this.underwater.setSize(s,i),this.aoPass.resolutionScale=.5*this.scale,this.aoPass.setSize(e,t);const r=Math.round(e*.5*this.scale),n=Math.round(t*.5*this.scale);this.aoDepth.setSize(r,n),this.aoBlurX.setSize(r,n),this.aoBlurY.setSize(r,n),this.haze&&this.haze.setSize(e,t),this.taau.setSize(e,t),this.bloomDown&&(this.bloomScales.forEach((o,l)=>this.bloomDown[l].setSize(Math.round(e*o),Math.round(t*o))),this.bloomScales.slice(0,4).forEach((o,l)=>this.bloomUp[l].setSize(Math.round(e*o),Math.round(t*o)))),this.flare&&this.flare.setDepthHeight(i),this.lens.aspect.value=e/t}setScale(e){e!==this.scale&&(this.scale=e,this.sceneRenderer.scale=e,this.haze&&this.haze.setScale(e))}setBloom(e){this.params.bloom.value=e}internalSize(e=new I){return e.set(this._inW,this._inH)}beginFrame(){this._built||(this._build(),this._outW=0),this._resize();const e=this.camera;e.updateMatrixWorld(),e.matrixWorldInverse&&e.matrixWorldInverse.copy(e.matrixWorld).invert(),this.motionBlur.updateCamera(e),this.taau.advance();const[t,s]=this.aaMode==="taa"||this.aaMode==="smaataa"?this.taau.jitter():[0,0];Fr(e,this._inW,this._inH,{jitterX:-t,jitterY:s,prevViewProj:this._hasPrev?this._prevVP:null,prevCameraPos:this._hasPrev?this._prevCamPos:null});const i=re.fields;i.outputResolution.value.set(this._outW,this._outH),this._prevVP.copy(i.viewProjNoJitter.value),this._prevCamPos.copy(i.cameraPos.value),this._hasPrev=!0}render(){this._built||this.beginFrame(),this._timers;const e=this.optimizeDisabledEffects;if(this.params.optimizeDisabledEffects.value=e?1:0,this.motionBlur.compute(this._outW,this._outH),!e||this.params.aoStrength.value!==0?(this._aoDepthPass.render({colorViews:[this.aoDepth.texture],clear:Ze}),this.aoPass.render(),this._aoBlurXPass.render({colorViews:[this.aoBlurX.texture],clear:Ze}),this._aoBlurYPass.render({colorViews:[this.aoBlurY.texture],clear:Ze})):this.aoPass.advanceFrame(),this._mediumPass.render({colorViews:[this.medium.texture],clear:Ze}),this.underwater.renderShafts&&this.underwater.renderShafts(this.camera.position.y<H.cameraWaterHeight.value+bo+1),this.haze&&(this.haze.update(),this.haze.render(e)),this._beautyPass.render({colorViews:[this.beauty.texture],clear:Ze}),this.aaMode==="taa"||this.aaMode==="smaataa")this.aaMode==="smaataa"&&this.aa.render("smaa",this.smaaIn.texture),this.taau.render();else{const i=this.taau,r=1-i._cur;this.aa.render(this.aaMode,i.history[r].textures[0]),i._cur=r,i._needsRestart=!0}const t=e&&this.params.bloom.value===0?4:this._bloomPasses.length;for(let i=0;i<t;i++){const[r,n]=this._bloomPasses[i];r.render({colorViews:[n.texture],clear:Ze})}const s=this.outputTexture?this.outputTexture.view({dimension:"2d",mipLevelCount:1}):z.context.getCurrentTexture().createView();this._finalPass.render({colorViews:[s],clear:Ze}),this.meterKernel.dispatch([1,1,1])}endFrame(){this.taau.clearViewOffset(),this.taau.endFrame()}passes(){const e=[["motion blur tiles",this.motionBlur.tileKernel],["motion blur neighbours",this.motionBlur.neighborKernel],["GTAO",this.aoPass._pass],["AO blur x",this._aoBlurXPass],["AO blur y",this._aoBlurYPass],["medium",this._mediumPass]];return this.haze&&this.haze._passes&&(e.push(["haze march",this.haze._passes.march],["haze sun mask",this.haze._passes.mask]),this.haze._passes.blur.forEach((t,s)=>e.push(["haze god rays "+s,t]))),this.underwater._shaftPass&&e.push(["underwater shafts",this.underwater._shaftPass]),e.push(["beauty",this._beautyPass],["TAAU",this.taau._resolve[0]],["TAAU ",this.taau._resolve[1]]),this._bloomPasses.forEach(([t],s)=>e.push(["bloom "+s,t])),e.push(["final",this._finalPass],["auto exposure",this.meterKernel]),this.flare&&e.push(["flare visibility",this.flare.kernel]),e}}function Oo(a){let e=1/0;for(const t of a?.heights??[])Number.isFinite(t)&&(e=Math.min(e,t));return Number.isFinite(e)?e:0}function Uo(a){const e=new U("BuilderMist",{density:["f32",.004],speed:["f32",2],height:["f32",9],base:["f32",0],storm:["f32",0],lightning:["f32",0]},{label:"builderMist"});return{uniforms:e,module:new N({name:"builder-dry-medium",code:"fn underwaterMedium(uv: vec2f) -> f32 { return 0.0; }"}),compositeModule:new N({name:"builder-drifting-mist",deps:[B],uniforms:e,uniformName:"builderMist",bindings:{builderDepth:{texture:a}},code:`
fn bmHash(p: vec3f) -> f32 { return fract(sin(dot(p, vec3f(127.1,311.7,74.7))) * 43758.5453); }
fn bmNoise(p: vec3f) -> f32 {
  let i = floor(p); let q = fract(p); let u = q*q*(3.0-2.0*q);
  return mix(mix(mix(bmHash(i),bmHash(i+vec3f(1,0,0)),u.x),mix(bmHash(i+vec3f(0,1,0)),bmHash(i+vec3f(1,1,0)),u.x),u.y),
    mix(mix(bmHash(i+vec3f(0,0,1)),bmHash(i+vec3f(1,0,1)),u.x),mix(bmHash(i+vec3f(0,1,1)),bmHash(i+vec3f(1,1,1)),u.x),u.y),u.z);
}
fn underwaterComposite(uv: vec2f, pixel: vec2f) -> vec4f {
  let source = postSceneSample(uv) * mix(1.0,0.34,builderMist.storm) + vec3f(0.6,0.7,0.9)*builderMist.lightning;
  if (builderMist.density <= 0.0) { return vec4f(source,1.0); }
  let size = vec2i(textureDimensions(builderDepth));
  let d = textureLoad(builderDepth,clamp(vec2i(uv*vec2f(size)),vec2i(0),size-1),0);
  let clip = vec2f(uv.x*2.0-1.0,1.0-uv.y*2.0);
  let wp = frame.invViewProj * vec4f(clip,max(d,0.00001),1.0);
  let point = wp.xyz / wp.w;
  let ray = normalize(point-frame.cameraPos);
  let distance = select(min(length(point-frame.cameraPos),700.0),700.0,d <= 0.000001);
  let step = distance/24.0;
  var optical = 0.0;
  for (var i=0; i<24; i++) {
    let p = frame.cameraPos + ray * (f32(i)+0.5)*step;
    let moving = p * vec3f(0.045,0.09,0.045) - vec3f(frame.time*builderMist.speed*0.045,0,frame.time*builderMist.speed*0.018);
    let noise = bmNoise(moving)*0.72 + bmNoise(moving*2.13)*0.28;
    let bank = smoothstep(0.28,0.7,noise);
    let layer = exp(-max(p.y-builderMist.base,0.0)/max(builderMist.height,0.5));
    optical += bank * layer * builderMist.density * step;
  }
  let transmittance = exp(-optical);
  let light = frame.skyIrradiance*0.65 + frame.sunColor*0.025 + vec3f(0.003);
  return vec4f(source*transmittance + light*(1.0-transmittance),1.0);
}`})}}class Wo{constructor(){this.group=new Fe;const e=(t,s)=>{const i=new ie;i.setAttribute("position",new te(new Float32Array(t*12),3)),i.setIndex(ra(t));const r=new Y({name:"builder-weather",color:s,lit:!1,transparent:!0,opacity:.55,depthWrite:!1,side:"double",receiveShadows:!1}),n=new ce(i,r);return n.layers.set(2),n.frustumCulled=!1,n.castShadow=!1,n.visible=!1,this.group.add(n),n};this.rain=e(aa,"#c4e3ef"),this.bolt=e(12,"#e2ebff"),this.lastThunder=-1,this.lastWeather="clear",this.weatherStarted=0}update(e,t,s,i,r){const n=this.rain.geometry.getAttribute("position"),o=ta(n.array,e,t.position.toArray(),i);n.needsUpdate=!0,this.rain.geometry.setDrawRange(0,o*6),this.rain.visible=o>0,i.weather!==this.lastWeather&&(this.lastThunder=-1,this.lastWeather=i.weather,this.weatherStarted=e);const l=sa(e-this.weatherStarted,i);this.bolt.visible=l.flash>.02,this.bolt.material.opacity=l.flash;const h=this.bolt.geometry.getAttribute("position");return ia(h.array,t.position.toArray(),s,i.weatherSeed??7341,l.event),h.needsUpdate=!0,l.event>=0&&l.event!==this.lastThunder&&(this.lastThunder=l.event,r(l.event)),{...l,particles:o}}}function Vo(a,e){const t=na(a),s=t.value,i=new Fe,r=[],n=(l,h)=>{const c=new ce(e(l),h);return c.castShadow=!1,i.add(c),c},o=a.effect.mode==="sequence"?s.glyphs:[{geometry:s.geometry,index:-1}];for(const l of o){const h=new Y({name:"neon-letter",color:a.color,emissive:a.color,roughness:.35,side:"double"}),c=n(l.geometry,h);r.push({item:c,material:h,index:l.index})}return s.backingGeometry&&n(s.backingGeometry,new Y({name:"neon-backing",color:a.backingColor,roughness:.7,side:"double"})),s.mountingGeometry&&n(s.mountingGeometry,new Y({name:"neon-mount",color:"#555b61",metalness:.7,roughness:.4,side:"double"})),s.frameGeometry&&n(s.frameGeometry,new Y({name:"neon-frame",color:"#343b40",metalness:.65,roughness:.35,side:"double"})),t.release(),i.userData.updateNeon=(l,h,c=a.powered)=>{const u=oa({...a,powered:c},l,h);for(const d of r){const v=u.litGlyphs===void 0||d.index<u.litGlyphs?u.brightness:0;d.material.color.set(u.color).multiplyScalar(v>0?.6:.055),d.material.emissive.set(u.color).multiplyScalar(v*(1+a.glow*2))}i.userData.neonState={text:a.text,powered:c,brightness:u.brightness,color:u.color,glyphs:s.glyphs.length,emissive:r[0]?.material.emissive.toArray()}},i.userData.updateNeon(0,14),i}function Go(a,e){const t=new Fe;for(const s of a.features??[])if(s.visible!==!1)for(const i of la(s,a)){let r;if(i.semantic==="water"){const l=s.kind==="waterfall",h=s.kind==="lake";r=new Y({name:`builder-${s.kind}`,color:i.color,roughness:.22,metalness:.1,transparent:!0,opacity:.88,side:"double",receiveShadows:!0,vertex:l?"v.position.x += sin(v.position.y*2.8+frame.time*6.0)*0.025;":"v.position.y += sin(v.position.x*0.55+v.position.z*0.43+frame.time*1.7)*0.025;",surface:`
  let flow = in.uv.y*${l?"24.0":h?"2.1":"13.0"} - frame.time*${l?"3.6":h?"0.32":"1.4"};
  let wave = sin(flow*6.28318 + sin(in.uv.x*15.0 + frame.time)*0.9);
  let detail = sin(in.P.x*7.0-in.P.z*5.0+frame.time*2.0)*0.5+0.5;
  let streak = smoothstep(${l?"0.1":"0.7"},0.98,wave);
  s.albedo = mix(mat.color,vec3f(0.55,0.76,0.83),streak*${l?"0.68":"0.3"});
  s.normal = normalize(in.N + vec3f(wave*0.12,0.0,detail*0.12));
  s.roughness = ${l?"0.35":"0.2"};
  s.emissive = vec3f(0.01,0.025,0.03)*streak;
  s.alpha = ${l?"0.8 + detail*0.17":"0.9"};
`})}else i.semantic==="foam"?r=new Y({name:"builder-water-foam",color:i.color,roughness:.9,transparent:!0,opacity:.88,side:"double",receiveShadows:!1,vertex:"v.position.y += sin(v.position.x*3.7+v.position.z*4.1-frame.time*4.0)*0.045;",surface:`
  let bubbles = sin(in.uv.x*21.0+frame.time*2.2)*sin(in.uv.y*17.0-frame.time*3.0);
  s.albedo = mix(vec3f(0.35,0.62,0.69),vec3f(0.85,0.94,0.95),smoothstep(-0.2,0.6,bubbles));
  s.alpha = 0.55+0.35*smoothstep(-0.5,0.4,bubbles);
  s.emissive = vec3f(0.018);
`}):r=new Y({name:`builder-${i.semantic}`,color:i.color,roughness:.88,side:"double"});const n=e(i.geometry);i.geometry.dispose();const o=new ce(n,r);o.castShadow=i.semantic!=="water"&&i.semantic!=="foam",o.receiveShadow=!0,r.transparent&&o.layers.set(2),t.add(o)}return t}const Re=Object.freeze({maxHighDetailTrees:16,highDetailDistance:200,detailExitDistance:230,variantsPerSpecies:4,maxTrees:2e3,lodCheckSeconds:.75,lodMovementMetres:12}),Jt=new Map;let As;const Ho=`
  let bend=pow(max(0.0,v.treeLocal.y/7.0),2.0);
  let gust=sin(frame.time*0.85+v.treePhase)*0.11+sin(frame.time*1.67+v.treePhase)*0.035;
  let flutter=sin(frame.time*2.3+v.treeLocal.x*2.1+v.treeLocal.z*1.7+v.treePhase)*0.018*bend;
  let dx=(gust*bend+flutter)*v.treeFactor;
  let dz=(cos(frame.time*0.69+v.treePhase)*0.045*bend+flutter*0.5)*v.treeFactor;
  v.position+=v.treeWindX*dx+v.treeWindZ*dz;
`;function $o(){return As||(As=["bark","foliage"].map(a=>new Y({name:`builder-batched-tree-${a}`,color:"#ffffff",roughness:a==="bark"?.94:.78,side:"double",vertexColors:!0,userData:{sharedBuilderTreeMaterial:!0},attributes:{treeLocal:"vec3f",treePhase:"f32",treeFactor:"f32",treeWindX:"vec3f",treeWindZ:"vec3f"},vertex:Ho}))),As}function Es(a){a.getAttribute("normal")||a.computeVertexNormals();const e={positions:Float32Array.from(a.getAttribute("position").array),normals:Float32Array.from(a.getAttribute("normal").array),indices:Array.from(a.index?.array??Array.from({length:a.getAttribute("position").count},(t,s)=>s))};return a.dispose(),e}function Zi(a){const e=new ie;return e.setAttribute("position",new te(new Float32Array(a.positions),3)),e.setIndex(a.indices),Es(e)}function qo(a,e,t,s=!1){const i=(e>>>0)%Re.variantsPerSpecies,r=`${a}:${t?s?"exact:"+e:i:"low"}`;if(Jt.has(r))return Jt.get(r);let n;if(t){const o=ha(a,s?e:7319+i*113);n={bark:Zi(o.bark),foliage:Zi(o.foliage)}}else{const o=new gr(.12,.24,a==="palm"?5.5:4,5);o.translate(0,a==="palm"?2.75:2,0);let l;if(a==="pine")l=new tn(1.4,4.8,7),l.translate(0,3.6,0);else if(a==="palm"){const h=[],c=[];for(let u=0;u<8;u++){const d=u*Math.PI/4,m=Math.cos(d),v=Math.sin(d),p=-v*.32,f=m*.32,x=h.length/3;h.push(0,5.5,0,m*1.6+p,5.35,v*1.6+f,m*3,4.65,v*3,m*1.6-p,5.35,v*1.6-f),c.push(x,x+1,x+2,x,x+2,x+3)}l=new ie,l.setAttribute("position",new te(new Float32Array(h),3)),l.setIndex(c)}else l=new en(1,7,4),l.scale(1.9,1.55,1.7),l.translate(0,4.3,0);n={bark:Es(o),foliage:Es(l)}}return Jt.set(r,n),n}function Qi(a,e,t=new Set){const s=a.map(r=>({id:r.id,distance:e.distanceTo(new S(...r.position))/Math.max(1,Math.max(...r.scale))})).sort((r,n)=>r.distance-n.distance||r.id.localeCompare(n.id)),i=new Set(s.filter(r=>t.has(r.id)&&r.distance<Re.detailExitDistance).slice(0,Re.maxHighDetailTrees).map(r=>r.id));for(const r of s){if(i.size>=Re.maxHighDetailTrees)break;r.distance<Re.highDetailDistance&&i.add(r.id)}return i}function jo(a,e){const t=a.reduce((f,x)=>f+x.template[e].positions.length/3,0),s=new Float32Array(t*3),i=new Float32Array(t*3),r=new Float32Array(t*3),n=new Float32Array(t*3),o=new Float32Array(t*3),l=new Float32Array(t*3),h=new Float32Array(t),c=new Float32Array(t),u=[],d=new S,m=new S;let v=0;for(const f of a){const x=f.template[e],w=x.positions.length/3,y=f.transform.elements,g=new ee(e==="bark"?f.species==="palm"?"#897156":f.object.landscapeOrigin?"#66503a":"#594633":f.object.color);n.set(x.positions,v*3),h.fill(((f.object.treeSeed??7319)>>>0)*.013%(Math.PI*2),v,v+w),c.fill(f.species==="palm"?1.4:f.species==="pine"?.65:1,v,v+w);for(let b=0;b<w;b++){const M=b*3,_=(v+b)*3;d.fromArray(x.positions,M).applyMatrix4(f.transform),m.fromArray(x.normals,M).applyMatrix3(f.normal).normalize(),s[_]=d.x,s[_+1]=d.y,s[_+2]=d.z,i[_]=m.x,i[_+1]=m.y,i[_+2]=m.z,r[_]=g.r,r[_+1]=g.g,r[_+2]=g.b;for(let P=0;P<3;P++)o[_+P]=y[P],l[_+P]=y[8+P]}for(const b of x.indices)u.push(b+v);v+=w}const p=new ie;for(const[f,x,w]of[["position",s,3],["normal",i,3],["color",r,3],["treeLocal",n,3],["treeWindX",o,3],["treeWindZ",l,3],["treePhase",h,1],["treeFactor",c,1]])p.setAttribute(f,new te(x,w));return p.setIndex(u),p.computeBoundingSphere(),p.boundingSphere&&(p.boundingSphere.radius+=1),p}function Xo(a,e){const t=ar(a),s=a.filter(u=>u.kind==="tree"&&Ls(a,u.id).visible).map(u=>({...u,position:new S().setFromMatrixPosition(t.get(u.id)).toArray(),worldMatrix:t.get(u.id).elements})).slice(0,Re.maxTrees),i=new Fe,r=$o().map(u=>{const d=new ce(new ie,u);return d.castShadow=!0,d.receiveShadow=!0,i.add(d),d});let n=new Set,o=e.clone(),l=-1/0,h;function c(u){const d=s.map(p=>{const f=new C().fromArray(p.worldMatrix),x=p.treeSpecies??"broadleaf";return{object:p,species:x,transform:f,normal:new qe().getNormalMatrix(f),template:qo(x,p.treeSeed??7319,u.has(p.id),!!p.landscapeOrigin)}});let m=0,v=0;for(const[p,f]of["bark","foliage"].entries()){const x=jo(d,f);r[p].geometry.dispose(),r[p].geometry=x,r[p].visible=s.length>0,m+=x.getAttribute("position").count,v+=(x.index?.count??0)/3}n=u,h={sourceTrees:a.filter(p=>p.kind==="tree"&&Ls(a,p.id).visible).length,renderedTrees:s.length,highDetailTrees:u.size,lowDetailTrees:s.length-u.size,vertices:m,triangles:v,batches:s.length?2:0,cachedTemplates:Jt.size,policy:Re}}return c(Qi(s,e)),i.userData.treePreviewStats=()=>h,i.userData.updateTreeLOD=(u,d)=>{if(u-l<Re.lodCheckSeconds||d.distanceTo(o)<Re.lodMovementMetres)return;l=u,o.copy(d);const m=Qi(s,d,n);(m.size!==n.size||[...m].some(v=>!n.has(v)))&&c(m)},i}async function Yo(a){const e=await mn(a),t=()=>new Y({name:"builder-terrain",color:"#ffffff",roughness:.92,vertexColors:!0,side:"double",textures:e.textures,uniforms:e.uniforms,surface:e.surface}),s=a.terrainImagery,i=a.geography;if(!s||!i)return{material:t(),diagnostics:{imagery:!1,landscape:e.diagnostics},dispose:e.dispose};let r,n;try{if(s.crs!=="EPSG:27700"||i.crs!=="EPSG:27700")throw new Error("Imagery and terrain must use EPSG:27700.");const o=await fetch(s.dataUrl);if(n=await createImageBitmap(await o.blob(),{premultiplyAlpha:"none",colorSpaceConversion:"none"}),n.width>8192||n.height>8192||n.width*n.height>32e6)throw new Error("Terrain imagery exceeds the decoded image limit.");r=new W({label:"builder-terrain-imagery",width:n.width,height:n.height,format:"rgba8unorm-srgb",mips:!0,usage:["sample","copyDst"]}),z.queue.copyExternalImageToTexture({source:n},{texture:r.getGPU(),premultipliedAlpha:!1},[n.width,n.height]),wr(r);const l=s.bounds.west-i.center.easting,h=i.center.northing-s.bounds.north,c=s.bounds.east-s.bounds.west,u=s.bounds.north-s.bounds.south;return{material:new Y({name:"builder-geographic-terrain",color:"#ffffff",roughness:.92,vertexColors:!0,side:"double",textures:{terrainImagery:r,...e.textures},uniforms:{...e.uniforms,imageryRect:["vec4f",[l,h,c,u]]},surface:`
  let imageryUV=(in.P.xz-mat.imageryRect.xy)/mat.imageryRect.zw;
  let imageryDx=dpdx(imageryUV); let imageryDy=dpdy(imageryUV);
  if(all(imageryUV>=vec2f(0.0)) && all(imageryUV<=vec2f(1.0))) {
    let image=textureSampleGrad(terrainImagery,smpAnisoClamp,imageryUV,imageryDx,imageryDy);
    s.albedo=mix(s.albedo,image.rgb,image.a);
  }
`+e.surface}),diagnostics:{imagery:!0,landscape:e.diagnostics,pixels:[n.width,n.height],localBounds:{west:l,northZ:h,width:c,depth:u},sourceName:s.sourceName},dispose(){e.dispose();const m=()=>r.destroy();z.encoder?z.onSubmit(null,m):m()}}}catch(o){return r&&r.destroy(),{material:t(),diagnostics:{imagery:!1,landscape:e.diagnostics,error:o.message},dispose:e.dispose}}finally{n?.close()}}const Qe=(a,e,t)=>Math.max(e,Math.min(t,a)),Ji=new Set(["KeyW","KeyS","KeyA","KeyD","KeyQ","KeyE","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","ShiftLeft","ShiftRight"]);function Ko(a,e,t,s=2.2){if(![a.x,a.y,a.z,e.x,e.y,e.z,s].every(Number.isFinite)||s<0)throw new RangeError("Navigation sweep needs finite positions, motion and nonnegative clearance.");const i=new vt(a.x,a.y,a.z);i.y=Math.max(i.y,qt(t,i.x,i.z)+s);const r=[0,1],{resolution:n,width:o,depth:l}=t,h=(i.x/o+.5)*(n-1),c=(i.z/l+.5)*(n-1),u=e.x/o*(n-1),d=e.z/l*(n-1),m=(f,x,w)=>{if(Math.abs(x)<1e-12)return;const y=Math.max(0,Math.ceil(Math.min(f,f+x))),g=Math.min(w,Math.floor(Math.max(f,f+x)));for(let b=y;b<=g;b++){const M=(b-f)/x;M>0&&M<1&&r.push(M)}};m(h,u,n-1),m(c,d,n-1),m(h+c,u+d,2*(n-1)),r.sort((f,x)=>f-x);let v=0,p=i.y-qt(t,i.x,i.z)-s;for(const f of r){const x=i.x+e.x*f,w=i.y+e.y*f,y=i.z+e.z*f,g=w-qt(t,x,y)-s;if(g<-1e-8){const b=v+(f-v)*p/Math.max(1e-12,p-g),M=Math.max(0,b-1e-5/Math.max(1,e.length()));return{position:i.addScaledVector(e,M),blocked:!0}}v=f,p=Math.max(0,g)}return{position:i.add(e),blocked:!1}}class Zo{constructor(e,{clearance:t=2.2}={}){this.camera=e,this.minimumClearance=t,this.project=null,this.yaw=.4,this.pitch=-.15,this.velocity=new vt,this.keys=new Set,this.speedMultiplier=1,this.wheelRemaining=0,this.blocked=!1,this.collisions=0,this.speed=0,this.mode="overview",this.detach=null,this.projectIdentity="",this.camera.rotation.order="YXZ"}ground(e=this.camera.position.x,t=this.camera.position.z){return this.project?qt(this.project.terrain,e,t):0}get clearance(){return Math.max(0,this.camera.position.y-this.ground())}get baseSpeed(){return Qe(6+this.clearance*.65,8,180)}forward(){return new vt(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch))}setProject(e){const t=e.geography,s=JSON.stringify([e.metadata.worldId,e.terrain.width,e.terrain.depth,t?.center,t?.bounds]),i=s!==this.projectIdentity;this.project=e,this.projectIdentity=s,i&&this.overview()}setKey(e,t){Ji.has(e)&&(t?this.keys.add(e):this.keys.delete(e))}setSpeedMultiplier(e){Number.isFinite(e)&&e>=.25&&e<=8&&(this.speedMultiplier=e)}clearInput(){this.keys.clear(),this.velocity.set(0,0,0),this.wheelRemaining=0,this.speed=0}addWheel(e){if(!this.project||!Number.isFinite(e))return;const t=Qe(this.clearance*.004,.04,2)*this.speedMultiplier,s=Math.max(30,Math.max(this.project.terrain.width,this.project.terrain.depth)*.8);this.wheelRemaining=Qe(this.wheelRemaining-Qe(e,-1e3,1e3)*t,-s,s),this.mode="fly"}orient(){this.pitch=Qe(this.pitch,-1.52,1.52),this.camera.rotation.set(this.pitch,this.yaw,0),this.camera.updateMatrixWorld()}overview(){if(!this.project)return;this.clearInput();const e=this.project.terrain,t=e.heights.reduce((r,n)=>Math.max(r,n),-1/0),s=e.heights.reduce((r,n)=>r+n,0)/e.heights.length,i=Math.max(45,e.depth*.58);this.camera.position.set(0,t+Math.max(18,e.width*.3),i),this.yaw=0,this.pitch=-Math.atan2(this.camera.position.y-s,i),this.mode="overview",this.blocked=!1,this.orient()}returnToSpawn(){if(!this.project)return;this.clearInput();const{position:e,yaw:t}=this.project.spawn;this.camera.position.set(e[0],Math.max(e[1],this.ground(e[0],e[2]))+this.minimumClearance+.3,e[2]),this.yaw=t,this.pitch=-.08,this.mode="spawn",this.blocked=!1,this.orient()}recenter(){if(!this.project)return;this.clearInput();const e=Math.max(this.project.terrain.width,this.project.terrain.depth),t=Math.max(12,Math.min(180,e*.12)),s=this.ground(0,0),i=Math.max(12,Math.min(120,e*.08));this.camera.position.set(0,Math.max(s+i,this.ground(0,t)+this.minimumClearance),t),this.yaw=0,this.pitch=-Math.atan2(this.camera.position.y-s,t),this.mode="center",this.blocked=!1,this.orient()}command(e){e.action==="overview"?this.overview():e.action==="spawn"?this.returnToSpawn():e.action==="recenter"?this.recenter():e.action==="speed"?this.setSpeedMultiplier(e.value):e.action==="hold"?this.setKey(e.code,!0):e.action==="release"?this.setKey(e.code,!1):e.action==="stop"&&this.clearInput()}update(e){if(!this.project)return this.diagnostics();const t=Qe(Number.isFinite(e)?e:0,0,.1),s=(...f)=>f.some(x=>this.keys.has(x)),i=this.forward(),r=new vt(Math.cos(this.yaw),0,-Math.sin(this.yaw)),n=new vt().addScaledVector(i,Number(s("KeyW","ArrowUp"))-Number(s("KeyS","ArrowDown"))).addScaledVector(r,Number(s("KeyD","ArrowRight"))-Number(s("KeyA","ArrowLeft")));n.y+=Number(s("KeyE","Space"))-Number(s("KeyQ"));const o=n.lengthSq()>1e-10;o&&n.normalize();const l=s("ShiftLeft","ShiftRight")?3:1,h=n.multiplyScalar(Math.min(800,this.baseSpeed*this.speedMultiplier*l)),c=o?5:9,u=1-Math.exp(-c*t),d=h.clone().multiplyScalar(t).add(this.velocity.clone().sub(h).multiplyScalar(u/c));this.velocity.lerp(h,u);const m=this.wheelRemaining*(1-Math.exp(-7*t));this.wheelRemaining-=m,Math.abs(this.wheelRemaining)<.001&&(this.wheelRemaining=0),d.addScaledVector(i,m);const v=new vt(this.camera.position.x,this.camera.position.y,this.camera.position.z),p=Ko(v,d,this.project.terrain,this.minimumClearance);return this.camera.position.copy(p.position),this.blocked=p.blocked,p.blocked&&(this.velocity.set(0,0,0),this.wheelRemaining=0,this.collisions++),(o||Math.abs(m)>.001)&&(this.mode="fly"),this.speed=t>0?v.distanceTo(p.position)/t:0,this.orient(),this.diagnostics()}diagnostics(){return{clearance:this.clearance,baseSpeed:this.baseSpeed,speedMultiplier:this.speedMultiplier,speed:this.speed,blocked:this.blocked,collisions:this.collisions,mode:this.mode,yaw:this.yaw,pitch:this.pitch,wheelRemaining:this.wheelRemaining,keys:[...this.keys]}}attach(e,t=window){this.detach?.(),e.tabIndex=0;let s=null,i=0,r=0;const n=f=>{f.button===0&&(s=f.pointerId,i=f.clientX,r=f.clientY,e.setPointerCapture(s),e.focus())},o=f=>{s===f.pointerId&&(this.yaw-=(f.clientX-i)*.004,this.pitch=Qe(this.pitch-(f.clientY-r)*.004,-1.52,1.52),i=f.clientX,r=f.clientY)},l=f=>{s===f.pointerId&&(s=null,e.hasPointerCapture(f.pointerId)&&e.releasePointerCapture(f.pointerId))},h=()=>{const f=s;s=null,f!==null&&e.hasPointerCapture(f)&&e.releasePointerCapture(f),this.clearInput()},c=()=>{s!==null&&h()},u=f=>{f.preventDefault(),e.focus(),this.addWheel(f.deltaY*(f.deltaMode===1?16:f.deltaMode===2?e.clientHeight:1))},d=f=>{!Ji.has(f.code)||f.ctrlKey||f.metaKey||f.altKey||(this.setKey(f.code,!0),f.preventDefault())},m=f=>this.setKey(f.code,!1),v=()=>{e.ownerDocument.hidden&&h()},p=[[e,"pointerdown",n],[e,"pointermove",o],[e,"pointerup",l],[e,"pointercancel",h],[e,"lostpointercapture",c],[e,"wheel",u],[t,"keydown",d],[t,"keyup",m],[t,"blur",h],[e.ownerDocument,"visibilitychange",v]];for(const[f,x,w]of p)f.addEventListener(x,w,x==="wheel"?{passive:!1}:void 0);return this.detach=()=>{for(const[f,x,w]of p)f.removeEventListener(x,w);h()},this.detach}dispose(){this.detach?.(),this.detach=null,this.clearInput()}}const Qo=document.querySelector("#status");let q,D,_e,yt,Je,er,pt,mt,he,fe,ks,Cs,Ve,tr=0,st,sr=0,Or={},Ur=0,Wr=[],Vr={imagery:!1};const rs=a=>{Qo.textContent=a},Ge=(a,e={})=>parent.postMessage({type:a,...e},location.origin),et=a=>{const e=new ie;for(const t of["position","normal","uv","color"]){const s=a.getAttribute(t);if(!s)continue;const i=new Float32Array(s.count*s.itemSize);for(let r=0;r<s.count;r++)for(let n=0;n<s.itemSize;n++)i[r*s.itemSize+n]=s.getComponent(r,n);e.setAttribute(t,new te(i,s.itemSize))}return a.index&&e.setIndex(Array.from(a.index.array)),e.getAttribute("normal")||e.computeVertexNormals(),e},Jo=(a,e,t=!1)=>new ce(et(a),new Y({color:e,roughness:.85,vertexColors:t,side:"double"}));function $t(a,e,t,s=[0,0,0],i=[0,0,0]){const r=Jo(e,t);r.position.fromArray(s),r.rotation.set(...i),a.add(r)}function Ds(a){const e=new Set,t=new Set;a.traverse(s=>{s.geometry&&t.add(s.geometry),s.material&&e.add(s.material),s.userData.disposeAssetTextures?.(),s.userData.disposeTerrainImagery?.(),s.userData.disposeLandscape?.()}),t.forEach(s=>s.dispose()),e.forEach(s=>{s.userData.sharedBuilderTreeMaterial||s.dispose()})}async function el(a){const e=++tr,t=new Fe,{width:s,depth:i,resolution:r,heights:n,materials:o}=a.terrain,l=[],h=[],c=[],u=[[.38,.49,.32],[.54,.39,.27],[.48,.5,.48],[.7,.63,.43]];for(let g=0;g<r;g++)for(let b=0;b<r;b++){const M=g*r+b,_=n[M],P=Math.max(.68,Math.min(1.22,.88+_/55));l.push(b*s/(r-1)-s/2,_,g*i/(r-1)-i/2),h.push(...u[o[M]].map(T=>T*P)),b<r-1&&g<r-1&&c.push(M,M+r,M+1,M+1,M+r,M+r+1)}const d=new ca;d.setAttribute("position",new Qs(l,3)),d.setAttribute("color",new Qs(h,3)),d.setIndex(c),d.computeVertexNormals();const m=await Yo(a),v=new ce(et(d),m.material);d.dispose(),v.userData.disposeTerrainImagery=m.dispose,t.add(v);let p=0;const f=[],x=ar(a.objects);for(const g of a.objects.filter(b=>Ls(a.objects,b.id).visible)){if(g.kind==="tree"||g.kind==="group"||g.collisionOnly)continue;const b=new Fe;b.userData.editorObjectId=g.id,b.matrixAutoUpdate=!1,b.matrix.fromArray(x.get(g.id).elements);const M=g.color;if(g.kind==="computer"){const _=ua();b.userData.computerParts=[];for(const P of _.parts){const T=P.emissive?g.computer.screenColor:P.color,A=new Y({name:"computer-"+P.name,color:T,emissive:P.emissive?T:"#000000",roughness:.45,side:"double"});P.emissive&&A.emissive.multiplyScalar(.15),b.add(new ce(et(P.geometry),A)),b.userData.computerParts.push({name:P.name,vertices:P.geometry.getAttribute("position").count,emissive:A.emissive.toArray()})}da(_)}else if(g.kind==="neon-sign"){const _=Vo(g.neon,et);_.userData.neonObjectId=g.id,b.add(_)}else if(g.kind==="glb")try{const _=a.assets.find(A=>A.id===g.assetId);if(!_)throw new Error("Referenced GLB asset is missing.");const P=await fetch(_.dataUrl);if(!P.ok)throw new Error(`GLB could not be read (${P.status}).`);const T=await ir(await P.arrayBuffer());try{const A=Sr(T,g,et);b.add(A.group),f.push({objectId:g.id,assetId:_.id,...A.diagnostics}),p+=A.diagnostics.warnings.length}finally{rr(T.scene)}}catch(_){$t(b,new hs(1.6,1.6,1.6),"#cf6858"),p++,f.push({objectId:g.id,assetId:g.assetId,error:_.message,primitives:[],warnings:[_.message]})}else if(g.kind==="building")$t(b,new hs(3.6,2.2,3),M,[0,1.1,0]),$t(b,new Js(2.7,1.1,4),"#574e42",[0,2.55,0],[0,Math.PI/4,0]);else{const _=g.kind==="sphere"?new fa(.8,32,24):g.kind==="cylinder"?new pa(.65,.65,1.6,32):g.kind==="cone"?new Js(.8,1.6,32):new hs(1.6,1.6,1.6);$t(b,_,M)}t.add(b)}const w=Xo(a.objects,D.camera.position);t.add(w),t.add(Go(a,et));let y;try{y=await vn(a,et)}catch(g){throw Ds(t),g}if(t.add(y),t.userData.landscapeStats=y.userData.landscapeStats,e!==tr){Ds(t);return}fe&&(D.scene.remove(fe),Ds(fe)),fe=t,Ve=w,D.scene.add(fe),Ge("elsemesh-native-quality",{trees:Ve.userData.treePreviewStats(),renderPixels:D.width*D.height}),Wr=f,Vr=m.diagnostics,he.uniforms.fields.base.value=Oo(a.terrain),rs(`ElseMesh WebGPU · drag to look · wheel zoom · WASD fly where you look · Q/E down/up · Shift boost${p?` · ${p} GLB shading limitation(s); see preview notes`:""}${m.diagnostics.error?` · Imagery fallback: ${m.diagnostics.error}`:""}`)}function tl(){const a=q.environment;Je.coverage.value=a.cloudCoverage??.49,H.windSpeed.value=a.windSpeed??6,he.uniforms.fields.storm.value=a.weather==="storm"?1:0,he.uniforms.fields.density.value=a.mistDensity??.004,he.uniforms.fields.speed.value=a.mistSpeed??2,he.uniforms.fields.height.value=a.mistHeight??9;const e=ho(a.timeOfDay??14).applyAxisAngle(new S(0,1,0),a.sunAzimuth);_e.sunDir.value.copy(e);const t=He.smoothstep(-e.y,.02,.18);H.night.value=t,yt.starIntensity.value=t;const s=new S(-e.x,Math.abs(e.y)*.8+.25,-e.z).normalize();yt.moonDir.value.copy(s),H.sunDir.value.copy(e.y>-.07?e:s)}async function sl(){if(D=new $n(document.querySelector("#native-root")),D.maxOutputPixels=1e6,await D.init(),z.limits.maxStorageTexturesPerShaderStage<5)throw new Error(`Native sky preview requires 5 storage textures per shader stage; this adapter supports ${z.limits.maxStorageTexturesPerShaderStage}. Use the editor WebGL preview on this device.`);D.meshRenderer.syncPipelines=!0,_e=new oo(D),yt=new lo(_e),Je=new xo(D,_e),await Je.ready,yt.clouds=Je,er=new yo(D,D.scene,yt,128),ks=new to({size:1024}),Cs=new Wo,D.scene.add(Cs.group),mt=new Zn(D.meshRenderer,D.scene,D.camera),mt.background=yt.background,mt.waterMaterial={needsSSRDepth:!1},he=Uo(mt.sceneRT.depthTexture),pt=new No(D,{sceneRenderer:mt,camera:D.camera,underwater:he,clouds:Je}),pt.motionBlur.strength&&(pt.motionBlur.strength.value=0),st=new Zo(D.camera),st.attach(D.canvas),D.start((a,e)=>{if(q)try{z.beginFrame(),H.time.value=e,H.dt.value=a,H.exposure.value=.55;const t=st.update(a);e>=sr&&(Ge("elsemesh-native-navigation-state",{navigation:t}),sr=e+.25),fe?.traverse(l=>l.userData.updateLandscape?.(e));const s=Ve?.userData.treePreviewStats();Ve?.userData.updateTreeLOD(e,D.camera.position),Ve&&Ve.userData.treePreviewStats()!==s&&Ge("elsemesh-native-quality",{trees:Ve.userData.treePreviewStats(),renderPixels:D.width*D.height});const i=Cs.update(e,D.camera,st.yaw,q.environment,l=>Ge("elsemesh-native-thunder",{event:l}));if(he.uniforms.fields.lightning.value=i.flash,fe?.traverse(l=>{if(!l.userData.updateNeon)return;const h=Or[l.userData.neonObjectId],c=Number.isFinite(h?.effectStartMs)?Math.max(0,(Date.now()+Ur-h.effectStartMs)/1e3):e;l.userData.updateNeon(c,q.environment.timeOfDay??14,h?.powered)}),tl(),_e.update(a,D.camera.position.y),_e.sunTransmittance){const l=_e.sunDir.value,h=_e.sunTransmittance;l.y>-.07?H.sunColor.value.setRGB(...h).multiplyScalar(Kt*He.smoothstep(l.y,-.03,.02)):H.sunColor.value.setRGB(.6,.7,1).multiplyScalar(.12*H.night.value);const c=_e.skyIrradiance,u=.012*H.night.value;H.skyIrradiance.value.setRGB(c[0]+u*.6,c[1]+u*.7,c[2]+u),H.horizonColor.value.setRGB(..._e.horizon)}Je.update(a,D.camera),er.update(a),pt.beginFrame(),ks.render(D.scene,D.meshRenderer,ks.update(D.camera,H.sunDir.value)),mt.render(),pt.render(),pt.endFrame(),z.submit();const r=[];fe?.traverse(l=>{l.userData.computerParts&&r.push({id:l.userData.editorObjectId,parts:l.userData.computerParts})});const n=[];fe?.traverse(l=>{l.userData.neonState&&n.push(l.userData.neonState)});const o={};fe?.traverse(l=>{l.userData.editorObjectId&&(o[l.userData.editorObjectId]=Array.from(l.matrixWorld.elements))}),window.__nativePreview={computers:r,neons:n,hierarchyMatrices:o,frames:D.frame,time:e,objects:q.objects.length,features:q.features?.length??0,settings:q.environment,effectUniforms:{cloudCoverage:Je.coverage.value,mistBase:he.uniforms.fields.base.value,mistDensity:he.uniforms.fields.density.value,mistHeight:he.uniforms.fields.height.value,mistSpeed:he.uniforms.fields.speed.value},weather:i,assets:Wr,terrain:Vr,landscape:fe?.userData.landscapeStats,camera:D.camera.position.toArray(),navigation:t,trees:Ve?.userData.treePreviewStats(),renderPixels:D.width*D.height},D.frame===2&&Ge("elsemesh-native-rendered")}catch(t){D.stop(),rs(`Native preview failed: ${t.message}`),console.error(t),Ge("elsemesh-native-error",{message:t.message})}}),Ge("elsemesh-native-ready")}window.addEventListener("message",a=>{if(a.origin!==location.origin||a.source!==parent)return;if(a.data?.type==="elsemesh-native-neon-runtime"){Or=a.data.states??{},Ur=Number.isFinite(a.data.serverOffsetMs)?a.data.serverOffsetMs:0;return}if(a.data?.type==="elsemesh-native-navigation"){st?.command(a.data),["overview","spawn","recenter"].includes(a.data.action)&&D?.canvas.focus();return}if(a.data?.type!=="elsemesh-native-project")return;const e=a.data.project,t=!q||JSON.stringify([q.terrain,q.objects,q.assets,q.features,q.geography,q.terrainImagery,q.landscape])!==JSON.stringify([e.terrain,e.objects,e.assets,e.features,e.geography,e.terrainImagery,e.landscape]);st?.setProject(e),q=e,t&&el(q).catch(s=>rs(`Scene import failed: ${s.message}`))});window.addEventListener("pagehide",()=>{st?.dispose(),D?.stop(),z.device?.destroy()});sl().catch(a=>{rs(a.message),Ge("elsemesh-native-error",{message:a.message}),console.error(a)});
