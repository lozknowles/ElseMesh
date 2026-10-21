// Procedural weather effect; recorded island ambience remains in SoundScape.
// Shares its gesture-unlocked context, above-water bus, master and limiter.
export class Thunder {
	constructor() {
		this.voices = new Set(); this.buffer = null;
		this.debug = typeof location !== 'undefined' && new URLSearchParams( location.search ).has( 'weatherAudioDebug' );
	}

	play( context, destination, strike ) {
		if ( context.state !== 'running' ) return;
		if ( ! this.buffer ) {
			const buffer = context.createBuffer( 2, Math.ceil( context.sampleRate * 5 ), context.sampleRate );
			for ( let channel = 0; channel < 2; channel ++ ) {
				const samples = buffer.getChannelData( channel );
				let seed = 7341 + channel, brown = 0;
				for ( let i = 0; i < samples.length; i ++ ) {
					seed = ( Math.imul( seed, 1664525 ) + 1013904223 ) >>> 0;
					const noise = seed / 2147483648 - 1;
					brown = ( brown + noise * 0.035 ) / 1.015;
					samples[ i ] = brown * 2.8 + noise * 0.12 * Math.exp( - i / context.sampleRate * 8 );
				}
			}
			this.buffer = buffer;
		}
		if ( this.voices.size >= 2 ) this._stop( this.voices.values().next().value, context, true );
		const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
		source.buffer = this.buffer;
		filter.type = 'lowpass'; filter.frequency.value = 950; filter.Q.value = 0.5;
		source.connect( filter ); filter.connect( gain ); gain.connect( destination );
		const start = context.currentTime + 0.32;
		gain.gain.setValueAtTime( 0, context.currentTime );
		gain.gain.setValueAtTime( 0, start );
		gain.gain.linearRampToValueAtTime( 0.48, start + 0.035 );
		gain.gain.exponentialRampToValueAtTime( 0.18, start + 0.45 );
		gain.gain.exponentialRampToValueAtTime( 0.001, start + 4.8 );
		gain.gain.linearRampToValueAtTime( 0, start + 5 );
		const voice = { source, filter, gain };
		this.voices.add( voice );
		source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.voices.delete( voice ); };
		source.start( start ); source.stop( start + 5 );
		if ( this.debug ) console.debug( '[weather-audio] scheduled', JSON.stringify( { generation: strike.generation, event: strike.event, flashGameTime: strike.strikeTime, audioNow: context.currentTime, audioStart: start, route: 'above → master → limiter', voices: this.voices.size } ) );
	}

	_stop( voice, context, immediate = false ) {
		const now = context.currentTime;
		if ( immediate || context.state !== 'running' ) {
			voice.gain.gain.cancelScheduledValues( now ); voice.gain.gain.value = 0;
			voice.source.stop(); voice.source.disconnect(); voice.filter.disconnect(); voice.gain.disconnect();
			this.voices.delete( voice );
			if ( this.debug ) console.debug( '[weather-audio] retired', JSON.stringify( { audioTime: now, voices: this.voices.size } ) );
			return;
		}
		if ( voice.stopping ) return;
		voice.stopping = true;
		voice.gain.gain.cancelAndHoldAtTime( now );
		voice.gain.gain.linearRampToValueAtTime( 0, now + 0.03 );
		voice.source.stop( now + 0.03 );
		if ( this.debug ) console.debug( '[weather-audio] cancelled', JSON.stringify( { audioTime: now, voices: this.voices.size } ) );
	}

	stop( context ) { if ( context ) for ( const voice of this.voices ) this._stop( voice, context ); }
}
