// Game weather model, adapted from ElseMesh Worlds' builder-owned weather.ts.
// Analytic seeded positions are independent of frame rate. No renderer, saved
// particle state, browser API, audio, network or external dependency is needed.
export const RAIN_PARTICLES = 900;
const wrap = ( value, range ) => ( ( value % range ) + range ) % range;
const bounded = ( value, fallback, min, max ) => Number.isFinite( value ) ? Math.max( min, Math.min( max, value ) ) : fallback;

export function normalizeWeatherSettings( value = {} ) {
	return {
		mode: value.mode === 'rain' || value.mode === 'storm' ? value.mode : 'clear',
		rainIntensity: bounded( value.rainIntensity, 0.7, 0, 1 ),
		windSpeed: bounded( value.windSpeed, 6, 0, 30 ),
		seed: Number.isSafeInteger( value.seed ) ? value.seed >>> 0 : 7341,
	};
}

export function weatherHash( index, seed = 7341 ) {
	let value = ( Math.imul( index + 1, 374761393 ) + Math.imul( seed | 0, 668265263 ) ) | 0;
	value = Math.imul( value ^ ( value >>> 13 ), 1274126177 );
	return ( ( value ^ ( value >>> 16 ) ) >>> 0 ) / 4294967295;
}

export function quadIndices( count ) {
	const indices = [];
	for ( let i = 0; i < count; i ++ ) {
		const n = i * 4;
		indices.push( n, n + 1, n + 2, n + 1, n + 3, n + 2 );
	}
	return indices;
}

export function writeRainQuads( positions, time, camera, yaw, settings, waterHeight = -Infinity ) {
	const active = settings.mode === 'clear' ? 0 : Math.floor( RAIN_PARTICLES * settings.rainIntensity );
	const seed = settings.seed, wind = settings.windSpeed, radius = 34;
	const rightX = Math.cos( yaw ), rightZ = -Math.sin( yaw ), width = 0.018;
	let count = 0;
	for ( let i = 0; i < active; i ++ ) {
		const speed = 17 + weatherHash( i * 4 + 3, seed ) * 13;
		const x = wrap( weatherHash( i * 4, seed ) * radius * 2 + time * wind * 0.65, radius * 2 ) - radius + camera.x;
		const y = wrap( weatherHash( i * 4 + 1, seed ) * 38 - time * speed, 38 ) - 13 + camera.y;
		const z = wrap( weatherHash( i * 4 + 2, seed ) * radius * 2 + time * wind * 0.25, radius * 2 ) - radius + camera.z;
		const length = 0.7 + weatherHash( i + 991, seed ) * 0.65;
		if ( y - length <= waterHeight ) continue;
		const dx = wind * length / speed * 0.65, dz = wind * length / speed * 0.25;
		const wx = rightX * width, wz = rightZ * width;
		positions.set( [ x - wx, y, z - wz, x + wx, y, z + wz, x + dx - wx, y - length, z + dz - wz, x + dx + wx, y - length, z + dz + wz ], count * 12 );
		count ++;
	}
	return count;
}

export function stormState( time, settings ) {
	if ( settings.mode !== 'storm' ) return { flash: 0, event: -1 };
	const period = 8 + weatherHash( 938, settings.seed ) * 5;
	const elapsed = time - 3;
	if ( elapsed < 0 ) return { flash: 0, event: -1 };
	const event = Math.floor( elapsed / period ), phase = elapsed % period;
	const pulse = ( at, width ) => Math.max( 0, 1 - Math.abs( phase - at ) / width );
	return { event, flash: Math.max( pulse( 0.07, 0.07 ), pulse( 0.23, 0.065 ) * 0.75, pulse( 0.4, 0.09 ) * 0.5 ) };
}

export function writeLightningQuad( positions, camera, yaw, seed, event, waterHeight = -Infinity ) {
	const forwardX = -Math.sin( yaw ), forwardZ = -Math.cos( yaw ), rightX = Math.cos( yaw ), rightZ = -Math.sin( yaw );
	const x = camera.x + forwardX * 110 + rightX * 18, z = camera.z + forwardZ * 110 + rightZ * 18;
	let previous = 0;
	for ( let i = 0; i < 12; i ++ ) {
		const next = ( weatherHash( i + Math.max( event, 0 ) * 17, seed ) - 0.5 ) * 9;
		const y0 = Math.max( waterHeight, camera.y + 62 - i * 5.5 ), y1 = Math.max( waterHeight, camera.y + 62 - ( i + 1 ) * 5.5 );
		const width = 0.12 + ( 12 - i ) * 0.015;
		positions.set( [ x + rightX * ( previous - width ), y0, z + rightZ * ( previous - width ), x + rightX * ( previous + width ), y0, z + rightZ * ( previous + width ), x + rightX * ( next - width ), y1, z + rightZ * ( next - width ), x + rightX * ( next + width ), y1, z + rightZ * ( next + width ) ], i * 12 );
		previous = next;
	}
}
