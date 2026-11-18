// Xuat video: renderer day khung RGBA qua IPC -> ffmpeg NVENC (+ tron am thanh). Xem CHUC-NANG.md F-11.
import { spawn, type ChildProcess } from 'node:child_process';
import { volumeExpr } from '../core/anim';
import type { Project } from '../core/schema';
import { isVariableSpeed } from '../core/speed';
import { FFMPEG } from './media';

export interface AudioPlan {
  inputs: string[]; // duong dan file nguon
  filter: string; // filter_complex, rong neu khong co am thanh
  map: string | null; // nhan filter dau ra, vd [aout]
}

/** Dung do thi am thanh tu cac clip (video co tieng + track audio). Dung file GOC, khong dung cache. */
export interface LoudnessTarget {
  I: number; // LUFS muc tieu, vd -14
  measured: { input_i: number; input_tp: number; input_lra: number; input_thresh: number; target_offset: number };
}

/** atempo chi nhan 0.5..2 (an toan): tach toc do bat ky thanh chuoi. Giu cao do. */
export function atempoChain(speed: number): string {
  const parts: number[] = [];
  let s = speed;
  while (s > 2 + 1e-9) {
    parts.push(2);
    s /= 2;
  }
  while (s < 0.5 - 1e-9) {
    parts.push(0.5);
    s /= 0.5;
  }
  parts.push(s);
  return parts.map((x) => `atempo=${x.toFixed(6)}`).join(',');
}

export function buildAudioPlan(p: Project, videoInputs: number, ln?: LoudnessTarget): AudioPlan {
  const inputs: string[] = [];
  const idx = new Map<string, number>();
  const parts: string[] = [];
  const labels: string[] = [];
  for (const c of p.clips) {
    if (c.src.type !== 'media' || c.disabled || c.volume <= 0 || isVariableSpeed(c)) continue; // clip vo hieu hoa / speed ramp: tat tieng
    const mediaId = c.src.mediaId;
    const m = p.media.find((x) => x.id === mediaId);
    if (!m || !m.hasAudio) continue;
    const tr = p.tracks.find((t) => t.id === c.track);
    if (!tr) continue;
    if (!idx.has(m.path)) {
      idx.set(m.path, videoInputs + inputs.length);
      inputs.push(m.path);
    }
    const k = idx.get(m.path)!;
    const label = `a${labels.length}`;
    const ms = Math.round(c.start * 1000);
    const sp = c.speed ?? 1;
    const tempo = Math.abs(sp - 1) < 1e-9 ? '' : atempoChain(sp) + ',';
    parts.push(`[${k}:a:0]atrim=start=${c.in.toFixed(6)}:duration=${(c.duration * sp).toFixed(6)},asetpts=PTS-STARTPTS,${tempo}${c.keyframes?.volume?.length ? `volume='${volumeExpr(c.keyframes.volume)}':eval=frame` : `volume=${c.volume}`},aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}:all=1[${label}]`);
    labels.push(`[${label}]`);
  }
  if (!labels.length) return { inputs, filter: '', map: null };
  const mix = labels.length === 1 ? `${labels[0]}anull[aout]` : `${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest[aout]`;
  if (ln) {
    const m = ln.measured;
    // chuan hoa tuyen tinh (2 luot: da do san) de khong lam meo dong
    const norm = `[aout]loudnorm=I=${ln.I}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_LRA=${m.input_lra}:measured_TP=${m.input_tp}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true[aln]`;
    return { inputs, filter: [...parts, mix, norm].join(';'), map: '[aln]' };
  }
  return { inputs, filter: [...parts, mix].join(';'), map: '[aout]' };
}

export interface ExportSession {
  proc: ChildProcess;
  writeFrame(buf: Buffer): Promise<void>;
  finish(): Promise<void>;
  kill(): void;
  stderr(): string;
}

export function startFfmpeg(p: Project, width: number, height: number, outPath: string, totalSec: number, ln?: LoudnessTarget): ExportSession {
  const audio = buildAudioPlan(p, 1, ln);
  const args = ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'nv12', '-color_range', 'tv', '-colorspace', 'bt709', '-s', `${width}x${height}`, '-r', String(p.fps), '-i', 'pipe:0'];
  for (const f of audio.inputs) args.push('-i', f);
  if (audio.filter) args.push('-filter_complex', audio.filter, '-map', '0:v:0', '-map', audio.map!);
  args.push(
    '-pix_fmt', 'nv12', // GPU da doi sang NV12 BT.709 limited; khong doi mau tren CPU
    '-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '19', '-b:v', '0', '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  );
  if (audio.filter) args.push('-c:a', 'aac', '-b:a', '192k');
  args.push('-t', totalSec.toFixed(6), '-movflags', '+faststart', outPath);

  const proc = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr!.on('data', (d) => (err += d));
  proc.stdin!.on('error', () => {}); // ffmpeg bi kill/thoat som: ghi vao stdin se loi EPIPE/EOF, khong duoc lam sap tien trinh chinh
  const closed = new Promise<void>((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ma ${code}: ${err.trim().slice(-500)}`))));
  });
  closed.catch(() => {}); // tranh unhandled neu ket thuc som; loi duoc bao khi finish()
  return {
    proc,
    writeFrame: (buf) =>
      new Promise((resolve, reject) => {
        if (proc.exitCode !== null) return reject(new Error(`ffmpeg da thoat: ${err.trim().slice(-300)}`));
        const ok = proc.stdin!.write(buf, (e) => (e ? reject(e) : undefined));
        if (ok) resolve();
        else proc.stdin!.once('drain', () => resolve());
      }),
    finish: () => {
      proc.stdin!.end();
      return closed;
    },
    kill: () => proc.kill(),
    stderr: () => err,
  };
}

/** Ghi lop phu trong suot: khung RGBA thang (straight) -> .mov qtrle co alpha. Khung rong (0 byte) = khung trong suot hoan toan. */
export function startOverlayFfmpeg(width: number, height: number, fps: number, outPath: string): ExportSession {
  const args = ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0', '-an', '-c:v', 'qtrle', '-pix_fmt', 'argb', outPath];
  const proc = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr!.on('data', (d) => (err += d));
  proc.stdin!.on('error', () => {});
  const blank = Buffer.alloc(width * height * 4);
  const closed = new Promise<void>((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ma ${code}: ${err.trim().slice(-500)}`))));
  });
  closed.catch(() => {});
  return {
    proc,
    writeFrame: (buf) =>
      new Promise((resolve, reject) => {
        if (proc.exitCode !== null) return reject(new Error(`ffmpeg da thoat: ${err.trim().slice(-300)}`));
        const ok = proc.stdin!.write(buf.length === 0 ? blank : buf, (e) => (e ? reject(e) : undefined));
        if (ok) resolve();
        else proc.stdin!.once('drain', () => resolve());
      }),
    finish: () => {
      proc.stdin!.end();
      return closed;
    },
    kill: () => proc.kill(),
    stderr: () => err,
  };
}
