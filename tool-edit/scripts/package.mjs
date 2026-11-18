// Dong goi Tool Edit thanh thu muc chay duoc (khong can cai gi them tru ffmpeg/python o may): release/ToolEdit/ToolEdit.exe
// Cach lam: lay san runtime Electron trong node_modules (khong tai them gi), doi ten electron.exe, dat ma app vao resources/app.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const root = resolve('.');
const out = join(root, 'release', 'ToolEdit');
const electronDist = join(root, 'node_modules', 'electron', 'dist');
if (!existsSync(join(electronDist, 'electron.exe'))) throw new Error('khong thay node_modules/electron/dist/electron.exe (chay npm install)');

console.log('1/5 build...');
execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });

console.log('2/5 sao chep runtime Electron...');
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(electronDist, out, { recursive: true });
renameSync(join(out, 'electron.exe'), join(out, 'ToolEdit.exe'));
rmSync(join(out, 'resources', 'default_app.asar'), { force: true });

console.log('3/5 dat ma app vao resources/app...');
const app = join(out, 'resources', 'app');
mkdirSync(join(app, 'dist'), { recursive: true });
for (const f of readdirSync('dist')) {
  if (/\.(map|test\.mjs)$/.test(f) || f === 'test-core.mjs') continue; // bo sourcemap va file test
  cpSync(join('dist', f), join(app, 'dist', f));
}
cpSync('py', join(app, 'py'), { recursive: true });
if (existsSync('models')) cpSync('models', join(app, 'models'), { recursive: true });
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
writeFileSync(join(app, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, main: 'dist/main.js', description: pkg.description }, null, 2));

console.log('4/5 viet huong dan...');
writeFileSync(
  join(out, 'DOC-TOI.txt'),
  [
    'Tool Edit - phan mem dung video',
    '',
    'Mo: bam dup ToolEdit.exe',
    'Du an luu o: Documents\\Tool Edit\\Du an',
    'Can co san tren may: ffmpeg (trong PATH). Tach nen / nhan dien loi thoai / nhip nhac can them Python (xem CAI-DAT.md cua Full Studio).',
    'Muon cho AI dung (MCP): node resources\\app\\dist\\mcp.mjs  (xem THU-MCP.md)',
    'Muon chuyen sang may khac: sao chep ca thu muc ToolEdit.',
    '',
  ].join('\r\n'),
);
console.log('5/5 xong:', join(out, 'ToolEdit.exe'));
