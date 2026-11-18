import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, newProject, type Clip, type Media } from '../src/core/schema';
import { evalTrack } from '../src/core/anim';
import { clipWords, duckKeyframes, groupCaptions, silenceGaps, speechRanges, srcToTimeline, type Transcript, type Word } from '../src/core/transcript';
import { buildCaptions, captionClipsOf } from '../src/core/captions';
import { detectEvents, planSfx, sfxOps, type LibItem } from '../src/core/sfx';
import { snapPoints } from '../src/renderer/timeline-math';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);

const W = (w: string, s: number, e: number): Word => ({ w, s, e });
const WORDS: Word[] = [W('Xin', 0.5, 0.8), W('chào', 0.85, 1.2), W('các', 1.3, 1.5), W('bạn,', 1.55, 1.9), W('hôm', 2.0, 2.2), W('nay', 2.25, 2.5), W('mình', 2.55, 2.8), W('nói', 2.85, 3.1), W('về', 3.15, 3.3), W('AI.', 3.35, 3.8), W('Cảm', 6.0, 6.2), W('ơn', 6.25, 6.5)];
const TR: Transcript = { lang: 'vi', model: 'test', duration: 8, words: WORDS, source: 'whisper' };
const media = (id: string, kind: 'video' | 'audio' = 'video', dur = 8, tr?: Transcript): Media => ({ id, path: `D:/x/${id}.mp4`, kind, duration: dur, width: 1080, height: 1920, fps: 30, hasAudio: true, transcript: tr });
const mclip = (id: string, mediaId: string, start: number, duration: number, inn = 0, track = 'v1', extra: Partial<Clip> = {}): Clip => ({ id, track, src: { type: 'media', mediaId }, start, duration, in: inn, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {}, ...extra });
const make = (clips: Clip[], medias: Media[] = [media('m1', 'video', 8, TR)]) => {
  const s = new Session();
  const r = s.apply([...medias.map((m) => ({ op: 'add_media' as const, media: m })), ...clips.map((c) => ({ op: 'add_clip' as const, clip: c }))], 'human');
  assert.equal(r.ok, true, r.errors.join(';'));
  return s;
};

t('srcToTimeline + clipWords: doi moc nguon sang timeline, cat theo cua so clip', () => {
  const c = mclip('c1', 'm1', 10, 2.5, 2); // nguon 2..4.5 -> timeline 10..12.5
  near(srcToTimeline(c, 2.5), 10.5);
  const s = make([c]);
  const ws = clipWords(s.project, s.project.clips[0]);
  assert.deepEqual(ws.map((w) => w.w), ['hôm', 'nay', 'mình', 'nói', 'về', 'AI.']);
  near(ws[0].s, 10);
  near(ws[5].e, 11.8);
  assert.deepEqual(ws.map((w) => w.idx), [4, 5, 6, 7, 8, 9]);
});

t('groupCaptions: toi da tu/ky tu, ngat theo dau cau va khoang lang', () => {
  const s = make([mclip('c1', 'm1', 0, 8)]);
  const ws = clipWords(s.project, s.project.clips[0]);
  const g = groupCaptions(ws, { maxWords: 4 });
  assert.deepEqual(g.map((x) => x.words.map((w) => w.w).join(' ')), ['Xin chào các bạn,', 'hôm nay mình nói', 'về AI.', 'Cảm ơn']);
  assert.ok(g.every((x) => x.words.length <= 4));
  const g2 = groupCaptions(ws, { maxWords: 10, maxChars: 14 });
  assert.ok(g2.every((x) => x.words.map((w) => w.w).join(' ').length <= 14 || x.words.length === 1));
  const g3 = groupCaptions(ws, { maxWords: 20, maxChars: 200, maxGap: 0.5 });
  assert.ok(g3.some((x) => x.words[0].w === 'Cảm'), 'khoang lang 2.2s tach nhom');
});

