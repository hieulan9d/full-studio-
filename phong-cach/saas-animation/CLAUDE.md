# SaaS AE Kit — AI dựng video SaaS animation trong After Effects

Thư mục này biến **một brief** thành **video SaaS animation 16:9 và 9:16 có âm thanh** (kiểu quảng cáo phần
mềm: nền tối, cột sáng, giao diện kính, chữ blur-in, chuyển cảnh liền) bằng cách điều khiển After Effects qua
MCP (`mcp__after-effects__*`). Người dùng không phải duyệt từng bước. Phiên bản kit: xem `CHANGELOG.md`.

Trả lời người dùng bằng **tiếng Việt**. Không gửi ảnh chụp vào chat trừ khi họ hỏi; ảnh kiểm tra chỉ để AI tự xem.

## Đọc trước khi làm

Luôn đọc: `knowledge/07-mcp-va-bay-loi.md` (**bắt buộc** — bẫy đã gặp), `01-phong-cach.md`, `02-nhip-chuyen-dong.md`,
`03-thu-vien-canh.md`, `10-viet-noi-dung.md`. Khi cần: `04` công thức AE · `05` UI chi tiết · `06` cấu trúc project ·
`08` QC · `09` ví dụ NeuraFlow · `11` khung dọc · `12` âm thanh. Mẫu dựng đã chạy thật: `projects/orbiq/build.jsx`.

## Đầu vào / đầu ra

`projects/<slug>/brief.md` (người dùng viết — **không sửa**) + `assets/` tuỳ chọn (logo, music, sfx/, screens/, ref.mp4).
Đầu ra `output/<slug>/`: `<slug>.aep`, `<slug>_916.aep`, `<slug>_vN_final.mp4`, `<slug>_916_vN_final.mp4`,
`contact.jpg`, `report.md`.

## Quy trình

Ghi tiến độ vào `projects/<slug>/log.md` (1–2 dòng/bước, kể cả lỗi gặp và cách sửa).

1. **Môi trường.** `ae_status` (panel "Claude Bridge" kết nối). AE đang mở project có thay đổi chưa lưu → hỏi trước.
2. **Phát triển brief** (`10-viet-noi-dung.md`): viết `projects/<slug>/brief-dev.md` — thông điệp, tính năng, mọi
   chữ trên màn hình, nhãn UI theo ngành, chat, tông màu (HUE), chọn cảnh. Đánh dấu `(AI)` chỗ tự thêm.
   Thiếu thứ bắt buộc → hỏi một lần, gộp câu.
3. **Tham chiếu & nhạc.** Có `ref.mp4`: `bash tools/analyze-ref.sh …` → `ref-notes.md`. Nhạc: người dùng đưa → `tools/beats.py`;
   không thì chọn bài trong `audio/music/INDEX.md` theo tâm trạng (lấy BPM + điểm cắt); cuối cùng mới tạo nhạc (bước 6).
   Lưới cảnh = bội số 2 phách của BPM bài đã chọn.
4. **Storyboard** `projects/<slug>/storyboard.md` theo `templates/storyboard.md`: mốc vào cảnh **trên lưới phách**,
   chữ chính xác, cách nối, tỉ lệ khung dọc từng cảnh (`11-khung-doc.md`). Soát checklist ở `08-qc.md`.
5. **Dựng 16:9.** Chép `projects/orbiq/build.jsx` → `projects/<slug>/build.jsx`, đổi `CFG`. Chạy
   `BUILD.stage(1)` … `stage(5)`, **mỗi giai đoạn một `ae_run_script`**. Sau mỗi giai đoạn: `BUILD.check([...])`
   → `tools/wait-files.sh` → `tools/sheet.sh` → xem → sửa (`08-qc.md`). Cảnh mới: thêm vào build.jsx bằng hàm `lib/`,
   gọi `H.cue` ở các chuyển động chính.
6. **Âm thanh.** `CFG.music` + `CFG.musicStart` (bài đã chọn), hoặc nhạc tự tạo `tools/music_gen.py`; rồi `BUILD.stage(6)`
   (SFX theo mốc + nhạc). Xem `12-am-thanh.md`.
