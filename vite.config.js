import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig( {
	// relative asset paths: the build runs from any sub-path (GitHub Pages serves it under /elsemesh/)
	base: './',
	resolve: { alias: [ { find: 'three/addons/postprocessing/Pass.js', replacement: resolve('node_modules/three/examples/jsm/postprocessing/Pass.js') }, { find: /^three$/, replacement: resolve('src/world-runtime/SplatThree.js') } ] },
	build: { target: 'esnext', chunkSizeWarningLimit: 4000, rollupOptions: { input: { main: resolve( 'index.html' ), worlds: resolve( 'worlds.html' ) } } },
	server: { port: 5188, strictPort: true, host: '127.0.0.1' },
} );