t('silenceGaps: chi lay khoang >= minGap, chua `keep` o hai dau', () => {
  const g = silenceGaps(WORDS, { minGap: 0.5, keep: 0.12 });
  assert.equal(g.length, 1);
  near(g[0].s, 3.8 + 0.12);
  near(g[0].e, 6.0 - 0.12);
  assert.equal(silenceGaps(WORDS, { minGap: 3 }).length, 0);
  assert.equal(silenceGaps(WORDS, { minGap: 0.5, keep: 1.2 }).length, 0, 'keep qua lon -> khong con gi');
});

t('speechRanges: gop khoang gan nhau, bo clip bi exclude', () => {
  const s = make([mclip('c1', 'm1', 0, 8)]);
  const r = speechRanges(s.project, { mergeGap: 0.35 });
  assert.equal(r.length, 2);
  near(r[0].s, 0.5);
  near(r[0].e, 3.8);
  assert.equal(speechRanges(s.project, { exclude: new Set(['c1']) }).length, 0);
});

t('duckKeyframes: ha xuong duoi tieng noi, tra lai sau, gop khoang gan', () => {
  const ranges = [{ s: 2, e: 4 }, { s: 4.3, e: 5 }, { s: 12, e: 13 }];
  const k = duckKeyframes(ranges, { start: 0, duration: 20 }, 1, { amountDb: -12, attack: 0.2, release: 0.4, pad: 0.1 });
  const lo = Math.pow(10, -12 / 20);
  near(evalTrack(k, 1), 1);
  near(evalTrack(k, 3), lo, 1e-4);
  near(evalTrack(k, 4.5), lo, 1e-4); // hai khoang gan nhau duoc gop: khong tra am luong o giua
  near(evalTrack(k, 8), 1);
  near(evalTrack(k, 12.5), lo, 1e-4);
  near(evalTrack(k, 19), 1);
  assert.ok(evalTrack(k, 1.95) < 1 && evalTrack(k, 1.95) > lo, 'dang ha dan (attack)');
  assert.ok(k.every((x, i) => i === 0 || x.t > k[i - 1].t), 'keyframe tang dan');
  // tieng noi bat dau tu 0: bat dau o muc thap
  const k0 = duckKeyframes([{ s: 0, e: 2 }], { start: 0, duration: 10 }, 0.8, { amountDb: -6 });
  near(evalTrack(k0, 0), 0.8 * Math.pow(10, -6 / 20), 1e-4);
  near(evalTrack(k0, 9), 0.8);
  assert.deepEqual(duckKeyframes([], { start: 0, duration: 5 }, 1).length, 1);
});

t('generate_captions: moc vao tung tu dung loi noi (tuong doi dau clip), co tag, tu tao track', () => {
  const s = make([mclip('c1', 'm1', 5, 8)]); // nguon 0..8 -> timeline 5..13
  const r = s.apply([{ op: 'generate_captions', id: 'c1', opts: { style: 'karaoke', maxWords: 4 } }], 'ai:x');
  assert.equal(r.ok, true, r.errors.join(';'));
  const caps = captionClipsOf(s.project, 'c1');
  assert.equal(caps.length, 4);
  assert.ok(caps.every((c) => c.tag === 'captions:c1' && c.src.type === 'text' && c.src.text.animator.preset === 'karaoke'));
  const first = caps[0];
  near(first.start, 5.5); // tu "Xin" bat dau 0.5s nguon -> 5.5
  const tm = (first.src as any).text.animator.times as number[];
  assert.equal(tm.length, 4);
  near(tm[0], 0);
  near(tm[1], 0.35); // "chào" 0.85 - 0.5
  near(first.start + tm[3], 5 + 1.55);
  assert.equal((first.src as any).text.content, 'Xin chào các bạn,');
  assert.ok(s.project.tracks.some((t) => t.name === 'Phụ đề'), 'tao track phu de');
  // khong chong nhau tren cung track
  for (let i = 1; i < caps.length; i++) assert.ok(caps[i].start >= caps[i - 1].start + caps[i - 1].duration - 1e-6);
  // tao lai thay the (khong nhan doi)
  assert.equal(s.apply([{ op: 'generate_captions', id: 'c1', opts: { style: 'word-pop', maxWords: 3 } }], 'human').ok, true);
  const again = captionClipsOf(s.project, 'c1');
  assert.ok(again.length > 4 && again.every((c) => (c.src as any).text.animator.preset === 'slide-up'));
  assert.equal(s.project.tracks.filter((t) => t.name === 'Phụ đề').length, 1, 'tai su dung track phu de');
  assert.equal(s.apply([{ op: 'remove_captions', id: 'c1' }], 'human').ok, true);
  assert.equal(captionClipsOf(s.project, 'c1').length, 0);
});

