// Chay moi test trong test/*.test.ts (khong can Electron/GPU).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
for (const f of readdirSync('test').filter((x) => x.endsWith('.test.ts'))) {
  const out = resolve('dist', f.replace('.ts', '.mjs'));
  await build({ entryPoints: [`test/${f}`], outfile: out, bundle: true, platform: 'node', format: 'esm', target: 'node22' });
  await import(pathToFileURL(out).href);
}
