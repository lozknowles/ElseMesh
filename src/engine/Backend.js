/** Initialize WebGPU first and use the supplied fallback only if it fails. */
export async function initializeRenderBackend( { webgpu, webgl2 } = {} ) {
	if ( typeof webgpu !== 'function' || typeof webgl2 !== 'function' )
		throw new TypeError( 'WebGPU and WebGL2 initializers are required' );
	try {
		return { backend: 'webgpu', value: await webgpu(), fallbackReason: null };
	} catch ( error ) {
		const fallbackReason = error instanceof Error ? error.message : String( error );
		try {
			return { backend: 'webgl2', value: await webgl2(), fallbackReason };
		} catch ( fallbackError ) {
			fallbackError.cause ??= error;
			throw fallbackError;
		}
	}
}