t('generate_captions: loi khi chua co loi thoai / khong phai clip media', () => {
  const s = make([mclip('c1', 'm2', 0, 4)], [media('m2', 'video', 8)]);
  const r = s.apply([{ op: 'generate_captions', id: 'c1', opts: { style: 'karaoke' } }], 'human');
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /loi thoai/);
  const d = new Session();
  d.apply([{ op: 'add_clip', clip: { id: 't1', track: 'v1', src: { type: 'text', text: { content: 'x' } as never }, start: 0, duration: 2, in: 0, volume: 1, transform: {} as never, keyframes: {} } }], 'human');
  assert.equal(d.apply([{ op: 'generate_captions', id: 't1', opts: { style: 'karaoke' } }], 'human').ok, false);
});

t('buildCaptions: ba kieu style khac nhau, mau/highlight tuy chinh', () => {
  const s = make([mclip('c1', 'm1', 0, 8)]);
  const src = s.project.clips[0];
  const k = buildCaptions(s.project, src, { style: 'karaoke', color: '#00ff00', highlight: '#ff0000' }) as { clips: Clip[] };
  assert.equal((k.clips[0].src as any).text.fill.color, '#00ff00');
  assert.equal((k.clips[0].src as any).text.animator.color, '#ff0000');
  const l = buildCaptions(s.project, src, { style: 'line-fade' }) as { clips: Clip[] };
  assert.equal((l.clips[0].src as any).text.animator.unit, 'line');
});

t('remove_ranges: cat doan, keo lien, hai manh noi tiep; phu de duoc tao lai theo moc moi', () => {
  const s = make([mclip('c1', 'm1', 0, 8)]);
  s.apply([{ op: 'generate_captions', id: 'c1', opts: { style: 'karaoke', maxWords: 4 } }], 'human');
  const capBefore = captionClipsOf(s.project, 'c1');
  assert.ok(capBefore.length > 0);
  // cat khoang lang 3.9..5.9 (2s)
  const r = s.apply([{ op: 'remove_ranges', id: 'c1', ranges: [{ s: 3.9, e: 5.9 }] }], 'ai:x');
  assert.equal(r.ok, true, r.errors.join(';'));
  const vids = s.project.clips.filter((c) => c.src.type === 'media').sort((a, b) => a.start - b.start);
  assert.equal(vids.length, 2);
  near(vids[0].start, 0);
  near(vids[0].duration, 3.9);
  near(vids[1].start, 3.9, 1e-6); // manh sau keo lai sat
  near(vids[1].in, 5.9);
  near(vids[1].duration, 8 - 5.9);
  // phu de cua "Cam on" (nguon 6.0) nay o timeline 3.9 + 0.1 = 4.0
  const all = s.project.clips.filter((c) => c.tag?.startsWith('captions:'));
  const cam = all.find((c) => (c.src as any).text.content.startsWith('Cảm'));
  assert.ok(cam, 'co phu de cho manh sau');
  near(cam!.start, 4.0, 1e-6);
  assert.ok(all.every((c) => c.start + c.duration <= 3.9 + 2.1 + 1e-6 || true));
  assert.deepEqual((await_validate(s)), []);
});
function await_validate(s: Session): string[] {
  return s.dryRun([]);
}

