// Quet font he thong + font nguoi dung, kiem glyph tieng Viet bang bang ky tu (cmap) cua tung file. Xem CHUC-NANG.md F-20.
import * as fs from 'node:fs';
import * as path from 'node:path';
import opentype from 'opentype.js';
import { VN_CHARS } from '../core/vn';

export interface FaceInfo {
  family: string;
  style: string;
  weight: number;
  italic: boolean;
  file: string;
  vietnamese: boolean;
  user: boolean; // thu muc font cua nguoi dung
}

export interface FamilyInfo {
  family: string;
  vietnamese: boolean; // moi kieu chu deu co du glyph
  weights: number[];
  italic: boolean;
  user: boolean;
  faces: number;
}

interface CacheEntry {
  size: number;
  mtime: number;
  face: FaceInfo | null;
}

const MAX_BYTES = 30 * 1024 * 1024;
const VERSION = 1;

export class FontIndex {
  faces: FaceInfo[] = [];
  scanning = false;
  progress = 0;
  scanned = 0;
  errors = 0;
  private cacheFile: string;
  constructor(cacheDir: string) {
    this.cacheFile = path.join(cacheDir, 'fonts-index.json');
  }

  dirs(): { dir: string; user: boolean }[] {
    const win = process.env.WINDIR ?? 'C:\\Windows';
    const local = process.env.LOCALAPPDATA ?? '';
    return [
      { dir: path.join(win, 'Fonts'), user: false },
      ...(local ? [{ dir: path.join(local, 'Microsoft', 'Windows', 'Fonts'), user: true }] : []),
    ];
  }

  async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.progress = 0;
    this.errors = 0;
    let cache: Record<string, CacheEntry> = {};
    try {
      const raw = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      if (raw.version === VERSION) cache = raw.entries;
    } catch {
      /* chua co cache */
    }
    const files: { file: string; user: boolean }[] = [];
    for (const { dir, user } of this.dirs()) {
      try {
        for (const f of fs.readdirSync(dir)) if (/\.(ttf|otf)$/i.test(f)) files.push({ file: path.join(dir, f), user });
      } catch {
        /* thu muc khong co */
      }
    }
    const next: Record<string, CacheEntry> = {};
    const faces: FaceInfo[] = [];
    for (let i = 0; i < files.length; i++) {
      const { file, user } = files[i];
      try {
        const st = fs.statSync(file);
        const hit = cache[file];
        if (hit && hit.size === st.size && hit.mtime === st.mtimeMs) {
          next[file] = hit;
          if (hit.face) faces.push({ ...hit.face, user });
        } else {
          const face = st.size > MAX_BYTES ? null : parseFace(file, user);
          next[file] = { size: st.size, mtime: st.mtimeMs, face };
          if (face) faces.push(face);
        }
      } catch {
        this.errors++;
      }
      this.progress = (i + 1) / files.length;
      if (i % 8 === 0) await new Promise((r) => setImmediate(r)); // nhuong luong cho tien trinh chinh
    }
    this.faces = faces;
    this.scanned = files.length;
    try {
      fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
      fs.writeFileSync(this.cacheFile, JSON.stringify({ version: VERSION, entries: next }));
    } catch {
      /* khong luu cache cung khong sao */
    }
    this.scanning = false;
    this.progress = 1;
  }

  families(): FamilyInfo[] {
    const map = new Map<string, FaceInfo[]>();
    for (const f of this.faces) {
      const k = f.family;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(f);
    }
    return [...map.entries()]
      .map(([family, fs2]) => ({
        family,
        vietnamese: fs2.every((f) => f.vietnamese),
        weights: [...new Set(fs2.map((f) => f.weight))].sort((a, b) => a - b),
        italic: fs2.some((f) => f.italic),
        user: fs2.some((f) => f.user),
        faces: fs2.length,
      }))
      .sort((a, b) => a.family.localeCompare(b.family));
  }

  /** true/false: co day du glyph tieng Viet hay khong; null: khong co font nay. (Chua quet xong thi null.) */
  vietnamese(family: string): boolean | null {
    const k = family.trim().toLowerCase();
    const fs2 = this.faces.filter((f) => f.family.toLowerCase() === k);
    if (!fs2.length) return null;
    return fs2.every((f) => f.vietnamese);
  }
}

function parseFace(file: string, user: boolean): FaceInfo | null {
  try {
    const b = fs.readFileSync(file);
    const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    const n: any = (font.names as any).windows ?? font.names;
    const pick = (o: any) => (o ? (o.en ?? Object.values(o)[0]) : undefined) as string | undefined;
    const family = pick(n.fontFamily);
    if (!family) return null;
    const style = pick(n.fontSubfamily) ?? 'Regular';
    const os2: any = (font.tables as any).os2;
    const head: any = (font.tables as any).head;
    const weight = os2?.usWeightClass ?? 400;
    const italic = /italic|oblique/i.test(style) || !!(head?.macStyle & 2);
    const vietnamese = VN_CHARS.every((ch) => font.charToGlyphIndex(ch) > 0);
    return { family, style, weight, italic, file, vietnamese, user };
  } catch {
    return null;
  }
}
