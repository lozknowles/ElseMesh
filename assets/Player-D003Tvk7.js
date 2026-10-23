import{a as e,t}from"./GPU-B8NOtGQD.js";import{C as n,E as r,S as i,_ as a,d as o,g as s,i as c,l,s as u,t as d,u as f,v as p,w as m,x as h}from"./Uniforms-DpskR0Rb.js";import{A as g,M as _,N as v,_ as y,b,c as x,d as S,f as C,g as w,h as T,i as E,k as ee,l as te,n as ne,o as re,p as ie,r as ae,s as oe,t as se,u as ce,v as D,x as O,y as le}from"./engine-1L8TIgYO.js";import{n as k,r as A,t as j}from"./Texture-DGA3l8UD.js";import{a as ue,c as de,d as fe,i as pe,l as me,n as he,o as M,r as ge,s as _e,t as ve,u as ye}from"./Frame-DsgVHJU6.js";import{$ as be,B as xe,D as Se,E as Ce,J as we,O as Te,Q as Ee,V as De,W as Oe,X as ke,Z as Ae,_ as je,a as Me,b as Ne,c as Pe,d as Fe,f as Ie,i as Le,k as Re,m as ze,t as Be,u as Ve,w as He,x as Ue,y as We}from"./RepositoryWater-y4N6gdZa.js";import{i as Ge,n as Ke,o as qe,r as Je}from"./AvatarChooser-Crt_YzfL.js";var N=new M({name:`common`,code:`
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
`}),Ye={hooks:{},version:0,set(e,t){this.hooks[e]=t,this.version++},modules(){return Object.values(this.hooks).filter(Boolean)}},Xe={directModulation:`fn hookDirectModulation( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 1.0 ); }`,ambientModulation:`fn hookAmbientModulation( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 1.0 ); }`,shadowPosition:`fn hookShadowPosition( P: vec3f, N: vec3f, pixel: vec2f ) -> vec3f { return P; }`,bounce:`fn hookBounce( P: vec3f, N: vec3f ) -> vec3f { return vec3f( 0.0 ); }`,localLights:`fn hookLocalLights( s: Surface, P: vec3f, N: vec3f, V: vec3f, acc: ptr<function, LightAccum> ) {}`,envSpecular:`fn hookEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f { let t = sat( R.y * 0.5 + 0.5 ); return mix( frame.horizonColor * 0.6, frame.skyIrradiance * PI, t ) * frame.envIntensity; }`,envDiffuse:`fn hookEnvDiffuse( N: vec3f ) -> vec3f { return mix( frame.horizonColor * 0.25, frame.skyIrradiance, N.y * 0.5 + 0.5 ) * frame.envIntensity; }`};function Ze(){let e=[];for(let t in Xe){let n=Ye.hooks[t];n?e.push(n):e.push($e(t))}return e}var Qe={};function $e(e){return Qe[e]||(Qe[e]=new M({name:`hook-`+e+`-default`,deps:[it],code:Xe[e]}))}var et=new d(`SunShadow`,{matrices:[`mat4x4f[4]`,[new p,new p,new p,new p]],cascades:[`vec4f[4]`,[new h,new h,new h,new h]],count:[`u32`,0],mapSize:[`f32`,2048],bias:[`f32`,2e-5],fade:[`f32`,1],pcssCascades:[`u32`,1],sunAngularDiameter:[`f32`,.00925],enabled:[`f32`,0],pad:[`f32`,0],blend:[`vec4f[4]`,[new h,new h,new h,new h]]}),tt=null;function nt(e){tt=e}var rt=new M({name:`sunShadow`,deps:[N],uniforms:et,uniformName:`shadowParams`,bindings:{sunShadowMap:{texture:()=>tt,viewDimension:`2d-array`}},code:`
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
`}),it=new M({name:`surface`,deps:[N],code:`
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
`}),at=new M({name:`lighting`,deps:[N,it,rt],code:`
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
`}),ot=[];for(let e=0;e<8;e++)ot.push(new i);var st=new i,ct=new i(0,1,0),lt=new p,ut=new i,dt=new h,ft=class{constructor({size:e=2048,splits:t=[10,60,400],lightMargin:n=200,normalBias:r=[.015,.06,.3],bias:a=2e-5,pcssCascades:o=1}={}){this.size=e,this.splits=t,this.count=t.length,this.lightMargin=n,this.normalBias=r,this.periods=t.map((e,t)=>t===0?1:t===1?2:4),this.texture=new A({label:`sunShadowMap`,width:e,height:e,depth:this.count,dimension:`2d-array`,format:`depth32float`,usage:[`sample`,`render`]}),nt(this.texture),this.cascades=t.map((e,t)=>({camera:{matrixWorld:new p,matrixWorldInverse:new p,projectionMatrix:new p,near:0,far:1,reversedDepth:!1,updateMatrixWorld(){},isCamera:!0,isShadowCamera:!0},block:pe(`shadowView`+t),viewProj:new p,radius:0,dirty:!0})),this.enabled=!0,this.layerMask=4294967295,this.frame=0,this.lastSun=new i(0,-2,0);let s=et.fields;s.count.value=this.count,s.mapSize.value=e,s.bias.value=a,s.pcssCascades.value=o,s.enabled.value=1}_margin(e){let t=this.splits[this.count-1],n=e/t;return Math.max(.25*n*n,.25*n)*t}_fit(e,t,n){let r=this.cascades[e],a=e===0?0:this.splits[e-1],o=this.splits[e],s=this._margin(a),c=this._margin(o),l=Math.max(t.near,a-s*.5),u=e===this.count-1?o:o+c*.5;et.fields.blend.value[e]=new h(a,o,s,c);let d=Math.tan(t.fov*Math.PI/360),f=d*t.aspect,p=0;for(let e of[l,u])for(let n of[-1,1])for(let r of[-1,1])ot[p++].set(n*f*e,r*d*e,-e).applyMatrix4(t.matrixWorld);let m=Math.min(u,(l+u)/2*(1+f*f+d*d));st.set(0,0,-m).applyMatrix4(t.matrixWorld);let g=0;for(let e of ot)g=Math.max(g,e.distanceTo(st));g=Math.ceil(g*16)/16,r.radius=g;let _=r.camera,v=n,y=Math.abs(v.y)>.99?ut.set(1,0,0):ct;_.matrixWorld.lookAt(v,new i(0,0,0),y),lt.copy(_.matrixWorld).invert();let b=2*g/this.size,x=dt.set(st.x,st.y,st.z,1).applyMatrix4(lt);x.x=Math.round(x.x/b)*b,x.y=Math.round(x.y/b)*b;let S=g+this.lightMargin,C=new i(x.x,x.y,x.z+S).applyMatrix4(_.matrixWorld);_.matrixWorld.setPosition(C),_.matrixWorldInverse.copy(_.matrixWorld).invert();let w=.1,T=S+g;_.near=w,_.far=T,pt(_.projectionMatrix,-g,g,g,-g,w,T),r.viewProj.multiplyMatrices(_.projectionMatrix,_.matrixWorldInverse);let E=et.fields;E.matrices.value[e]=r.viewProj.clone(),E.cascades.value[e]=new h(u,b,this.normalBias[e]??.05,T-w)}update(e,t){if(this.frame++,et.fields.enabled.value=this.enabled&&t.y>-.05?1:0,!this.enabled)return[];e.updateMatrixWorld();let n=this.lastSun.angleTo(t)>1e-4;this.lastSun.copy(t);let r=[];for(let i=0;i<this.count;i++)(n||this.cascades[i].dirty||(this.frame+i)%this.periods[i]===0)&&(this._fit(i,e,t),this.cascades[i].dirty=!1,r.push(i));return r}render(e,t,n){for(let r of n){let n=this.cascades[r];ue(n.camera,this.size,this.size,{block:n.block}),t.render(e,{label:`shadow cascade `+r,kind:`depth`,camera:n.camera,frameBlock:n.block,depthView:this.texture.view({dimension:`2d`,baseArrayLayer:r,arrayLayerCount:1}),depthFormat:`depth32float`,clearDepth:1,depthCompare:`less-equal`,layerMask:this.layerMask,depthBias:2,depthBiasSlopeScale:1.5})}}};function pt(e,t,n,r,i,a,o){let s=1/(n-t),c=1/(r-i),l=1/(o-a);return e.set(2*s,0,0,-(n+t)*s,0,2*c,0,-(r+i)*c,0,0,-l,-a*l,0,0,0,1),e}var mt=class{constructor(){this.sample={wallDt:0,valid:!1,reset:!0},this.invalidate()}invalidate(){this.previous=null}update(e,t=!1){let n=this.sample;if(n.wallDt=0,n.valid=!1,n.reset=!0,t||!Number.isFinite(e))return this.invalidate(),n;let r=this.previous;return this.previous=e,r===null||e<=r||(n.wallDt=(e-r)/1e3,n.valid=!0,n.reset=!1),n}},ht=class{constructor(e=.5){this.windowSeconds=e,this.reset()}reset(){this.elapsed=0,this.frames=0,this.worst=0}update(e){if(!Number.isFinite(e)||e<=0||(this.elapsed+=e,this.frames++,this.worst=Math.max(this.worst,e),this.elapsed<this.windowSeconds))return null;let t={fps:this.frames/this.elapsed,meanMs:1e3*this.elapsed/this.frames,worstMs:1e3*this.worst,frames:this.frames,elapsed:this.elapsed};return this.reset(),t}},gt={position:`vec3f`,normal:`vec3f`,uv:`vec2f`,color:`vec4f`},_t={normal:`vec3f( 0.0, 1.0, 0.0 )`,uv:`vec2f( 0.0 )`,color:`vec4f( 1.0 )`},vt=/^(u32|i32|vec[234][ui])$/;function yt(e){return e===`f32`?`0.0`:e===`u32`?`0u`:e===`i32`?`0i`:`${e}()`}function bt(e,n,r){let i=r.kind,a=new Set(n.map(e=>e.name)),o=e.allDefines();o.PASS_MAIN=+(i===`main`),o.PASS_DEPTH=+(i===`depth`),o.PASS_COLOR=+(i===`color`),o.PASS_LATE=+!!r.late,o.LIT=+!!e.lit,o.INSTANCED=+!!a.has(`instanceMatrix0`),o.INSTANCE_COLOR=+!!a.has(`instanceColor`),Object.assign(o,r.defines||{}),o.CLIP_DISTANCES=(o.REFRACTION_CLIP||o.PORTAL_CLIP)&&t.features.has(`clip-distances`)?1:0;let s=`struct VertexIn {
`;for(let e of n)s+=`\t@location( ${e.location} ) ${e.name}: ${e.wgsl},\n`;s+=`	@builtin( instance_index ) instance: u32,
	@builtin( vertex_index ) vertex: u32,
};
`;let c=`struct VertexData {
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
`;for(let t in e.attributes)c+=`\t${t}: ${e.attributes[t]},\n`;c+=`};
`;let l=i===`main`,u=0,d=`struct VSOut {
	@builtin( position ) clip: vec4f,
`;d+=`\t@location( ${u++} ) worldPos: vec3f,\n`,d+=`\t@location( ${u++} ) normal: vec3f,\n`,d+=`\t@location( ${u++} ) uv: vec2f,\n`,d+=`\t@location( ${u++} ) color: vec4f,\n`,l&&(d+=`\t@location( ${u++} ) curClip: vec4f,\n`,d+=`\t@location( ${u++} ) prevClip: vec4f,\n`);for(let t in e.varyings){let n=e.varyings[t];d+=`\t@location( ${u++} )${vt.test(n)?` @interpolate( flat )`:``} ${t}: ${n},\n`}if(d+=`};
`,o.CLIP_DISTANCES){let e=[...d.matchAll(/\s(\w+): [^,]+,\n/g)].map(e=>e[1]);d+=d.replace(`struct VSOut {`,`struct VSOutClip {`).replace(/};\n$/,`	@builtin( clip_distances ) clipDistances: array<f32, 1>,
};
`),d+=`fn vsClip( o: VSOut, d: f32 ) -> VSOutClip {\n\tvar c: VSOutClip;\n${e.map(e=>`\tc.${e} = o.${e};\n`).join(``)}\tc.clipDistances[ 0 ] = d;\n\treturn c;\n}\n`}let f=``;for(let e in gt)if(a.has(e)){let t=n.find(t=>t.name===e);e===`color`&&t.wgsl===`vec3f`?f+=`	v.color = vec4f( i.color, 1.0 );
`:f+=`\tv.${e} = i.${e};\n`}else e!==`position`&&(f+=`\tv.${e} = ${_t[e]};\n`);for(let t in e.attributes)f+=a.has(t)?`\tv.${t} = i.${t};\n`:`\tv.${t} = ${yt(e.attributes[t])};\n`;let p=`
struct Draw {
	model: mat4x4f,
	prevModel: mat4x4f,
	params: vec4f,  // x: object id, y: user, z: user, w: user
	params2: vec4f,
};
@group( 2 ) @binding( 0 ) var<uniform> draw: Draw;

${s}
${c}
${d}

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
${e.vertex}
}

fn materialSurface( in: FragInput, s: ptr<function, Surface> ) {
${e.surface}
}

fn materialOutput( in: FragInput, s: Surface, r: ptr<function, FragResult> ) {
${e.output}
}

#if CLIP_DISTANCES
@vertex fn vs( i: VertexIn ) -> VSOutClip {
#else
@vertex fn vs( i: VertexIn ) -> VSOut {
#endif
	var v: VertexData;
${f}#if !HAS_POSITION
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
	#if PORTAL_CLIP
	return vsClip( o, dot( frame.portalClipPlane, vec4f( wp, 1.0 ) ) );
#else
	return vsClip( o, frame.seaLevel + REFRACTION_CLIP_MARGIN - wp.y );
#endif
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
#if PORTAL_CLIP && !CLIP_DISTANCES
	if ( dot( frame.portalClipPlane, vec4f( in.P, 1.0 ) ) < 0.0 ) { discard; }
#endif
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
`,m=e.shadow?`fn materialShadow( in: FragInput ) -> bool {\n${e.shadow}\n}\n`:``;o.HAS_SHADOW_HOOK=+!!e.shadow,o.NEEDS_DEPTH_FRAGMENT=i===`depth`&&(e.alphaTest>0||e.shadow)?1:0,o.HAS_POSITION=+!!a.has(`position`);let h=p.replace(`fn fragInput(`,m+`fn fragInput(`).replace(/\bTRANSPARENT_F\b/g,e.transparent?`true`:`false`).replace(/\bVELOCITY_WEIGHT\b/g,xt(e.velocityWeight)).replace(/\bREFRACTION_CLIP_MARGIN\b/g,xt((r.defines&&r.defines.REFRACTION_CLIP_MARGIN)??0)),g=[N,it,...e.modules];return(i!==`depth`||_e(e.modules).includes(at))&&(g=[N,it,...Ze(),at,...e.modules]),e.lightingHooks===!1&&!_e(e.modules).includes(at)&&(g=[N,it,rt,...e.modules]),{code:h,modules:g,defines:o,bindings:{mat:{uniform:e.uniformBlock},...e.bindings},hasFragment:i!==`depth`||o.NEEDS_DEPTH_FRAGMENT===1}}function xt(e){let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`}var St=class{constructor(){this.free=[]}acquire(){return this.free.pop()||{opaque:[],transparent:[],records:[],used:0}}release(e){for(let t=0;t<e.used;t++){let n=e.records[t];n.object=n.geometry=n.material=null}e.used=0,e.opaque.length=e.transparent.length=0,this.free.push(e)}},Ct=(e,t)=>e.renderOrder-t.renderOrder||e.pipeKey-t.pipeKey||e.z-t.z,wt=(e,t)=>e.renderOrder-t.renderOrder||t.z-e.z,Tt=(e,t)=>e.depthBucket-t.depthBucket||e.pipeKey-t.pipeKey||e.z-t.z,Et=0,Dt=256,Ot=class{constructor(){this.pipelines=new Map,this._layouts=new WeakMap,this._materialOwners=new WeakMap,this.geometries=new WeakMap,this.capacity=8192,this.drawBuffer=null,this.drawData=null,this.drawCount=0,this.frame=-1,this.stats={draws:0,triangles:0,pipelines:0},this.optimizeSceneTransforms=!0,this._sceneTransformScopes=new WeakMap,this.optimizeSceneSubmission=!0,this.optimizeOpaqueDepthSort=!1,this.submissionStats={listLeases:0,drawRecordAllocations:0,pipelineBinds:0,vertexBindsSkipped:0,indexBindsSkipped:0,drawBindsSkipped:0},this._drawListPool=new St,this._collectionStates=[],this._collectionDepth=0,this._submissionStates=[],this._submissionDepth=0,this.drawLayout=null,this.drawBindGroup=null,this.syncPipelines=!0}_ensureDrawBuffer(){this.drawBuffer&&this.drawData.byteLength>=this.capacity*Dt||(this.drawBuffer&&this.drawBuffer.destroy(),this.drawBuffer=t.device.createBuffer({label:`draws`,size:this.capacity*Dt,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.drawData=new Float32Array(this.capacity*Dt/4),this.drawLayout=ye([{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`,hasDynamicOffset:!0,minBindingSize:160}}],`draw`),this.drawBindGroup=t.device.createBindGroup({label:`draws`,layout:this.drawLayout,entries:[{binding:0,resource:{buffer:this.drawBuffer,size:160}}]}))}_beginFrame(){this.frame!==t.frame&&(this.frame=t.frame,this._ensureDrawBuffer(),this.drawCount>this.capacity*.75&&(this.capacity*=2,this._ensureDrawBuffer()),this.drawCount=0,t.onSubmit(()=>{this.drawCount&&t.queue.writeBuffer(this.drawBuffer,0,this.drawData.buffer,0,this.drawCount*Dt)}),this.stats.draws=0,this.stats.triangles=0)}_slot(e){let n=e.__draw;if(n||=e.__draw={frame:-1,slot:0,cur:new Float32Array(16),prev:new Float32Array(16),has:!1},n.frame===t.frame)return n.slot;if(this.drawCount>=this.capacity)throw Error(`MeshRenderer: draw buffer full`);n.frame=t.frame,n.slot=this.drawCount++;let r=e.matrixWorld.elements;n.has&&!e.resetVelocity?n.prev.set(n.cur):n.prev.set(r),n.cur.set(r),n.has=!0,e.resetVelocity=!1;let i=n.slot*Dt/4,a=this.drawData;a.set(n.cur,i),a.set(e.staticVelocity?n.cur:n.prev,i+16);let o=e.drawParams;if(a[i+32]=e.id??0,a[i+33]=o?o[0]:0,a[i+34]=o?o[1]:0,a[i+35]=o?o[2]:0,o&&o.length>3)for(let e=0;e<4;e++)a[i+36+e]=o[3+e]??0;return n.slot}_geometryGPU(e){let t=this.geometries.get(e);return t||(t={buffers:new Map,index:null,indexVersion:-1},this.geometries.set(e,t),e.addEventListener&&e.addEventListener(`dispose`,()=>{for(let e of t.buffers.values())e.buffer.destroy();t.index&&t.index.buffer.destroy(),this.geometries.delete(e)})),t}_attributeBuffer(e,n){let r=this._geometryGPU(e),i=n.isInterleavedBufferAttribute?n.data:n;if(i.gpuBuffer)return i.gpuBuffer.getGPU?i.gpuBuffer.getGPU():i.gpuBuffer;let a=r.buffers.get(i),o=i.version??0;if(a&&a.version===o&&a.array===i.array)return a.buffer;let s=Mt(n);if((!a||a.size<s.byteLength)&&(a&&a.buffer.destroy(),a={buffer:t.device.createBuffer({label:n.name||`attribute`,size:Math.max(16,kt(s.byteLength)),usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),size:s.byteLength,version:-1},r.buffers.set(i,a)),a.version!==o){let e=i.updateRanges&&i.updateRanges.length&&a.version>=0?i.updateRanges:null;if(e&&s.array===i.array){let n=i.array.BYTES_PER_ELEMENT;for(let r of e)t.queue.writeBuffer(a.buffer,r.start*n,i.array.buffer,i.array.byteOffset+r.start*n,kt(r.count*n));i.clearUpdateRanges?i.clearUpdateRanges():i.updateRanges.length=0}else At(a.buffer,s);a.version=o}return a.array=i.array,a.buffer}_indexBuffer(e){let n=e.index;if(!n)return null;let r=this._geometryGPU(e);if(r.indexRef&&r.indexSrc===n.array&&r.indexVersion===(n.version??0))return r.indexRef;let i=n.array instanceof Uint16Array||n.array instanceof Uint32Array?n.array:new Uint32Array(n.array);return(!r.index||r.index.size<i.byteLength)&&(r.index&&r.index.buffer.destroy(),r.index={buffer:t.device.createBuffer({label:`index`,size:Math.max(16,kt(i.byteLength)),usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),size:i.byteLength},r.indexVersion=-1),r.indexVersion!==(n.version??0)&&(At(r.index.buffer,i),r.indexVersion=n.version??0),r.indexSrc=n.array,r.indexRef={buffer:r.index.buffer,format:i instanceof Uint16Array?`uint16`:`uint32`},r.indexRef}_materialOwner(e){let t=this._materialOwners.get(e);if(t||(t={disposed:!1,pipelines:new Map,layouts:new Set},this._materialOwners.set(e,t),e.addEventListener?.(`dispose`,()=>{if(!t.disposed){t.disposed=!0;for(let[e,n]of t.pipelines)this.pipelines.get(e)===n&&this.pipelines.delete(e);for(let e of t.layouts)e.vl.pipelines.clear(),e.byMat.get(e.key)===e.value&&e.byMat.delete(e.key);t.pipelines.clear(),t.layouts.clear(),this.stats.pipelines=this.pipelines.size}})),t.disposed)throw Error(`Disposed material cannot create renderer resources`);return t}_cachedLayout(e,t,n){let r=this._materialOwner(n),i=this._layouts.get(t);i||this._layouts.set(t,i=new Map);let a=e.isInstancedMesh?e.instanceColor?2:1:0,o=a?n.id+`:`+a:n.id,s=i.get(o);if(s&&s.version===n.version&&s.attrsVersion===t.attributesVersion&&(!a||s.instanceMatrix===e.instanceMatrix)){let e=s.refs,n=s.names,r=t.attributes,i=!0;for(let t=0;t<n.length;t++)if(r[n[t]]!==e[t]){i=!1;break}if(i)return s.vl}let c=this._layout(e,t,n),l=c.layout.filter(e=>!e.name.startsWith(`instance`)).map(e=>e.name);return s={version:n.version,attrsVersion:t.attributesVersion,instanceMatrix:e.instanceMatrix,names:l,refs:l.map(e=>t.attributes[e]),vl:c},c.pipelines=new Map,i.set(o,s),r.layouts.add({byMat:i,key:o,value:s,vl:c}),c}_layout(e,t,n){let r=[],i=[`position`,`normal`,`uv`,`color`,...Object.keys(n.attributes)];for(let e of i){let i=t.attributes[e];i&&(e!==`color`||n.vertexColors||n.attributes.color)&&r.push({name:e,attr:i})}if(e.isInstancedMesh){for(let t=0;t<4;t++)r.push({name:`instanceMatrix`+t,attr:e.instanceMatrix,column:t});e.instanceColor&&r.push({name:`instanceColor`,attr:e.instanceColor})}let a=[],o=[],s=new Map,c=0;for(let e of r){let t=e.attr,r=t.isInterleavedBufferAttribute?t.data:t,i=!!(t.isInstancedBufferAttribute||r.isInstancedInterleavedBuffer||t.meshPerAttribute||r.meshPerAttribute)||e.name.startsWith(`instance`),l=Pt(t),u=s.get(r);if(u===void 0){u=a.length,s.set(r,u);let e=t.isInterleavedBufferAttribute?t.data.stride*l.bytesPerComponent:t.itemSize*l.bytesPerComponent;a.push({src:r,attr:t,layout:{arrayStride:l.converted?l.itemSize*4:e,stepMode:i?`instance`:`vertex`,attributes:[]}})}let d=t.isInterleavedBufferAttribute?t.offset*l.bytesPerComponent:0,f=l.format,p=l.wgsl;e.column!==void 0&&(d=e.column*16,f=`float32x4`,p=`vec4f`),a[u].layout.attributes.push({shaderLocation:c,offset:d,format:f}),(e.name===`position`||e.name===`normal`)&&(p=`vec3f`),e.name===`uv`&&(p=`vec2f`),e.name===`color`&&(p=t.itemSize===4?`vec4f`:`vec3f`),e.name===`instanceColor`&&(p=`vec3f`),n.attributes[e.name]&&(p=n.attributes[e.name]),o.push({name:e.name,wgsl:p,location:c,instanced:i}),c++}return{key:o.map(e=>`${e.name}:${e.wgsl}`).join(`,`)+`|`+a.map(e=>`${e.layout.arrayStride}/${e.layout.stepMode}/${e.layout.attributes.map(e=>e.format+`@`+e.offset).join(`;`)}`).join(`,`),layout:o,buffers:a}}_pipeline(e,n,r){this._materialOwner(e),e.__pkFrame!==t.frame&&(e.__pk=e.pipelineKey()+`|`+Ye.version,e.__pkFrame=t.frame);let i=r.passKey,a=n.pipelines&&n.pipelines.get(i);if(a&&a.materialKey===e.__pk)return a.p;let o=`${e.__pk}|${n.key}|${i}`,s=this.pipelines.get(o);return s||=this._createPipeline(e,n,r,o),n.pipelines&&n.pipelines.set(i,{materialKey:e.__pk,p:s}),s}_cachePipeline(e,t,n){let r=this._materialOwner(e);return this.pipelines.set(t,n),r.pipelines.set(t,n),this.stats.pipelines=this.pipelines.size,n}_createPipeline(e,n,r,i){let a=bt(e,n.layout,r),o=de({modules:a.modules,bindings:a.bindings,code:a.code,defines:a.defines,stage:`render`,label:e.name}),s=me(o.code,e.name);this._ensureDrawBuffer();let c=t.device.createPipelineLayout({bindGroupLayouts:[o.group0.layout,o.bindings.layout,this.drawLayout]}),l=be(e.blending),u=[];r.kind===`main`?u=[{format:r.colorFormats[0],blend:e.transparent||r.late?l:void 0,writeMask:e.colorWrite?GPUColorWrite.ALL:0},{format:r.colorFormats[1],blend:r.late?be(`premultiplied`):void 0,writeMask:e.colorWrite?GPUColorWrite.ALL:0},{format:r.colorFormats[2],blend:be(`normal`),writeMask:e.colorWrite?GPUColorWrite.ALL:0}]:r.kind===`color`&&(u=r.colorFormats.map(t=>({format:t,blend:l,writeMask:e.colorWrite?GPUColorWrite.ALL:0})));let d=e.side,f=r.cullOverride||(d===`double`?`none`:d===`back`?`front`:`back`),p=e.depthTest?e.depthCompare||r.depthCompare:`always`,m={label:e.name+` `+r.kind,layout:c,vertex:{module:s,entryPoint:`vs`,buffers:n.buffers.map(e=>e.layout)},primitive:{topology:e.topology,cullMode:f,frontFace:`ccw`}};a.hasFragment&&(m.fragment={module:s,entryPoint:`fs`,targets:u}),r.depthFormat&&(m.depthStencil={format:r.depthFormat,depthWriteEnabled:e.depthWrite,depthCompare:p,depthBias:r.kind===`depth`?r.depthBias||0:e.depthBias,depthBiasSlopeScale:r.kind===`depth`?r.depthBiasSlopeScale||0:e.depthBiasSlopeScale});let h={handle:t.renderPipeline(m),bindings:o.bindings,label:m.label};return this._cachePipeline(e,i,h)}withSceneTransforms(e,n){if(!this.optimizeSceneTransforms||this.precompiling)return n();let r=this._sceneTransformScopes.get(e);this._sceneTransformScopes.set(e,{frame:t.frame,updated:!1});try{return n()}finally{r?this._sceneTransformScopes.set(e,r):this._sceneTransformScopes.delete(e)}}invalidateSceneTransforms(e){let t=this._sceneTransformScopes.get(e);t&&(t.updated=!1)}collect(e,{camera:n,layerMask:r=4294967295,filter:a=null,kind:o=`main`,cull:s=!0,late:c=!1},d=null){let f=this._collectionDepth++,m=this._collectionStates[f]||(this._collectionStates[f]={frustum:new u,sphere:new l,vp:new p,view:new p,camPos:new i,sortItems:[]}),h=d||{opaque:[],transparent:[]};m.camera=n,m.layerMask=r,m.filter=a,m.kind=o,m.cull=s,m.lists=h,m.pooled=d,m.all=this.precompiling,m.depthSort=this.optimizeOpaqueDepthSort&&!this.precompiling&&o===`main`&&!c&&!!n?.isPerspectiveCamera;try{m.camPos.set(0,0,0),n&&(n.updateMatrixWorld(),m.view.copy(n.matrixWorldInverse.copy(n.matrixWorld).invert()),m.vp.multiplyMatrices(n.projectionMatrix,m.view),m.frustum.setFromProjectionMatrix(m.vp,n.coordinateSystem,n.reversedDepth!==!1),m.camPos.setFromMatrixPosition(n.matrixWorld));let r=this.optimizeSceneTransforms&&!this.precompiling?this._sceneTransformScopes.get(e):null;return r&&r.updated&&r.frame===t.frame||(e.updateMatrixWorld(),r&&(r.frame=t.frame,r.updated=!0)),this._collectObject(e,m),h.opaque.sort(Ct),m.depthSort&&this._sortOpaqueDepth(h.opaque,m.sortItems),h.transparent.sort(wt),h}finally{m.camera=m.filter=m.lists=m.pooled=null,m.sortItems.length=0,this._collectionDepth--}}_collectObject(e,t){let{all:n,camera:r}=t;if(e.visible||n){e.isMesh&&e.material&&e.geometry&&(e.layers.mask&t.layerMask)!==0&&(!t.filter||t.filter(e))&&(t.kind!==`depth`||e.castShadow)&&(n||!t.cull||!r||e.frustumCulled===!1||this._inFrustum(e,t))&&(e.onBeforeRender&&e.onBeforeRender(null,null,r,e.geometry,e.material,null),(e.visible||n)&&this._addItems(e,t));for(let n of e.children)this._collectObject(n,t)}}_inFrustum(e,t){let n=null;return e.isInstancedMesh?(!e.boundingSphere&&e.computeBoundingSphere&&e.computeBoundingSphere(),n=e.boundingSphere):(e.geometry.boundingSphere||e.geometry.computeBoundingSphere(),n=e.geometry.boundingSphere),!n||n.radius<0||!Number.isFinite(n.radius)||(t.sphere.copy(n).applyMatrix4(e.matrixWorld),t.frustum.intersectsSphere(t.sphere))}_addItems(e,t){let n=e.geometry,r=Array.isArray(e.material)?e.material:null,i=e.matrixWorld.elements,a=t.camPos,o=i[12]-a.x,s=i[13]-a.y,c=i[14]-a.z,l=o*o+s*s+c*c,u=n.drawRange?.start??0,d=n.drawRange?.count??1/0,f=-1;if(t.depthSort&&e.frustumCulled!==!1&&!e.isInstancedMesh&&n.boundingSphere&&Number.isFinite(n.boundingSphere.radius)&&n.boundingSphere.radius>=0){let r=t.sphere.copy(n.boundingSphere).applyMatrix4(e.matrixWorld),i=t.view.elements,a=r.center,o=-(i[2]*a.x+i[6]*a.y+i[10]*a.z+i[14])-r.radius;f=Math.floor(Math.max(0,o)/32)}if(r&&n.groups&&n.groups.length)for(let i of n.groups){let a=Math.max(i.start,u),o=Math.min(i.start+i.count,u+d);o>a&&this._pushItem(e,n,r[i.materialIndex],a,o-a,l,f,t)}else this._pushItem(e,n,r?r[0]:e.material,u,d,l,f,t)}_pushItem(e,t,n,r,i,a,o,s){if(!n||!n.visible&&!s.all)return;let c;if(s.pooled){let e=s.pooled,t=e.used++;c=e.records[t],c||(c=e.records[t]={},this.submissionStats.drawRecordAllocations++)}else c={};c.object=e,c.geometry=t,c.material=n,c.start=r,c.count=i,c.z=a,c.renderOrder=e.renderOrder||0,c.pipeKey=n.id,c.depthBucket=!n.transparent&&n.depthTest&&n.depthWrite&&n.blending===`none`&&!n.depthCompare&&n.topology===`triangle-list`?o:-1,(n.transparent?s.lists.transparent:s.lists.opaque).push(c)}_sortOpaqueDepth(e,t){let n=0;for(;n<e.length;){if(e[n].depthBucket<0){n++;continue}let r=n+1,i=e[n].renderOrder;for(;r<e.length&&e[r].depthBucket>=0&&e[r].renderOrder===i;)r++;if(r-n>1){for(let i=n;i<r;i++)t.push(e[i]);t.sort(Tt);for(let i=n;i<r;i++)e[i]=t[i-n];t.length=0}n=r}}render(e,t){this._beginFrame(),t={kind:`main`,late:!1,colorFormats:[],depthFormat:null,depthCompare:`greater-equal`,frameBlock:ve,layerMask:4294967295,...t},t.passKey=`${t.kind}.${+!!t.late}.${t.colorFormats.join(`,`)}.${t.depthFormat}.${t.depthCompare}.${t.cullOverride||``}.${t.defines?JSON.stringify(t.defines):``}`;let n=this.optimizeSceneSubmission&&!t.items&&!this.precompiling?this._drawListPool.acquire():null;n&&this.submissionStats.listLeases++;try{this._renderPass(t.items||this.collect(e,t,n),t)}finally{n&&this._drawListPool.release(n)}}_renderPass(e,n){let r=t.getEncoder(),i=(n.colorViews||[]).map((e,t)=>{let r=n.clearColors?n.clearColors[t]:null;return{view:e,loadOp:r?`clear`:`load`,storeOp:`store`,clearValue:r||[0,0,0,0]}}),a={label:n.label||n.kind,colorAttachments:i};n.depthView&&(a.depthStencilAttachment={view:n.depthView,depthLoadOp:n.clearDepth===null||n.clearDepth===void 0?`load`:`clear`,depthStoreOp:`store`,depthClearValue:n.clearDepth??0}),n.timestampWrites&&(a.timestampWrites=n.timestampWrites);let o=r.beginRenderPass(a);n.viewport&&o.setViewport(...n.viewport),o.setBindGroup(0,fe(n.frameBlock,`render`).getBindGroup()),this.drawItems(o,e.opaque,n),n.betweenLists&&n.betweenLists(o),this.drawItems(o,e.transparent,n),n.after&&n.after(o),o.end()}drawItems(e,t,n){if(!this.optimizeSceneSubmission||this.precompiling)return this._drawItems(e,t,n,null);let r=this._submissionDepth++,i=this._submissionStates[r]||(this._submissionStates[r]={vertexBuffers:[],offsets:new Uint32Array(1),indexBuffer:null,indexFormat:null,drawGroup:null,drawOffset:-1});try{return this._drawItems(e,t,n,i)}finally{i.vertexBuffers.length=0,i.indexBuffer=i.indexFormat=i.drawGroup=null,i.drawOffset=-1,this._submissionDepth--}}_drawItems(e,n,r,i){let a=null,o=null,s=++Et;for(let c of n){let{object:n,geometry:l,material:u}=c;if(!l.attributes.position&&!l.vertexCount&&!l.indirect)continue;let d,f;if(this.precompiling){try{d=this._cachedLayout(n,l,u),f=this._pipeline(u,d,r)}catch{continue}continue}d=this._cachedLayout(n,l,u),f=this._pipeline(u,d,r);let p=f.handle.pipeline||(this.syncPipelines?t.ready(f.handle):null);if(!p)continue;f!==a&&(e.setPipeline(p),this.submissionStats.pipelineBinds++,a=f);let m=f.bindings.getBindGroup(s);m!==o&&(e.setBindGroup(1,m),o=m);let h=this._slot(n)*Dt;i?i.drawGroup!==this.drawBindGroup||i.drawOffset!==h?(i.offsets[0]=h,e.setBindGroup(2,this.drawBindGroup,i.offsets,0,1),i.drawGroup=this.drawBindGroup,i.drawOffset=h):this.submissionStats.drawBindsSkipped++:e.setBindGroup(2,this.drawBindGroup,[h]);for(let t=0;t<d.buffers.length;t++){let n=this._attributeBuffer(l,d.buffers[t].attr);!i||i.vertexBuffers[t]!==n?(e.setVertexBuffer(t,n),i&&(i.vertexBuffers[t]=n)):this.submissionStats.vertexBindsSkipped++}let g=n.isInstancedMesh?n.count:l.instanceCount??1;if(g===0)continue;let _=this._indexBuffer(l);if(l.indirect){let t=l.indirect.buffer.getGPU?l.indirect.buffer.getGPU():l.indirect.buffer,n=l.indirect.offsets;_&&this._bindIndex(e,_,i);let r=n?n.length:1;for(let i=0;i<r;i++){let r=n?n[i]:l.indirect.offset||0;_?e.drawIndexedIndirect(t,r):e.drawIndirect(t,r),this.stats.draws++}}else{if(_){let t=Math.min(c.count,l.index.count-c.start);if(t<=0)continue;this._bindIndex(e,_,i),e.drawIndexed(t,g===1/0?1:g,c.start,0,0),this.stats.triangles+=t/3*g}else{let t=l.attributes.position?l.attributes.position.count:l.vertexCount,n=Math.min(c.count,t-c.start);if(n<=0)continue;e.draw(n,g,c.start,0),this.stats.triangles+=n/3*g}this.stats.draws++}}}_bindIndex(e,t,n){!n||n.indexBuffer!==t.buffer||n.indexFormat!==t.format?(e.setIndexBuffer(t.buffer,t.format),n&&(n.indexBuffer=t.buffer,n.indexFormat=t.format)):this.submissionStats.indexBindsSkipped++}};function kt(e){return Math.ceil(e/4)*4}function At(e,n){if(n.byteLength%4==0){t.queue.writeBuffer(e,0,n.buffer,n.byteOffset,n.byteLength);return}let r=new Uint8Array(kt(n.byteLength));r.set(new Uint8Array(n.buffer,n.byteOffset,n.byteLength)),t.queue.writeBuffer(e,0,r)}var jt=new WeakMap;function Mt(e){let t=e.isInterleavedBufferAttribute?e.data:e;if(!Pt(e).converted)return t.array;let n=jt.get(t);if(n&&n.version===t.version)return n.array;let r=e.count,i=e.itemSize,a=new Float32Array(r*i),o=e.normalized?Nt(t.array):1;for(let e=0;e<r*i;e++)a[e]=t.array[e]/o;return jt.set(t,{version:t.version,array:a}),a}function Nt(e){return e instanceof Uint8Array?255:e instanceof Int8Array?127:e instanceof Uint16Array?65535:e instanceof Int16Array?32767:1}function Pt(e){let t=(e.isInterleavedBufferAttribute?e.data:e).array,n=e.itemSize,r=e.normalized,i=e=>n===1?e:`vec${n}${e===`f32`?`f`:e===`u32`?`u`:`i`}`;if(t instanceof Float32Array)return{format:n===1?`float32`:`float32x${n}`,wgsl:i(`f32`),bytesPerComponent:4,itemSize:n};if(t instanceof Uint32Array)return{format:n===1?`uint32`:`uint32x${n}`,wgsl:i(`u32`),bytesPerComponent:4,itemSize:n};if(t instanceof Int32Array)return{format:n===1?`sint32`:`sint32x${n}`,wgsl:i(`i32`),bytesPerComponent:4,itemSize:n};let a={Uint8Array:[`uint8`,`unorm8`,1],Int8Array:[`sint8`,`snorm8`,1],Uint16Array:[`uint16`,`unorm16`,2],Int16Array:[`sint16`,`snorm16`,2]}[t.constructor.name];return a&&(n===2||n===4)&&!e.isInterleavedBufferAttribute?{format:(r?a[1]:a[0])+`x`+n,wgsl:i(r?`f32`:t instanceof Uint8Array||t instanceof Uint16Array?`u32`:`i32`),bytesPerComponent:a[2],itemSize:n}:{format:n===1?`float32`:`float32x${n}`,wgsl:i(`f32`),bytesPerComponent:4,itemSize:n,converted:!0}}var Ft=class{constructor(e){this.container=e,this.renderScale=1,this.maxOutputPixels=1/0,this.clock=new _,this._frameTiming=new mt,this.activeFrameTiming=null,this.frame=0,this.onResize=[]}async init(){let e=document.createElement(`canvas`);e.tabIndex=0,this.container.appendChild(e),this.canvas=e,this.domElement=e,await t.init({canvas:e}),this.meshRenderer=new Ot,this.meshRenderer.syncPipelines=!1,this.camera=new T(62,window.innerWidth/window.innerHeight,.06,6e4),this.scene=new ee,window.addEventListener(`resize`,()=>this.resize()),this.resize()}setRenderScale(e){this.renderScale=e,this.resize()}get width(){return this.canvas.width}get height(){return this.canvas.height}resize(){let e=window.innerWidth,t=window.innerHeight,n=Math.min(this.renderScale,Math.sqrt(this.maxOutputPixels/(e*t)));this.canvas.width=Math.max(1,Math.floor(e*n)),this.canvas.height=Math.max(1,Math.floor(t*n)),this.canvas.style.width=e+`px`,this.canvas.style.height=t+`px`,this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),ve.fields.outputResolution.value.set(this.canvas.width,this.canvas.height);for(let n of this.onResize)n(e,t)}currentTexture(){return t.context.getCurrentTexture()}start(e){this.stop(),this._running=!0,this._frameTiming.invalidate(),this.clock.reset(),this._visibilityDocument=typeof document>`u`?null:document,this._visibilityDocument&&(this.clock.connect(this._visibilityDocument),this._visibilityHandler=()=>this._frameTiming.invalidate(),this._visibilityDocument.addEventListener(`visibilitychange`,this._visibilityHandler));let t=n=>{if(!this._running||this._loop!==t)return;this.clock.update(n);let r=this._visibilityDocument?.hidden===!0,i=this._frameTiming.update(n,r);if(!r){let t=i.valid?Math.max(0,Math.min(this.clock.getDelta(),.1)):0;this.frame++,this.activeFrameTiming=i;try{e(t,this.clock.getElapsed(),i)}finally{this.activeFrameTiming=null}}this._running&&this._loop===t&&(this._raf=requestAnimationFrame(t))};this._loop=t,this._raf=requestAnimationFrame(t)}stop(){this._running=!1,this._loop=null,this._raf!==void 0&&cancelAnimationFrame(this._raf),this._raf=void 0,this.clock.disconnect(),this._visibilityHandler&&=(this._visibilityDocument.removeEventListener(`visibilitychange`,this._visibilityHandler),null),this._visibilityDocument=null,this._frameTiming.invalidate()}},It=.78,Lt=700,Rt=new Set([`ArrowLeft`,`ArrowRight`,`ArrowUp`,`ArrowDown`]),zt=e=>!!(e&&([`INPUT`,`SELECT`,`TEXTAREA`,`BUTTON`,`A`,`SUMMARY`].includes(e.tagName)||e.isContentEditable||e.closest?.(`.tw-interactive, [role="dialog"]`))),Bt=class{constructor(e,{keyboardLookBlocked:t=()=>!1}={}){this.dom=e,this.keys=new Set,this.pressed=new Set,this._touchHeld=new Map,this._helicopterTouchMode=!1,this._touchFlightResetters=[],this.look={x:0,y:0},this.moveStick={x:0,y:0},this.lookStick={x:0,y:0},this.wheel=0,this.mouseDown=!1,this.rightDown=!1,this.locked=!1,this.enabled=!0,this.keyboardLookBlocked=t,window.addEventListener(`keyup`,e=>this.keys.delete(e.code),!0),window.addEventListener(`keydown`,e=>{(e.ctrlKey||e.metaKey||e.altKey)&&this.clearKeyboardLook()},!0),document.addEventListener(`focusin`,e=>{zt(e.target)&&this.clearKeyboardLook()},!0),window.addEventListener(`keydown`,e=>{Rt.has(e.code)&&(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||!this._keyboardLookAllowed(e.target))?this.clearKeyboardLook():Rt.has(e.code)&&e.repeat&&!this.keys.has(e.code)||(!e.target||e.target.tagName!==`INPUT`&&e.target.tagName!==`SELECT`&&e.target.tagName!==`TEXTAREA`)&&(this.keys.has(e.code)||this.pressed.add(e.code),this.keys.add(e.code),[`Space`,`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Tab`].includes(e.code)&&e.preventDefault())}),window.addEventListener(`blur`,()=>this._clearTransientInput()),document.addEventListener(`visibilitychange`,()=>{document.hidden&&this._clearTransientInput()}),this._createTouchSticks(),e.addEventListener(`mousedown`,e=>{e.button===0&&(this.mouseDown=!0),e.button===2&&(this.rightDown=!0)}),window.addEventListener(`mouseup`,e=>{e.button===0&&(this.mouseDown=!1),e.button===2&&(this.rightDown=!1)}),e.addEventListener(`contextmenu`,e=>e.preventDefault()),window.addEventListener(`mousemove`,e=>{(this.locked||this.mouseDown||this.rightDown)&&(this.look.x+=e.movementX,this.look.y+=e.movementY)}),e.addEventListener(`wheel`,e=>{this.wheel+=Math.sign(e.deltaY),e.preventDefault()},{passive:!1}),document.addEventListener(`pointerlockchange`,()=>{this.locked=document.pointerLockElement===e})}requestLock(){window.matchMedia?.(`(pointer: coarse)`).matches||this.locked||this.dom.requestPointerLock?.()?.catch?.(()=>{})}suspend(){this.enabled=!1,this._clearTransientInput()}resume(){this._clearTransientInput(),this.enabled=!0}_keyboardLookAllowed(e){return this.enabled&&!document.hidden&&!this.keyboardLookBlocked()&&!zt(e)&&!zt(document.activeElement)}clearKeyboardLook(){for(let e of Rt)this.keys.delete(e),this.pressed.delete(e)}get touchInterface(){return!!window.matchMedia?.(`(pointer: coarse)`).matches}setHelicopterTouchMode(e){if(e=!!e,e!==this._helicopterTouchMode&&(this._helicopterTouchMode=e,this._touchFlight&&(this._touchFlight.hidden=!e),!e))for(let e of this._touchFlightResetters)e()}_createTouchSticks(){let e=document.querySelector(`.tw-root`);if(!e)return;let t=document.createElement(`div`);t.className=`tw-touch-controls`,t.setAttribute(`aria-label`,`Touch controls`),this._touchStickResetters=[];for(let[e,n,r]of[[`move`,`Move`,this.moveStick],[`look`,`Look`,this.lookStick]]){let i=document.createElement(`button`);i.className=`tw-touch-stick tw-touch-stick-${e} tw-interactive`,i.type=`button`,i.setAttribute(`aria-label`,`${n} joystick`),i.tabIndex=-1,i.innerHTML=`<span class="tw-touch-stick-label">`+n+`</span><span class="tw-touch-stick-knob" aria-hidden="true"></span>`;let a=i.querySelector(`.tw-touch-stick-knob`),o=null,s=()=>{o=null,r.x=r.y=0,i.classList.remove(`is-active`),a.style.transform=`translate( -50%, -50% )`};this._touchStickResetters.push(s);let c=e=>{let t=i.getBoundingClientRect(),n=t.width*.29,o=e.clientX-(t.left+t.width/2),s=e.clientY-(t.top+t.height/2);r.x=o/n,r.y=-s/n,a.style.transform=`translate( calc( -50% + ${o}px ), calc( -50% + ${s}px ) )`};i.addEventListener(`pointerdown`,e=>{o===null&&(e.preventDefault(),e.stopPropagation(),o=e.pointerId,i.setPointerCapture(o),i.classList.add(`is-active`),c(e))}),i.addEventListener(`pointermove`,e=>{e.pointerId===o&&(e.preventDefault(),c(e))}),i.addEventListener(`pointerup`,e=>{e.pointerId===o&&s()}),i.addEventListener(`pointercancel`,s),i.addEventListener(`lostpointercapture`,s),t.append(i)}let n=this._touchFlight=document.createElement(`div`);n.className=`tw-touch-flight`,n.hidden=!0,n.setAttribute(`aria-label`,`Helicopter altitude controls`);for(let[e,t]of[[`Up`,`Space`],[`Down`,`KeyC`]]){let r=document.createElement(`button`);r.type=`button`,r.className=`tw-touch-flight-button tw-interactive`,r.textContent=e,r.setAttribute(`aria-label`,`Helicopter ${e.toLowerCase()} — hold`),r.tabIndex=-1;let i=new Set;this._touchHeld.set(t,i);let a=e=>{e.preventDefault(),e.stopPropagation()},o=e=>{a(e),i.delete(e.pointerId),r.hasPointerCapture?.(e.pointerId)&&r.releasePointerCapture(e.pointerId),r.classList.toggle(`is-active`,i.size>0)};this._touchFlightResetters.push(()=>{let e=[...i];i.clear();for(let t of e)r.hasPointerCapture?.(t)&&r.releasePointerCapture(t);r.classList.remove(`is-active`)}),r.addEventListener(`pointerdown`,e=>{if(a(e),this.enabled&&this._helicopterTouchMode){try{r.setPointerCapture(e.pointerId)}catch{return}i.add(e.pointerId),r.classList.add(`is-active`)}}),r.addEventListener(`pointermove`,a);for(let e of[`pointerup`,`pointercancel`,`lostpointercapture`])r.addEventListener(e,o);r.addEventListener(`click`,a),n.append(r)}t.append(n),e.append(t)}_clearTransientInput(){this.keys.clear(),this.pressed.clear(),this.mouseDown=!1,this.rightDown=!1,this.look.x=this.look.y=0,this.moveStick.x=this.moveStick.y=0,this.lookStick.x=this.lookStick.y=0;for(let e of this._touchStickResetters||[])e();for(let e of this._touchFlightResetters)e()}_moveAxis(e,t,n){return this.enabled?this.keys.has(e)||this.keys.has(t)?Number(this.keys.has(t))-Number(this.keys.has(e)):n:0}_shapeAxis(e,t){let n=Math.abs(e);return n<=t?0:Math.sign(e)*((n-t)/(1-t))**1.7}moveAxes(){let{x:e,y:t}=this.moveStick,n=Math.hypot(e,t),r=0,i=0;if(n>1)r=e/n,i=t/n;else if(n>.08){let a=Math.min((n-.08)/.92,1),o=a**1.7/n;r=this._shapeAxis(e,.22),i=t*o;let s=Math.hypot(r,i);if(s>0){let e=a**1.7/s;r*=e,i*=e}}return{x:this._moveAxis(`KeyA`,`KeyD`,r),y:this._moveAxis(`KeyS`,`KeyW`,i),sprint:Math.max(0,Math.min(n-1,1))}}down(e){if(!this.enabled)return!1;if(this.keys.has(e)||this._touchHeld.get(e)?.size)return!0;let{x:t,y:n}=this.moveStick;return e===`KeyW`?n>.18:e===`KeyS`?n<-.18:e===`KeyD`?t>.18:e===`KeyA`&&t<-.18}hit(e){return this.enabled&&this.pressed.has(e)}press(e){this.enabled&&this.pressed.add(e)}consumeLook(e=1/60){if(this._keyboardLookAllowed()||this.clearKeyboardLook(),!this.enabled)return this.look.x=this.look.y=0,{x:0,y:0};let{x:t,y:n}=this.lookStick,r=Math.hypot(t,n),i=0,a=0;if(r>.04){let e=Math.min((r-.04)/.96,1)**1.7/r,o=Math.max(r,1);i=t*e*o,a=this._shapeAxis(Math.max(-1,Math.min(n,1)),It)*o}let o={x:this.look.x+i*420*e+(Number(this.keys.has(`ArrowRight`))-Number(this.keys.has(`ArrowLeft`)))*Lt*e,y:this.look.y-a*420*e+(Number(this.keys.has(`ArrowDown`))-Number(this.keys.has(`ArrowUp`)))*Lt*e};return this.look.x=0,this.look.y=0,o}consumeWheel(){let e=this.wheel;return this.wheel=0,e}endFrame(){this._keyboardLookAllowed()||this.clearKeyboardLook(),this.pressed.clear()}},Vt=class{constructor({label:e=`kernel`,modules:n=[],bindings:r={},code:i,workgroupSize:a=[64,1,1],defines:o={},entryPoint:s=`main`}){this.label=e,this.workgroupSize=a;let[c,l=1,u=1]=a,d=i.replace(/\bWG_X\b/g,c).replace(/\bWG_Y\b/g,l).replace(/\bWG_Z\b/g,u),f=de({modules:n,bindings:r,code:d,defines:o,stage:`compute`,label:e});this.source=f.code,this.bindings=f.bindings,this.group0=f.group0;let p=me(f.code,e);this.handle=t.computePipeline({label:e,layout:t.device.createPipelineLayout({bindGroupLayouts:[f.group0.layout,f.bindings.layout]}),compute:{module:p,entryPoint:s}}),this.timestampWrites=null}get pipeline(){return t.ready(this.handle)}dispatch(e,{pass:n=null,indirect:r=null}={}){let[i,a=1,o=1]=Array.isArray(e)?e:[e];if(!r&&(i===0||a===0||o===0))return;let s=e=>{e.setPipeline(t.ready(this.handle)),e.setBindGroup(0,this.group0.getBindGroup()),e.setBindGroup(1,this.bindings.getBindGroup()),r?e.dispatchWorkgroupsIndirect(r.buffer.getGPU?r.buffer.getGPU():r.buffer,r.offset||0):e.dispatchWorkgroups(i,a,o)};n?s(n):t.computePass(this.label,s,this.timestampWrites||void 0)}groups(e,t=1,n=1){let[r,i=1,a=1]=this.workgroupSize;return[Math.ceil(e/r),Math.ceil(t/i),Math.ceil(n/a)]}},Ht=`modulepreload`,Ut=function(e,t){return new URL(e,t).href},Wt={},Gt=function(e){return e.pathname.endsWith(`.css`)},Kt=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},qt=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=Ut(t,n);let r=s(t),i=Gt(r);return Kt(Wt,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:Ht,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},Jt=class{constructor({byteLength:e,ring:t=3,label:n=`readback`}){this.byteLength=Math.ceil(e/4)*4,this.label=n,this.ring=[];for(let e=0;e<t;e++)this.ring.push({buffer:null,busy:!1,frame:0});this.latest=null,this.frame=-1,this.onData=null}_slot(){for(let e of this.ring)if(!e.busy)return e.buffer||=t.device.createBuffer({label:this.label,size:this.byteLength,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),e;return null}request(e,n=0){let r=this._slot();if(!r)return!1;r.busy=!0,r.frame=t.frame;let i=e.getGPU?e.getGPU():e;return t.getEncoder().copyBufferToBuffer(i,n,r.buffer,0,this.byteLength),t.onSubmit(null,()=>{r.buffer.mapAsync(GPUMapMode.READ).then(()=>{let e=r.buffer.getMappedRange().slice(0);r.buffer.unmap(),r.busy=!1,r.frame>=this.frame&&(this.latest=e,this.frame=r.frame,this.onData&&this.onData(e,r.frame))}).catch(()=>{r.busy=!1})}),!0}};async function Yt(e,{mip:n=0,layer:r=0,bytesPerTexel:i=null}={}){let{formatInfo:a}=await qt(async()=>{let{formatInfo:e}=await import(`./GPU-B8NOtGQD.js`).then(e=>e.n);return{formatInfo:e}},[],import.meta.url),o=i||a(e.format).bytes,s=Math.max(1,e.width>>n),c=Math.max(1,e.height>>n),l=s*o,u=Math.ceil(l/256)*256,d=t.device.createBuffer({size:u*c,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});t.getEncoder().copyTextureToBuffer({texture:e.getGPU(),mipLevel:n,origin:{x:0,y:0,z:r}},{buffer:d,bytesPerRow:u,rowsPerImage:c},{width:s,height:c,depthOrArrayLayers:1}),t.submit(),await d.mapAsync(GPUMapMode.READ);let f=new Uint8Array(d.getMappedRange()),p=new Uint8Array(l*c);for(let e=0;e<c;e++)p.set(f.subarray(e*u,e*u+l),e*l);return d.unmap(),d.destroy(),{data:p.buffer,width:s,height:c}}var Xt=`
struct FSIn { @builtin( position ) pos: vec4f, @location( 0 ) uv: vec2f };
@vertex fn vs( @builtin( vertex_index ) i: u32 ) -> FSIn {
	let p = vec2f( f32( ( i << 1u ) & 2u ), f32( i & 2u ) );
	var o: FSIn;
	o.pos = vec4f( p * 2.0 - 1.0, FS_DEPTH, 1.0 );
	o.uv = vec2f( p.x, 1.0 - p.y );
	return o;
}
`,P=class{constructor({label:e=`fullscreen`,modules:n=[],bindings:r={},code:i,colorFormats:a=[`rgba16float`],blend:o=`none`,defines:s={},depthFormat:c=null,depthCompare:l=`always`,depthWrite:u=!1,depth:d=0,writeMasks:f=null,blends:p=null}){this.label=e,this.colorFormats=a;let m=i.includes(`@fragment`)?i:`${i}\n@fragment fn fs( in: FSIn ) -> @location( 0 ) vec4f { return fragment( in ); }\n`,h=de({modules:[N,...n],bindings:r,code:Xt.replace(`FS_DEPTH`,d.toFixed(6))+m,defines:s,stage:`render`,label:e});this.source=h.code,this.bindings=h.bindings;let g=me(h.code,e),_={label:e,layout:t.device.createPipelineLayout({bindGroupLayouts:[h.group0.layout,h.bindings.layout]}),vertex:{module:g,entryPoint:`vs`},fragment:{module:g,entryPoint:`fs`,targets:a.map((e,t)=>({format:e,blend:be(p?p[t]:t===0?o:`none`),writeMask:f?f[t]:GPUColorWrite.ALL}))},primitive:{topology:`triangle-list`}};c&&(_.depthStencil={format:c,depthCompare:l,depthWriteEnabled:u}),this.handle=t.renderPipeline(_),this.timestampWrites=null}get pipeline(){return t.ready(this.handle)}draw(e,n=ve){e.setPipeline(t.ready(this.handle)),e.setBindGroup(0,fe(n,`render`).getBindGroup()),e.setBindGroup(1,this.bindings.getBindGroup()),e.draw(3)}render({colorViews:e,clear:n=null,viewport:r=null,frameBlock:i=ve,depthView:a=null,encoder:o=t.getEncoder()}={}){let s=e.map(e=>e.isTexture?e.view({dimension:`2d`,mipLevelCount:1}):e),c={label:this.label,colorAttachments:s.map(e=>({view:e,loadOp:n?`clear`:`load`,storeOp:`store`,clearValue:n||[0,0,0,0]}))};a&&(c.depthStencilAttachment={view:a,depthLoadOp:`load`,depthStoreOp:`store`}),this.timestampWrites&&(c.timestampWrites=this.timestampWrites);let l=o.beginRenderPass(c);r&&l.setViewport(...r),this.draw(l,i),l.end()}},Zt=new i,Qt=new l,$t=new u,en=new p,tn=new p,nn={OPAQUE:0,WATER:1,TRANSPARENT:2,REFLECT_ONLY:3},rn=[`rgba16float`,`rgba16float`,`rgba8unorm`],an=`depth32float`,on=class{constructor(e,t,n){this.meshRenderer=e,this.scene=t,this.camera=n,this.scale=1,this.width=1,this.height=1,this.sceneRT=new j(1,1,{colors:[{format:`rgba16float`,name:`color`},{format:`rgba16float`,name:`velocity`},{format:`rgba8unorm`,name:`waterMask`}],depth:an,label:`scene`}),this.velocityTexture=this.sceneRT.textures[1],this.waterMaskTexture=this.sceneRT.textures[2],this.opaqueCopy=new j(1,1,{colors:[`rgba16float`],depth:an,label:`opaqueCopy`}),this.opaqueDepthHalf=new j(1,1,{colors:[`r16float`],label:`opaqueDepthHalf`}),this._depthHalfPass=null,this.optimizeWaterDepthCopy=!0,this.waterMaterial=null,this.hullMaskRT=new j(1,1,{colors:[`r16float`],depth:an,label:`hullMask`}),this.hullMaskScene=new ee,this.hullMaskMaterial=new Ee({name:`hullMask`,lit:!1,side:`double`,surface:`s.albedo = vec3f( length( in.P - frame.cameraPos ), 0.0, 0.0 ); s.emissive = vec3f( 0.0 );`}),this.hullMasks=[],this.hullMaskActive={value:0},this.background=null,this.clearColor=[0,0,0,1],this.onBeforeWater=null}setSize(e,t){this.width=e,this.height=t,this.sceneRT.setSize(e,t),this.opaqueCopy.setSize(e,t),this.opaqueDepthHalf.setSize(e,t),this.hullMaskRT.setSize(e,t)}addHullMask(e,t){e.computeBoundingBox(),e.computeBoundingSphere();let n=new y(e,this.hullMaskMaterial);return n.matrixAutoUpdate=!1,n.frustumCulled=!1,this.hullMaskScene.add(n),this.hullMasks.push({mesh:n,object:t,box:e.boundingBox.clone().expandByScalar(.05),sphere:e.boundingSphere}),n}_renderHullMasks(e){let t=0;$t.setFromProjectionMatrix(en.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse));for(let n of this.hullMasks){n.object.updateWorldMatrix(!0,!1),n.mesh.matrix.copy(n.object.matrixWorld),n.mesh.matrixWorld.copy(n.object.matrixWorld),Zt.setFromMatrixPosition(e.matrixWorld).applyMatrix4(tn.copy(n.object.matrixWorld).invert());let r=!n.box.containsPoint(Zt)&&$t.intersectsSphere(Qt.copy(n.sphere).applyMatrix4(n.object.matrixWorld));n.mesh.visible=r,r&&t++}if(this.hullMaskActive.value=+(t>0),!t)return;let n=this.hullMaskRT;this.meshRenderer.render(this.hullMaskScene,{label:`hull mask`,kind:`color`,camera:e,colorViews:[n.texture.view()],colorFormats:n.formats,clearColors:[[0,0,0,0]],depthView:n.depthTexture.view(),depthFormat:an,clearDepth:0,cull:!1})}render(){let{scene:e,camera:n,meshRenderer:r}=this,i=this.sceneRT,a={camera:n,colorViews:i.textures.map(e=>e.view()),colorFormats:i.formats,depthView:i.depthTexture.view(),depthFormat:an,kind:`main`};r.render(e,{...a,label:`opaque`,layerMask:1<<nn.OPAQUE,clearColors:[this.clearColor,[0,0,0,0],[0,0,0,0]],clearDepth:0,after:this.background?e=>this.background.draw(e):null});let o=t.getEncoder(),s={width:i.width,height:i.height};o.copyTextureToTexture({texture:i.texture.getGPU()},{texture:this.opaqueCopy.texture.getGPU()},s),o.copyTextureToTexture({texture:i.depthTexture.getGPU()},{texture:this.opaqueCopy.depthTexture.getGPU()},s),this._depthHalfPass||=new P({label:`opaque depth half`,colorFormats:[`r16float`],bindings:{srcDepth:{texture:()=>this.opaqueCopy.depthTexture}},code:`fn fragment( in: FSIn ) -> vec4f { return vec4f( textureLoad( srcDepth, vec2i( in.pos.xy ), 0 ), 0.0, 0.0, 1.0 ); }`}),this.optimizeWaterDepthCopy&&this.waterMaterial?.needsSSRDepth===!1||this._depthHalfPass.render({colorViews:[this.opaqueDepthHalf.texture],clear:[0,0,0,0]}),this.hullMasks.length>0&&this._renderHullMasks(n),this.onBeforeWater&&this.onBeforeWater(),r.render(e,{...a,label:`water + transparent`,late:!0,layerMask:1<<nn.WATER|1<<nn.TRANSPARENT})}},sn={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},cn={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},ln={5120:127,5121:255,5122:32767,5123:65535};async function un(e){let t;if(globalThis.__assetFile)t=await globalThis.__assetFile(e);else{let n=await fetch(e);if(!n.ok)throw Error(`GLB: `+e+` `+n.status);t=await n.arrayBuffer()}return dn(t)}function dn(e){let t=new DataView(e);if(t.getUint32(0,!0)!==1179937895)throw Error(`GLB: bad magic`);let r=t.getUint32(8,!0),a=null,o=null;for(let n=12;n<r;){let r=t.getUint32(n,!0),i=t.getUint32(n+4,!0);i===1313821514?a=JSON.parse(new TextDecoder().decode(new Uint8Array(e,n+8,r))):i===5130562&&(o=new Uint8Array(e,n+8,r)),n+=8+r}if(!a)throw Error(`GLB: no JSON chunk`);if(a.extensionsRequired&&a.extensionsRequired.length)throw Error(`GLB: unsupported extensions `+a.extensionsRequired.join(`, `));let s=e=>{let t=a.bufferViews[e];if(t.buffer!==0||!o)throw Error(`GLB: external buffers are not supported`);return new Uint8Array(o.buffer,o.byteOffset+(t.byteOffset||0),t.byteLength)},c=e=>{let t=a.accessors[e];if(t.sparse)throw Error(`GLB: sparse accessors are not supported`);let n=sn[t.type],r=cn[t.componentType],i=new r(t.count*n);if(t.bufferView!==void 0){let e=a.bufferViews[t.bufferView],o=s(t.bufferView),c=o.byteOffset+(t.byteOffset||0),l=r.BYTES_PER_ELEMENT,u=e.byteStride||n*l;if(u===n*l&&c%l===0)i.set(new r(o.buffer,c,t.count*n));else{let e=new DataView(o.buffer),r={5120:t=>e.getInt8(t),5121:t=>e.getUint8(t),5122:t=>e.getInt16(t,!0),5123:t=>e.getUint16(t,!0),5125:t=>e.getUint32(t,!0),5126:t=>e.getFloat32(t,!0)}[t.componentType];for(let e=0;e<t.count;e++)for(let t=0;t<n;t++)i[e*n+t]=r(c+e*u+t*l)}}return{array:i,itemSize:n,normalized:!!t.normalized,componentType:t.componentType}},l=e=>{let t=c(e);if(t.array instanceof Float32Array)return t.array;let n=new Float32Array(t.array.length),r=t.normalized?1/ln[t.componentType]:1;for(let e=0;e<n.length;e++)n[e]=Math.max(t.array[e]*r,-1);return n},u=new p,d=new i,f=new n,m=new i,h=(a.nodes||[]).map(e=>{let t=e.translation||[0,0,0],n=e.rotation||[0,0,0,1],r=e.scale||[1,1,1];return e.matrix&&(u.fromArray(e.matrix).decompose(d,f,m),t=[d.x,d.y,d.z],n=[f.x,f.y,f.z,f.w],r=[m.x,m.y,m.z]),{name:e.name||``,children:e.children||[],t:t.slice(),r:n.slice(),s:r.slice(),mesh:e.mesh,skin:e.skin}}),g=(a.meshes||[]).map(e=>e.primitives.map(e=>{let t={};for(let n in e.attributes)t[n]=c(e.attributes[n]);return e.targets&&e.targets.length&&console.warn(`GLB: morph targets are ignored`),{attributes:t,indices:e.indices===void 0?null:c(e.indices).array,material:e.material,mode:e.mode??4}})),_=(a.skins||[]).map(e=>({name:e.name||``,joints:e.joints,skeleton:e.skeleton,inverseBindMatrices:e.inverseBindMatrices===void 0?fn(e.joints.length):l(e.inverseBindMatrices)})),v=(a.animations||[]).map(e=>{let t=0,n=[];for(let r of e.channels){if(r.target.node===void 0||r.target.path===`weights`)continue;let i=e.samplers[r.sampler],a=l(i.input),o=l(i.output),s=r.target.path===`rotation`?4:3;if(i.interpolation===`CUBICSPLINE`){let e=new Float32Array(a.length*s);for(let t=0;t<a.length;t++)for(let n=0;n<s;n++)e[t*s+n]=o[(t*3+1)*s+n];o=e}t=Math.max(t,a[a.length-1]),n.push({node:r.target.node,path:r.target.path,times:a,values:o,step:i.interpolation===`STEP`})}let r=1/0;for(let e of n)r=Math.min(r,e.times[0]);if(r>0&&r<1/0){for(let e of n)for(let t=0;t<e.times.length;t++)e.times[t]-=r;t-=r}return{name:e.name||`clip`,duration:t,channels:n}}),y=(a.images||[]).map(e=>({bytes:e.bufferView===void 0?null:s(e.bufferView),mimeType:e.mimeType,uri:e.uri})),b=a.scenes?a.scenes[a.scene||0]:null,x=b?b.nodes:h.map((e,t)=>t).filter(e=>!h.some(t=>t.children.includes(e)));return{json:a,nodes:h,roots:x,meshes:g,skins:_,animations:v,materials:a.materials||[],textures:a.textures||[],images:y}}function fn(e){let t=new Float32Array(e*16);for(let n=0;n<e;n++)t[n*16]=t[n*16+5]=t[n*16+10]=t[n*16+15]=1;return t}async function pn(e,t){if(globalThis.__assetImage)return globalThis.__assetImage(e,t);let n=await createImageBitmap(new Blob([e],{type:t}),{colorSpaceConversion:`none`,premultiplyAlpha:`none`}),r=new OffscreenCanvas(n.width,n.height).getContext(`2d`,{willReadFrequently:!0});r.drawImage(n,0,0);let i=n.width,a=n.height,o=r.getImageData(0,0,i,a).data;return n.close&&n.close(),{data:new Uint8Array(o.buffer,o.byteOffset,o.byteLength),width:i,height:a}}var mn=class{constructor(e,t,n,r){this.boxes=Array.from({length:r},()=>new f),this.box=new f,this.sphere=new l,this._box=new f,this._matrix=new p,this._point=new i,this.valid=e.length>0&&e.length%3==0&&t.length===e.length/3*4&&n.length===t.length;for(let i=0;this.valid&&i<e.length/3;i++){this._point.fromArray(e,i*3);let a=0;for(let e=0;e<4;e++){let o=t[i*4+e],s=n[i*4+e];if(a+=s,!Number.isInteger(o)||o<0||o>=r||!Number.isFinite(s)||s<0){this.valid=!1;break}s>0&&this.boxes[o].expandByPoint(this._point)}(!Number.isFinite(this._point.x+this._point.y+this._point.z)||Math.abs(a-1)>1e-5)&&(this.valid=!1)}}update(e){if(!this.valid)return this.sphere.radius=1/0,!1;this.box.makeEmpty();for(let t=0;t<this.boxes.length;t++)this.boxes[t].isEmpty()||(this._matrix.fromArray(e,t*16),this.box.union(this._box.copy(this.boxes[t]).applyMatrix4(this._matrix)));return this.box.getBoundingSphere(this.sphere),this.sphere.radius+=1e-4*(1+this.sphere.center.length()+this.sphere.radius),Number.isFinite(this.sphere.radius+this.sphere.center.length())?!0:(this.sphere.radius=1/0,!1)}},hn=e=>`
	let sj = v.skinIndex;
	let sw = v.skinWeight;
	let sk = skinJoints[ sj.x ] * sw.x + skinJoints[ sj.y ] * sw.y + skinJoints[ sj.z ] * sw.z + skinJoints[ sj.w ] * sw.w;
	let skp = skinJoints[ sj.x + ${e}u ] * sw.x + skinJoints[ sj.y + ${e}u ] * sw.y + skinJoints[ sj.z + ${e}u ] * sw.z + skinJoints[ sj.w + ${e}u ] * sw.w;
	let lp = vec4f( v.position, 1.0 );
	let lm = v.model * sk;
	v.useWorld = true;
	v.worldPos = ( lm * lp ).xyz;
	v.worldNormal = cofactor3( lm ) * v.normal;
	v.prevWorldPos = ( v.prevModel * skp * lp ).xyz;
`;function gn({name:e,joints:t,jointBuffer:n,textures:r={},alphaMode:i=`OPAQUE`,alphaCutoff:a=.5,doubleSided:o=!1,surface:s=``,uniforms:c={},color:l=null,roughness:u=1,metalness:d=1,defines:f={},modules:p=[]}){let m={};r.albedo&&(m.chAlbedo=r.albedo),r.normal&&(m.chNormal=r.normal),r.orm&&(m.chOrm=r.orm);let h=`
#if HAS_ALBEDO
	let ca = textureSample( chAlbedo, smpAnisoRepeat, in.uv );
	s.albedo *= ca.rgb;
	s.alpha *= ca.a;
#endif
#if HAS_ORM
	let orm = textureSample( chOrm, smpAnisoRepeat, in.uv );
	s.roughness *= orm.g;
	s.metalness *= orm.b;
#endif
#if HAS_NORMAL
	let nm = textureSample( chNormal, smpAnisoRepeat, in.uv ).xyz * 2.0 - 1.0;
	s.normal = perturbNormalByMap( in.P, in.N, in.uv, nm );
#endif
${s}
`;return new Ee({name:e,modules:p,attributes:{skinIndex:`vec4u`,skinWeight:`vec4f`},storage:{skinJoints:{storage:n,access:`read`}},textures:m,uniforms:c,color:l||void 0,roughness:u,metalness:d,vertex:hn(t),surface:h,side:o?`double`:`front`,alphaTest:i===`MASK`||i===`BLEND`?a:0,defines:{HAS_ALBEDO:+!!m.chAlbedo,HAS_ORM:+!!m.chOrm,HAS_NORMAL:+!!m.chNormal,...f}})}function _n(e,t,n,r,i){let a=r[0],o=r[1],s=r[2],c=r[3],l=a+a,u=o+o,d=s+s,f=a*l,p=a*u,m=a*d,h=o*u,g=o*d,_=s*d,v=c*l,y=c*u,b=c*d,x=i[0],S=i[1],C=i[2];e[t]=(1-(h+_))*x,e[t+1]=(p+b)*x,e[t+2]=(m-y)*x,e[t+3]=0,e[t+4]=(p-b)*S,e[t+5]=(1-(f+_))*S,e[t+6]=(g+v)*S,e[t+7]=0,e[t+8]=(m+y)*C,e[t+9]=(g-v)*C,e[t+10]=(1-(f+h))*C,e[t+11]=0,e[t+12]=n[0],e[t+13]=n[1],e[t+14]=n[2],e[t+15]=1}function vn(e,t,n,r,i,a){for(let o=0;o<4;o++){let s=i[a+o*4],c=i[a+o*4+1],l=i[a+o*4+2],u=i[a+o*4+3];for(let i=0;i<4;i++)e[t+o*4+i]=n[r+i]*s+n[r+4+i]*c+n[r+8+i]*l+n[r+12+i]*u}}function yn(e,t,n){let r=e.times,i=e.values,a=e.path===`rotation`?4:3,o=r.length;if(o===1||t<=r[0]){for(let e=0;e<a;e++)n[e]=i[e];return}if(t>=r[o-1]){for(let e=0;e<a;e++)n[e]=i[(o-1)*a+e];return}let s=e._k||0;for(r[s]>t&&(s=0);s<o-2&&r[s+1]<=t;)s++;e._k=s;let c=e.step?0:(t-r[s])/(r[s+1]-r[s]),l=s*a,u=(s+1)*a;if(a===4){let e=i[l]*i[u]+i[l+1]*i[u+1]+i[l+2]*i[u+2]+i[l+3]*i[u+3]<0?-c:c,t=i[l]*(1-c)+i[u]*e,r=i[l+1]*(1-c)+i[u+1]*e,a=i[l+2]*(1-c)+i[u+2]*e,o=i[l+3]*(1-c)+i[u+3]*e,s=1/Math.hypot(t,r,a,o);n[0]=t*s,n[1]=r*s,n[2]=a*s,n[3]=o*s}else for(let e=0;e<3;e++)n[e]=i[l+e]+(i[u+e]-i[l+e])*c}var bn=class e{static async create(t,{materials:n=null,textureSize:r=null}={}){let i=new e(t);return await i._buildMeshes(n),i}constructor(e){this.gltf=e;let t=e.skins[0];if(!t)throw Error(`SkinnedModel: no skin`);this.skin=t;let n=e.nodes.length;this.nodeCount=n,this.joints=t.joints.length,this.rest=e.nodes.map(e=>({t:Float32Array.from(e.t),r:Float32Array.from(e.r),s:Float32Array.from(e.s)})),this.local=e.nodes.map(e=>({t:Float32Array.from(e.t),r:Float32Array.from(e.r),s:Float32Array.from(e.s)})),this.world=new Float32Array(n*16),this._localM=new Float32Array(16),this.order=[],this.parent=new Int32Array(n).fill(-1);let r=t=>{this.order.push(t);for(let n of e.nodes[t].children)this.parent[n]=t,r(n)};for(let t of e.roots)r(t);this.jointData=new Float32Array(this.joints*32),this.jointBuffer=new k({label:`skinJoints`,count:this.joints*2,type:`mat4x4f`}),this._first=!0,this.clips=new Map;for(let t of e.animations)this.clips.set(t.name,t);this.layers=[],this._acc=e.nodes.map(()=>({t:new Float32Array(3),r:new Float32Array(4),s:new Float32Array(3),wt:0,wr:0,ws:0})),this._tmp=new Float32Array(4),this.group=new g,this.group.name=`SkinnedModel`,this.meshes=[],this.materials=[],this.onClipEnd=null,this.poseModifier=null,this._pose()}async _buildMeshes(e){let t=this.gltf,n=new Map;this.ownedTextures=n;let r=async(e,r)=>{if(!e)return null;let i=t.textures[e.index].source,a=i+(r?`s`:`l`);if(!n.has(a)){let e=t.images[i],o=await pn(e.bytes,e.mimeType),s=new A({label:`char`+i,width:o.width,height:o.height,format:r?`rgba8unorm-srgb`:`rgba8unorm`,data:o.data,mips:!0,usage:[`sample`,`copyDst`],sampler:`anisoRepeat`});s.getGPU(),Ae(s),n.set(a,s)}return n.get(a)},i=t.nodes.findIndex(e=>e.mesh!==void 0&&e.skin!==void 0),a=t.meshes[t.nodes[i].mesh],o=new Map;for(let n of a){let i=new D,a=n.attributes;i.setAttribute(`position`,new b(a.POSITION.array,3)),a.NORMAL&&i.setAttribute(`normal`,new b(a.NORMAL.array,3)),a.TEXCOORD_0&&i.setAttribute(`uv`,new b(xn(a.TEXCOORD_0),2)),i.setAttribute(`skinIndex`,new b(Uint32Array.from(a.JOINTS_0.array),4)),i.setAttribute(`skinWeight`,new b(Sn(xn(a.WEIGHTS_0)),4)),n.indices&&i.setIndex(new b(n.indices instanceof Uint32Array||n.indices instanceof Uint16Array?n.indices:Uint32Array.from(n.indices),1)),i.computeBoundingSphere();let s=o.get(n.material);if(!s){let i=t.materials[n.material]||{},a=i.pbrMetallicRoughness||{},c={gltfMaterial:i,name:i.name||`material`,textures:{albedo:await r(a.baseColorTexture,!0),orm:await r(a.metallicRoughnessTexture,!1),normal:await r(i.normalTexture,!1)},alphaMode:i.alphaMode||`OPAQUE`},l=e&&e(c)||{};s=gn({name:`skinned-`+c.name,joints:this.joints,jointBuffer:this.jointBuffer,textures:c.textures,alphaMode:c.alphaMode,alphaCutoff:i.alphaCutoff??.5,doubleSided:!!i.doubleSided,roughness:a.roughnessFactor??1,metalness:a.metallicFactor??1,...l}),o.set(n.material,s),this.materials.push(s)}let c=new y(i,s);c.name=`skinned:`+(t.materials[n.material]?.name||``),c.frustumCulled=!1,c.castShadow=!0,c.receiveShadow=!0,this.group.add(c),this.meshes.push(c)}}clipNames(){return[...this.clips.keys()]}enableAnimatedBounds(){for(let e of this.meshes){let t=e.geometry.attributes;e.skinBounds=new mn(t.position.array,t.skinIndex.array,t.skinWeight.array,this.joints),e.frustumCulled=e.skinBounds.update(this.jointData),e.geometry.boundingSphere=e.skinBounds.sphere}}clipDuration(e){let t=this.clips.get(e);return t?t.duration:0}play(e,{fade:t=.4,loop:n=!0,speed:r=1,from:i=0}={}){let a=this.clips.get(e);if(!a)throw Error(`SkinnedModel: no clip `+e);let o=this.layers.find(e=>e.clip===a&&e.target===1);if(o)return o;let s={clip:a,time:i,weight:+!this.layers.length,target:1,fade:Math.max(t,.001),loop:n,speed:r,ended:!1};for(let e of this.layers)e.target=0,e.fade=s.fade;return this.layers.push(s),s}get current(){let e=this.layers.find(e=>e.target===1);return e?e.clip.name:null}hold(){if(this._held)return;let e=this.joints,t=this.jointData;t.copyWithin(e*16,0,e*16),this.jointBuffer.write(t),this._held=!0}update(e){e===0&&(this._first=!0),this._held=!1;for(let t of this.layers){t.time+=e*t.speed;let n=t.clip.duration;t.time>=n&&(t.loop&&n>0?t.time%=n:(t.time=n,t.ended||(t.ended=!0,t.target===1&&this.onClipEnd&&this.onClipEnd(t.clip.name))));let r=e/t.fade;t.weight=t.target>t.weight?Math.min(t.target,t.weight+r):Math.max(t.target,t.weight-r)}this.layers=this.layers.filter(e=>e.target>0||e.weight>1e-4);let t=0;for(let e of this.layers)t+=e.weight;if(t>1e-4)for(let e of this.layers)e.weight/=t;this._pose()}_pose(){let e=this.nodeCount,t=this._acc,n=this._tmp;for(let n=0;n<e;n++){let e=t[n];e.wt=e.wr=e.ws=0,e.t.fill(0),e.r.fill(0),e.s.fill(0)}for(let e of this.layers)if(!(e.weight<=0))for(let r of e.clip.channels){let i=t[r.node];if(yn(r,e.time,n),r.path===`rotation`){let t=i.r[0]*n[0]+i.r[1]*n[1]+i.r[2]*n[2]+i.r[3]*n[3]<0?-e.weight:e.weight;for(let e=0;e<4;e++)i.r[e]+=n[e]*t;i.wr+=e.weight}else if(r.path===`translation`){for(let t=0;t<3;t++)i.t[t]+=n[t]*e.weight;i.wt+=e.weight}else{for(let t=0;t<3;t++)i.s[t]+=n[t]*e.weight;i.ws+=e.weight}}for(let n=0;n<e;n++){let e=t[n],r=this.local[n],i=this.rest[n];for(let t=0;t<3;t++)r.t[t]=e.t[t]+i.t[t]*(1-Math.min(e.wt,1)),r.s[t]=e.s[t]+i.s[t]*(1-Math.min(e.ws,1));if(e.wr>0){let t=1-Math.min(e.wr,1),n=e.r[0]*i.r[0]+e.r[1]*i.r[1]+e.r[2]*i.r[2]+e.r[3]*i.r[3]<0?-t:t,a=e.r[0]+i.r[0]*n,o=e.r[1]+i.r[1]*n,s=e.r[2]+i.r[2]*n,c=e.r[3]+i.r[3]*n,l=1/Math.hypot(a,o,s,c);r.r[0]=a*l,r.r[1]=o*l,r.r[2]=s*l,r.r[3]=c*l}else r.r.set(i.r)}this.poseModifier&&this.poseModifier(this.local,this.gltf.nodes);let r=this.world,i=this._localM;for(let e of this.order){let t=this.local[e];_n(i,0,t.t,t.r,t.s);let n=this.parent[e];n<0?r.set(i,e*16):vn(r,e*16,r,n*16,i,0)}let a=this.joints,o=this.jointData,s=this.skin.inverseBindMatrices;this._first||o.copyWithin(a*16,0,a*16);for(let e=0;e<a;e++)vn(o,e*16,r,this.skin.joints[e]*16,s,e*16);this._first&&=(o.copyWithin(a*16,0,a*16),!1);for(let e of this.meshes)e.skinBounds&&!e.skinBounds.update(o)&&(e.frustumCulled=!1);this.jointBuffer.write(o)}nodeWorld(e,t){let n=this.gltf.nodes.findIndex(t=>t.name===e);if(n<0)return null;let r=this.world;return t.set(r[n*16+12],r[n*16+13],r[n*16+14])}dispose(){this.jointBuffer.destroy();for(let e of this.meshes)e.geometry.dispose&&e.geometry.dispose();for(let e of this.ownedTextures?.values()||[])e.destroy();for(let e of this.materials)e.dispose()}};function xn(e){if(e.array instanceof Float32Array)return e.array;let t=e.normalized?1/(e.array instanceof Uint8Array?255:e.array instanceof Uint16Array?65535:1):1;return Float32Array.from(e.array,e=>e*t)}function Sn(e){for(let t=0;t<e.length;t+=4){let n=e[t]+e[t+1]+e[t+2]+e[t+3];if(n>0)for(let r=0;r<4;r++)e[t+r]/=n;else e[t]=1}return e}var Cn=6360,wn=6460,Tn=.00537625,En=256,Dn=64,On=32,kn=192,An=108,jn=Math.log(1.02),F=e=>{let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`};function Mn(e,t,n){return new A({label:n,width:e,height:t,format:`rgba16float`,usage:[`sample`,`storage`]})}function Nn(){return`
const ATMO_RG: f32 = ${F(Cn)};
const ATMO_RT: f32 = ${F(wn)};

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
	return vec2f( ( xMu + ${F(.5/En)} ) * ${F(En/257)}, ( xR + ${F(.5/Dn)} ) * ${F(Dn/65)} );
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
`}var Pn=class{constructor(e=null){this.renderer=e,this.transmittanceLUT=Mn(En,Dn,`atmoTransmittance`),this.multiScatLUT=Mn(On,On,`atmoMultiScat`),this.skyViewLUT=Mn(kn,An,`atmoSkyView`),this.params=new d(`AtmosphereParams`,{rayleighScale:[`f32`,1],mieScale:[`f32`,1],mieG:[`f32`,.8],ozoneScale:[`f32`,1],groundAlbedo:[`vec3f`,new o(.06,.08,.1)],viewHeight:[`f32`,6360.002],sunIlluminance:[`vec3f`,new o(11,11,11)],pad0:[`f32`,0],sunDir:[`vec3f`,new i(.3,.6,-.7).normalize()],pad1:[`f32`,0]},{label:`atmosphere`});let t=this.params.fields;this.rayleighScale=t.rayleighScale,this.mieScale=t.mieScale,this.mieG=t.mieG,this.ozoneScale=t.ozoneScale,this.groundAlbedo=t.groundAlbedo,this.viewHeight=t.viewHeight,this.sunIlluminance=t.sunIlluminance,this.sunDir=t.sunDir,this.irrBuffer=new k({label:`atmoIrr`,count:4,type:`vec4f`}),this.readback=new Jt({byteLength:48,label:`atmoIrrReadback`}),this.readback.onData=e=>this._onIrradiance(e),this._buildModules(),this._build(),this.needsStatic=!0,this._irrPending=!1,this._irrTimer=0,this.skyIrradiance=null,this.sunTransmittance=null,this.horizon=null,this.onIrradiance=null}_buildModules(){this.coreModule=new M({name:`atmosphereCore`,deps:[N],uniforms:this.params,uniformName:`atmosphereParams`,code:Nn()}),this.transmittanceModule=new M({name:`atmosphereTransmittance`,deps:[this.coreModule],bindings:{atmosphereTransmittanceLUT:{texture:this.transmittanceLUT}},code:`
fn atmosphereSampleTransmittance( r: f32, mu: f32 ) -> vec3f {
	return textureSampleLevel( atmosphereTransmittanceLUT, smpLinearClamp, atmosphereTransmittanceUV( r, mu ), 0.0 ).rgb;
}
// Transmittance from the viewer toward direction dir (for sun disk / sun light color).
fn atmosphereTransmittanceToSpace( dir: vec3f ) -> vec3f {
	return atmosphereSampleTransmittance( atmosphereParams.viewHeight, dir.y );
}
`}),this.multiScatModule=new M({name:`atmosphereMultiScat`,deps:[this.coreModule],bindings:{atmosphereMultiScatLUT:{texture:this.multiScatLUT}},code:`
fn atmosphereSampleMultiScat( r: f32, cosSun: f32 ) -> vec3f {
	let uv = vec2f( cosSun * 0.5 + 0.5, ( r - ATMO_RG ) / ( ATMO_RT - ATMO_RG ) );
	let suv = uv * ${F(31/On)} + ${F(.5/On)};
	return textureSampleLevel( atmosphereMultiScatLUT, smpLinearClamp, suv, 0.0 ).rgb;
}
`}),this.module=new M({name:`atmosphere`,deps:[this.transmittanceModule],bindings:{atmosphereSkyViewLUT:{texture:this.skyViewLUT}},code:`
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

	let suv = vec2f( u * ${F(191/kn)} + ${F(.5/kn)}, v * ${F(107/An)} + ${F(.5/An)} );
	return textureSampleLevel( atmosphereSkyViewLUT, smpLinearClamp, suv, 0.0 ).rgb;
}
`})}_build(){this.transmittanceKernel=new Vt({label:`Atmosphere Transmittance`,modules:[this.coreModule],bindings:{outLUT:{storageTexture:this.transmittanceLUT}},workgroupSize:[8,8,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let px = gid.xy;
	let uv = ( vec2f( px ) + 0.5 ) / vec2f( ${F(En)}, ${F(Dn)} );
	let xMu = ( uv.x - ${F(.5/En)} ) * ${F(En/255)};
	let xR = ( uv.y - ${F(.5/Dn)} ) * ${F(Dn/63)};
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
`}),this.multiScatKernel=new Vt({label:`Atmosphere MultiScat`,modules:[this.transmittanceModule],bindings:{outLUT:{storageTexture:this.multiScatLUT}},workgroupSize:[8,8,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let px = gid.xy;
	let uv = ( ( vec2f( px ) + 0.5 ) / ${F(On)} - ${F(.5/On)} ) * ${F(On/31)};
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
`}),this.skyViewKernel=new Vt({label:`Atmosphere SkyView`,modules:[this.transmittanceModule,this.multiScatModule],bindings:{outLUT:{storageTexture:this.skyViewLUT}},workgroupSize:[8,8,1],code:`
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let px = gid.xy;
	if ( px.x >= ${kn}u || px.y >= ${An}u ) { return; }
	let uv = ( vec2f( px ) + 0.5 ) / vec2f( ${F(kn)}, ${F(An)} );
	let u = ( uv.x - ${F(.5/kn)} ) * ${F(kn/191)};
	let v = ( uv.y - ${F(.5/An)} ) * ${F(An/107)};

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
	let rayPhase = ${F(3/(16*Math.PI))} * ( cosTheta * cosTheta + 1.0 );
	let g = atmosphereParams.mieG;
	let g2 = g * g;
	// Cornette-Shanks
	let miePhase = ${F(3/(8*Math.PI))} * ( ( 1.0 - g2 ) * ( cosTheta * cosTheta + 1.0 ) )
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
`}),this.irradianceKernel=new Vt({label:`Atmosphere Irradiance`,modules:[this.module],bindings:{irr:{storage:this.irrBuffer,access:`read_write`}},workgroupSize:[1,1,1],code:`
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
`})}update(e,t){let n=Math.max(.5,t+.5),r=n<100?Math.round(n/2)*2:Math.exp(Math.round(Math.log(n)/jn)*jn);this.viewHeight.value=Cn+Math.max(.001,r/1e3);let i=!1;this.needsStatic&&(this.needsStatic=!1,i=!0,this.transmittanceKernel.dispatch([En/8,Dn/8,1]),this.multiScatKernel.dispatch([On/8,On/8,1])),this.params._pack();let a=this.params.u32,o=this._svLast||=new Uint32Array(a.length);for(let e=0;e<a.length&&!i;e++)i=a[e]!==o[e];(i||!this._svValid)&&(o.set(a),this._svValid=!0,this.skyViewKernel.dispatch([kn/8,Math.ceil(An/8),1])),this._irrTimer-=e,this._irrTimer<=0&&!this._irrPending&&(this._irrTimer=.25,this.irradianceKernel.dispatch(1),this.readback.request(this.irrBuffer)&&(this._irrPending=!0))}_onIrradiance(e){let t=new Float32Array(e);this.skyIrradiance=[t[0],t[1],t[2]],this.sunTransmittance=[t[4],t[5],t[6]],this.horizon=[t[8],t[9],t[10]],this._irrPending=!1,this.onIrradiance&&this.onIrradiance(this)}invalidate(){this.needsStatic=!0,this._svValid=!1}},Fn=160,In=.1,Ln=new i(.3,.2,1).normalize(),Rn=.08,zn=e=>{let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},Bn=class{constructor(e){this.atmosphere=e,this.clouds=null,this.params=new d(`SkyParams`,{moonDir:[`vec3f`,new i(-.3,.5,.8).normalize()],sunDiskIntensity:[`f32`,1],starIntensity:[`f32`,0]},{label:`sky`}),this.sunDiskIntensity=this.params.fields.sunDiskIntensity,this.moonDir=this.params.fields.moonDir,this.starIntensity=this.params.fields.starIntensity,this._module=null,this._background=null}get module(){return this._module||=this._buildModule(),this._module}_buildModule(){let e=this.clouds,t=[N,this.atmosphere.module];e&&t.push(e.module);let n=t=>e?`let c = ${t}( dir );\n\treturn base * c.a + c.rgb;`:`return base;`;return new M({name:`sky`,deps:t,uniforms:this.params,uniformName:`skyParams`,code:`
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
	let r = ang / ${zn(Tn)};
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
	let uv = select( select( dir.xy / a.z, dir.xz / a.y, onY ), dir.yz / a.x, onX ) * ${zn(Fn)};
	let cell = vec3f( floor( uv ), face );
	let h = skyHash13( cell );
	let bx = dot( dir, vec3f( ${zn(Ln.x)}, ${zn(Ln.y)}, ${zn(Ln.z)} ) ) * 4.0;
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
	let sp = ( floor( uv ) + vec2f( skyHash13( cell + 3.1 ), skyHash13( cell + 5.7 ) ) * 0.4 + 0.3 ) / ${zn(Fn)};
	let sdir = normalize( select( select( vec3f( sp, sign( dir.z ) ), vec3f( sp.x, sign( dir.y ), sp.y ), onY ), vec3f( sign( dir.x ), sp ), onX ) );
	let d = length( dir - sdir ) * ${zn(Fn)};
	// flux relative to a magnitude 6.5 star; bright stars look bigger (glare), not just clipped
	let flux = pow( uc, -0.8 );
	let size = log2( flux ) * 0.08 + 1.0;
	let psf = exp( d * d / ( size * size ) * ${zn(-.5/(In*In))} ) / ( size * size );
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
	else { base = skyBackground( dir, ${zn(Rn)} ); }
	${n(`cloudsSample`)}
}

// Water reflections: no moon disk (the water's specular lobe reflects the key light) and only a
// trace of the stars, which rough water would spread into flickering sparkles.
fn skyReflectionRadiance( dir: vec3f ) -> vec3f {
	let base = skyBackground( dir, ${zn(Rn)} );
	${n(`cloudsSample`)}
}

// Main view background: full resolution clouds for the camera's view (the sun's disc behind them
// with cloudsSunTransmittance: no sun through the cut-off remainder of thick cloud)
fn skyViewRadiance( dir: vec3f ) -> vec3f {
	let base = skyBackground( dir, 1.0 ) + skyMoon( dir );
	let sun = skySunDisk( dir );
	${e?`let c = cloudsSampleView( dir );
	return base * c.a + sun * cloudsSunTransmittance( c.a ) + c.rgb;`:`return base + sun;`}
}
`})}get background(){if(!this._background){let e=new P({label:`sky background`,modules:[this.module],colorFormats:rn,depthFormat:an,depthCompare:`equal`,depthWrite:!1,depth:0,code:`
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
`});this._background={pass:e,draw:t=>e.draw(t)}}return this._background}backgroundNode(){return this.background}};function Vn(e,t=24,n=6,a=new i){let o=r.degToRad(t),s=r.degToRad(n),c=r.degToRad((e-12)*15),l=-Math.cos(s)*Math.sin(c),u=Math.cos(o)*Math.sin(s)-Math.sin(o)*Math.cos(s)*Math.cos(c),d=Math.sin(o)*Math.sin(s)+Math.cos(o)*Math.cos(s)*Math.cos(c);return a.set(l,d,-u).normalize()}var Hn=e=>{let t=Number(e).toString();return/[.eE]/.test(t)?t:t+`.0`},Un=Math.PI/180,Wn={atmosphere:{multipleScattering:.99},shape:{altitude:4e3,thickness:5200,density:.019,coverage:.49,horizonCoverageStart:2e4,horizonCoverageRamp:45e3,horizonCoverageAmount:.12,edgeSoftness:.095,edgeSoftnessFalloff:1,weatherScale:29e3,baseScale:7500,baseStrength:.69,erosionScaleBaseMultiplier:.13,erosionStrengthBase:.24,erosionStrengthPeak:2.15,erosionShape:1,baseWeatherStrength:.54,baseWeatherHeightStart:0,baseWeatherHeightEnd:.13},lighting:{scatteringAlbedo:1,powderStrength:.7,ambientIntensity:.7,groundBounceAlbedo:[.009134058699157796,.015208514418949472,.018500220124016652],baseShadowStrength:.88,baseShadowHeight:.13,moonGain:.65},wind:{speed:12,evolutionSpeed:60.8*12/89,skew:1750},fade:{hazeDensityScale:.62,horizonMeltStart:25e3,horizonMeltEnd:45e3},weather:{resolution:1024,mainMass:[4,5,0,1.32],detail:[6,6,1,.13],coverage:.26}},Gn={historyDivisor:2,lattice:4,maxSteps:256,lightTaps:6,stepMeters:25,fullLightingAlpha:.5,lightReuseSteps:3,historyWeight:.9},Kn=512,qn=160,Jn=4,Yn=256,Xn=3e4,Zn=()=>[0,0,0,0],Qn=`
const SC_EARTH: f32 = 6371.0;
const SC_FAR: f32 = 250000.0;
const SC_AP_DIST: f32 = ${Hn(Xn)};

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
`,$n=`
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
`,er=`
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
`,tr=class{constructor(e,t){this.renderer=e,this.atmosphere=t;let n=Wn,r=n.shape,a=n.lighting;this.frameBlock=new d(`SkyCloudFrame`,{position:[`vec4f`,Zn()],right:[`vec4f`,Zn()],up:[`vec4f`,Zn()],forward:[`vec4f`,Zn()],previousPosition:[`vec4f`,Zn()],previousRight:[`vec4f`,Zn()],previousUp:[`vec4f`,Zn()],previousForward:[`vec4f`,Zn()],viewport:[`vec4f`,Zn()],sampling:[`vec4f`,Zn()],clock:[`vec4f`,Zn()],wind:[`vec4f`,Zn()],windDelta:[`vec4f`,Zn()],march:[`vec4f`,Zn()],temporal:[`vec4f`,Zn()],display:[`vec4f`,Zn()],pano:[`vec4f`,Zn()],shadow:[`vec4f`,Zn()],lightOffsets:[`vec4f[8]`,new Float32Array(32)],lightLods:[`vec4f[8]`,new Float32Array(32)]},{label:`sky clouds frame`}),this.settingsBlock=new d(`SkyCloudSettings`,{shell:[`vec4f`,[r.altitude,r.thickness,r.density,r.coverage]],shape:[`vec4f`,[r.weatherScale,r.baseScale,r.baseStrength,r.erosionScaleBaseMultiplier]],erosion:[`vec4f`,[r.erosionStrengthBase,r.erosionStrengthPeak,r.erosionShape,r.baseWeatherHeightEnd]],base:[`vec4f`,[r.baseWeatherStrength,r.edgeSoftness,Math.log2(Math.max(r.edgeSoftnessFalloff,.001))*r.thickness*.001,r.baseWeatherHeightStart]],horizon:[`vec4f`,[r.horizonCoverageStart,r.horizonCoverageRamp,r.horizonCoverageAmount,0]],cloudLight:[`vec4f`,[a.scatteringAlbedo,a.powderStrength,a.ambientIntensity,n.atmosphere.multipleScattering]],shadow:[`vec4f`,[a.baseShadowStrength,a.baseShadowHeight,a.moonGain,0]],bounce:[`vec4f`,[...a.groundBounceAlbedo,0]],wind:[`vec4f`,[0,1,n.wind.skew,0]],fade:[`vec4f`,[n.fade.hazeDensityScale,n.fade.horizonMeltStart,n.fade.horizonMeltEnd,0]],weatherMass:[`vec4f`,n.weather.mainMass.slice()],weatherDetail:[`vec4f`,n.weather.detail.slice()],weather:[`vec4f`,[n.weather.coverage,0,0,0]]},{label:`sky clouds settings`}),this.F=this.frameBlock.fields,this.S=this.settingsBlock.fields,this.coverage={value:r.coverage},this.resolutionScale=1,this.outputSize=null,this.noise=new A({label:`cloud shape noise 64³`,width:64,height:64,depth:64,dimension:`3d`,format:`rgba8unorm`,usage:[`sample`,`copyDst`]}),this.blue=new A({label:`cloud blue noise`,width:64,height:64,format:`r8unorm`,usage:[`sample`,`copyDst`]});let o=n.weather.resolution;this.weatherMap=new A({label:`cloud weather`,width:o,height:o,format:`rgba8unorm`,usage:[`sample`,`storage`]}),this.weatherBounds=new A({label:`cloud weather bounds`,width:64,height:64,format:`rgba8unorm`,usage:[`sample`,`storage`]});let s=(e,t=4,n=4,r=`rgba16float`)=>new A({label:e,width:t,height:n,format:r,usage:[`sample`,`storage`]});this.source=s(`cloud radiance`),this.sourceMeta=s(`cloud depth + cost`),this.colors=[s(`cloud history A`),s(`cloud history B`)],this.metas=[s(`cloud history meta A`),s(`cloud history meta B`)],this.panorama=s(`cloud panorama`,Kn,qn),this.shadowMap=s(`cloud shadow`,Yn,Yn,`r32float`),this._pp=0,this.viewTex=this.colors[0],this.ready=this._loadNoise(),this._buildModules(),this._buildKernels(),this._w=0,this._h=0,this._scale=1,this.sourceWidth=1,this.sourceHeight=1,this.historyWidth=1,this.historyHeight=1,this.frameIndex=0,this.historyValid=!1,this.weatherDirty=!0,this.panoWarm=!0,this._windX=0,this._windZ=0,this._evolution=0,this._elapsed=0,this._prevCam=null,this._prevLight=new i,this._lastCoverage=-1}async _loadNoise(){let e=async e=>{let t=await fetch(`./clouds/`+e);if(!t.ok)throw Error(`clouds: ${e} HTTP ${t.status}`);return t},[n,r]=await Promise.all([e(`baseShape64.bin`),e(`blueNoise.bin`)]),i=new Uint8Array(await new Response(n.body.pipeThrough(new DecompressionStream(`gzip`))).arrayBuffer()),a=new DataView(i.buffer,i.byteOffset,i.byteLength);if(a.getUint32(0,!0)!==828004942)throw Error(`clouds: bad noise blob`);let o=[a.getUint16(6,!0),a.getUint16(8,!0),a.getUint16(10,!0)],s=a.getUint8(12),c=this.noise;c.gpu=t.device.createTexture({label:c.label,dimension:`3d`,size:o,mipLevelCount:s,format:`rgba8unorm`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),c.mipsOption=s,c._views.clear(),c.version++;let l=16;for(let e=0;e<s;e++){let n=o.map(t=>Math.max(1,t>>e)),r=n[0]*n[1]*n[2]*4;t.queue.writeTexture({texture:c.gpu,mipLevel:e},i,{offset:l,bytesPerRow:n[0]*4,rowsPerImage:n[1]},n),l+=r}this.blue.upload(new Uint8Array(await r.arrayBuffer()))}_buildModules(){let e=this.atmosphere;this.uniformModule=new M({name:`skyCloudsUniforms`,deps:[N],bindings:{scf:{uniform:this.frameBlock},scs:{uniform:this.settingsBlock}}}),this.coreModule=new M({name:`skyCloudsCore`,deps:[this.uniformModule],bindings:{scNoise:{texture:this.noise},scWeatherMap:{texture:this.weatherMap}},code:Qn}),this.marchModule=new M({name:`skyCloudsMarch`,deps:[this.coreModule,e.module,e.transmittanceModule],bindings:{scWeatherBounds:{texture:this.weatherBounds}},code:$n}),this.params=new d(`CloudsParams`,{viewRight:[`vec3f`,new i(1,0,0)],viewUp:[`vec3f`,new i(0,1,0)],viewFwd:[`vec3f`,new i(0,0,-1)],viewTan:[`vec2f`,new m(1,1)],viewValid:[`f32`,0],shadowCenter:[`vec2f`,new m],shadowSize:[`f32`,12e3],shadowStrength:[`f32`,.85]},{label:`clouds`});let t=this.params.fields;this.viewCam={right:t.viewRight,up:t.viewUp,fwd:t.viewFwd,tan:t.viewTan},this.viewValid=t.viewValid,this.shadowCenter=t.shadowCenter,this.shadowSize=t.shadowSize,this.shadowStrength=t.shadowStrength,this.shadowModule=new M({name:`cloudsShadow`,deps:[N],uniforms:this.params,uniformName:`cloudsParams`,bindings:{cloudsShadowMap:{texture:this.shadowMap}},code:`
// cloud shadow transmittance (1 = clear) at a world position. Manual bilinear filtering of an
// unfilterable texture: costs no sampler in the (sampler hungry) scene materials.
fn cloudsShadowTap( i: vec2i ) -> f32 { return textureLoad( cloudsShadowMap, clamp( i, vec2i( 0 ), vec2i( 255 ) ), 0 ).x; }
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
	let st = uv * ${Hn(Yn)} - 0.5;
	let i0 = vec2i( floor( st ) );
	let fr = fract( st );
	let s = mix( mix( cloudsShadowTap( i0 ), cloudsShadowTap( i0 + vec2i( 1, 0 ) ), fr.x ), mix( cloudsShadowTap( i0 + vec2i( 0, 1 ) ), cloudsShadowTap( i0 + vec2i( 1, 1 ) ), fr.x ), fr.y );
	let e = abs( uv - 0.5 );
	let inside = smoothstep( 0.5, 0.42, max( e.x, e.y ) );
	return mix( 1.0, s, cloudsParams.shadowStrength * inside );
}
`}),this.module=new M({name:`clouds`,deps:[N,this.shadowModule],uniforms:this.params,uniformName:`cloudsParams`,bindings:{cloudsPanorama:{texture:this.panorama},cloudsView:{texture:()=>this.viewTex}},code:`
// vec4( rgb in-scattered radiance, a transmittance ) for a view direction (panorama)
fn cloudsSample( dir: vec3f ) -> vec4f {
	let az = atan2( dir.z, dir.x );
	let u = fract( az / ${Hn(2*Math.PI)} );
	let elev = - acos( clamp( dir.y, -1.0, 1.0 ) ) + ${Hn(Math.PI/2)};
	let t = clamp( ( elev + ${Hn(4*Un)} ) / ${Hn(94*Un)}, 0.0, 1.0 );
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
`})}_buildKernels(){let e=`@compute @workgroup_size( WG_X, WG_Y, WG_Z ) fn main( @builtin( global_invocation_id ) id: vec3u )`,t=(e,t,n,r)=>new Vt({label:e,modules:t,bindings:n,code:r,workgroupSize:[8,8,1]});this.weatherKernel=t(`Cloud Weather`,[this.uniformModule],{scOut:{storageTexture:this.weatherMap}},er+`
${e} {
	let size = textureDimensions( scOut );
	if ( any( id.xy >= size ) ) { return; }
	let uv = vec2f( id.xy ) / vec2f( size );
	let mass = clamp( ( scFbm( uv, scs.weatherMass ) - 0.5 ) * scs.weatherMass.w + 0.5, 0.0, 1.0 );
	let detail = ( scFbm( uv, scs.weatherDetail ) * 2.0 - 1.0 ) * scs.weatherDetail.w;
	textureStore( scOut, id.xy, vec4f( clamp( mass + detail + scs.weather.x - 0.5, 0.0, 1.0 ), 0.0, 0.0, 1.0 ) );
}`),this.boundsKernel=t(`Cloud Weather Bounds`,[this.coreModule],{scOut:{storageTexture:this.weatherBounds}},`
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
}`),this.traceKernel=t(`Clouds Trace`,[this.marchModule],{scBlue:{texture:this.blue},scOutColor:{storageTexture:this.source},scOutMeta:{storageTexture:this.sourceMeta}},`
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
}`);let n=()=>this.colors[this._pp],r=()=>this.metas[this._pp],i=()=>this.colors[1-this._pp],a=()=>this.metas[1-this._pp];this.temporalKernel=new Vt({label:`Clouds Resolve`,modules:[this.coreModule],workgroupSize:[8,8,1],bindings:{scCurrentColor:{texture:this.source},scCurrentMeta:{texture:this.sourceMeta},scPreviousColor:{texture:i},scPreviousMeta:{texture:a},scOutputColor:{storageTexture:n},scOutputMeta:{storageTexture:r}},code:`
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
}`}),this.panoKernel=t(`Clouds Panorama`,[this.marchModule],{scPano:{storageTexture:this.panorama}},`
${e} {
	let size = textureDimensions( scPano );
	let texel = id.xy * u32( scf.pano.z ) + vec2u( scf.pano.xy );
	if ( any( texel >= size ) ) { return; }
	let uv = ( vec2f( texel ) + 0.5 ) / vec2f( size );
	let elev = uv.y * uv.y * ${Hn(94*Un)} - ${Hn(4*Un)};
	let az = uv.x * ${Hn(2*Math.PI)};
	let dir = vec3f( cos( elev ) * cos( az ), sin( elev ), cos( elev ) * sin( az ) );
	let cone = ${Hn(2*Math.PI/Kn)};
	let m = scMarch( scf.position.xyz, dir, 0.5, cone, cone, 128u, true );
	textureStore( scPano, texel, vec4f( m.color, 1.0 - m.alpha ) );
}`),this.shadowKernel=t(`Clouds Shadow`,[this.marchModule],{scShadow:{storageTexture:this.shadowMap}},`
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
}`)}_drawingBufferSize(){if(this.outputSize)return this.outputSize;let e=ve.fields.outputResolution.value;if(e&&e.x>0)return e;let n=t.canvas;return{x:n?n.width:1280,y:n?n.height:720}}_allocate(e,t){let n=Gn,r=this.resolutionScale;this.sourceWidth=Math.max(1,Math.ceil(e*r/n.historyDivisor/n.lattice)),this.sourceHeight=Math.max(1,Math.ceil(t*r/n.historyDivisor/n.lattice)),this.historyWidth=this.sourceWidth*n.lattice,this.historyHeight=this.sourceHeight*n.lattice,this.source.resize(this.sourceWidth,this.sourceHeight),this.sourceMeta.resize(this.sourceWidth,this.sourceHeight);for(let e of[...this.colors,...this.metas])e.resize(this.historyWidth,this.historyHeight);this.historyValid=!1}update(e,t){let n=Gn,i=Wn,a=this.F,o=this.S;e=Math.min(.1,Math.max(0,e));let s=this._drawingBufferSize();(s.x!==this._w||s.y!==this._h||this.resolutionScale!==this._scale)&&(this._w=s.x,this._h=s.y,this._scale=this.resolutionScale,this._allocate(s.x,s.y));let c=this.coverage.value;c!==this._lastCoverage&&(o.shell.value[3]=c,this._lastCoverage=c,this.historyValid=!1,this.panoWarm=!0);let l=he.windDir.value,u=Math.hypot(l.x,l.y)||1,d=l.x/u,f=l.y/u;if(o.wind.value[0]=d,o.wind.value[1]=f,this.weatherDirty){let e=this.weatherMap.width;this.weatherKernel.dispatch([e/8,e/8,1]),this.boundsKernel.dispatch([8,8,1]),this.weatherDirty=!1}t.updateMatrixWorld();let p=t.matrixWorld.elements,m=t.position,h=Math.tan(r.degToRad(t.fov*.5))/(t.zoom||1),g=t.aspect,_=[p[0],p[1],p[2]],v=[p[4],p[5],p[6]],y=[-p[8],-p[9],-p[10]],b=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},x=b(_),S=b(v),C=b(y),w={position:[m.x,m.y,m.z,h],right:[...x,g],up:[...S,0],forward:[...C,0]},T=this._prevCam;(!T||Math.hypot(m.x-T.position[0],m.y-T.position[1],m.z-T.position[2])>1e3||C[0]*T.forward[0]+C[1]*T.forward[1]+C[2]*T.forward[2]<.7||Math.abs(h-T.position[3])>.01)&&(this.historyValid=!1);let E=he.sunDir.value;E.dot(this._prevLight)<.999&&(this.historyValid=!1,this.panoWarm=!0),this._prevLight.copy(E);let ee=this.historyValid&&T?T:w;a.position.value=w.position,a.right.value=w.right,a.up.value=w.up,a.forward.value=w.forward,a.previousPosition.value=ee.position,a.previousRight.value=ee.right,a.previousUp.value=ee.up,a.previousForward.value=ee.forward,this._prevCam=w;let te=n.lattice,ne=this.frameIndex%(te*te),re=0,ie=0;for(let e=0;1<<e<te;e++){let t=ne>>e*2&3;re|=(t>>1^t&1)<<Math.log2(te)-e-1,ie|=(t&1)<<Math.log2(te)-e-1}a.viewport.value=[s.x*this.resolutionScale,s.y*this.resolutionScale,this.historyWidth,this.historyHeight],a.sampling.value=[re,ie,te,+!!this.historyValid],this._elapsed+=e;let ae=i.wind.speed,oe=d*ae*e,se=f*ae*e;this._windX+=oe,this._windZ+=se,this._evolution+=i.wind.evolutionSpeed*e,a.clock.value=[this.frameIndex%4096,this._elapsed,e,0],a.wind.value=[this._windX,this._windZ,this._evolution,0],a.windDelta.value=[oe,se,0,0],a.march.value=[n.stepMeters,n.maxSteps,n.lightTaps,n.fullLightingAlpha],a.temporal.value=[n.historyWeight,Math.min(1,i.wind.evolutionSpeed*e/100),0,0],a.display.value=[0,n.lightReuseSteps,0,0];let ce=E.x,D=E.y,O=E.z,le=O,k=0,A=-ce;Math.abs(D)>.99&&(le=0,k=-O,A=D);let j=1/Math.hypot(le,k,A);le*=j,k*=j,A*=j;let ue=D*A-O*k,de=O*le-ce*A,fe=ce*k-D*le,pe=a.lightOffsets.value,me=a.lightLods.value;pe[0]=0,pe[1]=0,pe[2]=0,pe[3]=25;let M=i.shape;for(let e=1;e<8;e++){let t=1.7**e,r=25*((t-1)/.7+t*.5),i=e*2.399963,a=Math.sqrt((e+.5)/n.lightTaps),o=Math.cos(i)*a*.05*r,s=Math.sin(i)*a*.05*r,c=e*4;pe[c]=ce*r+le*o+ue*s,pe[c+1]=D*r+k*o+de*s,pe[c+2]=O*r+A*o+fe*s,pe[c+3]=25*t;let l=r*.1;me[c]=Math.max(0,Math.log2(l*64/M.baseScale)),me[c+1]=Math.max(0,Math.log2(l*64/(M.baseScale*M.erosionScaleBaseMultiplier)))}let ge=this.frameIndex%4;if(ge===0||!this._shadowInit){let e=this.shadowSize.value/Yn*4;this.shadowCenter.value.set(Math.round(m.x/e)*e,Math.round(m.z/e)*e)}a.shadow.value=[this.shadowCenter.value.x,this.shadowCenter.value.y,this.shadowSize.value,ge];let _e=he.cameraUnderwater&&he.cameraUnderwater.value>.5;if(this._shadowInit?this.shadowKernel.dispatch([Yn/8,Yn/32,1]):(a.shadow.value=[this.shadowCenter.value.x,this.shadowCenter.value.y,this.shadowSize.value,-1],this.shadowKernel.dispatch([Yn/8,Yn/8,1]),this._shadowInit=!0),this.panoWarm)a.pano.value=[0,0,1,0],this.panoKernel.dispatch([Kn/8,qn/8,1]),this.panoWarm=!1;else{let e=this.frameIndex%16;a.pano.value=[e%Jn,Math.floor(e/Jn),Jn,0],this.panoKernel.dispatch([Math.ceil(Kn/Jn/8),Math.ceil(qn/Jn/8),1])}if(_e)this.viewValid.value=0,this.historyValid=!1;else{this.traceKernel.dispatch([Math.ceil(this.sourceWidth/8),Math.ceil(this.sourceHeight/8),1]),this.temporalKernel.dispatch([Math.ceil(this.historyWidth/8),Math.ceil(this.historyHeight/8),1]),this.viewTex=this.colors[this._pp],this._pp=1-this._pp;let e=this.viewCam;e.right.value.set(x[0],x[1],x[2]),e.up.value.set(S[0],S[1],S[2]),e.fwd.value.set(C[0],C[1],C[2]),e.tan.value.set(h*g,h),this.viewValid.value=1,this.historyValid=!0}this.frameIndex++}resetHistory(){this.historyValid=!1}invalidate(){this.panoWarm=!0,this.resetHistory()}},nr=class{constructor(e,t=e.label){let n=e.width;if(e.height!==n||n&n-1||n<32||n>512)throw Error(`ComputeMips: square power-of-two 32..512 only`);this.res=n,this.layers=e.dimension===`3d`?1:e.depth;let r=e.mipLevelCount,i=Math.min(5,r-1),a=t=>({storageTexture:e,access:`write`,view:{dimension:`2d-array`,baseMipLevel:t,mipLevelCount:1}}),o=t=>({texture:e,view:{dimension:`2d-array`,baseMipLevel:t,mipLevelCount:1}}),s=(e,t,n,r)=>`
	if ( lx < ${n}u && ly < ${n}u ) {
		let i = ly * ${4*n}u + lx * 2u;
		let v = ( ${e}[ i ] + ${e}[ i + 1u ] + ${e}[ i + ${2*n}u ] + ${e}[ i + ${2*n+1}u ] ) * 0.25;
		textureStore( out${r}, vec2u( gx * ${n}u + lx, gy * ${n}u + ly ), layer, v );
		${t?`${t}[ ly * ${n}u + lx ] = v;`:``}
	}
	workgroupBarrier();`,c={src0:o(0)},l=``;for(let e=1;e<=i;e++)c[`out`+e]=a(e);for(let e=2,t=8;e<=i;e++,t>>=1)l+=s(`s`+(e-1),e<i?`s`+e:null,t,e);this.kernelA=new Vt({label:t+` mips A`,bindings:c,workgroupSize:[16,16,1],code:`
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
${l}
}`}),this.kernelB=null;let u=n>>5;if(r>6&&u>1){let e={src5:o(5)},n=``,i=``,c=`s5`;for(let t=6,o=u>>1;t<r&&o>=1;t++,o>>=1){e[`out`+t]=a(t);let l=o>1&&t<r-1?`s`+t:null;l&&(i+=`var<workgroup> ${l}: array<vec4f, ${o*o}>;\n`),n+=s(c,l,o,t),c=l}this.kernelB=new Vt({label:t+` mips B`,bindings:e,workgroupSize:[u,u,1],code:`
var<workgroup> s5: array<vec4f, ${u*u}>;
${i}
@compute @workgroup_size( WG_X, WG_Y, WG_Z )
fn main( @builtin( local_invocation_id ) lid: vec3u, @builtin( workgroup_id ) wid: vec3u ) {
	let lx = lid.x; let ly = lid.y; let layer = wid.z;
	let gx = 0u; let gy = 0u;
	s5[ ly * ${u}u + lx ] = textureLoad( src5, vec2u( lx, ly ), layer, 0 );
	workgroupBarrier();
${n}
}`})}}dispatch(e=null){let t=e?{pass:e}:void 0;this.kernelA.dispatch([this.res/32,this.res/32,this.layers],t),this.kernelB&&this.kernelB.dispatch([1,1,this.layers],t)}},rr=6,ir=32,ar=e=>{let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},or=`
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
`,sr=class{constructor(e,t,n,r=128){this.renderer=e,this.scene=t,this.sky=n,this.size=r,t&&(t.environmentIntensity=1),this.source=new A({label:`envSource`,width:r,height:r,dimension:`cube`,format:`rgba16float`,mips:!0,usage:[`sample`,`storage`,`render`]});let a=e=>new A({label:e,width:r,height:r,dimension:`cube`,format:`rgba16float`,mips:rr,usage:[`sample`,`storage`]});this.targets=[a(`envSpecularA`),a(`envSpecularB`)],this.front=0,this.sh=[new k({label:`envSH_A`,count:9,type:`vec4f`,data:cr()}),new k({label:`envSH_B`,count:9,type:`vec4f`})],this.lastSun=new i(0,-2,0),this.timer=0,this.interval=3,this.step=-1,this.primed=!1,this._build(),this.steps=this._buildSteps()}_build(){let e=this.sky,t=this.size;this.faceParams=[],this.faceKernels=[];for(let n=0;n<6;n++)this.faceKernels.push(new Vt({label:`Env Face `+n,modules:[N,e.module],bindings:{outCube:{storageTexture:this.source,viewDimension:`2d-array`}},workgroupSize:[8,8,1],code:`${or}
@compute @workgroup_size( WG_X, WG_Y, WG_Z ) fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	if ( gid.x >= ${t}u || gid.y >= ${t}u ) { return; }
	let dir = envCubeDir( ${n}u, gid.x, gid.y, ${t}u );
	// no sun or moon disk: the key light is lit directly
	textureStore( outCube, gid.xy, ${n}, vec4f( skyRadianceWithClouds( dir, false ), 1.0 ) );
}`}));this.filterKernels=[[],[]];for(let e=0;e<2;e++)for(let n=0;n<rr;n++){let r=n/5,i=t>>n;this.filterKernels[e].push(new Vt({label:`Env GGX `+n,modules:[N],bindings:{srcCube:{texture:this.source,viewDimension:`cube`},outCube:{storageTexture:this.targets[e],view:{dimension:`2d-array`,baseMipLevel:n,mipLevelCount:1}}},workgroupSize:[8,8,1],code:`${or}
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
	if ( gid.x >= ${i}u || gid.y >= ${i}u ) { return; }
	let N = envCubeDir( gid.z, gid.x, gid.y, ${i}u );
${n===0?`
	textureStore( outCube, gid.xy, gid.z, vec4f( textureSampleLevel( srcCube, smpLinearClamp, N, 0.0 ).rgb, 1.0 ) );
}`:`
	// filtered importance sampling (Karis 2013 / GPU Gems 3 ch. 20), N = V = R
	let alpha = ${ar(r*r)};
	let a2 = alpha * alpha;
	let tb = basis( N );
	const COUNT = 96u;
	let saTexel = ${ar(4*Math.PI/(6*t*t))};
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
			let lod = clamp( 0.5 * log2( saSample / saTexel ) + 1.0, 0.0, ${ar(Math.log2(t))} );
			sum += textureSampleLevel( srcCube, smpLinearClamp, L, lod ).rgb * NdotL;
			wsum += NdotL;
		}
	}
	textureStore( outCube, gid.xy, gid.z, vec4f( sum / max( wsum, 1e-4 ), 1.0 ) );
}`}`}))}let n=Math.max(0,Math.log2(t/ir));this.shKernels=[0,1].map(e=>new Vt({label:`Env SH`,modules:[N],bindings:{srcCube:{texture:this.source,viewDimension:`2d-array`},shOut:{storage:this.sh[e],access:`read_write`}},workgroupSize:[128,1,1],code:`${or}
var<workgroup> acc: array<array<vec3f, 9>, 128>;
@compute @workgroup_size( 128 ) fn main( @builtin( local_invocation_index ) li: u32 ) {
	var c: array<vec3f, 9>;
	for ( var k = 0; k < 9; k++ ) { c[ k ] = vec3f( 0.0 ); }
	let total = 6144u;
	for ( var idx = li; idx < total; idx += 128u ) {
		let face = idx / 1024u;
		let r = idx % 1024u;
		let x = r % ${ir}u; let y = r / ${ir}u;
		let d = envCubeDir( face, x, y, ${ir}u );
		// solid angle of the texel
		let u = ( f32( x ) + 0.5 ) / ${ar(ir)} * 2.0 - 1.0;
		let v = ( f32( y ) + 0.5 ) / ${ar(ir)} * 2.0 - 1.0;
		let tmp = 1.0 + u * u + v * v;
		let w = 4.0 / ( sqrt( tmp ) * tmp ) * ${ar(1/1024)};
		let L = textureLoad( srcCube, vec2u( x, y ), face, ${n} ).rgb * w;
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
}`})),this.envUniforms=new d(`EnvParams`,{levels:[`f32`,5]},{label:`env`}),Ye.set(`envSpecular`,new M({name:`hook-envSpecular`,deps:[N],uniforms:this.envUniforms,uniformName:`envParams`,bindings:{envSpecularCube:{texture:()=>this.targets[this.front],viewDimension:`cube`}},code:`
fn hookEnvSpecular( R: vec3f, roughness: f32 ) -> vec3f {
	return textureSampleLevel( envSpecularCube, smpLinearClamp, R, roughness * envParams.levels ).rgb * frame.envIntensity;
}
`})),Ye.set(`envDiffuse`,new M({name:`hook-envDiffuse`,deps:[N],bindings:{envSH:{storage:()=>this.sh[this.front],access:`read`,type:`vec4f`}},code:`
fn hookEnvDiffuse( N: vec3f ) -> vec3f {
	let d = N;
	var e = envSH[ 0 ].rgb * 0.282095
		+ envSH[ 1 ].rgb * 0.488603 * d.y + envSH[ 2 ].rgb * 0.488603 * d.z + envSH[ 3 ].rgb * 0.488603 * d.x
		+ envSH[ 4 ].rgb * 1.092548 * d.x * d.y + envSH[ 5 ].rgb * 1.092548 * d.y * d.z
		+ envSH[ 6 ].rgb * 0.315392 * ( 3.0 * d.z * d.z - 1.0 ) + envSH[ 7 ].rgb * 1.092548 * d.x * d.z
		+ envSH[ 8 ].rgb * 0.546274 * ( d.x * d.x - d.y * d.y );
	return max( e, vec3f( 0.0 ) ) * frame.envIntensity;
}
`}))}_buildSteps(){let e=[],t=this.size;for(let n=0;n<6;n++)e.push(()=>this.faceKernels[n].dispatch([t/8,t/8,1]));let n=this._mips||=new nr(this.source,`envSource`);e.push(()=>n.dispatch());for(let n=0;n<rr;n++){let r=Math.max(1,Math.ceil((t>>n)/8));e.push(()=>this.filterKernels[1-this.front][n].dispatch([r,r,6]))}return e.push(()=>this.shKernels[1-this.front].dispatch(1)),e.push(()=>{this.front=1-this.front}),e}update(e,t=!1){this.timer-=e;let n=this.sky.atmosphere.sunDir.value;if(t||!this.primed){this.primed=!0,this.timer=this.interval,this.lastSun.copy(n);for(let e of this.steps)e();this.step=-1}else{if(this.step<0){if(!(n.angleTo(this.lastSun)>.004)&&this.timer>0)return;this.timer=this.interval,this.lastSun.copy(n),this.step=0}this.steps[this.step++](),this.step===this.steps.length&&(this.step=-1)}}get texture(){return this.targets[this.front]}};function cr(){let e=new Float32Array(36),t=[.3,.4,.6];for(let n=0;n<3;n++)e[n]=t[n]/.282095;return e}var lr={terrainSize:2048,terrainRes:2048,beach:{xMin:-150,xMax:170},pier:{x:55,zStart:-64,zEnd:40,deckHeight:2.3,width:2.6,headWidth:14,headDepth:7},boatDock:{position:new i(64.5,0,36.5),heading:0},village:{center:new i(40,0,-118),radius:95},reef:{center:new i(-78,0,58),radius:58},spawn:{position:new i(18,0,-60),yaw:Math.PI},start:{position:new i(53.6,0,-77),yaw:Math.PI},swellDir:new m(-.12,-1).normalize()},ur=e=>Math.min(1,Math.max(0,e)),I=(e,t,n)=>e+(t-e)*n,dr=(e,t,n)=>{let r=ur((n-e)/(t-e));return r*r*(3-2*r)},fr=[4,4,3,3,8,10],pr=1025,mr=class{constructor(){this.zAft=-3.9,this.zBow=4.3,this.length=this.zBow-this.zAft,this.deckY=.35,this.shell=.07,this.houseBack=-.35,this.houseFront=1.45;let e=.2,t=.45,n=this.keelY(1),r=this.sheerY(1),i=this.zBow-e*r,a=Math.sqrt(1.04),o=n+t;this.stem={k:e,R:t,yF:n,zW:i,yc:o,zc:i+e*o-t*a,yT:o-t*e/a},this._setback=new Map,this._sectionCache=new Map,this.analyze()}sheerZ(e){return this.zAft+this.length*e}tAtSheerZ(e){return ur((e-this.zAft)/this.length)}sheerY(e){let t=Math.max(0,1-e/.2);return .98+.62*e**2.2+.04*t*t}sheerX(e){if(e<=.42){let t=1-e/.42;return 1.45-.17*t*t}return 1.45*(1-((e-.42)/.58)**2.6)}keelY(e){return e<=.45?-.23-.22*Math.sin(Math.PI*.5*e/.45):-.45+.33*dr(.45,1,e)**1.6}chineX(e){if(e<=.42){let t=1-e/.42;return 1.26-.1*t*t}let t=(e-.42)/.58;return 1.26*Math.max(0,1-t**1.7)**1.15}chineY(e){return I(.01,-.045,dr(0,.45,e))+.33*dr(.5,1,e)**1.3}bilgeTangent(e){return I(.2,.24,dr(0,.4,e))*(1-.55*dr(.6,1,e))}bottomConvexity(e){return I(.025,.012,dr(.55,.95,e))}flare(e){return I(-.012,.075,dr(.3,.85,e))*(1-.3*dr(.9,1,e))}bowBlend(e){return e>.55?((e-.55)/.45)**2:0}stemZ(e){let t=this.stem;if(e>=t.yT)return t.zW+t.k*e;let n=e-t.yc;return t.zc+Math.sqrt(Math.max(0,t.R*t.R-n*n))}controlPoints(e){let t=[0,this.keelY(e)],n=[this.chineX(e),this.chineY(e)],r=[this.sheerX(e),this.sheerY(e)],i=n[0]-t[0],a=n[1]-t[1],o=Math.hypot(i,a),s=i/o,c=a/o,l=r[0]-n[0],u=r[1]-n[1],d=Math.hypot(l,u),f=l/d,p=u/d,m=dr(0,.3,n[0]),h=Math.min(this.bilgeTangent(e),.3*o,.3*d),g=this.bottomConvexity(e)*o*m,_=[t[0]+s*o*.5+c*g,t[1]+c*o*.5-s*g],v=[n[0]-s*h,n[1]-c*h],y=[n[0]+f*h,n[1]+p*h],b=Math.acos(Math.min(1,Math.max(-1,s*f+c*p))),x=f-s,S=p-c,C=Math.hypot(x,S),w=C>1e-6?h*Math.tan(b/4)/C:0,T=[n[0]+x*w,n[1]+S*w],E=this.flare(e)*d*m;return[t,_,v,T,y,[n[0]+f*d*.5-p*E,n[1]+p*d*.5+f*E],r]}sectionPoints(e,t=1){let n=e+`:`+t,r=this._sectionCache.get(n);if(r)return r;let i=this.controlPoints(e),a=i.length,o=[[2*i[0][0]-i[1][0],2*i[0][1]-i[1][1]],...i,[2*i[a-1][0]-i[a-2][0],2*i[a-1][1]-i[a-2][1]]],s=fr.reduce((e,t)=>e+t,0)*t+1,c=new Float64Array(s*2),l=0,u=[0,0];for(let e=0;e<fr.length;e++){let n=fr[e]*t;for(let t=0;t<n;t++)hr(o[e],o[e+1],o[e+2],o[e+3],t/n,u),c[l++]=Math.max(0,u[0]),c[l++]=u[1]}return c[l++]=i[a-1][0],c[l++]=i[a-1][1],this._sectionCache.size>4096&&this._sectionCache.clear(),this._sectionCache.set(n,c),c}setback(e=1){let t=this._setback.get(e);if(t)return t;let n=this.sectionPoints(1,e),r=n.length/2;t=new Float64Array(r);for(let e=0;e<r;e++)t[e]=this.zBow-this.stemZ(n[2*e+1]);return t[r-1]=0,this._setback.set(e,t),t}sectionCount(e=1){return fr.reduce((e,t)=>e+t,0)*e+1}station(e,t=1){let n=this.sectionPoints(e,t),r=this.setback(t),a=this.sheerZ(e),o=this.bowBlend(e),s=[];for(let e=0;e<r.length;e++)s.push(new i(n[2*e],n[2*e+1],a-o*r[e]));return s}stationParams(e){let t=e=>1+2.2*dr(.62,1,e)+.5*(1-dr(0,.08,e)),n=2e3,r=new Float64Array(2001);for(let e=1;e<=n;e++)r[e]=r[e-1]+t((e-.5)/n)/n;let i=r[n],a=[],o=0;for(let t=0;t<e;t++){let s=i*t/(e-1);for(;o<n&&r[o+1]<s;)o++;let c=(s-r[o])/Math.max(1e-12,r[o+1]-r[o]);a.push(t===e-1?1:(o+ur(c))/n)}return a}halfBreadth(e,t){let n=this.sectionPoints(e,2),r=n.length/2;if(t>=n[2*r-1])return n[2*r-2];for(let e=r-2;e>=0;e--){let r=n[2*e+1],i=n[2*e+3];if(t>=r&&t<=i){let a=(t-r)/Math.max(1e-9,i-r);return I(n[2*e],n[2*e+2],a)}}return 0}tAt(e,t){let n=0,r=1;for(let i=0;i<40;i++){let i=(n+r)*.5;this.zOnStation(i,t)<e?n=i:r=i}return(n+r)*.5}zOnStation(e,t){let n=this.bowBlend(e);if(n===0)return this.sheerZ(e);let r=this.sectionPoints(e,2),i=this.setback(2),a=r.length/2,o=0;if(t<=r[1])o=i[0];else if(t>=r[2*a-1])o=0;else for(let e=0;e<a-1;e++){let n=r[2*e+1],a=r[2*e+3];if(t>=n&&t<=a){o=I(i[e],i[e+1],(t-n)/Math.max(1e-9,a-n));break}}return this.sheerZ(e)-n*o}hullXAt(e,t){return this.halfBreadth(this.tAt(e,t),t)}analyze(){let e=this.setback(3),t=e.length,n=[];for(let r=0;r<=480;r++){let i=r/480,a=this.sectionPoints(i,3),o=this.sheerZ(i),s=this.bowBlend(i);for(let r=0;r<t-1;r++){let t=a[2*r+1],i=a[2*r+3];if(t<=0&&i>0){let c=-t/(i-t);n.push([o-s*I(e[r],e[r+1],c),I(a[2*r],a[2*r+2],c)]);break}}}n.sort((e,t)=>e[0]-t[0]),this.wlStart=n[0][0],this.wlEnd=n[n.length-1][0],this._beamTable=new Float64Array(513),this._tableZ0=this.wlStart,this._tableDz=(this.wlEnd-this.wlStart)/512;let r=0;for(let e=0;e<=512;e++){let t=this.wlStart+e*this._tableDz;for(;r<n.length-2&&n[r+1][0]<t;)r++;let i=n[r],a=n[r+1],o=ur((t-i[0])/Math.max(1e-9,a[0]-i[0]));this._beamTable[e]=I(i[1],a[1],o)}let a=.02,o=this.zAft-.02,s=Math.ceil((this.wlEnd+.05-o)/a),c=new Float32Array(75*s).fill(1/0),l=[];for(let n=0;n<=480;n++){let r=n/480,i=this.sectionPoints(r,3),a=this.sheerZ(r),o=this.bowBlend(r),s=new Float64Array(t*3);for(let n=0;n<t;n++)s[3*n]=i[2*n],s[3*n+1]=i[2*n+1],s[3*n+2]=a-o*e[n];l.push(s)}let u=(e,t,n)=>{if(Math.min(e[1],t[1],n[1])>.01)return;let r=Math.min(e[0],t[0],n[0]),i=Math.max(e[0],t[0],n[0]),l=Math.min(e[2],t[2],n[2]),u=Math.max(e[2],t[2],n[2]),d=Math.max(0,Math.ceil((r-0)/a-.5)),f=Math.min(74,Math.floor((i-0)/a-.5)),p=Math.max(0,Math.ceil((l-o)/a-.5)),m=Math.min(s-1,Math.floor((u-o)/a-.5));if(d>f||p>m)return;let h=(t[2]-n[2])*(e[0]-n[0])+(n[0]-t[0])*(e[2]-n[2]);if(!(Math.abs(h)<1e-12))for(let r=p;r<=m;r++){let i=o+(r+.5)*a;for(let o=d;o<=f;o++){let s=0+(o+.5)*a,l=((t[2]-n[2])*(s-n[0])+(n[0]-t[0])*(i-n[2]))/h,u=((n[2]-e[2])*(s-n[0])+(e[0]-n[0])*(i-n[2]))/h,d=1-l-u;if(l<-1e-9||u<-1e-9||d<-1e-9)continue;let f=l*e[1]+u*t[1]+d*n[1],p=r*75+o;f<c[p]&&(c[p]=f)}}},d=[0,0,0],f=[0,0,0],p=[0,0,0],m=[0,0,0],h=(e,t,n)=>(n[0]=e[3*t],n[1]=e[3*t+1],n[2]=e[3*t+2],n);for(let e=0;e<480;e++)for(let n=0;n<t-1;n++)h(l[e],n,d),h(l[e+1],n,f),h(l[e+1],n+1,p),h(l[e],n+1,m),u(d,f,p),u(d,p,m);this._field={bottom:c,nx:75,nz:s,cell:a,x0:0,z0:o};let g=0,_=0,v=0,y=0,b=0;for(let e=0;e<s;e++){let t=o+(e+.5)*a;for(let n=0;n<75;n++){let r=c[e*75+n];if(!(r<0))continue;let i=a*a*2;g+=i,v+=i*t,_+=i*-r,y+=i*-r*t,b+=i*-r*(r*.5)}}this.waterplaneArea=g,this.canoeVolume=_,this.centerOfFlotationZ=v/g,this.centerOfBuoyancy=new i(0,b/_,y/_)}halfBeamAt(e){if(e<this.wlStart||e>this.wlEnd)return 0;let t=(e-this._tableZ0)/this._tableDz,n=Math.min(this._beamTable.length-2,Math.max(0,Math.floor(t)));return I(this._beamTable[n],this._beamTable[n+1],ur(t-n))}draftAt(e){let{bottom:t,nx:n,nz:r,cell:i,z0:a}=this._field,o=(e-a)/i-.5;if(o<-.5||o>r-.5)return 0;let s=Math.min(r-2,Math.max(0,Math.floor(o))),c=t[s*n],l=t[(s+1)*n];return I(c<0?-c:0,l<0?-l:0,ur(o-s))}bottomAt(e,t){let{bottom:n,nx:r,nz:i,cell:a,x0:o,z0:s}=this._field,c=Math.floor((Math.abs(e)-o)/a),l=Math.floor((t-s)/a);return c<0||c>=r||l<0||l>=i?1/0:n[l*r+c]}buildHullSamples(e=8){let{bottom:t,nx:n,nz:r,cell:a,x0:o,z0:s}=this._field,c=this.wlEnd-this.wlStart,l=[];for(let t=0;t<e;t++)l.push([0,1].map(()=>({a:0,x2:0,z:0,v:0})));for(let i=0;i<r;i++){let r=s+(i+.5)*a,u=Math.min(e-1,Math.max(0,Math.floor((r-this.wlStart)/c*e))),d=this.halfBeamAt(r);for(let e=0;e<n;e++){let s=t[i*n+e];if(!(s<0))continue;let c=o+(e+.5)*a,f=+(d>0&&c>d*.5),p=a*a,m=l[u][f];m.a+=p,m.x2+=p*c*c,m.z+=p*r,m.v+=p*-s}}let u=[];for(let t=0;t<e;t++)for(let e=0;e<2;e++){let n=l[t][e];if(n.a<=0)continue;let r=Math.sqrt(n.x2/n.a),a=n.z/n.a,o=-n.v/n.a,s=Math.min(0,this.bottomAt(r,a));u.push({position:new i(r,o,a),area:n.a,depth:-o,bottomY:s}),u.push({position:new i(-r,o,a),area:n.a,depth:-o,bottomY:s})}return u}};function hr(e,t,n,r,i,a){let o=Math.max(1e-5,Math.sqrt(Math.hypot(t[0]-e[0],t[1]-e[1]))),s=Math.max(1e-5,Math.sqrt(Math.hypot(n[0]-t[0],n[1]-t[1]))),c=Math.max(1e-5,Math.sqrt(Math.hypot(r[0]-n[0],r[1]-n[1]))),l=o,u=l+s,d=u+c,f=l+(u-l)*i;for(let i=0;i<2;i++){let o=((l-f)*e[i]+(f-0)*t[i])/(l-0),s=((u-f)*t[i]+(f-l)*n[i])/(u-l),c=((d-f)*n[i]+(f-u)*r[i])/(d-u),p=((u-f)*o+(f-0)*s)/(u-0),m=((d-f)*s+(f-l)*c)/(d-l);a[i]=((u-f)*p+(f-l)*m)/(u-l)}return a}var gr=new Set([`position`,`normal`,`uv`,`color`,`aux`]),_r=new o,vr=new i,yr=new n,br=new a,xr=new i;function L(e=0,t=0,n=0,r=0,i=0,a=0,o=1,s=o,c=o,l=`XYZ`){return br.set(r,i,a,l),yr.setFromEuler(br),new p().compose(vr.set(e,t,n),yr,xr.set(o,s,c))}function Sr(e,t,r=0){let a=t.clone().normalize(),o=new n().setFromUnitVectors(new i(0,1,0),a);return r&&o.multiply(new n().setFromAxisAngle(new i(0,1,0),r)),new p().compose(e,o,new i(1,1,1))}function Cr(e){return e instanceof o?e:_r.set(e).clone()}function wr(e,{color:t=16777215,rough:n=.5,metal:r=0,pattern:i=0,anim:a=0,matrix:o=null}={}){for(let t of Object.keys(e.attributes))gr.has(t)||e.deleteAttribute(t);e.morphAttributes={},e.clearGroups();let s=e.attributes.position.count;if(!e.index){let t=Array(s);for(let e=0;e<s;e++)t[e]=e;e.setIndex(t)}if(e.attributes.normal||e.computeVertexNormals(),e.attributes.uv||e.setAttribute(`uv`,new O(new Float32Array(s*2),2)),!e.attributes.color){let n=Cr(t),r=new Float32Array(s*3);for(let e=0;e<s;e++)r[e*3]=n.r,r[e*3+1]=n.g,r[e*3+2]=n.b;e.setAttribute(`color`,new O(r,3))}if(!e.attributes.aux){let t=new Float32Array(s*4);for(let e=0;e<s;e++)t[e*4]=n,t[e*4+1]=r,t[e*4+2]=i,t[e*4+3]=a;e.setAttribute(`aux`,new O(t,4))}for(let t of Object.keys(e.attributes)){let n=e.attributes[t];(!(n.array instanceof Float32Array)||n.isInterleavedBufferAttribute)&&e.setAttribute(t,new O(Float32Array.from({length:n.count*n.itemSize},(e,t)=>n.array[t]),n.itemSize))}return o&&e.applyMatrix4(o),e}var Tr=class{constructor(){this.buckets=new Map}add(e,t,n){let r=wr(t,n);return this.buckets.has(e)||this.buckets.set(e,[]),this.buckets.get(e).push(r),r}merged(e){let t=this.buckets.get(e);if(!t||t.length===0)return null;let n=t.length===1?t[0]:ne(t,!1);if(!n)throw Error(`BoatModel: failed to merge bucket `+e);return n.computeBoundingBox(),n.computeBoundingSphere(),n}};function Er(e){let t=e.length===1?e[0]:ne(e,!1);return t.computeBoundingBox(),t.computeBoundingSphere(),t}function R(e,t,n){let r=new re(e,t,n),i=r.attributes.uv,a=[[n,t],[n,t],[e,n],[e,n],[e,t],[e,t]];for(let e=0;e<6;e++)for(let t=0;t<4;t++){let n=e*4+t;i.setXY(n,i.getX(n)*a[e][0],i.getY(n)*a[e][1])}return r}function Dr(e,t,n,r=.02,i=2){let a=new ae(e,t,n,i,Math.min(r,e/2-1e-4,t/2-1e-4,n/2-1e-4)),o=a.attributes.uv;for(let r=0;r<o.count;r++)o.setXY(r,o.getX(r)*Math.max(e,n),o.getY(r)*t);return a}function z(e,t,n,r=12,i=1,a=!1,o=0,s=Math.PI*2){let c=new te(e,t,n,r,i,a,o,s),l=c.attributes.uv,u=Math.max(e,t)*s;for(let e=0;e<l.count;e++)l.setXY(e,l.getX(e)*u,l.getY(e)*n);return c}function B(e,t,n,r=8,a=n){let o=new i().subVectors(t,e),s=z(a,n,o.length(),r,1,!1);return s.applyMatrix4(Sr(new i().addVectors(e,t).multiplyScalar(.5),o)),s}function Or(e,t=12,n=8,r=0,i=Math.PI*2,a=0,o=Math.PI){return new C(e,t,n,r,i,a,o)}function kr(e,t,n=8,r=24,i=Math.PI*2){let a=new ie(e,t,n,r,i),o=a.attributes.uv;for(let n=0;n<o.count;n++)o.setXY(n,o.getX(n)*e*i,o.getY(n)*2*Math.PI*t);return a}function Ar(e,t=16){let n=e.map(e=>new m(Math.max(0,e[0]),e[1]));return new ce(n,t)}function jr(e,t,n=32,r=6,i=!1,a=.5){let o=new c(e,i,`catmullrom`,a),s=new E(o,n,t,r,i),l=o.getLength(),u=s.attributes.uv;for(let e=0;e<u.count;e++)u.setXY(e,u.getX(e)*l,u.getY(e));return s}function Mr(e,{flip:t=!1,uvFn:n=null,closeJ:r=!1}={}){let i=e.length,a=e[0].length,o=new Float32Array(i*a*3),s=new Float32Array(i*a*2),c=0;for(let t=0;t<i;t++){t>0&&(c+=e[t][0].distanceTo(e[t-1][0]));let r=0;for(let i=0;i<a;i++){let l=e[t][i];i>0&&(r+=l.distanceTo(e[t][i-1]));let u=t*a+i;if(o[u*3]=l.x,o[u*3+1]=l.y,o[u*3+2]=l.z,n){let e=n(l,t,i,c,r);s[u*2]=e[0],s[u*2+1]=e[1]}else s[u*2]=c,s[u*2+1]=r}}let l=[],u=r?a:a-1;for(let e=0;e<i-1;e++)for(let n=0;n<u;n++){let r=(n+1)%a,i=e*a+n,o=(e+1)*a+n,s=(e+1)*a+r,c=e*a+r;t?l.push(i,o,c,o,s,c):l.push(i,c,o,c,s,o)}let d=new D;return d.setAttribute(`position`,new O(o,3)),d.setAttribute(`uv`,new O(s,2)),d.setIndex(l),d.computeVertexNormals(),d}function Nr(e,t){let n=new i;for(let t of e)n.add(t);n.divideScalar(e.length);let r=[n.x,n.y,n.z];for(let t of e)r.push(t.x,t.y,t.z);let a=[];for(let t=0;t<e.length;t++)a.push(0,1+t,1+(t+1)%e.length);let o=new D;return o.setAttribute(`position`,new O(r,3)),o.setIndex(a),Pr(o,t),o.computeVertexNormals(),Fr(o,t),o}function Pr(e,t){let n=e.attributes.position,r=e.index.array,a=new i,o=new i,s=new i,c=new i,l=new i;for(let e=0;e<r.length;e+=3)a.fromBufferAttribute(n,r[e]),o.fromBufferAttribute(n,r[e+1]),s.fromBufferAttribute(n,r[e+2]),c.subVectors(o,a).cross(s.sub(a)),l.add(c);if(l.dot(t)<0){let t=Array.from(r);for(let e=0;e<t.length;e+=3){let n=t[e+1];t[e+1]=t[e+2],t[e+2]=n}e.setIndex(t)}return e}function Fr(e,t){let n=t.clone().normalize(),r=Math.abs(n.y)>.9?new i(1,0,0):new i(0,1,0).cross(n).normalize(),a=new i().crossVectors(n,r),o=e.attributes.position,s=new Float32Array(o.count*2),c=new i;for(let e=0;e<o.count;e++)c.fromBufferAttribute(o,e),s[e*2]=c.dot(r),s[e*2+1]=c.dot(a);return e.setAttribute(`uv`,new O(s,2)),e}function Ir(e,t,n,{edges:r=!0,back:a=!0,front:o=!0}={}){let s=e.map(e=>new m(e[0],e[1])),c=t.map(e=>e.map(e=>new m(e[0],e[1])));v.isClockWise(s)&&s.reverse();for(let e of c)v.isClockWise(e)||e.reverse();let l=v.triangulateShape(s,c),u=s.concat(...c),d=[],f=e=>{let t=[],r=[];for(let i of u){let a=n(i.x,i.y,e);t.push(a.x,a.y,a.z),r.push(i.x,i.y)}let i=[];for(let e of l){let t=u[e[0]],n=u[e[1]],r=u[e[2]];Math.abs((n.x-t.x)*(r.y-t.y)-(r.x-t.x)*(n.y-t.y))>1e-10&&i.push(e[0],e[1],e[2])}let a=new D;a.setAttribute(`position`,new O(t,3)),a.setAttribute(`uv`,new O(r,2)),a.setIndex(i);let o=s[0],c=n(o.x,o.y,e).sub(n(o.x,o.y,1-e));Pr(a,c),a.computeVertexNormals();let d=a.attributes.normal;c.normalize();for(let e=0;e<d.count;e++)Math.hypot(d.getX(e),d.getY(e),d.getZ(e))<.5&&d.setXYZ(e,c.x,c.y,c.z);return a};if(o&&d.push(f(0)),a&&d.push(f(1)),r){let e=[],t=[],r=[],a=[s,...c],o=new i,l=new i,u=new i,f=new i,p=new i,m=new i;for(let i of a){let a=0;for(let s=0;s<i.length;s++){let c=i[s],d=i[(s+1)%i.length],h=c.distanceTo(d);if(h<1e-6)continue;o.copy(n(c.x,c.y,0)),l.copy(n(c.x,c.y,1)),u.copy(n(d.x,d.y,0)),f.copy(n(d.x,d.y,1));let g=o.distanceTo(l),_=e.length/3;e.push(o.x,o.y,o.z,u.x,u.y,u.z,f.x,f.y,f.z,l.x,l.y,l.z),t.push(a,0,a+h,0,a+h,g,a,g),a+=h;let v=(c.x+d.x)/2,y=(c.y+d.y)/2,b=(d.y-c.y)/h*.01,x=-(d.x-c.x)/h*.01;m.copy(n(v+b,y+x,0)).sub(n(v,y,0)),p.subVectors(u,o).cross(vr.subVectors(l,o)),p.dot(m)>=0?r.push(_,_+1,_+2,_,_+2,_+3):r.push(_,_+2,_+1,_,_+3,_+2)}}if(e.length){let n=new D;n.setAttribute(`position`,new O(e,3)),n.setAttribute(`uv`,new O(t,2)),n.setIndex(r),n.computeVertexNormals(),d.push(n)}}return d.length===1?d[0]:ne(d,!1)}function Lr(e,{closed:t=!1,flip:n=!1}={}){let r=t?e.map(e=>[...e,e[0].clone()]):e,a=Mr(r,{flip:n});if(t){let e=r[0].length,t=a.attributes.normal,n=new i,o=new i;for(let i=0;i<r.length;i++){let r=i*e,a=i*e+e-1;n.fromBufferAttribute(t,r),o.fromBufferAttribute(t,a),n.add(o).normalize(),t.setXYZ(r,n.x,n.y,n.z),t.setXYZ(a,n.x,n.y,n.z)}}return a}function Rr(e,t){let n=e.attributes.position,r=new Float32Array(n.count*3),a=new i;for(let e=0;e<n.count;e++){a.fromBufferAttribute(n,e);let i=Cr(t(a,e));r[e*3]=i.r,r[e*3+1]=i.g,r[e*3+2]=i.b}return e.setAttribute(`color`,new O(r,3)),e}function zr(e,t){let n=e.attributes.position,r=new Float32Array(n.count*4),a=new i;for(let e=0;e<n.count;e++){a.fromBufferAttribute(n,e);let i=t(a,e);r[e*4]=i[0],r[e*4+1]=i[1],r[e*4+2]=i[2],r[e*4+3]=i[3]}return e.setAttribute(`aux`,new O(r,4)),e}function Br(e){return e.index?e.index.count/3:e.attributes.position.count/3}var V={gelcoat:15855334,lining:15328988,deck:14867919,antifouling:8002837,stainless:13685718},H=(e,t,n)=>new i(e,t,n);function Vr(e,t){Hr(e,t),Kr(e,t),Zr(e,t),$r(e,t),ri(e,t),ai(e,t)}function Hr(e,t){let n=t.stationParams(60).map(e=>t.station(e,1)),r=e=>[e.z,e.y];e.add(`hull`,Mr(n,{uvFn:r}));let i=n.map(e=>e.map(e=>H(-e.x,e.y,e.z)));e.add(`hull`,Mr(i,{flip:!0,uvFn:r}));let a=n[0],o=[],s=[],c=[];for(let e of a)o.push(e.x,e.y,e.z,-e.x,e.y,e.z),c.push(e.x,e.y,-e.x,e.y);for(let e=0;e<a.length-1;e++){let t=2*e,n=2*e+1,r=2*e+2,i=2*e+3;a[e].x>1e-5&&s.push(t,n,r),s.push(n,i,r)}let l=new D;l.setAttribute(`position`,new O(o,3)),l.setAttribute(`uv`,new O(c,2)),l.setIndex(s),Pr(l,H(0,0,-1)),l.computeVertexNormals(),Jr(l,H(0,0,-1)),e.add(`hull`,l)}function Ur(e){let t=e.stationParams(28).map(t=>e.station(t,1).filter((e,t,n)=>t%2==0||t===n.length-1)),n=t[0].length,r=[],i=[],a=e=>(r.push(e.x,e.y,e.z),r.length/3-1),o=t.map(e=>e.map(a)),s=t.map(e=>e.map(e=>a(H(-e.x,e.y,e.z))));for(let e=0;e<t.length-1;e++)for(let t=0;t<n-1;t++){let n=o[e][t],r=o[e+1][t],a=o[e+1][t+1],c=o[e][t+1];i.push(n,c,r,c,a,r);let l=s[e][t],u=s[e+1][t],d=s[e+1][t+1],f=s[e][t+1];i.push(l,u,f,u,d,f)}for(let e=0;e<n-1;e++)i.push(o[0][e],s[0][e],o[0][e+1],s[0][e],s[0][e+1],o[0][e+1]);let c=n-1;for(let e=0;e<t.length-1;e++)i.push(o[e][c],s[e][c],o[e+1][c],s[e][c],s[e+1][c],o[e+1][c]);let l=(e,t)=>Math.abs(r[3*e]-r[3*t])+Math.abs(r[3*e+1]-r[3*t+1])+Math.abs(r[3*e+2]-r[3*t+2])<1e-7,u=[];for(let e=0;e<i.length;e+=3){let[t,n,r]=[i[e],i[e+1],i[e+2]];l(t,n)||l(n,r)||l(t,r)||u.push(t,n,r)}let d=new D;return d.setAttribute(`position`,new O(r,3)),d.setIndex(u),d.computeVertexNormals(),d.computeBoundingBox(),d.computeBoundingSphere(),d}var Wr=[[3.74,-.093],[3.3,-.2],[3,-.265],[1.5,-.5],[0,-.62],[-1.5,-.7],[-3.05,-.77]];function Gr(e){let t=Wr;if(e>=t[0][0])return t[0][1];if(e<=t[t.length-1][0])return t[t.length-1][1];let n=0;for(;n<t.length-2&&e<t[n+1][0];)n++;let r=t[Math.max(0,n-1)],i=t[n],a=t[n+1],o=t[Math.min(t.length-1,n+2)],s=(i[0]-e)/(i[0]-a[0]),c=s*s,l=c*s;return .5*(2*i[1]+(-r[1]+a[1])*s+(2*r[1]-5*i[1]+4*a[1]-o[1])*c+(-r[1]+3*i[1]-3*a[1]+o[1])*l)}var U={zFront:3.74,zAft:-3.05,shoeAft:-3.68,bottom:-.77,shoeTop:-.74};function Kr(e,t){let n=[];for(let e=0;e<=32;e++){let r=e/32,i=I(U.zAft,U.zFront,r**.9),a=Gr(i),o=-t.draftAt(i),s=Math.max(o+.06,a+.02),c=dr(2.6,U.zFront,i),l=I(.065,.012,c),u=I(.042,.008,c),d=I(s,a,.55),f=[[l,s],[I(l,u,.6),d],[u,a+.035],[u*.75,a+.012],[u*.35,a+.002]],p=[];for(let e of f)p.push(H(e[0],e[1],i));p.push(H(0,a,i));for(let e=f.length-1;e>=0;e--)p.push(H(-f[e][0],f[e][1],i));n.push(p)}let r=Lr(n);Yr(r,e=>H(e.x,0,0),H(0,-1,0)),e.add(`hull`,r),e.add(`hull`,Nr(n[0],H(0,0,-1))),e.add(`hull`,Nr(n[32],H(0,0,1)));let i=U.zAft-U.shoeAft,a=R(.075,U.shoeTop-U.bottom,i);a.translate(0,(U.shoeTop+U.bottom)/2,(U.zAft+U.shoeAft)/2),e.add(`hull`,a),e.add(`fittings`,B(H(0,U.shoeTop,-3.58),H(0,U.shoeTop+.03,-3.58),.03,10),{color:11564618,rough:.4,metal:1}),e.add(`fittings`,B(H(0,-.53,U.zAft+.02),H(0,-.53,-3.27),.024,10),{color:13225168,rough:.25,metal:1}),e.add(`hull`,B(H(0,-.53,U.zAft+.06),H(0,-.53,U.zAft-.03),.05,12,.04))}function qr(e){let t=(U.zFront-U.zAft)/240,n=0;for(let r=0;r<240;r++){let i=U.zAft+(r+.5)*t,a=Math.max(0,-e.draftAt(i)-Gr(i)),o=dr(2.6,U.zFront,i);n+=(I(.065,.012,o)+I(.042,.008,o))*a*t}return n+.075*(U.shoeTop-U.bottom)*(U.zAft-U.shoeAft)}function Jr(e,t){let n=e.attributes.normal;for(let e=0;e<n.count;e++)Math.hypot(n.getX(e),n.getY(e),n.getZ(e))<.5&&n.setXYZ(e,t.x,t.y,t.z)}function Yr(e,t,n){let r=e.attributes.position,i=e.attributes.normal,a=0,o=H(0,0,0),s=H(0,0,0);for(let e=0;e<r.count;e++){o.fromBufferAttribute(r,e),s.fromBufferAttribute(i,e);let c=t(o);a+=c.lengthSq()>1e-10?s.dot(c):s.dot(n)}if(a<0){let t=Array.from(e.index.array);for(let e=0;e<t.length;e+=3){let n=t[e+1];t[e+1]=t[e+2],t[e+2]=n}e.setIndex(t),e.computeVertexNormals()}return e}function Xr(e,t,n){return e.halfBreadth(t,n)-e.shell}function Zr(e,t){let n=t.shell/t.length,r=t.tAtSheerZ(t.houseFront),i=[];for(let e=0;e<=40;e++){let a=I(n,r,e/40),o=t.sheerZ(a),s=t.sheerY(a),c=[];for(let e=0;e<=7;e++){let n=I(t.deckY,s,e/7);c.push(H(Xr(t,a,n),n,o))}i.push(c)}let a=e=>[e.z,e.y],o=Mr(i,{uvFn:a,flip:!0}),s=Mr(i.map(e=>e.map(e=>H(-e.x,e.y,e.z))),{uvFn:a});e.add(`gelcoat`,o,{color:V.lining,rough:.4}),e.add(`gelcoat`,s,{color:V.lining,rough:.4});let c=t.zAft+t.shell,l=[],u=[],d=[];for(let e=0;e<=7;e++){let r=I(t.deckY,t.sheerY(n),e/7),i=Xr(t,n,r);l.push(i,r,c,-i,r,c),u.push(i,r,-i,r)}for(let e=0;e<7;e++){let t=2*e,n=2*e+1,r=2*e+2,i=2*e+3;d.push(t,r,n,n,r,i)}let f=new D;f.setAttribute(`position`,new O(l,3)),f.setAttribute(`uv`,new O(u,2)),f.setIndex(d),Pr(f,H(0,0,1)),f.computeVertexNormals(),e.add(`gelcoat`,f,{color:V.lining,rough:.4})}function Qr(e,t,n){let r=Math.max(.001,e.sheerX(t)-e.shell),i=Math.min(1,Math.abs(n)/r);return e.sheerY(t)+.06*(1-i*i)}function $r(e,t){let n=t.shell/t.length,r=t.tAtSheerZ(t.houseFront),i={color:V.deck,rough:.5,pattern:1},a=e=>[e.x,e.z],o=[];for(let e=0;e<=40;e++){let i=I(n,r,e/40),a=t.sheerZ(i),s=Xr(t,i,t.deckY),c=[];for(let e=0;e<=8;e++)c.push(H(I(s,-s,e/8),t.deckY,a));o.push(c)}let s=Mr(o,{uvFn:a});Pr(s,H(0,1,0)),s.computeVertexNormals(),e.add(`gelcoat`,s,i);let c=1;for(;t.sheerX(c)-t.shell<.012;)c-=5e-4;let l=[];for(let e=0;e<=30;e++){let n=I(r,c,1-(1-e/30)**1.3),i=t.sheerZ(n),a=Math.max(.012,t.sheerX(n)-t.shell),o=[];for(let e=0;e<=12;e++){let r=I(a,-a,e/12);o.push(H(r,Qr(t,n,r),i))}l.push(o)}let u=Mr(l,{uvFn:a});Pr(u,H(0,1,0)),u.computeVertexNormals(),e.add(`gelcoat`,u,i);for(let n of[1,-1]){let r=[],i=t.houseBack,a=t.houseFront;for(let e=0;e<=12;e++){let n=I(i,a,e/12);r.push([n,ei(t,n)-.045])}for(let e=12;e>=0;e--){let n=I(i,a,e/12);r.push([n,t.sheerX(t.tAtSheerZ(n))-t.shell+.01])}let o=Ir(r,[],(e,r,i)=>{let a=t.tAtSheerZ(e);return H(n*r,t.sheerY(a)-(i?.04:0),e)});zr(o,e=>[.5,0,+(e.y>t.sheerY(t.tAtSheerZ(e.z))-.02),0]),e.add(`gelcoat`,o,{color:V.deck})}let d=t.deckY+.008;for(let[t,n,r,i]of[[.74,.03,0,-1.25],[.74,.03,0,-1.95],[.03,.73,.355,-1.6],[.03,.73,-.355,-1.6]]){let a=R(t,.016,n);a.translate(r,d,i),e.add(`gelcoat`,a,{color:14078404,rough:.45})}e.add(`fittings`,B(H(-.05,t.deckY+.004,-1.45),H(.05,t.deckY+.004,-1.45),.006,6),{color:V.stainless,rough:.3,metal:1})}function ei(e,t){return e.sheerX(e.tAtSheerZ(t))-.2}var ti=.045;function ni(e,t,n,r,i){let a=(e+t)/2;return[[e,n-.012],[e,n+ti-.012],[e+.01,n+ti-.002],[a,n+ti+.004],[t-.01,n+ti-.002],[t,n+ti-.012],[t,n-.026],[t-.018,n-.03]].map(e=>H(i*Math.max(0,e[0]),e[1],r))}function ri(e,t){let n=(t.shell+.03)/t.length;for(let r of[1,-1]){let i=[];for(let e=0;e<=60;e++){let a=I(n,1,1-(1-e/60)**1.25),o=t.sheerX(a),s=t.sheerZ(a),c=o+.022;e===60&&(c=0,s+=.03),i.push(ni(Math.max(0,o-t.shell-.03),c,t.sheerY(a),s,r))}let a=Lr(i);Yr(a,e=>H(e.x-r*(t.sheerX(t.tAtSheerZ(e.z))-.03),e.y-t.sheerY(t.tAtSheerZ(e.z))-.01,0),H(0,1,0)),ii(a,i),e.add(`wood`,a,{rough:.32}),e.add(`wood`,Nr(i[0],H(0,0,-1)),{rough:.32})}let r=t.sheerY(0),i=t.sheerX(0)+.022,a=t.zAft+t.shell+.03,o=t.zAft-.022,s=e=>ni(0,a-o,0,0,1).map(t=>H(e,r+t.y,a-t.x)),c=[];for(let e=0;e<=8;e++)c.push(s(I(-i,i,e/8)));let l=Lr(c);Yr(l,e=>H(0,e.y-r-.01,e.z-(a+o)/2),H(0,1,0)),ii(l,c),e.add(`wood`,l,{rough:.32}),e.add(`wood`,Nr(c[0],H(-1,0,0)),{rough:.32}),e.add(`wood`,Nr(c[8],H(1,0,0)),{rough:.32})}function ii(e,t){let n=t[0].length,r=e.attributes.uv,i=0;for(let e=0;e<t.length;e++){e>0&&(i+=t[e][3].distanceTo(t[e-1][3]));let a=0;for(let o=0;o<n;o++)o>0&&(a+=t[e][o].distanceTo(t[e][o-1])),r.setXY(e*n+o,i,a)}}function ai(e,t){let n=[-90,-60,-30,0,30,60,90].map(e=>e*Math.PI/180);for(let r of[1,-1]){let i=[];for(let e=0;e<=50;e++){let n=I(0,.992,1-(1-e/50)**1.25),r=t.sheerY(n)-.07,a=t.halfBreadth(n,r);i.push(H(a,r,t.zOnStation(n,r)))}let a=[],o=[];for(let e=0;e<=50;e++){let t=i[e],s=i[Math.max(0,e-1)],c=i[Math.min(50,e+1)],l=c.z-s.z,u=c.x-s.x,d=Math.hypot(u,l)||1,f=l/d,p=-u/d,m=n.map(e=>{let n=.036*Math.cos(e)-.006;return H(r*(t.x+f*n),t.y+.03*Math.sin(e),t.z+p*n)});a.push(m),o.push(H(r*(t.x+f*.034),t.y,t.z+p*.034))}let s=Lr(a);Yr(s,()=>H(r,0,0),H(r,0,0)),ii(s,a),e.add(`wood`,s,{rough:.35}),e.add(`wood`,Nr(a[0],H(0,0,-1)),{rough:.35}),e.add(`wood`,Nr(a[50],H(0,0,1)),{rough:.35}),e.add(`fittings`,jr(o,.0065,64,4),{color:V.stainless,rough:.22,metal:1})}let r=t.sheerY(0)-.07,i=t.sheerX(0)+.015,a=[];for(let e=0;e<=6;e++){let o=I(-i,i,e/6);a.push(n.map(e=>H(o,r+.03*Math.sin(e),t.zAft-(.036*Math.cos(e)-.006))))}let o=Lr(a);Yr(o,e=>H(0,0,e.z-t.zAft+.001),H(0,0,-1)),ii(o,a),e.add(`wood`,o,{rough:.35}),e.add(`wood`,Nr(a[0],H(-1,0,0)),{rough:.35}),e.add(`wood`,Nr(a[6],H(1,0,0)),{rough:.35})}var W=(e,t,n)=>new i(e,t,n),oi={color:V.stainless,rough:.22,metal:1},si={color:10725291,rough:.35,metal:1},ci={color:1710877,rough:.55,metal:0};function li(e=[16738835,16052714,1920924],t=.35){let n=[[[0,0],[.03,.004],[.055,.025],[.07,.07],[.075,.12],[.075,.17]],[[.075,.17],[.075,.22],[.075,.27]],[[.075,.27],[.074,.33],[.068,.39],[.052,.435],[.03,.455],[0,.46]]].map((t,n)=>[Ar(t,12),{color:e[n],rough:.55}]);return n.push([z(.011,.013,.46+t+.06,6).translate(0,(.46+t-.06)/2,0),{color:10254924,rough:.75}]),n}function ui(e,t,n){mi(e,t),gi(e,t),vi(e,t),yi(e,t),xi(e,t),Ci(e,t),wi(e,t),Ti(e,t),Di(e,t,n)}function di(e,t,n,r,i,a,o=0){let s=new D;return s.setAttribute(`position`,new O([e.x,e.y,e.z,t.x,t.y,t.z,n.x,n.y,n.z,r.x,r.y,r.z],3)),s.setAttribute(`uv`,new O([0,0,i,0,i,a,0,a],2)),s.setIndex([0,1,2,0,2,3]),s.computeVertexNormals(),{g:s,opts:{rough:i,metal:a,pattern:o}}}var fi={L:.95,W:.55,H:.37},pi=[[.66,0,-3.25,.02,14201372],[.66,1,-3.23,-.03,3111484],[.64,0,-2.2,-.04,14201372],[-.68,0,-3.25,.03,2040614]];function mi(e,t){let{L:n,W:r,H:i}=fi;for(let[a,o,s,c,l]of pi){let u=L(a,t.deckY+.03+o*(i+.035),s,0,c,0),d=(t,n=l)=>{t.g.applyMatrix4(u),e.add(`trap`,t.g,{...t.opts,color:n})},f=r/2,p=n/2;d(di(W(-f,0,p),W(f,0,p),W(f,i,p),W(-f,i,p),r,i)),d(di(W(f,0,-p),W(-f,0,-p),W(-f,i,-p),W(f,i,-p),r,i)),d(di(W(f,0,p),W(f,0,-p),W(f,i,-p),W(f,i,p),n,i)),d(di(W(-f,0,-p),W(-f,0,p),W(-f,i,p),W(-f,i,-p),n,i)),d(di(W(-f,i,p),W(f,i,p),W(f,i,-p),W(-f,i,-p),r,n)),d(di(W(-f,0,-p),W(f,0,-p),W(f,0,p),W(-f,0,p),r,n)),d(di(W(-f,0,.08),W(f,0,.08),W(f,i,.08),W(-f,i,.08),r,i));for(let e of[1,-1]){let t=i*.5,n=[W(e*f,t-.12,-.35),W(e*f,t-.12,-.05000000000000002),W(e*f,t+.12,-.05000000000000002),W(e*f,t+.12,-.35)],r=[W(e*.07,t-.045,-.26),W(e*.07,t-.045,-.14),W(e*.07,t+.045,-.14),W(e*.07,t+.045,-.26)];for(let e=0;e<4;e++){let t=(e+1)%4;d(di(n[e],n[t],r[t],r[e],n[e].distanceTo(n[t]),n[e].distanceTo(r[e]),1),2510702)}}for(let t of[-.2,0,.2]){let r=R(.05,.032,n+.02);r.translate(t,-.012,0),r.applyMatrix4(u),e.add(`wood`,r,{color:10132114,rough:.8})}for(let t of[-.3,.3]){let n=R(.2,.06,.09);n.translate(.05,.035,t),n.applyMatrix4(u),e.add(`fittings`,n,{color:9320998,rough:.9})}let m=Or(.06,8,6);m.scale(1,1.3,1),m.translate(0,i-.1,-.2),m.applyMatrix4(u),e.add(`fittings`,m,{color:11740702,rough:.8})}}var hi={x:-1,z:-.62,y:1.34};function gi(e,t){let n=t.tAtSheerZ(-.78),r=-(t.sheerX(n)-.035),i=t.sheerY(n)+.045,a=[W(r,i,-.8),W(r-.02,i+.45,-.78),W(r-.05,1.86,-.76),W(r-.13,2.06,-.74),W(r-.3,2.11,-.73),W(r-.43,2.07,-.72)];e.add(`fittings`,jr(a,.03,32,8),oi);let o=Dr(.12,.02,.16,.008,1);o.translate(r,i+.01,-.8),e.add(`fittings`,o,oi);let s=a[a.length-1],c=Or(.03,10,6);c.translate(s.x,s.y,s.z),e.add(`fittings`,c,oi),e.add(`fittings`,B(s,s.clone().add(W(0,-.12,0)),.01,6),oi);let l=s.clone().add(W(0,-.22,0));for(let t of[-.022,.022]){let n=z(.085,.085,.01,16);n.applyMatrix4(L(l.x,l.y,l.z+t,Math.PI/2,0,0)),e.add(`fittings`,n,si)}let u=z(.07,.07,.034,16);u.applyMatrix4(L(l.x,l.y,l.z,Math.PI/2,0,0)),e.add(`fittings`,u,{color:2829616,rough:.6});let{x:d,y:f,z:p}=hi;e.add(`fittings`,B(W(d,t.deckY,p+.1),W(d,f-.1,p+.1),.038,12),si);let m=R(.2,.012,.2);m.translate(d,t.deckY+.006,p+.1),e.add(`fittings`,m,si);let h=z(.075,.075,.17,18);h.applyMatrix4(L(d,f,p+.13,Math.PI/2,0,0)),e.add(`fittings`,h,{color:3817544,rough:.45,metal:.3});let g=Ar([[0,-.05],[.2,-.05],[.205,-.04],[.1,-.006],[.1,.006],[.205,.04],[.2,.05],[0,.05]],28);g.applyMatrix4(L(d,f,p,Math.PI/2,0,0)),e.add(`fittings`,g,si);let _=z(.04,.05,.03,12);_.applyMatrix4(L(d,f,p-.06,Math.PI/2,0,0)),e.add(`fittings`,_,si),e.add(`fittings`,jr([W(d+.05,f,p+.2),W(d+.12,f-.2,p+.3),W(d+.1,.6,p+.28),W(d+.06,t.deckY+.02,p+.25)],.012,20,5),ci),e.add(`fittings`,jr([W(d-.05,f,p+.2),W(d-.02,f-.25,p+.32),W(d+.02,.62,p+.3),W(d+.02,t.deckY+.02,p+.28)],.012,20,5),ci);let v=[l.clone().add(W(.07,0,0)),W(d-.3,f+.35,p+.02),W(d-.12,f+.2,p),W(d+.2,f-.02,p-.01),W(d+.16,f-.25,p-.01),W(d+.05,.72,p-.1),W(d+.2,t.deckY+.02,p-.35)];e.add(`fittings`,jr(v,.009,48,4),{color:14991925,rough:.8,pattern:1})}function _i(e,t,n,r,i,a,o){let s=[],c=r*12;for(let l=0;l<=c;l++){let u=l/c,d=l/12*Math.PI*2+o,f=i*(1-.12*u)+.012*Math.sin(l*.9+o*3),p=t+a+u*r*a*1.35+.004*Math.sin(l*1.7+o);s.push(W(e+Math.cos(d)*f,p,n+Math.sin(d)*f))}let l=s[s.length-1];return s.push(W(l.x*.7+e*.3+.12,l.y-.01,l.z+.2),W(l.x+.35,t+a,l.z+.4)),jr(s,a,r*21+10,4)}function vi(e,t){e.add(`fittings`,_i(-.5,t.deckY,-2.15,5,.22,.011,.3),{color:14991925,rough:.8,pattern:1});let n=t.deckY+.03+fi.H+.012;e.add(`fittings`,_i(-.68,n,-3.2,4,.19,.01,1.7),{color:3108687,rough:.8,pattern:1})}function yi(e,t){let n=[[-.2,t.deckY+.075,-2.75,Math.PI/2,.4],[.12,t.deckY+.075,-3,Math.PI/2,-.9]];for(let[t,r,i,a,o]of n){let n=L(t,r,i,a,o,0,1,1,1,`YXZ`);for(let[t,r]of li(void 0,.3))t.translate(0,-.23,0),t.applyMatrix4(n),e.add(`fittings`,t,r)}}var bi=[[-1,-2.4],[-1,-1.05],[-1,.65],[1,-1.7]];function xi(e,t){let n=[[0,0],[.03,.004],[.055,.016],[.07,.04],[.075,.07],[.075,.43],[.07,.46],[.055,.484],[.03,.496],[0,.5]];for(let[r,i]of bi){let a=r*(t.hullXAt(i,.8099999999999999)+.08),o=Ar(n,12);o.translate(a,.36,i),e.add(`fittings`,o,{color:1915494,rough:.45});let s=kr(.018,.006,5,10);s.translate(a,.878,i),e.add(`fittings`,s,{color:1915494,rough:.45});let c=t.tAtSheerZ(i),l=t.sheerY(c)+.05,u=r*(t.sheerX(c)+.01),d=r*(t.sheerX(c)-t.shell-.05),f=[W(a,.89,i),W(a-r*.01,(.86+l)/2,i),W(u,l,i),W((u+d)/2,l+.012,i),W(d,l-.03,i)];e.add(`fittings`,jr(f,.006,16,4),{color:15790056,rough:.8,pattern:1})}}function Si(e,t,n=.2){let r=[],i=z(.011,.011,n*.7,8);i.applyMatrix4(L(0,.045,0,Math.PI/2,0,0)),r.push(i);for(let e of[1,-1]){let t=z(.006,.011,n*.15,8);t.applyMatrix4(L(0,.045,e*n*.425,e*Math.PI/2,0,0)),r.push(t);let i=z(.013,.018,.045,8);i.translate(0,.0225,e*n*.22),r.push(i)}let a=L(e.x,e.y,e.z,0,t,0);return r.map(e=>e.applyMatrix4(a))}function Ci(e,t){let n=[];for(let e of[1,-1])for(let r of[-3.6,-1.35]){let i=t.tAtSheerZ(r);n.push(...Si(W(e*(t.sheerX(i)-.04),t.sheerY(i)+.048,r),0))}let r=t.tAtSheerZ(3.35);n.push(...Si(W(0,Qr(t,r,0),3.35),Math.PI/2,.24));for(let t of n)e.add(`fittings`,t,oi)}function wi(e,t){let n=t.sheerY(1),r=Dr(.09,.05,.3,.015,2);r.translate(0,n+.03,t.zBow-.08),e.add(`fittings`,r,oi);for(let r of[1,-1]){let i=R(.008,.07,.16);i.translate(r*.04,n+.08,t.zBow+.02),e.add(`fittings`,i,oi)}let i=z(.03,.03,.07,12);i.applyMatrix4(L(0,n+.085,t.zBow+.07,0,0,Math.PI/2)),e.add(`fittings`,i,ci);let a=W(0,n+.1,t.zBow-.45),o=W(0,n+.12,t.zBow+.13);e.add(`fittings`,B(a,o,.017,8),si);let s=z(.025,.025,.07,10);s.applyMatrix4(L(o.x,o.y,o.z,0,0,Math.PI/2)),e.add(`fittings`,s,si);let c=W(0,-.85,-.4).normalize(),l=new x(.12,.34,4);l.rotateY(Math.PI/4),l.scale(1,1,.38),l.applyMatrix4(Sr(o.clone().add(W(0,-.02,.02)).addScaledVector(c,.17),c)),e.add(`fittings`,l,si);let u=Qr(t,t.tAtSheerZ(t.zBow-.75),0),d=z(.035,.045,.04,14);d.translate(0,u+.02,t.zBow-.75),e.add(`fittings`,d,oi),e.add(`fittings`,jr([a,W(0,I(a.y,u,.6)+.03,t.zBow-.6),W(0,u+.04,t.zBow-.75)],.012,10,5),si)}function Ti(e,t){let n=new te(.43,.37,.36,4,1);n.rotateY(Math.PI/4),n.scale(1,1,.62),n.translate(-.72,t.deckY+.18,-1.45),e.add(`fittings`,n,{color:2778288,rough:.55});let r=R(.52,.02,.33);r.translate(-.72,t.deckY+.352,-1.45),e.add(`fittings`,r,{color:5909538,rough:.35});let i=.86,a=-.8,o=z(.26,.26,.78,20);o.translate(i,t.deckY+.39,a),e.add(`fittings`,o,{color:2055846,rough:.5});for(let n of[.26,.52]){let r=kr(.262,.012,5,24);r.applyMatrix4(L(i,t.deckY+n,a,Math.PI/2,0,0)),e.add(`fittings`,r,{color:2055846,rough:.5})}let s=z(.27,.27,.03,20);s.translate(i,t.deckY+.795,a),e.add(`fittings`,s,{color:1789836,rough:.5})}var Ei={w:.5,h:.33};function Di(e,t,n){let r=t.sheerY(0)+.045,i=z(.03,.035,.03,12);i.translate(0,r+.015,t.zAft+.03),e.add(`fittings`,i,ci);let a=z(.025,.025,.05,12);a.translate(0,r+.055,t.zAft+.03),e.add(`glow`,a,{color:16774108,rough:.2,pattern:0});let o=z(.03,.028,.012,12);o.translate(0,r+.086,t.zAft+.03),e.add(`fittings`,o,ci);let s=-(t.sheerX(.02)-.08),c=t.zAft+.14,l=r+1;e.add(`fittings`,B(W(s,r-.02,c),W(s,l,c),.014,8,.01),{color:15855592,rough:.3});let u=Or(.02,8,6);u.translate(s,l+.015,c),e.add(`fittings`,u,{color:13148240,rough:.25,metal:1});let d=z(.022,.026,.06,10);d.translate(s,r+.01,c),e.add(`fittings`,d,oi);let{w:f,h:p}=Ei,m=[],h=[],g=[];for(let e=0;e<=6;e++)for(let t=0;t<=12;t++){let n=t/12,r=e/6;m.push(s,l-.03-p+r*p,c-n*f),h.push(n,r)}for(let e=0;e<6;e++)for(let t=0;t<12;t++){let n=e*13+t,r=n+1,i=n+12+2,a=n+12+1;g.push(n,r,i,n,i,a)}for(let t of[!1,!0]){let n=new D;n.setAttribute(`position`,new O(m,3)),n.setAttribute(`uv`,new O(h,2));let r=t?g.map((e,t)=>g[t-t%3+(2-t%3)]):g.slice();n.setIndex(r),n.computeVertexNormals(),zr(n,(e,t)=>[.7,0,2,h[t*2]]),e.add(`fittings`,n,{color:16777215})}n.flagPivot=W(s,0,c)}var G=(e,t,n)=>new i(e,t,n),K={wallT:.045,wsBottomY:1.48,wsTopY:2.24,roofUnderY:2.31,roofZ0:-.95,roofZ1:1.34,winBottom:1.56,winTop:2.12,dash:{zFace:.98,yKnee:1.08,zTop:1.16,yTop:1.4,zBack:1.41,halfW:1.1},helmX:-.55,seatZ:.22},q={color:V.stainless,rough:.22,metal:1},J={color:1710877,rough:.55,metal:0},Oi={color:15855851,rough:.35,metal:0},ki={color:10791083,rough:.55,metal:1},Ai={color:2042426,rough:.6,metal:0};function ji(e,t){return e.houseFront-(t-K.wsBottomY)*(.25/.76)}function Mi(e,t,n){return ei(e,t)-Math.max(0,n-1.15)*.04}function Ni(e){return 2.375+.035*(1-(e/1.35)**2)}function Pi(e,t){let n=e.length,r=Fi(e)>0,i=[];for(let a=0;a<n;a++){let o=e[a],s=e[(a+1)%n],c=s[0]-o[0],l=s[1]-o[1],u=Math.hypot(c,l),d=l/u,f=-c/u;r||(d=-d,f=-f),i.push([o[0]+d*t,o[1]+f*t,c,l])}let a=[];for(let e=0;e<n;e++){let t=i[(e+n-1)%n],r=i[e],o=t[2]*r[3]-t[3]*r[2],s=((r[0]-t[0])*r[3]-(r[1]-t[1])*r[2])/o;a.push([t[0]+t[2]*s,t[1]+t[3]*s])}return a}function Fi(e){let t=0;for(let n=0;n<e.length;n++){let r=e[n],i=e[(n+1)%e.length];t+=r[0]*i[1]-i[0]*r[1]}return t}function Ii(e,t,n){Ri(e,t),zi(e,t),Vi(e,t),Gi(e,t,n),Ki(e,t),Ji(e,t),Xi(e,t,n)}function Li(e){let{winBottom:t,winTop:n}=K,r=t=>ji(e,t)-.1;return[[[.3,t],[.78,t],[.78,n],[.3,n]],[[.84,t],[r(t),t],[r(n),n],[.84,n]]]}function Ri(e,t){let{wallT:n,roofUnderY:r}=K,i=t.houseBack,a=t.houseFront,o=[];for(let e=0;e<=8;e++){let n=I(i,a,e/8);o.push([n,t.sheerY(t.tAtSheerZ(n))])}o.push([a,K.wsBottomY]),o.push([ji(t,r),r]),o.push([i,r]);let s=Li(t);for(let r of[1,-1]){let i=Ir(o,s,(e,i,a)=>G(r*(Mi(t,e,i)-a*n),i,e));zr(i,e=>Math.abs(e.x)<Mi(t,e.z,e.y)-n*.5?[.5,0,2,0]:[.3,0,0,0]),e.add(`gelcoat`,i,{color:V.gelcoat});for(let i of s){let a=Pi(i,.024);e.add(`fittings`,Ir(a,[Pi(i,-.006)],(e,i,a)=>G(r*(Mi(t,e,i)+.008-a*(n+.016)),i,e)),ki),e.add(`fittings`,Ir(Pi(i,-.005),[Pi(i,-.014)],(e,i,a)=>G(r*(Mi(t,e,i)+.004-a*(n+.008)),i,e)),{color:921360,rough:.8});let o=Pi(i,.011);for(let i=0;i<o.length;i++){let a=o[i],s=o[(i+1)%o.length],c=Math.hypot(s[0]-a[0],s[1]-a[1]),l=Math.max(2,Math.round(c/.075));for(let i=0;i<l;i++){let o=I(a[0],s[0],(i+.5)/l),c=I(a[1],s[1],(i+.5)/l),u=r*(Mi(t,o,c)+.008-(n+.016)-.001),d=z(.0045,.0045,.003,6);d.applyMatrix4(L(u,c,o,0,0,Math.PI/2)),e.add(`fittings`,d,{color:13225168,rough:.35,metal:1})}}}let a=.81,c=1.84,l=R(.02,.06,.025);l.translate(r*(Mi(t,a,c)-n-.012),c,a),e.add(`fittings`,l,J)}let c=t.tAtSheerZ(t.houseFront),l=ei(t,t.houseFront),u=[];for(let e=0;e<=10;e++){let n=I(-l,l,e/10);u.push([n,Qr(t,c,n)-.012])}u.push([l,K.wsBottomY],[-l,K.wsBottomY]);let d=Ir(u,[],(e,n,r)=>G(e,n,t.houseFront-r*.04));zr(d,e=>e.z<t.houseFront-.02?[.5,0,2,0]:[.3,0,0,0]),e.add(`gelcoat`,d,{color:V.gelcoat})}function zi(e,t){let{wsBottomY:n,roofUnderY:r}=K,a=new i(0,.76,-.25).normalize(),o=new i(0,.25,.76).normalize(),s=G(0,n,t.houseFront),c=(r-n)/a.y,l=(e,t)=>s.clone().addScaledVector(a,t).setX(e),u=e=>{let n=l(0,e);return Mi(t,n.z,n.y)},d=u(0),f=u(c),p=[[-d,0],[d,0],[f,c],[-f,c]],m=.07,h=.75,g=[[[-.36,m],[.36,m],[.36,h],[-.36,h]],[[.42,m],[u(m)-.09,m],[u(h)-.09,h],[.42,h]],[[-.42,m],[-.42,h],[-u(h)+.09,h],[-u(m)+.09,m]]];e.add(`gelcoat`,Ir(p,g,(e,t,n)=>l(e,t).addScaledVector(o,-n*.05)),{color:V.gelcoat,rough:.3});for(let t of g){let n=Pi(t,.022);e.add(`fittings`,Ir(n,[Pi(t,-.006)],(e,t,n)=>l(e,t).addScaledVector(o,.008-n*.066)),ki)}for(let[t,n]of[[0,.25],[-.72,.2]]){let r=l(t,.1).addScaledVector(o,.012),i=a.clone().applyAxisAngle(o,n),s=B(r,r.clone().addScaledVector(i,.52),.006,5);e.add(`fittings`,s,J),e.add(`fittings`,B(r.clone().addScaledVector(o,-.01),r.clone().addScaledVector(o,.012),.014,8),J)}}function Bi(e,t){let n=Mi(e,Math.min(Math.max(t,e.houseBack),1.18),K.roofUnderY)+.09,r=.22,i=Math.min(t-K.roofZ0,K.roofZ1-t);return i<r&&(n-=r-Math.sqrt(Math.max(0,r*r-(r-i)**2))),n}function Vi(e,t){let n=K.roofUnderY,r=[],i=[];for(let e=0;e<=22;e++){let t=e/22,n=.5-.5*Math.cos(Math.PI*t);i.push(I(K.roofZ0,K.roofZ1,I(t,n,.6)))}for(let e of[t.houseBack,t.houseFront])for(let t of[-.012,.012]){let n=e+t;n>K.roofZ0+.02&&n<K.roofZ1-.02&&i.push(n)}i.sort((e,t)=>e-t);for(let e of i){let i=Bi(t,e),a=Mi(t,Math.min(Math.max(e,t.houseBack),t.houseFront),n)-K.wallT,o=[[0,n],[a*.5,n],[a-.01,n],[a+.01,n],[i-.03,n],[i-.008,n+.008],[i,n+.025],[i-.004,Ni(i)-.012],[i-.02,Ni(i)],[i*.75,Ni(i*.75)],[i*.5,Ni(i*.5)],[i*.25,Ni(i*.25)],[0,Ni(0)]],s=o.map(t=>G(t[0],t[1],e));for(let t=o.length-2;t>=1;t--)s.push(G(-o[t][0],o[t][1],e));r.push(s)}let a=r.length-1,o=Lr(r,{closed:!0});Hi(o,e=>G(e.x,e.y-2.345,0)),Ui(o,e=>[e.x,e.z]),zr(o,e=>e.y>n+.03?[.35,0,1,0]:[.35,0,e.z>t.houseBack&&e.z<t.houseFront&&Math.abs(e.x)<Mi(t,Math.min(Math.max(e.z,t.houseBack),t.houseFront),n)-K.wallT?3:0,0]),e.add(`gelcoat`,o,{color:V.gelcoat}),e.add(`gelcoat`,Nr(r[0],G(0,0,-1)),{color:V.gelcoat,rough:.3}),e.add(`gelcoat`,Nr(r[a],G(0,0,1)),{color:V.gelcoat,rough:.3});for(let t of[1,-1]){let n=t*1.1,r=Ni(1.1)+.07;e.add(`fittings`,B(G(n,r,-.7),G(n,r,.95),.013,8),q);for(let t of[-.7,-.12,.45,.95])e.add(`fittings`,B(G(n,Ni(1.1)-.01,t),G(n,r,t),.011,6),q)}}function Hi(e,t){let n=e.attributes.position,r=e.attributes.normal,i=0,a=G(0,0,0),o=G(0,0,0);for(let e=0;e<n.count;e++)a.fromBufferAttribute(n,e),o.fromBufferAttribute(r,e),i+=o.dot(t(a));if(i<0){let t=Array.from(e.index.array);for(let e=0;e<t.length;e+=3){let n=t[e+1];t[e+1]=t[e+2],t[e+2]=n}e.setIndex(t),e.computeVertexNormals()}}function Ui(e,t){let n=e.attributes.position,r=new Float32Array(n.count*2),i=G(0,0,0);for(let e=0;e<n.count;e++){i.fromBufferAttribute(n,e);let a=t(i);r[e*2]=a[0],r[e*2+1]=a[1]}e.setAttribute(`uv`,new O(r,2))}function Wi(){let e=K.dash,t=new m(e.zFace,e.yKnee),n=new m(e.zTop,e.yTop),r=n.clone().sub(t).normalize();return{along:G(0,r.y,r.x),normal:G(0,r.x,-r.y),at:(e,r)=>G(e,I(t.y,n.y,r),I(t.x,n.x,r)),length:t.distanceTo(n),angle:Math.atan2(r.x,r.y)}}function Gi(e,t,n){let r=K.dash,i=[[r.zFace,t.deckY],[r.zFace,r.yKnee],[r.zTop,r.yTop],[r.zBack,r.yTop],[r.zBack,t.deckY]],a=[];for(let e=0;e<i.length;e++){let t=i[e],n=i[(e+1)%i.length];for(let e=0;e<6;e++)a.push([I(t[0],n[0],e/6),I(t[1],n[1],e/6)])}let o=(e,n)=>Math.min(r.halfW,t.halfBreadth(t.tAtSheerZ(e),Math.min(n,t.sheerY(t.tAtSheerZ(e))))-t.shell-.004),s=Ir(a,[],(e,t,n)=>G((n?-1:1)*o(e,t),t,e));zr(s,()=>[.5,0,2,0]),e.add(`gelcoat`,s,{color:V.gelcoat});let c=R(r.halfW*2-.01,.01,r.zBack-r.zTop);c.translate(0,r.yTop+.005,(r.zBack+r.zTop)/2),e.add(`gelcoat`,c,{color:2763823,rough:.85});let l=Wi(),u=R(r.halfW*2-.04,l.length-.02,.012);u.applyMatrix4(L(0,0,0,l.angle,0,0)),u.translate(...l.at(0,.5).addScaledVector(l.normal,.004).toArray()),e.add(`fittings`,u,{color:1908514,rough:.7,pattern:4});let d=R(r.halfW*2-.02,.03,.022);d.translate(0,r.yTop+.02,r.zTop+.011),e.add(`wood`,d,{rough:.3});for(let[t,n]of[[-.76,.72],[-.34,.72],[-.55,.9],[-.12,.5],[.02,.5]]){let r=l.at(t,n).addScaledVector(l.normal,.012),i=new p().makeBasis(G(-1,0,0),l.along,l.normal).setPosition(r),a=kr(.043,.006,4,16);a.applyMatrix4(i),e.add(`fittings`,a,q);let o=new oe(.042,20);o.applyMatrix4(new p().makeBasis(G(-1,0,0),l.along,l.normal).setPosition(r.clone().addScaledVector(l.normal,.001))),e.add(`glow`,o,{color:16777215,rough:.2,pattern:3})}let f=l.at(.55,.45).addScaledVector(l.normal,.012),m=new p().makeBasis(G(-1,0,0),l.along,l.normal).setPosition(f),h=R(.34,.1,.008);h.applyMatrix4(m),e.add(`fittings`,h,{color:2961462,rough:.5,pattern:4});let g=R(.3,.014,.002);g.applyMatrix4(new p().makeBasis(G(-1,0,0),l.along,l.normal).setPosition(f.clone().addScaledVector(l.along,-.038).addScaledVector(l.normal,.005))),e.add(`fittings`,g,{color:16777215,rough:.5,pattern:8});for(let t=0;t<6;t++){let n=R(.03,.045,.015);n.applyMatrix4(new p().makeBasis(G(-1,0,0),l.along,l.normal).setPosition(f.clone().add(G(-.13+t*.052,0,0)).addScaledVector(l.normal,.008))),e.add(`fittings`,n,{color:1118740,rough:.4});let r=R(.008,.008,.004);r.applyMatrix4(new p().makeBasis(G(-1,0,0),l.along,l.normal).setPosition(f.clone().add(G(-.13+t*.052,0,0)).addScaledVector(l.along,.035).addScaledVector(l.normal,.006))),e.add(`glow`,r,{color:t%3==0?3407718:16733474,rough:.3,pattern:6})}let _=l.at(K.helmX,.45),v=_.clone().addScaledVector(l.normal,.14);e.add(`fittings`,B(_.clone().addScaledVector(l.normal,-.01),v.clone().addScaledVector(l.normal,-.03),.02,10),q);let y=z(.05,.055,.025,16);y.applyMatrix4(Sr(_.clone().addScaledVector(l.normal,.008),l.normal)),e.add(`fittings`,y,{color:2829616,rough:.5}),n.wheelCenter=v,n.wheelAxis=l.normal.clone().negate();let b=-.93,x=1.24,C=Dr(.1,.075,.15,.015,1);C.translate(b,r.yTop+.01+.0375,x),e.add(`fittings`,C,J);let w=R(.085,.004,.13);w.translate(b,r.yTop+.01+.077,x),e.add(`fittings`,w,q),n.throttlePivot=G(b,r.yTop+.09,x);let T=K.helmX,E=1.3,ee=Ar([[0,0],[.07,0],[.072,.02],[.062,.045],[0,.045]],20);ee.translate(T,r.yTop+.01,E),e.add(`fittings`,ee,J);let te=z(.05,.05,.01,20);te.translate(T,r.yTop+.06,E),e.add(`fittings`,te,{color:2894890,rough:.5});let ne=R(.004,.02,.008);ne.translate(T,r.yTop+.07,1.345),e.add(`fittings`,ne,{color:13647914,rough:.5});let re=Or(.058,20,8,0,Math.PI*2,0,Math.PI/2);re.translate(T,r.yTop+.053,E),e.add(`glass`,re);for(let[t,n]of[[-.06,1],[.38,2]]){let i=.27,a=L(t,r.yTop+.01+i/2+.03,1.29,.3,0,0),o=Dr(.36,i,.07,.018,1);o.applyMatrix4(a),e.add(`fittings`,o,J);let s=R(.1,.05,.08);s.translate(t,r.yTop+.035,1.3),e.add(`fittings`,s,J);let c=new S(.31,.21000000000000002);c.applyMatrix4(new p().makeRotationY(Math.PI)),c.applyMatrix4(L(0,.012,-.037)),c.applyMatrix4(a);let l=c.attributes.uv;for(let e=0;e<l.count;e++)l.setX(e,1-l.getX(e));e.add(`glow`,c,{color:16777215,rough:.15,pattern:n})}let ie=1.02,ae=K.roofUnderY-.07,se=Dr(.9,.13,.3,.02,1);se.applyMatrix4(L(-.15,ae,ie,-.25,0,0)),e.add(`fittings`,se,{color:2369066,rough:.6});let ce=L(-.15,ae,ie,-.25,0,0),D=R(.2,.06,.02);D.applyMatrix4(new p().makeTranslation(-.18,0,-.155)),D.applyMatrix4(ce),e.add(`fittings`,D,{color:1118740,rough:.4});let O=new S(.09,.03);O.applyMatrix4(new p().makeRotationY(Math.PI)),O.applyMatrix4(new p().makeTranslation(-.2,.005,-.168)),O.applyMatrix4(ce),e.add(`glow`,O,{color:8257434,rough:.2,pattern:6});for(let t of[-.06,.1,.26]){let n=z(.012,.012,.02,10);n.applyMatrix4(new p().makeRotationX(Math.PI/2)),n.applyMatrix4(new p().makeTranslation(t,0,-.16)),n.applyMatrix4(ce),e.add(`fittings`,n,q)}let le=Dr(.05,.08,.03,.01,1);le.translate(-.02,ae-.2,.9),e.add(`fittings`,le,J),e.add(`fittings`,jr([G(-.05,ae-.04,.87),G(-.08,ae-.1,.88),G(-.04,ae-.14,.89),G(-.02,ae-.16,.9)],.004,16,4),J);let k=z(.08,.085,.012,20);k.translate(0,K.roofUnderY-.006,.42),e.add(`glow`,k,{color:16770744,rough:.4,pattern:5});let A=R(.5,.62,.01);A.translate(.55,.72,r.zFace-.004),e.add(`fittings`,A,{color:1184533,rough:.9});for(let[t,n,i,a]of[[.56,.03,.55,1.045],[.56,.03,.55,.395],[.03,.68,.285,.72],[.03,.68,.815,.72]]){let o=R(t,n,.022);o.translate(i,a,r.zFace-.011),e.add(`wood`,o,{rough:.3})}}function Ki(e,t){let n=K.helmX,r=K.seatZ,i=t.deckY,a=z(.18,.19,.012,20);a.translate(n,i+.006,r),e.add(`fittings`,a,q),e.add(`fittings`,B(G(n,i,r),G(n,.92,r),.042,14),q);let o=kr(.17,.011,6,28);o.applyMatrix4(L(n,.62,r,Math.PI/2,0,0)),e.add(`fittings`,o,q);for(let t=0;t<3;t++){let i=t*Math.PI*2/3+.5;e.add(`fittings`,B(G(n+Math.cos(i)*.04,.62,r+Math.sin(i)*.04),G(n+Math.cos(i)*.165,.62,r+Math.sin(i)*.165),.008,6),q)}let s=Dr(.44,.045,.4,.015,1);s.translate(n,.94,r),e.add(`fittings`,s,{color:2829875,rough:.5});let c=Dr(.46,.085,.42,.035,1);c.translate(n,1,r),e.add(`fittings`,c,Ai);let l=Dr(.44,.3,.075,.03,1);l.applyMatrix4(L(n,1.22,r-.2,-.17,0,0)),e.add(`fittings`,l,Ai),e.add(`fittings`,B(G(n,.96,r-.17),G(n,1.12,r-.2),.018,8),q);let u=Dr(.42,.4,.75,.02,1);u.translate(.86,i+.2,.45),e.add(`gelcoat`,u,{color:V.gelcoat,rough:.35});let d=Dr(.42,.07,.73,.03,1);d.translate(.86,i+.435,.45),e.add(`fittings`,d,Ai)}function qi(e,t,n,r){return t*(Mi(e,n,r)-K.wallT)}function Ji(e,t){let n=K.dash,r=t.deckY,i=K.roofUnderY,a=e=>Math.min(ei(t,e)-K.wallT,t.halfBreadth(t.tAtSheerZ(e),r)-t.shell)-.015,s=[],c=t.houseBack-.02,l=n.zFace-.005;for(let e=0;e<=6;e++){let t=I(c,l,e/6);s.push([t,-a(t)])}for(let e=6;e>=0;e--){let t=I(c,l,e/6);s.push([t,a(t)])}let u=Ir(s,[],(e,t,n)=>G(t,r+.009-n*.009,e),{back:!1});e.add(`wood`,u,{rough:.5,pattern:2});for(let n of[-.22,.26,.74]){let r=R(.045,.016,2*(Mi(t,n,i)-K.wallT)-.02);r.applyMatrix4(L(0,i-.008,n,0,Math.PI/2,0)),e.add(`wood`,r,{rough:.35})}let d=i-.06;e.add(`wood`,B(G(-.32,d,-.2),G(-.32,d,.9),.016,10),{rough:.35});for(let t of[-.12,.35,.82])e.add(`fittings`,B(G(-.32,d,t),G(-.32,i-.004,t),.011,8),q);for(let t of[-.3,.35,.95]){let n=R(.36,.012,.03);n.translate(.64,i-.08,t),e.add(`fittings`,n,J);for(let n of[.48,.8])e.add(`fittings`,B(G(n,i-.08,t),G(n,i-.002,t),.005,6),q)}for(let[t,n]of[.54,.64,.74].entries()){let r=i-.066,a=-.42+t*.05;e.add(`fittings`,B(G(n,r,a),G(n,r,1.12),.007,6,.0025),{color:[1776670,2767442,4857626][t],rough:.3}),e.add(`fittings`,B(G(n,r,a),G(n,r,a+.24),.013,8),{color:11831900,rough:.85});let o=z(.034,.034,.03,12);o.applyMatrix4(L(n,r-.045,a+.3,0,0,Math.PI/2)),e.add(`fittings`,o,{color:[9080209,12095552,2829616][t],rough:.3,metal:1}),e.add(`fittings`,B(G(n,r-.012,a+.3),G(n,r-.03,a+.3),.004,5),{color:2829616,rough:.4})}{let n=.56,r=1.33,i=qi(t,1,n,r),a=R(.014,.22,.34);a.translate(i-.007,r,n),e.add(`fittings`,a,{color:3816770,rough:.5,pattern:4});for(let t=0;t<2;t++){let r=1.375-t*.1,a=R(.002,.014,.3);a.translate(i-.015,r+.035,n),e.add(`fittings`,a,{color:16777215,rough:.5,pattern:8});for(let n=0;n<8;n++){let a=R(.016,.034,.02);a.translate(i-.021,r,.42500000000000004+n*.0386),e.add(`fittings`,a,{color:1184532,rough:.4});let o=R(.012,.012,.008);o.translate(i-.034,r+((n*7+t*3)%5==0?-.007:.007),.42500000000000004+n*.0386),e.add(`fittings`,o,{color:(n*7+t*3)%5==0?11545122:1974049,rough:.4})}}}let f=(n,r,i,a)=>{let s=qi(t,1,n,r);e.add(`fittings`,B(G(s,r+.02,n),G(s-.05,r+.04,n),.006,6),q);let c=Ar([[.17,0],[.2,.03],[.2,.3],[.21,.5],[.2,.56],[.12,.62],[.05,.66],[.001,.665]].map(([e,t])=>[e*a,t*a]),20);c.applyMatrix4(L(s-.06,r-.66*a,n,0,0,0,.3,1,1)),e.add(`fittings`,c,{color:i,rough:.6,pattern:9});for(let t of[-1,1]){let o=jr([G(s-.07,r-.12*a,n+t*.17*a),G(s-.1,r-.3*a,n+t*.2*a),G(s-.11,r-.52*a,n+t*.16*a)],.045*a,10,8);e.add(`fittings`,o,{color:i,rough:.6,pattern:9})}let l=Or(.1*a,12,8,0,Math.PI*2,0,Math.PI*.6);l.applyMatrix4(L(s-.04,r-.03,n,.5,0,0,.5,.8,1)),e.add(`fittings`,l,{color:new o(i).multiplyScalar(.85).getHex(),rough:.6,pattern:9})};f(-.12,1.92,14723100,1),f(.14,1.9,14832410,.8);{let n=-.18,i=r+.2,a=qi(t,-1,n,.8),o=a+.075,s=Ar([[0,0],[.058,0],[.062,.02],[.062,.3],[.05,.35],[.018,.37],[0,.37]],18);s.translate(o,i,n),e.add(`fittings`,s,{color:11736335,rough:.35});let c=R(.03,.05,.05);c.translate(o,i+.39,n),e.add(`fittings`,c,{color:1710618,rough:.4}),e.add(`fittings`,B(G(o,i+.41,n),G(o+.02,i+.42,-.09),.007,6),{color:9211795,rough:.3,metal:1}),e.add(`fittings`,jr([G(o,i+.38,-.16),G(o+.03,i+.3,-.10999999999999999),G(o+.05,i+.15,-.12),G(o+.06,i+.08,-.15)],.008,12,5),{color:1315860,rough:.6});for(let t of[.12,.26]){let r=kr(.064,.004,4,20);r.applyMatrix4(L(o,i+t,n,Math.PI/2,0,0)),e.add(`fittings`,r,q)}let l=R(.006,.3,.07);l.translate(a+.003,i+.19,n),e.add(`fittings`,l,q);let u=z(.0625,.0625,.1,18,1,!0,-.9,1.8);u.translate(o,i+.19,n),e.add(`fittings`,u,{color:16777215,rough:.5,pattern:8})}let m=(n,r,i,a,o,s,c)=>{let l=new S(a,o);l.applyMatrix4(L(0,0,0,0,n>0?-Math.PI/2:Math.PI/2,0)),l.applyMatrix4(new p().makeRotationX(s)),l.translate(0,i,r);let u=l.getAttribute(`position`);for(let e=0;e<u.count;e++)u.setX(e,qi(t,n,u.getZ(e),u.getY(e))-n*.012);u.needsUpdate=!0,l.computeVertexNormals(),e.add(`fittings`,l,c)};m(-1,.02,1.47,.1,.13,.06,{color:16777215,rough:.3,pattern:7,anim:.15}),m(-1,.15,1.42,.12,.09,-.1,{color:16777215,rough:.3,pattern:7,anim:.7}),m(-1,.36,1.36,.19,.25,.02,{color:16777215,rough:.9,pattern:5});for(let[e,t]of[[-.09,.12],[.09,.12]])m(-1,.36+e,1.36+t,.05,.018,.5,{color:14208936,rough:.8});{let n=.85,r=1.3,i=qi(t,-1,n,r)+.035;e.add(`fittings`,B(G(i,r,.75),G(i,r,.95),.02,12),{color:15909403,rough:.45}),e.add(`fittings`,B(G(i,r,.95),G(i,r,.98),.026,12),{color:1710618,rough:.4});for(let t of[-.06,.05]){let a=kr(.023,.003,4,12,Math.PI*1.3);a.applyMatrix4(L(i,r,n+t,0,Math.PI/2,-.65)),e.add(`fittings`,a,J)}}{let t=n.yTop+.01,r=L(.74,t+.004,1.26,0,.18,0),i=R(.23,.005,.31);i.applyMatrix4(r),e.add(`fittings`,i,{color:7031339,rough:.7});let a=new S(.21,.28);a.applyMatrix4(L(0,.0035,.012,-Math.PI/2,0,0)),a.applyMatrix4(r),e.add(`fittings`,a,{color:16777215,rough:.9,pattern:5});let o=R(.08,.014,.03);o.applyMatrix4(L(0,.008,.14)),o.applyMatrix4(r),e.add(`fittings`,o,q);let s=-.76,c=1.34,l=kr(.05,.006,6,18);l.applyMatrix4(L(s,t+.035,c,Math.PI/2,0,0)),e.add(`fittings`,l,J);let u=z(.042,.038,.095,18,1,!0);u.translate(s,t+.048,c),e.add(`fittings`,u,{color:2050618,rough:.25});let d=z(.039,.036,.09,18,1,!0);d.translate(s,t+.05,c),Yi(d),e.add(`fittings`,d,{color:15328472,rough:.25});let f=new oe(.039,18);f.applyMatrix4(L(s,t+.082,c,-Math.PI/2,0,0)),e.add(`fittings`,f,{color:2758155,rough:.1});let p=new oe(.038,18);p.applyMatrix4(L(s,t+5e-4,c,Math.PI/2,0,0)),e.add(`fittings`,p,{color:2050618,rough:.4});let m=kr(.026,.006,6,12,Math.PI);m.applyMatrix4(L(-.802,t+.048,c,0,0,Math.PI/2)),e.add(`fittings`,m,{color:2050618,rough:.25})}{let t=r+.47;for(let[n,r]of[0,.05].entries()){let i=Dr(.34,.05,.4,.02,1);i.applyMatrix4(L(.86,t+.025+r,.28+n*.02,0,.12*n-.05,0)),e.add(`fittings`,i,{color:14832410,rough:.6,pattern:9});for(let i of[-.08,.08]){let a=R(.345,.052,.025);a.applyMatrix4(L(.86,t+.025+r,.28+n*.02+i,0,.12*n-.05,0)),e.add(`fittings`,a,{color:1381653,rough:.7})}}let n=new S(.3,.22);n.applyMatrix4(L(.85,t+.002,.64,-Math.PI/2,0,.3)),e.add(`fittings`,n,{color:16777215,rough:.85,pattern:6});for(let t=0;t<5;t++){let n=kr(.15-t*.004,.011,6,28);n.applyMatrix4(L(.62+t*.004,r+.02+t*.02,-.14+t*.006,Math.PI/2+t%2*.06,0,0));let i=n.attributes.uv;for(let e=0;e<i.count;e++)i.setXY(e,i.getX(e)*.94,i.getY(e));e.add(`fittings`,n,{color:2906764,rough:.8,pattern:1})}}}function Yi(e){let t=Array.from(e.index.array);for(let e=0;e<t.length;e+=3){let n=t[e+1];t[e+1]=t[e+2],t[e+2]=n}e.setIndex(t);let n=e.attributes.normal;for(let e=0;e<n.count;e++)n.setXYZ(e,-n.getX(e),-n.getY(e),-n.getZ(e))}function Xi(e,t,n){let r=Ni(0),i=-.5,a=R(.18,.025,.18);a.translate(0,r+.005,i),e.add(`fittings`,a,Oi),e.add(`fittings`,B(G(0,r,i),G(0,3.9,i),.042,14,.03),Oi);let o=R(.1,.035,.34);o.translate(0,3,-.31),e.add(`fittings`,o,Oi);let s=R(.34,.015,.34);s.translate(0,3.02,-.2),e.add(`fittings`,s,Oi),e.add(`fittings`,B(G(0,3,-.46),G(0,2.82,-.49),.012,6),Oi);let c=Ar([[0,0],[.285,0],[.3,.018],[.3,.095],[.29,.14],[.245,.188],[.16,.222],[.07,.234],[0,.236]],24);c.translate(0,3.028,-.2),e.add(`fittings`,c,{color:15987438,rough:.4});let l=z(.302,.302,.02,24,1,!0);l.translate(0,3.05,-.2),e.add(`fittings`,l,{color:3816770,rough:.5});let u=3.45,d=R(.78,.03,.045);d.translate(0,3.4000000000000004,i),e.add(`fittings`,d,Oi);for(let t of[1,-1]){let n=t*.4,r=R(.055,.07,.11);r.translate(n,u,-.48),e.add(`fittings`,r,J);let i=R(.014,.05,.085);i.translate(n+t*.033,u,-.47),e.add(`glow`,i,{color:t>0?16718350:1376090,rough:.2,pattern:0});let a=R(.004,.07,.12);a.translate(n-t*.03,u,-.48),e.add(`fittings`,a,J)}let f=z(.036,.036,.03,12);f.translate(0,3.915,i),e.add(`fittings`,f,J);let p=z(.03,.03,.065,12);p.translate(0,3.962,i),e.add(`glow`,p,{color:16774108,rough:.2,pattern:0});let m=z(.034,.038,.016,12);m.translate(0,4.003,i),e.add(`fittings`,m,J);for(let t of[1,-1]){let n=t*1.02,r=-.78,i=Ni(1.02),a=Dr(.06,.07,.06,.01,1);a.translate(n,i+.035,r),e.add(`fittings`,a,q);let o=t>0?2.4:1.2,s=z(.005,.013,o,8,10);s.translate(n,i+.07+o/2,r),zr(s,e=>[.3,0,3,Math.max(0,(e.y-i-.07)/o)]),e.add(`fittings`,s,{color:16053489})}let h=.8,g=Dr(.26,.28,.3,.03,1);g.translate(0,r+.14,h),e.add(`fittings`,g,{color:15987438,rough:.4}),n.radarPivot=G(0,r+.3,h);let _=.62,v=1.05,y=Ni(_);for(let t of[-1,1]){let n=t*_;e.add(`fittings`,B(G(n,y,v),G(n,y+.1,v),.03,10),J);let r=z(.065,.06,.15,16);r.applyMatrix4(L(n,y+.17,v,Math.PI/2,0,0)),e.add(`fittings`,r,q);let i=new oe(.058,16);i.translate(n,y+.17,1.1255),e.add(`glow`,i,{color:16773590,rough:.2,pattern:4})}let b=Ar([[0,0],[.018,0],[.016,.1],[.024,.17],[.05,.22],[.046,.222],[0,.2]],16);b.applyMatrix4(L(0,Ni(0)+.07,.93,Math.PI/2,0,0)),e.add(`fittings`,b,q),e.add(`fittings`,B(G(0,Ni(0),v),G(0,Ni(0)+.07,v),.012,6),q);let x=.62,C=-.72,w=R(.12,.03,.12);w.translate(x,Ni(x)+.015,C),e.add(`fittings`,w,q);for(let[t,n]of li())t.translate(x,Ni(x)+.03,C),e.add(`fittings`,t,n);for(let t of[1,-1]){let n=Dr(.13,.07,.08,.01,1);n.translate(t*.55,K.roofUnderY-.035,K.roofZ0+.14),e.add(`fittings`,n,J);let r=new S(.11,.06);r.applyMatrix4(L(t*.55,K.roofUnderY-.071,K.roofZ0+.14,Math.PI/2+.35,0,0)),e.add(`glow`,r,{color:16773590,rough:.2,pattern:4})}let T=Mi(t,-.02,1.72)+.05,E=kr(.235,.05,8,24);E.applyMatrix4(L(T,1.72,-.02,0,Math.PI/2,0)),Rr(E,e=>{let t=Math.atan2(e.y-1.72,e.z+.02);return Math.abs((t/(Math.PI/2)%1+1)%1-.5)>.4?15921386:15882770}),e.add(`fittings`,E,{rough:.6});let ee=R(.03,.05,.08);ee.translate(T-.03,1.98,-.02),e.add(`fittings`,ee,q)}function Zi(){let e=[],t={rough:.3,metal:0};e.push(wr(kr(.2,.017,8,40),{...t,color:15251608}));for(let n=0;n<6;n++){let r=n*Math.PI/3+Math.PI/6,i=G(Math.cos(r),Math.sin(r),0),a=z(.009,.013,.15000000000000002,8);a.applyMatrix4(Sr(i.clone().multiplyScalar(.125),i)),e.push(wr(a,{...t,color:15251608}));let o=Ar([[0,0],[.011,0],[.013,.02],[.017,.045],[.012,.06],[.01,.07],[.015,.078],[0,.086]],8);o.applyMatrix4(Sr(i.clone().multiplyScalar(.195),i)),e.push(wr(o,{...t,color:15251608}))}let n=Ar([[0,-.03],[.05,-.03],[.058,-.012],[.058,.012],[.05,.028],[0,.03]],20);n.applyMatrix4(new p().makeRotationX(Math.PI/2)),e.push(wr(n,{...t,color:15251608}));let r=Or(.032,16,6,0,Math.PI*2,0,Math.PI/2);return r.applyMatrix4(new p().makeRotationX(-Math.PI/2)),r.translate(0,0,-.028),e.push(wr(r,{color:13148240,rough:.25,metal:1,pattern:1})),Er(e)}function Qi(){let e=[];e.push(wr(B(G(0,-.01,0),G(0,.15,.015),.008,8),q));let t=Or(.022,14,10);t.scale(1,1.15,1),t.translate(0,.165,.016),e.push(wr(t,J));let n=z(.02,.02,.05,12);return n.applyMatrix4(new p().makeRotationZ(Math.PI/2)),e.push(wr(n,q)),Er(e)}function $i(){let e=[];e.push(wr(z(.05,.06,.06,14),{color:15987438,rough:.4}));let t=Dr(1.05,.12,.1,.035,2);t.translate(0,.09,0),e.push(wr(t,{color:15987438,rough:.4}));let n=R(.95,.028,.004);return n.translate(0,.09,.051),e.push(wr(n,{color:2895669,rough:.5})),Er(e)}var ea={DROPLET:0,MIST:1,LIGAMENT:2,SPRAY:3,SHEET:4},ta={tau:[3,.35,5,1.8,2.5],grav:[ge,.3,ge,8.5,ge],turb:[0,.5,0,.3,.1],grow:[0,.22,0,.3,.7],dies:[1,0,1,1,1],deposit:[1,0,3,4,2],stretch:[1/40,0,1/40,1/30,1/60],alpha:[.55,.06,.8,.66,.22],fadeIn:[.02,.2,.02,.12,.02],fadeOut:[.8,.45,.8,.7,.5]},na=e=>{let t=String(e);return/[.e]/.test(t)?t:t+`.0`},ra=(e,t)=>`sprayByKind( ${e}, ${t.map(na).join(`, `)} )`,ia=32,aa=new M({name:`sprayCommon`,deps:[N],code:`
const SPRAY_DROPLET: f32 = 0.0;
const SPRAY_MIST: f32 = 1.0;
const SPRAY_LIGAMENT: f32 = 2.0;
const SPRAY_SPRAY: f32 = 3.0;
const SPRAY_SHEET: f32 = 4.0;

// PCG hash of a uint -> [0, 1)
fn sprayHash( seed: u32 ) -> f32 {
	let state = seed * 747796405u + 2891336453u;
	let word = ( ( state >> ( ( state >> 28u ) + 4u ) ) ^ state ) * 277803737u;
	return f32( ( word >> 22u ) ^ word ) * ( 1.0 / 4294967296.0 );
}

// select a per-kind constant
fn sprayByKind( kind: f32, a: f32, b: f32, c: f32, d: f32, e: f32 ) -> f32 {
	return select( select( select( select( e, d, kind < 3.5 ), c, kind < 2.5 ), b, kind < 1.5 ), a, kind < 0.5 );
}

// Henyey-Greenstein phase (1/sr)
fn sprayPhaseHG( cosT: f32, g: f32 ) -> f32 {
	let g2 = g * g;
	return ( ( 1.0 - g2 ) / ( 4.0 * PI ) ) / pow( max( 1.0 + g2 - 2.0 * g * cosT, 1e-4 ), 1.5 );
}
`}),oa=class{constructor(e,{query:t,terrain:n,sceneCopy:r,clouds:a=null,gpuCapacity:o=32768,cpuCapacity:s=8192}){this.renderer=e,this.query=t,this.terrain=n,this.clouds=a,this.shoreSim=null,this.waveShadow=null,this.NG=o,this.NC=s,this.N=o+s;let c=this.N;this.pos=new k({label:`sprayPos`,count:c,type:`vec4f`}),this.vel=new k({label:`sprayVel`,count:c,type:`vec4f`}),this.info=new k({label:`sprayInfo`,count:c,type:`vec4f`}),this.head=new k({label:`sprayHead`,count:1,type:`u32`}),this.reqData=new Float32Array(512),this.reqBuffer=new k({label:`sprayReq`,count:128,type:`vec4f`}),this.nReq=0,this.nReqParticles=0,this.cpuHead=0,this._frame=0,this.simParams=new d(`SprayParams`,{frameSeed:[`u32`,0],cpuStart:[`u32`,0],cpuCount:[`u32`,0],reqCount:[`u32`,0],bodyMat:[`mat4x4f`,new p],bodyInv:[`mat4x4f`,new p],bodyVel:[`vec3f`,new i],bodyOn:[`f32`,0],bodyHull:[`vec4f`,new h(0,0,1,0)],bodyHullWL:[`vec4f`,new h(0,1,0,0)],bodySheer:[`vec4f`,new h(0,0,-1,0)],bodyBoxMin:[`vec3f`,new i],bodyBoxMax:[`vec3f`,new i]},{label:`spray params`});let l=this.simParams.fields;this.cpuStart=l.cpuStart,this.cpuCount=l.cpuCount,this.reqCount=l.reqCount,this.frameSeed=l.frameSeed,this.body={on:l.bodyOn,mat:l.bodyMat,inv:l.bodyInv,vel:l.bodyVel,hull:l.bodyHull,hullWL:l.bodyHullWL,sheer:l.bodySheer,boxMin:l.bodyBoxMin,boxMax:l.bodyBoxMax},this.module=new M({name:`spray`,deps:[aa],uniforms:this.simParams,uniformName:`sprayParams`,bindings:{sprayPos:{storage:this.pos,access:`read_write`},sprayVel:{storage:this.vel,access:`read_write`},sprayInfo:{storage:this.info,access:`read_write`},sprayHead:{storage:this.head,access:`read_write`,wgslType:`array<atomic<u32>>`}},code:`
const SPRAY_NG: u32 = ${this.NG}u;
const SPRAY_NC: u32 = ${this.NC}u;
const SPRAY_N: u32 = ${this.N}u;

// Reserve n ring slots of the GPU part; returns the base (pass it to spraySlot)
fn sprayReserve( n: u32 ) -> u32 { return atomicAdd( &sprayHead[ 0 ], n ); }
fn spraySlot( base: u32, i: u32 ) -> u32 { return ( base + i ) & ( SPRAY_NG - 1u ); }

fn sprayWrite( slot: u32, p: vec3f, v: vec3f, size: f32, kind: f32, life: f32, seed: f32 ) {
	sprayPos[ slot ] = vec4f( p, 0.0 );
	sprayVel[ slot ] = vec4f( v, size );
	sprayInfo[ slot ] = vec4f( kind, life, p.y, seed );
}

fn sprayRand( a: u32, b: u32 ) -> f32 {
	return sprayHash( a + b * 1664525u + sprayParams.frameSeed * 2654435761u );
}
`}),this.updateKernel=null,this._buildMesh(r)}emit(e,t,n,r=.04,i=ea.DROPLET,a={}){if(this.nReq>=ia||n<=0||(n=Math.min(Math.round(n),this.NC-this.nReqParticles),n<=0))return;let{spread:o=.6,jitter:s=.05,life:c=i===ea.MIST?2.5:1.6,to:l=null,sizeJitter:u=.5}=a,d=l||e,f=this.reqData,p=this.nReq*16;this.nReqParticles+=n,f[p]=e.x,f[p+1]=e.y,f[p+2]=e.z,f[p+3]=this.nReqParticles,f[p+4]=d.x,f[p+5]=d.y,f[p+6]=d.z,f[p+7]=r,f[p+8]=t.x,f[p+9]=t.y,f[p+10]=t.z,f[p+11]=i,f[p+12]=o,f[p+13]=s,f[p+14]=c,f[p+15]=u,this.nReq++}emitAlongPoints(e,t,n,r=.04,i=ea.DROPLET,a={}){let o=Object.assign(this._segOpts||={},a);for(let a=0;a+1<e.length;a++)o.to=e[a+1],this.emit(e[a],Array.isArray(t)?t[a]:t,n,r,i,o);o.to=null}setBodyShape({zAft:e,zShoulder:t,zStem:n,halfBeam:r,wlShoulder:i,wlStem:a,wlHalfBeam:o,ySheerAft:s,ySheerStem:c,yBottom:l,boxMin:u,boxMax:d}){let f=this.body;f.hull.value.set(e,t,n,r),f.hullWL.value.set(i,a,o,0),f.sheer.value.set(s,c,l,0),f.boxMin.value.copy(u),f.boxMax.value.copy(d)}setBody(e,t){let n=this.body;n.on.value=+!!e,e&&(n.mat.value.copy(e),n.inv.value.copy(e).invert(),n.vel.value.copy(t))}_hooks(){if(this._hookModule)return this._hookModule;let e=[],t=``;return this.clouds&&this.clouds.module?(e.push(this.clouds.module),t+=`fn sprayCloudShadow( xz: vec2f ) -> f32 { return cloudsShadow( xz ); }
`):t+=`fn sprayCloudShadow( xz: vec2f ) -> f32 { return 1.0; }
`,this.waveShadow?(e.push(this.waveShadow.module||this.waveShadow),t+=`fn sprayWaveShadow( p: vec3f, tag: f32 ) -> f32 { return breakersSprayShadow( p, tag ); }
`):t+=`fn sprayWaveShadow( p: vec3f, tag: f32 ) -> f32 { return 1.0; }
`,this._hookModule=new M({name:`sprayHooks`,deps:e,code:t}),this._hookModule}_buildUpdate(){let e=this.NG,t=this.NC,n=this.shoreSim,r=n&&n.depositModule,i=[this.module,this.query.module,this.terrain.module];r&&i.push(r),this.updateKernel=new Vt({label:`Spray Update`,modules:i,bindings:{sprayReq:{storage:this.reqBuffer,access:`read`}},workgroupSize:[64,1,1],code:`
// Push a particle out of the body (hull or box) through the nearest face; the velocity into it
// (relative to the body) is removed and the rest damped (the water runs off as a film); drops
// that hit it die soon after.
fn sprayCollideBody( p: ptr<function, vec3f>, v: ptr<function, vec3f>, age: f32, life: ptr<function, f32>, isMist: bool ) {
	if ( sprayParams.bodyOn < 0.5 ) { return; }
	var q = ( sprayParams.bodyInv * vec4f( *p, 1.0 ) ).xyz;
	let H = sprayParams.bodyHull; let W = sprayParams.bodyHullWL; let S = sprayParams.bodySheer;
	// hull: the outline at this height (waterline -> sheer), half breadth at q.z (elliptic bow)
	let sheer = mix( S.x, S.y, sat( ( q.z - H.x ) / max( H.z - H.x, 0.01 ) ) );
	let fh = sat( q.y / max( sheer, 0.1 ) );
	let zSh = mix( W.x, H.y, fh ); let zSt = mix( W.y, H.z, fh ); let HB = mix( W.z, H.w, fh );
	let bowL = max( zSt - zSh, 0.01 );
	let e = sat( ( q.z - zSh ) / bowL );
	let c = sqrt( max( 1.0 - e * e, 0.02 ) );
	let hb = HB * c;
	let inHull = q.z > H.x && q.z < zSt && abs( q.x ) < hb && q.y < sheer && q.y > S.z;
	let b0 = sprayParams.bodyBoxMin; let b1 = sprayParams.bodyBoxMax;
	let inBox = q.x > b0.x && q.x < b1.x && q.y > b0.y && q.y < b1.y && q.z > b0.z && q.z < b1.z;
	if ( inHull || inBox ) {
		var n = vec3f( 0.0, 1.0, 0.0 );
		if ( inHull ) {
			let sx = select( - 1.0, 1.0, q.x > 0.0 );
			if ( hb - abs( q.x ) < sheer - q.y ) {
				// through the side; on the bow the side faces forward too (- d hb / dz)
				n = normalize( vec3f( sx, 0.0, HB * e / ( c * bowL ) ) );
				q.x = sx * ( hb + 0.02 );
			} else {
				q.y = sheer + 0.02;
			}
		} else {
			let dx = min( q.x - b0.x, b1.x - q.x );
			let dz = min( q.z - b0.z, b1.z - q.z );
			let dy = b1.y - q.y;
			if ( dy < dx && dy < dz ) {
				q.y = b1.y + 0.02;
			} else if ( dx < dz ) {
				let right = q.x > ( b0.x + b1.x ) * 0.5;
				n = vec3f( select( - 1.0, 1.0, right ), 0.0, 0.0 );
				q.x = select( b0.x - 0.02, b1.x + 0.02, right );
			} else {
				let front = q.z > ( b0.z + b1.z ) * 0.5;
				n = vec3f( 0.0, 0.0, select( - 1.0, 1.0, front ) );
				q.z = select( b0.z - 0.02, b1.z + 0.02, front );
			}
		}
		let nw = normalize( ( sprayParams.bodyMat * vec4f( n, 0.0 ) ).xyz );
		var vr = *v - sprayParams.bodyVel;
		let vn = dot( vr, nw );
		if ( vn < 0.0 ) { vr -= nw * vn; }
		*v = sprayParams.bodyVel + vr * 0.5;
		*p = ( sprayParams.bodyMat * vec4f( q, 1.0 ) ).xyz;
		// water that hits it wets it and runs off (gone); mist flows around it and settles
		*life = min( *life, select( age, age + 0.25, isMist ) );
	}
}

@compute @workgroup_size( WG_X, 1, 1 )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let i = gid.x;
	if ( i >= SPRAY_N ) { return; }

	// ---- CPU-owned slots: spawn from this frame's requests
	if ( i >= ${e}u ) {
		let k = ( i - ${e}u + ${t}u - sprayParams.cpuStart ) % ${t}u;
		if ( k < sprayParams.cpuCount ) {
			var r = 0u;
			for ( var j = 0u; j < sprayParams.reqCount; j++ ) {
				r = j;
				if ( f32( k ) < sprayReq[ j * 4u ].w ) { break; }
			}
			let r0 = sprayReq[ r * 4u ];
			let r1 = sprayReq[ r * 4u + 1u ];
			let r2 = sprayReq[ r * 4u + 2u ];
			let r3 = sprayReq[ r * 4u + 3u ];
			let h0 = sprayRand( i, 11u ); let h1 = sprayRand( i, 12u ); let h2 = sprayRand( i, 13u );
			let h3 = sprayRand( i, 14u ); let h4 = sprayRand( i, 15u ); let h5 = sprayRand( i, 16u );
			let h6 = sprayRand( i, 17u );
			let along = mix( r0.xyz, r1.xyz, h0 );
			let jit = vec3f( h1 - 0.5, h2 - 0.5, h3 - 0.5 ) * ( r3.y * 2.0 );
			let vj = vec3f( h4 - 0.5, h5 - 0.5, h6 - 0.5 ) * ( r3.x * 2.0 );
			let size = r1.w * ( 1.0 + ( h2 - 0.5 ) * r3.w );
			let life = r3.z * ( h3 * 0.5 + 0.75 );
			sprayWrite( i, along + jit, r2.xyz + vj, size, r2.w, life, h5 );
		}
	}

	// ---- integrate live particles
	let P = sprayPos[ i ];
	let Vv = sprayVel[ i ];
	let info = sprayInfo[ i ];
	if ( info.y > 0.0 ) {
		let dt = frame.dt;
		var p = P.xyz;
		var v = Vv.xyz;
		let age = P.w + dt;
		let kind = info.x;

		// wind near the surface (~70% of the 10 m wind), gusty
		let gust = sin( frame.time * 0.7 + p.x * 0.05 ) * 0.25 + 0.85;
		let wind = vec3f( frame.windDir.x, 0.0, frame.windDir.y ) * ( frame.windSpeed * 0.7 * gust );
		// drag toward the wind: small drops follow the air, mist drifts with it
		// mist first keeps moving with the air the wave pushes ahead of it, then joins the wind
		let isMist = kind > 0.5 && kind < 1.5;
		let tau = ${ra(`kind`,ta.tau)} * select( 1.0, exp( age * - 1.2 ) * 4.0 + 1.0, isMist );
		let grav = ${ra(`kind`,ta.grav)};
		let turb = vec3f(
			sin( age * 2.1 + fract( info.w ) * 40.0 ),
			sin( age * 1.7 + fract( info.w ) * 17.0 ) * 0.5,
			cos( age * 1.9 + fract( info.w ) * 29.0 ) ) * ${ra(`kind`,ta.turb)};
		v += ( ( wind - v ) / tau + turb ) * dt;
		v.y -= grav * dt;
		p += v * dt;

		var life = info.y;
		sprayCollideBody( &p, &v, age, &life, isMist );

		// water surface and ground below
		let hw = waterQueryHeightAtXZ( p.xz );
		let ground = terrainHeightAt( p.xz );
		let top = max( hw, ground );

		// drops die in the water / on the sand; mist and foam skim over it
		if ( p.y < top && v.y < 0.0 && age > 0.04 ) {
			if ( ${ra(`kind`,ta.dies)} > 0.5 ) {
				life = 0.0;
${r?`				// fell into the water (not onto the sand): its bubbles add to the foam there
				if ( hw > ground + 0.02 ) {
					shoreSimDepositAt( p.xz, u32( ${ra(`kind`,ta.deposit)} ) );
				}
`:``}			} else {
				p.y = top + 0.02;
				v.y = max( v.y, 0.0 );
				v = vec3f( v.x * 0.95, v.y, v.z * 0.95 );
			}
		}

		if ( age > life ) { life = 0.0; }

		// mist and spray clouds grow as they dilute
		let size = Vv.w * ( 1.0 + dt * ${ra(`kind`,ta.grow)} );
		sprayPos[ i ] = vec4f( p, age );
		sprayVel[ i ] = vec4f( v, size );
		sprayInfo[ i ] = vec4f( info.x, life, hw, info.w );
	}
}
`})}update(){this.updateKernel||this._buildUpdate();let e=this.nReqParticles;this.cpuStart.value=this.cpuHead,this.cpuCount.value=e,this.reqCount.value=this.nReq,this.cpuHead=(this.cpuHead+e)%this.NC,this.nReq>0&&this.reqBuffer.write(this.reqData.subarray(0,this.nReq*16)),this.frameSeed.value=++this._frame>>>0,this.updateKernel.dispatch(Math.ceil(this.N/64)),this.nReq=0,this.nReqParticles=0}_buildMesh(e){let t=new le;t.setAttribute(`position`,new b(new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),3)),t.setIndex([0,1,2,0,2,3]),t.boundingSphere=new l(new i,1e7),t.instanceCount=this.N;let n=ca(),r=la(),a=new Ee({name:`Spray`,lit:!1,transparent:!0,depthWrite:!1,depthTest:!0,side:`double`,blending:`premultiplied`,modules:[aa],uniforms:{intensity:[`f32`,1],maxDistance:[`f32`,320]},storage:{sprayPosR:this.pos,sprayVelR:this.vel,sprayInfoR:this.info},textures:{sprayPuff:n,sprayDots:r,spraySceneDepth:{texture:()=>e.depthTexture}},varyings:{vUV:`vec2f`,vCol:`vec4f`,vMisc:`vec4f`,vFwd:`vec4f`},vertex:`
	let posA = sprayPosR[ v.instance ];
	let velA = sprayVelR[ v.instance ];
	let info = sprayInfoR[ v.instance ];
	let p = posA.xyz;
	let age = posA.w;
	let vel = velA.xyz;
	let kind = info.x;
	let life = info.y;
	let isDrop = kind < 0.5;
	let isLig = kind > 1.5 && kind < 2.5;
	let isMist = kind > 0.5 && kind < 1.5;
	let water = isDrop || isLig; // clear water: drops and ligaments
	let alive = life > 0.0 && age < life;

	let toCam = frame.cameraPos - p;
	let dist = max( length( toCam ), 0.05 );
	let Vd = toCam / dist;

	// pixel footprint at this distance: drops are drawn at least ~1.3 px wide
	let p11 = frame.proj[ 1 ][ 1 ];
	let pixel = dist * 2.0 / ( p11 * frame.resolution.y );
	let r0 = velA.w; // radius (m)
	// dense spray is thrown out of the splash as a compact mass and spreads (grows from ~half size)
	let tAge = age / max( life, 1e-3 );
	let r = select( r0, r0 * mix( 0.45, 1.0, smoothstep( 0.0, 0.25, tAge ) ), kind > 2.5 && kind < 3.5 );
	let size = max( r, pixel * 1.3 );

	// motion blur along the velocity projected on the view plane; ligaments are elongated anyway
	let vPerp = vel - Vd * dot( vel, Vd );
	let speed = length( vPerp );
	let stretchLen = speed * ${ra(`kind`,ta.stretch)};
	let elong = select( 0.0, r * 2.0, isLig );
	let up = select( vec3f( 0.0, 1.0, 0.0 ), vPerp / max( speed, 1e-3 ), speed > 1e-3 );
	// clouds: random rotation that slowly turns
	let rot = fract( info.w ) * 6.283 + age * ( fract( info.w ) - 0.5 );
	let camRight = normalize( cross( vec3f( 0.0, 1.0, 0.0 ), Vd ) + vec3f( 1e-5, 0.0, 0.0 ) );
	let camUp = cross( Vd, camRight );
	let mRight = camRight * cos( rot ) + camUp * sin( rot );
	let mUp = camUp * cos( rot ) - camRight * sin( rot );
	// torn sheets (dense spray) are drawn along their motion too, tilted a little at random and
	// stretched by their speed: fibrous, streaked silhouettes instead of round puffs
	let isSheet = kind > 2.5;
	let isClear = kind > 3.5; // clear sheet (bow sheet)
	let side = normalize( cross( Vd, up ) );
	let tilt = ( fract( info.w * 7.31 ) - 0.5 ) * 0.7;
	let sUp = up * cos( tilt ) + side * sin( tilt );
	let sSide = side * cos( tilt ) - up * sin( tilt );
	// mist streams with the air: drawn along its motion, stretched by its speed (wisps, not discs)
	let alongMotion = isSheet || ( isMist && speed > 0.3 );
	let axisY = select( select( mUp, sUp, alongMotion ), up, water );
	let axisX = select( select( mRight, sSide, alongMotion ), side, water );
	let sheetLen = select( 0.0, size * clamp( speed * 0.08, 0.0, 0.8 ), isSheet );
	let mistLen = select( 0.0, size * clamp( ( speed - 0.3 ) * 0.35, 0.0, 1.4 ), isMist );
	let halfY = size + stretchLen * 0.5 + elong + sheetLen + mistLen;
	let halfX = select( size, size * 1.05, isSheet );
	let corner = v.position.xy;
	let world = p + axisX * ( corner.x * halfX ) + axisY * ( corner.y * halfY );

	// coverage that conserves the water's cross-section: the drop's projected area (and the time it
	// spends on each pixel of its streak) spread over the drawn footprint. For the gaussian
	// footprint exp( -k d^2 ) the peak is k r (r + elong) / ( halfX halfY ). Clouds: lost to the clamp.
	let kShape = select( 3.5, 4.5, isLig );
	let cover = select( sat( r / size ), min( r * ( r + elong ) * kShape / ( halfX * halfY ), 1.0 ), water );

	// ---- lighting (per particle)
	let L = frame.sunDir;
	let cosT = dot( - Vd, L ); // 1 = looking toward the sun through the particle
	let cosA = dot( Vd, L );
	let sunVis = sprayCloudShadow( p.xz ) * sprayWaveShadow( p, info.w );
	let sun = frame.sunColor * sunVis;
	// clear water (drop, ligament): the bright sky it refracts and reflects, a strong forward lobe
	// (diffraction + refraction) when backlit, a small glint from any side
	let cWater = frame.skyIrradiance * 0.9 + sun * ( sprayPhaseHG( cosT, 0.85 ) * 1.2 + 0.12 );
	// dense spray: multiply scattered, white from any side (a diffuse sphere: its far side is in its
	// own shadow), plus a forward lobe
	let lambert = ( sqrt( max( 1.0 - cosA * cosA, 0.0 ) ) + ( PI - acos( clamp( cosA, -1.0, 1.0 ) ) ) * cosA ) / PI;
	// (the forward lobe is passed on separately: thin, torn parts glow with it, thick parts shade it)
	let cSpray = sun * ( ( lambert * 0.65 + 0.35 ) / PI ) + frame.skyIrradiance * 1.15;
	let fSpray = sun * ( sprayPhaseHG( cosT, 0.6 ) * 0.9 );
	// mist: a thin veil of fine drops, strongly forward scattering, tinted by the sky
	let cMist = sun * ( 0.25 / PI ) + frame.skyIrradiance * 0.9;
	let fMist = sun * sprayPhaseHG( cosT, 0.75 );
	// clear sheet: thin water, the sky it shows and a little sun off its surface; the sun shining
	// through it (forward lobe) is passed on: the thin torn parts glow when backlit
	let cClear = frame.skyIrradiance * 0.95 + sun * 0.05;
	let fClear = sun * ( sprayPhaseHG( cosT, 0.8 ) * 1.1 );
	let col = select( select( select( cSpray, cClear, isClear ), cMist, isMist ), cWater, water );
	o.vFwd = vec4f( select( select( select( fSpray, fClear, isClear ), fMist, isMist ), vec3f( 0.0 ), water ), halfX / pixel );

	// opacity over the particle's life
	let t = age / max( life, 1e-3 );
	let fadeIn = smoothstep( 0.0, ${ra(`kind`,ta.fadeIn)}, t );
	let fadeOut = 1.0 - smoothstep( ${ra(`kind`,ta.fadeOut)}, 1.0, t );
	let baseA = ${ra(`kind`,ta.alpha)};
	// far: fade out; very near the eye: sheets and mist would fill the screen (and cost a lot of overdraw)
	let distFade = smoothstep( mat.maxDistance, mat.maxDistance * 0.55, dist ) * select( smoothstep( 0.6, 3.0, dist ), 1.0, water );
	let a = baseA * fadeIn * fadeOut * cover * distFade * mat.intensity;

	o.vUV = corner;
	o.vCol = vec4f( col, a );
	// x: kind + 0.45 * life fraction (the kind tests below have 0.5 of margin)
	o.vMisc = vec4f( kind + sat( t ) * 0.45, info.z, size, fract( info.w ) );

	// dead particles collapse off-screen
	v.useWorld = true;
	v.worldPos = select( vec3f( 0.0, -1e5, 0.0 ), world, alive && a > 1e-4 );
	v.worldNormal = Vd;
`,output:`
	let uv = in.vs.vUV;
	let vMisc = in.vs.vMisc;
	let kind = vMisc.x;
	let isDrop = kind < 0.5;
	let isLig = kind > 1.5 && kind < 2.5;
	let isSheet = kind > 2.5;
	let isClear = kind > 3.5;
	let t = sat( fract( kind ) / 0.45 ); // life fraction
	let r2 = dot( uv, uv );
	let sd = vec2f( vMisc.w, vMisc.w * 1.7 );
	// drop: gaussian streak; ligament: a slightly sharper, beaded blob
	let drop = max( exp( r2 * - 3.5 ) - 0.03, 0.0 );
	let lig = max( exp( r2 * - 4.5 ) * ( sin( uv.y * 5.0 + vMisc.w * 40.0 ) * 0.2 + 0.9 ) - 0.03, 0.0 );
	// torn sheet: noise streaked along the motion (uv.y), eroded from its edges inward and more and
	// more as it ages, so it tears into strands and fragments instead of shrinking. Thick parts are
	// dense white water, the torn edges thin and translucent.
	let env = sat( 1.0 - r2 );
	let fib = textureSample( sprayPuff, smpLinearRepeat, vec2f( uv.x * 0.5, uv.y * 0.26 ) + sd ).x;
	let fine = textureSample( sprayPuff, smpLinearRepeat, vec2f( uv.x * 1.2, uv.y * 0.6 ) + sd * 2.3 ).x;
	let field = fib * 0.6 + fine * 0.4 + ( env - 0.55 ) * 0.75 - smoothstep( 0.8, 1.0, r2 );
	// a torn sheet only a few pixels across can't show its tears: a solid white dot, and a cluster of
	// them reads as cauliflower puffs. Small on screen, it is drawn thinner and more torn: a far
	// splash-up is a ragged, see-through burst
	let farK = smoothstep( 14.0, 3.0, in.vs.vFwd.w ) * select( 0.0, 1.0, isSheet && ! isClear );
	let erode = mix( 0.26, 0.7, t ) + farK * 0.16;
	let dens = sat( ( field - erode ) * 3.0 );
	// torn edges are thin, translucent water: soft and see-through, the core dense white
	let torn = smoothstep( erode - 0.04, erode + 0.2, field ) * ( dens * 0.45 + 0.55 );
	// ... which breaks up into a cluster of drops: many small dots in a ragged envelope that thins
	// out as it ages (sub-pixel drops average out through the mipmaps: never a solid blob)
	let dots = textureSample( sprayDots, smpLinearRepeat, uv * vec2f( 0.5, 0.32 ) + sd * 3.7 ).x;
	let swarm = dots * smoothstep( 0.25, 0.55, fib + env * 0.45 - t * 0.2 ) * ( 1.0 - t * 0.5 );
	let sheet = max( torn * ( 1.0 - smoothstep( 0.15, 0.6, t ) ), swarm );
	// mist: a soft veil of low-frequency noise that drifts and thins, never a disc
	let m1 = textureSample( sprayPuff, smpLinearRepeat, uv * 0.2 + sd ).x;
	let m2 = textureSample( sprayPuff, smpLinearRepeat, uv * 0.55 + sd * 3.1 ).x;
	let veil = smoothstep( 0.28, 0.8, m1 * 0.7 + m2 * 0.3 + env * 0.3 - 0.12 ) * sqrt( env ) * ( 1.0 - t * 0.4 );
	let shape = select( select( select( veil, sheet, isSheet ), lig, isLig ), drop, isDrop );
	// self-shadowing inside thick sheets; the forward-scattered sun lights up the thin parts
	let shade = select( 1.0, 1.0 - dens * 0.15, isSheet && ! isClear );
	let glow = select( select( 1.0, 1.0 - dens * 0.6, isSheet ), 1.0 - dens * 0.3, isClear );

	// soft intersections: opaque scene depth and the water surface under the particle
	// (depth via exact texel loads; reversed-Z, view z negative in front of the camera)
	let dsz = vec2f( textureDimensions( spraySceneDepth ) );
	let q = vec2i( clamp( in.pixel * frame.invResolution, vec2f( 0.0 ), vec2f( 0.9999 ) ) * dsz );
	let sceneZ = - viewDepth( textureLoad( spraySceneDepth, q, 0 ) );
	let posViewZ = ( frame.view * vec4f( in.P, 1.0 ) ).z;
	let soft = vMisc.z * 1.5 + 0.03;
	let fadeScene = sat( ( posViewZ - sceneZ ) / soft );
	let fadeWater = sat( ( in.P.y - vMisc.y ) / ( soft * 0.6 ) + 0.15 );
	let aOut = in.vs.vCol.w * shape * fadeScene * fadeWater * ( 1.0 - farK * 0.4 );
	if ( aOut < 0.002 ) { discard; }
	r.color = vec4f( ( in.vs.vCol.rgb * shade + in.vs.vFwd.xyz * glow ) * aOut, aOut );
`}),o=a.pipelineKey;a.pipelineKey=()=>(this._matHooked||(this._matHooked=!0,a.modules=[aa,this._hooks()]),o.call(a)),this.material=a,this.params={intensity:a.uniforms.intensity,maxDistance:a.uniforms.maxDistance};let s=this.mesh=new y(t,a);s.count=this.N,s.frustumCulled=!1,s.castShadow=!1,s.receiveShadow=!1,s.renderOrder=20,s.layers.set(nn.TRANSPARENT),s.name=`Spray`}};function sa(e,t,n){let r=new A({label:n,width:t,height:t,format:`rgba8unorm`,mips:!0,usage:[`sample`,`copyDst`,`render`],data:e,sampler:`linearRepeat`});return r.getGPU(),Ae(r),r}function ca(e=64){let t=new Uint8Array(e*e*4),n=(e,t,n)=>{let r=Math.sin(e%n*127.1+t%n*311.7+n*17.3)*43758.5453;return r-Math.floor(r)},r=(e,t,r)=>{let i=Math.floor(e),a=Math.floor(t),o=e-i,s=t-a,c=o*o*(3-2*o),l=s*s*(3-2*s),u=n(i,a,r),d=n(i+1,a,r),f=n(i,a+1,r),p=n(i+1,a+1,r);return(u*(1-c)+d*c)*(1-l)+(f*(1-c)+p*c)*l};for(let n=0;n<e;n++)for(let i=0;i<e;i++){let a=0,o=.5,s=0;for(let t=4;t<=32;t*=2)a+=r(i/e*t,n/e*t,t)*o,s+=o,o*=.55;let c=Math.max(0,Math.min(1,(a/s-.2)*1.6)),l=(n*e+i)*4;t[l]=t[l+1]=t[l+2]=Math.round(c*255),t[l+3]=255}return sa(t,e,`sprayPuff`)}function la(e=128,t=150){let n=new Uint8Array(e*e*4),r=12345,i=()=>(r=r*1664525+1013904223>>>0)/4294967296,a=new Float32Array(e*e);for(let n=0;n<t;n++){let t=i()*e,n=i()*e,r=Math.min(.9*(1-i()*.97)**-.55,6),o=Math.ceil(r+1.5);for(let i=-o;i<=o;i++)for(let s=-o;s<=o;s++){let o=((Math.floor(t)+s)%e+e)%e,c=((Math.floor(n)+i)%e+e)%e,l=Math.hypot(Math.floor(t)+s+.5-t,Math.floor(n)+i+.5-n),u=Math.max(0,Math.min(1,r+.5-l));a[c*e+o]=Math.max(a[c*e+o],u)}}for(let t=0;t<e*e;t++){let e=Math.round(a[t]*255);n[t*4]=n[t*4+1]=n[t*4+2]=e,n[t*4+3]=255}return sa(n,e,`sprayDots`)}var Y;(function(e){e.END=`END`,e.FOR=`FOR`,e.NEXT=`NEXT`,e.DATA=`DATA`,e.INPUT=`INPUT`,e.DIM=`DIM`,e.READ=`READ`,e.LET=`LET`,e.GOTO=`GOTO`,e.RUN=`RUN`,e.IF=`IF`,e.RESTORE=`RESTORE`,e.GOSUB=`GOSUB`,e.RETURN=`RETURN`,e.REM=`REM`,e.STOP=`STOP`,e.ON=`ON`,e.WAIT=`WAIT`,e.DEF=`DEF`,e.POKE=`POKE`,e.PRINT=`PRINT`,e.CONT=`CONT`,e.LIST=`LIST`,e.CLEAR=`CLEAR`,e.GET=`GET`,e.NEW=`NEW`,e.LOAD=`LOAD`,e.SAVE=`SAVE`,e.TAB=`TAB(`,e.TO=`TO`,e.FN=`FN`,e.SPC=`SPC(`,e.THEN=`THEN`,e.NOT=`NOT`,e.STEP=`STEP`,e.GO=`GO`,e.PLUS=`+`,e.MINUS=`-`,e.TIMES=`*`,e.DIVIDE=`/`,e.POWER=`^`,e.AND=`AND`,e.OR=`OR`,e.GT=`>`,e.EQ=`=`,e.LT=`<`,e.SGN=`SGN`,e.INT=`INT`,e.ABS=`ABS`,e.USR=`USR`,e.FRE=`FRE`,e.POS=`POS`,e.SQR=`SQR`,e.RND=`RND`,e.LOG=`LOG`,e.EXP=`EXP`,e.COS=`COS`,e.SIN=`SIN`,e.TAN=`TAN`,e.ATN=`ATN`,e.PEEK=`PEEK`,e.LEN=`LEN`,e.STR=`STR$`,e.VAL=`VAL`,e.ASC=`ASC`,e.CHR=`CHR$`,e.LEFT=`LEFT$`,e.RIGHT=`RIGHT$`,e.MID=`MID$`,e.NUMBER=`NUMBER`,e.STRING=`STRING`,e.IDENTIFIER=`IDENTIFIER`,e.LPAREN=`(`,e.RPAREN=`)`,e.COMMA=`,`,e.SEMICOLON=`;`,e.COLON=`:`,e.DOLLAR=`$`,e.PERCENT=`%`,e.QUESTION=`?`,e.EOL=`EOL`,e.EOF=`EOF`})(Y||={});var ua=new Map([[`LEFT$`,Y.LEFT],[`RIGHT$`,Y.RIGHT],[`MID$`,Y.MID],[`CHR$`,Y.CHR],[`STR$`,Y.STR],[`RESTORE`,Y.RESTORE],[`RETURN`,Y.RETURN],[`GOSUB`,Y.GOSUB],[`CLEAR`,Y.CLEAR],[`PRINT`,Y.PRINT],[`INPUT`,Y.INPUT],[`GOTO`,Y.GOTO],[`NEXT`,Y.NEXT],[`DATA`,Y.DATA],[`READ`,Y.READ],[`STOP`,Y.STOP],[`WAIT`,Y.WAIT],[`POKE`,Y.POKE],[`PEEK`,Y.PEEK],[`CONT`,Y.CONT],[`LIST`,Y.LIST],[`STEP`,Y.STEP],[`THEN`,Y.THEN],[`END`,Y.END],[`FOR`,Y.FOR],[`DIM`,Y.DIM],[`LET`,Y.LET],[`RUN`,Y.RUN],[`REM`,Y.REM],[`DEF`,Y.DEF],[`GET`,Y.GET],[`NEW`,Y.NEW],[`LOAD`,Y.LOAD],[`SAVE`,Y.SAVE],[`NOT`,Y.NOT],[`AND`,Y.AND],[`TAB(`,Y.TAB],[`SPC(`,Y.SPC],[`IF`,Y.IF],[`ON`,Y.ON],[`TO`,Y.TO],[`FN`,Y.FN],[`OR`,Y.OR],[`GO`,Y.GO],[`SGN`,Y.SGN],[`INT`,Y.INT],[`ABS`,Y.ABS],[`USR`,Y.USR],[`FRE`,Y.FRE],[`POS`,Y.POS],[`SQR`,Y.SQR],[`RND`,Y.RND],[`LOG`,Y.LOG],[`EXP`,Y.EXP],[`COS`,Y.COS],[`SIN`,Y.SIN],[`TAN`,Y.TAN],[`ATN`,Y.ATN],[`LEN`,Y.LEN],[`VAL`,Y.VAL],[`ASC`,Y.ASC]]),da={[Y.OR]:70,[Y.AND]:80,[Y.NOT]:90,[Y.LT]:100,[Y.EQ]:100,[Y.GT]:100,[Y.PLUS]:121,[Y.MINUS]:121,[Y.TIMES]:123,[Y.DIVIDE]:123,[Y.POWER]:127};function fa(e){return new Set([Y.SGN,Y.INT,Y.ABS,Y.USR,Y.FRE,Y.POS,Y.SQR,Y.RND,Y.LOG,Y.EXP,Y.COS,Y.SIN,Y.TAN,Y.ATN,Y.PEEK,Y.LEN,Y.STR,Y.VAL,Y.ASC,Y.CHR,Y.LEFT,Y.RIGHT,Y.MID]).has(e)}function pa(e){return new Set([Y.PLUS,Y.MINUS,Y.TIMES,Y.DIVIDE,Y.POWER,Y.AND,Y.OR,Y.GT,Y.EQ,Y.LT]).has(e)}function ma(e){return e===Y.GT||e===Y.EQ||e===Y.LT}var X;(function(e){e.NF=`NF`,e.SN=`SN`,e.RG=`RG`,e.OD=`OD`,e.FC=`FC`,e.OV=`OV`,e.OM=`OM`,e.US=`US`,e.BS=`BS`,e.DD=`DD`,e.DZ=`DZ`,e.ID=`ID`,e.TM=`TM`,e.LS=`LS`,e.ST=`ST`,e.CN=`CN`,e.UF=`UF`})(X||={}),X.NF,X.SN,X.RG,X.OD,X.FC,X.OV,X.OM,X.US,X.BS,X.DD,X.DZ,X.ID,X.TM,X.LS,X.ST,X.CN,X.UF;var Z=class extends Error{code;lineNumber;constructor(e,t){super(`?${e} ERROR`),this.code=e,this.name=`BasicError`,this.lineNumber=t}toString(){return this.lineNumber===void 0?`?${this.code} ERROR`:`?${this.code} ERROR IN ${this.lineNumber}`}},ha=class extends Error{lineNumber;constructor(e){let t=e===void 0?`
BREAK`:`\nBREAK IN ${e}`;super(t),this.lineNumber=e,this.name=`BreakError`}},ga=class{input=``;position=0;tokenize(e){this.input=e,this.position=0;let t=[];for(;this.position<this.input.length;){let e=this.nextToken();if(e){if(t.push(e),e.type===Y.REM){let e=this.input.slice(this.position);e.length>0&&t.push({type:Y.STRING,value:e,position:this.position});break}if(e.type===Y.DATA){let e=this.readDataContent();e.length>0&&t.push({type:Y.STRING,value:e,position:this.position-e.length});continue}}}return t.push({type:Y.EOL,value:``,position:this.position}),t}nextToken(){if(this.skipSpaces(),this.position>=this.input.length)return null;let e=this.position,t=this.input[this.position];if(t===`"`)return this.readString();if(this.isDigit(t)||t===`.`&&this.isDigit(this.peek(1)))return this.readNumber();if(t===`?`)return this.position++,{type:Y.PRINT,value:`?`,position:e};let n=this.matchReservedWord();if(n)return n;let r=this.matchPunctuation();if(r)return r;if(this.isAlpha(t))return this.readIdentifier();throw new Z(X.SN)}matchReservedWord(){let e=this.input.slice(this.position).toUpperCase();for(let[t,n]of ua)if(e.startsWith(t)){if(t===`TAB(`||t===`SPC(`){let e={type:n,value:t,position:this.position};return this.position+=t.length,e}let r=e[t.length];if(r&&this.isAlphanumeric(r)&&!this.isDigit(r))continue;let i={type:n,value:t,position:this.position};return this.position+=t.length,i}return null}matchPunctuation(){let e=this.position,t=this.input[this.position],n={"+":Y.PLUS,"-":Y.MINUS,"*":Y.TIMES,"/":Y.DIVIDE,"^":Y.POWER,"=":Y.EQ,"<":Y.LT,">":Y.GT,"(":Y.LPAREN,")":Y.RPAREN,",":Y.COMMA,";":Y.SEMICOLON,":":Y.COLON};return t in n?(this.position++,{type:n[t],value:t,position:e}):null}readString(){let e=this.position;this.position++;let t=``;for(;this.position<this.input.length;){let e=this.input[this.position];if(e===`"`){this.position++;break}t+=e,this.position++}return{type:Y.STRING,value:t,position:e}}readNumber(){let e=this.position,t=``;for(;this.position<this.input.length&&this.isDigit(this.input[this.position]);)t+=this.input[this.position],this.position++;if(this.position<this.input.length&&this.input[this.position]===`.`)for(t+=`.`,this.position++;this.position<this.input.length&&this.isDigit(this.input[this.position]);)t+=this.input[this.position],this.position++;if(this.position<this.input.length&&this.input[this.position].toUpperCase()===`E`){if(t+=`E`,this.position++,this.position<this.input.length){let e=this.input[this.position];(e===`+`||e===`-`)&&(t+=e,this.position++)}for(;this.position<this.input.length&&this.isDigit(this.input[this.position]);)t+=this.input[this.position],this.position++}return{type:Y.NUMBER,value:parseFloat(t),position:e}}readIdentifier(){let e=this.position,t=``;for(this.isAlpha(this.input[this.position])&&(t+=this.input[this.position].toUpperCase(),this.position++);this.position<this.input.length&&this.isAlphanumeric(this.input[this.position]);)t+=this.input[this.position].toUpperCase(),this.position++;if(this.position<this.input.length){let e=this.input[this.position];(e===`$`||e===`%`)&&(t+=e,this.position++)}return{type:Y.IDENTIFIER,value:t,position:e}}readDataContent(){let e=``,t=!1;for(;this.position<this.input.length;){let n=this.input[this.position];if(n===`"`&&(t=!t),!t&&n===`:`)break;e+=n,this.position++}return e}skipSpaces(){for(;this.position<this.input.length&&this.input[this.position]===` `;)this.position++}peek(e=0){let t=this.position+e;return t<this.input.length?this.input[t]:``}isDigit(e){return e>=`0`&&e<=`9`}isAlpha(e){let t=e.toUpperCase();return t>=`A`&&t<=`Z`}isAlphanumeric(e){return this.isAlpha(e)||this.isDigit(e)}},_a={integerArrays:!0,additionalPrecision:!0,longErrorMessages:!1,timeSupport:!1,diskCommands:!1,extendedIO:!1,nullCommand:!1,getCommand:!0,lineLength:40,bufferLength:240,columnWidth:14,numStringTemps:3,stringDescSize:3,forEntrySize:18,numStackLevels:23,platform:`apple2`},va=_a;4+ +!!_a.additionalPrecision,_a.additionalPrecision;var ya={maxLineNumber:63999,maxStringLength:255,maxDimensions:255,significantNameChars:2},ba=class{lines=new Map;sortedLineNumbers=[];tokenizer=new ga;addLine(e,t){if(e<0||e>ya.maxLineNumber)throw new Z(X.FC);if(t.trim()===``){this.deleteLine(e);return}let n={lineNumber:e,tokens:this.tokenizer.tokenize(t),raw:t};this.lines.set(e,n),this.updateSortedLineNumbers()}deleteLine(e){let t=this.lines.delete(e);return t&&this.updateSortedLineNumbers(),t}getLine(e){return this.lines.get(e)}getFirstLine(){if(this.sortedLineNumbers.length!==0)return this.lines.get(this.sortedLineNumbers[0])}getNextLine(e){let t=this.sortedLineNumbers.findIndex(t=>t>e);if(t!==-1)return this.lines.get(this.sortedLineNumbers[t])}findLine(e){return this.lines.get(e)??null}getLineNumbers(){return[...this.sortedLineNumbers]}list(e,t){let n=[];for(let r of this.sortedLineNumbers){if(e!==void 0&&r<e)continue;if(t!==void 0&&r>t)break;let i=this.lines.get(r);i&&n.push(`${i.lineNumber} ${i.raw}`)}return n}clear(){this.lines.clear(),this.sortedLineNumbers=[]}isEmpty(){return this.lines.size===0}get lineCount(){return this.lines.size}updateSortedLineNumbers(){this.sortedLineNumbers=[...this.lines.keys()].sort((e,t)=>e-t)}};function xa(e){return e.endsWith(`$`)?`string`:e.endsWith(`%`)&&va.integerArrays?`integer`:`number`}function Sa(e){let t=``,n=e;return(e.endsWith(`$`)||e.endsWith(`%`))&&(t=e.slice(-1),n=e.slice(0,-1)),n.slice(0,ya.significantNameChars)+t}var Ca=class{variables=new Map;arrays=new Map;getVariable(e){let t=Sa(e),n=this.variables.get(t);if(n)return n.value;let r=xa(e)===`string`?``:0;return this.setVariable(e,r),r}setVariable(e,t){let n=Sa(e),r=xa(e);if(r===`string`&&typeof t!=`string`||r!==`string`&&typeof t!=`number`)throw new Z(X.TM);let i=t;r===`integer`&&typeof t==`number`&&(i=Math.trunc(t)),this.variables.set(n,{name:n,type:r,value:i})}hasVariable(e){let t=Sa(e);return this.variables.has(t)}dimArray(e,t){let n=Sa(e),r=xa(e);if(this.arrays.has(n))throw new Z(X.DD);for(let e of t)if(e<0||e>ya.maxDimensions)throw new Z(X.BS);let i=t.map(e=>e+1),a=i.reduce((e,t)=>e*t,1),o=r===`string`?``:0,s=Array(a).fill(o);this.arrays.set(n,{name:n,type:r,dimensions:i,data:s})}getArrayElement(e,t){let n=Sa(e),r=this.arrays.get(n);if(!r){let i=t.map(()=>10);this.dimArray(e,i),r=this.arrays.get(n)}let i=this.calculateArrayIndex(r,t);return r.data[i]}setArrayElement(e,t,n){let r=Sa(e),i=this.arrays.get(r);if(!i){let n=t.map(()=>10);this.dimArray(e,n),i=this.arrays.get(r)}if(i.type===`string`&&typeof n!=`string`||i.type!==`string`&&typeof n!=`number`)throw new Z(X.TM);let a=this.calculateArrayIndex(i,t),o=n;i.type===`integer`&&typeof n==`number`&&(o=Math.trunc(n)),i.data[a]=o}calculateArrayIndex(e,t){if(t.length!==e.dimensions.length)throw new Z(X.BS);for(let n=0;n<t.length;n++)if(t[n]<0||t[n]>=e.dimensions[n])throw new Z(X.BS);let n=0,r=1;for(let i=t.length-1;i>=0;i--)n+=t[i]*r,r*=e.dimensions[i];return n}clear(){this.variables.clear(),this.arrays.clear()}getVariableNames(){return[...this.variables.keys()]}getArrayNames(){return[...this.arrays.keys()]}},wa=class{stack=[];pushFor(e){this.removeFor(e.variable),this.stack.push({type:`for`,...e})}pushGosub(e){this.stack.push({type:`gosub`,...e})}findFor(e){for(let t=this.stack.length-1;t>=0;t--){let n=this.stack[t];if(n.type===`for`&&n.variable===e)return this.stack.length=t+1,n}return null}popGosub(){for(let e=this.stack.length-1;e>=0;e--){let t=this.stack[e];if(t.type===`gosub`)return this.stack.length=e,t}return null}popFor(e){this.findFor(e)&&this.stack.pop()}removeFor(e){for(let t=this.stack.length-1;t>=0;t--){let n=this.stack[t];if(n.type===`for`&&n.variable===e){this.stack.length=t;break}}}peekFor(){for(let e=this.stack.length-1;e>=0;e--){let t=this.stack[e];if(t.type===`for`)return t}return null}clear(){this.stack=[]}isEmpty(){return this.stack.length===0}get depth(){return this.stack.length}},Ta={SCREEN_START:1024,SCREEN_END:2047,KEYBOARD:49152,KEYBOARD_STROBE:49168},Ea=class{memory;handlers=new Map;keyboardBuffer=0;keyboardReady=!1;constructor(e=65536){this.memory=new Uint8Array(e),this.registerAppleIIHandlers()}registerAppleIIHandlers(){this.handlers.set(Ta.KEYBOARD,{read:()=>this.keyboardReady?this.keyboardBuffer|128:0,write:()=>{}}),this.handlers.set(Ta.KEYBOARD_STROBE,{read:()=>(this.keyboardReady=!1,0),write:()=>{this.keyboardReady=!1}})}pressKey(e){this.keyboardBuffer=e&127,this.keyboardReady=!0}hasKeyboardData(){return this.keyboardReady}peek(e){e=(e&65535)>>>0;let t=this.handlers.get(e);return t?t.read(e):this.memory[e]}poke(e,t){e=(e&65535)>>>0,t=(t&255)>>>0;let n=this.handlers.get(e);n?n.write(e,t):this.memory[e]=t}registerHandler(e,t){this.handlers.set(e,t)}getScreenMemory(){return this.memory.slice(Ta.SCREEN_START,Ta.SCREEN_END+1)}clear(){this.memory.fill(0),this.keyboardBuffer=0,this.keyboardReady=!1}},Da;(function(e){e[e.NUMBER=0]=`NUMBER`,e[e.STRING=255]=`STRING`})(Da||={});function Oa(e){return typeof e==`number`}function ka(e){return typeof e==`string`}function Aa(e){return Oa(e)?Da.NUMBER:Da.STRING}function ja(e){return e?-1:0}var Ma=class{_value=0;_valueType=Da.NUMBER;get value(){return this._value}get valueType(){return this._valueType}get isNumeric(){return this._valueType===Da.NUMBER}get isString(){return this._valueType===Da.STRING}loadNumber(e){this._value=e,this._valueType=Da.NUMBER}loadString(e){this._value=e,this._valueType=Da.STRING}load(e){this._value=e,this._valueType=Aa(e)}asNumber(){if(this.isString)throw Error(`Type mismatch: expected number`);return this._value}asString(){if(this.isNumeric)throw Error(`Type mismatch: expected string`);return this._value}clear(){this._value=0,this._valueType=Da.NUMBER}negate(){if(this.isString)throw Error(`Type mismatch: cannot negate string`);this._value=-this._value}isZero(){return this.isNumeric?this._value===0:this._value.length===0}isTruthy(){return this.isNumeric?this._value!==0:this._value.length>0}},Na=class extends Ma{};new Ma,new Na;var Pa=class{tokens=[];position=0;memory;memoryMap;fac;userFunctionLookup;constructor(e,t){this.memory=e,this.memoryMap=t,this.fac=new Ma}setUserFunctionLookup(e){this.userFunctionLookup=e}evaluate(e){return this.tokens=e,this.position=0,e.length===0?0:this.parseExpression(0)}evaluateNumeric(e){let t=this.evaluate(e);if(ka(t))throw new Z(X.TM);return t}evaluateString(e){let t=this.evaluate(e);if(Oa(t))throw new Z(X.TM);return t}getRemainingTokens(){return this.tokens.slice(this.position)}getPosition(){return this.position}parseExpression(e){let t=this.parsePrimary();for(;this.position<this.tokens.length;){let n=this.peek();if(!n||!this.isOperator(n.type))break;let r=this.getPrecedence(n.type);if(r<e)break;this.advance();let i=n.type,a=i;if(ma(i)){let e=this.peek();e&&ma(e.type)&&(a=this.combineRelationalOps(i,e.type),this.advance())}let o=i===Y.POWER?r:r+1,s=this.parseExpression(o);t=this.applyBinaryOperator(a,t,s)}return t}parsePrimary(){let e=this.peek();if(!e)throw new Z(X.SN);if(e.type===Y.NUMBER||e.type===Y.STRING)return this.advance(),e.value;if(e.type===Y.MINUS){this.advance();let e=this.parseExpression(125);if(ka(e))throw new Z(X.TM);return-e}if(e.type===Y.PLUS)return this.advance(),this.parseExpression(125);if(e.type===Y.NOT){this.advance();let e=this.parseExpression(da[Y.NOT]);if(ka(e))throw new Z(X.TM);return~Math.trunc(e)&65535}if(e.type===Y.LPAREN){this.advance();let e=this.parseExpression(0);return this.expect(Y.RPAREN),e}if(e.type===Y.IDENTIFIER)return this.parseVariable();if(e.type===Y.FN)return this.parseUserFunction();if(fa(e.type))return this.parseFunction();throw new Z(X.SN)}parseVariable(){let e=this.advance().value;return this.peek()?.type===Y.LPAREN?this.parseArrayAccess(e):this.memory.getVariable(e)}parseArrayAccess(e){this.expect(Y.LPAREN);let t=[];for(t.push(this.evaluateIndex());this.peek()?.type===Y.COMMA;)this.advance(),t.push(this.evaluateIndex());return this.expect(Y.RPAREN),this.memory.getArrayElement(e,t)}parseUserFunction(){this.advance();let e=this.peek();if(!e||e.type!==Y.IDENTIFIER)throw new Z(X.SN);this.advance();let t=`FN`+e.value;if(!this.userFunctionLookup)throw new Z(X.UF);let n=this.userFunctionLookup(t);if(!n)throw new Z(X.UF);this.expect(Y.LPAREN);let r=this.parseExpression(0);this.expect(Y.RPAREN);let i=this.memory.getVariable(n.paramName);this.memory.setVariable(n.paramName,r);let a=this.tokens,o=this.position;this.tokens=n.exprTokens,this.position=0;let s=this.parseExpression(0);return this.tokens=a,this.position=o,this.memory.setVariable(n.paramName,i),s}evaluateIndex(){let e=this.parseExpression(0);if(ka(e))throw new Z(X.TM);return Math.trunc(e)}parseFunction(){let e=this.advance().type,t=e!==Y.TAB&&e!==Y.SPC;t&&this.expect(Y.LPAREN);let n=this.evaluateFunction(e);return(t||e===Y.TAB||e===Y.SPC)&&this.expect(Y.RPAREN),n}evaluateFunction(e){switch(e){case Y.ABS:return Math.abs(this.getNumericArg());case Y.INT:return Math.floor(this.getNumericArg());case Y.SGN:{let e=this.getNumericArg();return e>0?1:e<0?-1:0}case Y.SQR:{let e=this.getNumericArg();if(e<0)throw new Z(X.FC);return Math.sqrt(e)}case Y.RND:return this.getNumericArg(),Math.random();case Y.LOG:{let e=this.getNumericArg();if(e<=0)throw new Z(X.FC);return Math.log(e)}case Y.EXP:return Math.exp(this.getNumericArg());case Y.SIN:return Math.sin(this.getNumericArg());case Y.COS:return Math.cos(this.getNumericArg());case Y.TAN:return Math.tan(this.getNumericArg());case Y.ATN:return Math.atan(this.getNumericArg());case Y.PEEK:{let e=Math.trunc(this.getNumericArg());return this.memoryMap.peek(e)}case Y.LEN:return this.getStringArg().length;case Y.ASC:{let e=this.getStringArg();if(e.length===0)throw new Z(X.FC);return e.charCodeAt(0)}case Y.VAL:{let e=this.getStringArg(),t=parseFloat(e);return isNaN(t)?0:t}case Y.CHR:{let e=Math.trunc(this.getNumericArg());if(e<0||e>255)throw new Z(X.FC);return String.fromCharCode(e)}case Y.STR:{let e=this.getNumericArg();return e>=0?` `+e.toString():e.toString()}case Y.LEFT:return this.evalLeft();case Y.RIGHT:return this.evalRight();case Y.MID:return this.evalMid();case Y.TAB:case Y.SPC:return` `.repeat(Math.max(0,Math.trunc(this.getNumericArg())));case Y.FRE:return this.parseExpression(0),32768;case Y.POS:return this.parseExpression(0),0;case Y.USR:throw new Z(X.FC);default:throw new Z(X.SN)}}evalLeft(){let e=this.getStringArg();this.expect(Y.COMMA);let t=Math.trunc(this.getNumericArg());if(t<0)throw new Z(X.FC);return e.substring(0,t)}evalRight(){let e=this.getStringArg();this.expect(Y.COMMA);let t=Math.trunc(this.getNumericArg());if(t<0)throw new Z(X.FC);return e.substring(Math.max(0,e.length-t))}evalMid(){let e=this.getStringArg();this.expect(Y.COMMA);let t=Math.trunc(this.getNumericArg());if(t<1)throw new Z(X.FC);let n=e.length;if(this.peek()?.type===Y.COMMA&&(this.advance(),n=Math.trunc(this.getNumericArg()),n<0))throw new Z(X.FC);return e.substring(t-1,t-1+n)}getNumericArg(){let e=this.parseExpression(0);if(ka(e))throw new Z(X.TM);return e}getStringArg(){let e=this.parseExpression(0);if(Oa(e))throw new Z(X.TM);return e}applyBinaryOperator(e,t,n){if(e===Y.PLUS&&(ka(t)||ka(n))){if(ka(t)&&ka(n))return t+n;throw new Z(X.TM)}if(ka(t)&&ka(n)){if(e===Y.LT||e===Y.GT||e===Y.EQ){let r=t.localeCompare(n);return e===Y.LT?ja(r<0):e===Y.GT?ja(r>0):ja(r===0)}if(typeof e==`string`&&e.startsWith(`REL_`))return this.compareStrings(e,t,n);throw new Z(X.TM)}if(ka(t)||ka(n))throw new Z(X.TM);let r=t,i=n;switch(e){case Y.PLUS:return r+i;case Y.MINUS:return r-i;case Y.TIMES:return r*i;case Y.DIVIDE:if(i===0)throw new Z(X.DZ);return r/i;case Y.POWER:return r**+i;case Y.AND:return Math.trunc(r)&Math.trunc(i)|0;case Y.OR:return Math.trunc(r)|Math.trunc(i)|0;case Y.LT:return ja(r<i);case Y.GT:return ja(r>i);case Y.EQ:return ja(r===i);case`REL_LE`:return ja(r<=i);case`REL_GE`:return ja(r>=i);case`REL_NE`:return ja(r!==i);default:throw new Z(X.SN)}}compareStrings(e,t,n){let r=t.localeCompare(n);switch(e){case`REL_LT`:return ja(r<0);case`REL_GT`:return ja(r>0);case`REL_EQ`:return ja(r===0);case`REL_LE`:return ja(r<=0);case`REL_GE`:return ja(r>=0);case`REL_NE`:return ja(r!==0);default:throw new Z(X.SN)}}combineRelationalOps(e,t){if(e===Y.LT&&t===Y.GT||e===Y.GT&&t===Y.LT)return`REL_NE`;if(e===Y.LT&&t===Y.EQ||e===Y.EQ&&t===Y.LT)return`REL_LE`;if(e===Y.GT&&t===Y.EQ||e===Y.EQ&&t===Y.GT)return`REL_GE`;throw new Z(X.SN)}isOperator(e){return pa(e)}getPrecedence(e){return da[e]||0}peek(){return this.tokens[this.position]}advance(){return this.tokens[this.position++]}expect(e){let t=this.peek();if(!t||t.type!==e)throw new Z(X.SN);return this.advance()}},Fa=e=>{let t=globalThis.localStorage?.getItem(`elsemesh:c64:${e}`);if(t==null){let t=Error(`File not found: ${e}`);throw t.code=`ENOENT`,t}return t},Ia=(e,t)=>{if(!globalThis.localStorage)throw Error(`Browser storage unavailable`);globalThis.localStorage.setItem(`elsemesh:c64:${e}`,t)},La=class{program=new ba;memory=new Ca;memoryMap=new Ea;stack=new wa;tokenizer=new ga;evaluator;console;userFunctions=new Map;state={running:!1,interrupted:!1,currentLine:null,tokenIndex:0,continueState:{canContinue:!1,lineNumber:0,tokenIndex:0},dataPointer:{lineNumber:0,tokenIndex:0}};constructor(e){if(!e)throw Error(`A browser ConsoleIO adapter is required`);this.console=e,this.evaluator=new Pa(this.memory,this.memoryMap),this.evaluator.setUserFunctionLookup(e=>this.userFunctions.get(e))}async loadProgram(e){let t=e.split(/\r?\n/);for(let e of t){let t=e.trim();t!==``&&(t.startsWith(`'`)||await this.processInput(t))}}async run(){try{await this.executeRun()}catch(e){if(e instanceof Z)this.console.printLine(e.toString());else if(e instanceof ha)this.console.printLine(e.message);else throw e}}async repl(){let e,t=()=>{e&&typeof process<`u`&&process.off&&process.off(`SIGINT`,e)};for(typeof process<`u`&&process.on&&(e=()=>{this.state.running?(this.state.interrupted=!0,this.state.running=!1):(this.console.printLine(``),this.console.printLine(`(Press Ctrl+C again to exit)`),process.once(`SIGINT`,()=>{t(),this.console.printLine(``),process.exit(0)}))},process.on(`SIGINT`,e)),this.console.printLine(`MICROSOFT BASIC 1.1`),this.console.printLine(`FOR THE 6502 MICROPROCESSOR`),this.console.printLine(``),this.printReady();;)try{let e=await this.console.readLine(`]`);await this.processInput(e)}catch(e){if(e instanceof Z)this.console.printLine(e.toString()),this.printReady();else if(e instanceof ha)this.console.printLine(e.message),this.printReady();else throw e}}async processInput(e){let t=e.trim();if(t===``)return;let n=t.match(/^(\d+)\s*(.*)/);if(n){let e=parseInt(n[1],10),t=n[2];this.state.continueState.canContinue=!1,this.program.addLine(e,t)}else await this.executeDirect(t)}async executeDirect(e){let t=this.tokenizer.tokenize(e);this.state.currentLine=null,this.state.tokenIndex=0,await this.executeTokens(t),this.printReady()}async executeTokens(e){for(this.state.tokenIndex=0;this.state.tokenIndex<e.length;){let t=e[this.state.tokenIndex];if(t.type===Y.EOL||t.type===Y.EOF)break;if(t.type===Y.COLON){this.state.tokenIndex++;continue}let n=await this.executeStatement(e);if(n&&n.type!==`continue`)return n}}async executeStatement(e){switch(e[this.state.tokenIndex].type){case Y.RUN:return await this.executeRun(),{type:`end`};case Y.NEW:return this.executeNew(),{type:`continue`};case Y.LOAD:return await this.executeLoad(e),{type:`continue`};case Y.SAVE:return this.executeSave(e),{type:`continue`};case Y.LIST:return this.executeList(e),{type:`continue`};case Y.CLEAR:return this.executeClear(),{type:`continue`};case Y.PRINT:case Y.QUESTION:return await this.executePrint(e),{type:`continue`};case Y.LET:return this.state.tokenIndex++,await this.executeAssignment(e),{type:`continue`};case Y.IDENTIFIER:return await this.executeAssignment(e),{type:`continue`};case Y.REM:for(;this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type!==Y.EOL;)this.state.tokenIndex++;return{type:`continue`};case Y.GOTO:return this.executeGoto(e);case Y.GOSUB:return this.executeGosub(e);case Y.RETURN:return this.executeReturn();case Y.FOR:return this.executeFor(e);case Y.NEXT:return this.executeNext(e);case Y.IF:return await this.executeIf(e);case Y.ON:return this.executeOn(e);case Y.END:return this.executeEnd();case Y.STOP:return this.executeStop();case Y.CONT:return await this.executeCont(),{type:`continue`};case Y.INPUT:return await this.executeInput(e),{type:`continue`};case Y.READ:return await this.executeRead(e),{type:`continue`};case Y.DATA:return this.skipToEndOfStatement(e),{type:`continue`};case Y.RESTORE:return this.executeRestore(e),{type:`continue`};case Y.DIM:return this.executeDim(e),{type:`continue`};case Y.GET:return await this.executeGet(e),{type:`continue`};case Y.POKE:return this.executePoke(e),{type:`continue`};case Y.WAIT:return this.executeWait(e),{type:`continue`};case Y.DEF:return this.executeDef(e),{type:`continue`};default:throw new Z(X.SN)}}async executeRun(){if(this.state.tokenIndex++,this.memory.clear(),this.stack.clear(),this.state.continueState.canContinue=!1,this.program.isEmpty())return;this.state.running=!0;let e=this.program.getFirstLine();e&&await this.runFromLine(e.lineNumber)}async runFromLine(e){let t=e;for(this.state.interrupted=!1;t!==void 0&&this.state.running;){if(this.state.interrupted){this.state.interrupted=!1,this.state.continueState.canContinue=!0,this.state.continueState.lineNumber=t,this.state.continueState.tokenIndex=0,this.console.printLine(``),this.console.printLine(`BREAK IN ${t}`);return}let e=this.program.getLine(t);if(!e)break;this.state.currentLine=t,this.state.tokenIndex=0;try{let n=await this.executeTokens(e.tokens);if(n)switch(n.type){case`jump`:t=n.targetLine;continue;case`end`:case`stop`:this.state.running=!1;return}}catch(e){throw e instanceof Z&&(e.lineNumber=t),e}t=this.program.getNextLine(t)?.lineNumber}this.state.running=!1}executeNew(){this.state.tokenIndex++,this.program.clear(),this.memory.clear(),this.stack.clear(),this.state.continueState.canContinue=!1}executeList(e){this.state.tokenIndex++;let t,n;this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.NUMBER&&(t=e[this.state.tokenIndex].value,this.state.tokenIndex++),this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.MINUS?(this.state.tokenIndex++,this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.NUMBER&&(n=e[this.state.tokenIndex].value,this.state.tokenIndex++)):t!==void 0&&(n=t);let r=this.program.list(t,n);for(let e of r)this.console.printLine(e)}async executeLoad(e){this.state.tokenIndex++;let t=e[this.state.tokenIndex];if(!t||t.type!==Y.STRING)throw new Z(X.SN,this.state.currentLine??void 0);let n=t.value;this.state.tokenIndex++;try{let e=Fa(n,`utf-8`);this.executeNew(),await this.loadProgram(e),this.console.printLine(`LOADED: ${n}`)}catch(e){let t=e;t.code===`ENOENT`?this.console.printLine(`?FILE NOT FOUND: ${n}`):t.code===`EACCES`?this.console.printLine(`?ACCESS DENIED: ${n}`):t.code===`EISDIR`?this.console.printLine(`?IS A DIRECTORY: ${n}`):this.console.printLine(`?LOAD ERROR: ${t.message||`Unknown error`}`)}}executeSave(e){this.state.tokenIndex++;let t=e[this.state.tokenIndex];if(!t||t.type!==Y.STRING)throw new Z(X.SN,this.state.currentLine??void 0);let n=t.value;this.state.tokenIndex++;let r=this.program.list().join(`
`)+`
`;try{Ia(n,r,`utf-8`),this.console.printLine(`SAVED: ${n}`)}catch{this.console.printLine(`?CANNOT WRITE: ${n}`)}}executeClear(){this.state.tokenIndex++,this.memory.clear(),this.stack.clear()}async executePrint(e){this.state.tokenIndex++;let t=!1;for(;this.state.tokenIndex<e.length;){let n=e[this.state.tokenIndex];if(n.type===Y.EOL||n.type===Y.COLON||n.type===Y.EOF)break;if(t=!1,n.type===Y.SEMICOLON){t=!0,this.state.tokenIndex++;continue}if(n.type===Y.COMMA){let e=this.console.getPosition(),n=Math.ceil((e+1)/va.columnWidth)*va.columnWidth;n>=va.lineLength?this.console.printLine(``):this.console.setPosition(n),t=!0,this.state.tokenIndex++;continue}let r=this.getExpressionTokens(e),i=this.evaluator.evaluate(r);Oa(i)?this.console.print(this.formatNumber(i)):this.console.print(i)}t||this.console.printLine(``)}getExpressionTokens(e){let t=[],n=0;for(;this.state.tokenIndex<e.length;){let r=e[this.state.tokenIndex];if(r.type===Y.LPAREN&&n++,r.type===Y.RPAREN&&n--,n===0&&(r.type===Y.EOL||r.type===Y.COLON||r.type===Y.EOF||r.type===Y.SEMICOLON||r.type===Y.COMMA))break;t.push(r),this.state.tokenIndex++}return t}async executeAssignment(e){let t=e[this.state.tokenIndex];if(t.type!==Y.IDENTIFIER)throw new Z(X.SN);let n=t.value;this.state.tokenIndex++;let r;if(this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.LPAREN&&(r=this.parseArrayIndices(e)),this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.EQ)throw new Z(X.SN);this.state.tokenIndex++;let i=this.getExpressionTokens(e),a=this.evaluator.evaluate(i);r?this.memory.setArrayElement(n,r,a):this.memory.setVariable(n,a)}parseArrayIndices(e){this.state.tokenIndex++;let t=[];for(;this.state.tokenIndex<e.length;){let n=[],r=0;for(;this.state.tokenIndex<e.length;){let t=e[this.state.tokenIndex];if(t.type===Y.LPAREN&&r++,t.type===Y.RPAREN){if(r===0)break;r--}if(t.type===Y.COMMA&&r===0)break;n.push(t),this.state.tokenIndex++}let i=this.evaluator.evaluateNumeric(n);if(t.push(Math.trunc(i)),e[this.state.tokenIndex]?.type===Y.COMMA)this.state.tokenIndex++;else if(e[this.state.tokenIndex]?.type===Y.RPAREN){this.state.tokenIndex++;break}else throw new Z(X.SN)}return t}executeEnd(){return this.state.running=!1,this.state.tokenIndex++,{type:`end`}}executeStop(){throw this.state.continueState={canContinue:!0,lineNumber:this.state.currentLine??0,tokenIndex:this.state.tokenIndex+1},this.state.running=!1,this.state.tokenIndex++,new ha(this.state.currentLine??void 0)}executeGoto(e){this.state.tokenIndex++;let t=this.parseLineNumber(e);if(!this.program.getLine(t))throw new Z(X.US);return{type:`jump`,targetLine:t}}executeGosub(e){this.state.tokenIndex++;let t=this.parseLineNumber(e);if(!this.program.getLine(t))throw new Z(X.US);return this.stack.pushGosub({lineNumber:this.state.currentLine??0,tokenIndex:this.state.tokenIndex}),{type:`jump`,targetLine:t}}executeReturn(){this.state.tokenIndex++;let e=this.stack.popGosub();if(!e)throw new Z(X.RG);let t=this.program.getNextLine(e.lineNumber);return t?{type:`jump`,targetLine:t.lineNumber}:{type:`end`}}executeFor(e){this.state.tokenIndex++;let t=e[this.state.tokenIndex];if(t.type!==Y.IDENTIFIER)throw new Z(X.SN);let n=t.value;if(this.state.tokenIndex++,e[this.state.tokenIndex]?.type!==Y.EQ)throw new Z(X.SN);this.state.tokenIndex++;let r=this.getExpressionTokensUntil(e,Y.TO),i=this.evaluator.evaluateNumeric(r);if(e[this.state.tokenIndex]?.type!==Y.TO)throw new Z(X.SN);this.state.tokenIndex++;let a=this.getExpressionTokensUntil(e,Y.STEP),o=this.evaluator.evaluateNumeric(a),s=1;if(e[this.state.tokenIndex]?.type===Y.STEP){this.state.tokenIndex++;let t=this.getExpressionTokens(e);s=this.evaluator.evaluateNumeric(t)}return this.memory.setVariable(n,i),this.stack.pushFor({variable:n,step:s,stepSign:Math.sign(s),limit:o,lineNumber:this.state.currentLine??0,tokenIndex:this.state.tokenIndex}),{type:`continue`}}executeNext(e){this.state.tokenIndex++;let t;this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.IDENTIFIER&&(t=e[this.state.tokenIndex].value,this.state.tokenIndex++);let n=t?this.stack.findFor(t):this.stack.peekFor();if(!n)throw new Z(X.NF);let r=this.memory.getVariable(n.variable);if(typeof r!=`number`)throw new Z(X.TM);let i=r+n.step;if(this.memory.setVariable(n.variable,i),n.stepSign>=0?i>n.limit:i<n.limit)return this.stack.popFor(n.variable),{type:`continue`};let a=this.program.getNextLine(n.lineNumber);return a?{type:`jump`,targetLine:a.lineNumber}:{type:`end`}}async executeIf(e){this.state.tokenIndex++;let t=this.getExpressionTokensUntil(e,Y.THEN,Y.GOTO),n=this.evaluator.evaluate(t),r=e[this.state.tokenIndex];if(r?.type===Y.THEN||r?.type===Y.GOTO)this.state.tokenIndex++;else throw new Z(X.SN);if(!(typeof n==`number`?n!==0:n.length>0)){for(;this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type!==Y.EOL;)this.state.tokenIndex++;return{type:`continue`}}if(this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.NUMBER){let t=e[this.state.tokenIndex].value;if(this.state.tokenIndex++,!this.program.getLine(t))throw new Z(X.US);return{type:`jump`,targetLine:t}}return{type:`continue`}}executeOn(e){this.state.tokenIndex++;let t=this.getExpressionTokensUntil(e,Y.GOTO,Y.GOSUB),n=Math.trunc(this.evaluator.evaluateNumeric(t)),r=e[this.state.tokenIndex]?.type===Y.GOSUB;if(e[this.state.tokenIndex]?.type!==Y.GOTO&&e[this.state.tokenIndex]?.type!==Y.GOSUB)throw new Z(X.SN);this.state.tokenIndex++;let i=[];for(;this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.NUMBER&&(i.push(e[this.state.tokenIndex].value),this.state.tokenIndex++,e[this.state.tokenIndex]?.type===Y.COMMA);)this.state.tokenIndex++;if(n<1||n>i.length)return{type:`continue`};let a=i[n-1];if(!this.program.getLine(a))throw new Z(X.US);return r&&this.stack.pushGosub({lineNumber:this.state.currentLine??0,tokenIndex:this.state.tokenIndex}),{type:`jump`,targetLine:a}}parseLineNumber(e){if(this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.NUMBER)throw new Z(X.SN);let t=e[this.state.tokenIndex].value;return this.state.tokenIndex++,t}getExpressionTokensUntil(e,...t){let n=[],r=0;for(;this.state.tokenIndex<e.length;){let i=e[this.state.tokenIndex];if(i.type===Y.LPAREN&&r++,i.type===Y.RPAREN&&r--,r===0&&t.includes(i.type)||i.type===Y.EOL||i.type===Y.COLON||i.type===Y.EOF)break;n.push(i),this.state.tokenIndex++}return n}async executeCont(){if(this.state.tokenIndex++,!this.state.continueState.canContinue)throw new Z(X.CN);let{lineNumber:e}=this.state.continueState;this.state.running=!0,this.state.continueState.canContinue=!1,await this.runFromLine(e)}formatNumber(e){return e>=0?` `+e.toString()+` `:e.toString()+` `}printReady(){this.console.printLine(``),this.console.printLine(`READY.`)}skipToEndOfStatement(e){for(;this.state.tokenIndex<e.length;){let t=e[this.state.tokenIndex];if(t.type===Y.EOL||t.type===Y.COLON||t.type===Y.EOF)break;this.state.tokenIndex++}}async executeInput(e){this.state.tokenIndex++;let t=`? `;this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.STRING&&(t=e[this.state.tokenIndex].value,this.state.tokenIndex++,e[this.state.tokenIndex]?.type===Y.SEMICOLON&&this.state.tokenIndex++);let n=[];for(;this.state.tokenIndex<e.length;){let t=e[this.state.tokenIndex];if(t.type===Y.EOL||t.type===Y.COLON||t.type===Y.EOF)break;if(t.type===Y.IDENTIFIER){let r=t.value;this.state.tokenIndex++;let i;e[this.state.tokenIndex]?.type===Y.LPAREN&&(i=this.parseArrayIndices(e)),n.push({name:r,indices:i}),e[this.state.tokenIndex]?.type===Y.COMMA&&this.state.tokenIndex++}else throw new Z(X.SN)}let r=await this.console.readLine(t),i=this.parseInputValues(r);for(let e=0;e<n.length;e++){let t=n[e],r=i[e]??``,a=t.name.endsWith(`$`),o;o=a?r:parseFloat(r)||0,t.indices?this.memory.setArrayElement(t.name,t.indices,o):this.memory.setVariable(t.name,o)}}parseInputValues(e){let t=[],n=``,r=!1;for(let i of e)i===`"`?r=!r:i===`,`&&!r?(t.push(n.trim()),n=``):n+=i;return t.push(n.trim()),t}async executeRead(e){for(this.state.tokenIndex++;this.state.tokenIndex<e.length;){let t=e[this.state.tokenIndex];if(t.type===Y.EOL||t.type===Y.COLON||t.type===Y.EOF)break;if(t.type===Y.IDENTIFIER){let n=t.value;this.state.tokenIndex++;let r;e[this.state.tokenIndex]?.type===Y.LPAREN&&(r=this.parseArrayIndices(e));let i=this.readNextDataValue(n.endsWith(`$`));r?this.memory.setArrayElement(n,r,i):this.memory.setVariable(n,i),e[this.state.tokenIndex]?.type===Y.COMMA&&this.state.tokenIndex++}else if(t.type===Y.COMMA)this.state.tokenIndex++;else throw new Z(X.SN)}}readNextDataValue(e){let t=this.state.dataPointer.lineNumber,n=this.state.dataPointer.tokenIndex;if(t===0){let e=this.program.getFirstLine();if(!e)throw new Z(X.OD);t=e.lineNumber,n=0}for(;;){let r=this.program.getLine(t);if(!r)throw new Z(X.OD);let i=r.tokens;for(let r=0;r<i.length;r++)if(i[r].type===Y.DATA){let a=i[r+1];if(a&&a.type===Y.STRING){let r=a.value,i=this.parseDataValue(r,n,e);if(i)return this.state.dataPointer.lineNumber=t,this.state.dataPointer.tokenIndex=i.nextIndex,i.value}}let a=this.program.getNextLine(t);if(!a)throw new Z(X.OD);t=a.lineNumber,n=0}}parseDataValue(e,t,n){let r=t;for(;r<e.length;){let t=e[r];if(t===` `||t===`	`||t===`,`)r++;else break}if(r>=e.length)return null;if(e[r]===`"`){r++;let t=``;for(;r<e.length&&e[r]!==`"`;)t+=e[r],r++;for(r<e.length&&r++;r<e.length&&(e[r]===` `||e[r]===`	`);)r++;return r<e.length&&e[r]===`,`&&r++,{value:n?t:parseFloat(t)||0,nextIndex:r}}let i=``;for(;r<e.length&&e[r]!==`,`;)i+=e[r],r++;if(i=i.trim(),r<e.length&&e[r]===`,`&&r++,i===``)return null;let a=parseFloat(i);return isNaN(a)?{value:n?i:0,nextIndex:r}:{value:n?i:a,nextIndex:r}}executeRestore(e){if(this.state.tokenIndex++,this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.NUMBER){let t=e[this.state.tokenIndex].value;if(this.state.tokenIndex++,!this.program.getLine(t))throw new Z(X.US);this.state.dataPointer.lineNumber=t,this.state.dataPointer.tokenIndex=0}else this.state.dataPointer.lineNumber=0,this.state.dataPointer.tokenIndex=0}executeDim(e){for(this.state.tokenIndex++;this.state.tokenIndex<e.length;){let t=e[this.state.tokenIndex];if(t.type===Y.EOL||t.type===Y.COLON||t.type===Y.EOF)break;if(t.type===Y.IDENTIFIER){let n=t.value;if(this.state.tokenIndex++,e[this.state.tokenIndex]?.type!==Y.LPAREN)throw new Z(X.SN);this.state.tokenIndex++;let r=[];for(;this.state.tokenIndex<e.length;){let t=[],n=0;for(;this.state.tokenIndex<e.length;){let r=e[this.state.tokenIndex];if(r.type===Y.LPAREN&&n++,r.type===Y.RPAREN){if(n===0)break;n--}if(r.type===Y.COMMA&&n===0)break;t.push(r),this.state.tokenIndex++}let i=Math.trunc(this.evaluator.evaluateNumeric(t));if(i<0)throw new Z(X.BS);if(r.push(i),e[this.state.tokenIndex]?.type===Y.COMMA)this.state.tokenIndex++;else if(e[this.state.tokenIndex]?.type===Y.RPAREN){this.state.tokenIndex++;break}else throw new Z(X.SN)}this.memory.dimArray(n,r),e[this.state.tokenIndex]?.type===Y.COMMA&&this.state.tokenIndex++}else if(t.type===Y.COMMA)this.state.tokenIndex++;else throw new Z(X.SN)}}async executeGet(e){if(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.IDENTIFIER)throw new Z(X.SN);let t=e[this.state.tokenIndex].value;this.state.tokenIndex++;let n=await this.console.readChar();t.endsWith(`$`)?this.memory.setVariable(t,n):this.memory.setVariable(t,n.charCodeAt(0)||0)}executePoke(e){this.state.tokenIndex++;let t=this.getExpressionTokensUntil(e,Y.COMMA);if(t.length===0)throw new Z(X.SN);let n=Math.trunc(this.evaluator.evaluateNumeric(t));if(this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.COMMA)throw new Z(X.SN);this.state.tokenIndex++;let r=this.getExpressionTokensUntil(e,Y.EOL,Y.COLON);if(r.length===0)throw new Z(X.SN);let i=Math.trunc(this.evaluator.evaluateNumeric(r));if(i<0||i>255)throw new Z(X.FC);this.memoryMap.poke(n,i)}executeWait(e){this.state.tokenIndex++;let t=this.getExpressionTokensUntil(e,Y.COMMA);if(t.length===0)throw new Z(X.SN);let n=Math.trunc(this.evaluator.evaluateNumeric(t));if(this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.COMMA)throw new Z(X.SN);this.state.tokenIndex++;let r=this.getExpressionTokensUntil(e,Y.COMMA,Y.EOL,Y.COLON);if(r.length===0)throw new Z(X.SN);let i=Math.trunc(this.evaluator.evaluateNumeric(r)),a=0;if(this.state.tokenIndex<e.length&&e[this.state.tokenIndex].type===Y.COMMA){this.state.tokenIndex++;let t=this.getExpressionTokensUntil(e,Y.EOL,Y.COLON);t.length>0&&(a=Math.trunc(this.evaluator.evaluateNumeric(t)))}(this.memoryMap.peek(n)^a)&i}executeDef(e){if(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.FN||(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.IDENTIFIER))throw new Z(X.SN);let t=`FN`+e[this.state.tokenIndex].value;if(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.LPAREN||(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.IDENTIFIER))throw new Z(X.SN);let n=e[this.state.tokenIndex].value;if(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.RPAREN||(this.state.tokenIndex++,this.state.tokenIndex>=e.length||e[this.state.tokenIndex].type!==Y.EQ))throw new Z(X.SN);this.state.tokenIndex++;let r=this.getExpressionTokensUntil(e,Y.EOL,Y.COLON);this.userFunctions.set(t,{paramName:n,exprTokens:[...r]})}},Ra=class{constructor(e){this.write=e,this.column=0}print(e){let t=String(e);this.write(t,!1),this.column=(this.column+t.length)%40}printLine(e=``){this.write(String(e),!0),this.column=0}async readLine(e=``){return this.print(e),``}async readChar(){return``}clearScreen(){this.write(`\f`,!0),this.column=0}getPosition(){return this.column}setPosition(e){this.column=Math.max(0,e|0)}get lineLength(){return 40}get columnWidth(){return 10}},za=class{constructor(e){this.app=e,this.lines=[],this.active=!1,this.loggedIn=!1,this.username=``,this.commandQueue=Promise.resolve(),this.console=new Ra((e,t)=>this.write(e,t)),this.interpreter=new La(this.console),this.dialog=document.createElement(`dialog`),this.dialog.className=`elsemesh-c64-terminal`,this.dialog.setAttribute(`aria-label`,`Commodore 64 computer`),this.dialog.innerHTML=`<style>
      .elsemesh-c64-terminal{width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:radial-gradient(circle at 50% 35%,#514638,#151310 72%);color:#b9c8ff;font-family:ui-monospace,"Courier New",monospace}
      .elsemesh-c64-terminal::backdrop{background:#050505}.elsemesh-c64-shell{height:100%;display:grid;place-items:center;padding:3vh;box-sizing:border-box}
      .elsemesh-c64-monitor{width:min(1080px,94vw);height:min(760px,86vh);display:flex;flex-direction:column;gap:14px;padding:28px;border:18px solid #b6a27b;border-radius:28px;background:#3c3429;box-shadow:0 28px 90px #000,inset 0 0 0 3px #e1d0a2}
      .elsemesh-c64-screen{flex:1;overflow:hidden;white-space:pre-wrap;padding:34px 42px;background:#3155a4;color:#a9c7ff;border:12px solid #171918;border-radius:30px;box-shadow:inset 0 0 60px #07153c,0 0 28px #3a61ad66;font-size:clamp(15px,2.1vw,27px);line-height:1.12;text-transform:uppercase;text-shadow:0 0 7px #bed5ff88}
      .elsemesh-c64-form{display:flex;gap:10px}.elsemesh-c64-input{flex:1;background:#24201a;color:#fff1c8;border:1px solid #d8c69b;border-radius:7px;padding:12px 14px;font:18px ui-monospace,monospace;text-transform:uppercase}
      .elsemesh-c64-form button,.elsemesh-c64-exit{background:#6c5840;color:#fff6dc;border:1px solid #cfb98e;border-radius:7px;padding:10px 17px;font-weight:700;cursor:pointer}
      .elsemesh-c64-meta{display:flex;justify-content:space-between;gap:14px;color:#e9d6aa;font:13px system-ui}.elsemesh-c64-meta span:last-child{text-align:right}
      @media(max-width:650px){.elsemesh-c64-monitor{padding:12px;border-width:9px}.elsemesh-c64-screen{padding:18px 14px;border-width:7px}.elsemesh-c64-meta span:last-child{display:none}}
    </style><div class="elsemesh-c64-shell"><section class="elsemesh-c64-monitor"><div class="elsemesh-c64-screen" role="log" aria-live="polite"></div><form class="elsemesh-c64-form"><input class="elsemesh-c64-input" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="C64 command"><button>RETURN</button><button type="button" class="elsemesh-c64-exit">LEAVE</button></form><div class="elsemesh-c64-meta"><span>COMMODORE 64 · MICROSOFT 6502 BASIC 1.1</span><span>ENTER PROGRAM LINES · RUN · LIST · SAVE "NAME" · ESC LEAVES</span></div></section></div>`,document.body.append(this.dialog),this.screen=this.dialog.querySelector(`.elsemesh-c64-screen`),this.input=this.dialog.querySelector(`.elsemesh-c64-input`),this.dialog.querySelector(`form`).addEventListener(`submit`,e=>{e.preventDefault();let t=this.input.value;this.input.value=``,this.commandQueue=this.commandQueue.then(()=>this.submit(t))}),this.dialog.querySelector(`.elsemesh-c64-exit`).onclick=()=>this.close(),this.dialog.addEventListener(`cancel`,e=>{e.preventDefault(),this.close()}),this.write(`ELSEMESH WAREHOUSE NETWORK`,!0),this.write(`COMMODORE 64 TERMINAL 01`,!0),this.write(``,!0),this.write(`LOGIN:`,!0)}write(e,t=!0){e===`\f`?this.lines=[]:t?this.lines.push(e):this.lines.length?this.lines[this.lines.length-1]+=e:this.lines.push(e),this.lines=this.lines.slice(-120),this.screen.textContent=this.lines.slice(-25).join(`
`),this.screen.scrollTop=this.screen.scrollHeight}async submit(e){let t=e.trim();if(t){if(this.write((this.loggedIn?`]`:`LOGIN: `)+t,!0),!this.loggedIn)this.username=t.replace(/[^A-Z0-9_-]/gi,``).slice(0,16)||`GUEST`,this.loggedIn=!0,this.write(``,!0),this.write(`WELCOME ${this.username.toUpperCase()}`,!0),this.write(`MICROSOFT BASIC 1.1`,!0),this.write(`FOR THE 6502 MICROPROCESSOR`,!0),this.write(``,!0),this.write(`READY.`,!0);else try{await this.interpreter.processInput(t)}catch(e){this.write(e?.toString?.()||`?ERROR`,!0),this.write(`READY.`,!0)}}}open(){this.active||(this.active=!0,this.app.input.suspend(),document.exitPointerLock?.(),this.dialog.showModal(),this.input.focus())}close(){this.active&&(this.active=!1,this.dialog.close(),this.app.input.resume(),this.app.input.requestLock())}},Ba;function Va(e){return Ba??=new Map(Me().screens.map(e=>[e.id,e])),Pe(Ba.get(e))}var Ha=class{constructor(e){this.input=e,this.computers=new Map,this.activeWorld=null}get active(){return[...this.computers.values()].some(e=>e.active)}setWorld(e){e!==this.activeWorld&&(this.clear(),this.activeWorld=e)}nearest(e){let t=null,n=1/0;for(let r of this.activeWorld?.project.terminals??[]){let i=Math.hypot(...r.position.map((t,n)=>t-e.getComponent(n)));i<r.interactionRadius&&i<n&&(t=r,n=i)}return t}open(e){if(e.kind!==`c64`)return!1;let t=this.computers.get(e.id);return t||(t=new za({input:this.input}),this.computers.set(e.id,t)),t.open(),!0}clear(){for(let e of this.computers.values())e.active&&e.close(),e.dialog.remove();this.computers.clear(),this.activeWorld=null}dispose(){this.clear()}};async function Ua(e,t,n,r){let i=new g,a=[],s=new Map,c=new Map,l=new Map((e.terminals??[]).filter(e=>e.screenObjectId).map(e=>[e.screenObjectId,e.kind]));for(let e of t){let t=l.get(e.id),n=e.assetId+JSON.stringify(e.materialOverrides??[])+(t??``)+(e.landscapeChunk??``),r=c.get(n);r||(r={objects:[],kind:t},c.set(n,r)),r.objects.push(e)}try{for(let{objects:t,kind:l}of c.values()){let c=t[0],u=e.assets.find(e=>e.id===c.assetId);if(!u)throw Error(`Missing asset `+c.assetId);let d=s.get(u.id);if(!d){let e=await fetch(u.dataUrl);if(!e.ok)throw Error(`Asset read failed`);d=await Re(await e.arrayBuffer()),s.set(u.id,d)}let f=Ve(d,c,r),m=new g;m.userData.disposeAssetTextures=f.group.userData.disposeAssetTextures,i.add(m);let h;l&&(h=Va(l),m.userData.disposeAssetTextures=()=>{f.group.userData.disposeAssetTextures?.();for(let e of Object.values(h.bindings)){let t=e?.texture;t?.destroy&&t.destroy()}});let _=new Set;f.group.traverse(e=>{if(!e.isMesh)return;let r=h??e.material;h&&_.add(e.material);let i=new w(e.geometry,r,t.length);i.castShadow=!l,i.receiveShadow=!0,i.userData.editorObjectIds=t.map(e=>e.id);for(let e=0;e<t.length;e++)i.setMatrixAt(e,new p().fromArray(n.get(t[e].id).elements)),t[e].landscapeTint&&i.setColorAt(e,new o().fromArray(t[e].landscapeTint));i.instanceMatrix.needsUpdate=!0,i.instanceColor&&(i.instanceColor.needsUpdate=!0),r.transparent&&i.layers.set(2),m.add(i)});for(let e of _)e.dispose();for(let e of t)a.push({objectId:e.id,primitives:f.diagnostics.primitives,warnings:f.diagnostics.warnings})}return i.userData.assetBatchCount=c.size,{root:i,diagnostics:a}}catch(e){throw i.traverse(e=>{e.geometry?.dispose(),e.material?.dispose(),e.userData.disposeAssetTextures?.()}),e}finally{for(let e of s.values())Ce(e.scene)}}function Wa(e,t){let n=je(e),r=n.value,i=new g,a=[],o=(e,n)=>{let r=new y(t(e),n);return r.castShadow=!1,i.add(r),r},s=e.effect.mode===`sequence`?r.glyphs:[{geometry:r.geometry,index:-1}];for(let t of s){let n=new Ee({name:`neon-letter`,color:e.color,emissive:e.color,roughness:.35,side:`double`}),r=o(t.geometry,n);a.push({item:r,material:n,index:t.index})}return r.backingGeometry&&o(r.backingGeometry,new Ee({name:`neon-backing`,color:e.backingColor,roughness:.7,side:`double`})),r.mountingGeometry&&o(r.mountingGeometry,new Ee({name:`neon-mount`,color:`#555b61`,metalness:.7,roughness:.4,side:`double`})),r.frameGeometry&&o(r.frameGeometry,new Ee({name:`neon-frame`,color:`#343b40`,metalness:.65,roughness:.35,side:`double`})),n.release(),i.userData.updateNeon=(t,n,o=e.powered)=>{let s=De({...e,powered:o},t,n);for(let t of a){let n=s.litGlyphs===void 0||t.index<s.litGlyphs?s.brightness:0;t.material.color.set(s.color).multiplyScalar(n>0?.6:.055),t.material.emissive.set(s.color).multiplyScalar(n*(1+e.glow*2))}i.userData.neonState={text:e.text,powered:o,brightness:s.brightness,color:s.color,glyphs:r.glyphs.length,emissive:a[0]?.material.emissive.toArray()}},i.userData.updateNeon(0,14),i}function Ga(e,t){let n=new g;for(let r of e.features??[])if(r.visible!==!1)for(let i of Ue(r,e)){let e;if(i.semantic===`water`){let t=r.kind===`waterfall`,n=r.kind===`lake`;e=new Ee({name:`builder-${r.kind}`,color:i.color,roughness:.22,metalness:.1,transparent:!0,opacity:.88,side:`double`,receiveShadows:!0,vertex:t?`v.position.x += sin(v.position.y*2.8+frame.time*6.0)*0.025;`:`v.position.y += sin(v.position.x*0.55+v.position.z*0.43+frame.time*1.7)*0.025;`,surface:`
  let flow = in.uv.y*${t?`24.0`:n?`2.1`:`13.0`} - frame.time*${t?`3.6`:n?`0.32`:`1.4`};
  let wave = sin(flow*6.28318 + sin(in.uv.x*15.0 + frame.time)*0.9);
  let detail = sin(in.P.x*7.0-in.P.z*5.0+frame.time*2.0)*0.5+0.5;
  let streak = smoothstep(${t?`0.1`:`0.7`},0.98,wave);
  s.albedo = mix(mat.color,vec3f(0.55,0.76,0.83),streak*${t?`0.68`:`0.3`});
  s.normal = normalize(in.N + vec3f(wave*0.12,0.0,detail*0.12));
  s.roughness = ${t?`0.35`:`0.2`};
  s.emissive = vec3f(0.01,0.025,0.03)*streak;
  s.alpha = ${t?`0.8 + detail*0.17`:`0.9`};
`})}else e=i.semantic===`foam`?new Ee({name:`builder-water-foam`,color:i.color,roughness:.9,transparent:!0,opacity:.88,side:`double`,receiveShadows:!1,vertex:`v.position.y += sin(v.position.x*3.7+v.position.z*4.1-frame.time*4.0)*0.045;`,surface:`
  let bubbles = sin(in.uv.x*21.0+frame.time*2.2)*sin(in.uv.y*17.0-frame.time*3.0);
  s.albedo = mix(vec3f(0.35,0.62,0.69),vec3f(0.85,0.94,0.95),smoothstep(-0.2,0.6,bubbles));
  s.alpha = 0.55+0.35*smoothstep(-0.5,0.4,bubbles);
  s.emissive = vec3f(0.018);
`}):new Ee({name:`builder-${i.semantic}`,color:i.color,roughness:.88,side:`double`});let a=t(i.geometry);i.geometry.dispose();let o=new y(a,e);o.castShadow=i.semantic!==`water`&&i.semantic!==`foam`,o.receiveShadow=!0,e.transparent&&o.layers.set(2),n.add(o)}return n}var Ka=Object.freeze({maxHighDetailTrees:16,highDetailDistance:200,detailExitDistance:230,variantsPerSpecies:4,maxTrees:2e3,lodCheckSeconds:.75,lodMovementMetres:12}),qa=new Map,Ja,Ya=`
  let bend=pow(max(0.0,v.treeLocal.y/7.0),2.0);
  let gust=sin(frame.time*0.85+v.treePhase)*0.11+sin(frame.time*1.67+v.treePhase)*0.035;
  let flutter=sin(frame.time*2.3+v.treeLocal.x*2.1+v.treeLocal.z*1.7+v.treePhase)*0.018*bend;
  let dx=(gust*bend+flutter)*v.treeFactor;
  let dz=(cos(frame.time*0.69+v.treePhase)*0.045*bend+flutter*0.5)*v.treeFactor;
  v.position+=v.treeWindX*dx+v.treeWindZ*dz;
`;function Xa(){return Ja||=[`bark`,`foliage`].map(e=>new Ee({name:`builder-batched-tree-${e}`,color:`#ffffff`,roughness:e===`bark`?.94:.78,side:`double`,vertexColors:!0,userData:{sharedBuilderTreeMaterial:!0},attributes:{treeLocal:`vec3f`,treePhase:`f32`,treeFactor:`f32`,treeWindX:`vec3f`,treeWindZ:`vec3f`},vertex:Ya})),Ja}function Za(e){e.getAttribute(`normal`)||e.computeVertexNormals();let t={positions:Float32Array.from(e.getAttribute(`position`).array),normals:Float32Array.from(e.getAttribute(`normal`).array),indices:Array.from(e.index?.array??Array.from({length:e.getAttribute(`position`).count},(e,t)=>t))};return e.dispose(),t}function Qa(e){let t=new D;return t.setAttribute(`position`,new b(new Float32Array(e.positions),3)),t.setIndex(e.indices),Za(t)}function $a(e,t,n,r=!1){let i=(t>>>0)%Ka.variantsPerSpecies,a=`${e}:${n?r?`exact:`+t:i:`low`}`;if(qa.has(a))return qa.get(a);let o;if(n){let n=He(e,r?t:7319+i*113);o={bark:Qa(n.bark),foliage:Qa(n.foliage)}}else{let t=new te(.12,.24,e===`palm`?5.5:4,5);t.translate(0,e===`palm`?2.75:2,0);let n;if(e===`pine`)n=new x(1.4,4.8,7),n.translate(0,3.6,0);else if(e===`palm`){let e=[],t=[];for(let n=0;n<8;n++){let r=n*Math.PI/4,i=Math.cos(r),a=Math.sin(r),o=-a*.32,s=i*.32,c=e.length/3;e.push(0,5.5,0,i*1.6+o,5.35,a*1.6+s,i*3,4.65,a*3,i*1.6-o,5.35,a*1.6-s),t.push(c,c+1,c+2,c,c+2,c+3)}n=new D,n.setAttribute(`position`,new b(new Float32Array(e),3)),n.setIndex(t)}else n=new C(1,7,4),n.scale(1.9,1.55,1.7),n.translate(0,4.3,0);o={bark:Za(t),foliage:Za(n)}}return qa.set(a,o),o}function eo(e,t,n=new Set){let r=e.map(e=>({id:e.id,distance:t.distanceTo(new i(...e.position))/Math.max(1,Math.max(...e.scale))})).sort((e,t)=>e.distance-t.distance||e.id.localeCompare(t.id)),a=new Set(r.filter(e=>n.has(e.id)&&e.distance<Ka.detailExitDistance).slice(0,Ka.maxHighDetailTrees).map(e=>e.id));for(let e of r){if(a.size>=Ka.maxHighDetailTrees)break;e.distance<Ka.highDetailDistance&&a.add(e.id)}return a}function to(e,t){let n=e.reduce((e,n)=>e+n.template[t].positions.length/3,0),r=new Float32Array(n*3),a=new Float32Array(n*3),s=new Float32Array(n*3),c=new Float32Array(n*3),l=new Float32Array(n*3),u=new Float32Array(n*3),d=new Float32Array(n),f=new Float32Array(n),p=[],m=new i,h=new i,g=0;for(let n of e){let e=n.template[t],i=e.positions.length/3,_=n.transform.elements,v=new o(t===`bark`?n.species===`palm`?`#897156`:n.object.landscapeOrigin?`#66503a`:`#594633`:n.object.color);c.set(e.positions,g*3),d.fill(((n.object.treeSeed??7319)>>>0)*.013%(Math.PI*2),g,g+i),f.fill(n.species===`palm`?1.4:n.species===`pine`?.65:1,g,g+i);for(let t=0;t<i;t++){let i=t*3,o=(g+t)*3;m.fromArray(e.positions,i).applyMatrix4(n.transform),h.fromArray(e.normals,i).applyMatrix3(n.normal).normalize(),r[o]=m.x,r[o+1]=m.y,r[o+2]=m.z,a[o]=h.x,a[o+1]=h.y,a[o+2]=h.z,s[o]=v.r,s[o+1]=v.g,s[o+2]=v.b;for(let e=0;e<3;e++)l[o+e]=_[e],u[o+e]=_[8+e]}for(let t of e.indices)p.push(t+g);g+=i}let _=new D;for(let[e,t,n]of[[`position`,r,3],[`normal`,a,3],[`color`,s,3],[`treeLocal`,c,3],[`treeWindX`,l,3],[`treeWindZ`,u,3],[`treePhase`,d,1],[`treeFactor`,f,1]])_.setAttribute(e,new b(t,n));return _.setIndex(p),_.computeBoundingSphere(),_.boundingSphere&&(_.boundingSphere.radius+=1),_}function no(e,t){let n=xe(e),r=e.filter(t=>t.kind===`tree`&&Te(e,t.id).visible).map(e=>({...e,position:new i().setFromMatrixPosition(n.get(e.id)).toArray(),worldMatrix:n.get(e.id).elements})).slice(0,Ka.maxTrees),a=new g,o=Xa().map(e=>{let t=new y(new D,e);return t.castShadow=!0,t.receiveShadow=!0,a.add(t),t}),c=new Set,l=t.clone(),u=-1/0,d;function f(t){let n=r.map(e=>{let n=new p().fromArray(e.worldMatrix),r=e.treeSpecies??`broadleaf`;return{object:e,species:r,transform:n,normal:new s().getNormalMatrix(n),template:$a(r,e.treeSeed??7319,t.has(e.id),!!e.landscapeOrigin)}}),i=0,a=0;for(let[e,t]of[`bark`,`foliage`].entries()){let s=to(n,t);o[e].geometry.dispose(),o[e].geometry=s,o[e].visible=r.length>0,i+=s.getAttribute(`position`).count,a+=(s.index?.count??0)/3}c=t,d={sourceTrees:e.filter(t=>t.kind===`tree`&&Te(e,t.id).visible).length,renderedTrees:r.length,highDetailTrees:t.size,lowDetailTrees:r.length-t.size,vertices:i,triangles:a,batches:r.length?2:0,cachedTemplates:qa.size,policy:Ka}}return f(eo(r,t)),a.userData.treePreviewStats=()=>d,a.userData.updateTreeLOD=(e,t)=>{if(e-u<Ka.lodCheckSeconds||t.distanceTo(l)<Ka.lodMovementMetres)return;u=e,l.copy(t);let n=eo(r,t,c);(n.size!==c.size||[...n].some(e=>!c.has(e)))&&f(n)},a}async function ro(e){let n=await We(e);if(!n)return{textures:{},uniforms:{},surface:``,dispose(){},diagnostics:{tiles:0}};let r=new A({label:`landscape-color`,width:n.size,height:n.size,format:`rgba8unorm`,data:n.data}),i=new A({label:`landscape-rough`,width:n.size,height:n.size,format:`rgba8unorm`,data:n.rough}),a=new A({label:`landscape-index`,width:4096,height:1,format:`rgba32float`,data:n.index});return{textures:{landscapeColor:r,landscapeRough:i,landscapeIndex:a},uniforms:{landscapeSize:[`vec4f`,[n.size,n.side,e.terrain.width,e.terrain.depth]]},surface:`
 let lc=(in.P.xz+mat.landscapeSize.zw*0.5)/16.0;let tile=floor(lc);
 var hash=i32(((i32(tile.x)*17+i32(tile.y)*31)%4096+4096)%4096);var slot=0.0;
 for(var probe=0;probe<256;probe++){let entry=textureLoad(landscapeIndex,vec2i(hash,0),0);if(entry.z<0.5){break;}if(all(abs(entry.xy-tile)<vec2f(0.1))){slot=entry.z;break;}hash=(hash+1)%4096;}
 let n=max(0.0,slot-1.0);let atlasSlot=vec2f(n%mat.landscapeSize.y,floor(n/mat.landscapeSize.y));
 let luv=(atlasSlot*66.0+1.0+fract(lc)*64.0)/mat.landscapeSize.x;
 let land=textureSampleLevel(landscapeColor,smpLinearClamp,luv,0.0);let landR=textureSampleLevel(landscapeRough,smpLinearClamp,luv,0.0);
 if(slot>0.5){s.albedo=mix(s.albedo,land.rgb,land.a);s.roughness=mix(s.roughness,landR.r,landR.a);}
`,diagnostics:{tiles:n.tiles,size:n.size},dispose(){let e=()=>{r.destroy(),i.destroy(),a.destroy()};t.encoder?t.onSubmit(null,e):e()}}}async function io(e){let n=await ro(e),r=()=>new Ee({name:`builder-terrain`,color:`#ffffff`,roughness:.92,vertexColors:!0,side:`double`,textures:n.textures,uniforms:n.uniforms,surface:n.surface}),i=e.terrainImagery,a=e.geography;if(!i||!a)return{material:r(),diagnostics:{imagery:!1,landscape:n.diagnostics},dispose:n.dispose};let o,s;try{if(i.crs!==`EPSG:27700`||a.crs!==`EPSG:27700`)throw Error(`Imagery and terrain must use EPSG:27700.`);let e=await fetch(i.dataUrl);if(s=await createImageBitmap(await e.blob(),{premultiplyAlpha:`none`,colorSpaceConversion:`none`}),s.width>8192||s.height>8192||s.width*s.height>32e6)throw Error(`Terrain imagery exceeds the decoded image limit.`);o=new A({label:`builder-terrain-imagery`,width:s.width,height:s.height,format:`rgba8unorm-srgb`,mips:!0,usage:[`sample`,`copyDst`]}),t.queue.copyExternalImageToTexture({source:s},{texture:o.getGPU(),premultipliedAlpha:!1},[s.width,s.height]),Ae(o);let r=i.bounds.west-a.center.easting,c=a.center.northing-i.bounds.north,l=i.bounds.east-i.bounds.west,u=i.bounds.north-i.bounds.south;return{material:new Ee({name:`builder-geographic-terrain`,color:`#ffffff`,roughness:.92,vertexColors:!0,side:`double`,textures:{terrainImagery:o,...n.textures},uniforms:{...n.uniforms,imageryRect:[`vec4f`,[r,c,l,u]]},surface:`
  let imageryUV=(in.P.xz-mat.imageryRect.xy)/mat.imageryRect.zw;
  let imageryDx=dpdx(imageryUV); let imageryDy=dpdy(imageryUV);
  if(all(imageryUV>=vec2f(0.0)) && all(imageryUV<=vec2f(1.0))) {
    let image=textureSampleGrad(terrainImagery,smpAnisoClamp,imageryUV,imageryDx,imageryDy);
    s.albedo=mix(s.albedo,image.rgb,image.a);
  }
`+n.surface}),diagnostics:{imagery:!0,landscape:n.diagnostics,pixels:[s.width,s.height],localBounds:{west:r,northZ:c,width:l,depth:u},sourceName:i.sourceName},dispose(){n.dispose();let e=()=>o.destroy();t.encoder?t.onSubmit(null,e):e()}}}catch(e){return o&&o.destroy(),{material:r(),diagnostics:{imagery:!1,landscape:n.diagnostics,error:e.message},dispose:n.dispose}}finally{s?.close()}}function ao(e){let t=new D;for(let n of[`position`,`normal`,`uv`,`color`]){let r=e.getAttribute(n);if(!r)continue;let i=new Float32Array(r.count*r.itemSize);for(let e=0;e<r.count;e++)for(let t=0;t<r.itemSize;t++)i[e*r.itemSize+t]=r.getComponent(e,t);t.setAttribute(n,new b(i,r.itemSize))}return e.index&&t.setIndex(Array.from(e.index.array)),t.getAttribute(`normal`)||t.computeVertexNormals(),t}function oo(e){if(!e)return;e.root.removeFromParent();let t=new Set,n=new Set;e.root.traverse(e=>{e.geometry&&n.add(e.geometry),e.material&&t.add(e.material),e.userData.disposeAssetTextures?.(),e.userData.disposeTerrainImagery?.(),e.userData.disposeLandscape?.()});for(let e of n)e.dispose();for(let e of t)e.userData.sharedBuilderTreeMaterial||e.dispose()}async function so(e,t){let n=e.project,r=new g,a={root:r,descriptor:e,terrain:e.terrain,colliders:new we,assets:[],query:Le(n.water,n)};r.name=`repository-world:`+e.worldId;try{for(let t of e.boxes)a.colliders.addBox(new i(...t.center),new i(...t.half),0,{walkable:t.walkable,solid:t.solid,tag:t.id});let{width:o,depth:s,resolution:c,heights:l,materials:u}=n.terrain,d=[],f=[],p=[],m=[[.38,.49,.32],[.54,.39,.27],[.48,.5,.48],[.7,.63,.43]];for(let e=0;e<c;e++)for(let t=0;t<c;t++){let n=e*c+t,r=l[n];d.push(t*o/(c-1)-o/2,r,e*s/(c-1)-s/2),f.push(...m[u[n]].map(e=>e*Math.max(.68,Math.min(1.22,.88+r/55)))),t<c-1&&e<c-1&&p.push(n,n+c,n+1,n+1,n+c,n+c+1)}let h=new Oe.BufferGeometry;h.setAttribute(`position`,new Oe.Float32BufferAttribute(d,3)),h.setAttribute(`color`,new Oe.Float32BufferAttribute(f,3)),h.setIndex(p),h.computeVertexNormals();let _=await io(n),v=new y(ao(h),_.material);h.dispose(),v.userData.disposeTerrainImagery=_.dispose,r.add(v);let b=ze(n),x=[...n.objects,...b],S=xe(x),C=(e,t,n)=>{e.add(new y(ao(t),new Ee({color:n,roughness:.85,side:`double`}))),t.dispose()};for(let e of n.objects){if([`group`,`tree`,`glb`].includes(e.kind)||!Te(n.objects,e.id).visible)continue;let t=new g;if(t.userData.editorObjectId=e.id,t.matrixAutoUpdate=!1,t.matrix.fromArray(S.get(e.id).elements),r.add(t),e.kind===`computer`){let n=Ne();try{for(let r of n.parts){let n=r.emissive?e.computer.screenColor:r.color;t.add(new y(ao(r.geometry),new Ee({color:n,emissive:r.emissive?n:`#000000`,roughness:.45,side:`double`})))}}finally{Se(n)}}else if(e.kind===`neon-sign`){let n=Wa(e.neon,ao);n.userData.neonObjectId=e.id,t.add(n)}else e.kind===`building`?(C(t,new Oe.BoxGeometry(3.6,2.2,3).translate(0,1.1,0),e.color),C(t,new Oe.ConeGeometry(2.7,1.1,4).rotateY(Math.PI/4).translate(0,2.55,0),`#574e42`)):C(t,e.kind===`sphere`?new Oe.SphereGeometry(.8,24,16):e.kind===`cylinder`?new Oe.CylinderGeometry(.65,.65,1.6,24):e.kind===`cone`?new Oe.ConeGeometry(.8,1.6,24):new Oe.BoxGeometry(1.6,1.6,1.6),e.color)}let w=await Ua(n,x.filter(e=>e.kind===`glb`&&Te(x,e.id).visible),S,ao);r.add(w.root),a.assets=w.diagnostics,a.assetBatchCount=w.root.userData.assetBatchCount;let T=Be(n);T&&r.add(T),a.forest=no(n.objects,t.position),r.add(a.forest),r.add(Ga(n,ao));let E=Ie(n,{native:!0,convertGeometry:ao});r.add(E),a.landscape=E,a.landscapeCollisions=Fe(n,a.colliders);let ee=a.query.setTime.bind(a.query);return a.query.setTime=e=>{ee(e),E.userData.updateLandscape(e)},a.matrices=S,a}catch(e){throw oo(a),e}}var co=1500;function lo(){return{avatarTransportActive:[`f32`,0],avatarTransportProgress:[`f32`,1],avatarTransportOrigin:[`vec3f`,new i],avatarTransportHeight:[`f32`,1.9]}}var uo=`
 if(mat.avatarTransportActive>0.5){
  let transportP=in.P-mat.avatarTransportOrigin;
  let transportNoise=fract(sin(dot(floor(transportP*65.0),vec3f(12.9898,78.233,37.719)))*43758.5453);
  let transportHeight=clamp(transportP.y/mat.avatarTransportHeight,0.0,1.1);
  let transportCut=mat.avatarTransportProgress*1.24-0.12;
  if(transportHeight+transportNoise*0.12>transportCut){discard;}
  let transportEdge=1.0-smoothstep(0.015,0.10,abs(transportHeight-transportCut));
  s.emissive+=vec3f(0.15,0.75,1.0)*transportEdge*6.0;
 }`;function fo(e){if(e.userData.avatarTransportUniforms)return;let t={avatarTransportActive:{value:0},avatarTransportProgress:{value:1},avatarTransportOrigin:{value:new Oe.Vector3},avatarTransportHeight:{value:1.9}};e.userData.avatarTransportUniforms=t;let n=e.onBeforeCompile,r=e.customProgramCacheKey();e.onBeforeCompile=(r,i)=>{n.call(e,r,i),Object.assign(r.uniforms,t),r.vertexShader=`varying vec3 avatarTransportWorld;
`+r.vertexShader,r.vertexShader=r.vertexShader.replace(`#include <project_vertex>`,`avatarTransportWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
#include <project_vertex>`),r.fragmentShader=`varying vec3 avatarTransportWorld;uniform float avatarTransportActive;uniform float avatarTransportProgress;uniform vec3 avatarTransportOrigin;uniform float avatarTransportHeight;
`+r.fragmentShader,r.fragmentShader=r.fragmentShader.replace(`#include <alphatest_fragment>`,`
  float avatarTransportEdge=0.0;
  if(avatarTransportActive>0.5){
   vec3 transportP=avatarTransportWorld-avatarTransportOrigin;
   float transportNoise=fract(sin(dot(floor(transportP*65.0),vec3(12.9898,78.233,37.719)))*43758.5453);
   float transportHeight=clamp(transportP.y/avatarTransportHeight,0.0,1.1);
   float transportCut=avatarTransportProgress*1.24-0.12;
   if(transportHeight+transportNoise*0.12>transportCut)discard;
   avatarTransportEdge=1.0-smoothstep(0.015,0.10,abs(transportHeight-transportCut));
  }
  #include <alphatest_fragment>`),r.fragmentShader=r.fragmentShader.replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
totalEmissiveRadiance+=vec3(0.15,0.75,1.0)*avatarTransportEdge*6.0;`)},e.customProgramCacheKey=()=>r+`|original-avatar-materialisation-v1`,e.needsUpdate=!0}function po(e,{isWebGL:t=!1}={}){return{setState({active:n,progress:r,origin:i,height:a}){for(let o of e()??[])if(t){let e=o.userData.avatarTransportUniforms;if(!e)continue;e.avatarTransportActive.value=+!!n,e.avatarTransportProgress.value=r,e.avatarTransportOrigin.value.set(...i),e.avatarTransportHeight.value=a}else o.uniforms.avatarTransportActive&&(o.set(`avatarTransportActive`,+!!n),o.set(`avatarTransportProgress`,r),o.uniforms.avatarTransportOrigin.value.set(...i),o.set(`avatarTransportHeight`,a))}}}function mo(e){let t=[],n=[],r=[],i=[];for(let a=0;a<80;a++){let o=a*2.3999632297,s=.08+.38*(a*37%79/79),c=Math.cos(o)*s,l=Math.sin(o)*s,u=e*(a*29%79/79);for(let e of[!1,!0]){let a=t.length/3,o=e?0:.012,s=e?.012:0;for(let[e,i]of[[-1,-1],[1,-1],[-1,1],[1,1]])t.push(c+e*o,u+i*.035,l+e*s),n.push(0,0,1),r.push((e+1)/2,(i+1)/2);i.push(a,a+1,a+2,a+1,a+3,a+2)}}let a=new Oe.BufferGeometry;return a.setAttribute(`position`,new Oe.Float32BufferAttribute(t,3)),a.setAttribute(`normal`,new Oe.Float32BufferAttribute(n,3)),a.setAttribute(`uv`,new Oe.Float32BufferAttribute(r,2)),a.setIndex(i),a}function ho({root:e,materialAdapter:t,isWebGL:n=!1,height:r=1.9,now:i=()=>Date.now()}={}){if(!e)throw Error(`Original avatar root required`);let a=n?Oe:se,o=new a.Group;o.name=`Original avatar transporter particles`,o.userData.avatarTransportPresentation=!0,e.add(o);let s=e=>{if(n)return e;let t=ao(e);return e.dispose(),t},c=n?new Oe.MeshBasicMaterial({name:`Avatar transporter energy`,color:`#83efff`,transparent:!0,opacity:0,depthWrite:!1,side:Oe.DoubleSide,toneMapped:!1}):new Ee({name:`Avatar transporter energy`,color:`#83efff`,emissive:`#83efff`,lit:!1,transparent:!0,opacity:0,depthWrite:!1,side:`double`}),l=new a.Mesh(s(mo(r)),c);l.frustumCulled=!1,l.name=`Avatar transporter three dimensional sparks`,o.add(l);let u=new a.Mesh(s(new Oe.TorusGeometry(.43,.014,5,64)),c);u.rotation.x=Math.PI/2,u.frustumCulled=!1,u.name=`Avatar transporter materialisation scan`,o.add(u);let d=null,f=!1,p=-1,m=1,h=new Map,g=(n,i,o)=>{let s=e.localToWorld(new a.Vector3).toArray();t?.setState({active:n,progress:i,origin:s,height:r,time:o});let d=n?Math.max(.12,Math.sin(Math.PI*Math.min(.97,i))):0;c.opacity=d*.9,u.position.y=r*i,l.rotation.y=o*1.9,l.position.y=n?Math.sin(o*19)*.025:0,m=i},_=()=>{if(f)return;let e=i();if(d){let t=Math.max(0,Math.min(1,(e-d.committedAt)/co));e>=d.endsAt?(d=null,g(!1,1,e/1e3)):g(!0,t,e/1e3)}else g(!1,1,e/1e3)};return{group:o,update:_,observeVerifiedTransfer(e,t){if(f||!e||e.protocol!==`elsemesh.portal-presentation/1`||e.type!==`portal-arrival`||typeof e.transferId!=`string`||!e.transferId||e.transferId.length>256||typeof e.playerNodeId!=`string`||e.destinationWorldId!==t||e.sourceWorldId===t||!Number.isSafeInteger(e.destinationGeneration)||e.destinationGeneration<0||!Number.isFinite(e.committedAt)||!Number.isFinite(e.expiresAt))return!1;let n=i(),r=Math.min(e.expiresAt,e.committedAt+co),a=e.transferId+`:`+e.destinationGeneration;if(n<e.committedAt-100||n>=r||e.expiresAt-e.committedAt>3e3||e.expiresAt<=e.committedAt||e.destinationGeneration<p||h.has(a))return!1;for(p=e.destinationGeneration,h.set(a,n);h.size>64;)h.delete(h.keys().next().value);return d={...e,endsAt:r},_(),!0},diagnostics(){return{active:!!d,progress:m,transferId:d?.transferId,generation:d?.destinationGeneration,particles:80,sceneBased:!0}},dispose(){f||(g(!1,1,i()/1e3),f=!0,d=null,h.clear(),o.removeFromParent(),l.geometry.dispose(),u.geometry.dispose(),c.dispose(),n||c.uniformBlock.buffer?.destroy())}}}var go=e=>new o(parseInt(e.slice(1),16));function _o({name:e}){return[`body`,`head`,`opacity`].includes(e)?{uniforms:{...Object.fromEntries([`shirt`,`trousers`,`skin`,`hair`].map(e=>[e,[`vec3f`,new o(1,1,1)]])),...lo()},surface:(e===`opacity`?`
			let detail = clamp(dot(s.albedo,vec3f(0.2126,0.7152,0.0722)) * 4.0,0.12,1.8);
			s.albedo = mat.hair * detail;
			s.roughness = 0.9; s.specularIntensity = 0.15;
		`:`
			let zone = i32(round(orm.r * 5.0));
			let lightness = dot(s.albedo,vec3f(0.2126,0.7152,0.0722));
			if (zone == 1) { s.albedo = mat.shirt * clamp(lightness * 3.0,0.12,1.7); }
			if (zone == 2) { s.albedo = mat.trousers * clamp(lightness * 12.0,0.1,1.8); }
			if (zone == 3) { s.albedo = mat.skin * clamp(lightness * 3.0,0.06,1.5); }
			if (zone == 4) { s.albedo = mat.hair * clamp(lightness * 5.0,0.08,1.8); s.roughness = 0.9; s.specularIntensity = 0.15; }
		`)+uo}:{}}function vo(e,t){for(let n of e.materials)for(let e of[`shirt`,`trousers`,`skin`,`hair`])n.uniforms[e]&&(n.uniforms[e].value=go(t[e]))}var yo=new Map;function bo(e){return yo.has(e)||yo.set(e,un(`./models/characters/${e}.glb`)),yo.get(e)}var xo=ke({name:`Explorer_orange_jacket`,color:13133348,roughness:.9,emissive:5513991,emissiveIntensity:.16}),So=ke({name:`Explorer_life_vest`,color:15242795,roughness:.78,emissive:5320714,emissiveIntensity:.2}),Co=ke({name:`Explorer_navy_trousers`,color:2505028,roughness:.92}),wo=ke({name:`Explorer_skin`,color:11105360,roughness:.86}),To=ke({name:`Explorer_boots`,color:1516587,roughness:.95}),Eo=ke({name:`Explorer_vest_detail`,color:16040029,roughness:.76}),Do=ke({name:`Explorer_face_detail`,color:2498852,roughness:.9}),Oo=ke({name:`Explorer_gloves`,color:2569275,roughness:.95});function Q(e,t,n,r,i,a,o){let s=new y(n,r);return s.name=t,s.position.set(i,a,o),s.castShadow=!0,e.add(s),s}function ko(e,t,n,r,a,o){let s=new i().subVectors(r,n),c=Q(e,t,new te(a*.86,a,s.length(),9),o,(n.x+r.x)/2,(n.y+r.y)/2,(n.z+r.z)/2);return c.quaternion.setFromUnitVectors(new i(0,1,0),s.normalize()),c}var Ao=class{constructor(e,t,{character:n=`stock-player`}={}){this.characterAsset=n,this.customizable=n===`stock-player`,this.appearance={...Je},this.loadVersion=0,this.scene=e,this.boat=t,this.group=new g,this.group.name=`Island_explorer_player_character`,Q(this.group,`Jacket`,new C(1,18,12),xo,0,1.11,0).scale.set(.29,.39,.2),Q(this.group,`Life_vest`,new C(1,18,12),So,0,1.2,.08).scale.set(.275,.29,.18),Q(this.group,`Vest_back_panel`,new re(.38,.38,.045),Eo,0,1.22,-.105);for(let e of[-1,1])Q(this.group,`Reflective_vest_strip`,new re(.055,.4,.035),Eo,e*.19,1.2,.26),Q(this.group,`Vest_buckle`,new re(.1,.045,.042),Do,e*.12,1.06,.27),Q(this.group,`Ear`,new C(.055,8,6),wo,e*.145,1.58,0),Q(this.group,`Eye`,new C(.018,8,6),Do,e*.055,1.6,.127);Q(this.group,`Jacket_zip`,new re(.018,.42,.017),Do,0,1.2,.266),Q(this.group,`Nose`,new C(.032,8,6),wo,0,1.55,.15),this.mouth=Q(this.group,`Speaking_mouth`,new C(.027,8,6),Do,0,1.49,.135),this.speaking=!1,Q(this.group,`Belt`,new re(.49,.075,.29),Do,0,.77,0),Q(this.group,`Head`,new C(.14,12,8),wo,0,1.58,0),Q(this.group,`Cap`,new C(1,14,8),Co,0,1.72,.025).scale.set(.17,.08,.175),Q(this.group,`Cap_brim`,new re(.31,.03,.16),Co,0,1.68,.21),this.arms=[],this.legs=[],this.seated=new g,this.seated.name=`Seated_helm_pose`,this.group.add(this.seated);let r=this.boat.model.wheelPivot.position,a=r.y-this.boat.model.lines.deckY,o=r.z-K.seatZ-.05;for(let e of[-1,1]){let t=new g;t.position.set(e*.33,1.37,0),Q(t,`Sleeve`,new te(.075,.105,.5,10),xo,0,-.26,0),Q(t,`Hand`,new C(.09,8,6),wo,0,-.53,0),this.group.add(t),this.arms.push(t);let n=new g;n.position.set(e*.14,.8,0),Q(n,`Trouser_leg`,new te(.09,.12,.65,10),Co,0,-.34,0),Q(n,`Boot`,new re(.22,.18,.31),To,0,-.72,.06),this.group.add(n),this.legs.push(n);let r=new i(e*.15,.7,0),s=new i(e*.17,.62,.48),c=new i(e*.18,.06,.58);ko(this.seated,`Seated_thigh`,r,s,.11,Co),ko(this.seated,`Seated_shin`,s,c,.095,Co),Q(this.seated,`Seated_boot`,new re(.2,.14,.3),To,c.x,c.y,c.z+.09);let l=new i(e*.31,1.36,0),u=new i(e*.31,1.14,.43),d=new i(e*.17,a,o);ko(this.seated,`Sleeve_to_wheel`,l,u,.095,xo),ko(this.seated,`Forearm_to_wheel`,u,d,.075,xo),Q(this.seated,`Hand_on_wheel`,new C(.083,9,7),Oo,d.x,d.y,d.z)}this.cinematic=null,this.clock=0,this._parent=null,this._place(e),this.proceduralParts=[...this.group.children],this.ready=this.loadCharacter().catch(e=>{console.warn(`Explorer character unavailable`,e)})}async loadCharacter(){let e=++this.loadVersion,t=await bo(this.characterAsset);if(this.disposed||e!==this.loadVersion)return;let n=await bn.create(t,this.customizable?{materials:_o}:{});if(this.disposed||e!==this.loadVersion)n.dispose();else{for(let e of[`idle`,`walk`,`run`,`helm`])if(!n.clipNames().includes(e))throw Error(`Missing character clip: ${e}`);for(let e of n.materials)e.underwaterLighting=`lite`;n.play(`idle`,{fade:.01}),n.update(0),this.customizable&&vo(n,this.appearance),this.scanned&&(this.group.remove(this.scanned.group),this.scanned.dispose()),this.group.add(n.group),this.scanned=n}}setAppearance(e=Je){if(!this.customizable||this.disposed||(qe(e),Ge(e)===this.appearanceId))return this.ready;this.appearanceId=Ge(e),this.appearance={...e};let t=Ke[e.style].asset;return t===this.characterAsset?this.scanned&&vo(this.scanned,this.appearance):(this.characterAsset=t,this.ready=this.loadCharacter().catch(e=>{throw this.appearanceId=null,console.warn(`Avatar unavailable`,e),e})),this.ready}dispose(){this.disposed=!0,++this.loadVersion,this.group.parent?.remove(this.group),this.scanned?.dispose();for(let e of this.proceduralParts)e.traverse(e=>e.geometry?.dispose?.())}_place(e){this._parent!==e&&(this._parent?.remove(this.group),e.add(this.group),this._parent=e)}update(e,t,n,r){let a=this.cinematic,o=a?a.mode===`boat`||a.mode===`helm`:t.mode===`boat`||t.mode===`deck`,s=a?a.mode===`boat`||a.mode===`helm`||!!a.seated:t.mode===`boat`;this.seated.visible=s;for(let e of[...this.arms,...this.legs])e.visible=!s;this._place(o?this.boat.model.group:this.scene);let c=!1;if(a){if(o){let e=a.deckLocal||(s?[K.helmX,this.boat.model.lines.deckY,K.seatZ]:[0,this.boat.model.lines.deckY,-1.75]);this.group.position.set(...e),this.group.rotation.y=s?0:a.deckYaw??0}else this.group.position.set(a.x,a.y,a.z),this.group.rotation.y=a.yaw??0;c=!!a.walk}else if(o){let e=t.mode===`deck`?t.deckPos:new i(K.helmX,this.boat.model.lines.deckY,K.seatZ);this.group.position.copy(e),this.group.rotation.y=t.mode===`deck`?t.deckYaw:0,c=t.mode===`deck`&&t.deckVel.lengthSq()>.04}else this.group.position.copy(t.position),this.group.rotation.y=t.yaw+Math.PI,c=t.mode===`walk`&&t.velocity.lengthSq()>.12;this.clock+=e*(c?8:2),this.mouth.scale.y=this.speaking?1.8+Math.sin(this.clock*9)*.7:.32;let l=c?Math.sin(this.clock)*.5:0;this.legs[0].rotation.x=l,this.legs[1].rotation.x=-l,this.arms[0].rotation.x=-l*.7,this.arms[1].rotation.x=l*.7;let u=!a&&!r&&(t.mode===`walk`||t.mode===`swim`||t.mode===`helicopter`||t.mode===`deck`||t.mode===`boat`&&t.camMode===`first`),d=this.group.localToWorld(new i(0,1.58,0)),f=!r&&n.position.distanceTo(d)<.85;if(this.group.visible=!u&&!f,this.scanned){for(let e of this.proceduralParts)e.visible=!1;let n=this.group.position,r=this.lastPosition&&e>0?Math.hypot(n.x-this.lastPosition.x,n.z-this.lastPosition.z)/e:0;this.lastPosition={x:n.x,z:n.z};let i=a?a.speed??r:o?t.deckVel.length():Math.hypot(t.velocity.x,t.velocity.z),l=s?`helm`:c?i>4.3?`run`:`walk`:`idle`;this.scanned.current!==l&&this.scanned.play(l,{fade:.2}),this.scanned.update(e)}}},jo=e({FLASH:()=>Bo,LocalLights:()=>qo,addBoatLights:()=>Jo,addVillageLights:()=>Yo,localLightsModule:()=>Vo}),Mo=8,No=()=>Array.from({length:Mo},()=>new h),Po=new d(`LocalLightParams`,{pos:[`vec4f[${Mo}]`,No()],col:[`vec4f[${Mo}]`,No()],dir:[`vec4f[${Mo}]`,No()],count:[`i32`,0],flashOn:[`f32`,0],flashCone:[`vec2f`,new m(.99,.82)],flashPos:[`vec3f`,new i],flashDir:[`vec3f`,new i(0,0,-1)],flashCol:[`vec3f`,new i]},{label:`localLights`}),Fo=Po.fields,Io={array:Fo.pos.value},Lo={array:Fo.col.value},Ro={array:Fo.dir.value},zo=Fo.count,Bo={on:Fo.flashOn,pos:Fo.flashPos,dir:Fo.flashDir,col:Fo.flashCol,cone:Fo.flashCone},Vo=new M({name:`localLights`,deps:[N,it],uniforms:Po,uniformName:`localLights`,code:`
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
`});Ye.set(`localLights`,Vo);var Ho=new i,Uo=new i,Wo=new i,Go=new i,Ko=(e,t,n)=>{let r=Math.min(1,Math.max(0,(e-t)/(n-t)));return r*r*(3-2*r)},qo=class{constructor(){this.sources=[],this.enabled=!0,this.strength=1,this.flashlight={on:!1,intensity:55,range:30,color:new o(1,.71,.49),cosInner:Math.cos(r.degToRad(9)),cosOuter:Math.cos(r.degToRad(35)),position:new i,dir:new i(0,0,-1),primed:!1},this._list=[],this.time=0,this.active=0}add(e){return e.phase=e.phase??Math.random()*100,this.sources.push(e),e}toggleFlashlight(e=!this.flashlight.on){return this.flashlight.on=e,this.flashlight.primed=!1,e}update(e,t){this.time+=t;let n=0;Bo.on.value=this.flashlight.on&&this.enabled?1:0;let r=Io.array,i=Lo.array,a=Ro.array,o=this.flashlight;if(o.on&&this.enabled){e.updateMatrixWorld();let s=e.matrixWorld.elements;Wo.set(s[0],s[1],s[2]).normalize(),Go.set(s[4],s[5],s[6]).normalize(),Uo.set(-s[8],-s[9],-s[10]).normalize(),o.primed||=(o.dir.copy(Uo),!0),o.dir.lerp(Uo,1-Math.exp(-t/.06)).normalize(),o.position.setFromMatrixPosition(e.matrixWorld).addScaledVector(Wo,.2).addScaledVector(Go,-.22).addScaledVector(Uo,.15);let c=o.intensity*(.08+.92*Ko(he.night.value,0,.6));r[0].set(o.position.x,o.position.y,o.position.z,o.range*o.range),i[0].set(o.color.r*c,o.color.g*c,o.color.b*c,o.cosInner),a[0].set(o.dir.x,o.dir.y,o.dir.z,o.cosOuter),n=1,Bo.pos.value.copy(o.position),Bo.dir.value.copy(o.dir),Bo.col.value.set(o.color.r*c,o.color.g*c,o.color.b*c),Bo.cone.value.set(o.cosInner,o.cosOuter)}let s=Ko(he.night.value,.15,.75)*this.strength;if(this.enabled&&(s>.002||this.sources.some(e=>e.alwaysOn&&e.enabled!==!1))){let t=e.position,o=this._list;o.length=0;for(let e of this.sources)e.enabled!==!1&&(!e.alwaysOn&&s<=.002||(e.update&&e.update(),e.d2=e.position.distanceToSquared(t),o.push(e)));o.sort((e,t)=>e.d2-t.d2);let c=Mo-n,l=o.length>c?Math.sqrt(o[c].d2):1/0;for(let e=0;e<Math.min(c,o.length);e++){let t=o[e],c=Number.isFinite(l)?Ko(Math.sqrt(t.d2),l,l*.8):1,u=t.flicker?1+t.flicker*Math.sin(this.time*9+t.phase)*Math.sin(this.time*5.3+t.phase*.37):1,d=t.intensity*(t.alwaysOn?this.strength:s)*c*u*(t.scale??1);if(d<=1e-4)continue;let f=t.range;r[n].set(t.position.x,t.position.y,t.position.z,f*f),i[n].set(t.color.r*d,t.color.g*d,t.color.b*d,t.cosInner??-1.5),t.dir?a[n].set(t.dir.x,t.dir.y,t.dir.z,t.cosOuter??-2):a[n].set(0,-1,0,-2),n++}}zo.value=n,this.active=n}};function Jo(e,t){let n=t.lines,r=t.group,a=[{p:[-.62,2.57,1.13],color:[1,.92,.74],intensity:260,range:80,kind:`boatHeadlight`,direction:[0,-.16,1],cosInner:.975,cosOuter:.87},{p:[.62,2.57,1.13],color:[1,.92,.74],intensity:260,range:80,kind:`boatHeadlight`,direction:[0,-.16,1],cosInner:.975,cosOuter:.87},{p:[0,2.24,.42],color:[1,.84,.62],intensity:.9,range:5.5,kind:`boatDome`},{p:[-.45,1.5,1.12],color:[.45,.75,1],intensity:.12,range:2.2,kind:`boatInstruments`},{p:[.47,3.45,-.47],color:[1,.06,.03],intensity:1.4,range:8,kind:`boatNav`,side:[1,0,0]},{p:[-.47,3.45,-.47],color:[.05,1,.3],intensity:1.4,range:8,kind:`boatNav`,side:[-1,0,0]},{p:[0,3.97,-.5],color:[1,.95,.85],intensity:1.2,range:8,kind:`boatNav`},{p:[0,n.sheerY(0)+.1,n.zAft-.05],color:[1,.95,.85],intensity:.8,range:7,kind:`boatNav`}],s=[];for(let t of a){let n=new i(...t.p),a=t.direction||t.side?new i(...t.direction||t.side).normalize():null,c={position:new i,color:new o(...t.color),intensity:t.intensity,range:t.range,kind:t.kind,dir:a?new i:null,cosInner:t.cosInner??(a?.25:void 0),cosOuter:t.cosOuter??(a?-.2:void 0),update(){r.updateWorldMatrix(!0,!1),this.position.copy(n).applyMatrix4(r.matrixWorld),a&&this.dir.copy(a).transformDirection(r.matrixWorld)}};c.update(),s.push(e.add(c))}return s}function Yo(e,t){let n={lantern:1.5,pathLight:1,window:.8},r={lantern:11,pathLight:7,window:6};for(let i of t.getLightSources()){let a=i.kind||`lantern`,o={position:i.position,color:i.color,intensity:i.intensity*(n[a]??1.2),range:r[a]??12,kind:a};if(a===`window`){let e=null,n=1/0;for(let r of t.buildings||[]){let t=(r.x-i.position.x)**2+(r.z-i.position.z)**2;t<n&&(n=t,e=r)}let r=e?Ho.set(i.position.x-e.x,0,i.position.z-e.z):Ho.set(0,0,1);r.lengthSq()<1e-6&&r.set(0,0,1),r.normalize(),o.position=i.position.clone().addScaledVector(r,.35),o.dir=r.clone(),o.cosInner=.35,o.cosOuter=-.15}else o.flicker=.08;e.add(o)}}var Xo=1.333,Zo=.35,Qo=Zo,$o=16,es=new M({name:`underwater-flash`,deps:[Vo],code:`
fn uwFlashOn() -> f32 { return localLights.flashOn; }
fn uwFlashPos() -> vec3f { return localLights.flashPos; }
fn uwFlashDir() -> vec3f { return localLights.flashDir; }
fn uwFlashCol() -> vec3f { return localLights.flashCol; }
fn uwFlashCone() -> vec2f { return localLights.flashCone; }
`}),ts=e=>{let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},ns=class{constructor({depthTexture:e,maskTexture:t,query:n,caustics:r,fft:a}){this.depthTexture=e,this.maskTexture=t,this.query=n,this.caustics=r,this.fft=a,this.mediumTexture=null,this.uniforms=new d(`UnderwaterParams`,{camWorld:[`mat4x4f`,new p],camPos:[`vec3f`,new i],lensDistance:[`f32`,.1],proj:[`vec4f`,new h(1,1,.1,1e3)],shafts:[`f32`,1],band:[`f32`,9],enabled:[`f32`,1],torchBeam:[`f32`,3],hasShafts:[`f32`,0]},{label:`underwater`});let o=this.uniforms.fields;this.lensDistance=o.lensDistance,this.shafts=o.shafts,this.band=o.band,this.enabled=o.enabled,this.torchBeam=o.torchBeam,this.camPos=o.camPos,this.camWorld=o.camWorld,this.proj=o.proj,this._module=null,this.shaftTarget=new j(1,1,{colors:[`rgba16float`],label:`uwShafts`}),this._shaftPass=null}setSize(e,t){this.shaftTarget.setSize(Math.max(1,Math.ceil(e/2)),Math.max(1,Math.ceil(t/2)))}get shaftPass(){return this._shaftPass||=new P({label:`underwater shafts`,colorFormats:[`rgba16float`],modules:[this.module],code:this._shaftCode()}),this._shaftPass}renderShafts(e){this.uniforms.fields.hasShafts.value=+!!e,e&&this.shaftPass.render({colorViews:[this.shaftTarget.texture],clear:[0,0,0,0]})}updateCamera(e){e.updateMatrixWorld(),this.camPos.value.setFromMatrixPosition(e.matrixWorld),this.camWorld.value.copy(e.matrixWorld);let t=e.projectionMatrix.elements;this.proj.value.set(t[0],t[5],e.near,e.far),this.lensDistance.value=e.near}get module(){return this._module||=new M({name:`underwater`,deps:[N,this.query&&this.query.module,this.caustics&&this.caustics.module,es],uniforms:this.uniforms,uniformName:`underwaterParams`,bindings:{underwaterDepth:{texture:()=>this.depthTexture},underwaterMask:{texture:()=>this.maskTexture}},code:this._code()}),this._module}get compositeModule(){return this._compositeModule||=new M({name:`underwater-composite`,deps:[this.module],bindings:{underwaterMediumTex:{texture:()=>this.mediumTexture},underwaterShaftTex:{texture:()=>this.shaftTarget.texture}},code:this._compositeCode()}),this._compositeModule}_code(){return`
const UW_STRADDLE: f32 = ${ts(Qo)};
const UW_BAND: i32 = ${$o};
const UW_IOR: f32 = ${ts(Xo)};

// reversed-Z depth -> view Z (negative)
fn underwaterViewZ( d: f32 ) -> f32 {
	let n = underwaterParams.proj.z; let f = underwaterParams.proj.w;
	return n * f / ( ( n - f ) * d - n );
}

// view-space ray for screen uv (unnormalized, z = -1)
fn underwaterViewRay( uv: vec2f ) -> vec3f {
	let ndc = vec2f( uv.x * 2.0 - 1.0, ( 1.0 - uv.y ) * 2.0 - 1.0 );
	return vec3f( ndc.x / underwaterParams.proj.x, ndc.y / underwaterParams.proj.y, -1.0 );
}

fn underwaterWorldDir( uv: vec2f ) -> vec3f {
	return normalize( ( underwaterParams.camWorld * vec4f( underwaterViewRay( uv ), 0.0 ) ).xyz );
}

fn _uwDepthAt( uv: vec2f ) -> f32 {
	let size = vec2f( textureDimensions( underwaterDepth ) );
	return textureLoad( underwaterDepth, vec2i( clamp( uv, vec2f( 0.0 ), vec2f( 0.9999 ) ) * size ), 0 );
}

// Medium at the near clip plane for each pixel (1: water, 0: air).
//  - a water surface in view: the side it is seen from (written by the water material) is the
//    medium between the lens and the surface
//  - no surface in view: the ray never crosses the surface beyond the lens, so it is in the medium
//    of its far end: an object hit below the surface is in water; the sky is air (a downward ray
//    that reaches nothing is in water)
// The waterline on the lens is then exactly where the rendered surface crosses the near plane:
// the surface fragments on one side end right there, and the far ends on the other side agree.
// Farther than STRADDLE from the surface the near plane can't reach it: the camera's medium.
fn underwaterMedium( uv: vec2f ) -> f32 {
	let size = vec2f( textureDimensions( underwaterMask ) );
	let px = vec2i( clamp( uv, vec2f( 0.0 ), vec2f( 0.9999 ) ) * size );
	let m = textureLoad( underwaterMask, px, 0 );
	let camH = underwaterParams.camPos.y - waterQueryCameraState().x;
	var water = select( 0.0, 1.0, camH < 0.0 );
	if ( m.y > 0.5 ) {
		water = m.x;
	} else if ( abs( camH ) < UW_STRADDLE ) {
		let d = _uwDepthAt( uv );
		let ray = underwaterViewRay( uv );
		let dirW = ( underwaterParams.camWorld * vec4f( ray, 0.0 ) ).xyz;
		if ( d < 1e-7 ) {
			water = select( 0.0, 1.0, dirW.y < 0.0 );
		} else {
			let q = underwaterParams.camPos + dirW * ( - underwaterViewZ( d ) );
			water = select( 0.0, 1.0, q.y < waterQueryHeightAtXZ( q.xz ) );
		}
	}
	return water;
}

`}_shaftCode(){return`
fn _uwIgn( px: vec2f ) -> f32 { return fract( fract( dot( px, vec2f( 0.06711056, 0.00583715 ) ) ) * 52.9829189 ); }

fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let pixel = in.pos.xy;
	let d = _uwDepthAt( uv );
	let vz = underwaterViewZ( d );
	let ray = underwaterViewRay( uv );
	let dist = max( min( length( ray * ( - vz ) ), 600.0 ) - underwaterParams.lensDistance * length( ray ), 0.0 );
	let dir = underwaterWorldDir( uv );
	let st = waterQueryCameraState();
	let sigS = frame.waterScattering;
	let sigT = frame.waterAbsorption + sigS;

	let Ls = - refract( - frame.sunDir, vec3f( 0.0, 1.0, 0.0 ), 1.0 / UW_IOR ); // toward the sun, underwater
	let mu = max( Ls.y, 0.15 );
	let cosPh = dot( dir, Ls );
	let g = 0.85;
	let phase = ( 1.0 - g * g ) / ( 4.0 * PI ) / pow( max( 1.0 + g * g - cosPh * 2.0 * g, 1e-4 ), 1.5 ) * 0.75 + 0.25 / ( 4.0 * PI );

	let sunE = frame.sunColor * 0.96;

	var shafts = vec3f( 0.0 );
${this.caustics&&this.caustics.module?`
		{
			let steps = 20;
			let maxD = min( dist, 22.0 );
			let ds = maxD / f32( steps );
			// interleaved gradient noise on the pixel grid, moved every frame (Jimenez 2014) so the
			// temporal resolve integrates the steps instead of freezing a noise pattern on screen
			let fragPx = pixel + f32( frame.frameIndex % 64u ) * 5.588238;
			let jitter = _uwIgn( fragPx );
			// gusts / slicks vary over hundreds of metres: one sample for the whole march
			let detK = causticsDetailK( underwaterParams.camPos.xz + dir.xz * ( maxD * 0.5 ) );
			for ( var i = 0; i < steps; i++ ) {
				let s = ( f32( i ) + jitter ) * ds;
				let p = underwaterParams.camPos + dir * s;
				let z = max( st.x - p.y, 0.01 );
				let caus = causticsSampleShaft( p, z, 1.5, detK );
				let Tl = exp( - sigT * ( s + z / mu ) );
				shafts += ( caus - 1.0 ) * Tl * ds;
			}
			shafts = shafts * sunE * sigS * phase * underwaterParams.shafts * 2.5;
		}`:``}
	// diver's torch: single scattering of the flashlight cone along the view ray (the torch sits
	// beside the eye, so the beam is a shaft slightly off the view axis), extinction on the light
	// and the view legs, same phase function, up to the scene depth
	var torch = vec3f( 0.0 );
	if ( uwFlashOn() > 0.5 ) {
		let tSteps = 8;
		let tMax = min( dist, 25.0 );
		let tds = tMax / f32( tSteps );
		let tPx = pixel + f32( frame.frameIndex % 64u ) * 5.588238 + 17.3;
		let tJit = _uwIgn( tPx );
		let fpos = uwFlashPos(); let fdir = uwFlashDir(); let cone = uwFlashCone();
		for ( var i = 0; i < tSteps; i++ ) {
			let s = ( f32( i ) + tJit ) * tds;
			let v = underwaterParams.camPos + dir * s - fpos;
			let r2 = max( dot( v, v ), 1e-4 );
			let r = sqrt( r2 );
			let Lr = v / r;
			let spot = localLightsSpotProfile( dot( Lr, fdir ), cone.x, cone.y );
			// same lobe as the sun in-scatter (0.75 forward g = 0.85 + 0.25 isotropic), Schlick's form
			let sk = 1.55 * g - 0.55 * g * g * g;
			let sd = 1.0 - dot( dir, - Lr ) * sk;
			let ph = ( 1.0 - sk * sk ) / ( 4.0 * PI ) * 0.75 / ( sd * sd ) + 0.25 / ( 4.0 * PI );
			torch += exp( - sigT * ( r + s ) ) * ( spot * ph / ( r2 + 0.15 ) );
		}
		// x3: the suspended particles scatter more than the clear-water coefficient (the beam reads)
		torch = torch * uwFlashCol() * sigS * tds * underwaterParams.torchBeam;
	}

	return vec4f( max( shafts, vec3f( 0.0 ) ) + torch, dist );
}
`}_compositeCode(){return`
fn _uwMed( pc: vec2i, dy: i32, mSize: vec2i ) -> f32 {
	return textureLoad( underwaterMediumTex, vec2i( pc.x, clamp( pc.y + dy, 0, mSize.y - 1 ) ), 0 ).r;
}

fn _uwLit( m: f32, sigT: vec3f, zc: f32, dirY: f32, dist: f32 ) -> vec3f {
	let a = sigT * zc / m;
	let kk = sigT * ( 1.0 - dirY / m );
	let e0 = exp( - a );
	let e1 = exp( - max( a + kk * dist, vec3f( 0.0 ) ) );
	return select( ( e0 - e1 ) / kk, e0 * dist, abs( kk ) < vec3f( 1e-4 ) );
}

// pixel: fragment coordinate of the composite (screenCoordinate)
fn underwaterComposite( uv: vec2f, pixel: vec2f ) -> vec4f {
	let mSize = vec2i( textureDimensions( underwaterMediumTex ) );
	let pc = clamp( vec2i( uv * vec2f( mSize ) ), vec2i( 0 ), mSize - 1 );
	let here = _uwMed( pc, 0, mSize );
	let under = here > 0.5;

	// distance to the waterline on the lens in pixels, searched vertically (the line runs roughly
	// across the screen: no camera roll, and over the few cm of the lens the surface is a plane)
	var lineDist = 1e4;
	var lineDir = 0.0; // uv.y direction toward the other medium
	let camH = underwaterParams.camPos.y - waterQueryCameraState().x;
	if ( abs( camH ) < UW_STRADDLE ) {
		let flips = abs( _uwMed( pc, -8, mSize ) - here ) + abs( _uwMed( pc, 8, mSize ) - here ) + abs( _uwMed( pc, -UW_BAND, mSize ) - here ) + abs( _uwMed( pc, UW_BAND, mSize ) - here );
		if ( flips > 0.5 ) {
			for ( var i = 1; i < UW_BAND + 1; i++ ) {
				let up = abs( _uwMed( pc, -i, mSize ) - here ) > 0.5;
				let down = abs( _uwMed( pc, i, mSize ) - here ) > 0.5;
				if ( lineDist > 1e3 && ( up || down ) ) {
					lineDist = f32( i ) - 0.5;
					lineDir = select( 1.0, -1.0, up );
				}
			}
		}
	}

	// ---- meniscus band: rounded water edge acting like a cylindrical lens; samples are pushed
	// away from the line on both sides
	let bandW = underwaterParams.band;
	let tBand = clamp( lineDist / bandW, 0.0, 1.0 );
	let bendPx = tBand * sqrt( max( 1.0 - tBand * tBand, 0.0 ) ) * bandW * 0.8;
	let uvB = uv - vec2f( 0.0, lineDir * bendPx / f32( mSize.y ) );
	let base = postSceneSample( uvB );

	var result = base;

	if ( under && underwaterParams.enabled > 0.5 ) {
		// scene distance along this pixel
		let d = _uwDepthAt( uv );
		let vz = underwaterViewZ( d );
		let ray = underwaterViewRay( uv );
		// the water between the eye and the lens is clipped away: the medium starts at the lens
		let dist = max( min( length( ray * ( - vz ) ), 600.0 ) - underwaterParams.lensDistance * length( ray ), 0.0 );
		let dir = underwaterWorldDir( uv );

		let st = waterQueryCameraState();
		let zc = max( st.x - underwaterParams.camPos.y, 0.0 ); // camera depth below the surface
		let sigA = frame.waterAbsorption;
		let sigS = frame.waterScattering;
		let sigT = sigA + sigS;

		let Ls = - refract( - frame.sunDir, vec3f( 0.0, 1.0, 0.0 ), 1.0 / UW_IOR ); // toward the sun, underwater
		let mu = max( Ls.y, 0.15 );
		let cosPh = dot( dir, Ls );
		let g = 0.85;
		let phase = ( 1.0 - g * g ) / ( 4.0 * PI ) / pow( max( 1.0 + g * g - cosPh * 2.0 * g, 1e-4 ), 1.5 ) * 0.75 + 0.25 / ( 4.0 * PI );

		// light arriving at depth z: E0 exp(-sigT z / m); along the ray z(s) = zc - dir.y s, seen through
		// exp(-sigT s). The in-scatter integral is (exp(-a) - exp(-(a + k d))) / k with a = sigT zc / m
		// and k = sigT (1 - dir.y / m): both exponents stay <= 0 while the ray is in the water, so it
		// can't overflow looking up through deep water (exp(-a) (1 - exp(-k d)) / k does, and the
		// Inf / NaN would stick in the TAA history)
		let sunE = frame.sunColor * 0.96;
		let ambE = frame.skyIrradiance * PI * 0.9;

		let bb = sigS * 0.035;
		let msAlb = bb * 1.3 / ( sigA + bb );
		let inSun = sunE * ( sigS * phase + msAlb * sigT * ( 1.0 / PI ) ) * _uwLit( mu, sigT, zc, dir.y, dist );
		let inAmb = ambE * ( sigS * ( 1.0 / ( 4.0 * PI ) ) + msAlb * sigT * ( 1.0 / PI ) ) * _uwLit( 0.8, sigT, zc, dir.y, dist );

		// caustic light shafts and the torch beam: the half resolution march (underwaterShafts), depth-aware
		// upsampled (bilinear weights times the view distance similarity)
		var extra = vec3f( 0.0 );
		if ( underwaterParams.hasShafts > 0.5 ) {
			let ls = vec2i( textureDimensions( underwaterShaftTex ) );
			let pa = uv * vec2f( ls ) - 0.5;
			let q0 = floor( pa );
			let fr = pa - q0;
			var acc = vec3f( 0.0 );
			var wSum = 1e-6;
			for ( var k = 0; k < 4; k++ ) {
				let o = vec2i( k & 1, k >> 1u );
				let sm = textureLoad( underwaterShaftTex, clamp( vec2i( q0 ) + o, vec2i( 0 ), ls - 1 ), 0 );
				let wb = select( 1.0 - fr.x, fr.x, o.x == 1 ) * select( 1.0 - fr.y, fr.y, o.y == 1 );
				let rel = abs( sm.w - dist ) / max( dist, 0.5 );
				let wt = wb / pow2( rel * 10.0 + 1.0 ) + 1e-5;
				acc += sm.rgb * wt;
				wSum += wt;
			}
			extra = acc / wSum;
		}

		let T = exp( - sigT * dist );
		result = base * T + inSun + inAmb + extra;
	}

	// meniscus contact line and bright rim
	let line = smoothstep( 2.0, 0.0, lineDist );
	let rim = smoothstep( bandW, bandW * 0.4, lineDist ) * smoothstep( 0.5, 2.5, lineDist );
	let withLine = result * ( 1.0 - line * 0.55 ) + rim * 0.15 * ( frame.skyIrradiance * 2.5 + frame.sunColor * 0.02 );
	return vec4f( withLine, 1.0 );
}
`}},rs=[60,300,180,240,120,0],is=[0,.5,.25,.75],as=class{constructor(e,t,{samples:n=16,depthIsColor:r=!1}={}){this.depthTexture=e,this.depthIsColor=r,this.camera=t,this.resolutionScale=1,this.useTemporalFiltering=!1,this.uniforms=new d(`GTAOParams`,{proj:[`mat4x4f`,new p],invProj:[`mat4x4f`,new p],resolution:[`vec2f`,new m],radius:[`f32`,.25],thickness:[`f32`,1],distanceExponent:[`f32`,1],distanceFallOff:[`f32`,1],scale:[`f32`,1],temporalDirection:[`f32`,0],temporalOffset:[`f32`,0],resolutionScaleU:[`f32`,0]},{label:`gtao`});let i=this.uniforms.fields;this.radius=i.radius,this.thickness=i.thickness,this.distanceExponent=i.distanceExponent,this.distanceFallOff=i.distanceFallOff,this.scale=i.scale,this.samples={value:n},this.target=new j(1,1,{colors:[`r8unorm`],label:`GTAO.AO`}),this.noiseTexture=os(),this._currentSamples=-1,this._pass=null,this._frame=0,this._jp=new p}get texture(){return this.target.texture}getTextureNode(){return this.target.texture}setSize(e,t){e=Math.round(this.resolutionScale*e),t=Math.round(this.resolutionScale*t),this.uniforms.fields.resolutionScaleU.value=this.resolutionScale,this.uniforms.fields.resolution.value.set(e,t),this.target.setSize(e,t)}_build(){let e=this.samples.value,t=e<30?3:5,n=Math.ceil(e/t);this._pass=new P({label:`GTAO`,colorFormats:[`r8unorm`],bindings:{gtao:{uniform:this.uniforms},gtaoDepth:{texture:()=>this.depthTexture},gtaoNoise:{texture:this.noiseTexture}},code:`
const GTAO_DIRECTIONS: i32 = ${t};
const GTAO_STEPS: i32 = ${n};

// (a colour depth copy may mark texels negative: under the water, no AO wanted; see PostFX)
fn gtaoSampleDepthRaw( uv: vec2f ) -> f32 {
	let s = vec2i( textureDimensions( gtaoDepth ) );
	return textureLoad( gtaoDepth, clamp( vec2i( floor( uv * vec2f( s ) ) ), vec2i( 0 ), s - 1 ), 0 )${this.depthIsColor?`.x`:``};
}
fn gtaoSampleDepth( uv: vec2f ) -> f32 { return abs( gtaoSampleDepthRaw( uv ) ); }
fn gtaoLoad( p: vec2i ) -> f32 {
	let s = vec2i( textureDimensions( gtaoDepth ) );
	return abs( textureLoad( gtaoDepth, clamp( p, vec2i( 0 ), s - 1 ), 0 )${this.depthIsColor?`.x`:``} );
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
		let g = abs( textureGather( ${this.depthIsColor?`0, `:``}gtaoDepth, smpNearestClamp, uvNode ) );
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
`}),this._currentSamples=e}advanceFrame(){let e=this.uniforms.fields;if(this.useTemporalFiltering===!0){let t=this._frame++;e.temporalDirection.value=rs[t%6]/360,e.temporalOffset.value=is[t%4]}else e.temporalDirection.value=0,e.temporalOffset.value=1}render(){this.advanceFrame();let e=this.uniforms.fields;this.samples.value!==this._currentSamples&&this._build();let t=ve.fields,n=t.jitter.value;this._jp.makeTranslation(n.x,n.y,0).multiply(t.proj.value),e.proj.value.copy(this._jp),e.invProj.value.copy(this._jp).invert(),this._pass.render({colorViews:[this.target.texture],clear:[1,1,1,1]})}};function os(e=5){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),n=ss(t),r=n.length,a=new Uint8Array(r*4);for(let e=0;e<r;++e){let t=n[e],o=2*Math.PI*t/r,s=new i(Math.cos(o),Math.sin(o),0).normalize();a[e*4]=(s.x*.5+.5)*255,a[e*4+1]=(s.y*.5+.5)*255,a[e*4+2]=127,a[e*4+3]=255}return new A({label:`GTAO.noise`,width:t,height:t,format:`rgba8unorm`,data:a,sampler:`nearestRepeat`})}function ss(e){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),n=t*t,r=Array(n).fill(0),i=Math.floor(t/2),a=t-1;for(let e=1;e<=n;)i===-1&&a===t?(a=t-2,i=0):(a===t&&(a=0),i<0&&(i=t-1)),r[i*t+a]===0?(r[i*t+a]=e++,a++,i--):(a-=2,i++);return r}var cs=[0,0,0,0],ls=`
fn aaIn( uv: vec2f ) -> vec3f { return textureSampleLevel( aaSrc, smpLinearClamp, uv, 0.0 ).rgb; }
// display-like value for edge detection: exposed, Reinhard on the max channel, square root
fn aaP( c: vec3f ) -> vec3f {
	let e = max( c, vec3f( 0.0 ) ) * aaExposure[ 0 ] * frame.exposure;
	return sqrt( e / ( 1.0 + max( e.r, max( e.g, e.b ) ) ) );
}
fn aaLuma( uv: vec2f ) -> f32 { return dot( aaP( aaIn( uv ) ), vec3f( 0.3, 0.59, 0.11 ) ); }
`,us=class{constructor({src:e,exposure:t}){this.src=e,this.exposure=t,this.edges=new j(1,1,{colors:[`rgba8unorm`],label:`smaaEdges`}),this.weights=new j(1,1,{colors:[`rgba8unorm`],label:`smaaWeights`}),this.area=null,this.search=null,this._passes=null,this._load()}async _load(){let e=async(e,t)=>{let n=await pn(new Uint8Array(await(await fetch(`./textures/smaa/`+e)).arrayBuffer()),`image/png`);return new A({label:t,width:n.width,height:n.height,format:`rgba8unorm`,data:n.data})};try{[this.area,this.search]=await Promise.all([e(`area.png`,`smaaArea`),e(`search.png`,`smaaSearch`)])}catch(e){console.warn(`SMAA textures failed to load`,e)}}_build(){let e={aaSrc:{texture:this.src},aaExposure:{storage:this.exposure,access:`read`}},t=new P({label:`AA none`,colorFormats:[`rgba16float`],bindings:{aaSrc:{texture:this.src}},code:`fn fragment( in: FSIn ) -> vec4f { return textureSampleLevel( aaSrc, smpLinearClamp, in.uv, 0.0 ); }`}),n=new P({label:`FXAA`,colorFormats:[`rgba16float`],bindings:e,code:ls+`
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
`});this._passes={none:t,fxaa:n}}_buildSMAA(){let e=new P({label:`SMAA edges`,colorFormats:[`rgba8unorm`],bindings:{aaSrc:{texture:this.src},aaExposure:{storage:this.exposure,access:`read`}},code:ls+`
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
`}),t=new P({label:`SMAA weights`,colorFormats:[`rgba8unorm`],bindings:{aaEdges:{texture:()=>this.edges.texture},aaArea:{texture:()=>this.area},aaSearch:{texture:()=>this.search}},code:`
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
`}),n=new P({label:`SMAA blend`,colorFormats:[`rgba16float`],bindings:{aaSrc:{texture:this.src},aaWeights:{texture:()=>this.weights.texture}},code:`
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
`});Object.assign(this._passes,{edges:e,weights:t,blend:n}),this._smaa=!0}render(e,t){this._passes||this._build();let n=this._passes;if(e===`smaa`&&this.area&&this.search){this._smaa||this._buildSMAA();let e=typeof this.src==`function`?this.src():this.src;this.edges.setSize(e.width,e.height),this.weights.setSize(e.width,e.height),n.edges.render({colorViews:[this.edges.texture],clear:cs}),n.weights.render({colorViews:[this.weights.texture],clear:cs}),n.blend.render({colorViews:[t],clear:cs})}else e===`fxaa`||e===`smaa`?n.fxaa.render({colorViews:[t],clear:cs}):n.none.render({colorViews:[t],clear:cs})}},ds=[0,0,0,0];function fs(e,t){let n=1,r=0;for(;e>0;)n/=t,r+=e%t*n,e=Math.floor(e/t);return r}var ps=class{static DEBUG_VIEWS=[`Off`,`Locks (green: holding, blue: new)`,`Luma instability (red)`,`Clamped (red) / kept (green)`,`New frame weight`,`Motion (px / frame)`,`Resampling blur (blue)`,`Still pixels kept (yellow)`];constructor(e,t,n,r,i=null,a=null){this.beauty=e,this.depthTexture=t,this.velocityTexture=n,this.waterMaskTexture=i,this.camera=r,this.exposure=a||new k({label:`taauExposure`,count:1,type:`f32`,data:new Float32Array([1])}),this.uniforms=new d(`TAAUParams`,{prevInvViewProj:[`mat4x4f`,new p],jitterOffset:[`vec2f`,new m],cameraNearFar:[`vec2f`,new m(.1,1e3)],depthThreshold:[`f32`,5e-4],edgeDepthDiff:[`f32`,.001],hasWaterMask:[`f32`,+!!i],jitterPhases:[`f32`,8],reset:[`f32`,1],debugView:[`f32`,0],boxStill:[`f32`,3],boxMotion:[`f32`,1],maxAccumulation:[`f32`,2],motionAccumulation:[`f32`,10],blurComp:[`f32`,.5],locks:[`f32`,1],instability:[`f32`,1],lockThreshold:[`f32`,1.05],staticKeep:[`f32`,1]},{label:`taau`}),this.settings=this.uniforms.fields,this.jitterPhaseOverride=4,this.jitterScale=.5,this.jitterMoving=.35,this._camMotion=0,this._camPrev=null,this.debugView=0;let o=this.uniforms.fields;this._jitterOffset=o.jitterOffset,this._jitterIndex=0,this._outW=1;let s=()=>({colors:[{format:`rgba16float`,name:`color`},{format:`rgba16float`,name:`lock`},{format:`rgba8unorm`,name:`lumaHistory`}],label:`taauHistory`});this.history=[new j(1,1,s()),new j(1,1,s())],this._cur=0,this._prevDepth=new A({label:`taauPrevDepth`,width:1,height:1,format:`depth32float`,usage:[`sample`,`copyDst`]}),this._hasPrevInvVP=!1,this._needsRestart=!0,this._build()}get texture(){return this.history[this._cur].textures[0]}get output(){return this.debugView>0&&this._debugTarget?this._debugTarget.texture:this.texture}getTextureNode(){return this.texture}resetHistory(){this._needsRestart=!0,this._hasPrevInvVP=!1,this._nextPrev=null,this._camPrev=null}setSize(e,t){let n=this.history[0].setSize(e,t);this.history[1].setSize(e,t),this._outW=e,n&&(this._needsRestart=!0)}_beautyTexture(){return typeof this.beauty==`function`?this.beauty():this.beauty}jitter(){let e=this._beautyTexture(),t=e&&e.width?this._outW/e.width:1,n=this.jitterPhaseOverride||Math.max(1,Math.ceil(8*t*t));this.uniforms.fields.jitterPhases.value=n;let r=this._jitterIndex%n,i=this.jitterScale*(1+(this.jitterMoving-1)*this._cameraMotion());this.jitterNow=i;let a=(fs(r+1,2)-.5)*i,o=(fs(r+1,3)-.5)*i;return this._jitterOffset.value.set(a,o),[a,o]}_cameraMotion(){let e=this.camera&&this.camera.matrixWorld;if(!e)return 0;let t=e.elements,n=[t[12],t[13],t[14],t[8],t[9],t[10]],r=0;if(this._camPrev){let e=this._camPrev,t=Math.hypot(n[0]-e[0],n[1]-e[1],n[2]-e[2]),i=Math.hypot(n[3]-e[3],n[4]-e[4],n[5]-e[5]);r=Math.min(1,Math.max((t-.002)/.008,(i-5e-4)/.0015)),r=Math.max(0,r)}return this._camPrev=n,this._camMotion=r>this._camMotion?r:this._camMotion+(r-this._camMotion)*.15,this._camMotion}clearViewOffset(){this._jitterIndex=(this._jitterIndex+1)%1024}_build(){let e=()=>this._beautyTexture(),t=t=>({taau:{uniform:this.uniforms},taauBeauty:{texture:e},taauDepth:{texture:()=>this.depthTexture},taauPrevDepth:{texture:()=>this._prevDepth},taauVelocity:{texture:()=>this.velocityTexture},taauMask:{texture:()=>this.waterMaskTexture||this.velocityTexture},taauHistory:{texture:()=>this.history[t].textures[0]},taauLock:{texture:()=>this.history[t].textures[1]},taauLumaHistory:{texture:()=>this.history[t].textures[2]},taauExposure:{storage:this.exposure,access:`read`}}),n=`
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
`,r=[`rgba16float`,`rgba16float`,`rgba8unorm`],i=n.replace(`, DEBUG_FIELD`,``).replace(`DEBUG_OUTPUT
`,``);this._resolve=[0,1].map(e=>new P({label:`TAAU`,bindings:t(e),colorFormats:r,code:i})),this._buildDebug=()=>{let e=n.replace(`DEBUG_FIELD`,`@location( 3 ) debug: vec4f`).replace(`DEBUG_OUTPUT`,`
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
	out.debug = vec4f( v / max( exposure, 1e-4 ), 1.0 );`),i=[...r,`rgba16float`];this._resolveDebug=[0,1].map(n=>new P({label:`TAAU debug`,bindings:t(n),colorFormats:i,code:e})),this._debugTarget=new j(1,1,{colors:[`rgba16float`],label:`taauDebug`})}}render(){let e=ve.fields,n=this.uniforms.fields;n.cameraNearFar.value.set(e.near.value,e.far.value),this._hasPrevInvVP||n.prevInvViewProj.value.copy(e.invViewProj.value),this._hasPrevInvVP=!0;let r=this.depthTexture;(this._prevDepth.width!==r.width||this._prevDepth.height!==r.height)&&(this._prevDepth.resize(r.width,r.height),this._needsRestart=!0),n.reset.value=+!!this._needsRestart,this._needsRestart=!1;let i=1-this._cur;if(this.debugView>0){this._resolveDebug||this._buildDebug();let e=this.history[i];this._debugTarget.setSize(e.textures[0].width,e.textures[0].height),n.debugView.value=this.debugView,this._resolveDebug[this._cur].render({colorViews:[...e.textures,this._debugTarget.texture],clear:ds})}else this._resolve[this._cur].render({colorViews:this.history[i].textures,clear:ds});this._cur=i;let a=this.depthTexture;t.getEncoder().copyTextureToTexture({texture:a.getGPU()},{texture:this._prevDepth.getGPU()},{width:a.width,height:a.height})}endFrame(){this._nextPrev=this._nextPrev||new p,this._nextPrev.copy(ve.fields.invViewProj.value)}advance(){this._nextPrev&&this.uniforms.fields.prevInvViewProj.value.copy(this._nextPrev)}},ms=class{constructor(){this.uniforms=new d(`LensParams`,{wet:[`f32`,0],age:[`f32`,100],seed:[`f32`,0],aspect:[`f32`,16/9]},{label:`lens`});let e=this.uniforms.fields;this.wet=e.wet,this.age=e.age,this.seed=e.seed,this.aspect=e.aspect,this.duration=9,this._wasUnder=!1,this.module=new M({name:`lens`,uniforms:this.uniforms,uniformName:`lensParams`,code:hs})}update(e,t){t?this.wet.value=0:(this._wasUnder&&(this.wet.value=1,this.age.value=0,this.seed.value=Math.random()*97),this.age.value+=e,this.wet.value=Math.max(0,this.wet.value-e/this.duration)),this._wasUnder=t}build(){return this.module}},hs=`
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
`,gs=7,_s=.3,vs=[{a:.72,r:.018,tint:[1,.85,.6],k:.55},{a:.44,r:.045,tint:[.55,.9,1],k:.35},{a:.16,r:.022,tint:[.8,1,.7],k:.45},{a:-.18,r:.07,tint:[.6,.75,1],k:.22},{a:-.42,r:.03,tint:[1,.7,.9],k:.4},{a:-.75,r:.11,tint:[.7,1,.85],k:.14},{a:-1.15,r:.05,tint:[1,.8,.55],k:.28}],ys=24,$=e=>{let t=String(e);return t.includes(`.`)||t.includes(`e`)?t:t+`.0`},bs=class{constructor({depthTexture:e,clouds:t=null,sunDir:n}){this.sunDir=n,this.uniforms=new d(`FlareParams`,{sunDir:[`vec3f`,new i(0,1,0)],strength:[`f32`,1],sunUV:[`vec2f`,new m(.5,.5)],inView:[`f32`,0],aboveWater:[`f32`,1],aspect:[`f32`,16/9],discPx:[`f32`,6],dt:[`f32`,1/60]},{label:`flare`});let r=this.uniforms.fields;this.strength=r.strength,this.sunUV=r.sunUV,this.inView=r.inView,this.aboveWater=r.aboveWater,this.aspect=r.aspect,this.discPx=r.discPx,this.dt=r.dt,this.visibility=new k({label:`flareVisibility`,count:1,type:`f32`,data:new Float32Array([0])}),this.depthTexture=e,this.clouds=t;let a=``;for(let e=0;e<ys;e++){let t=Math.sqrt((e+.5)/ys),n=e*2.39996323;a+=`\tsky += flareSkyTap( c + vec2f( ${$(Math.cos(n)*t)}, ${$(Math.sin(n)*t)} ) * flareParams.discPx, size );\n`}let o=!!(t&&t.module);this.kernel=new Vt({label:`Lens Flare Visibility`,modules:[N,o?t.module:null].filter(Boolean),bindings:{flareParams:{uniform:this.uniforms},flareDepth:{texture:()=>this.depthTexture},flareVisRW:{storage:this.visibility,access:`read_write`}},workgroupSize:[1,1,1],code:`
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
${a}
	let cloudT = ${o?`cloudsSunTransmittance( cloudsSampleView( flareParams.sunDir ).a )`:`1.0`};
	let up = smoothstep( -0.02, 0.04, flareParams.sunDir.y );
	let tgt = sky / ${$(ys)} * cloudT * up * flareParams.inView * flareParams.aboveWater;
	let v = flareVisRW[ 0 ];
	flareVisRW[ 0 ] = mix( v, tgt, 1.0 - exp( flareParams.dt * -14.0 ) );
}
`});let s=``;for(let e of vs)s+=`
	{
		let pd = flarePolyDist( p - s * ${$(e.a)} );
		let body = vec3f( smoothstep( ${$(e.r*.975)}, ${$(e.r*.975*.9)}, pd ), smoothstep( ${$(e.r)}, ${$(e.r*.9)}, pd ), smoothstep( ${$(e.r*1.025)}, ${$(e.r*1.025*.9)}, pd ) );
		let rim = smoothstep( ${$(e.r*.55)}, ${$(e.r)}, pd ) * 0.7 + 0.3;
		// smaller ghosts concentrate the same reflected energy: brighter
		ghosts += body * rim * vec3f( ${e.tint.map($).join(`, `)} ) * ${$(e.k*.0028/(e.r*e.r))};
	}`;this.module=new M({name:`flare`,deps:[N],uniforms:this.uniforms,uniformName:`flareParams`,bindings:{flareVis:{storage:this.visibility,access:`read`}},code:`
const FLARE_SEG: f32 = ${$(2*Math.PI/gs)};

// aperture polygon: distance scaled so the polygon edge sits at the given radius
fn flarePolyDist( d: vec2f ) -> f32 {
	let a = atan2( d.y, d.x ) + ${$(_s)};
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
${s}

	// fade the ghosts as the sun nears the centre (they collapse onto it and vanish)
	let offAxis = smoothstep( 0.02, 0.2, length( s ) );

	// halo: dispersive ring about the image centre
	let rc = length( p );
	let halo = vec3f( smoothstep( 0.03, 0.0, abs( rc - 0.43 ) ), smoothstep( 0.03, 0.0, abs( rc - 0.445 ) ), smoothstep( 0.03, 0.0, abs( rc - 0.46 ) ) ) * smoothstep( 0.25, 0.8, length( s ) ) * 0.12;

	// starburst and veiling glare around the sun (distances in image heights)
	let q = p - s;
	let rq = max( length( q ), 1e-4 );
	let aq = atan2( q.y, q.x ) + ${$(_s)};
	let px = 1.0 / max( frame.outputResolution.y, 1.0 );
	// the nearest spike (two per blade) and this pixel's distance from its line
	let seg = ${$(Math.PI/gs)};
	let k = floor( aq / seg + 0.5 );
	let perp = abs( sin( aq - k * seg ) ) * rq;
	let ki = k - ${$(14)} * floor( k / ${$(14)} ); // same spike across the atan2 seam
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
	let t = ( aq * ${$(1/(2*Math.PI))} + 0.5 ) * 48.0;
	let ti = floor( t );
	let hA = fract( sin( ( ti - 48.0 * floor( ti / 48.0 ) ) * 91.345 ) * 43758.5453 );
	let hB = fract( sin( ( ti + 1.0 - 48.0 * floor( ( ti + 1.0 ) / 48.0 ) ) * 91.345 ) * 43758.5453 );
	let n = mix( hA, hB, smoothstep( 0.0, 1.0, t - ti ) );
	let fine = pow( n, 5.0 ) * exp( - rq / 0.03 ) * 0.3;
	let glow = exp( rq * -5.0 ) * 0.05 + exp( rq * -40.0 ) * 0.4;
	let burst = spikes + vec3f( fine + glow );

	return light * ( ghosts * offAxis + halo + burst );
}
`})}update(e,t,{aboveWater:n=!0}={}){let i=this.uniforms.fields.sunDir.value.copy(this.sunDir.value||this.sunDir);e.updateMatrixWorld();let a=xs.copy(e.position).addScaledVector(i,1e3).project(e),o=Ss.set(0,0,-1).applyQuaternion(e.quaternion).dot(i)>.05;this.sunUV.value.set(a.x*.5+.5,.5-a.y*.5);let s=Math.max(Math.abs(a.x),Math.abs(a.y));this.inView.value=o?r.clamp((1-s)/.1,0,1):0,this.aboveWater.value=+!!n,this.aspect.value=e.aspect,this.dt.value=Math.min(t,.1);let c=this._depthH||1080;this.discPx.value=Math.max(1.5,.004625/Math.tan(r.degToRad(e.fov)*.5)*c*.5)}setDepthHeight(e){this._depthH=e}},xs=new i,Ss=new i,Cs=20,ws=10,Ts=400,Es=224,Ds=`
const MB_TILE: f32 = ${Cs}.0;
const MB_MAX_TILES_X: i32 = ${Ts};

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
`,Os=class{constructor({velocityTexture:e,depthTexture:t,color:n}){this.uniforms=new d(`MotionBlurParams`,{skyReproj:[`mat4x4f`,new p],outSize:[`vec2f`,new m(1,1)],tileCount:[`vec2f`,new m(1,1)],shutter:[`f32`,0],frameIndex:[`f32`,0]},{label:`motionBlur`});let r=this.uniforms.fields;this.shutter=r.shutter,this.outSize=r.outSize,this.tileCount=r.tileCount,this.frameIndex=r.frameIndex,this.skyReproj=r.skyReproj,this._vp=new p,this._prevVP=new p,this._hasPrev=!1,this.color=n,this.velocityTexture=e,this.depthTexture=t,this.tileMax=new k({label:`mbTileMax`,count:Ts*Es,type:`vec4f`}),this.neighborMax=new k({label:`mbNeighborMax`,count:Ts*Es,type:`vec4f`}),this._frame=0,this._buildKernels();let i=()=>typeof this.color==`function`?this.color():this.color;this.module=new M({name:`motionBlur`,deps:[N],uniforms:this.uniforms,uniformName:`mbParams`,bindings:{mbVelocity:{texture:()=>this.velocityTexture},mbDepth:{texture:()=>this.depthTexture},mbColor:{texture:i},mbNeighbor:{storage:this.neighborMax,access:`read`}},code:Ds+`
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
`})}_buildKernels(){let e=``;for(let t=64;t>0;t>>=1)e+=`
	if ( t < ${t}u && t + ${t}u < 100u ) {
		let a = mbShared[ t ];
		let b = mbShared[ t + ${t}u ];
		let m = select( a, b, b.z > a.z );
		mbShared[ t ] = vec4f( m.xyz, min( a.w, b.w ) );
	}
	workgroupBarrier();`;let t={mbParams:{uniform:this.uniforms}};this.tileKernel=new Vt({label:`Motion Blur Tiles`,modules:[N],bindings:{...t,mbVelocity:{texture:()=>this.velocityTexture},mbDepth:{texture:()=>this.depthTexture},mbTileMaxRW:{storage:this.tileMax,access:`read_write`}},workgroupSize:[ws,ws,1],code:Ds+`
var<workgroup> mbShared: array<vec4f, 100>;
@compute @workgroup_size( WG_X, WG_Y, 1 )
fn main( @builtin( local_invocation_id ) lid: vec3u, @builtin( workgroup_id ) wid: vec3u ) {
	let t = lid.y * ${ws}u + lid.x;
	let inSize = vec2i( textureDimensions( mbVelocity ) );
	var best = vec2f( 0.0 ); var bestL = 0.0; var minL = 1e8;
	for ( var k = 0; k < 4; k++ ) {
		let o = vec2u( u32( k & 1 ), u32( k >> 1u ) );
		let p = vec2f( wid.xy * ${Cs}u + lid.xy * 2u + o ) + 0.5;
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
${e}
	if ( t == 0u ) {
		let r = mbShared[ 0 ];
		let idx = i32( wid.y ) * MB_MAX_TILES_X + i32( wid.x );
		// xy = longest half streak (px), z = its length, w = shortest length in the tile
		mbTileMaxRW[ idx ] = vec4f( r.xy, sqrt( r.z ), sqrt( r.w ) );
	}
}
`});let n=``;for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let r=`m.z > best.z`;if(t!==0&&e!==0){let n=[-t*Math.SQRT1_2,-e*Math.SQRT1_2];r+=` && abs( dot( m.xy, vec2f( ${n[0]}, ${n[1]} ) ) ) > m.z * 0.7`}n+=`
		{
			let x = clamp( tx + ${t}, 0, nx - 1 ); let y = clamp( ty + ${e}, 0, ny - 1 );
			let m = mbTileMaxR[ y * MB_MAX_TILES_X + x ];
			if ( ${r} ) { best = m; }
			minL = min( minL, m.w );
		}`}this.neighborKernel=new Vt({label:`Motion Blur Neighbourhood`,modules:[N],bindings:{...t,mbTileMaxR:{storage:this.tileMax,access:`read`},mbNeighborRW:{storage:this.neighborMax,access:`read_write`}},workgroupSize:[8,8,1],code:`
const MB_MAX_TILES_X: i32 = ${Ts};
@compute @workgroup_size( WG_X, WG_Y, 1 )
fn main( @builtin( global_invocation_id ) gid: vec3u ) {
	let tx = i32( gid.x ); let ty = i32( gid.y );
	let nx = i32( mbParams.tileCount.x ); let ny = i32( mbParams.tileCount.y );
	if ( tx < nx && ty < ny ) {
		var best = vec4f( 0.0 ); var minL = 1e8;
${n}
		// xy = dominant half streak (px), z = its length, w = shortest streak in the neighbourhood
		mbNeighborRW[ ty * MB_MAX_TILES_X + tx ] = vec4f( best.xyz, minL );
	}
}
`})}updateCamera(e){e.updateMatrixWorld(),e.matrixWorldInverse&&e.matrixWorldInverse.copy(e.matrixWorld).invert(),this._vp.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._hasPrev||this._prevVP.copy(this._vp),this._hasPrev=!0,this.skyReproj.value.copy(this._vp).invert().premultiply(this._prevVP),this._prevVP.copy(this._vp)}compute(e,t){if(this.shutter.value<=0)return;let n=Math.min(Ts,Math.ceil(e/Cs)),r=Math.min(Es,Math.ceil(t/Cs));this.outSize.value.set(e,t),this.tileCount.value.set(n,r),this._frame=(this._frame+1)%64,this.frameIndex.value=this._frame,this.tileKernel.dispatch([n,r,1]),this.neighborKernel.dispatch([Math.ceil(n/8),Math.ceil(r/8),1])}},ks=[0,0,0,0],As=`
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
`,js=class{constructor(e,{sceneRenderer:n,camera:r,underwater:a,clouds:o=null,sunDir:s=null,haze:c=null}){this.renderer=e,this.camera=r,this.sceneRenderer=n,this.underwater=a,this.scale=1,this.optimizeDisabledEffects=!0,this.outputTexture=null,this.outputSize=null,this.outputFormat=t.context?t.format:`rgba8unorm`,this.uniforms=new d(`PostParams`,{optimizeDisabledEffects:[`f32`,0],aoStrength:[`f32`,1],bloom:[`f32`,.05],vignette:[`f32`,.28],saturation:[`f32`,1.06],contrast:[`f32`,1.04],warmth:[`f32`,.02],grain:[`f32`,.012],sharpen:[`f32`,.45]},{label:`post`}),this.params=this.uniforms.fields,this.aeUniforms=new d(`AutoExposureParams`,{enabled:[`f32`,1],refLum:[`f32`,.25],min:[`f32`,.6],max:[`f32`,6],up:[`f32`,1.6],down:[`f32`,1.1]},{label:`autoExposure`}),this.autoExposure={...this.aeUniforms.fields,ref:this.aeUniforms.fields.refLum},this.exposure=new k({label:`autoExposure`,count:1,type:`f32`,data:new Float32Array([1])});let l=n.sceneRT,u=n.opaqueCopy;this.sceneColor=l.texture,this.opaqueDepth=u.depthTexture,this.finalDepth=l.depthTexture,this.aoDepth=new j(1,1,{colors:[`r16float`],label:`aoDepth`}),this._aoDepthPass=new P({label:`AO depth`,colorFormats:[`r16float`],bindings:{aoFullDepth:{texture:()=>this.opaqueDepth},aoFinalDepth:{texture:()=>this.finalDepth}},code:`
// negative where the water covers the opaque surface: its AO is never shown (the beauty pass skips
// covered pixels), so GTAO leaves those texels alone; everything else reads the magnitude
fn fragment( in: FSIn ) -> vec4f {
	let s = vec2i( textureDimensions( aoFullDepth ) );
	let p = min( vec2i( in.pos.xy ) * 2, s - 1 );
	let d = textureLoad( aoFullDepth, p, 0 );
	let covered = textureLoad( aoFinalDepth, p, 0 ) > d + 1e-7;
	return vec4f( select( d, - d, covered ), 0.0, 0.0, 1.0 );
}
`}),this.aoPass=new as(this.aoDepth.texture,r,{samples:12,depthIsColor:!0}),this.aoPass.resolutionScale=.5,this.aoPass.radius.value=2.2,this.aoPass.thickness.value=2,this.aoPass.distanceExponent.value=1.4,this.aoPass.scale.value=1.6,this.aoPass.samples.value=12,this.aoPass.useTemporalFiltering=!0,this.aoBlurX=new j(1,1,{colors:[`r16float`],label:`aoBlurX`}),this.aoBlurY=new j(1,1,{colors:[`r16float`],label:`aoBlurY`});let f=(e,t,n)=>{let r=``;for(let e=-2;e<=2;e++)r+=`
	{
		let uvK = in.uv + vec2f( ${t*e}.0, ${n*e}.0 ) / size;
		let rel = abs( postDepthOpaque( uvK ) - dC ) / max( dC, 1e-7 );
		let w = 1.0 / pow2( rel * 40.0 + 1.0 );
		sum += textureSampleLevel( aoSrc, smpLinearClamp, uvK, 0.0 ).r * w;
		wSum += w;
	}`;return new P({label:`AO blur `+(t?`x`:`y`),colorFormats:[`r16float`],bindings:{aoSrc:{texture:e},postAODepth:{texture:()=>this.aoDepth.texture}},code:`
fn postDepthOpaque( uv: vec2f ) -> f32 {
	let s = vec2i( textureDimensions( postAODepth ) );
	return abs( textureLoad( postAODepth, clamp( vec2i( floor( uv * vec2f( s ) ) ), vec2i( 0 ), s - 1 ), 0 ).r );
}
fn fragment( in: FSIn ) -> vec4f {
	let size = vec2f( textureDimensions( aoSrc ) );
	let dC = postDepthOpaque( in.uv );
	var sum = 0.0; var wSum = 0.0;
${r}
	return vec4f( sum / wSum, 0.0, 0.0, 1.0 );
}
`})};this._aoBlurXPass=f(()=>this.aoPass.texture,1,0),this._aoBlurYPass=f(()=>this.aoBlurX.texture,0,1),this.medium=new j(1,1,{colors:[`r8unorm`],label:`medium`}),a.mediumTexture=this.medium.texture,this.haze=c,c&&(c.mediumTexture=this.medium.texture),this.beauty=new j(1,1,{colors:[`rgba16float`],label:`beauty`}),this.smaaIn=new j(1,1,{colors:[`rgba16float`],label:`smaaBeforeTAA`}),this.taau=new ps(()=>this.aaMode===`smaataa`?this.smaaIn.texture:this.beauty.texture,this.finalDepth,n.velocityTexture,r,n.waterMaskTexture,this.exposure),this.aaMode=`taa`,this.aa=new us({src:()=>this.beauty.texture,exposure:this.exposure}),this.motionBlur=new Os({velocityTexture:n.velocityTexture,depthTexture:l.depthTexture,color:()=>this.taau.output}),this.flare=s?new bs({depthTexture:l.depthTexture,clouds:o,sunDir:s}):null,this.lens=new ms,this._outW=0,this._outH=0,this._inW=0,this._inH=0,this._prevVP=new p,this._prevCamPos=new i,this._hasPrev=!1,this._size=new m,this._built=!1,this.profiler=null}_build(){this._built=!0;let e=this.underwater,t=this.haze;if(this._mediumPass=new P({label:`medium`,colorFormats:[`r8unorm`],modules:[e.module],code:`fn fragment( in: FSIn ) -> vec4f { return vec4f( underwaterMedium( in.uv ), 0.0, 0.0, 1.0 ); }`}),this._beautyPass=new P({label:`beauty (AO + haze + underwater)`,colorFormats:[`rgba16float`],modules:[e.compositeModule,t?t.compositeModule:null].filter(Boolean),defines:t?t._defines():{},bindings:{post:{uniform:this.uniforms},postScene:{texture:()=>this.sceneColor},postOpaqueDepth:{texture:()=>this.opaqueDepth},postFinalDepth:{texture:()=>this.finalDepth},postAO:{texture:()=>this.aoBlurY.texture},postAODepth:{texture:()=>this.aoDepth.texture}},code:`
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
	${t?`return hazeApply( uv, vec4f( postColorAO( uv ), 1.0 ) ).rgb;`:`return postColorAO( uv );`}
}

fn fragment( in: FSIn ) -> vec4f {
	return underwaterComposite( in.uv, in.pos.xy );
}
`}),this.aoPass._pass||this.aoPass._build(),t&&!t._passes&&t._build(),e.renderShafts&&e.shaftPass,this._buildBloom(),this._buildMeter(),this._buildFinal(),this.profiler)for(let[e,t]of this.passes())this.profiler.track(`post `+e,t)}_buildBloom(){let e=e=>new j(1,1,{colors:[`rgba16float`],label:e});this.bloomScales=[.5,.25,.125,.0625,.03125],this.bloomDown=this.bloomScales.map((t,n)=>e(`bloomDown`+(n+1))),this.bloomUp=this.bloomScales.slice(0,4).map((t,n)=>e(`bloomUp`+(n+1)));let t=(e,t)=>new P({label:`bloom down`,colorFormats:[`rgba16float`],bindings:{bSrc:{texture:e}},code:`
fn bTap( uv: vec2f, texel: vec2f, x: f32, y: f32 ) -> vec3f { return textureSampleLevel( bSrc, smpLinearClamp, uv + texel * vec2f( x, y ), 0.0 ).rgb; }
fn karis( c: vec3f ) -> vec3f { return c / ( luminance( c ) + 1.0 ); }

fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let texel = 1.0 / vec2f( textureDimensions( bSrc ) );
	let a = bTap( uv, texel, -2.0, -2.0 ); let b = bTap( uv, texel, 0.0, -2.0 ); let c = bTap( uv, texel, 2.0, -2.0 );
	let d = bTap( uv, texel, -2.0, 0.0 ); let e = bTap( uv, texel, 0.0, 0.0 ); let f = bTap( uv, texel, 2.0, 0.0 );
	let g = bTap( uv, texel, -2.0, 2.0 ); let h = bTap( uv, texel, 0.0, 2.0 ); let i = bTap( uv, texel, 2.0, 2.0 );
	let j = bTap( uv, texel, -1.0, -1.0 ); let k = bTap( uv, texel, 1.0, -1.0 ); let l = bTap( uv, texel, -1.0, 1.0 ); let m = bTap( uv, texel, 1.0, 1.0 );
${t?`
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
`}),n=(e,t)=>new P({label:`bloom up`,colorFormats:[`rgba16float`],bindings:{bSrc:{texture:e},bBase:{texture:t}},code:`
fn bTap( uv: vec2f, texel: vec2f, x: f32, y: f32 ) -> vec3f { return textureSampleLevel( bSrc, smpLinearClamp, uv + texel * vec2f( x, y ), 0.0 ).rgb; }
fn karis( c: vec3f ) -> vec3f { return c / ( luminance( c ) + 1.0 ); }

fn fragment( in: FSIn ) -> vec4f {
	let uv = in.uv;
	let texel = 1.0 / vec2f( textureDimensions( bSrc ) );
	let s = ( bTap( uv, texel, 0.0, 0.0 ) * 4.0
		+ ( bTap( uv, texel, -1.0, 0.0 ) + bTap( uv, texel, 1.0, 0.0 ) + bTap( uv, texel, 0.0, -1.0 ) + bTap( uv, texel, 0.0, 1.0 ) ) * 2.0
		+ ( bTap( uv, texel, -1.0, -1.0 ) + bTap( uv, texel, 1.0, -1.0 ) + bTap( uv, texel, -1.0, 1.0 ) + bTap( uv, texel, 1.0, 1.0 ) ) ) / 16.0;
	return vec4f( textureSampleLevel( bBase, smpLinearClamp, uv, 0.0 ).rgb + s, 1.0 );
}
`}),r=this.bloomDown,i=this.bloomUp;this._bloomPasses=[[t(()=>this.taau.texture,!0),r[0]],[t(()=>r[0].texture,!1),r[1]],[t(()=>r[1].texture,!1),r[2]],[t(()=>r[2].texture,!1),r[3]],[t(()=>r[3].texture,!1),r[4]],[n(()=>r[4].texture,()=>r[3].texture),i[3]],[n(()=>i[3].texture,()=>r[2].texture),i[2]],[n(()=>i[2].texture,()=>r[1].texture),i[1]],[n(()=>i[1].texture,()=>r[0].texture),i[0]]],this.bloomTex=i[0],this.half=r[0],this.meterRT=r[3]}_buildMeter(){let e=``;for(let t=128;t>0;t>>=1)e+=`
	if ( t < ${t}u ) {
		sumL[ t ] += sumL[ t + ${t}u ];
		sumW[ t ] += sumW[ t + ${t}u ];
	}
	workgroupBarrier();`;this.meterKernel=new Vt({label:`Auto Exposure`,modules:[N],bindings:{ae:{uniform:this.aeUniforms},aeTex:{texture:()=>this.meterRT.texture},aeExposure:{storage:this.exposure,access:`read_write`}},workgroupSize:[256,1,1],code:`
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
${e}
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
`})}_buildFinal(){let e=[N,this.motionBlur.module,this.lens.module];this.flare&&e.push(this.flare.module),this._finalPass=new P({label:`final (grade + tonemap)`,colorFormats:[this.outputFormat],modules:e,bindings:{post:{uniform:this.uniforms},postResolved:{texture:()=>this.taau.output},postBloom:{texture:()=>this.bloomTex.texture},postHalf:{texture:()=>this.half.texture},postExposure:{storage:this.exposure,access:`read`}},code:As+`
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
	let lobe = max( -0.1875, min( max( lobeRGB.r, max( lobeRGB.g, lobeRGB.b ) ), 0.0 ) ) * post.sharpen * skyK;
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
${this.flare?`	c += flareLight( uv );`:``}
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
`})}_outputSize(){if(this.outputSize)return this.outputSize;let e=this.renderer;return e&&e.width?{width:e.width,height:e.height}:t.canvas?{width:t.canvas.width,height:t.canvas.height}:{width:1,height:1}}_resize(){let{width:e,height:t}=this._outputSize(),n=Math.max(1,Math.round(e*this.scale)),r=Math.max(1,Math.round(t*this.scale));if(e===this._outW&&t===this._outH&&n===this._inW&&r===this._inH)return;this._outW=e,this._outH=t,this._inW=n,this._inH=r,this.sceneRenderer.setSize(n,r),this.beauty.setSize(n,r),this.smaaIn.setSize(n,r),this.medium.setSize(n,r),this.underwater.setSize&&this.underwater.setSize(n,r),this.aoPass.resolutionScale=.5*this.scale,this.aoPass.setSize(e,t);let i=Math.round(e*.5*this.scale),a=Math.round(t*.5*this.scale);this.aoDepth.setSize(i,a),this.aoBlurX.setSize(i,a),this.aoBlurY.setSize(i,a),this.haze&&this.haze.setSize(e,t),this.taau.setSize(e,t),this.bloomDown&&(this.bloomScales.forEach((n,r)=>this.bloomDown[r].setSize(Math.round(e*n),Math.round(t*n))),this.bloomScales.slice(0,4).forEach((n,r)=>this.bloomUp[r].setSize(Math.round(e*n),Math.round(t*n)))),this.flare&&this.flare.setDepthHeight(r),this.lens.aspect.value=e/t}setScale(e){e!==this.scale&&(this.scale=e,this.sceneRenderer.scale=e,this.haze&&this.haze.setScale(e))}setBloom(e){this.params.bloom.value=e}internalSize(e=new m){return e.set(this._inW,this._inH)}beginFrame(){this._built||(this._build(),this._outW=0),this._resize();let e=this.camera;e.updateMatrixWorld(),e.matrixWorldInverse&&e.matrixWorldInverse.copy(e.matrixWorld).invert(),this.motionBlur.updateCamera(e),this.taau.advance();let[t,n]=this.aaMode===`taa`||this.aaMode===`smaataa`?this.taau.jitter():[0,0];ue(e,this._inW,this._inH,{jitterX:-t,jitterY:n,prevViewProj:this._hasPrev?this._prevVP:null,prevCameraPos:this._hasPrev?this._prevCamPos:null});let r=ve.fields;r.outputResolution.value.set(this._outW,this._outH),this._prevVP.copy(r.viewProjNoJitter.value),this._prevCamPos.copy(r.cameraPos.value),this._hasPrev=!0}render(){this._built||this.beginFrame(),this._timers;let e=this.optimizeDisabledEffects;if(this.params.optimizeDisabledEffects.value=+!!e,this.motionBlur.compute(this._outW,this._outH),!e||this.params.aoStrength.value!==0?(this._aoDepthPass.render({colorViews:[this.aoDepth.texture],clear:ks}),this.aoPass.render(),this._aoBlurXPass.render({colorViews:[this.aoBlurX.texture],clear:ks}),this._aoBlurYPass.render({colorViews:[this.aoBlurY.texture],clear:ks})):this.aoPass.advanceFrame(),this._mediumPass.render({colorViews:[this.medium.texture],clear:ks}),this.underwater.renderShafts&&this.underwater.renderShafts(this.camera.position.y<he.cameraWaterHeight.value+Zo+1),this.haze&&(this.haze.update(),this.haze.render(e)),this._beautyPass.render({colorViews:[this.beauty.texture],clear:ks}),this.aaMode===`taa`||this.aaMode===`smaataa`)this.aaMode===`smaataa`&&this.aa.render(`smaa`,this.smaaIn.texture),this.taau.render();else{let e=this.taau,t=1-e._cur;this.aa.render(this.aaMode,e.history[t].textures[0]),e._cur=t,e._needsRestart=!0}let n=e&&this.params.bloom.value===0?4:this._bloomPasses.length;for(let e=0;e<n;e++){let[t,n]=this._bloomPasses[e];t.render({colorViews:[n.texture],clear:ks})}let r=this.outputTexture?this.outputTexture.view({dimension:`2d`,mipLevelCount:1}):t.context.getCurrentTexture().createView();this._finalPass.render({colorViews:[r],clear:ks}),this.meterKernel.dispatch([1,1,1])}endFrame(){this.taau.clearViewOffset(),this.taau.endFrame()}passes(){let e=[[`motion blur tiles`,this.motionBlur.tileKernel],[`motion blur neighbours`,this.motionBlur.neighborKernel],[`GTAO`,this.aoPass._pass],[`AO blur x`,this._aoBlurXPass],[`AO blur y`,this._aoBlurYPass],[`medium`,this._mediumPass]];return this.haze&&this.haze._passes&&(e.push([`haze march`,this.haze._passes.march],[`haze sun mask`,this.haze._passes.mask]),this.haze._passes.blur.forEach((t,n)=>e.push([`haze god rays `+n,t]))),this.underwater._shaftPass&&e.push([`underwater shafts`,this.underwater._shaftPass]),e.push([`beauty`,this._beautyPass],[`TAAU`,this.taau._resolve[0]],[`TAAU `,this.taau._resolve[1]]),this._bloomPasses.forEach(([t],n)=>e.push([`bloom `+n,t])),e.push([`final`,this._finalPass],[`auto exposure`,this.meterKernel]),this.flare&&e.push([`flare visibility`,this.flare.kernel]),e}},Ms={x:K.helmX,z:K.seatZ},Ns=1.62,Ps=Ns*.1,Fs=.3,Is=1.75,Ls=1.35,Rs=1.1,zs=new i,Bs=new i,Vs=new i,Hs=new i,Us=new n,Ws=new a(0,0,0,`YXZ`),Gs=new i(0,1,0),Ks=new n,qs=new n,Js=new n,Ys=new i,Xs=new i,Zs=new i,Qs=new n,$s=new i,ec=.24,tc=.36,nc=.75,rc=class{constructor({camera:e,input:t,terrain:n,colliders:r,query:a,boat:o,reef:s=null,audio:c=null,spray:l=null,cave:u=null,transit:d=null}){this.camera=e,this.input=t,this.terrain=n,this.colliders=r,this.query=a,this.boat=o,this.reef=s,this.cave=u,this.transit=d,this.audio=c,this.spray=l,this.mode=`walk`,this.camMode=`third`;let f=lr.start||lr.spawn;this.position=new i().copy(f.position),this.position.y=Math.max(n.heightAt(this.position.x,this.position.z),r?r.groundHeightAt(this.position.x,this.position.z,50):-1/0),this.velocity=new i,this.yaw=f.yaw,this.pitch=-.05,this.grounded=!1,this.bob=0,this.stepDist=0,this.waterH=0,this.waterMean=null,this.wade=0,this.camOff=0,this.camOffV=0,this._camY=null,this.floating=!0,this.slot=a.allocate(`player`,1),this.prompt=null,this.surface=`sand`,this.orbitYaw=0,this.orbitPitch=.22,this.orbitDist=13,this.helmYaw=0,this.helmPitch=-.05,this.camPos=new i,this.camInit=!1,this.wasUnder=!1,this.deckPos=new i,this.deckVel=new i,this.deckYaw=0,this.deckGrounded=!0,this._ashore=null,this._ashoreT=0,this.busy=!1}getViewDir(e){return e.set(0,0,-1).applyQuaternion(this.camera.quaternion)}waterHeight(){let e=this.query;if(!e.cpuValid)return 0;let t=e.cpu[this.slot*4];return Number.isFinite(t)?t:this.waterH||0}groundAt(e,t,n){let r=this.transit?this.transit.floorAt(e,t,n):null,i=this.cave?this.cave.groundHeightAt(e,t,n):null,a=r===null?i===null?this.terrain.heightAt(e,t):i:r,o=this.colliders.groundHeightAt(e,t,n);return o>a&&(a=o),r===null&&i===null&&this.reef&&this.reef.floorHeightAt&&(a=Math.max(a,this.reef.floorHeightAt(e,t))),a}update(e){let t=this.input;if(this.query.setPoint(this.slot,this.position.x,this.position.z),this.waterH=this.waterHeight(),this.waterMean=this.waterMean===null||this.waterMean===-1e5||this.waterH===-1e5?this.waterH:this.waterMean+(this.waterH-this.waterMean)*(1-Math.exp(-e/4)),this.transit&&this.transit.isDryAt(this.position.x,this.position.z,this.position.y)&&(this.waterH=this.waterMean=-100),this.prompt=null,this.mode===`boat`){this.updateBoat(e);return}if(this.mode===`deck`){this.updateDeck(e);return}let n=t.consumeLook(e);this.yaw-=n.x*.0022,this.pitch=r.clamp(this.pitch-n.y*.0022,-1.5,1.5);let i=this.mode;if(this.mode===`walk`?this.updateWalk(e):this.updateSwim(e),this.mode===`deck`){this.updateDeck(e);return}let a=this.position.clone();this.mode===`walk`?a.y+=Ns+Math.sin(this.bob)*.035*(1-.6*this.wade):a.y+=Ps,this._camY===null||this.camera.position.y!==this._camY?(this.camOff=0,this.camOffV=0):this.mode!==i&&(this.camOff=this._camY-a.y);let o=Math.exp(-6*e),s=(this.camOffV+6*this.camOff)*e;this.camOff=(this.camOff+s)*o,this.camOffV=(this.camOffV-6*s)*o,a.y+=this.camOff,this.camera.position.copy(a),this._camY=this.camera.position.y,this.camera.quaternion.setFromEuler(Ws.set(this.pitch,this.yaw,0))}updateWalk(e){let t=this.input,n=t.moveAxes();Vs.set(-Math.sin(this.yaw),0,-Math.cos(this.yaw)),Hs.set(-Vs.z,0,Vs.x);let a=new i;a.addScaledVector(Vs,n.y),a.addScaledVector(Hs,n.x),a.lengthSq()>1&&a.normalize();let o=this.waterH-this.position.y,s=r.clamp(o/1.2,0,1);this.wade=s;let c=Math.max(n.sprint,t.down(`ShiftLeft`)||t.down(`ShiftRight`)?1:0),l=c>0,u=r.lerp(3,6.2,c)*r.lerp(1,.42,s)*(this.needs?.enabled&&this.needs.hunger<15?.65:1),d=this.grounded?14:2.5,f=1-Math.exp(-d*e);this.velocity.x+=(a.x*u-this.velocity.x)*f,this.velocity.z+=(a.z*u-this.velocity.z)*f,this.grounded&&t.hit(`Space`)&&o<.9&&(this.velocity.y=4.6,this.grounded=!1),this.velocity.y-=9.81*e,o>0&&this.velocity.multiplyScalar(Math.exp(-e*o*.8));let p=this.position,m=p.clone();if(p.addScaledVector(this.velocity,e),this.cave&&this.cave.constrainPlayer(m,p),this.colliders.resolveCapsule(p,Fs,Is,.4),this.landOnBoat(m,p))return;let h=this.groundAt(p.x,p.z,p.y+.45);p.y<=h?(p.y=h,this.velocity.y<0&&(this.velocity.y=0),this.grounded=!0):this.grounded=p.y-h<.06;let g=Math.hypot(p.x-m.x,p.z-m.z);if(this.grounded){this.bob+=g*2.4,this.stepDist+=g;let e=l?.9:.62;this.stepDist>e&&(this.stepDist=0,this.surface=this.surfaceType(o),this.audio&&this.audio.footstep(this.surface))}if(this.waterMean-p.y>Ls){let e=this.grounded;this.mode=`swim`,e&&(p.y=Math.max(p.y,this.waterH-Ps+.1)),this.velocity.y=e?0:Math.max(this.velocity.y*.3,-2.5),this.audio&&this.audio.splash(e?.2:.5,p)}}landOnBoat(e,t){let n=this.boat;if(!n||this.velocity.y>=0||(Qs.copy(n.quaternion).invert(),Xs.copy(t).sub(n.position).applyQuaternion(Qs),Zs.copy(e).sub(n.position).applyQuaternion(Qs),$s.copy(this.velocity).sub(n.velocity).applyQuaternion(Qs),$s.y>=0))return!1;for(let e of n.model.colliders){if(!e.walkable)continue;let t=e.center.y+e.half.y;if(!(Zs.y<t-.03||Xs.y>t+.04||Xs.y<t-.35)&&!(Math.abs(Xs.x-e.center.x)>e.half.x+Fs||Math.abs(Xs.z-e.center.z)>e.half.z+Fs))return Xs.y=t,this.boardBoat(Xs),!0}return!1}surfaceType(e){let t=this.position;if(e>.12)return`water`;if(this.colliders.groundHeightAt(t.x,t.z,t.y+.1)>this.terrain.heightAt(t.x,t.z)+.05)return`wood`;let n=this.terrain.heightAt(t.x,t.z);return n<.6?`wetsand`:n>3.6?`grass`:`sand`}updateSwim(e){let t=this.input,n=t.moveAxes(),a=this.position,o=this.waterH;Vs.set(0,0,-1).applyEuler(Ws.set(this.pitch,this.yaw,0)),Hs.set(-Math.cos(this.yaw),0,Math.sin(this.yaw)).negate();let s=new i;s.addScaledVector(Vs,n.y),s.addScaledVector(Hs,n.x),t.down(`Space`)&&(s.y+=1),(t.down(`KeyC`)||t.down(`ControlLeft`))&&--s.y,s.lengthSq()>1&&s.normalize(),this.floating&&a.y>o-.45&&s.y>-.25&&!t.down(`KeyC`)&&(s.y=Math.max(s.y,0));let c=Math.max(n.sprint,t.down(`ShiftLeft`)||t.down(`ShiftRight`)?1:0),l=r.lerp(1.5,2.5,c),u=1-Math.exp(-e*3);this.velocity.lerp(s.multiplyScalar(l),u);let d=o-Ps+.1;t.down(`KeyC`)||t.down(`KeyW`)&&this.pitch<-.35||s.y<-.1?this.floating=!1:a.y>d-.15&&(this.floating=!0),this.floating&&(a.y+=(d-a.y)*(1-Math.exp(-e*5)),this.velocity.y>0&&(this.velocity.y*=.5));let f=a.clone();a.addScaledVector(this.velocity,e),this.cave&&this.cave.constrainPlayer(f,a),a.y=Math.min(a.y,o+.05),this.colliders.resolveCapsule(a,Fs,1,0);let p=this.groundAt(a.x,a.z,a.y+.3);a.y<p+.25&&(a.y=p+.25),this.stepDist+=this.velocity.length()*e,this.stepDist>1.3&&(this.stepDist=0,this.audio&&this.audio.swimStroke());let m=this.camera.position.y<o-.05;if(m!==this.wasUnder&&this.audio&&(m?this.audio.submerge():this.audio.emerge()),this.wasUnder=m,this.waterMean-p<Rs&&(this.mode=`walk`,a.y=p,this.velocity.set(this.velocity.x,0,this.velocity.z)),this.colliders.boxes){for(let n of this.colliders.boxes)if(n.tag===`ladder`&&Math.hypot(n.center.x-a.x,n.center.z-a.z)<1.1){if(this.prompt={key:`Space`,text:`Climb ladder`},t.down(`Space`)||t.down(`KeyW`)){let t=this.colliders.groundHeightAt(n.center.x,n.center.z,10);if(t>a.y&&(a.y+=e*1.6,a.y>t-1)){let e=lr.pier.deckHeight;a.set(n.center.x-Math.sign(n.center.x-lr.pier.x)*1.2,e,n.center.z),this.mode=`walk`,this.velocity.set(0,0,0)}}break}}}boardBoat(e=null){let t=this.boat;this.mode=`deck`,this.deckPos.copy(e||t.model.boardPoint),this.deckVel.set(0,0,0),this.deckYaw=this.yaw-(t.getYaw()+Math.PI),this.deckGrounded=!0,this._ashore=null,this._ashoreT=0,this.velocity.set(0,0,0),this._camY=null,this.deckToWorld()}takeHelm(){return this.canDriveBoat!==!1&&(this.mode=`boat`,this.boat.driven=!0,this.boat.moored=!1,this.helmYaw=0,this.helmPitch=-.05,this.orbitYaw=this.boat.getYaw()+Math.PI,this.camInit=!1,this.audio&&this.audio.engineStart(),!0)}leaveHelm(){let e=this.boat;e.driven=!1,e.throttle=0,this.mode=`deck`,this.deckPos.set(Ms.x+.45,e.model.lines.deckY,Ms.z-.1),this.deckVel.set(0,0,0),this.deckYaw=this.helmYaw,this.pitch=this.helmPitch,this.deckGrounded=!0,this._camY=null,this.audio&&this.audio.engineStop(),this.deckToWorld()}enterBoat(){this.boardBoat(),this.canDriveBoat!==!1&&this.takeHelm()}exitBoat(e=null,t=0){let n=this.boat,r=n.driven;n.driven=!1,n.throttle=0;let a=t?null:this.ashoreTarget(),o=lr.boatDock.position,s=this.cave?.layout?.landing?.center,c=s&&Math.hypot(n.position.x-s[0],n.position.z-s[2])<40;if((n.position.distanceTo(o)<14||c||Math.hypot(n.position.x-111,n.position.z-535)<14)&&n.speed<1.5&&(n.moored=!0,n.mooring.anchor.set(n.position.x,0,n.position.z),n.mooring.heading=n.getYaw()),e&&(a=e),a)this.position.set(a.out.x,a.g,a.out.z),this.mode=`walk`;else{let e=n.toWorld(new i(2.2*(t||1),0,0),new i);this.waterH=this.waterMean=n.position.y,this.position.set(e.x,n.position.y-.2,e.z),this.mode=`swim`,this.audio&&this.audio.splash(.8,this.position),this.spray&&this.spray.emit(this.position,zs.set(0,3.4,0),120,.12,ea.SPRAY,{jitter:.8,spread:1.4,life:.9})}this.velocity.set(0,0,0),this.yaw=n.getYaw()+Math.PI,this._camY=null,this.audio&&r&&this.audio.engineStop()}ashoreTarget(){let e=this.boat,t=this.query.cpuValid?this.query.cpu[0]:0,n=Bs.set(1,0,0).applyQuaternion(e.quaternion).setY(0).normalize(),r=n.x,a=n.z,o=null,s=1/0;for(let n of e.model.exitPoints){let c=e.toWorld(n,new i),l=Math.sign(n.x)||1;for(let e of[.9,1.4,2]){let u=new i(c.x+r*l*e,c.y,c.z+a*l*e),d=this.groundAt(u.x,u.z,c.y+2.5),f=d-c.y;if(f>1.7||f<-1.2||d<t-.3)continue;let p=Math.abs(f)+e*.2;p<s&&(s=p,o={out:u,g:d,ep:n})}}return o}deckBase(e){let t=this.boat;return Ks.setFromAxisAngle(Gs,t.getYaw()+Math.PI),qs.copy(t.quaternion).multiply(Js.setFromAxisAngle(Gs,Math.PI)),e.slerpQuaternions(qs,Ks,.55)}deckToWorld(){let e=this.boat;e.toWorld(this.deckPos,this.position),this.yaw=e.getYaw()+Math.PI+this.deckYaw}deckGroundAt(e,t,n){let r=this.boat.model.lines.deckY;for(let i of this.boat.model.colliders){if(!i.walkable||Math.abs(e-i.center.x)>i.half.x||Math.abs(t-i.center.z)>i.half.z)continue;let a=i.center.y+i.half.y;a<=n&&a>r&&(r=a)}return r}updateDeck(e){let t=this.input,n=t.moveAxes(),i=this.boat,a=i.model.lines,o=t.consumeLook(e);this.deckYaw-=o.x*.0022,this.pitch=r.clamp(this.pitch-o.y*.0022,-1.5,1.5);let s=Math.sin(this.deckYaw),c=Math.cos(this.deckYaw);Vs.set(s,0,c),Hs.set(-c,0,s),Ys.set(0,0,0),Ys.addScaledVector(Vs,n.y),Ys.addScaledVector(Hs,n.x),Ys.lengthSq()>1&&Ys.normalize();let l=Math.max(n.sprint,t.down(`ShiftLeft`)||t.down(`ShiftRight`)?1:0),u=r.lerp(1.6,2.6,l),d=1-Math.exp(-12*e),f=this.deckVel;f.x+=(Ys.x*u-f.x)*d,f.z+=(Ys.z*u-f.z)*d,this.deckGrounded&&t.hit(`Space`)&&(f.y=3.2,this.deckGrounded=!1),f.y-=9.81*e;let p=this.deckPos,m=p.x,h=p.z;p.addScaledVector(f,e);for(let e=0;e<2;e++)for(let e of i.model.colliders){if(!e.solid)continue;let t=e.center.y+e.half.y,n=e.center.y-e.half.y;if(t<=p.y+tc||n>=p.y+Is)continue;let r=e.half.x+ec,i=e.half.z+ec,a=p.x-e.center.x,o=p.z-e.center.z;if(Math.abs(a)>=r||Math.abs(o)>=i)continue;let s=r-Math.abs(a),c=i-Math.abs(o);s<c?(p.x+=Math.sign(a||m-e.center.x||1)*s,f.x=0):(p.z+=Math.sign(o||h-e.center.z||1)*c,f.z=0)}p.z=r.clamp(p.z,a.zAft+a.shell+ec,4);let g=Math.max(.15,a.halfBreadth(a.tAtSheerZ(p.z),Math.max(p.y,a.deckY))-a.shell-ec);p.x=r.clamp(p.x,-g,g);let _=this.deckGroundAt(p.x,p.z,p.y+tc);p.y<=_?(p.y=_,f.y<0&&(f.y=0),this.deckGrounded=!0):this.deckGrounded=p.y-_<.04;let v=Math.hypot(p.x-m,p.z-h);this.deckGrounded&&(this.bob+=v*2.4,this.stepDist+=v,this.stepDist>.6&&(this.stepDist=0,this.audio&&this.audio.footstep(`wood`))),this.deckToWorld();let y=Ms.x,b=Ms.z,x=Math.hypot(p.x-y,p.z-b)<nc&&!this.busy;if(this._ashoreT-=e,this._ashoreT<=0&&(this._ashoreT=.25,this._ashore=i.speed<2.5?this.ashoreTarget():null),x&&this.canDriveBoat!==!1){if(this.prompt={key:`E`,text:`Take the helm`},t.hit(`KeyE`)){this.takeHelm();return}}else if(!this.busy){let e=this._ashore&&this._ashore.ep,n=i.model.exitPoints.some(e=>Math.hypot(p.x-e.x,p.z-e.z)<1.3),r=this.cave?.layout?.wadingRamp,a=this.cave?.layout?.wadingShelf,o=r&&a&&i.position.x>=a.xMin&&i.position.x<=a.xMax+2&&i.position.z>=r.waterEdgeZ&&i.position.z<=r.waterEdgeZ+5;if(n&&o&&p.x>0){if(this.prompt={key:`E`,text:`Jump into the shallows`},t.hit(`KeyE`)){this.exitBoat(null,Math.sign(p.x)||1);return}}else if(e&&Math.hypot(p.x-e.x,p.z-e.z)<1.3){if(this.prompt={key:`E`,text:`Step ashore`},t.hit(`KeyE`)){this.exitBoat(this._ashore);return}}else if(n&&(this.prompt={key:`E`,text:`Jump overboard`},t.hit(`KeyE`))){this.exitBoat(null,Math.sign(p.x)||1);return}}let S=zs.set(p.x,p.y+Ns+Math.sin(this.bob)*.02,p.z);i.toWorld(S,this.camera.position),this._camY=this.camera.position.y,this.deckBase(Us),this.camera.quaternion.copy(Us).multiply(Ks.setFromEuler(Ws.set(this.pitch,this.deckYaw,0)))}updateBoat(e){let t=this.input,a=t.moveAxes(),o=this.boat,s=t.consumeLook(e),c=t.consumeWheel();if(t.hit(`KeyV`)&&(this.camMode=this.camMode===`first`?`third`:`first`),t.hit(`KeyE`)){this.leaveHelm();return}let l=a.y>0?a.y*(t.down(`ShiftLeft`)?1:.7):a.y*.6,u=-a.x;if(o.setInput(l,u,e),this.prompt={key:`E`,text:`Leave helm   ·   V  camera`},o.toWorld(o.model.helmEye,this.position),this.position.y-=Ns,this.camMode===`first`){this.helmYaw=r.clamp(this.helmYaw-s.x*.0022,-2.2,2.2),this.helmPitch=r.clamp(this.helmPitch-s.y*.0022,-1.2,1);let e=o.toWorld(o.model.helmEye,new i);this.camera.position.copy(e);let t=o.quaternion,a=new n().setFromAxisAngle(new i(0,1,0),o.getYaw()+Math.PI),c=new n().slerpQuaternions(t.clone().multiply(new n().setFromAxisAngle(new i(0,1,0),Math.PI)),a,.55),l=new n().setFromEuler(Ws.set(this.helmPitch,this.helmYaw,0));this.camera.quaternion.copy(c).multiply(l)}else{if(this.orbitYaw-=s.x*.003,this.orbitPitch=r.clamp(this.orbitPitch+s.y*.003,-.05,1.2),this.orbitDist=r.clamp(this.orbitDist*(1+c*.08),6,40),o.speed>2&&Math.abs(s.x)<.5){let t=o.getYaw()+Math.PI-this.orbitYaw;t=Math.atan2(Math.sin(t),Math.cos(t)),this.orbitYaw+=t*(1-Math.exp(-e*.8))}let t=o.toWorld(new i(0,1.4,0),new i),n=new i(Math.sin(this.orbitYaw)*Math.cos(this.orbitPitch),Math.sin(this.orbitPitch),Math.cos(this.orbitYaw)*Math.cos(this.orbitPitch)).multiplyScalar(this.orbitDist),a=t.clone().add(n);a.y=Math.max(a.y,this.waterH+.7),this.camInit||=(this.camPos.copy(a),!0),this.camPos.lerp(a,1-Math.exp(-e*6)),this.camera.position.copy(this.camPos),this.camera.lookAt(t)}}};export{jr as $,pi as A,z as B,Ii as C,Ot as Ct,Zi as D,rt as Dt,Qi as E,Ye as Et,Ur as F,Er as G,Mr as H,ei as I,B as J,Pr as K,qr as L,U as M,V as N,hi as O,it as Ot,Vr as P,Br as Q,Tr as R,K as S,Ft as St,Ni as T,ft as Tt,Ar as U,Nr as V,L as W,Or as X,Dr as Y,kr as Z,Wa as _,Jt as _t,ns as a,tr as at,ea as b,Vt as bt,Jo as c,Pn as ct,po as d,un as dt,mr as et,ho as f,an as ft,ao as g,P as gt,oo as h,on as ht,Zo as i,nr as it,ui as j,fi as k,N as kt,Yo as l,bn as lt,so as m,rn as mt,As as n,lr as nt,qo as o,Bn as ot,fo as p,nn as pt,wr as q,js as r,sr as rt,jo as s,Vn as st,rc as t,pr as tt,Ao as u,pn as ut,Ha as v,Yt as vt,$i as w,ht as wt,oa as x,Bt as xt,za as y,qt as yt,R as z};