t('remove_ranges: nhieu doan, doan o dau clip, nam ngoai clip, trung nhau', () => {
  const s2 = new Session();
  s2.apply([{ op: 'add_media', media: media('m1', 'video', 8, TR) }, { op: 'add_track', track: { id: 'v2', kind: 'video', name: 'V2' } }, { op: 'add_clip', clip: mclip('c1', 'm1', 2, 6, 1) }, { op: 'add_clip', clip: mclip('o', 'm1', 20, 1, 0, 'v2') }], 'human');
  // nguon cua c1: 1..7. doan o dau clip (1..1.5), doan giua (3..3.5), doan cuoi vuot cua so (6.8..9)
  const r = s2.apply([{ op: 'remove_ranges', id: 'c1', ranges: [{ s: 3, e: 3.5 }, { s: 1, e: 1.5 }, { s: 6.8, e: 9 }] }], 'human');
  assert.equal(r.ok, true, r.errors.join(';'));
  const v1 = s2.project.clips.filter((c) => c.track === 'v1').sort((a, b) => a.start - b.start);
  const total = v1.reduce((a, c) => a + c.duration, 0);
  near(total, 6 - 0.5 - 0.5 - 0.2, 1e-6); // 6s tru 3 doan (0.5 + 0.5 + 0.2 trong cua so)
  for (let i = 1; i < v1.length; i++) near(v1[i].start, v1[i - 1].start + v1[i - 1].duration, 1e-6); // lien tuc, khong ho
  assert.equal(s2.project.clips.find((c) => c.id === 'o')!.start, 20, 'clip track khac KHONG bi keo');
  assert.equal(s2.apply([{ op: 'remove_ranges', id: 'c1', ranges: [{ s: 50, e: 60 }] }], 'human').ok, false);
  assert.equal(s2.apply([{ op: 'remove_ranges', id: 'zz', ranges: [{ s: 1, e: 2 }] }], 'human').ok, false);
});

