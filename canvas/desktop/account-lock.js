// Mỗi tài khoản (một profile Brave) chỉ một việc tạo tại một thời điểm, kể cả giữa các tiến trình.
const fs = require("node:fs");
const path = require("node:path");

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

function lockAccount(dir, name) {
  const file = path.join(dir, `lock-${name}.pid`);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      fs.writeFileSync(file, String(process.pid), { flag: "wx" });
      return () => { try { fs.unlinkSync(file); } catch {} };
    } catch {
      let pid = 0;
      try { pid = Number(fs.readFileSync(file, "utf8")); } catch {}
      if (pid && alive(pid)) break;
      try { fs.unlinkSync(file); } catch {} // khoá bỏ lại của tiến trình đã tắt
    }
  }
  throw new Error("Tài khoản này đang bận tạo ở nơi khác: " + name);
}

module.exports = { lockAccount };
