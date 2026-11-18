// Phien lam viec: giu du an, ap dung op atomic, hoan tac/lam lai. Xem CHUC-NANG.md F-04.
import { EASE_PRESETS, easeFromName, isAnimatable, removeKeyAt, shiftKeys, splitKeys, upsertKey } from './anim';
import { mergeGrade } from './grade';
import { defaultShape, FX_NAMES, fxIsEmpty, mergeFx, mergeShape } from './fx';
import { hasSpeed, isVariableSpeed, srcTimeAt, SPEED_MAX, SPEED_MIN } from './speed';
import { buildCaptions, captionClipsOf, CAPTION_TAG } from './captions';
import { applyPresetToClip } from './presets';
import { DEFAULT_MATTE, DEFAULT_TRANSFORM, MediaCache, Op, Project, newProject, validate } from './schema';
import { defaultText, mergeText } from './text';
import { duckKeyframes, speechRanges } from './transcript';

export interface ApplyResult {
  ok: boolean;
  errors: string[];
  seq?: number;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export class Session {
  project: Project;
  private undoStack: Project[] = []; // snapshot ca du an (du an nho). Doi sang op nghich dao neu du an lon.
  private redoStack: Project[] = [];
  private seq = 0;
  private lastCoalesce: string | null = null; // khoa cu chi cuoi (keo chuot / go vao o): cung khoa thi gop mot buoc hoan tac

  constructor(p: Project = newProject()) {
    this.project = p;
  }

  /** Ap dung mot batch op. Atomic: loi o bat ky op nao thi khong doi gi. */
  apply(ops: Op[], source: string, coalesce?: string): ApplyResult {
    const draft = clone(this.project);
    for (const o of ops) {
      const err = applyOne(draft, o);
      if (err) return { ok: false, errors: [err] };
    }
    const errs = validate(draft);
    if (errs.length) return { ok: false, errors: errs };
    // Gop: lan ap truoc cung khoa (cung nguon) thi KHONG them buoc hoan tac, chi thay ket qua + thay muc lich su cuoi.
    const merge = !!coalesce && coalesce === this.lastCoalesce && this.undoStack.length > 0 && this.project.history.length > 0 && this.project.history[this.project.history.length - 1].source === source;
    if (merge) {
      const last = this.project.history[this.project.history.length - 1];
      draft.history = draft.history.slice(0, -1);
      draft.history.push({ seq: last.seq, source, time: new Date().toISOString(), ops: clone(ops) });
      this.project = draft;
      return { ok: true, errors: [], seq: last.seq };
    }
    this.undoStack.push(this.project);
    this.redoStack = [];
    this.seq += 1;
    draft.history.push({ seq: this.seq, source, time: new Date().toISOString(), ops: clone(ops) });
    this.project = draft;
    this.lastCoalesce = coalesce ?? null;
    return { ok: true, errors: [], seq: this.seq };
  }

  /** Kiem tra op co hop le khong ma KHONG ap dung (dung cho de xuat cho duyet). */
  dryRun(ops: Op[]): string[] {
    const draft = clone(this.project);
    for (const o of ops) {
      const err = applyOne(draft, o);
      if (err) return [err];
    }
    return validate(draft);
  }

  /** Du an sau khi ap dung ops tren ban sao (khong doi du an that). null + loi neu sai. */
  draftOf(ops: Op[]): { project: Project | null; errors: string[] } {
    const draft = clone(this.project);
    for (const o of ops) {
      const err = applyOne(draft, o);
      if (err) return { project: null, errors: [err] };
    }
    const errs = validate(draft);
    return errs.length ? { project: null, errors: errs } : { project: draft, errors: [] };
  }

  /** Thay ca du an (mo file / dung moi). Xoa lich su hoan tac. */
  load(p: Project) {
    this.lastCoalesce = null;
    this.project = p;
    this.undoStack = [];
    this.redoStack = [];
    this.seq = p.history.length ? p.history[p.history.length - 1].seq : 0;
  }

  /** Cache media (dan xuat): gop mot phan vao ban ghi hien co o moi ban (hien tai, undo, redo). */
  patchMediaCache(mediaId: string, patch: Partial<MediaCache>): boolean {
    for (const stack of [[this.project], this.undoStack, this.redoStack]) {
      for (const p of stack) {
        const m = p.media.find((x) => x.id === mediaId);
        if (m) m.cache = { ...(m.cache ?? { status: 'pending' }), ...patch };
      }
    }
    return this.project.media.some((m) => m.id === mediaId);
  }

  // ---- snapshot co ten (F-71) ----
  private snaps = new Map<string, { time: string; project: Project }>();

  snapshot(name: string): void {
    this.snaps.set(name, { time: new Date().toISOString(), project: clone(this.project) });
  }

  listSnapshots(): { name: string; time: string; clips: number }[] {
    return [...this.snaps].map(([name, v]) => ({ name, time: v.time, clips: v.project.clips.length }));
  }

  /** Khoi phuc snapshot nhu mot thay doi co the hoan tac. Giu nguyen cache media hien tai. */
  restoreSnapshot(name: string): boolean {
    const sn = this.snaps.get(name);
    if (!sn) return false;
    this.lastCoalesce = null;
    const restored = clone(sn.project);
    for (const m of restored.media) {
      const cur = this.project.media.find((x) => x.id === m.id);
      if (cur?.cache) m.cache = clone(cur.cache);
    }
    this.undoStack.push(this.project);
    this.redoStack = [];
    this.seq += 1;
    restored.history = [...this.project.history, { seq: this.seq, source: 'human', time: new Date().toISOString(), ops: [] }];
    this.project = restored;
    return true;
  }

  /** Cap nhat du lieu dan xuat (cache media): khong vao lich su, khong hoan tac duoc. */
  setMediaCache(mediaId: string, cache: MediaCache): boolean {
    for (const stack of [[this.project], this.undoStack, this.redoStack]) {
      for (const p of stack) {
        const m = p.media.find((x) => x.id === mediaId);
        if (m) m.cache = clone(cache);
      }
    }
    return this.project.media.some((m) => m.id === mediaId);
  }

  undo(): boolean {
    this.lastCoalesce = null;
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(this.project);
    this.project = prev;
    return true;
  }

  redo(): boolean {
    this.lastCoalesce = null;
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.project);
    this.project = next;
    return true;
  }
}

