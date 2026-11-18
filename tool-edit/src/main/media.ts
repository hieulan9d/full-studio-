// Nhap media: ffprobe + cache chuan hoa (H.264 CFR, GOP 15, khong B-frame, Annex-B). Xem CHUC-NANG.md F-06.
import { spawn, execFile } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Media } from '../core/schema';

export const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
export const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';
export const CACHE_GOP = 15;
const MAX_LONG_EDGE = 1920;

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => (err ? reject(new Error(`${cmd}: ${stderr || err.message}`)) : resolve(stdout)));
  });
}

export async function probe(file: string): Promise<Omit<Media, 'id'>> {
  if (!fs.existsSync(file)) throw new Error(`khong thay file: ${file}`);
  const out = await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(out);
  const streams: any[] = j.streams ?? [];
  const v = streams.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1);
  const a = streams.find((s) => s.codec_type === 'audio');
  const duration = Number(j.format?.duration ?? v?.duration ?? a?.duration ?? 0);
  if (!v && !a) throw new Error('file khong co video hay am thanh');
  if (!v) return { path: file, kind: 'audio', duration, width: 0, height: 0, fps: 0, hasAudio: true };

  let w = Number(v.width),
    h = Number(v.height);
  const rot = Number(v.tags?.rotate ?? v.side_data_list?.find((s: any) => s.rotation !== undefined)?.rotation ?? 0);
  if (Math.abs(rot) % 180 === 90) [w, h] = [h, w];
  const [fn, fd] = String(v.avg_frame_rate ?? v.r_frame_rate ?? '0/1').split('/').map(Number);
  const fps = fd ? fn / fd : 0;
  const isImage = v.codec_name === 'mjpeg' || v.codec_name === 'png' || v.codec_name === 'webp' || (duration === 0 && !a);
  return { path: file, kind: isImage ? 'image' : 'video', duration, width: w, height: h, fps, hasAudio: !!a };
}

export function cacheFileFor(file: string, fps: number): string {
  const st = fs.statSync(file);
  const key = crypto.createHash('sha1').update(`${path.resolve(file)}|${st.size}|${st.mtimeMs}|${fps}|v1`).digest('hex').slice(0, 16);
  return key;
}

/** Kich thuoc cache: gioi han canh dai <= 1920, chan. */
export function cacheSize(w: number, h: number): { w: number; h: number } {
  const k = Math.min(1, MAX_LONG_EDGE / Math.max(w, h));
  const even = (x: number) => Math.max(2, Math.round((x * k) / 2) * 2);
  return { w: even(w), h: even(h) };
}

export interface CacheResult {
  file: string;
  width: number;
  height: number;
  frames: number;
}

/** Tao cache bang NVENC. Tra ve ham huy qua `onSpawn`. */
export function buildCache(src: string, m: Omit<Media, 'id'>, fps: number, cacheDir: string, onProgress: (p: number) => void, onSpawn: (kill: () => void) => void): Promise<CacheResult> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, cacheFileFor(src, fps) + '.h264');
  const { w, h } = cacheSize(m.width, m.height);
  if (fs.existsSync(file) && fs.existsSync(file + '.json')) {
    const meta = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
    onProgress(1);
    return Promise.resolve({ file, ...meta });
  }
  const tmp = file + '.part';
  const vf = `fps=${fps},scale=${w}:${h}:flags=bicubic:out_color_matrix=bt709:out_range=tv,format=yuv420p`;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-map', '0:v:0', '-an', '-vf', vf,
    '-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '18', '-b:v', '0', '-bf', '0', '-g', String(CACHE_GOP), '-forced-idr', '1',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-bsf:v', 'h264_metadata=aud=insert', '-f', 'h264', tmp, '-progress', 'pipe:1', '-nostats',
  ];
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    onSpawn(() => p.kill());
    let err = '';
    let frames = 0;
    p.stderr.on('data', (d) => (err += d));
    p.stdout.on('data', (d: Buffer) => {
      for (const line of d.toString().split(/\r?\n/)) {
        const mm = /^frame=(\d+)/.exec(line);
        if (mm) {
          frames = Number(mm[1]);
          if (m.duration > 0) onProgress(Math.min(0.99, frames / Math.max(1, m.duration * fps)));
        }
      }
    });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) {
        fs.rmSync(tmp, { force: true });
        return reject(new Error(`ffmpeg cache loi (ma ${code}): ${err.trim().slice(-400)}`));
      }
      fs.renameSync(tmp, file);
      const meta = { width: w, height: h, frames };
      fs.writeFileSync(file + '.json', JSON.stringify(meta));
      resolve({ file, ...meta });
    });
  });
}

/** Giai ma tieng ra WAV 48k stereo 16-bit de phat va ve waveform. Tra ve duong dan file. */
export function buildAudioCache(src: string, cacheDir: string, onSpawn: (kill: () => void) => void): Promise<string> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, cacheFileFor(src, 0) + '.wav');
  if (fs.existsSync(file)) return Promise.resolve(file);
  const tmp = file + '.part';
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vn', '-map', '0:a:0', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', tmp], { stdio: ['ignore', 'ignore', 'pipe'] });
    onSpawn(() => p.kill());
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) {
        fs.rmSync(tmp, { force: true });
        return reject(new Error(`ffmpeg tieng loi (ma ${code}): ${err.trim().slice(-300)}`));
      }
      fs.renameSync(tmp, file);
      resolve(file);
    });
  });
}
