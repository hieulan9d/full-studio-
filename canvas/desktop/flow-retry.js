// Tạo Flow bị lỗi: đóng trình duyệt, mở lại, tự tạo lại (dùng cho flow-cli.js).
// Không tạo lại khi cần người dùng xử lý (captcha, "hoạt động bất thường", đăng nhập, hết điểm, chưa có project)
// hoặc khi nội dung bị chính sách chặn (phải sửa prompt).
const NEEDS_USER = /captcha|unusual activity|hoạt động bất thường|Cần đăng nhập|accounts\.google|không đủ điểm|Chưa chọn project|Không tìm thấy Brave|vi phạm|policy|chính sách/i;

// generate() -> {ok, items, error, stage}; restart() đóng trình duyệt; fetchLast() tải lại video vừa tạo (không tốn điểm)
async function generateWithRetry({ generate, restart, fetchLast, retries = 2, log = console.log }) {
  for (let attempt = 1; ; attempt++) {
    const res = await generate();
    if (res.ok) return res.items;
    if (NEEDS_USER.test(res.error)) throw new Error(`${res.error}\n[flow] DỪNG: cần người dùng xử lý hoặc phải sửa prompt, không tự tạo lại.`);
    log(`[flow] lỗi lần ${attempt}: ${res.error.split("\n")[0]}`);

    // Flow đã tạo xong, chỉ hỏng lúc tải: chỉ tải lại, tuyệt đối không tạo lại (tốn điểm lần hai)
    if (res.stage === "download" && fetchLast) {
      await restart();
      try {
        return [await fetchLast()];
      } catch (e) {
        throw new Error(`Video đã tạo trên Flow nhưng không tải được (${e.message || e}). Dùng --fetch 1 để lấy lại, đừng tạo lại.`);
      }
    }
    if (attempt > retries) throw new Error(`${res.error}\n[flow] DỪNG: đã thử ${attempt} lần.`);
    log(`[flow] đóng trình duyệt, mở lại và tạo lại (lần ${attempt + 1}/${retries + 1})`);
    await restart();
  }
}

module.exports = { generateWithRetry };
