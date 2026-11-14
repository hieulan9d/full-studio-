/**
 * Infinite Canvas model request script: video qua Google Flow, app tự điều khiển giao diện web Flow
 * (không FlowKit, không Python). Chỉ chạy trong app desktop (window.desktop.flow).
 * Lần đầu: Cài đặt > Tài khoản Flow > "Mở Flow", đăng nhập Google và mở 1 project; app nhớ project đó.
 * Base URL / API Key trong cài đặt canvas điền bừa, không dùng.
 * Không ảnh = text-to-video | mode reference = ảnh tham chiếu (Thành phần) | mode frames = khung đầu/cuối.
 * model: flow-omni-1.2-flash | flow-omni-1.1-flash
 */
async function flowVideo({ prompt, images, videos, audios, params, model, signal }) {
  const flow = window.desktop && window.desktop.flow;
  if (!flow) throw new Error("Cần chạy trong app desktop (app.bat). Trình duyệt thường không điều khiển được Flow.");
  if ((videos && videos.length) || (audios && audios.length))
    throw new Error("Flow chưa hỗ trợ video hoặc âm thanh tham chiếu. Hãy bỏ chúng ra, hoặc chụp khung hình từ video làm ảnh tham chiếu.");

  const p = params || {};
  const maxSeconds = /omni-1\.1|omni-flash-11/.test(model) ? 10 : 15; // Omni 1.2 Flash tối đa 15s, Omni 1.1 Flash tối đa 10s
  const seconds = Math.min(maxSeconds, Math.max(3, Math.round(+p.seconds || 6)));
  const ratioStr = String(p.ratio || p.size || "16:9");
  const aspect = ["9:16", "3:4"].includes(ratioStr) ? "portrait" : "landscape";
  const resolution = String(p.resolution || "").includes("360") ? "360p" : "720p";
  const MODEL = {
    "flow-omni-1.2-flash": "Omni 1.2 Flash", "flow-omni-1.1-flash": "Omni 1.1 Flash",
    "flow-omni-flash": "Omni 1.2 Flash", "flow-omni-flash-11": "Omni 1.1 Flash", // tên cũ, node cũ vẫn chạy
  }[model] || "Omni 1.2 Flash";

  // tên ảnh trên Flow = tên node: canvas gắn nhãn "Ảnh N (tên node)" vào prompt (tên <= 24 ký tự)
  const refNames = [];
  for (const nm of String(prompt).matchAll(/Ảnh (\d+) \(([^)\n]{1,24})\)/g)) if (!refNames[nm[1] - 1]) refNames[nm[1] - 1] = nm[2].trim();
  // ưu tiên tên do canvas gửi kèm (params.imageNames = tiêu đề node + .png); nhãn trong prompt chỉ là dự phòng
  const given = Array.isArray(p.imageNames) ? p.imageNames : [];
  const fileNameOf = (i) => { const n = String(given[i] || "").trim() || refNames[i] || `Ảnh ${i + 1}`; return /\.(png|jpe?g|webp)$/i.test(n) ? n : n + ".png"; };
  const text = String(prompt)
    .replace(/^Nhãn ảnh tham chiếu:[^\n]*\n+/, "")
    .replace(/【[^】\n]*】\s*/g, "") // nhãn node văn bản do canvas thêm
    .replace(/Ảnh (\d+) \(([^)\n]{1,24})\)/g, (_, n) => fileNameOf(n - 1))
    .replace(/Ảnh (\d+)(?!\d)/g, (_, n) => fileNameOf(n - 1));

  const imgs = (images || []).slice(0, 7).map((d, i) => {
    const m = String(d).match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("Ảnh tham chiếu không phải data URL");
    return { mime: m[1], base64: m[2], name: fileNameOf(i) };
  });

  const res = await flow.generateVideo({
    prompt: text, model: MODEL, aspect, resolution, seconds, count: 1, images: imgs,
    mode: p.mode !== "reference" && imgs.length && imgs.length <= 2 ? "frames" : "ingredients",
  });
  if (!res.ok) throw new Error(res.error);
  return { blob: new Blob([res.data], { type: res.mime || "video/mp4" }) };
}

return await flowVideo({ prompt, images, videos, audios, params, model, signal });
