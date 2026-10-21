import { Group, Mesh, BufferGeometry, BufferAttribute, DynamicDrawUsage } from '../engine/index.js';
import { Material } from '../engine/render/Material.js';
import { LAYERS } from '../core/SceneRenderer.js';
import { RAIN_PARTICLES, normalizeWeatherSettings, quadIndices, stormState, writeLightningQuad, writeRainQuads } from './weather-model.js';

/** Optional game-owned weather. Two bounded native meshes; no global lighting
 * overrides or audio. The caller owns water/cave state and AirHaze flash input.
 */
export class Weather {
	constructor() {
		this.settings = normalizeWeatherSettings();
		this.group = new Group();
		this.group.name = 'Weather';
		const create = ( count, name, color, opacity ) => {
			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( count * 12 ), 3 ).setUsage( DynamicDrawUsage ) );
			geometry.setIndex( quadIndices( count ) );
			const material = new Material( { name, color, lit: false, transparent: true, opacity, depthWrite: false, side: 'double', receiveShadows: false } );
			const mesh = new Mesh( geometry, material );
			mesh.layers.set( LAYERS.TRANSPARENT ); mesh.frustumCulled = false; mesh.castShadow = false; mesh.visible = false;
			this.group.add( mesh );
			return mesh;
		};
		this.rain = create( RAIN_PARTICLES, 'weather-rain', '#c4e3ef', 0.42 );
		this.bolt = create( 12, 'weather-lightning', '#e2ebff', 1 );
		this._time = 0; this._started = 0; this._mode = 'clear'; this._seed = this.settings.seed;
		this._disposed = false;
	}

	update( dt, time, camera, { underwater = false, sheltered = false, waterHeight = -Infinity } = {} ) {
		if ( this._disposed ) return { flash: 0, event: -1, particles: 0 };
		const previous = this._time;
		this._time = Number.isFinite( time ) ? Math.max( time, 0 ) : previous + Math.max( 0, Math.min( Number.isFinite( dt ) ? dt : 0, 0.1 ) );
		const settings = normalizeWeatherSettings( this.settings );
		if ( settings.mode !== this._mode || settings.seed !== this._seed || this._time < previous ) {
			this._started = this._time; this._mode = settings.mode; this._seed = settings.seed;
		}
		if ( underwater || sheltered || settings.mode === 'clear' ) {
			this.rain.visible = false; this.bolt.visible = false;
			return { flash: 0, event: -1, particles: 0 };
		}
		camera.updateMatrixWorld();
		const m = camera.matrixWorld.elements, yaw = Math.atan2( m[ 8 ], m[ 10 ] );
		const water = Number.isFinite( waterHeight ) ? waterHeight : -Infinity;
		const attribute = this.rain.geometry.getAttribute( 'position' );
		const particles = writeRainQuads( attribute.array, this._time, camera.position, yaw, settings, water );
		attribute.needsUpdate = true;
		this.rain.geometry.setDrawRange( 0, particles * 6 ); this.rain.visible = particles > 0;
		const state = stormState( this._time - this._started, settings );
		this.bolt.visible = state.flash > 0.02;
		this.bolt.material.opacity = state.flash;
		if ( this.bolt.visible ) {
			const positions = this.bolt.geometry.getAttribute( 'position' );
			writeLightningQuad( positions.array, camera.position, yaw, settings.seed, state.event, water );
			positions.needsUpdate = true;
		}
		return { ...state, particles };
	}

	dispose() {
		if ( this._disposed ) return;
		this._disposed = true;
		this.group.parent?.remove( this.group );
		for ( const mesh of [ this.rain, this.bolt ] ) {
			mesh.visible = false; mesh.geometry.dispose(); mesh.material.dispose();
		}
	}
}
