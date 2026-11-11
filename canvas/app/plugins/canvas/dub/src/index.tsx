// Dubbing node: drives VoiceStudio's dub pipeline (upload -> transcribe -> translate/script -> generate -> export).
import { definePlugin, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps } from "@infinite-canvas/plugin-sdk";

const VOICE_API = "http://127.0.0.1:3900";
const PROXY = "http://127.0.0.1:23210"; // canvas-proxy adds the CORS headers VoiceStudio lacks

const LANGS: Array<[string, string]> = [
    ["vi", "Tiếng Việt"], ["en", "English"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"], ["th", "ไทย"],
    ["id", "Indonesia"], ["fr", "Français"], ["es", "Español"], ["de", "Deutsch"], ["ru", "Русский"], ["pt", "Português"],
];
const TIMING: Array<[string, string]> = [
    ["concise", "Ngắn gọn"], ["smart_fit", "Khớp thông minh"], ["stretch_video", "Kéo dài video"], ["strict_slot", "Đồng bộ môi"],
];
const VOICE_MATCH: Array<[string, string]> = [["per_line", "Theo câu"], ["consistent", "Nhất quán"]];

type Runtime = { uploadMedia?: (input: string | Blob, prefix?: string) => Promise<{ url: string; storageKey: string; bytes: number; mimeType: string; durationMs?: number }> };
type TaskEvent = { type: string; [key: string]: unknown };
type Seg = { id?: unknown; start: number; end: number; text?: string; text_original?: string; speaker_id?: string; profile_id?: string; [key: string]: unknown };
// Result of "Xem phân đoạn": the prepared VoiceStudio job, reused by the dub run so upload/ASR are not repeated.
type Analysis = { jobId: string; sourceLang: string; clones: Record<string, unknown>; segments: Seg[]; isAudio: boolean; sourceUrl: string };

// Mirrors VoiceStudio's autoProfileId: the cloned-voice profile of a diarized speaker.
const autoProfileId = (speakerId: string) => {
    const cleaned: string[] = [];
    for (const ch of String(speakerId || "").toLowerCase()) {
        if (/^[\p{L}\p{N}]$/u.test(ch)) cleaned.push(ch);
        else if (ch === " " || ch === "-") cleaned.push("_");
    }
    return `auto:${cleaned.join("") || "speaker"}`;
};

const api = (path: string) => `${PROXY}/${VOICE_API}${path}`;

async function failIfBad(res: Response, what: string) {
    if (res.ok) return res;
    let detail = "";
    try { detail = (await res.text()).slice(0, 300); } catch { /* ignore */ }
    throw new Error(`${what}: HTTP ${res.status} ${detail}`);
}

// Reads VoiceStudio's SSE task stream; onEvent returns true on the terminal event.
async function readStream(path: string, onEvent: (e: TaskEvent) => boolean, signal: AbortSignal) {
    const res = await failIfBad(await fetch(api(path), { signal }), path);
    if (!res.body) throw new Error("Luồng sự kiện trống");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let name = "";
    let data: string[] = [];
    const dispatch = () => {
        if (!data.length) { name = ""; return false; }
        let obj: Record<string, unknown> | null = null;
        try { obj = JSON.parse(data.join("\n")); } catch { obj = null; }
        const evName = name;
        data = []; name = "";
        if (!obj || typeof obj !== "object") return false;
        const event: TaskEvent = { ...obj, type: evName || (typeof obj.type === "string" ? obj.type : "message") };
        if (event.type === "error" || event.type === "cancelled") {
            throw new Error(String(event.error || event.message || event.type));
        }
        return onEvent(event);
    };
    try {
        for (;;) {
            const chunk = await reader.read();
            buffer += decoder.decode(chunk.value, { stream: !chunk.done });
            const lines = buffer.split("\n");
            buffer = chunk.done ? "" : lines.pop() ?? "";
            for (const raw of lines) {
                const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
                if (!line) { if (dispatch()) return; }
                else if (line.startsWith("event:")) name = line.slice(6).trim();
                else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
            }
            if (chunk.done) { if (dispatch()) return; break; }
        }
    } finally {
        await reader.cancel().catch(() => {});
    }
    throw new Error("Luồng kết thúc mà không có kết quả");
}

const postJson = async (path: string, body: unknown, signal: AbortSignal) =>
    (await failIfBad(await fetch(api(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }), path)).json();

// Upload the source and run ASR/diarization once; returns segments with their detected speakers.
async function analyze(blob: Blob, sourceUrl: string, onStage: (s: string) => void, signal: AbortSignal): Promise<Analysis> {
    const isAudio = blob.type.startsWith("audio/");
    const jobId = `ic${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    onStage("Tải lên và chuẩn bị…");
    const fd = new FormData();
    fd.append("video", blob, isAudio ? "source.mp3" : "source.mp4");
    fd.append("job_id", jobId);
    fd.append("input_type", isAudio ? "audio" : "video");
    const up = await (await failIfBad(await fetch(api("/dub/upload"), { method: "POST", body: fd, signal }), "upload")).json();
    await readStream(`/tasks/stream/${encodeURIComponent(up.task_id)}`, (e) => e.type === "ready", signal);

    onStage("Nhận dạng giọng nói…");
    let segments: Seg[] = [];
    let sourceLang = "";
    let clones: Record<string, unknown> = {};
    await readStream(`/dub/transcribe-stream/${encodeURIComponent(jobId)}`, (e) => {
        if (e.type === "final") {
            segments = (Array.isArray(e.segments) ? e.segments : []) as Seg[];
            sourceLang = String(e.source_lang || "");
            clones = (e.cast_sources || e.speaker_clones || {}) as Record<string, unknown>;
        }
        return e.type === "done";
    }, signal);
    segments = segments.map((s, i) => ({ ...s, id: String(s.id ?? i), text_original: s.text_original || s.text || "" }));
    if (!segments.length) throw new Error("Không nhận dạng được lời thoại trong video");
    return { jobId, sourceLang, clones, segments, isAudio, sourceUrl };
}

// "Name: line" per line; blank lines and lines starting with # are ignored.
function parseScript(text: string): Array<{ name: string; text: string }> {
    return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
        const m = l.match(/^([^:：]{1,40})[:：]\s*(.*)$/);
        return m ? { name: m[1].trim(), text: m[2].trim() } : { name: "", text: l };
    });
}

// Rough check: Vietnamese reads about 15 chars/s; beyond ~18 chars/s a line will not fit its slot without heavy speed-up.
const MAX_CPS = 18;
function overflowWarnings(script: string, segments: Seg[]) {
    const lines = parseScript(script);
    if (lines.length !== segments.length) return [];
    return lines.flatMap((l, i) => {
        const dur = segments[i].end - segments[i].start;
        return dur > 0 && l.text.length / dur > MAX_CPS ? [`Dòng ${i + 1}: ${l.text.length} ký tự cho ${dur.toFixed(1)}s, nên ≤ ${Math.floor(dur * MAX_CPS)}`] : [];
    });
}

const fmtTime = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

async function synthesize(opts: { a: Analysis; lang: string; timing: string; voiceMatch: string; voice: string; voices: Record<string, string>; script: string; onStage: (s: string) => void; signal: AbortSignal }) {
    const { a, lang, timing, voiceMatch, voice, voices, script, onStage, signal } = opts;
    const { jobId, clones, isAudio } = a;
    let segments = a.segments;
    const lines = parseScript(script);

    if (lines.length) {
        // Script mode: the user's lines are spoken as written; each named character gets their own voice.
        if (lines.length !== segments.length) throw new Error(`Kịch bản có ${lines.length} dòng nhưng video có ${segments.length} đoạn. Bấm "Xem phân đoạn" và viết đúng ${segments.length} dòng.`);
        const speakerOf = new Map<string, Map<string, number>>(); // script name -> detected speaker_id -> count
        lines.forEach((l, i) => {
            const sid = typeof segments[i].speaker_id === "string" ? (segments[i].speaker_id as string) : "";
            const m = speakerOf.get(l.name) || new Map<string, number>();
            m.set(sid, (m.get(sid) || 0) + 1);
            speakerOf.set(l.name, m);
        });
        const autoFor = (name: string) => {
            const best = [...(speakerOf.get(name) || [])].sort((x, y) => y[1] - x[1])[0]?.[0] || "";
            return best && clones[best] ? autoProfileId(best) : "";
        };
        segments = segments.map((s, i) => {
            const chosen = voices[lines[i].name] || "auto";
            return { ...s, text: lines[i].text, profile_id: chosen === "auto" ? autoFor(lines[i].name) : chosen };
        });
    } else {
        segments = segments.map((s) => {
            if (voice !== "auto") return { ...s, profile_id: voice };
            const sid = typeof s.speaker_id === "string" ? s.speaker_id : "";
            return !s.profile_id && sid && clones[sid] ? { ...s, profile_id: autoProfileId(sid) } : s;
        });

        // Pick a translation engine that is actually installed: VoiceStudio's active one, else the first ready one.
        const eng = (await (await failIfBad(await fetch(api("/engines/translation"), { signal }), "engines")).json()) as { active?: string; engines?: Array<{ id: string; ready: boolean }> };
        const ready = (eng.engines || []).filter((x) => x.ready).map((x) => x.id);
        const provider = ready.includes(eng.active || "") ? eng.active : ready[0];
        if (!provider) throw new Error("VoiceStudio chưa có engine dịch nào sẵn sàng. Mở VoiceStudio > Cài đặt > Models > Translation để cài (Argos hoặc NLLB).");

        onStage(`Dịch (${provider})…`);
        const tr = (await postJson("/dub/translate", {
            job_id: jobId,
            provider,
            source_lang: a.sourceLang || undefined,
            target_lang: lang,
            quality: "fast",
            segments: segments.map((s) => ({ id: s.id, text: s.text_original, start: s.start, end: s.end, slot_seconds: s.end - s.start })),
        }, signal)) as { translated?: Array<{ id: unknown; text?: string; error?: string }> };
        const rows = new Map((tr.translated || []).map((r) => [String(r.id), r]));
        segments = segments.map((s) => {
            const r = rows.get(String(s.id));
            return { ...s, text: r && !r.error && r.text ? r.text : s.text_original };
        });
    }

    onStage("Tạo giọng lồng tiếng…");
    const job = (await postJson(`/dub/generate/${encodeURIComponent(jobId)}`, {
        segments: segments.map((s) => ({ start: s.start, end: s.end, text: s.text, target_lang: lang, profile_id: s.profile_id || "" })),
        segment_ids: segments.map((s) => s.id),
        regen_only: null,
        language: lang,
        language_code: lang,
        num_step: 16,
        guidance_scale: 2,
        speed: 1,
        timing_strategy: timing,
        voice_match: voiceMatch,
        preview: false,
    }, signal)) as { task_id: string };
    let syncScores: number[] = [];
    await readStream(`/tasks/stream/${encodeURIComponent(job.task_id)}`, (e) => {
        if (typeof e.progress === "number") onStage(`Tạo giọng lồng tiếng… ${Math.round(e.progress as number)}%`);
        if (e.type === "done" && Array.isArray(e.sync_scores)) syncScores = (e.sync_scores as unknown[]).map((x) => (typeof x === "number" ? x : 1));
        return e.type === "done";
    }, signal);

    onStage("Xuất kết quả…");
    const q = new URLSearchParams({ include_tracks: lang, default_track: lang, preserve_bg: "true", burn_subs: "false", dual: "false", karaoke: "false" });
    const path = isAudio
        ? `/dub/download-audio/${encodeURIComponent(jobId)}?lang=${encodeURIComponent(lang)}&preserve_bg=true`
        : `/dub/download/${encodeURIComponent(jobId)}?${q}`;
    const out = await (await failIfBad(await fetch(api(path), { signal }), "download")).blob();
    return { blob: out, isAudio, syncScores };
}

function DubContent({ ctx }: CanvasNodeContentProps) {
    const meta = (ctx.node.metadata || {}) as Record<string, unknown>;
    const lang = (meta.dubLang as string) || "vi";
    const timing = (meta.dubTiming as string) || "smart_fit";
    const voiceMatch = (meta.dubVoiceMatch as string) || "per_line";
    const voice = (meta.dubVoice as string) || "auto";
    const script = (meta.dubScript as string) || "";
    const charVoices = (meta.dubVoices as Record<string, string>) || {};
    const [voices, setVoices] = useState<Array<{ id: string; name: string }>>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [report, setReport] = useState("");
    const [stage, setStage] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [abort, setAbort] = useState<AbortController | null>(null);

    const source = ctx.getUpstream().find((n) => (n.type === "video" || n.type === "audio") && n.metadata?.content);
    const warnings = analysis ? overflowWarnings(script, analysis.segments) : [];
    const names = [...new Set(parseScript(script).map((l) => l.name).filter(Boolean))];

    const field = { width: "100%", padding: "4px 6px", borderRadius: 6, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, fontSize: 12, boxSizing: "border-box" } as const;
    const label = { fontSize: 11, color: ctx.theme.node.placeholder, marginBottom: 2 } as const;
    const set = (patch: Record<string, unknown>) => ctx.updateMetadata(patch as never);
    const stop = { "data-canvas-no-zoom": true, onMouseDown: (e: { stopPropagation: () => void }) => e.stopPropagation(), onKeyDown: (e: { stopPropagation: () => void }) => e.stopPropagation() } as const;

    const loadVoices = async () => {
        try {
            const res = await failIfBad(await fetch(api("/v1/audio/voices")), "voices");
            const json = (await res.json()) as { voices?: Array<{ voice_id: string; name: string; type?: string }> };
            setVoices((json.voices || []).filter((v) => v.type === "profile").map((v) => ({ id: v.voice_id, name: v.name })));
            setError("");
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    // Runs fn with a shared busy/abort/error wrapper.
    const guard = async (fn: (signal: AbortSignal) => Promise<void>) => {
        const controller = new AbortController();
        setAbort(controller); setBusy(true); setError("");
        try {
            await fn(controller.signal);
        } catch (e) {
            if (controller.signal.aborted) setStage("Đã hủy.");
            else { setError(e instanceof Error ? e.message : String(e)); setStage(""); }
        } finally {
            setBusy(false); setAbort(null);
        }
    };

    const getAnalysis = async (signal: AbortSignal) => {
        const url = source?.metadata?.content;
        if (!url) throw new Error("Hãy nối một node video (đã có video) vào node này.");
        if (analysis && analysis.sourceUrl === url) return analysis;
        const blob = await (await fetch(url)).blob();
        const a = await analyze(blob, url, setStage, signal);
        setAnalysis(a);
        return a;
    };

    const showSegments = () => guard(async (signal) => {
        setAnalysis(null);
        const url = source?.metadata?.content;
        if (!url) throw new Error("Hãy nối một node video (đã có video) vào node này.");
        const a = await analyze(await (await fetch(url)).blob(), url, setStage, signal);
        setAnalysis(a);
        setStage(`Có ${a.segments.length} đoạn. Viết kịch bản đúng ${a.segments.length} dòng.`);
    });

    const start = () => guard(async (signal) => {
        setStage("Bắt đầu…"); setReport("");
        const a = await getAnalysis(signal);
        const { blob: out, isAudio, syncScores } = await synthesize({ a, lang, timing, voiceMatch, voice, voices: charVoices, script, onStage: setStage, signal });
        const rt = (window as unknown as { InfiniteCanvasRuntime?: Runtime }).InfiniteCanvasRuntime;
        const stored = rt?.uploadMedia ? await rt.uploadMedia(out, isAudio ? "audio" : "video") : null;
        const url = stored?.url || URL.createObjectURL(out);
        const id = `dub-${ctx.node.id}-${Date.now()}`;
        ctx.applyOps([
            {
                type: "add_node", id, nodeType: isAudio ? "audio" : "video", title: `Lồng tiếng (${lang})`,
                x: ctx.node.position.x + ctx.node.width + 60, y: ctx.node.position.y,
                metadata: { content: url, storageKey: stored?.storageKey, mimeType: stored?.mimeType || out.type || (isAudio ? "audio/wav" : "video/mp4"), bytes: out.size, durationMs: stored?.durationMs, status: "success" },
            },
            { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id },
        ]);
        const off = syncScores.flatMap((r, i) => (r > 1.04 || r < 0.9 ? [`Đoạn ${i + 1}: ${r.toFixed(2)}`] : []));
        setReport(off.length ? `Các đoạn lệch khung thời gian (tỉ lệ độ dài giọng/khung, 1.00 là khớp):\n${off.join("\n")}` : "");
        setStage("Xong. Kết quả ở node bên phải.");
    });

    const btn = { padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 12 } as const;
    const voiceOptions = (current: string) => (
        <>
            <option value="auto">Giữ giọng gốc (nhân bản)</option>
            {current !== "auto" && !voices.some((v) => v.id === current) && <option value={current}>{current}</option>}
            {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </>
    );

    return (
        <div onWheel={(e) => e.stopPropagation()} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", gap: 8, padding: 12, boxSizing: "border-box", color: ctx.theme.node.text, overflow: "auto" }}>
            <div style={{ fontSize: 12, color: source ? ctx.theme.node.text : ctx.theme.node.placeholder }}>
                {source ? `Nguồn: ${source.title || source.type}` : "Nối một node video vào đây"}
            </div>
            <div>
                <div style={label}>Ngôn ngữ đích</div>
                <select {...stop} style={field} value={lang} disabled={busy} onChange={(e) => set({ dubLang: e.target.value })}>{LANGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
            </div>
            <div>
                <div style={label}>Căn thời gian</div>
                <select {...stop} style={field} value={timing} disabled={busy} onChange={(e) => set({ dubTiming: e.target.value })}>{TIMING.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
            </div>
            <div>
                <div style={label}>Khớp giọng</div>
                <select {...stop} style={field} value={voiceMatch} disabled={busy} onChange={(e) => set({ dubVoiceMatch: e.target.value })}>{VOICE_MATCH.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
            </div>

            <div>
                <div style={{ ...label, display: "flex", justifyContent: "space-between" }}>
                    <span>Kịch bản (mỗi dòng: Tên: lời thoại) - bỏ trống để tự dịch</span>
                </div>
                <textarea {...stop} onWheel={(e) => e.stopPropagation()} value={script} disabled={busy} rows={5} placeholder={"A: Chào bạn!\nB: Chào, mình khỏe.\nB: Còn bạn thì sao?"} onChange={(e) => set({ dubScript: e.target.value })} style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
                <button type="button" {...stop} style={{ ...btn, marginTop: 4, width: "100%", opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={showSegments}>Xem phân đoạn</button>
            </div>
            {analysis && (
                <div onWheel={(e) => e.stopPropagation()} style={{ fontSize: 11, maxHeight: 130, overflow: "auto", border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 6, padding: 6, whiteSpace: "pre-wrap", userSelect: "text" }}>
                    {analysis.segments.map((s, i) => `${i + 1}  [${fmtTime(s.start)}-${fmtTime(s.end)}]  ${s.speaker_id || "?"}  ${s.text_original}`).join("\n")}
                </div>
            )}

            {warnings.length > 0 && <div style={{ fontSize: 11, color: "#f59e0b", whiteSpace: "pre-wrap" }}>{`Dòng quá dài so với khung thời gian, nên rút gọn:\n${warnings.join("\n")}`}</div>}

            {names.length > 0 ? (
                <div>
                    <div style={{ ...label, display: "flex", justifyContent: "space-between" }}>
                        <span>Giọng cho từng nhân vật</span>
                        <span {...stop} onClick={loadVoices} style={{ cursor: "pointer", textDecoration: "underline" }}>Tải danh sách giọng</span>
                    </div>
                    {names.map((n) => (
                        <div key={n} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, minWidth: 48, overflow: "hidden", textOverflow: "ellipsis" }}>{n}</span>
                            <select {...stop} style={field} value={charVoices[n] || "auto"} disabled={busy} onChange={(e) => set({ dubVoices: { ...charVoices, [n]: e.target.value } })}>{voiceOptions(charVoices[n] || "auto")}</select>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    <div style={{ ...label, display: "flex", justifyContent: "space-between" }}>
                        <span>Giọng đọc</span>
                        <span {...stop} onClick={loadVoices} style={{ cursor: "pointer", textDecoration: "underline" }}>Tải danh sách giọng</span>
                    </div>
                    <select {...stop} style={field} value={voice} disabled={busy} onChange={(e) => set({ dubVoice: e.target.value })}>{voiceOptions(voice)}</select>
                </div>
            )}

            <div style={{ display: "flex", gap: 6 }}>
                <button type="button" {...stop} style={{ ...btn, flex: 1, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={start}>{busy ? "Đang chạy…" : "Lồng tiếng"}</button>
                {busy && <button type="button" {...stop} style={btn} onClick={() => abort?.abort()}>Hủy</button>}
            </div>
            {stage && <div style={{ fontSize: 12 }}>{stage}</div>}
            {report && <div style={{ fontSize: 11, color: "#f59e0b", whiteSpace: "pre-wrap" }}>{report}</div>}
            {error && <div style={{ fontSize: 12, color: "#f87171", whiteSpace: "pre-wrap" }}>{error}</div>}
        </div>
    );
}

export default definePlugin({
    id: "dub",
    name: "Lồng tiếng (VoiceStudio)",
    version: "0.2.0",
    description: "Lồng tiếng video bằng VoiceStudio: dịch hoặc theo kịch bản, nhiều giọng, căn thời gian.",
    nodes: [
        {
            type: "dub:voice-dub",
            title: "Lồng tiếng",
            icon: "🎙️",
            description: "Nối video vào, chọn ngôn ngữ, kịch bản và giọng từng nhân vật, bấm Lồng tiếng",
            defaultSize: { width: 320, height: 640 },
            defaultMetadata: { dubLang: "vi", dubTiming: "smart_fit", dubVoiceMatch: "per_line", dubVoice: "auto", dubScript: "", dubVoices: {} } as never,
            minimapColor: "#f59e0b",
            Content: DubContent,
        },
    ],
});
