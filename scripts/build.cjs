const esbuild = require('esbuild');
const player = esbuild.buildSync({ entryPoints: ['src/player.js'], bundle: true, format: 'iife', minify: true, write: false });
esbuild.buildSync({ entryPoints: ['src/editor.js'], bundle: true, format: 'esm', minify: true, outfile: 'build/renderer.js', loader: { '.png': 'dataurl' }, define: { RAVS_PLAYER_SOURCE: JSON.stringify(player.outputFiles[0].text) } });
