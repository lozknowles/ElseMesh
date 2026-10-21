const KEY = 'elsemesh.weather.v1';
const defaults = {
	mode: 'clear', rainIntensity: 0.7, windSpeed: 6, seed: 7341,
	mistDensity: 0, mistSpeed: 2, mistHeight: 12, cloudCoverage: 0.49,
};
const bounded = ( value, fallback, min, max ) => typeof value === 'number' && Number.isFinite( value ) ? Math.max( min, Math.min( max, value ) ) : fallback;

export function normalizeWeatherPreferences( value ) {
	const raw = value && typeof value === 'object' && ! Array.isArray( value ) ? value : {};
	return {
		mode: [ 'clear', 'rain', 'storm' ].includes( raw.mode ) ? raw.mode : defaults.mode,
		rainIntensity: bounded( raw.rainIntensity, defaults.rainIntensity, 0, 1 ),
		windSpeed: bounded( raw.windSpeed, defaults.windSpeed, 0, 30 ),
		seed: Math.floor( bounded( raw.seed, defaults.seed, 0, 0xffffffff ) ),
		mistDensity: bounded( raw.mistDensity, defaults.mistDensity, 0, 0.04 ),
		mistSpeed: bounded( raw.mistSpeed, defaults.mistSpeed, 0, 15 ),
		mistHeight: bounded( raw.mistHeight, defaults.mistHeight, 1, 80 ),
		cloudCoverage: bounded( raw.cloudCoverage, defaults.cloudCoverage, 0, 1 ),
	};
}

export function loadWeatherPreferences() {
	try { return normalizeWeatherPreferences( JSON.parse( localStorage.getItem( KEY ) || 'null' ) ); }
	catch { return { ...defaults }; }
}

export function saveWeatherPreferences( value ) {
	try { localStorage.setItem( KEY, JSON.stringify( normalizeWeatherPreferences( value ) ) ); return true; }
	catch { return false; }
}
