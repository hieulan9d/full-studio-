// Phat am thanh bang AudioContext (dong ho chinh cua phat lai) + waveform. Xem CHUC-NANG.md F-09.
import { evalTrack } from '../core/anim';
import type { Project } from '../core/schema';
import { isVariableSpeed } from '../core/speed';

const BUCKET = 480; // 100 muc/giay o 48 kHz

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<void>>();
  readonly peaks = new Map<string, Float32Array>(); // do lon lon nhat moi 10 ms
  private sources: AudioBufferSourceNode[] = [];
  private playing = false;
  private t0Ctx = 0; // thoi gian cua AudioContext luc bat dau phat
  private tStart = 0; // moc timeline luc bat dau phat
  private lastT = 0;
  onPeaks: () => void = () => {};

  private master: GainNode | null = null;
  private anL: AnalyserNode | null = null;
  private anR: AnalyserNode | null = null;
  private bufL = new Float32Array(2048);
  private bufR = new Float32Array(2048);
  private peakHold = { l: -Infinity, r: -Infinity, tl: 0, tr: 0 };

  private get c(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 48000 });
      // chuỗi tổng: nguồn -> master -> loa; nhánh đo trái/phải (không đổi âm thanh)
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      const sp = this.ctx.createChannelSplitter(2);
      this.anL = this.ctx.createAnalyser();
      this.anR = this.ctx.createAnalyser();
      this.anL.fftSize = this.anR.fftSize = 2048;
      this.anL.smoothingTimeConstant = this.anR.smoothingTimeConstant = 0;
      this.master.connect(sp);
      sp.connect(this.anL, 0);
      sp.connect(this.anR, 1);
    }
    return this.ctx;
  }

  /** Mức âm lượng hiện tại tai trái/phải (dBFS): rms, đỉnh trong khung này và đỉnh giữ 1,5 s. -Infinity = im lặng. */
  levels(): { l: number; r: number; pl: number; pr: number; hl: number; hr: number } {
    if (!this.anL || !this.anR) return { l: -Infinity, r: -Infinity, pl: -Infinity, pr: -Infinity, hl: -Infinity, hr: -Infinity };
    this.anL.getFloatTimeDomainData(this.bufL);
    this.anR.getFloatTimeDomainData(this.bufR);
    const m = (b: Float32Array) => {
      let sq = 0,
        pk = 0;
      for (let i = 0; i < b.length; i++) {
        const v = Math.abs(b[i]);
        sq += v * v;
        if (v > pk) pk = v;
      }
      return { rms: Math.sqrt(sq / b.length), pk };
    };
    const a = m(this.bufL),
      b = m(this.bufR);
    const db = (x: number) => (x > 1e-6 ? 20 * Math.log10(x) : -Infinity);
    const now = performance.now();
    const pl = db(a.pk),
      pr = db(b.pk);
    if (pl >= this.peakHold.l || now - this.peakHold.tl > 1500) this.peakHold = { ...this.peakHold, l: pl, tl: now };
    if (pr >= this.peakHold.r || now - this.peakHold.tr > 1500) this.peakHold = { ...this.peakHold, r: pr, tr: now };
    return { l: db(a.rms), r: db(b.rms), pl, pr, hl: this.peakHold.l, hr: this.peakHold.r };
  }

  /** Giai ma truoc WAV cua cac media da san sang (idempotent). */
  async ensure(p: Project): Promise<void> {
    const todo: Promise<void>[] = [];
    for (const m of p.media) {
      if (m.cache?.audio !== 'ready' || this.buffers.has(m.id)) continue;
      let job = this.loading.get(m.id);
      if (!job) {
        job = (async () => {
          const bytes = await window.toolEdit.readAudio(m.id);
          const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
          const buf = await this.c.decodeAudioData(ab);
          this.buffers.set(m.id, buf);
          this.peaks.set(m.id, computePeaks(buf));
          this.onPeaks();
        })().finally(() => this.loading.delete(m.id));
        this.loading.set(m.id, job);
      }
      todo.push(job);
    }
    await Promise.all(todo);
  }

  forget(p: Project) {
    const ids = new Set(p.media.map((m) => m.id));
    for (const id of [...this.buffers.keys()]) {
      if (!ids.has(id)) {
        this.buffers.delete(id);
        this.peaks.delete(id);
      }
    }
  }

  get state(): string {
    return this.ctx?.state ?? 'chua-tao';
  }

  /** Thoi diem hien tai tren timeline (giay). Khi dang phat lay theo dong ho am thanh. */
  time(): number {
    if (!this.playing) return this.lastT;
    this.lastT = this.tStart + (this.c.currentTime - this.t0Ctx);
    return this.lastT;
  }

  async play(p: Project, from: number): Promise<void> {
    await this.ensure(p);
    await this.c.resume();
    this.stopSources();
    const ctx = this.c;
    const now = ctx.currentTime + 0.05; // tre nho de kip len lich
    for (const c of p.clips) {
      if (c.src.type !== 'media' || c.disabled || c.volume <= 0 || isVariableSpeed(c)) continue; // clip vo hieu hoa / speed ramp: tat tieng (chua keo gian am thanh theo duong cong)
      const sp = c.speed ?? 1; // toc do co dinh: phat bang playbackRate (doi cao do khi nghe thu; ban xuat giu cao do)
      const buf = this.buffers.get(c.src.mediaId);
      if (!buf) continue;
      const end = c.start + c.duration;
      if (end <= from) continue;
      const skip = Math.max(0, from - c.start);
      const when = now + Math.max(0, c.start - from);
      const offset = c.in + skip * sp;
      const dur = c.duration - skip; // giay tren timeline
      if (offset >= buf.duration) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const vk = c.keyframes?.volume;
      if (vk?.length) {
        // am luong theo keyframe: lich gain 25 mau/giay trong phan clip se phat (noi suy tuyen tinh giua cac mau)
        const t0 = skip;
        g.gain.setValueAtTime(evalTrack(vk, t0), when);
        for (let tl = t0; tl < c.duration + 0.04; tl += 0.04) g.gain.linearRampToValueAtTime(Math.max(0, evalTrack(vk, Math.min(tl, c.duration))), when + (tl - t0));
      } else g.gain.value = c.volume;
      src.connect(g).connect(this.master!);
      src.playbackRate.value = sp;
      src.start(when, offset);
      src.stop(when + Math.min(dur, (buf.duration - offset) / sp));
      this.sources.push(src);
    }
    this.tStart = from;
    this.t0Ctx = now;
    this.lastT = from;
    this.playing = true;
  }

  private stopSources() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* da dung */
      }
    }
    this.sources = [];
  }

  pause(): number {
    const t = this.time();
    this.stopSources();
    this.playing = false;
    this.lastT = t;
    return t;
  }

  seek(t: number) {
    this.lastT = t;
  }
}

function computePeaks(buf: AudioBuffer): Float32Array {
  const n = Math.ceil(buf.length / BUCKET);
  const out = new Float32Array(n);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      let mx = out[i];
      const s = i * BUCKET,
        e = Math.min(d.length, s + BUCKET);
      for (let k = s; k < e; k += 4) {
        const v = Math.abs(d[k]);
        if (v > mx) mx = v;
      }
      out[i] = mx;
    }
  }
  return out;
}

export const audio = new AudioEngine();
export const PEAKS_PER_SEC = 100;