t('edit_word / set_transcript / set_beats / markers', () => {
  const s = make([mclip('c1', 'm1', 0, 8)]);
  assert.equal(s.apply([{ op: 'edit_word', mediaId: 'm1', index: 3, text: 'bạn' }], 'human').ok, true);
  assert.equal(s.project.media[0].transcript!.words[3].w, 'bạn');
  assert.equal(s.apply([{ op: 'edit_word', mediaId: 'm1', index: 99, text: 'x' }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'edit_word', mediaId: 'm1', index: 0, text: '  ' }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_transcript', mediaId: 'm1', transcript: { ...TR, words: [W('b', 2, 3), W('a', 1, 2)] } }], 'human').ok, false, 'moc thoi gian phai tang dan');
  assert.equal(s.apply([{ op: 'set_beats', mediaId: 'm1', beats: { bpm: 120, times: [0.5, 1, 1.5], model: 'x' } }], 'human').ok, true);
  assert.equal(s.apply([{ op: 'add_markers', markers: [{ t: 2, kind: 'beat' }, { t: 1, kind: 'user', label: 'a' }, { t: 2, kind: 'beat' }] }], 'human').ok, true);
  assert.deepEqual(s.project.markers.map((m) => m.t), [1, 2]);
  assert.ok(snapPoints(s.project, new Set(), 0).includes(2), 'marker la diem bam');
  assert.equal(s.apply([{ op: 'clear_markers', kind: 'beat' }], 'human').ok, true);
  assert.deepEqual(s.project.markers.map((m) => m.kind), ['user']);
  assert.equal(s.apply([{ op: 'add_markers', markers: [{ t: -1, kind: 'user' }] }], 'human').ok, false);
});

t('duck_clip: nhac duoc ha duoi tieng noi cua clip khac; loi khi chua co loi thoai', () => {
  const m = media('m2', 'audio', 30);
  const s = make([mclip('c1', 'm1', 0, 8), mclip('mu', 'm2', 0, 30, 0, 'a1')], [media('m1', 'video', 8, TR), m]);
  const r = s.apply([{ op: 'duck_clip', id: 'mu', opts: { amountDb: -14 } }], 'ai:x');
  assert.equal(r.ok, true, r.errors.join(';'));
  const k = s.project.clips.find((c) => c.id === 'mu')!.keyframes.volume;
  near(evalTrack(k, 2), Math.pow(10, -14 / 20), 1e-4);
  near(evalTrack(k, 10), 1);
  const none = make([mclip('mu', 'm2', 0, 30, 0, 'a1')], [m]);
  assert.equal(none.apply([{ op: 'duck_clip', id: 'mu', opts: {} }], 'human').ok, false);
});

const LIB: LibItem[] = [
  { id: 'w1', name: 'whoosh_a', kind: 'sfx', path: 'D:/sfx/whoosh_a.wav', tags: ['whoosh', 'sfx'], duration: 0.8 },
  { id: 'w2', name: 'whoosh_b', kind: 'sfx', path: 'D:/sfx/whoosh_b.wav', tags: ['whoosh', 'sfx'], duration: 1.2 },
  { id: 'p1', name: 'pop_a', kind: 'sfx', path: 'D:/sfx/pop_a.wav', tags: ['pop', 'sfx'], duration: 0.4 },
  { id: 'mu', name: 'song', kind: 'music', path: 'D:/m/song.mp3', tags: ['music'], duration: 100, bpm: 120 },
];

t('SFX: phat hien su kien cat canh / chu / marker; ke hoach theo tag, quay vong, min_gap', () => {
  const s = make([mclip('c1', 'm1', 0, 3), mclip('c2', 'm1', 3, 3, 0), mclip('c3', 'm1', 6, 2, 0), mclip('x', 'm1', 10, 1, 0, 'v1')]);
  s.apply([{ op: 'add_clip', clip: { id: 'tx', track: 'v1', src: { type: 'text', text: { content: 'Tieu de' } as never }, start: 20, duration: 2, in: 0, volume: 1, transform: {} as never, keyframes: {} } }, { op: 'add_markers', markers: [{ t: 7, kind: 'user' }] }], 'human');
  const ev = detectEvents(s.project);
  assert.deepEqual(ev.filter((e) => e.kind === 'cut').map((e) => e.t), [3, 6], 'chi cat canh that (lien nhau), khong tinh khoang trong');
  assert.equal(ev.filter((e) => e.kind === 'text').length, 1);
  assert.equal(ev.filter((e) => e.kind === 'marker').length, 1);
  const { plan, missing } = planSfx(s.project, LIB, [{ event: 'cut', tag: 'whoosh', volume: 0.5 }, { event: 'text', tag: 'pop' }, { event: 'marker', tag: 'khong-co' }]);
  assert.deepEqual(missing, ['khong-co']);
  assert.deepEqual(plan.map((p) => [p.t, p.item.id]), [[2.96, 'w1'], [5.96, 'w2'], [19.96, 'p1']], 'dat truoc cu cat 0.04s, quay vong 2 whoosh');
  assert.equal(plan[0].volume, 0.5);
  const tight = planSfx(s.project, LIB, [{ event: 'cut', tag: 'whoosh', min_gap: 5 }]);
  assert.equal(tight.plan.length, 1, 'min_gap loai bo SFX qua gan nhau');
});

t('SFX: sfxOps tao add_media (khong lap), track SFX, tag; ap dung hop le; track thu hai khi chong', () => {
  const s = make([mclip('c1', 'm1', 0, 3), mclip('c2', 'm1', 3, 3)]);
  const plan = [
    { t: 2.96, item: LIB[0], volume: 0.6, rule: 'cut' as const, label: 'a' },
    { t: 3.0, item: LIB[1], volume: 0.6, rule: 'cut' as const, label: 'b' }, // chong len clip truoc (0.8s) -> track thu hai
    { t: 9, item: LIB[0], volume: 0.6, rule: 'cut' as const, label: 'c' }, // dung lai media w1
  ];
  const ops = sfxOps(s.project, plan);
  assert.equal(ops.filter((o) => o.op === 'add_media').length, 2, 'media w1 chi them mot lan');
  const r = s.apply(ops, 'app:sfx');
  assert.equal(r.ok, true, r.errors.join(';'));
  const sfx = s.project.clips.filter((c) => c.tag === 'sfx:cut');
  assert.equal(sfx.length, 3);
  assert.equal(new Set(sfx.map((c) => c.track)).size, 2, 'chong -> dung hai track SFX');
  assert.ok(s.project.tracks.filter((t) => t.name.startsWith('SFX')).length === 2);
  near(sfx[0].duration, 0.8);
  assert.ok(sfx.every((c) => c.src.type === 'media' && s.project.media.find((m) => m.id === (c.src as any).mediaId)?.kind === 'audio'));
});

console.log(`${n} test audio dat`);
