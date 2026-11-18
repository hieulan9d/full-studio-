// Phan tich nen: chay Python (whisper, nhip), tim khoang lang bang ffmpeg, do loudness cua ban tron. Xem CHUC-NANG.md F-30..F-36.
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Project } from '../core/schema';
import type { Range } from '../core/transcript';
import { buildAudioPlan } from './exporter';
import { FFMPEG } from './media';

export const PYTHON = process.env.TOOL_EDIT_PYTHON ?? 'python';
/** Thu muc py/ (canh dist/ khi chay tu ma dong goi, hoac canh src/ khi chay thu). */
export const pyScript = (name: string) => path.join(__dirname, '..', 'py', name);

export interface PyResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runPython(script: string, args: string[], onLine: (line: string) => void, onSpawn: (kill: () => void) => void): Promise<PyResult> {
  return new Promise((resolve, reject) => {
    const p = spawn(PYTHON, ['-u', '-X', 'utf8', pyScript(script), ...args], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    onSpawn(() => p.kill());
    let out = '',
      err = '',
      buf = '';
    p.stdout.on('data', (d: Buffer) => {
      const s = d.toString('utf8');
      out += s;
      buf += s;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        onLine(buf.slice(0, i).trim());
        buf = buf.slice(i + 1);
      }
    });
    p.stderr.on('data', (d: Buffer) => (err += d.toString('utf8')));
    p.on('error', (e) => reject(new Error(`khong chay duoc Python (${PYTHON}): ${e.message}. Dat TOOL_EDIT_PYTHON neu Python o noi khac.`)));
    p.on('close', (code) => resolve({ code: code ?? -1, stdout: out, stderr: err }));
  });
}

export interface WhisperOpts {
  lang: string;
  model: string;
  prompt?: string;
  cpu?: boolean;
}

export async function transcribeFile(input: string, outJson: string, o: WhisperOpts, onProgress: (p: number) => void, onSpawn: (kill: () => void) => void) {
  const args = [input, outJson, '--lang', o.lang, '--model', o.model];
  if (o.prompt) args.push('--prompt', o.prompt);
  if (o.cpu) args.push('--cpu');
  const r = await runPython('transcribe.py', args, (l) => {
    const m = /^PROGRESS ([0-9.]+)/.exec(l);
    if (m) onProgress(Number(m[1]));
  }, onSpawn);
  if (r.code === 3) throw new Error('MODEL_MISSING: ' + (r.stderr.trim().split('\n').pop() ?? 'mo hinh chua co trong may'));
  if (r.code !== 0) throw new Error(`whisper that bai (ma ${r.code}): ${(r.stderr.trim().split('\n').pop() ?? '').slice(0, 300)}`);
  return JSON.parse(fs.readFileSync(outJson, 'utf8')) as { lang: string; model: string; device: string; duration: number; seconds: number; words: { w: string; s: number; e: number; p?: number }[] };
}

export async function detectBeats(input: string, outJson: string, onSpawn: (kill: () => void) => void) {
  const r = await runPython('beats.py', [input, outJson], () => {}, onSpawn);
  if (r.code !== 0) throw new Error(`nhan nhip that bai (ma ${r.code}): ${r.stderr.trim().slice(-200)}`);
  return JSON.parse(fs.readFileSync(outJson, 'utf8')) as { bpm: number; period: number; beat0: number; times: number[]; duration: number };
}

/** Tach nen (RVM, ONNX) -> video xam alpha. Thieu mo hinh: nem loi MODEL_MISSING (khong tu tai). */
export async function matteVideo(input: string, outFile: string, o: { cpu?: boolean; ratio?: number }, onProgress: (p: number) => void, onSpawn: (kill: () => void) => void) {
  const args = [input, outFile];
  if (o.cpu) args.push('--cpu');
  if (o.ratio) args.push('--ratio', String(o.ratio));
  const r = await runPython('matte.py', args, (l) => {
    const m = /^PROGRESS ([0-9.]+)/.exec(l);
    if (m) onProgress(Number(m[1]));
  }, onSpawn);
  if (r.code === 3) throw new Error('MODEL_MISSING: ' + (r.stderr.trim().split(String.fromCharCode(10)).pop() ?? 'chua co mo hinh tach nen'));
  if (r.code !== 0) throw new Error(`tach nen that bai (ma ${r.code}): ${(r.stderr.trim().split(String.fromCharCode(10)).pop() ?? '').slice(0, 300)}`);
  const done = r.stdout.split(String.fromCharCode(10)).find((l) => l.startsWith('DONE '));
  return JSON.parse(done!.slice(5)) as { frames: number; width: number; height: number; fps: number; device: string; seconds: number; model: string };
}

/** Khoang im lang cua mot file am thanh (giay trong file) bang ffmpeg silencedetect. */
export function detectSilences(file: string, noiseDb: number, minDur: number): Promise<Range[]> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `silencedetect=noise=${noiseDb}dB:d=${minDur}`, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', () => {
      const out: Range[] = [];
      let start: number | null = null;
      for (const line of err.split(String.fromCharCode(10))) {
        const a = /silence_start: (-?[0-9.]+)/.exec(line);
        if (a) start = Math.max(0, Number(a[1]));
        const b = /silence_end: (-?[0-9.]+)/.exec(line);
        if (b && start !== null) {
          out.push({ s: start, e: Number(b[1]) });
          start = null;
        }
      }
      resolve(out);
    });
  });
}

export interface Loudness {
  input_i: number;
  input_tp: number;
  input_lra: number;
  input_thresh: number;
  target_offset: number;
}

/** Do loudness tich phan (LUFS) / dinh that (dBTP) / LRA cua BAN TRON am thanh cua du an (gom keyframe am luong, duck). null neu khong co tieng. */
export function measureLoudness(p: Project, totalSec: number): Promise<Loudness | null> {
  const plan = buildAudioPlan(p, 0);
  if (!plan.filter) return Promise.resolve(null);
  const args = ['-hide_banner', '-nostats'];
  for (const f of plan.inputs) args.push('-i', f);
  args.push('-filter_complex', `${plan.filter};${plan.map}loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[ln]`, '-map', '[ln]', '-t', totalSec.toFixed(3), '-f', 'null', '-');
  return new Promise((resolve, reject) => {
    const pr = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    pr.stderr.on('data', (d) => (err += d));
    pr.on('error', reject);
    pr.on('close', () => {
      const i = err.lastIndexOf('{');
      const j = err.lastIndexOf('}');
      if (i < 0 || j < i) return reject(new Error('khong doc duoc ket qua loudnorm: ' + err.slice(-300)));
      try {
        const o = JSON.parse(err.slice(i, j + 1));
        resolve({ input_i: Number(o.input_i), input_tp: Number(o.input_tp), input_lra: Number(o.input_lra), input_thresh: Number(o.input_thresh), target_offset: Number(o.target_offset) });
      } catch (e) {
        reject(e as Error);
      }
    });
  });
}
