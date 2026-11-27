// Tạo video Google Flow trực tiếp trên Brave (profile đã đăng nhập), KHÔNG cần mở canvas.
// Dùng chung flow-driver.js với app: tự mở Brave, đổi tài khoản khi thiếu điểm, điền form, bấm tạo, tải mp4 về.
//
//   node flow-cli.js --status                       (các tài khoản/profile và số điểm)
//   node flow-cli.js --add-account "ten"            (profile mới; người dùng tự đăng nhập)
//   node flow-cli.js --account "ten|email|id" ...   (chọn tài khoản/profile)
//   node flow-cli.js --make-image --prompt "..." --aspect 9:16 --name hook_01
//   node flow-cli.js --prompt-file canh1.txt --image "Nhan vat.png" --aspect 9:16 --seconds 6 --name canh1
//   node flow-cli.js --fetch 1            (tải video mới nhất đã có, không tốn điểm)
//
// Flow báo lỗi thì tự đóng trình duyệt, mở lại và tạo lại (--retries, mặc định 2 lần). Captcha/đăng nhập/hết điểm/chính sách thì dừng.
// Ảnh tham chiếu được đặt tên trên Flow theo tên tệp: nhắc đúng tên tệp (cả đuôi) trong prompt để chèn "@".
const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");

// flow-driver.js viết cho Electron: thay module "electron" bằng bản tối giản
const handlers = {};
const electron = {
  ipcMain: { handle: (name, fn) => (handlers[name] = fn) },
  dialog: { showErrorBox: (t, m) => console.error(t, m) },
};
const load = Module._load;
Module._load = function (request, ...rest) {
  return request === "electron" ? electron : load.call(this, request, ...rest);
};
const driver = require("./flow-driver.js");
const { generateWithRetry } = require("./flow-retry.js");
const { saveOutput, outputDir } = require("./output-dir.js");
const { lockAccount } = require("./account-lock.js");
driver.setup({ getPath: () => process.env.FLOW_DATA || "D:\\infiniti canvas" });

const argv = process.argv.slice(2);
const all = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] ? [argv[i + 1]] : []));
const opt = (flag, fallback) => all(flag)[0] ?? fallback;

// mọi tệp về một thư mục duy nhất (output-dir.js)
function save(data, name, mime = "video/mp4") {
  const file = saveOutput(data, name, mime);
  console.log(`Đã lưu: ${file} (${(data.length / 1048576).toFixed(1)} MB)`);
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

async function main() {
  if (argv.includes("--out")) console.warn("Bỏ qua --out: mọi tệp lưu vào " + outputDir());
  const name = opt("--name", `flow-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`);
  const wanted = opt("--account");
  if (wanted) {
    const s = await handlers["flow:accounts"]();
    const a = (s.accounts || []).find((x) => [x.id, x.name, x.email].includes(wanted));
    if (!a) throw new Error("Không có tài khoản: " + wanted);
    await handlers["flow:switch-account"](null, a.id);
  }
  if (argv.includes("--add-account")) {
    // mở Brave với profile mới: NGƯỜI DÙNG tự đăng nhập Google rồi mở/tạo một project Flow, sau đó chạy --status
    const s = await handlers["flow:add-account"]();
    const label = opt("--add-account");
    const active = s.accounts.find((a) => a.active);
    if (label && !label.startsWith("--") && active) await handlers["flow:rename-account"](null, active.id, label);
    return console.log("Đã mở profile mới. Đăng nhập Google trong cửa sổ Brave, mở một project Flow, rồi chạy: node flow-cli.js --status");
  }
  if (argv.includes("--status")) return console.log(JSON.stringify(await handlers["flow:status"](), null, 1));
  if (argv.includes("--fetch")) {
    const v = await driver.fetchVideo(Number(opt("--fetch", "1")) - 1);
    return save(v.data, name);
  }

  const file = opt("--prompt-file");
  const prompt = (file ? fs.readFileSync(file, "utf8").replace(/^﻿/, "") : opt("--prompt", "")).trim();
  if (!prompt) throw new Error("Thiếu --prompt hoặc --prompt-file (xem chú thích đầu tệp).");
  const images = all("--image").map((p) => ({
    name: path.basename(p),
    mime: MIME[path.extname(p).toLowerCase()] || "image/png",
    base64: fs.readFileSync(p).toString("base64"),
  }));
  const retries = Number(opt("--retries", "2"));
  const dataDir = process.env.FLOW_DATA || "D:\\infiniti canvas";
  if (process.env.FLOW_ACCOUNT) process.once("exit", lockAccount(dataDir, "flow-" + process.env.FLOW_ACCOUNT));
  const restart = () => driver.closeBrowser();
  if (argv.includes("--make-image")) {
    const generate = () => handlers["flow:generate-image"](null, {
      prompt,
      images,
      model: opt("--model", "Nano Banana Pro"),
      ratio: opt("--aspect", "9:16"),
      count: 1,
      timeoutMin: Number(opt("--timeout", "5")),
    });
    const items = await generateWithRetry({ generate, restart, retries });
    return items.forEach((item) => save(item.data, name, item.mime));
  }
  const generate = () => handlers["flow:generate-video"](null, {
    prompt,
    images,
    model: opt("--model", "Omni 1.2 Flash"),
    mode: argv.includes("--frames") ? "frames" : "reference",
    aspect: opt("--aspect", "9:16") === "9:16" ? "portrait" : "landscape",
    resolution: opt("--resolution", "720p"),
    seconds: Number(opt("--seconds", "6")),
    count: 1,
    timeoutMin: Number(opt("--timeout", "10")),
  });
  const items = await generateWithRetry({ generate, restart, retries, fetchLast: () => driver.fetchVideo(0) });
  items.forEach((item) => save(item.data, name));
}

main()
  .catch((e) => {
    console.error("LỖI:", e.message || e);
    process.exitCode = 1;
  })
  .finally(() => {
    driver.destroy(); // chỉ ngắt kết nối, để cửa sổ Brave mở
    setTimeout(() => process.exit(), 300);
  });
