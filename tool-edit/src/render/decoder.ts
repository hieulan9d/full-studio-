// Giai ma cache H.264 Annex-B bang WebCodecs, truy cap theo chi so khung. Xem CHUC-NANG.md F-07.
// Cache duoc tao boi src/main/media.ts: CFR, khong B-frame, moi AU bat dau bang AUD, keyframe moi 15 khung.

interface AU {
  start: number;
  end: number;
  key: boolean;
}

export interface AnnexBIndex {
  aus: AU[];
  codec: string; // vd avc1.640028
}

/** Tach cac access unit trong luong Annex-B. */
export function indexAnnexB(buf: Uint8Array): AnnexBIndex {
  const aus: AU[] = [];
  let codec = '';
  let cur: AU | null = null;
  let i = 0;
  while ((i = buf.indexOf(1, i)) !== -1) {
    if (i >= 2 && buf[i - 1] === 0 && buf[i - 2] === 0 && i + 1 < buf.length) {
      const nalType = buf[i + 1] & 0x1f;
      let scStart = i - 2;
      if (scStart > 0 && buf[scStart - 1] === 0) scStart -= 1; // ma bat dau 4 byte
      if (nalType === 9) {
        if (cur) {
          cur.end = scStart;
          aus.push(cur);
        }
        cur = { start: scStart, end: buf.length, key: false };
      } else if (cur) {
        if (nalType === 5) cur.key = true;
      }
      if (nalType === 7 && !codec && i + 4 < buf.length) {
        const hex = (b: number) => b.toString(16).padStart(2, '0');
        codec = `avc1.${hex(buf[i + 2])}${hex(buf[i + 3])}${hex(buf[i + 4])}`;
      }
    }
    i += 1;
  }
  if (cur) aus.push(cur);
  if (!aus.length) throw new Error('cache khong co khung nao (khong thay AUD)');
  if (!codec) throw new Error('cache khong co SPS');
  return { aus, codec };
}

export class CachedVideo {
  readonly frameCount: number;
  private idx: AnnexBIndex;
  private decoder: VideoDecoder | null = null;
  private next = -1; // chi so khung ke tiep neu tiep tuc giai ma lien tuc
  private lru = new Map<number, VideoFrame>();
  private pinned = new Set<number>(); // khung dang duoc dung de ghep trong lan render hien tai: khong duoc dong
  private waitTarget = -1; // khung dang cho; cac khung giai ma du xa phia truoc no duoc dong ngay
  private waiters = new Map<number, (f: VideoFrame) => void>();
  private lastError: string | null = null;
  stats = { decodes: 0, seeks: 0, flushFallbacks: 0 };

  constructor(
    private bytes: Uint8Array,
    readonly width: number,
    readonly height: number,
    // GIU IT KHUNG: bo giai ma phan cung chi co mot nhom be mat nho; giu qua nhieu VideoFrame se lam no dung xuat khung (da do: treo o khung thu 12).
    private maxCache = 3,
  ) {
    this.idx = indexAnnexB(bytes);
    this.frameCount = this.idx.aus.length;
  }

  private chunk(i: number): EncodedVideoChunk {
    const au = this.idx.aus[i];
    return new EncodedVideoChunk({ type: au.key ? 'key' : 'delta', timestamp: i, data: this.bytes.subarray(au.start, au.end) });
  }

  /** Bat dau mot lan render moi: bo ghim cac khung cua lan truoc. */
  beginFrame() {
    this.pinned.clear();
    this.evict();
  }

  private evict() {
    for (const k of [...this.lru.keys()]) {
      if (this.lru.size <= this.maxCache) break;
      if (this.pinned.has(k)) continue;
      this.lru.get(k)!.close();
      this.lru.delete(k);
    }
  }

