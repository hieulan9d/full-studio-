/**
 * Infinite Canvas model request script: video qua Gemini web (công cụ "Tạo video"), app điều khiển trình duyệt thật.
 * Chỉ chạy trong app desktop. Lần đầu: Cài đặt > Tài khoản Gemini > Thêm tài khoản, tự đăng nhập Google.
 * Base URL / API Key trong cài đặt canvas điền bừa, không dùng.
 * Chỉ chọn được tỉ lệ (16:9 hoặc 9:16). Không chọn được số giây và độ phân giải. Mỗi lần tạo tốn một lượt trong ngày.
 */
async function geminiVideo({ prompt, images, videos, audios, params }) {
  const gemini = window.desktop && window.desktop.gemini;
  if (!gemini || !gemini.generateVideo) throw new Error("Cần chạy trong app desktop bản mới (đóng hẳn app rồi mở lại).");
  if ((videos && videos.length) || (audios && audios.length)) throw new Error("Gemini web ở đây chỉ nhận ảnh tham chiếu. Hãy bỏ video/âm thanh tham chiếu.");

  const p = params || {};
  const aspect = ["9:16", "3:4", "720x1280", "1080x1920"].includes(String(p.ratio || p.size || "16:9")) ? "9:16" : "16:9";
  const text = String(prompt)
    .replace(/^Nhãn ảnh tham chiếu:[^\n]*\n+/, "")
    .replace(/【[^】\n]*】\s*/g, "");
  const imgs = (images || []).slice(0, 7).map((d) => {
    const m = String(d).match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("Ảnh tham chiếu không phải data URL");
    return { mime: m[1], base64: m[2] };
  });

  const res = await gemini.generateVideo({ prompt: text, aspect, images: imgs });
  if (!res.ok) throw new Error(res.error);
  return { blob: new Blob([res.data], { type: res.mime || "video/mp4" }) };
}

return await geminiVideo({ prompt, images, videos, audios, params });
