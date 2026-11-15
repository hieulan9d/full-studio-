# Changelog — SaaS AE Kit

Mỗi lần kit được sửa (thường sau khi dựng một video), thêm một mục ở đầu: phiên bản, ngày, video phát hiện,
sửa gì. Phiên bản: MAJOR khi đổi cách dùng `build.jsx`/`CFG`, MINOR khi thêm tính năng/cảnh, PATCH khi sửa lỗi.
Cập nhật `H.VERSION` trong `lib/saas-lib.jsx` cùng lúc.

## 1.3.0 — 2026-11-15 (video: orbiq v3)
- Thư viện nhạc thật `audio/music/`: 8 bài Mixkit (người dùng duyệt tải), mỗi bài có LICENSE; `INDEX.md` chọn bài.
- `tools/music_index.py`: BPM (kiểm ×2/×0,5), pha lưới, drop, điểm cắt 15/20/30 s trên phách, LUFS → `index.json`.
- `H.buildAudio`: `musicStart` (cắt nhạc giữa bài, vào nhẹ 0,3 s), nhận mp3. `build.jsx`: `CFG.musicStart`.
- `tools/sync-studio.sh`: đồng bộ kit sang `full studio/phong-cach/saas-animation` (trừ output/, sửa đường dẫn build.jsx).
- Orbiq v3 = nhạc "Better Times are Coming" (119,8 BPM ≈ lưới 120) + 36 SFX → qc_auto PASS, −14 LUFS.

## 1.2.0 — 2026-11-15 (video: orbiq v2 + 9:16)
- Âm thanh: `tools/sfx_gen.py` (27 SFX tự tổng hợp, `audio/sfx/`), `tools/music_gen.py` (nhạc nền đúng BPM, build/hit
  theo mốc cảnh), `H.cue` trong mọi hàm cảnh (mốc lưu trong comment comp), `H.buildAudio`, `tools/finalize.sh` (−14 LUFS).
- Khung dọc 9:16: `H.setFormat`, `H.frameComp`, `H.frame(layer, s, dy, dx)` (collapse ở khung dọc), ENV/vignette
  theo khung ra, `CFG.v` + `BUILD_FORMAT` trong build.jsx. Kiến thức `11-khung-doc.md`.
- QC tự động `tools/qc_auto.py` (thông số, khung đen, đứng hình, cháy sáng, quá tối, đổi cảnh tại mốc, độ to).
- Phát triển brief + viết nội dung: `10-viet-noi-dung.md`, `brief-dev.md`. Âm thanh: `12-am-thanh.md`.
- Sửa: `beats.py` đo nhầm 120 BPM thành 199 (dải dò quá rộng) và 117,5 (độ phân giải) → dải 70–175 + nội suy;
  ternary lồng trong `H.setFormat` (9:16 thành vuông) và `H.text` (căn trái thành căn phải).
- Quy trình: bước tự học bắt buộc + CHANGELOG.

## 1.1.0 — 2026-11-15 (video: orbiq v1)
- `H.HUE` đổi tông cả video; `H.logoScale` + căn giữa end card; `H.lastEndIcon/lastEndScale` cho sao morph;
  `H.sceneDashboardRise`, `H.sceneZoomOut`; nhãn dashboard qua `o.labels`; `projects/orbiq/build.jsx` làm mẫu.
- Sửa: `saveFrames` không tạo thư mục; hàm `L` bị `var L` che; cụm chat lệch trái; glow nút AI/avatar AI cháy.

## 1.0.0 — 2026-11-15 (từ NeuraFlow v1–v4)
- Bản đầu: 9 file kiến thức, `saas-lib.jsx`, `ui-dashboard.jsx`, công cụ kiểm tra, mẫu brief/storyboard/báo cáo.
