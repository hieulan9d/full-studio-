// Tieng Viet: tap ky tu co dau va canh bao font thieu glyph. Thuan tuy, co test. Xem F-20.
import type { Project } from './schema';

const LOWER = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
export const VN_CHARS: string[] = [...new Set([...LOWER, ...LOWER.toUpperCase()])];
const VN_SET = new Set(VN_CHARS);

/** Chuoi co chua chu tieng Viet co dau (da chuan hoa NFC) khong. */
export function hasVietnameseDiacritics(s: string): boolean {
  for (const ch of s.normalize('NFC')) if (VN_SET.has(ch)) return true;
  return false;
}

export interface FontLookup {
  /** null = font khong co trong may; nguoc lai true/false = co day du glyph tieng Viet hay khong */
  vietnamese(family: string): boolean | null;
}

export interface Warning {
  clip: string;
  level: 'error' | 'warn';
  code: 'font-missing' | 'font-no-vietnamese';
  message: string;
}

export function projectWarnings(p: Project, fonts: FontLookup | null): Warning[] {
  const out: Warning[] = [];
  if (!fonts) return out;
  for (const c of p.clips) {
    if (c.src.type !== 'text') continue;
    const t = c.src.text;
    const vn = fonts.vietnamese(t.font);
    if (vn === null) out.push({ clip: c.id, level: 'warn', code: 'font-missing', message: `clip ${c.id}: font "${t.font}" khong co trong may, se bi thay bang font mac dinh` });
    else if (vn === false && hasVietnameseDiacritics(t.content)) out.push({ clip: c.id, level: 'error', code: 'font-no-vietnamese', message: `clip ${c.id}: font "${t.font}" THIEU glyph tieng Viet co dau; chu se hien sai hoac bi thay font. Chon font khac (xem list_fonts voi vietnamese=true)` });
  }
  return out;
}