  private put(f: VideoFrame) {
    const ts = f.timestamp;
    // khi tua, khung giai ma nam xa truoc khung can lay thi dong ngay de khong chiem be mat cua bo giai ma
    if (this.waitTarget >= 0 && ts < this.waitTarget - (this.maxCache - 1) && !this.pinned.has(ts)) {
      f.close();
      return;
    }
    const old = this.lru.get(ts);
    if (old) old.close();
    this.lru.delete(ts);
    this.lru.set(ts, f);
    this.evict();
    const w = this.waiters.get(ts);
    if (w) {
      this.waiters.delete(ts);
      w(this.lru.get(ts)!);
    }
  }

  private async configure() {
    this.decoder?.close();
    const cfg: VideoDecoderConfig = { codec: this.idx.codec, codedWidth: this.width, codedHeight: this.height, optimizeForLatency: true, hardwareAcceleration: 'prefer-hardware', avc: { format: 'annexb' } } as VideoDecoderConfig;
    const sup = await VideoDecoder.isConfigSupported(cfg);
    if (!sup.supported) throw new Error(`VideoDecoder khong ho tro ${this.idx.codec}`);
    this.lastError = null;
    this.decoder = new VideoDecoder({ output: (f) => this.put(f), error: (e) => (this.lastError = String(e)) });
    this.decoder.configure(cfg);
    this.next = -1;
  }

  /** Lay khung theo chi so. Khung do CachedVideo so huu: dung close(). Chi so vuot cuoi thi giu khung cuoi. */
  async frame(index: number): Promise<VideoFrame> {
    const i = Math.max(0, Math.min(this.frameCount - 1, index | 0));
    const hit = this.lru.get(i);
    if (hit) {
      this.lru.delete(i); // lam moi vi tri LRU
      this.lru.set(i, hit);
      this.pinned.add(i);
      return hit;
    }
    if (!this.decoder || this.decoder.state !== 'configured') await this.configure();
    const dec = this.decoder!;
    let from = i;
    if (this.next !== i) {
      let key = i;
      while (key > 0 && !this.idx.aus[key].key) key--;
      if (this.next >= key && this.next >= 0 && this.next < i) {
        from = this.next; // dang o giua cung GOP, nam truoc i: tiep tuc giai ma
      } else {
        this.stats.seeks++;
        from = key;
        dec.reset();
        dec.configure({ codec: this.idx.codec, codedWidth: this.width, codedHeight: this.height, optimizeForLatency: true, hardwareAcceleration: 'prefer-hardware', avc: { format: 'annexb' } } as VideoDecoderConfig);
      }
    }
    this.waitTarget = i;
    const p = new Promise<VideoFrame>((res) => this.waiters.set(i, res));
    for (let k = from; k <= i; k++) {
      dec.decode(this.chunk(k));
      this.stats.decodes++;
    }
    this.next = i + 1;
    const got = await Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), 400))]);
    this.waitTarget = -1;
    if (got) {
      this.pinned.add(i);
      return got;
    }
    // Giai ma phan cung giu khung lai: ep xuat bang flush, sau do bat buoc seek lai tu keyframe.
    this.stats.flushFallbacks++;
    this.waiters.delete(i);
    const flushed = await Promise.race([dec.flush().then(() => true, (e) => ((this.lastError = String(e)), true)), new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]);
    this.next = -1;
    if (!flushed) {
      // bo giai ma bi treo: bo no di, lan sau tao lai; bao loi ro rang thay vi treo mai
      try { dec.close(); } catch { /* da dong */ }
      this.decoder = null;
      throw new Error(`bo giai ma phan cung bi treo o khung ${i} (da bo va se tao lai)`);
    }
    const after = this.lru.get(i);
    if (after) {
      this.pinned.add(i);
      return after;
    }
    throw new Error(`khong giai ma duoc khung ${i}${this.lastError ? ': ' + this.lastError : ''}`);
  }

  dispose() {
    for (const f of this.lru.values()) f.close();
    this.lru.clear();
    this.decoder?.close();
    this.decoder = null;
  }
}
