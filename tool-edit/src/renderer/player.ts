// Phat lai + ve preview. Dong ho chinh = AudioContext; hinh theo dong ho do, bo khung khi cham.
import { timelineEnd, type Project } from '../core/schema';
import { audio } from './audio';
import { renderPreview, stats } from './engine';
import { applyLive, bindLive } from './live';
import { store } from './store';

class Player {
  private canvas: HTMLCanvasElement | null = null;
  private rendering = false;
  private again = false;
  private raf = 0;
  lastProject: Project | null = null;

  constructor() {
    bindLive(() => this.requestRender());
  }

  attach(cv: HTMLCanvasElement | null) {
    this.canvas = cv;
    this.requestRender();
  }

  private current(): Project {
    const s = store.get();
    return applyLive(s.draft?.project ?? s.project, s.live);
  }

  requestRender() {
    if (this.rendering) {
      this.again = true;
      return;
    }
    this.rendering = true;
    void (async () => {
      try {
        do {
          this.again = false;
          const cv = this.canvas;
          if (!cv) break;
          const s = store.get();
          const t = s.playing ? audio.time() : s.playhead;
          try {
            await renderPreview(cv, this.current(), t, s.aspect, s.viewMode);
            if (s.previewError) store.set({ previewError: null });
          } catch (e) {
            const msg = String((e as Error).message ?? e);
            if (store.get().previewError !== msg) store.set({ previewError: msg });
          }
        } while (this.again);
      } finally {
        this.rendering = false;
      }
    })();
  }

  get end(): number {
    return timelineEnd(this.current());
  }

  async play() {
    const s = store.get();
    if (s.playing) return;
    const end = this.end;
    if (end <= 0) return;
    let from = s.playhead;
    if (from >= end - 1e-3) from = 0;
    try {
      await audio.play(this.current(), from);
    } catch (e) {
      store.set({ previewError: 'Khong phat duoc tieng: ' + String((e as Error).message ?? e) });
    }
    store.set({ playing: true, playhead: from });
    this.loop();
  }

  private loop = () => {
    const s = store.get();
    if (!s.playing) return;
    const t = audio.time();
    if (t >= this.end) {
      this.pause(this.end);
      return;
    }
    store.set({ playhead: t });
    this.requestRender();
    this.raf = requestAnimationFrame(this.loop);
  };

  pause(at?: number) {
    cancelAnimationFrame(this.raf);
    const t = audio.pause();
    store.set({ playing: false, playhead: at ?? t });
    this.requestRender();
  }

  toggle() {
    if (store.get().playing) this.pause();
    else void this.play();
  }

  seek(t: number) {
    const tt = Math.max(0, t);
    audio.seek(tt);
    if (store.get().playing) {
      void audio.play(this.current(), tt);
    }
    store.set({ playhead: tt });
    this.requestRender();
  }

  /** Du an doi trong luc dang phat: dat lai lich am thanh tu vi tri hien tai. */
  projectChanged() {
    const s = store.get();
    if (s.playing) {
      const t = audio.time();
      void audio.play(this.current(), t);
    }
    this.requestRender();
  }
}

export const player = new Player();
export { stats };