7. **Render 16:9** `ae_render` (template `H.264 - Match Render Settings - 15 Mbps`). **Không gửi lệnh nào vào AE
   khi đang render.** Rồi `bash tools/finalize.sh in.mp4 out_final.mp4` (−14 LUFS).
8. **QC tự động** `python -I tools/qc_auto.py out_final.mp4 --dur … --w … --h … --hits …`. FAIL → sửa. WARN → xem
   khung chỗ đó rồi quyết. Sau đó xem `contact.jpg` (khung mỗi 1 s) và khung dày quanh chỗ chuyển cảnh.
   Có ref: `tools/compare.sh`.
9. **Dựng 9:16** (nếu brief yêu cầu, mặc định có): `app.newProject()`, `$.global.BUILD_FORMAT='9:16'`, chạy lại
   stage 1–6, kiểm tra `MAIN` đúng 1080×1920, xem khung từng cảnh (không vật quan trọng chạm mép), chỉnh `CFG.v`,
   render, finalize, qc_auto.
10. **Báo cáo** `output/<slug>/report.md` theo `templates/report.md`. Báo người dùng: đường dẫn **tuyệt đối** các
    file `_final.mp4` (link markdown phải tính từ thư mục làm việc hiện tại), khác brief chỗ nào, lỗi còn giữ.
11. **Tự học — bắt buộc.** Mọi lỗi gặp trong lần này mà do kit (lib, tool, kiến thức sai/thiếu): sửa ngay trong
    `lib/` / `tools/` / `knowledge/` (không chỉ trong build.jsx của video), thêm vào `07-mcp-va-bay-loi.md` nếu là bẫy,
    ghi một mục trong `CHANGELOG.md` (phiên bản mới, ngày, sửa gì, phát hiện ở video nào). Cảnh/kỹ thuật mới chạy tốt
    → đưa vào `lib/` và `03-thu-vien-canh.md`. Cuối cùng `bash tools/sync-studio.sh` để cập nhật bản ở
    `D:\dự án antigravityull studio\phong-cach\saas-animation` (và sửa `PHONG-CACH.md` ở đó nếu phong cách đổi).

Vòng sửa theo góp ý người dùng: tìm đúng comp/layer → sửa → xuất khung → render `_v(N+1)` → finalize → qc_auto.
Góp ý chung chung ("chưa đẹp"): đặt cạnh tham chiếu (`compare.sh`), liệt kê khác biệt lớn nhất, sửa theo thứ tự tác động.

## Luật dựng (tóm tắt — chi tiết ở knowledge/)

- Chuyển động bằng **keyframe**. Expression chỉ cho: chuyển động lặp, đổi số thành chữ, độ mờ theo hướng mặt 3D.
- Mỗi cảnh một precomp thiết kế ở 1920×1080; MAIN/ENV theo khung ra (`H.frameComp`); đặt cảnh bằng `H.frame` khi dọc.
- Layer đặt tên theo vai trò (`TXT_ UI_ ICON_ NULL_ BG_ ENV_ ADJ_ FX_ SFX_ MUSIC_`), label màu theo nhóm.
- **Gắn parent trước, keyframe sau** (hoặc `H.attach`). Không cross-fade hai bản dựng của cùng một vật.
- ExtendScript: không ternary lồng không ngoặc; tên hàm không trùng tên `var` cục bộ; thêm hiệu ứng làm mất
  tham chiếu hiệu ứng cũ (`H.efx`). `saveFrameToPng` bất đồng bộ → `wait-files.sh`.
- Mỗi `ae_run_script` dưới ~60 s. Lệnh treo 200 s gần như chắc chắn là hộp thoại trong AE.

## Dừng và hỏi người dùng chỉ khi

- AE không phản hồi / panel chưa kết nối / có hộp thoại trong AE (nhờ bấm OK, hỏi nội dung).
- Brief thiếu thứ bắt buộc (tên sản phẩm, sản phẩm làm gì, thời lượng).
- Cần ghi đè/đóng project AE có thay đổi chưa lưu.
- Muốn **tải** nhạc/SFX/font từ mạng: hỏi từng file (tên, nguồn, dung lượng, giấy phép).
- Thiếu font/plugin brief yêu cầu đích danh.

Không xoá file của người dùng, không đóng AE, không đổi Preferences của AE.
