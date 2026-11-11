/**
 * Infinite Canvas model request script: tạo ảnh qua Google Flow, app tự điều khiển giao diện web Flow
 * (không FlowKit, không Python). Chỉ chạy trong app desktop (window.desktop.flow).
 * Lần đầu: menu Flow > "Mở Chrome Flow", đăng nhập Google và mở 1 project; app nhớ project đó.
 * Base URL / API Key trong cài đặt canvas điền bừa, không dùng.
 * model: flow-nano-banana-pro | flow-nano-banana-2-lite | flow-nano-banana-2-1
 */
async function flowImage({ prompt, images, params, model }) {
  const flow = window.desktop && window.desktop.flow;
  if (!flow) throw new Error("Cần chạy trong app desktop (app.bat). Trình duyệt thường không điều khiển được Flow.");

  const MODEL = {
    "flow-nano-banana-pro": "Nano Banana Pro", "flow-nano-banana-2-lite": "Nano Banana 2 Lite", "flow-nano-banana-2-1": "Nano Banana 2.1",
  }[model] || "Nano Banana 2.1";

  // tỉ lệ: Flow có 16:9, 4:3, 1:1, 3:4, 9:16
  const size = String((params && params.size) || "auto");
  let ratio = ["16:9", "4:3", "1:1", "3:4", "9:16"].includes(size) ? size : "";
  if (!ratio) {
    const m = size.match(/^(\d+)x(\d+)$/);
    if (m) {
      const r = m[1] / m[2];
      ratio = r > 1.5 ? "16:9" : r > 1.1 ? "4:3" : r > 0.9 ? "1:1" : r > 0.7 ? "3:4" : "9:16";
    } else ratio = "16:9";
  }
  const count = Math.min(4, Math.max(1, Number(params && params.count) || 1));

  // tên ảnh trên Flow = tên node: canvas gắn nhãn "Ảnh N (tên node)" vào prompt (tên <= 24 ký tự)
  const refNames = [];
  for (const nm of String(prompt).matchAll(/Ảnh (\d+) \(([^)\n]{1,24})\)/g)) if (!refNames[nm[1] - 1]) refNames[nm[1] - 1] = nm[2].trim();
  const fileNameOf = (i) => { const n = refNames[i] || `Ảnh ${i + 1}`; return /\.(png|jpe?g|webp)$/i.test(n) ? n : n + ".png"; };
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

  const res = await flow.generateImage({ prompt: text, model: MODEL, ratio, count, images: imgs });
  if (!res.ok) throw new Error(res.error);

  // đổi sang data URL để canvas lưu được
  const toDataUrl = (blob) => new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(blob); });
  const out = [];
  for (const it of res.items) out.push(await toDataUrl(new Blob([it.data], { type: it.mime || "image/png" })));
  return out;
}

return await flowImage({ prompt, images, params, model });
