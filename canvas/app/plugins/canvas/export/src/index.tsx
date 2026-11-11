// Export node: writes the audio/video/image of upstream nodes (or the whole canvas) to a local folder via canvas-proxy,
// plus a manifest.json describing them, so external tools (e.g. the video-edit system) can read real files.
import { definePlugin, useEffect, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeData } from "@infinite-canvas/plugin-sdk";

const PROXY = "http://127.0.0.1:23210"; // canvas-proxy also owns the export folder (see app/canvas-proxy/index.js)
const MEDIA = new Set(["audio", "video", "image"]);
const EXT_BY_MIME: Record<string, string> = {
    "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mp4": ".m4a", "audio/ogg": ".ogg",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
    "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif",
};
const DEFAULT_EXT: Record<string, string> = { audio: ".mp3", video: ".mp4", image: ".png" };

const slug = (text: string) => text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "node";

async function send(name: string, body: Blob | string) {
    const res = await fetch(`${PROXY}/__export?name=${encodeURIComponent(name)}`, { method: "POST", body });
    const json = (await res.json().catch(() => ({}))) as { error?: string; dir?: string; path?: string; url?: string };
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
}

function ExportContent({ ctx }: CanvasNodeContentProps) {
    const meta = (ctx.node.metadata || {}) as Record<string, unknown>;
    const wholeCanvas = meta.exportAll === true;
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState("");
    const [error, setError] = useState("");

    const isReady = (n: CanvasNodeData) => MEDIA.has(n.type) && n.metadata?.status !== "error" && !!n.metadata?.content;
    const candidates = (wholeCanvas ? ctx.getNodes() : ctx.getUpstream())
        .filter((n) => n.id !== ctx.node.id && isReady(n))
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

    const report = (patch: Record<string, unknown>) => ctx.updateMetadata({ exportResult: { at: new Date().toISOString(), ...patch } } as never);

    const run = async () => {
        setBusy(true); setError(""); setLog("");
        try {
            if (!candidates.length) throw new Error("Chưa có node âm thanh/video/ảnh nào đã tạo xong để xuất.");
            const pad = String(candidates.length).length;
            const manifest: Array<Record<string, unknown>> = [];
            let dir = "";
            for (let i = 0; i < candidates.length; i++) {
                const n = candidates[i];
                const m = (n.metadata || {}) as Record<string, unknown>;
                setLog(`Đang xuất ${i + 1}/${candidates.length}…`);
                const blob = await (await fetch(String(m.content))).blob();
                const mime = String(m.mimeType || blob.type || "");
                const file = `${String(i + 1).padStart(pad, "0")}_${slug(n.title || n.type)}${EXT_BY_MIME[mime] || DEFAULT_EXT[n.type]}`;
                const saved = await send(file, blob);
                dir = saved.dir || dir;
                manifest.push({ order: i + 1, nodeId: n.id, type: n.type, name: n.title, file, path: saved.path, url: saved.url, mimeType: mime || undefined, bytes: blob.size, durationMs: m.durationMs, prompt: m.prompt });
            }
            await send("manifest.json", JSON.stringify({ exportedAt: new Date().toISOString(), scope: wholeCanvas ? "canvas" : "upstream", dir, items: manifest }, null, 2));
            setLog(`Đã xuất ${manifest.length} file + manifest.json vào:\n${dir}`);
            report({ ok: true, count: manifest.length, dir, manifest: `${dir}\\manifest.json` });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const shown = /Failed to fetch/i.test(msg) ? "Không kết nối được proxy cục bộ (127.0.0.1:23210). Mở app bằng app.bat." : msg;
            setError(shown);
            setLog("");
            report({ ok: false, error: shown });
        } finally {
            setBusy(false);
        }
    };

    // An agent (MCP update_node) can set exportRequest to any new value to trigger an export; exportHandled marks it as taken.
    useEffect(() => {
        const request = meta.exportRequest;
        if (!request || request === meta.exportHandled || busy) return;
        ctx.updateMetadata({ exportHandled: request } as never);
        void run();
    }, [meta.exportRequest]);

    const btn = { padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 12 } as const;
    const stop = { "data-canvas-no-zoom": true, onMouseDown: (e: { stopPropagation: () => void }) => e.stopPropagation() } as const;

    return (
        <div onWheel={(e) => e.stopPropagation()} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", gap: 8, padding: 12, boxSizing: "border-box", color: ctx.theme.node.text, overflow: "auto" }}>
            <label {...stop} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={wholeCanvas} disabled={busy} onChange={(e) => ctx.updateMetadata({ exportAll: e.target.checked } as never)} />
                Xuất toàn bộ canvas (bỏ chọn: chỉ node nối vào đây)
            </label>
            <div style={{ fontSize: 12, color: candidates.length ? ctx.theme.node.text : ctx.theme.node.placeholder }}>
                {candidates.length ? `Sẽ xuất ${candidates.length} file (sắp theo vị trí từ trên xuống).` : "Nối node âm thanh/video/ảnh vào đây, hoặc bật xuất toàn bộ."}
            </div>
            <button type="button" {...stop} style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={run}>{busy ? "Đang xuất…" : "Xuất ra thư mục"}</button>
            {log && <div style={{ fontSize: 12, whiteSpace: "pre-wrap", userSelect: "text", wordBreak: "break-all" }}>{log}</div>}
            {error && <div style={{ fontSize: 12, color: "#f87171", whiteSpace: "pre-wrap" }}>{error}</div>}
        </div>
    );
}

export default definePlugin({
    id: "export",
    name: "Xuất file ra thư mục",
    version: "0.1.0",
    description: "Ghi âm thanh/video/ảnh của canvas ra thư mục trên máy kèm manifest.json cho công cụ ngoài.",
    nodes: [
        {
            type: "export:folder",
            title: "Xuất file",
            icon: "📤",
            description: "Nối node vào, bấm Xuất: file thật được ghi vào thư mục exports",
            defaultSize: { width: 300, height: 190 },
            defaultMetadata: { exportAll: false } as never,
            minimapColor: "#10b981",
            Content: ExportContent,
        },
    ],
});
