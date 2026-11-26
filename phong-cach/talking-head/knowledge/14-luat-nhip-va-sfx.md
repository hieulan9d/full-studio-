# 14. Luật nhịp và SFX (đo từ Foodtage, áp cho nội dung bất kỳ)

Sinh ra 2026-11-19 sau khi người dùng chỉ ra: video **có mẫu** (Foodtage) thì đẹp, video **nội dung khác** (video-chi) thì thưa, SFX và chữ chuyển động kém.
Nguyên nhân: kit lưu "đáp án" của một video (mốc giây hard-code) mà không lưu **luật**. File này là luật. Nhãn: **[đo]** = đếm từ `examples/foodtage/build-v1-verified.jsx`, **[chưa kiểm]** = đề xuất, cần người dùng xem.

## 1. Mật độ tối thiểu (mặc định, thắng "nhịp vừa" cũ)
| Chỉ số | Foodtage (người dùng duyệt) [đo] | Chuẩn tối thiểu cho video mới |
|---|---|---|
| Sự kiện hình mới (chữ vào, thẻ, số, nháy, zoom giật, B-roll) | ~1 mỗi 0,5 s (không tính phụ đề) | **≥ 1 mỗi 1,5 s**, không có khoảng trống hình > 2 s |
| Phụ đề từng từ | ~50 từ / 22 s, chồng dòng, từ nhấn đổi màu/cỡ | **Có**, trừ lúc có B-roll phủ khung hoặc thẻ lớn |
| SFX | ~80 lần / 22 s, 11 loại file | **≥ 1 mỗi 1 s** kể cả click từng từ; **≥ 6 loại** file khác nhau |
| Zoom/giật | 8 đoạn / 22 s | **≥ 1 đoạn mỗi 5 s**, cuối đoạn nhảy cắt |
| Chữ từ khoá | neon/gradient có phát sáng + vệt sáng quét + vào scale 135→100 trong 5 khung | luôn có **vệt sáng quét + phát sáng cùng màu**, không để chữ phẳng |
Biến thể B (thương hiệu) và C **không** được tự hạ mật độ xuống "vừa 2,4 s". Muốn nhẹ hơn phải do người dùng nói.

## 2. Bước "tìm điểm nhấn" (bắt buộc, trong plan.md)
Nội dung kể liền mạch không tự có nhịp như "3 cách… số 1, số 2". Trước khi dựng, đánh dấu trên transcript **mọi** điểm sau, mỗi điểm một dòng trong plan:
1. **Từ khoá** (danh từ/tính từ chủ đạo của câu) → chữ to sau lưng người hoặc nhãn hai cấp.
2. **Con số / đơn vị / tên riêng** → thẻ hoặc số đếm.
3. **Chuyển ý** (dấu chấm, khoảng lặng ≥ 0,3 s, "còn", "đặc biệt", "bắt đầu từ") → nháy trắng + whoosh + zoom giật.
4. **Danh sách** (≥ 2 mục liên tiếp) → mỗi mục một hiệu ứng riêng cùng kiểu, cách nhau theo nhịp nói.
5. **Mô tả vật/cảnh** → B-roll hoặc ảnh minh hoạ.
6. **Mọi từ còn lại** → phụ đề từng từ (có từ nhấn đổi màu).
Câu nào không có điểm nào trong 1–5 vẫn phải có phụ đề từng từ + zoom.

## 3. Bảng điểm nhấn → SFX → hiệu ứng (kho đã duyệt `saas-animation/audio/sfx`)
Mốc SFX: **đúng khung từ được nói** (từ khoá, số) hoặc **đúng khung hiệu ứng vào**; riser kết thúc đúng khung nó dẫn tới.
| Điểm nhấn | SFX chính | SFX phụ (lệch) | Mức so với giọng | Hiệu ứng hình đi kèm |
|---|---|---|---|---|
| Từ khoá to sau lưng người | `impact_b` (nhẹ) hoặc `pop_b` | `sparkle_a` +0,03 s | impact −20, pop −12 | vào scale 135→100 / 5 khung + vệt sáng quét |
| Tên thương hiệu | `impact_a` | `shimmer_a` +0,1 s | −18 | chữ to + thẻ sản phẩm bay vào + nháy trắng |
| Nhãn hai cấp | `tick_b` lúc dòng nhỏ vào, `pop_c` lúc dòng to | — | −16 / −14 | blur 18→0 trong 0,3 s |
| Số đếm / bảng thành phần | `tick_a` mỗi bước đếm, `pop_b` lúc dừng | `sparkle_b` | −18 / −14 | số đếm 0→giá trị theo từ nói |
| Chuyển ý (nháy trắng) | `whoosh_a/b/c` (xoay vòng) | `swoosh_up_a` 0,15 s trước | −12 | nháy 0,3 s + zoom giật |
| Dẫn tới điểm quan trọng | `riser_a/b` 1,5–2 s, đỉnh đúng khung đích | — | −14 | không có hình, chỉ zoom chậm |
| B-roll vào / ra | `whoosh_*` / `swoosh_up_*` | — | −12 / −16 | phủ khung + lớp tối |
| Phụ đề từng từ | `click_a/b/c` xoay vòng | — | **−20** (nhiều, phải nhỏ) | từ trượt lên 30 px + blur |
| Từ nhấn trong phụ đề | `pop_a` thay click | — | −14 | đổi màu + cỡ ×1,25 |
Không dùng cùng một file liền nhau hai lần (xoay `a/b/c`). `glitch`, `typing` chỉ khi người dùng cho phép.
`impact` trong nội dung y tế: chỉ **nhẹ (−20 dB) và ≤ 3 lần / video**; ghi rõ vào report để người dùng nghe và quyết. [chưa kiểm]

## 4. Kiểm sau khi dựng (đo, không cảm giác)
Đếm từ file build: số sự kiện hình / 10 s, số SFX / 10 s, số loại SFX, khoảng trống hình lớn nhất (giây). Dưới chuẩn mục 1 → thêm hiệu ứng trước khi giao. Ghi các số này vào `report.md`.
Giới hạn: không nghe được âm thanh; mức dB chỉ là đề xuất, người dùng nghe và chỉnh.
