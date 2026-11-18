// Build Tool Edit: bundle main/preload (node) va renderer (browser) bang esbuild.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
await build({ entryPoints: ['src/main/main.ts'], outfile: 'dist/main.js', bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: ['electron'], sourcemap: true });
await build({ entryPoints: ['src/main/preload.ts'], outfile: 'dist/preload.js', bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: ['electron'], sourcemap: true });
await build({ entryPoints: ['src/renderer/index.tsx'], outfile: 'dist/renderer.js', bundle: true, platform: 'browser', format: 'iife', target: 'chrome140', sourcemap: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
await build({ entryPoints: ['src/mcp/server.ts'], outfile: 'dist/mcp.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node22', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
copyFileSync('src/renderer/index.html', 'dist/index.html');
copyFileSync('src/renderer/styles.css', 'dist/styles.css');
console.log('build ok');
