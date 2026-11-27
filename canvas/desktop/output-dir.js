// Một thư mục DUY NHẤT cho mọi ảnh/video tạo ra (canvas: Muse, Flow, Gemini; dòng lệnh: flow-cli, gemini-driver).
// Đổi chỗ lưu: biến môi trường OUTPUT_DIR, hoặc "outputDir" trong %APPDATA%\\infinite-canvas-flow-config.json.
const fs = require("node:fs");
const path = require("node:path");

function outputDir() {
  let configured = "";
  try { configured = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA || "", "infinite-canvas-flow-config.json"), "utf8")).outputDir || ""; } catch {}
  return process.env.OUTPUT_DIR || configured || "E:\\XUAT-VIDEO\\AI";
}

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

// không bao giờ ghi đè: trùng tên thì thêm -2, -3…
function saveOutput(data, name, mime) {
  const dir = outputDir();
  fs.mkdirSync(dir, { recursive: true });
  const base = String(name || "tep").replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-").slice(0, 120);
  const ext = EXT[String(mime).split(";")[0].trim()] || (String(mime).startsWith("image/") ? "png" : "mp4");
  let file = path.join(dir, `${base}.${ext}`);
  for (let i = 2; fs.existsSync(file); i++) file = path.join(dir, `${base}-${i}.${ext}`);
  fs.writeFileSync(file, Buffer.from(data), { flag: "wx" });
  return file;
}

module.exports = { outputDir, saveOutput };
