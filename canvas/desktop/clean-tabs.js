// Brave khôi phục các tab của lần trước mỗi khi mở lại profile, nên tab dồn dần.
// Gọi NGAY SAU khi tự mở trình duyệt: giữ đúng một tab (ưu tiên tab khớp `prefer`), đóng phần còn lại.
// Chỉ đóng tab, không đụng cookie hay phiên đăng nhập.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cleanTabs(port, prefer) {
  const base = `http://127.0.0.1:${port}/json`;
  const pages = async () => (await (await fetch(base + "/list")).json()).filter((t) => t.type === "page");
  try {
    // đợi số tab đứng yên: việc khôi phục phiên cũ diễn ra sau khi cổng debug đã mở
    let list = await pages();
    for (let i = 0, same = 0; i < 20 && same < 3; i++) {
      await sleep(500);
      const next = await pages();
      same = next.length === list.length ? same + 1 : 0;
      list = next;
    }
    const keep = list.find((t) => t.url.startsWith(prefer)) || list[0];
    for (const t of list) if (t !== keep) await fetch(`${base}/close/${t.id}`);
    // tab đóng chậm vài giây: đợi hẳn để bước sau không bám nhầm vào tab đang đóng
    for (let i = 0; i < 24 && (await pages()).length > 1; i++) await sleep(500);
  } catch {} // dọn không được thì vẫn dùng bình thường
}

module.exports = { cleanTabs };
