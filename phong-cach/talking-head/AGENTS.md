# Talking Head Kit — AI edit video talking head dọc trong After Effects

Thư mục này đủ để một AI nhận **clip người nói (A-roll) + nội dung** và tự edit ra **video talking head dọc
1080×1920** kiểu TikTok/Reels/Shorts. Gồm: chữ hook, phụ đề hiện từng từ, từ khoá to đặt **sau lưng người nói**,
số neon, icon tile, B-roll, thay nền, light leak, SFX. Dựng bằng cách điều khiển **After Effects qua MCP**
(`mcp__after-effects__*`). Phần chuẩn bị clip chạy bằng Python/ffmpeg ngoài AE.

Trả lời người dùng bằng **tiếng Việt**. Ảnh kiểm tra là để AI tự xem, không gửi vào chat trừ khi được hỏi.

## Đọc trước (theo thứ tự)

0. **`CON-THIEU.md`**: những gì kit chưa có hoặc chưa kiểm tra, kèm cách xử lý tạm. Máy chưa cài gì thì đọc `knowledge/00-cai-dat.md` (cầu nối MCP với AE, extension Claude Bridge, Python, font).
1. `knowledge/01-the-loai.md`: talking head là gì, luật khi nào hiện mặt người và khi nào hiện đồ hoạ, nhịp, ba nguồn đã học.
2. `knowledge/02-quy-trinh.md`: **quy trình từng bước, lệnh cụ thể**. Đây là xương sống.
3. `knowledge/07-bay-loi.md`: **bắt buộc**. Các lỗi đã gặp khi điều khiển AE bằng script. Mỗi lỗi từng tốn hàng chục phút.
4. `examples/foodtage/`: ví dụ hoàn chỉnh gồm clip gốc, video mẫu, script dựng và kết quả render. Hãy chép từ đây.
5. Đọc khi cần:
   - `03-thu-vien-hieu-ung.md`: danh mục khối hiệu ứng, kèm thông số và hàm `T.*`.
   - `04-chuan-bi-clip.md`: phiên âm, cắt lặng, tách người.
   - `05-am-thanh.md`: SFX và chuẩn hoá âm lượng.
   - `06-phan-tich-video-mau.md`: cách bóc một video tham chiếu.
   - `08-qc.md`: kiểm tra chất lượng.
   - `09-vi-du-foodtage.md`: phân tích từng giây của ví dụ.
   - `10-tieng-viet-va-nganh-nhay-cam.md`: font tiếng Việt, nội dung y tế và phụ khoa.

## Cấu trúc

```
AGENTS.md / CLAUDE.md   hướng dẫn cho AI (file này)
CON-THIEU.md            những gì còn thiếu hoặc chưa kiểm tra (người dùng cập nhật dần)
README.md               hướng dẫn cho người
ae-bridge/              cầu nối MCP với After Effects: server Node + extension CEP "Claude Bridge" (cài: knowledge/00)
knowledge/              kiến thức 00–10
lib/saas-lib.jsx        thư viện nền H.* (text, shape, keyframe/ease, effect, comp)
lib/th-lib.jsx          thư viện talking head T.* (nền + matte + zoom, từ khoá, số, phụ đề, tile, B-roll, nền vòng, leak, SFX)
tools/                  prep.sh, transcribe.py, cut_silence.py, matte.py, caption_groups.py,
                        sfx_match.py, fonts_vi.py, sheet.sh, compare.sh, models/ (mô hình tách người)
templates/              brief.md, plan.md, report.md
examples/foodtage/      ví dụ đầy đủ (assets, media, ref/video-mau.mp4, build.jsx, result/foodtage_v1.mp4)
```

## Đầu vào của một video mới

`projects/<slug>/` (tạo cạnh kit hoặc trong kit):
- `brief.md` theo `templates/brief.md`: nền tảng, thời lượng, phong cách, thương hiệu, nội dung, điều cấm.
- `assets/`: `raw.mp4` (clip người nói, bắt buộc), `ref.mp4` (video mẫu phong cách, nên có), `broll/`, `icons/`,
  `logos/`, `sfx/`, `fonts/`, `leaks/`. Thiếu SFX/leak thì dùng bộ trong `examples/foodtage/assets/`.

Đầu ra ở `output/<slug>/`: `aroll/` (clip đã chuẩn bị), `<slug>.aep`, `check/` (ảnh kiểm tra), `<slug>_vN.mp4`, `report.md`.

## Quy trình tóm tắt (chi tiết: knowledge/02)

1. **Môi trường**: `ae_status` phải có `bridge`. Kiểm tra font có dấu Việt: `python tools/fonts_vi.py <thư mục font>`.
2. **Chuẩn bị clip**: `bash tools/prep.sh assets/raw.mp4 output/<slug>/aroll --lang vi`, cho ra transcript từng từ, clip đã cắt lặng và matte người.
3. **Phân tích mẫu** (nếu có `ref.mp4`): `tools/sheet.sh`, transcript, `tools/sfx_match.py`. Viết `ref-notes.md` (bảng từng giây).
4. **Kế hoạch** `plan.md` theo `templates/plan.md`: mỗi câu là một dòng, ghi khối hiệu ứng, mốc vào/ra, chữ hiện. **Gửi người dùng duyệt một lần.**
5. **Dựng**: chép `examples/foodtage/build.jsx` vào `projects/<slug>/build.jsx`, thay khối `DATA`, chạy từng giai đoạn
   (mỗi giai đoạn một `ae_run_script`). Sau mỗi giai đoạn: `H.saveFrames` rồi `tools/compare.sh`, xem và sửa ngay.
6. **Render** `ae_render`. **Không gửi lệnh nào vào AE trong lúc render.** Sau đó chuẩn hoá −14 LUFS bằng 2 lượt `loudnorm` (knowledge/05).
7. **QC + report**: contact sheet, so với mẫu, `report.md`. Báo người dùng.

## Luật dựng (chi tiết: knowledge/03, 07)

- Mọi keyframe đặt theo **mốc từ trong transcript** (giây), không đặt theo cảm giác.
- Chuyển động bằng keyframe. Expression chỉ dùng cho `loopOut()` (icon, vệt sáng chạy vòng).
- Chữ hoặc vật "sau lưng người": đặt giữa `BG_Plate` và `MATTE_Person` (`T.behind`). Matte do `tools/matte.py` tạo, vì Roto Brush không gọi được bằng script.
- **Không dùng effect Glow** cho chữ màu (làm trắng xoá màu). Dùng `T.glow` (2 Drop Shadow cùng màu).
- Không bọc giai đoạn trong `beginUndoGroup`. Hàm chạy giai đoạn trả **số hoặc chuỗi**, không trả mảng.
- Font phải có dấu tiếng Việt nếu chữ là tiếng Việt.
- Mỗi lần sửa đều xuất khung so với mẫu. Không dựng xong hết rồi mới xem.

## Dừng và hỏi người dùng chỉ khi

- `ae_status` không trả lời, hoặc AE có hộp thoại: nhờ họ bấm OK và cho biết nội dung.
- Thiếu `raw.mp4`, hoặc brief thiếu thông tin bắt buộc (nền tảng, thời lượng, ngành hàng): hỏi một lần, gộp mọi câu.
- Duyệt `plan.md` (một lần, trước khi dựng).
- Nội dung có rủi ro pháp lý hoặc kiểm duyệt (y tế, sản phẩm, so sánh đối thủ): nêu rủi ro, đề xuất cách nói an toàn.
