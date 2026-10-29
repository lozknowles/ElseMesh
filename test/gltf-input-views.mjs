import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGLB, parseGLB } from '../src/engine/loaders/GLTF.js';

function fixture() {

	const json = new TextEncoder().encode( JSON.stringify( {
		asset: { version: '2.0' },
		nodes: [ { name: 'metadata', extras: { behaviour: 'untrusted text', nested: [ 1, false, null ], [ '__proto__' ]: { gltfPolluted: true } } }, {} ],
		buffers: [ { byteLength: 12 } ],
		bufferViews: [ { buffer: 0, byteLength: 12 } ],
		accessors: [ { bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' } ],
		meshes: [ { primitives: [ { attributes: { POSITION: 0 } } ] } ],
		images: [ { bufferView: 0, mimeType: 'application/octet-stream' } ],
	} ) );
	const jsonLength = Math.ceil( json.length / 4 ) * 4;
	const buffer = new ArrayBuffer( 12 + 8 + jsonLength + 8 + 12 );
	const dv = new DataView( buffer );
	dv.setUint32( 0, 0x46546C67, true );
	dv.setUint32( 4, 2, true );
	dv.setUint32( 8, buffer.byteLength, true );
	dv.setUint32( 12, jsonLength, true );
	dv.setUint32( 16, 0x4E4F534A, true );
	new Uint8Array( buffer, 20, jsonLength ).fill( 32 );
	new Uint8Array( buffer, 20, json.length ).set( json );
	const bin = 20 + jsonLength;
	dv.setUint32( bin, 12, true );
	dv.setUint32( bin + 4, 0x004E4942, true );
	new Float32Array( buffer, bin + 8, 3 ).set( [ 1.5, - 2, 3 ] );
	return buffer;

}

function wrapped() {

	const buffer = fixture();
	const outer = Buffer.alloc( buffer.byteLength + 31, 0xA5 );
	outer.set( new Uint8Array( buffer ), 7 );
	return { outer, length: buffer.byteLength };

}

for ( const [ name, input ] of [
	[ 'ArrayBuffer', () => fixture() ],
	[ 'sliced Uint8Array', () => { const { outer, length } = wrapped(); return new Uint8Array( outer.buffer, outer.byteOffset + 7, length ); } ],
	[ 'sliced Buffer', () => { const { outer, length } = wrapped(); return outer.subarray( 7, 7 + length ); } ],
	[ 'DataView', () => { const { outer, length } = wrapped(); return new DataView( outer.buffer, outer.byteOffset + 7, length ); } ],
	[ 'Uint16Array', () => new Uint16Array( fixture() ) ],
] ) test( `parseGLB accepts ${name} and preserves geometry, images and inert extras`, () => {

	const parsed = parseGLB( input() );
	assert.deepEqual( Array.from( parsed.meshes[ 0 ][ 0 ].attributes.POSITION.array ), [ 1.5, - 2, 3 ] );
	assert.deepEqual( parsed.images[ 0 ].bytes, new Uint8Array( new Float32Array( [ 1.5, - 2, 3 ] ).buffer ) );
	assert.deepEqual( parsed.nodes[ 0 ].extras, { behaviour: 'untrusted text', nested: [ 1, false, null ], [ '__proto__' ]: { gltfPolluted: true } } );
	assert.equal( {}.gltfPolluted, undefined );
	assert.equal( parsed.nodes[ 0 ].gltfPolluted, undefined );
	assert.equal( parsed.nodes[ 0 ].extras, parsed.json.nodes[ 0 ].extras );
	assert.equal( parsed.nodes[ 1 ].extras, undefined );

} );

test( 'truncated views cannot use bytes outside their supplied range', () => {

	const { outer, length } = wrapped();
	for ( const size of [ 0, 11, length - 1 ] ) {

		assert.throws( () => parseGLB( new Uint8Array( outer.buffer, outer.byteOffset + 7, size ) ), /GLB:/ );
		assert.throws( () => parseGLB( new DataView( outer.buffer, outer.byteOffset + 7, size ) ), /GLB:/ );

	}
	assert.throws( () => parseGLB( outer.subarray( 6, 7 + length ) ), /bad magic/ );

} );

test( 'chunk cannot consume bytes beyond the declared GLB length', () => {

	const buffer = fixture();
	const dv = new DataView( buffer );
	dv.setUint32( 8, buffer.byteLength - 1, true );
	assert.throws( () => parseGLB( buffer ), /truncated chunk/ );

} );

test( 'asset hook may return a sliced Buffer', async () => {

	const previous = globalThis.__assetFile;
	const { outer, length } = wrapped();
	globalThis.__assetFile = async () => outer.subarray( 7, 7 + length );
	try {

		assert.equal( ( await loadGLB( 'fixture.glb' ) ).nodes[ 0 ].name, 'metadata' );

	} finally {

		if ( previous === undefined ) delete globalThis.__assetFile;
		else globalThis.__assetFile = previous;

	}

} );
