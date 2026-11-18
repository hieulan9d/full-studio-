// Kho SFX + nhac co tag. Quet thu muc (de quy), tag tu ten file/thu muc, sua tag luu rieng. Xem CHUC-NANG.md F-33.
import { execFile } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LibItem } from '../core/sfx';

const EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const STOP = new Set(['mixkit', 'a', 'b', 'c', 'd', 'e', 'v', 'sfx', 'audio', 'sound', 'new', 'track', 'music', 'stock']);
const ALIAS: Record<string, string> = { swoosh: 'whoosh', woosh: 'whoosh', hit: 'impact', boom: 'impact', beep: 'tick', keyboard: 'typing', type: 'typing' };

function probeDuration(file: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(process.env.FFPROBE_PATH ?? 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], (err, out) => resolve(err ? 0 : Number(String(out).trim()) || 0));
  });
}

export function tagsFor(file: string, kind: 'sfx' | 'music'): string[] {
  const stem = path.basename(file).replace(/\.[^.]+$/, '').toLowerCase();
  const toks = stem.split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t) && !/^[0-9]+$/.test(t));
  const tags = new Set<string>([kind]);
  for (const t of toks) {
    tags.add(t);
    if (ALIAS[t]) tags.add(ALIAS[t]);
  }
  return [...tags];
}

export class Library {
  items: LibItem[] = [];
  dirs: string[] = [];
  scanning = false;
  private overrides: Record<string, string[]> = {};
  constructor(private file: string) {
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.dirs = j.dirs ?? [];
      this.overrides = j.overrides ?? {};
    } catch {
      /* lan dau */
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ dirs: this.dirs, overrides: this.overrides }, null, 1));
    } catch {
      /* khong luu duoc cung khong sao */
    }
  }

  addDir(dir: string) {
    const d = path.resolve(dir);
    if (!this.dirs.includes(d)) this.dirs.push(d);
    this.save();
  }

  removeDir(dir: string) {
    this.dirs = this.dirs.filter((d) => d.toLowerCase() !== path.resolve(dir).toLowerCase());
    this.save();
  }

  async scanAll(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const out: LibItem[] = [];
      for (const dir of this.dirs) {
        if (!fs.existsSync(dir)) continue;
        const bpms: Record<string, { bpm?: number }> = {};
        const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : EXT.test(e.name) ? [path.join(d, e.name)] : []));
        for (const f of walk(dir)) {
          const dur = await probeDuration(f);
          if (!(dur > 0)) continue;
          const lower = f.toLowerCase().split(path.sep).join('/');
          const kind: 'sfx' | 'music' = lower.includes('/music/') || dur > 20 ? 'music' : 'sfx';
          const id = crypto.createHash('sha1').update(path.resolve(f)).digest('hex').slice(0, 10);
          const idxFile = path.join(path.dirname(f), 'index.json');
          if (kind === 'music' && fs.existsSync(idxFile) && !bpms[idxFile]) {
            try {
              bpms[idxFile] = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
            } catch {
              bpms[idxFile] = {};
            }
          }
          const bpm = kind === 'music' ? (bpms[idxFile] as Record<string, { bpm?: number }> | undefined)?.[path.basename(f)]?.bpm : undefined;
          // cung mot file co the nam o hai ban sao cua kit: bo trung theo (ten file, do dai)
          if (out.some((x) => x.path.toLowerCase().endsWith(path.basename(f).toLowerCase()) && Math.abs(x.duration - dur) < 0.01)) continue;
          out.push({ id, name: path.basename(f).replace(/\.[^.]+$/, ''), kind, path: path.resolve(f), tags: this.overrides[id] ?? tagsFor(f, kind), duration: Math.round(dur * 1000) / 1000, bpm, note: path.relative(dir, path.dirname(f)) || path.basename(dir) });
        }
      }
      this.items = out;
    } finally {
      this.scanning = false;
    }
  }

  list(f: { kind?: string; tag?: string; q?: string }): LibItem[] {
    const q = f.q?.toLowerCase();
    return this.items.filter((i) => (!f.kind || i.kind === f.kind) && (!f.tag || i.tags.includes(f.tag.toLowerCase())) && (!q || i.name.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q))));
  }

  setTags(id: string, tags: string[]): boolean {
    const it = this.items.find((x) => x.id === id);
    if (!it) return false;
    it.tags = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    this.overrides[id] = it.tags;
    this.save();
    return true;
  }
}
