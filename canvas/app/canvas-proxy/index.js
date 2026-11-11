#!/usr/bin/env node
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = createRequire(import.meta.url)("./package.json");

const CORS_HEADERS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "*",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "*",
    "access-control-max-age": "86400",
};

/** Headers that describe the hop to this proxy rather than the upstream request. */
const SKIP_REQUEST_HEADERS = new Set(["host", "connection", "content-length", "accept-encoding", "origin", "referer", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site"]);
/** fetch() already decoded and re-framed the body, so the upstream framing headers no longer apply. */
const SKIP_RESPONSE_HEADERS = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

function readArg(args, name, fallback) {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

function readTarget(url) {
    const raw = url.slice(1);
    // decodeURI undoes the escaping browsers apply to the path while keeping intentional encodeURIComponent escapes.
    let target = raw;
    try {
        target = decodeURI(raw);
    } catch {
        // Malformed escape sequence: forward the raw form instead of failing.
    }
    // Some clients collapse the "//" in the embedded target URL, so restore it before parsing.
    target = target.replace(/^(https?:)\/*/i, "$1//");
    return /^https?:\/\/[^/]/i.test(target) ? target : "";
}

function requestHeaders(req) {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (SKIP_REQUEST_HEADERS.has(key) || value === undefined) continue;
        headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
    return headers;
}

function responseHeaders(upstream) {
    const headers = { ...CORS_HEADERS };
    upstream.headers.forEach((value, key) => {
        if (SKIP_RESPONSE_HEADERS.has(key) || key.startsWith("access-control-")) return;
        headers[key] = value;
    });
    return headers;
}

function sendJson(res, status, payload) {
    res.writeHead(status, { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function logForward(method, target, outcome, startedAt) {
    console.log(`${new Date().toLocaleTimeString()} ${method} ${target} -> ${outcome} ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

async function forward(req, res, target) {
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
    const upstream = await fetch(target, { method: req.method, headers: requestHeaders(req), body, redirect: "follow" });
    // Logged as soon as the status line arrives, so a long SSE stream still shows up immediately.
    res.writeHead(upstream.status, responseHeaders(upstream));
    if (!upstream.body) {
        res.end();
        return upstream.status;
    }
    // Streamed so that SSE responses (text generation) reach the browser chunk by chunk.
    const stream = Readable.fromWeb(upstream.body);
    res.on("close", () => stream.destroy());
    stream.pipe(res);
    return upstream.status;
}

/** Folder the canvas "Xuất file" plugin writes into; other tools (e.g. the video-edit system) read from here. */
const EXPORT_DIR = resolve(process.env.CANVAS_EXPORT_DIR || join(fileURLToPath(new URL("../../exports", import.meta.url))));
const EXPORT_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".ogg", ".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt", ".json"]);
const EXPORT_MAX_BYTES = 1024 * 1024 * 1024;

/** Keeps only a bare, safe file name: no directories, no reserved characters, a known extension. */
function safeExportName(raw) {
    const base = basename(String(raw || "").replace(/\\/g, "/")).replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").trim();
    const ext = extname(base).toLowerCase();
    return base && EXPORT_EXTENSIONS.has(ext) ? base : "";
}

const MIME_BY_EXT = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8" };

async function handleExport(req, res, url) {
    const parsed = new URL(url, "http://localhost");
    const params = parsed.searchParams;
    // GET /__export/file/<name> downloads one exported file (curl-able).
    if (req.method === "GET" && parsed.pathname.startsWith("/__export/file/")) {
        const name = safeExportName(decodeURIComponent(parsed.pathname.slice("/__export/file/".length)));
        const path = name && join(EXPORT_DIR, name);
        const info = path ? await stat(path).catch(() => null) : null;
        if (!info?.isFile()) {
            sendJson(res, 404, { error: "File not found." });
            return;
        }
        res.writeHead(200, { ...CORS_HEADERS, "content-type": MIME_BY_EXT[extname(name).toLowerCase()] || "application/octet-stream", "content-length": info.size });
        createReadStream(path).pipe(res);
        return;
    }
    if (req.method === "GET") {
        const names = await readdir(EXPORT_DIR).catch(() => []);
        const files = [];
        for (const name of names) {
            const info = await stat(join(EXPORT_DIR, name)).catch(() => null);
            if (info?.isFile()) files.push({ name, bytes: info.size, modified: info.mtime.toISOString() });
        }
        sendJson(res, 200, { dir: EXPORT_DIR, files: files.map((f) => ({ ...f, path: join(EXPORT_DIR, f.name), url: `http://${req.headers.host || "127.0.0.1:23210"}/__export/file/${encodeURIComponent(f.name)}` })) });
        return;
    }
    if (req.method !== "POST") {
        sendJson(res, 405, { error: "Use POST to write a file or GET to list the folder." });
        return;
    }
    const name = safeExportName(params.get("name"));
    if (!name) {
        sendJson(res, 400, { error: "Missing or unsupported file name." });
        return;
    }
    const body = await readBody(req);
    if (body.length > EXPORT_MAX_BYTES) {
        sendJson(res, 413, { error: "File is too large." });
        return;
    }
    await mkdir(EXPORT_DIR, { recursive: true });
    const path = join(EXPORT_DIR, name);
    await writeFile(path, body);
    console.log(`${new Date().toLocaleTimeString()} export ${name} (${body.length} bytes)`);
    sendJson(res, 200, { dir: EXPORT_DIR, name, path, url: `http://${req.headers.host || "127.0.0.1:23210"}/__export/file/${encodeURIComponent(name)}`, bytes: body.length });
}

export function createProxyServer() {
    return createServer((req, res) => {
        if (req.method === "OPTIONS") {
            res.writeHead(204, CORS_HEADERS);
            res.end();
            return;
        }
        if (/^\/__export(\/|\?|$)/.test(req.url || "")) {
            handleExport(req, res, req.url || "").catch((error) => {
                if (!res.headersSent) sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
            });
            return;
        }
        const target = readTarget(req.url || "/");
        if (!target) {
            sendJson(res, 200, { app: "infinite-canvas", proxy: pkg.name, version: pkg.version, usage: "/<full-target-url>" });
            return;
        }
        const startedAt = Date.now();
        const method = req.method || "GET";
        forward(req, res, target)
            .then((status) => logForward(method, target, status, startedAt))
            .catch((error) => {
                const reason = error instanceof Error ? error.message : String(error);
                logForward(method, target, `failed (${reason})`, startedAt);
                if (res.headersSent) {
                    res.destroy();
                    return;
                }
                sendJson(res, 502, { error: reason });
            });
    });
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
    console.log(`${pkg.name} v${pkg.version}\n\nUsage: npx ${pkg.name}@latest [--port 23210] [--host 127.0.0.1]\n\nForwards http://<host>:<port>/<full-target-url> to <full-target-url> with permissive CORS headers.`);
    process.exit(0);
}

const port = Number(readArg(args, "port", process.env.PORT || 23210));
const host = readArg(args, "host", process.env.HOST || "127.0.0.1");

createProxyServer().listen(port, host, () => {
    console.log(`${pkg.name} v${pkg.version} listening on http://${host}:${port}`);
    console.log(`Fill this address into Infinite Canvas → 配置 → 本地代理: http://${host}:${port}`);
});