function applyOne(p: Project, o: Op): string | null {
  switch (o.op) {
    case 'add_media': {
      const m = clone(o.media);
      delete m.cache; // cache duoc quan ly rieng
      p.media.push(m);
      return null;
    }
    case 'add_track':
      p.tracks.push(clone(o.track));
      return null;
    case 'remove_track': {
      const i = p.tracks.findIndex((t) => t.id === o.id);
      if (i < 0) return `khong co track ${o.id}`;
      if (p.clips.some((c) => c.track === o.id)) return `track ${o.id} con clip, khong go duoc`;
      p.tracks.splice(i, 1);
      return null;
    }
    case 'add_clip': {
      const c = clone(o.clip);
      c.transform = { ...DEFAULT_TRANSFORM, ...(c.transform ?? {}) };
      if (c.volume === undefined) c.volume = 1;
      if (c.in === undefined) c.in = 0;
      c.keyframes = c.keyframes ?? {};
      if (c.src.type === 'text') c.src.text = mergeText(defaultText(), c.src.text); // cho phep gui chi phan can doi
      if (c.src.type === 'shape') c.src.shape = mergeShape(defaultShape(c.src.shape?.kind), c.src.shape);
      p.clips.push(c);
      return null;
    }
    case 'remove_clip': {
      const i = p.clips.findIndex((c) => c.id === o.id);
      if (i < 0) return `khong co clip ${o.id}`;
      p.clips.splice(i, 1);
      return null;
    }
    case 'set_clip': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      // keyframe gan voi NOI DUNG: doi `in` (trim dau / truot noi dung) thi thoi gian keyframe lui di cung luong
      if (o.patch.in !== undefined && Math.abs(o.patch.in - c.in) > 1e-9 && isVariableSpeed(c)) return `clip ${o.id} dang co speed ramp: khong trim dau/doi 'in' duoc (dung cat/split de bo doan, hoac xoa keyframe toc do truoc)`;
      if (o.patch.in !== undefined && o.patch.in !== c.in) c.keyframes = shiftKeys(c.keyframes ?? {}, -(o.patch.in - c.in));
      if (o.patch.disabled !== undefined && typeof o.patch.disabled !== 'boolean') return `clip ${o.id}: disabled phai la true/false`;
      Object.assign(c, o.patch);
      if (c.disabled === false) delete c.disabled; // bat lai = bo truong
      return null;
    }
    case 'group_clips': {
      if (!Array.isArray(o.ids) || o.ids.length < 2) return 'group_clips can it nhat 2 clip';
      if (typeof o.group !== 'string' || !o.group) return 'group_clips: group phai la chuoi khong rong';
      const cs = o.ids.map((id) => p.clips.find((x) => x.id === id));
      const miss = o.ids.find((id, i) => !cs[i]);
      if (miss) return `khong co clip ${miss}`;
      for (const c of cs) c!.group = o.group;
      return null;
    }
    case 'ungroup': {
      const cs = p.clips.filter((c) => c.group === o.group);
      if (!cs.length) return `khong co nhom ${o.group}`;
      for (const c of cs) delete c.group;
      return null;
    }
    case 'set_transform': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      Object.assign(c.transform, o.patch);
      return null;
    }
    case 'split_clip': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (!(o.at > c.start && o.at < c.start + c.duration)) return `split_clip: at=${o.at} phai nam trong clip (${c.start}..${c.start + c.duration})`;
      if (p.clips.some((x) => x.id === o.newId)) return `split_clip: id ${o.newId} da ton tai`;
      const first = o.at - c.start;
      const right = clone(c);
      right.id = o.newId;
      right.start = o.at;
      right.duration = c.duration - first;
      right.in = srcTimeAt(c, first); // co toc do: thoi diem nguon tai diem cat
      const sk = splitKeys(c.keyframes ?? {}, first);
      c.keyframes = sk.left;
      right.keyframes = sk.right;
      c.duration = first;
      p.clips.push(right);
      return null;
    }
    case 'ripple_delete': {
      const i = p.clips.findIndex((c) => c.id === o.id);
      if (i < 0) return `khong co clip ${o.id}`;
      const gone = p.clips[i];
      p.clips.splice(i, 1);
      // keo cac clip phia sau tren CUNG track lui lai bang do dai da xoa
      for (const c of p.clips) if (c.track === gone.track && c.start >= gone.start + gone.duration - 1e-6) c.start -= gone.duration;
      return null;
    }
    case 'set_text': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (c.src.type !== 'text') return `clip ${o.id} khong phai clip chu`;
      c.src.text = mergeText(c.src.text, o.patch);
      return null;
    }
    case 'set_keyframes': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (!isAnimatable(o.prop, c)) return `thuoc tinh "${o.prop}" khong keyframe duoc tren clip ${o.id}`;
      c.keyframes = c.keyframes ?? {};
      if (!o.keys.length) delete c.keyframes[o.prop];
      else c.keyframes[o.prop] = clone(o.keys).sort((a, b) => a.t - b.t);
      return null;
    }
    case 'set_keyframe': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (!isAnimatable(o.prop, c)) return `thuoc tinh "${o.prop}" khong keyframe duoc tren clip ${o.id}`;
      c.keyframes = c.keyframes ?? {};
      const cur = c.keyframes[o.prop] ?? [];
      let ease = o.ease ?? null;
      if (!ease && o.ease_preset) {
        ease = easeFromName(o.ease_preset);
        if (!ease) return `ease_preset "${o.ease_preset}" khong co`;
      }
      if (!ease) ease = clone(cur.find((k) => Math.abs(k.t - o.t) < 1e-4)?.ease ?? EASE_PRESETS['ease-in-out']);
      c.keyframes[o.prop] = upsertKey(cur, { t: o.t, v: o.v, ease });
      return null;
    }
    case 'remove_keyframe': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      const cur = c.keyframes?.[o.prop];
      if (!cur || !cur.some((k) => Math.abs(k.t - o.t) < 1e-4)) return `clip ${o.id}.${o.prop}: khong co keyframe tai t=${o.t}`;
      const next = removeKeyAt(cur, o.t);
      if (next.length) c.keyframes[o.prop] = next;
      else delete c.keyframes[o.prop];
      return null;
    }
    case 'apply_preset': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      return applyPresetToClip(c, o.preset);
    }
    case 'set_transcript': {
      const m = p.media.find((x) => x.id === o.mediaId);
      if (!m) return `khong co media ${o.mediaId}`;
      m.transcript = clone(o.transcript);
      return null;
    }
    case 'edit_word': {
      const m = p.media.find((x) => x.id === o.mediaId);
      if (!m?.transcript) return `media ${o.mediaId} chua co loi thoai`;
      const w = m.transcript.words[o.index];
      if (!w) return `khong co tu so ${o.index} (co ${m.transcript.words.length} tu)`;
      if (typeof o.text !== 'string' || !o.text.trim() || o.text.length > 80) return 'text tu phai la chuoi 1..80 ky tu';
      w.w = o.text.trim();
      return null;
    }
    case 'set_beats': {
      const m = p.media.find((x) => x.id === o.mediaId);
      if (!m) return `khong co media ${o.mediaId}`;
      m.beats = clone(o.beats);
      return null;
    }
    case 'add_markers': {
      const cur = p.markers ?? [];
      for (const mk of o.markers) {
        if (!cur.some((x) => x.kind === mk.kind && Math.abs(x.t - mk.t) < 1e-3)) cur.push({ ...mk });
      }
      cur.sort((a, b) => a.t - b.t);
      p.markers = cur;
      return null;
    }
    case 'clear_markers':
      p.markers = (p.markers ?? []).filter((x) => o.kind !== undefined && x.kind !== o.kind);
      return null;
    case 'remove_captions': {
      p.clips = p.clips.filter((c) => c.tag !== CAPTION_TAG + o.id);
      return null;
    }
    case 'generate_captions': {
      const src = p.clips.find((c) => c.id === o.id);
      if (!src) return `khong co clip ${o.id}`;
      if (src.src.type !== 'media') return `clip ${o.id} khong phai clip media (phu de can loi thoai cua media)`;
      if (hasSpeed(src)) return `clip ${o.id} co toc do khac 1 / speed ramp: phu de tu loi thoai chua ho tro (dat toc do 1)`;
      p.clips = p.clips.filter((c) => c.tag !== CAPTION_TAG + o.id);
      const b = buildCaptions(p, src, o.opts);
      if (typeof b === 'string') return b;
      if (b.track) p.tracks.push(b.track);
      p.clips.push(...b.clips);
      return null;
    }
    case 'set_speed': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (c.src.type !== 'media') return `clip ${o.id} khong phai clip media`;
      if (!(Number.isFinite(o.speed) && o.speed >= SPEED_MIN && o.speed <= SPEED_MAX)) return `toc do phai trong ${SPEED_MIN}..${SPEED_MAX}`;
      c.speed = o.speed === 1 ? undefined : o.speed;
      if (c.speed === undefined) delete c.speed;
      if (c.keyframes?.speed) delete c.keyframes.speed;
      return null;
    }
    case 'set_media_matte': {
      const m = p.media.find((x) => x.id === o.mediaId);
      if (!m) return `khong co media ${o.mediaId}`;
      if (o.matteId === null) {
        delete m.matte;
        for (const c of p.clips) if (c.src.type === 'media' && c.src.mediaId === o.mediaId) delete c.matte;
        return null;
      }
      const mm = p.media.find((x) => x.id === o.matteId);
      if (!mm || mm.role !== 'matte') return `media ${o.matteId} khong phai media matte`;
      m.matte = o.matteId;
      return null;
    }
    case 'set_clip_matte': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (o.matte === null) {
        delete c.matte;
        return null;
      }
      if (c.src.type !== 'media') return `clip ${o.id} khong phai clip media`;
      const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId);
      if (!m?.matte) return `media cua clip ${o.id} chua duoc tach nen (chay remove_background / "Tach nen" truoc)`;
      c.matte = { ...DEFAULT_MATTE, ...o.matte };
      return null;
    }
    case 'set_fx': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (o.fx !== null) {
        const bad = Object.keys(o.fx).filter((k) => !FX_NAMES.includes(k as never));
        if (bad.length) return `hieu ung "${bad[0]}" khong co (${FX_NAMES.join('|')})`;
      }
      if (o.fx === null) delete c.fx;
      else {
        c.fx = mergeFx(c.fx, o.fx);
        if (fxIsEmpty(c.fx)) delete c.fx;
      }
      // go keyframe fx cua hieu ung da bi go
      for (const k of Object.keys(c.keyframes ?? {})) {
        const m = /^fx\.([a-z]+)\./.exec(k);
        if (m && !(c.fx as Record<string, unknown> | undefined)?.[m[1]]) delete c.keyframes[k];
      }
      return null;
    }
    case 'set_blend': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (o.blend === 'normal') delete c.blend;
      else c.blend = o.blend;
      return null;
    }
    case 'set_shape': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (c.src.type !== 'shape') return `clip ${o.id} khong phai clip hinh`;
      c.src.shape = mergeShape(c.src.shape, o.patch);
      return null;
    }
    case 'set_grade': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (c.src.type !== 'media') return `clip ${o.id} khong phai clip video/anh (chu va gen khong chinh mau)`;
      const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId);
      if (m && m.kind === 'audio') return `clip ${o.id} la am thanh, khong chinh mau`;
      if (o.grade === null) delete c.grade;
      else c.grade = mergeGrade(c.grade, o.grade);
      return null;
    }
    case 'duck_clip': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (c.src.type !== 'media') return `clip ${o.id} khong phai clip media`;
      const ranges = speechRanges(p, { exclude: new Set([c.id]) });
      if (!ranges.length) return 'chua co loi thoai tren timeline de duck (chay transcribe cho clip noi)';
      c.keyframes = c.keyframes ?? {};
      c.keyframes.volume = duckKeyframes(ranges, { start: c.start, duration: c.duration }, c.volume, o.opts ?? {});
      return null;
    }
    case 'remove_ranges': {
      const c = p.clips.find((x) => x.id === o.id);
      if (!c) return `khong co clip ${o.id}`;
      if (c.src.type !== 'media') return `clip ${o.id} khong phai clip media`;
      if (hasSpeed(c)) return `clip ${o.id} co toc do khac 1 / speed ramp: cat theo loi thoai/khoang lang chua ho tro (dat toc do 1 truoc)`;
      const mediaId = c.src.mediaId;
      const winLo = c.in,
        winHi = c.in + c.duration,
        trackId = c.track;
      const optsBefore = captionClipsOf(p, c.id)[0]?.captionOpts;
      const pieces = new Set<string>([c.id]);
      const fresh = () => {
        let n = 1;
        while (p.clips.some((x) => x.id === 'c' + n) || p.media.some((x) => x.id === 'c' + n)) n++;
        return 'c' + n;
      };
      const rs = o.ranges
        .map((r) => ({ s: Math.max(r.s, winLo), e: Math.min(r.e, winHi) }))
        .filter((r) => r.e - r.s > 1e-3)
        .sort((a, b) => b.s - a.s);
      if (!rs.length) return 'khong co doan nao nam trong phan clip dang dung';
      for (const r of rs) {
        const x = p.clips.find((k) => k.track === trackId && k.src.type === 'media' && k.src.mediaId === mediaId && k.in <= r.s + 1e-6 && k.in + k.duration >= r.e - 1e-6 && pieces.has(k.id));
        if (!x) return `doan ${r.s.toFixed(2)}..${r.e.toFixed(2)}s trung nhau hoac nam ngoai clip`;
        const a = x.start + (r.s - x.in),
          b = x.start + (r.e - x.in);
        let mid = x.id;
        if (b < x.start + x.duration - 1e-6) {
          const nid = fresh();
          const e1 = applyOne(p, { op: 'split_clip', id: x.id, at: b, newId: nid });
          if (e1) return e1;
          pieces.add(nid);
        }
        if (a > x.start + 1e-6) {
          const nid = fresh();
          const e2 = applyOne(p, { op: 'split_clip', id: x.id, at: a, newId: nid });
          if (e2) return e2;
          pieces.add(nid);
          mid = nid;
        }
        const e3 = applyOne(p, { op: 'ripple_delete', id: mid });
        if (e3) return e3;
        pieces.delete(mid);
      }
      // phu de da sinh cho clip nay: tao lai cho tung manh con lai (de bam theo moc moi)
      if (optsBefore) {
        p.clips = p.clips.filter((k) => k.tag !== CAPTION_TAG + c.id);
        for (const id of pieces) {
          if (!p.clips.some((k) => k.id === id)) continue;
          p.clips = p.clips.filter((k) => k.tag !== CAPTION_TAG + id);
          const piece = p.clips.find((k) => k.id === id)!;
          const b = buildCaptions(p, piece, optsBefore);
          if (typeof b === 'string') continue; // manh khong co loi thoai: khong co phu de
          if (b.track && !p.tracks.some((t) => t.id === b.track!.id)) p.tracks.push(b.track);
          p.clips.push(...b.clips);
        }
      }
      return null;
    }
    default:
      return `op la: ${(o as { op: string }).op}`;
  }
}
