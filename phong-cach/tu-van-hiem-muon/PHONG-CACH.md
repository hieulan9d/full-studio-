# Kit: Tư vấn hiếm muộn (một người dẫn + nền đồ hoạ y khoa động)

Rút từ **20 video mẫu** trong `E:\video mẫu để clone` (reel dọc, phân tích 2026-11-26). Mức giống: **3** (mặc định, người dùng chưa chọn).
**Chưa dựng thử video nào.** Số đo chi tiết và bảng video: `ref-notes.md`. Đọc `memory/` trước khi làm.

Khác hai kit kia: không cần After Effects bắt buộc, không B-roll toàn khung, không chữ sau lưng. Người dẫn đứng **suốt video**, chỉ **nền** đổi.

## 1. Công thức
1. **Người dẫn** (nữ, scrub y tế, ngồi/đứng cận ngang ngực, tay ra dấu, nói thẳng máy) hiện 100% thời lượng.
2. **Nền** sau lưng: hình/clip đồ hoạ y khoa 3D minh hoạ đúng ý đang nói, đổi mỗi **~3,4 s** (p25–p75: 2,4–4,6 s), hoà mờ ~0,4–0,5 s.
3. **Thẻ hook** trắng chữ đỏ ở ngực, ~3–5 s đầu; trong lúc đó không có phụ đề.
4. **Phụ đề** cụm ~3 từ, một dòng, từ đang đọc đổi xanh lá.
5. **Chữ ký** viết tay trắng "<Tên> - Hỗ trợ <lĩnh vực>" suốt video.
6. Cắt nhảy đổi cỡ khung (toàn ↔ cận) ở vài chỗ, nhất là cuối hook.

## 2. Số đo (quy về 1080×1920)
| Phần | Giá trị |
|---|---|
| Thời lượng | 26–97 s, trung vị 55 s, 30 fps |
| Tốc độ lời | ~4,8 âm tiết/s (4,4–5,3) → video 55 s ≈ 260 âm tiết |
| Độ to | −14 LUFS |
| Thẻ hook | nền trắng bo ~60 px, rộng ~660–780, 2–3 dòng; tâm y ~1330–1375 (ước từ 2 khung) |
| Chữ hook | đỏ `#d50921`, sans rất đậm, nghiêng, IN HOA, bước dòng ~78 px |
| Phụ đề | tâm y ~1435–1510, cỡ ~58 px, đậm, trắng viền đen; từ đang đọc `#59ff41` |
| Chữ ký | font script trắng, y ~1580–1725 (người đặt không cố định giữa các video) |
| Mặt người dẫn | nửa trên khung, lệch trái hoặc giữa; nền chính (vật minh hoạ) đặt ở khoảng trống cạnh đầu |

Bản dựng mới nên **cố định** một vị trí cho thẻ hook, phụ đề, chữ ký (mẫu xê dịch giữa các video).

## 3. Kịch bản
1. **Hook (0–4 s)**: một câu hỏi/tình huống cụ thể ("42 tuổi, kinh ít… sao thả mãi chưa có?", "Chu kỳ 27 ngày rụng trứng ngày nào?", "3 sai lầm…", "4 không khi tới tháng").
2. **Thân (4 s → ~80%)**: liệt kê "Thứ nhất, thứ hai…" hoặc giải thích cách tính; mỗi ý 1–2 câu, mỗi câu một nền.
3. **Kéo khách (~8–15 s cuối)**: đọc một chuỗi triệu chứng ("kinh ít, trứng lép, niêm mạc mỏng, u xơ…") → "nhắn cho <tên> để được hỗ trợ".

Năm kiểu đề tài gặp trong mẫu: tính ngày rụng trứng theo ngày cụ thể; dấu hiệu bệnh; N điều nên/không nên; thực phẩm; tình huống của một khách.

## 4. Nền: cách làm
Mỗi ý một prompt ảnh → clip chuyển động nhẹ. Nhóm hình trong mẫu: giải phẫu tử cung/buồng trứng dạng 3D (không máu), tế bào trứng và tinh trùng phát sáng, lịch để bàn có khoanh ngày, đồng hồ/đồng hồ cát, thực phẩm tươi, gia đình/mẹ bầu minh hoạ, hạt sáng trừu tượng.
Tông: hồng cam ấm hoặc xanh đậm; độ sáng khung TB ~120/255, bão hoà ~110/255.
Prompt Flow: không đưa trẻ em, không cơ thể thật, không máu, không chữ trong hình (mẫu có chữ AI viết sai, đừng bắt chước).
Một video 55 s cần **~14–16 nền** → tốn credit, phải ghi số clip trong bản duyệt.

## 5. Người dẫn
Đã chốt 2026-11-26: **người dẫn AI mới** + giọng AI. Hồ sơ, prompt và rủi ro khớp môi: `NGUOI-DAN.md`.
**Không tái tạo khuôn mặt, giọng, tên hay chữ ký của người trong mẫu** trừ khi người dùng xác nhận đó là người/kênh của họ hoặc khách của họ.

## 6. Dựng (đề xuất, chưa kiểm)
Lớp từ dưới lên: nền (đổi theo mốc lời, dissolve 12–15 khung) → người đã tách nền → thẻ hook → phụ đề → chữ ký.
Xương sống thời gian là **lời**: viết kịch bản → thu/tạo giọng → lấy mốc từng từ → đặt nền theo câu. Có thể dùng `vf`/ffmpeg, CapCut hoặc kit `talking-head`.
Phụ đề lấy chữ từ **kịch bản gốc**, không dùng chữ whisper (sai nhiều từ y khoa).

## 7. Nội dung y tế (bắt buộc, đọc `talking-head/knowledge/10`)
Mẫu có nhiều câu **không nên chép**: "combo thảo dược tăng kích thước và chất lượng trứng", "viêm lộ tuyến diện rộng lành lặn không phải đốt điện", "thành công rất nhiều ca báo bầu", khoe que thử thai của khách, chuỗi "nhắn em hỗ trợ" cho u xơ/u nang/đa nang.
- Dùng "hỗ trợ / góp phần"; không hứa có thai, không chữa khỏi; khuyên đi khám chuyên khoa.
- Sản phẩm bảo vệ sức khoẻ phải có dòng "không phải thuốc…".
- Mẫu viết tách chữ nhạy cảm ("K.INH", "TR.ỨNG", "V.IÊM") để né bộ lọc nền tảng. Kit này **không làm vậy**.
- Liệt kê mọi câu khẳng định sức khoẻ trong báo cáo để người có chuyên môn duyệt.

## 8. Chưa kiểm
Nhạc nền và SFX (AI không nghe được); font chính xác; ease của chữ; người dẫn trong mẫu là người thật hay AI; nền là clip AI hay stock.
