# CHỨC NĂNG TOOL EDIT: HƯỚNG DẪN TỪNG CHỨC NĂNG

**File sống.** Cập nhật **mỗi khi làm xong hoặc sửa** một chức năng. Mục đích: khi có lỗi hay muốn nâng cấp, AI (hoặc người) mở file này là biết chức năng chạy ra sao, mã nằm đâu, kiểm thế nào, bẫy gì, nâng cấp từ đâu.
Chưa cập nhật = chưa xong (`HUONG-DAN-AI.md` mục 4).

Cập nhật gần nhất: 2026-11-16 (xong giai đoạn 2: chữ, gradient, viền/bóng/glow, animator, keyframe + Ease/Bezier, preset từ kit, neo vị trí 9:16 ↔ 16:9, kiểm glyph tiếng Việt).

---

## 1. Bảng chỉ mục

Trạng thái: `chưa làm` / `đang làm` / `chạy (chưa kiểm sâu)` / `xong (đã kiểm)` / `hỏng` (kèm ghi chú ở `NHAT-KY.md`).
Mã `F-xx` dùng để tham chiếu trong `NHAT-KY.md`. Khi một chức năng bắt đầu làm, **chép mẫu ở mục 2 xuống mục 3** và điền.

| Mã | Chức năng | Giai đoạn | Trạng thái |
|---|---|---|---|
| F-01 | Ép chạy bằng RTX, báo GPU đang dùng | 0 | chạy (đã kiểm adapter = NVIDIA) |
| F-02 | Pipeline float RGBA16F + Output Transform Rec.709 | 0 | chạy (đã kiểm ramp, thanh màu, BT.709) |
| F-03 | Schema dự án JSON + validator + migrate | 0–1 | chạy schema v1 (12 test, có migrate v0→v1) |
| F-04 | Op `apply_ops` (atomic, hoàn tác, ghi nguồn) | 0–1 | chạy (8 loại op, 12 test) |
| F-05 | `preview_frame` | 0–1 | chạy (ghép lớp thật, qua HTTP và MCP) |
| F-06 | Nhập media + ffprobe + cache chuẩn hoá | 1 | chạy (video, âm thanh, ảnh tĩnh) |
| F-07 | Giải mã (WebCodecs/NVDEC) + cache khung | 1 | chạy (đã kiểm độ chính xác khung) |
| F-08 | Timeline: cắt, trim, kéo, ripple, snap | 1 | chạy (giao diện kéo-thả, trim, snap, cắt, xoá, zoom; chưa có chọn bằng khung kéo) |
| F-09 | Phát lại có tiếng, đồng bộ âm hình | 1 | chạy (đồng hồ âm thanh; waveform) |
| F-10 | Hoàn tác/làm lại, lưu/mở, tự lưu | 1 | chạy (file `.tedit`, tự lưu, khôi phục phiên) |
| F-11 | Xuất NVENC (9:16 và 16:9) chạy nền theo job | 1 | chạy (đã kiểm, ~41–46 khung/s ở 1080×1920) |
| F-12 | MCP server v1 (tool đọc/ghi/xem/xuất) | 1 | chạy (12 tool, 23 kiểm bằng client MCP chính thức) |
| F-13 | Hàng đề xuất: `propose_ops` + UI duyệt | 1 | chạy (tab "Đề xuất của AI": diff, xem thử, chấp nhận/từ chối) |
| F-14 | Tương thích MCP với Claude / Gemini / GPT | 1 | **một phần**: schema phẳng + client SDK đạt; **chưa thử với Gemini/GPT/Claude thật** |
| F-15 | Giao diện React: bố cục, kho media, xem trước, thanh phát | 1 | chạy (52 kiểm giao diện thật) |
| F-16 | Bảng thuộc tính clip (vị trí, tỉ lệ, xoay, độ đục, âm lượng, thời gian) | 1 | chạy |
| F-17 | Bảo mật: HTTP không có đường "áp dụng"; chỉ giao diện qua IPC | 1 | chạy (14 kiểm) |
| F-20 | Công cụ chữ + kiểm glyph dấu Việt | 2 | chạy (font quét từ cmap thật; cảnh báo thiếu dấu) |
| F-21 | Chữ fill gradient (animate được) | 2 | chạy (đơn sắc, tuyến tính, tròn, góc/conic) |
| F-22 | Stroke, shadow, glow | 2 | chạy (Canvas 2D; glow chưa phải bloom GPU) |
| F-23 | Animator chữ theo ký tự/từ/dòng | 2 | chạy (9 kiểu) |
| F-24 | Hệ keyframe + nút thoi + ease preset | 2 | chạy (transform, chữ, âm lượng) |
| F-25 | Graph editor bezier | 2 | chạy (kéo điểm, tay nắm bezier, Ease In/Out nhanh, copy/dán) |
| F-26 | Preset chữ/hiệu ứng | 2 | chạy (8 preset, 4 lấy số đo từ kit) |
| F-27 | Neo vị trí 9:16 ↔ 16:9 | 2 | chạy (neo + lề an toàn + cỡ chữ theo cạnh ngắn) |
| F-28 | Keyframe âm lượng (phát + xuất) | 2 | chạy |
| F-29 | MCP: add_text, set_keyframes, apply_preset, list_presets, list_fonts | 2 | chạy (42 kiểm) |
| F-30 | Whisper từng từ (job GPU) | 3 | chạy (large-v3-turbo CUDA, 14,5 s tiếng Anh trong 0,8 s, WER 0 %); **tiếng Việt thật chưa đo độ chính xác** |
| F-31 | Phụ đề từng từ + style + sửa transcript | 3 | chạy (karaoke / word-pop / line-fade, sửa từ, tạo lại) |
| F-32 | Dựng theo transcript, cắt khoảng lặng | 3 | chạy (xoá chữ = xoá đoạn; khoảng lặng theo lời hoặc theo âm thanh) |
| F-33 | Track SFX/nhạc, kho tag, SFX theo sự kiện (chờ duyệt) | 3 | chạy (27 SFX + 8 nhạc; duyệt từng SFX) |
| F-34 | Duck nhạc, chuẩn loudness | 3 | chạy (duck −13,9 dB đo được; −14 LUFS 2 lượt) |
| F-35 | Marker nhịp nhạc | 3 | chạy (BPM sai lệch ≤ 0,03; có thể gấp đôi/nửa nhịp) |
| F-40 | Giao diện plugin matting | 4 | **một phần**: lõi gọi `py/matte.py` (RVM); chưa có cơ chế cắm mô hình khác bằng giao diện |
| F-41 | Tách nền video (RVM) + matte alpha | 4 | chạy (RVM mobilenetv3 ONNX trên GPU, ~10 khung/s; khớp matte của kit) |
| F-42 | Chữ sau lưng người | 4 | chạy (render + xuất khớp; nút giao diện + MCP) |
| F-43 | Time remap / speed ramp + bezier + preset | 4 | chạy (tốc độ cố định và keyframe, 5 preset, giữ cao độ khi xuất) |
| F-44 | Nội suy khung khi chậm (RIFE) | 4 | **chưa làm RIFE**; thay bằng trộn hai khung kề nhau (frame blending) |
| F-50 | Primary color (lift/gamma/gain/offset...) → 3D LUT | 5 | chạy (GPU = công thức CPU, sai số ≤ 1/255; xuất khớp xem trước) |
| F-51 | Input Transform log + nhập/xuất `.cube` | 5 | **một phần**: S-Log3, V-Log (chỉ đường cong); `.cube` 3D nhập/xuất chạy; **chưa có C-Log, Apple Log, chuyển gam màu** |
| F-52 | Scope: waveform, parade, vectorscope, histogram | 5 | chạy (compute shader; đúng trên ramp và thanh màu); false color + cảnh báo clip |
| F-53 | Curves, log wheels, qualifier, power window | 5 | **một phần**: curves (master + R,G,B) chạy; **chưa có log wheels, qualifier HSL, power window** |
| F-54 | MCP màu: `analyze_frame`, `scope_image`, `match_color` | 5 | chạy (cộng `grade_get`, `grade_set`, `apply_lut`) |
| F-60 | Port hiệu ứng từ kit (glow, kính, parallax...) | 6 | **một phần**: blur, glow, bóng, wipe, vignette, bo góc, crop, chế độ trộn (add/screen/multiply), hình vector, keyframe; **chưa** noise, grid, gradient 4 màu, tint, edge, motion blur, 2.5D/3D, cha–con, kính làm mờ nền, strokeUp |
| F-61 | Dựng lại video SaaS mẫu | 6 | **chưa làm** (cần 2.5D/3D, noise, grid, lớp vector có trim, cha–con) |
| F-62 | Dựng lại video talking head mẫu | 6 | **lần 1 xong, chờ người dùng chấm**: `scripts/build-foodtage.mjs` dựng ~177 clip, xuất 666 khung; còn khác bản AE (xem mục) |
| F-63 | Hình vector (rect, ellipse, ring, star, trim) | 6 | chạy (keyframe được, dùng glow/bóng/blend) |
| F-70 | `qc_check` (glyph, safe area, loudness, phủ lời) | 3 | **một phần**: glyph, tràn khung, loudness, phủ lời đã chạy; chưa có khung đen |
| F-80 | Trang chủ: tạo / mở / đổi tên / nhân bản / xóa dự án | UX | chạy (`ui-test-ux`) |
| F-81 | Cài đặt + phím tắt tùy chỉnh (lưu bền), sao chép/dán/nhân đôi clip, xuất/nhập bộ phím | UX | chạy (42 hành động; báo trùng phím) |
| F-82 | Cuộn / thu phóng timeline bằng chuột (Ctrl, Alt, Shift + con lăn) | UX | chạy |
| F-83 | Chia khung kéo được, thu gọn, phóng to timeline / khung xem, chiều cao track | UX | chạy (lưu bố cục) |
| F-84 | Thanh đo âm lượng tai trái / tai phải | UX | chạy (đo được kênh trái-phải riêng) |
| F-85 | Nhập thư mục media; tab Âm thanh với thư mục SFX lưu bền cho AI | UX | chạy |
| F-86 | Việt hóa toàn bộ giao diện có dấu | UX | chạy (xem mục) |
| F-87 | Nâng cấp giao diện (hệ thiết kế, icon SVG, tab icon, mục gập được) | UX | chạy (xem mục) |
| F-88 | Thả media tự vào đúng loại track; chuột phải: tách video/audio | Timeline | chạy (xem mục) |
| F-89 | Quét chọn nhiều clip bằng chuột; clip ghép (Ctrl+G) và hủy ghép (Ctrl+Shift+G) | Timeline | chạy (xem mục) |
| F-91 | Vô hiệu hóa clip (V, như CapCut); kéo clip lên/xuống tự do trong cùng loại, kéo ra mép tạo Video/Audio mới | Timeline | chạy (xem mục) |
| F-94 | Khung xem: zoom (thanh trượt, cuộn chuột, Vừa / 100%), kéo (pan), phím tắt | UX | chạy (đã kiểm bằng giao diện thật, 55 kiểm cùng F-95/96) |
| F-95 | Tương tác trực tiếp trên khung xem: chọn clip, khung chọn có tay nắm, kéo dời / đổi cỡ / xoay, snap + vùng an toàn, keyframe | UX | chạy (đã kiểm hộp chọn khớp điểm ảnh thật) |
| F-96 | Ô thông số đổi ngay khi gõ/kéo, gộp một bước hoàn tác (`coalesce`) | UX | chạy (đã kiểm) |
| F-97 | Xuất timeline sang Premiere / DaVinci Resolve / CapCut / After Effects / EDL + tool MCP `export_timeline` | Hệ thống | chạy (đã kiểm file; **chưa mở thử trong phần mềm đích**) |
| F-98 | Nút bật/tắt AI tự áp dụng + thông báo kèm Hoàn tác | UX/AI | chạy (chưa kiểm bằng giao diện thật) |
| F-99 | Kiểm phụ thuộc khi mở app (`GET /deps`, khung cảnh báo ở Trang chủ) | UX | chạy (chưa kiểm bằng giao diện thật) |
| F-100 | Hỏi trạng thái nền theo nhịp thích ứng, dừng khi cửa sổ ẩn | Hiệu năng | chạy (chưa đo) |
| F-101 | Trần RAM cho cache giải mã (LRU) | Hiệu năng | chạy (chưa đo) |
| F-102 | `project_get`: `summary`, `track_id`, `from`, `to` | AI | chạy (chưa kiểm bằng client MCP) |
| F-103 | Không gian màu đầu vào: S-Log3 (S-Gamut3, S-Gamut3.Cine), V-Log/V-Gamut, ARRI LogC3/AWG3, Apple Log, DaVinci Intermediate/DWG, ACEScct/AP1, RED Log3G10/RWG; nén gam màu liên tục; tone-map ACES | Màu | chạy (xám 18 % đạt theo tài liệu hãng; ma trận AWG3→709 khớp ARRI; ma trận khác tính từ tọa độ xy, chưa đối chiếu hãng) |
| F-104 | Chỉnh màu hai bước: bước A (giải mã log, gam màu, phơi sáng, nhiệt độ/tint, tone-map) giải tích trong shader, bước B nướng LUT 3D | Màu | chạy (GPU = CPU tới 1,8/255 trên 9 không gian; kéo phơi sáng/nhiệt độ/tone-map không nướng lại LUT) |
| F-105 | Qualifier HSL (hiệu chỉnh cấp hai) + xem mặt nạ | Màu | chạy (mặt nạ mềm ở mép do LUT 65³) |
| F-106 | Bánh màu theo vùng tối / giữa / sáng (log wheels) | Màu | chạy |
| F-107 | Cửa sổ (power window): elip / chữ nhật, xoay, mép mềm, đảo | Màu | chạy (chưa bám chuyển động, chưa keyframe) |
| F-108 | Scope: YCbCr parade, đơn vị trục % / 8-bit / 10-bit / IRE | Scope | chạy |
| F-92 | Chỉnh màu "sống" (kéo là hình đổi ngay) + cửa sổ Scope riêng nổi (Ctrl+L) | Màu | chạy (xem mục) |
| F-93 | Đóng gói thành ToolEdit.exe chạy được (npm run package) | Hệ thống | chạy (xem mục) |
| F-94 | Chuyển cảnh GPU giữa hai clip (18 kiểu) hoặc vào từ nền | Timeline | chạy (xem mục) |
| F-95 | Xoay 3D nhẹ (2.5D) có phối cảnh, keyframe được | Engine | chạy (xem mục) |
| F-96 | Clip biểu đồ / số đếm (cột, cột ngang, đường, tròn, vành khuyên, số tăng dần) | Đồ họa | chạy (xem mục) |
| F-97 | Kính mờ (làm mờ nền sau hình) + thư viện 8 mẫu dựng sẵn | Đồ họa | chạy (xem mục) |
| F-90 | Scope màu chính xác hơn: vùng đo, mức hợp lệ 16/235, đọc giá trị khi rê chuột, RGB chồng | Màu | chạy (xem mục) |
| F-71 | Snapshot/restore dự án | 1 | chạy (AI chỉ tạo; chỉ người khôi phục) |

Danh sách tool MCP hiện có sẽ nằm ở **mục 4** (cập nhật khi thêm tool).

---

## 2. Mẫu mục chức năng (chép xuống mục 3 khi bắt đầu làm)

```
### F-xx Tên chức năng
- **Trạng thái:** đang làm | chạy (chưa kiểm sâu) | xong (đã kiểm) | hỏng
- **Giai đoạn / cập nhật:** n / ngày
- **Làm gì (một câu):**
- **Cách dùng (người):** các bước trên giao diện
- **Cách dùng (AI/MCP):** tên tool, tham số chính, ví dụ gọi, kết quả trả về
- **Dữ liệu:** trường nào trong project JSON, tên op
- **File mã chính:** đường dẫn + hàm/lớp quan trọng
- **Cách hoạt động (ngắn):** luồng dữ liệu, shader/job nào
- **Giới hạn đã biết:**
- **Bẫy / lỗi từng gặp:** (mô tả + cách sửa + liên kết NHAT-KY)
- **Cách kiểm:** test tự động nào, hoặc các bước kiểm tay; số đo kỳ vọng
- **Cách nâng cấp:** muốn thêm/đổi thì sửa ở đâu, cần làm gì kèm
- **Phụ thuộc:** chức năng khác (F-xx), thư viện, mô hình, giấy phép
```

---

## 3. Chi tiết từng chức năng

### F-01 Ép chạy bằng RTX, báo GPU đang dùng
- **Trạng thái:** chạy (đã kiểm: adapter WebGPU báo `nvidia` / `ampere` trên máy chủ). Cập nhật 2026-11-16, giai đoạn 0.
- **Làm gì:** ép Chromium chọn GPU mạnh (RTX 3060) thay vì Intel Iris Xe, và báo GPU đang dùng.
- **Cách dùng (người):** mở app, tên GPU hiện ở cột trái. Chạy `npm start` trong `tool-edit/`.
- **Cách dùng (AI/HTTP):** `GET http://127.0.0.1:17480/status` trả `gpu` (vendor, architecture, features) và `rendererReady`.
- **File mã chính:** `src/main/main.ts` (`app.commandLine.appendSwitch('force_high_performance_gpu')`), `src/render/renderer.ts` (`requestAdapter({ powerPreference: 'high-performance' })`, `Renderer.init`).
- **Giới hạn đã biết:** `adapter.info.description` và `device` rỗng nên chỉ biết hãng + kiến trúc, không có tên "RTX 3060". `app.getGPUInfo('basic')` liệt kê cả 3 GPU với cờ `active: false` (không dùng cờ đó để kết luận). **Chưa kiểm** Windows sẽ chọn GPU nào nếu bỏ cờ ép.
- **Bẫy:** đừng kiểm bằng `getGPUInfo().active`; dùng `adapter.info.vendor`.
- **Cách kiểm:** `node node_modules/electron/cli.js . --selftest` rồi đọc `out/selftest.json` → `gpu.vendor` phải là `nvidia`.
- **Cách nâng cấp:** muốn hiện tên GPU đầy đủ thì ghép thêm từ `app.getGPUInfo('complete')` (chưa thử).
- **Phụ thuộc:** Electron 45 (Chromium có WebGPU, D3D12).

### F-02 Pipeline float RGBA16F + Output Transform
- **Trạng thái:** chạy (đã kiểm). 2026-11-16, giai đoạn 0.
- **Làm gì:** vẽ cảnh vào texture `rgba16float` tuyến tính, rồi một pass Output Transform (sRGB / BT.709 / gamma 2.4) ép ra 8-bit.
- **Cách dùng (AI/HTTP):** qua `preview_frame` (xem F-05). Trong mã: `Renderer.renderToRgba({ width, height, kind, out })`, `renderToCanvas`, `benchmark`.
- **File mã chính:** `src/render/renderer.ts` (WGSL `fs_scene`, `fs_out`; lớp `Renderer`), `src/core/color.ts` (hàm tham chiếu CPU).
- **Cách hoạt động:** `fs_scene` ghi giá trị tuyến tính (cảnh `ramp` lưu `srgb_eotf(x)` để sau Output Transform ra đúng mã `x`); `fs_out` đọc bằng `textureLoad`, áp OETF, kẹp 0..1, có tuỳ chọn dither tam giác (`dither`, mặc định tắt).
- **Giới hạn đã biết:** mới có 3 cảnh sinh bằng shader (`ramp`, `bars`, `stress`), chưa ghép lớp/clip thật. Chỉ xuất 8-bit; chưa có 10-bit. Không gian làm việc chỉ là tuyến tính Rec.709 primaries, **chưa có Input Transform** (log, v.v.). Ảnh PNG do `OffscreenCanvas.convertToBlob` tạo, chưa kiểm hồ sơ màu nhúng.
- **Bẫy:** BT.709 OETF/EOTF không khép kín tuyệt đối (lệch ~3e-4 gần 0,018): test round-trip dùng dung sai 5e-4, nhỏ hơn 1 mức mã 10-bit. Với 8-bit, đầu ra là mã thô (`rgba8unorm`, không `-srgb`).
- **Cách kiểm:** `npm test` (round-trip trên CPU); `--selftest`: ramp 1080 cột phải lệch ≤1 mã so với `round(x*255)`, 7 thanh màu 75% ra mã 191, mã BT.709 GPU = CPU. Kết quả hiện tại: đạt hết, `maxDiff` = 1.
- **Cách nâng cấp:** thêm Output Transform thì thêm nhánh trong `fs_out` + giá trị trong `OUT_ID` và `OUTPUT_TRANSFORMS` (color.ts) + test; thêm cảnh/hiệu ứng thì thêm nhánh `fs_scene` rồi `SCENE_ID` + `ClipKind` (schema.ts).
- **Phụ thuộc:** F-01.

### F-03 Schema dự án JSON + validator + migrate
- **Trạng thái:** chạy schema v1 (có test). 2026-11-16.
- **Làm gì:** định nghĩa `Project` (fps, kích thước, `media[]`, `tracks[]`, `clips[]`, `history[]`), `validate`, `migrate` (v0→v1), `timelineEnd`.
- **Dữ liệu chính:** `Clip { id, track, src:{type:'media',mediaId}|{type:'gen',kind,param}, start, duration, in, volume, transform{x,y,scale,rotation,opacity,fit} }`. `Media.cache` là dữ liệu dẫn xuất (trạng thái cache), không vào lịch sử hoàn tác.
- **Luật validate:** id media/track/clip không trùng; clip phải có track và media tồn tại; `duration>0`, `start>=0`, `in>=0`; `in+duration` không vượt độ dài media (dung sai nửa khung); **clip trên cùng một track không chồng nhau**.
- **File mã chính:** `src/core/schema.ts`.
- **Giới hạn đã biết:** chưa có chữ, keyframe, hiệu ứng, màu, phụ đề, `timeRemap` (giai đoạn 2+). Track âm thanh nhận cả media video có tiếng. Clip `gen` (ramp/bars/stress) chỉ để kiểm thử.
- **Cách kiểm:** `npm test` (12 test: hợp lệ mặc định, id trùng, thiếu media/track, vượt độ dài, chồng clip, split, ripple, undo/redo, dryRun, setMediaCache, migrate).
- **Cách nâng cấp:** đổi schema thì tăng `SCHEMA_VERSION`, thêm nhánh trong `migrate`, thêm test, ghi `NHAT-KY.md`.

### F-04 Op `apply_ops` (atomic, hoàn tác, ghi nguồn)
- **Trạng thái:** chạy (12 test lõi + e2e). 2026-11-16.
- **Làm gì:** nhận một batch op, áp trên bản sao, kiểm hợp lệ rồi mới thay; lỗi thì không đổi gì. Ghi `history` có nguồn (`human` hoặc `ai:<tên>`). Hoàn tác/làm lại.
- **Op có:** `add_media`, `add_track`, `add_clip`, `remove_clip`, `set_clip` (patch `start/duration/in/track/volume`), `set_transform` (patch transform), `split_clip` (`at`, `newId`; nửa phải có `in` cộng thêm đúng độ dài nửa trái), `ripple_delete` (kéo các clip sau trên cùng track lùi lại).
- **Cách dùng (HTTP, dành cho UI/người):** `POST /ops {ops, source}`, `POST /undo`, `POST /redo`. **AI không dùng đường này** mà dùng `propose_ops` (F-13).
- **File mã chính:** `src/core/session.ts` (`apply`, `dryRun`, `undo`, `redo`, `setMediaCache`), `src/main/main.ts` (route).
- **Giới hạn đã biết:** hoàn tác bằng **snapshot cả dự án** (đủ cho dự án nhỏ; dự án lớn cần op nghịch đảo). `POST /ops` chưa có token: bất kỳ tiến trình nào trên máy gọi được.
- **Cách nâng cấp:** thêm loại op: thêm vào kiểu `Op` (schema.ts) + `applyOne` (session.ts) + mô tả trong `OPS_HELP` (mcp/server.ts) + test.

### F-05 `preview_frame`
- **Trạng thái:** chạy (ghép lớp thật). 2026-11-16.
- **Làm gì:** trả PNG của khung tại thời điểm `t`, kích thước = dự án × `scale`; ghép mọi track video từ dưới lên: hình chữ nhật fit (`contain`/`cover`) × scale, dịch, xoay, opacity, trộn trong **không gian tuyến tính**.
- **Cách dùng:** HTTP `GET /preview_frame?t=2&scale=0.3`; MCP tool `preview_frame`. Lỗi trả JSON (vd media chưa sẵn sàng).
- **Cách hoạt động:** main gửi `render-request` (kèm dự án) tới renderer; renderer lấy khung từ `CachedVideo` (F-07), `importExternalTexture`, vẽ từng lớp vào RGBA16F, Output Transform sang 8-bit, đọc về, mã hoá PNG. Main chờ `renderer-ready`; hạn 30 giây.
- **Giới hạn đã biết:** mỗi track chỉ hiện một clip tại một thời điểm; chưa có chuyển cảnh, hiệu ứng, chữ. Hàm giảm tốc nền đã tắt (`backgroundThrottling: false`).
- **Bẫy đã gặp:** (1) giảm tốc nền khiến mỗi preview chậm ~1 s. (2) Yêu cầu gửi trước khi renderer sẵn sàng bị mất, treo 30 s. (3) Uniform dùng chung giữa các lớp bị ghi đè trước khi lệnh chạy: mỗi lớp có uniform riêng, hủy sau khi GPU xong.
- **Cách kiểm:** `npm run e2e` (đo màu, opacity, scale, dịch, độ chính xác khung). Đã đo: ~63–70 ms/khung ở scale 0,25 gồm HTTP + giải mã + PNG.
- **Cách nâng cấp:** thêm loại lớp thì thêm nhánh trong `Renderer.encodeLayers` và kiểu `Layer`.

### F-06 Nhập media + ffprobe + cache chuẩn hoá
- **Trạng thái:** chạy (video, âm thanh, ảnh tĩnh). 2026-11-16.
- **Làm gì:** `ffprobe` lấy thông số (có xử lý xoay), thêm media qua op `add_media`, rồi các job nền tạo bản dẫn xuất:
  - **Video:** cache chuẩn hoá bằng NVENC: H.264 CFR theo fps dự án, **không B-frame, keyframe mỗi 15 khung, mỗi khung bắt đầu bằng AUD (Annex-B)**, giới hạn cạnh dài 1920, BT.709 limited. Dùng cho cả preview và xuất nên hai bên giống nhau.
  - **Tiếng:** WAV 48 kHz stereo 16-bit (cho phát lại và waveform). Việc xuất dùng file **gốc**, không dùng WAV này.
  - **Ảnh tĩnh:** không transcode; đọc file gốc bằng `createImageBitmap` rồi bọc thành `VideoFrame` một lần (đi cùng đường ghép lớp với video, không dùng bộ giải mã phần cứng). Clip ảnh mặc định 5 giây.
- **Cách dùng:** giao diện (nút **+ Nhập media**, hoặc **kéo file từ Explorer thả vào cửa sổ**); HTTP `POST /media_import {path}`; MCP `media_import`. Trả `mediaId`, `job_id` (job cache video, hoặc job tiếng nếu chỉ có tiếng, hoặc `null` với ảnh) và `audio_job_id`. Nhập lại cùng đường dẫn trả `existing:true`.
- **File mã chính:** `src/main/media.ts` (`probe`, `buildCache`, `buildAudioCache`, `cacheSize`), `src/main/jobs.ts`, `src/main/main.ts` (`startCaches`, `importMedia`).
- **Giới hạn đã biết:** **cần NVENC** cho video (chưa có phương án libx264). Cache gắn với fps dự án lúc nhập. Thư mục cache `%APPDATA%/tool-edit/cache` không tự dọn. Toàn bộ file cache video và WAV đọc vào RAM khi dùng (WAV 10 phút ~115MB). Chưa nhận GIF/ảnh động. Chưa đo thời gian tạo cache cho video dài.
- **Bẫy:** `ffmpeg` mặc định đổi RGB→YUV theo BT.601; cache luôn dùng `out_color_matrix=bt709` và gắn cờ BT.709. File thử tạo bằng lavfi cũng phải làm vậy. Khi mở lại dự án, cache được dựng lại từ file (trúng cache đĩa nếu còn, rất nhanh).
- **Cách kiểm:** `npm run e2e`, `npm run ui-test` (nhập 5 loại media; ảnh C02020 ra đúng màu trong preview).
- **Cách nâng cấp:** proxy độ phân giải thấp cho dự án lớn; đọc theo đoạn thay vì nạp cả file.

### F-07 Giải mã WebCodecs + cache khung
- **Trạng thái:** chạy (đã kiểm độ chính xác khung và clip 1080p liên tục). 2026-11-16.
- **Làm gì:** `CachedVideo` tách các access unit bằng cách quét mã bắt đầu Annex-B, lấy codec từ SPS, giải mã bằng `VideoDecoder` (phần cứng ưu tiên) theo chỉ số khung. Seek = lùi về keyframe gần nhất rồi giải mã tiến; phát liên tục thì giải mã tiếp.
- **File mã chính:** `src/render/decoder.ts` (`indexAnnexB`, `CachedVideo.frame`, `beginFrame`), `src/renderer/index.ts` (`layersAt` gọi `beginFrame` cho mỗi lần render).
- **Quy tắc quan trọng (đã trả giá bằng một lỗi treo):** bộ giải mã phần cứng chỉ có một nhóm bề mặt nhỏ. **Giữ nhiều `VideoFrame` (đã đo: 12) làm nó ngừng xuất khung, kể cả `flush()` treo.** Vì vậy: chỉ giữ **3 khung** (`maxCache`); khi tua, khung giải mã nằm xa phía trước khung cần lấy bị đóng ngay; khung đang dùng để ghép trong lần render hiện tại được **ghim** (không bị đóng) cho đến `beginFrame()` của lần render sau; `flush()` có hạn chờ 1,5 s, quá hạn thì bỏ bộ giải mã và báo lỗi rõ ràng (lần sau tạo lại) thay vì treo.
- **Giới hạn đã biết:** file cache đọc nguyên vào RAM mỗi media (mã hoá ~ vài chục Mbps: video dài/nhiều media sẽ ngốn RAM, máy 16GB); chỉ H.264; chưa giải mã trước (prefetch). Khung bị giữ lại bởi bộ giải mã phần cứng (không ra sau 400 ms) làm tua chậm hơn (`stats.flushFallbacks`, chưa hiện ra ngoài).
- **Cách kiểm:** `npm run e2e`: 16 lần seek (lùi, qua ranh GOP), 30 khung liên tiếp clip nhỏ, **60 khung 1080p liên tiếp (TB ~25 ms), 10 điểm tua ngẫu nhiên 1080p, xuất 180 khung có clip 1080p** đều đúng/không treo.
- **Cách nâng cấp:** đọc theo đoạn (Range) thay vì nạp cả file; prefetch khung kế; sao chép khung vào texture riêng rồi đóng `VideoFrame` ngay (bỏ hẳn giữ khung của bộ giải mã); giải mã 10-bit/HEVC.

### F-08 Timeline: cắt, trim, kéo, ripple, snap
- **Trạng thái:** chạy (đã kiểm bằng giao diện thật). 2026-11-16.
- **Làm gì:** timeline kiểu CapCut: thước thời gian, các track (video ở trên, audio ở dưới), clip, con trỏ phát, zoom.
- **Cách dùng (người):** kéo clip để di chuyển (kéo nhiều clip đã chọn thì cả nhóm đi cùng; kéo lên/xuống đổi track cùng loại); kéo **mép trái/phải** để trim; **giữ Alt** khi kéo để tắt snap; click clip để chọn, **Shift+click** để chọn thêm; click thước để đặt con trỏ, kéo thước để lướt; **S** cắt tại con trỏ (clip đã chọn, hoặc clip trên cùng dưới con trỏ); **Delete** xoá, **Shift+Delete** xoá liền (kéo clip sau lùi lại); **Ctrl+cuộn** hoặc thanh Zoom để zoom; thả media từ kho vào đúng track và vị trí; **+ Track video/audio**. Clip có phần chưa sẵn sàng hiện vân chéo và nhãn "đang chuẩn bị".
- **Snap:** vào 0, con trỏ, mép các clip khác (ngưỡng 8 px); đường vàng hiện khi bám. Kéo clip chồng lên clip khác bị **từ chối** (báo lỗi, clip về chỗ cũ). Thả video/ảnh vào track audio (và ngược lại) bị từ chối.
- **File mã chính:** `src/renderer/ui/Timeline.tsx`, `src/renderer/timeline-math.ts` (hàm thuần, có test: `snapValue`, `snapMoveDelta`, `trimLeft`, `trimRight`, `findFreeStart`, `splitTargets`, `rulerStep`, `formatTime`), `src/renderer/actions.ts`.
- **Cách hoạt động:** kéo chỉ đổi trạng thái UI cục bộ (xem trước); khi thả mới gửi **một batch `set_clip`** (nên hoàn tác một lần). Mọi ràng buộc do `validate` của lõi quyết định, UI không tự kiểm lại.
- **Giới hạn đã biết:** chưa chọn bằng khung kéo (marquee); chưa có ảnh thu nhỏ trên clip; chưa có keyframe (giai đoạn 2); kéo clip sang track khác chỉ khi chọn một clip; thước chưa có nhãn mili-giây ở mức zoom lớn; kéo nhiều clip không đổi track.
- **Bẫy đã gặp:** trùng tên lớp CSS `.ghost` giữa nút "+" của kho media và khung bóng đề xuất trên timeline làm nút cao 873 px (đã đổi khung bóng thành `.tlghost`). Phím tắt toàn cục phải bỏ qua khi đang gõ trong ô nhập; ô nhập gọi `stopPropagation` nên bắt phím Esc của hộp thoại phải dùng listener `capture`.
- **Cách kiểm:** `npm test` (16 test hàm thuần), `npm run ui-test` (kéo-thả từ kho, thả sai loại, nút "+", kéo có snap, kéo chồng bị từ chối, trim trái/phải, cắt bằng S, xoá, xoá liền, hoàn tác).
- **Cách nâng cấp:** thêm thao tác timeline thì thêm hàm thuần trong `timeline-math.ts` + test, rồi nối vào `Timeline.tsx` qua một batch op.

### F-09 Phát lại có tiếng, đồng bộ âm hình
- **Trạng thái:** chạy (đã kiểm trong cửa sổ thật). 2026-11-16.
- **Làm gì:** **đồng hồ chính là `AudioContext`**; hình ảnh ghép theo thời gian của đồng hồ đó và **bỏ khung khi chậm** (không bao giờ kéo giãn thời gian). Mỗi clip có tiếng được lên lịch `AudioBufferSourceNode` với `when/offset/duration` và gain theo `volume`. Có waveform vẽ trên clip.
- **Cách dùng:** **Space** phát/dừng; ◀ ▶ lùi/tiến 1 khung (hoặc phím ←/→); Home/End; nút ⏮ ⏭.
- **File mã chính:** `src/renderer/player.ts` (`play`, `loop`, `seek`, `projectChanged`), `src/renderer/audio.ts` (`AudioEngine`, `computePeaks`), `src/renderer/ui/Timeline.tsx` (`WaveCanvas`).
- **Đã đo (ui-test):** phát 1,5 giây thì con trỏ tiến 1,51 giây; vẽ >10 khung/giây (368 lần vẽ trong 1,5 s, tính cả vẽ lại do trạng thái); `AudioContext.state = running`.
- **Giới hạn đã biết:** sửa dự án **trong lúc đang phát** dựng lại lịch âm thanh từ vị trí hiện tại (có thể nghe một khoảng ngắt rất nhỏ); chưa bù độ trễ đầu ra (`outputLatency`); xem trước phát ở nửa độ phân giải (540×960); **chưa kiểm bằng tai** việc đồng bộ âm hình (tôi không nghe được), chỉ kiểm đồng hồ và số khung vẽ; waveform lấy cực đại hai kênh mỗi 10 ms.
- **Cách nâng cấp:** bù `outputLatency`; phát trước (prefetch) khung kế để giảm rớt; xem trước độ phân giải thích ứng.

### F-10 Hoàn tác/làm lại, lưu/mở/tự lưu
- **Trạng thái:** chạy (đã kiểm). 2026-11-16.
- **Làm gì:** file dự án `.tedit` (JSON: `{format:'tool-edit-project', version:1, project}`, **không** lưu cache, vì cache là dữ liệu dẫn xuất). **Tự lưu** vào `%APPDATA%/tool-edit/autosave.tedit` sau mỗi thay đổi (chờ 0,8 s). Khi mở app với dự án trống mà có phiên tự lưu, kho media hiện thông báo **Khôi phục / Bỏ qua**. Mở dự án dựng lại cache cho từng media (nhanh nếu cache đĩa còn); media bị mất file thì báo `file không còn` thay vì hỏng cả dự án.
- **Cách dùng:** nút **Mới / Mở / Lưu / Lưu thành**, **Ctrl+S**, Ctrl+Z / Ctrl+Y. Dấu chấm cam cạnh tên dự án = chưa lưu; **Mới/Mở khi chưa lưu hỏi xác nhận**.
- **File mã chính:** `src/main/main.ts` (`writeProject`, `readProject`, `startCaches`, route `/project/*`), `src/core/session.ts` (`load`, `undo`, `redo`), `src/renderer/actions.ts`.
- **Giới hạn đã biết:** chỉ một ô tự lưu; hoàn tác bằng **snapshot cả dự án** (xem F-04); hộp thoại chọn file của hệ điều hành **không tự động hoá được** nên ui-test dùng API cho Lưu/Mở (đã kiểm phần lõi, **chưa bấm tay các hộp thoại**); đường dẫn media lưu tuyệt đối (chuyển máy là mất liên kết).
- **Cách kiểm:** `npm run ui-test` (lưu, tự lưu, mới, mở lại: đúng số clip, cache tự sẵn sàng lại, preview ổn; hỏi xác nhận khi chưa lưu).
- **Cách nâng cấp:** liên kết lại media bị mất (chọn thư mục mới); nhiều ô tự lưu; hoàn tác bằng op nghịch đảo.

### F-11 Xuất NVENC chạy nền theo job
- **Trạng thái:** chạy (đã kiểm). 2026-11-16.
- **Làm gì:** render từng khung theo thời gian (`t = n/fps`, deterministic), GPU đổi sang **NV12 BT.709 limited**, đẩy qua IPC cho `ffmpeg` (`h264_nvenc`), trộn âm thanh từ **file gốc** (`atrim/adelay/volume/amix`) rồi `aac 192k`. Gắn cờ BT.709/tv.
- **Cách dùng:** HTTP `POST /render_start {preset:'9:16'|'16:9'|'project', out?}`; MCP `render_start`; hỏi `job_status`; hủy `POST /jobs/:id/cancel` hoặc `job_cancel`. Mặc định ghi vào `%APPDATA%/tool-edit/exports/`.
- **File mã chính:** `src/main/exporter.ts` (`startFfmpeg`, `buildAudioPlan`), `src/main/main.ts` (`startExport`, IPC `export-frame`/`export-end`), `src/renderer/index.ts` (`doExport`), `src/render/renderer.ts` (`renderToNv12`).
- **Đã đo (máy chủ):** 90 khung 1080×1920 (2 lớp video + âm thanh) trong **~1,95–2,2 s = 41–46 khung/s** (nhanh hơn thời gian thực ~1,4×). Bản gửi RGBA 8,3MB/khung chỉ đạt 19–26 khung/s: nút cổ chai là đọc ngược và IPC, không phải ffmpeg (~118 khung/s khi đọc từ đĩa) hay giải mã (~1,5 ms/khung). File xuất khớp preview: sai số tuyệt đối trung bình 0,34 (tối đa 7) trên khung 1080×1920.
- **Giới hạn đã biết:** chỉ H.264 8-bit, cần NVENC; một job xuất tại một thời điểm; **không ghi đè** file có sẵn (báo lỗi); âm lượng chỉ theo từng clip (chưa fade, chưa chuẩn loudness); khi xuất 16:9 từ dự án 9:16, clip được `fit` vào khung ngang (có viền đen), chưa có bố cục riêng từng tỉ lệ (F-27); chroma hạ mẫu bằng trung bình 2×2 (chưa kiểm vị trí chroma so với ffmpeg).
- **Đồng hồ canh:** nếu không có khung mới nào trong 60 giây, job báo lỗi (`xuat khong tien trien ...`), kill ffmpeg và xóa file dở, thay vì treo mãi.
- **Bẫy đã gặp:** (0) job xuất treo mãi khi bộ giải mã phần cứng cạn bề mặt (xem F-07). (1) hủy job kill ffmpeg làm `stdin` ném `EOF` không ai bắt, **sập tiến trình chính**: đã gắn handler lỗi cho `stdin`. (2) Trên Windows file xuất còn bị khóa cho tới khi ffmpeg thoát: xóa file dở sau sự kiện `close`. (3) Vòng xuất cũ có thể lọt khung vào job mới: mọi khung gắn `jobId`. (4) ffmpeg đổi RGB→YUV mặc định BT.601 nên GPU tự làm BT.709.
- **Cách kiểm:** `npm run e2e` (kích thước, số khung, cờ màu, âm thanh, giống preview, 16:9, không ghi đè, một job một lúc, hủy rồi xuất lại).
- **Cách nâng cấp:** H.265/10-bit: đổi codec và định dạng đọc về (P010); tăng tốc thêm bằng chuyển bộ nhớ GPU→ffmpeg không qua IPC.

### F-12 MCP server v1
- **Trạng thái:** chạy (đã kiểm bằng client MCP chính thức, 20 kiểm). 2026-11-16.
- **Làm gì:** server MCP qua **stdio** (`node dist/mcp.mjs`) bọc lên HTTP nội bộ của app. Cần app đang chạy; nếu không, tool trả lỗi `isError` có hướng dẫn mở app (không treo).
- **Tool:** xem bảng ở mục 4. **AI không có tool áp dụng/duyệt/hoàn tác trực tiếp.**
- **Cách gắn vào AI (ví dụ cấu hình `mcpServers`):** `{"tool-edit":{"command":"node","args":["D:/dự án antigravity/full studio/fullstudio/tool-edit/dist/mcp.mjs"],"env":{"TOOL_EDIT_AI_NAME":"claude"}}}`. `TOOL_EDIT_AI_NAME` quyết định nguồn ghi vào history (`ai:claude`). Đổi cổng bằng `TOOL_EDIT_PORT`.
- **File mã chính:** `src/mcp/server.ts` (đóng gói thành `dist/mcp.mjs` bởi `scripts/build.mjs`).
- **Giới hạn đã biết:** có `preview_frame` và `contact_sheet` trả ảnh PNG dạng nội dung `image`, nhưng chưa kiểm client nào hiển thị ảnh đúng cách ngoài SDK; chưa có `qc_check`. `snapshot_create`/`snapshots_list` có (12 tool); **không có tool khôi phục**.
- **Cách kiểm:** `npm run mcp-test` (app phải đang chạy).
- **Cách nâng cấp:** thêm tool trong `server.ts` bằng `registerTool`, giữ schema phẳng (không `anyOf/oneOf/allOf`), mô tả bằng tiếng Việt không dấu hoặc có dấu đều được nhưng đủ rõ; thêm kiểm vào `scripts/mcp-test.mjs`.

### F-13 Hàng đề xuất cho người duyệt
- **Cập nhật 2026-11-18:** mặc định **AI tự áp dụng, không cần duyệt** (`autoApplyAi` trong settings, bật). Hàng đề xuất bên dưới chỉ dùng khi đặt `autoApplyAi: false`.
- **Trạng thái:** chạy (đã kiểm bằng giao diện thật). 2026-11-16.
- **Làm gì:** AI gọi `propose_ops`: op được **kiểm thử (dry-run)** trên dự án hiện tại, sai thì bị từ chối ngay kèm lý do và ghi nhận trạng thái `invalid` (không duyệt được, nhưng đếm được AI gửi sai bao nhiêu), đúng thì thành đề xuất `pending`, **không đổi dự án**.
- **Giao diện duyệt:** tab **"Đề xuất của AI"** (huy hiệu số đề xuất đang chờ, thông báo khi AI gửi). Mỗi thẻ có nguồn, ghi chú, danh sách thay đổi `+` / `-` / `~`, và 3 nút: **Xem thử** (ghép khung xem trước theo dự án *giả định* và vẽ khung xanh/đỏ nét đứt trên timeline cho clip sẽ thêm/xoá; **dự án thật chưa đổi**), **Từ chối**, **Chấp nhận** (áp dụng, kiểm lại trên trạng thái mới, ghi history với nguồn của AI). Chấp nhận hai lần trả 409; nếu dự án đã đổi làm op không còn hợp lệ, trả 409 kèm lý do và đề xuất vẫn `pending`.
- **File mã chính:** `src/main/main.ts` (route `/propose`, `/proposals`, `/proposals/:id/draft|accept|reject`), `src/core/session.ts` (`dryRun`, `draftOf`), `src/core/diff.ts` (`diffProjects`), `src/renderer/ui/Panels.tsx` (`Proposals`, `ProposalCard`), `src/renderer/ui/Timeline.tsx` (khung bóng).
- **Bảo mật:** `accept`/`reject` **chỉ có qua IPC của giao diện**; HTTP mặc định trả 403 (xem F-17). AI (kể cả có shell) không tự duyệt được bằng `curl`.
- **Giới hạn đã biết:** đề xuất nằm trong bộ nhớ (không lưu qua phiên); xem thử chỉ hiển thị ảnh tĩnh tại con trỏ hiện tại; `invalid` chỉ hiện số lượng. **SFX và màu bắt buộc duyệt** (giai đoạn 3 và 5) chưa có vì chưa có tính năng đó.
- **Cách kiểm:** `npm run ui-test` (huy hiệu, diff, xem thử "xoá" vẽ khung đỏ mà dự án chưa đổi, từ chối, chấp nhận ghi nguồn `ai:...`), `npm run e2e`, `npm run mcp-test`, `npm run security-test`.
- **Cách nâng cấp:** diff chi tiết theo thuộc tính ngay trên clip; xem thử có phát; lưu hàng đề xuất.

### F-14 Tương thích MCP với Claude / Gemini / GPT
- **Trạng thái:** **một phần**. Schema các tool không dùng `anyOf/oneOf/allOf` (kiểm tự động). Đã thử bằng client MCP chính thức của SDK (`npm run mcp-test`, 23 kiểm) và kịch bản mô phỏng AI. Cấu hình `.mcp.json` đã kiểm khởi chạy bằng `npm run mcp-config-check`. **Chưa thử với Claude, Gemini hay GPT thật**: máy chủ không có CLI nào của chúng trên PATH. Hướng dẫn thử, prompt và bảng ghi kết quả ở `THU-MCP.md`.
- **Công cụ phục vụ thử:** `scripts/mcp-report.mjs` (`npm run mcp-report`: chấm phiên AI, thoát mã 1 nếu AI áp dụng thay đổi không qua đề xuất được duyệt), `scripts/mcp-config-check.mjs`. Duyệt đề xuất nay làm **trong giao diện** (`scripts/duyet.mjs` chỉ còn dùng khi bật `TOOL_EDIT_DEV_API=1`).
- **Rủi ro đã biết:** đường dẫn có dấu tiếng Việt trong cấu hình client; cách khắc phục bằng liên kết thư mục không dấu ở `THU-MCP.md` mục 3.

### F-15 Giao diện React: bố cục, kho media, xem trước, thanh phát
- **Trạng thái:** chạy (52 kiểm bằng Playwright điều khiển cửa sổ Electron thật). 2026-11-16.
- **Làm gì:** cửa sổ một màn hình: thanh trên (Mới/Mở/Lưu, Hoàn tác/Làm lại, Nhập media, Snapshot, tiến độ job, Xuất 9:16 / 16:9), **kho media** (ảnh thu nhỏ, trạng thái chuẩn bị, kéo-thả vào timeline, nhấp đúp hoặc nút "+" để thêm tại con trỏ), **xem trước** (canvas WebGPU, chuyển 9:16 / 16:9), thanh phát, bảng phải (Thuộc tính / Đề xuất của AI), **timeline** (F-08), thông báo, hộp thoại riêng (Electron **không hỗ trợ `window.prompt`**: Snapshot/Khôi phục dùng hộp thoại của app; `window.confirm` dùng được).
- **Kiến trúc:** dự án thật nằm ở tiến trình chính; giao diện giữ bản sao trong một store nhỏ (`src/renderer/store.ts`) và gửi mọi thay đổi bằng **op** qua IPC (`api()` trong `bridge.ts`). Preview, ảnh thu nhỏ, `preview_frame` của AI và vòng xuất **dùng chung bộ giải mã** nên chạy qua một **khoá tuần tự** (`locked()` trong `engine.ts`): mỗi khung (lấy lớp + ghép) chạy trọn vẹn trước khi khung khác bắt đầu.
- **File mã chính:** `src/renderer/index.tsx` (khởi động), `engine.ts`, `player.ts`, `audio.ts`, `actions.ts`, `store.ts`, `ui/App.tsx`, `ui/Panels.tsx`, `ui/Timeline.tsx`, `styles.css`.
- **Giới hạn đã biết:** chưa kéo trực tiếp clip trên khung hình để đổi vị trí/tỉ lệ (gizmo); chưa nhãn khung hình; thanh phát chưa có vòng lặp; chủ đề giao diện chỉ tối; chữ giao diện không dấu (dùng chuỗi không dấu; chưa làm bản có dấu).
- **Điểm đo kiểm thử:** `window.__te` (store, player, audio, stats) chỉ để Playwright đọc; không thay đổi hành vi.
- **Cách kiểm:** `npm run ui-test`: bật app với `TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .` rồi chạy (xem mục 5). Ảnh chụp ra `out/ui/`.
- **Cách nâng cấp:** thêm bảng/nút thì thêm `data-testid` và một bước trong `ui-test.mjs`.

### F-16 Bảng thuộc tính clip
- **Trạng thái:** chạy. 2026-11-16.
- **Làm gì:** chọn một clip thì sửa: bắt đầu, độ dài, lấy từ (giây); vị trí X/Y (%), tỉ lệ (%), xoay, độ đục (%), vừa khung (contain/cover); âm lượng (%) nếu có tiếng. Gõ số rồi **Enter hoặc rời ô** mới gửi (`set_transform` / `set_clip`), không gửi mỗi lần gõ phím. Giá trị khiến clip chồng nhau bị lõi từ chối, giao diện báo lỗi và giữ nguyên. Không chọn clip thì hiện thông tin dự án (đổi tên) và bảng phím tắt.
- **File mã chính:** `src/renderer/ui/Panels.tsx` (`Inspector`, `NumField`).
- **Giới hạn đã biết:** chưa có keyframe (giai đoạn 2); chỉ sửa được một clip một lúc; chưa hiện thuộc tính khi chọn nhiều clip.
- **Cách kiểm:** `npm run ui-test` (tỉ lệ 50% → `transform.scale = 0.5`, độ đục 80%, sửa Bắt đầu hợp lệ và không hợp lệ).

### F-17 Bảo mật: HTTP không có đường "áp dụng"
- **Trạng thái:** chạy (14 kiểm `npm run security-test`). 2026-11-16.
- **Làm gì:** các đường làm thay đổi dự án (`POST /ops`, `/undo`, `/redo`, `/project/save|load|new|rename`, `/snapshots/restore`, `/proposals/:id/accept|reject`) **chỉ giao diện gọi được qua IPC**. HTTP mặc định trả **403**. Còn mở: đọc (`/status`, `/project`, `/proposals`, `/jobs`, `/preview_frame`), `propose`, `media_import`, `render_start`, `export_timeline` (chỉ ghi file vào thư mục exports; `out`/`install` bị bỏ qua nếu không phải giao diện), hủy job, tạo snapshot. Nhờ đó AI (kể cả có shell) không tự duyệt đề xuất của chính nó.
- **Bật cho kiểm thử:** biến môi trường `TOOL_EDIT_DEV_API=1` mở lại các đường trên cho HTTP (dùng bởi `e2e.mjs`, `mcp-test.mjs`, `ui-test.mjs`). **Không bật khi dùng thật.** `TOOL_EDIT_CDP_PORT` mở cổng gỡ lỗi Chromium (điều khiển toàn bộ cửa sổ): **chỉ dùng khi kiểm thử**.
- **Giới hạn đã biết:** HTTP vẫn không có token, nên một tiến trình bất kỳ trên máy đọc được dự án và gửi đề xuất / nhập media / xuất video; AI có quyền điều khiển giao diện (ví dụ qua computer use) vẫn có thể bấm duyệt. Việc AI tự bấm duyệt qua giao diện **nằm ngoài phạm vi** thiết kế này.
- **Cách kiểm:** chạy app **không** có `TOOL_EDIT_DEV_API` rồi `npm run security-test`.

### F-20 Công cụ chữ + kiểm glyph tiếng Việt
- **Trạng thái:** chạy (đã kiểm điểm ảnh + giao diện thật). 2026-11-16.
- **Làm gì:** clip chữ (`src: {type:'text', text: TextSpec}`) nằm trên track video. `TextSpec`: nội dung, font, cỡ, độ đậm, nghiêng, căn lề, giãn dòng/chữ, ngắt dòng theo % chiều rộng khung. **Cỡ chữ tính theo px @ cạnh ngắn 1080** nên 9:16 và 16:9 nhìn giống nhau (cùng cỡ). Chữ canh giữa theo **hộp dòng** (như CapCut/CSS): mực chữ in hoa lệch ~13px khỏi tâm là bình thường.
- **Kiểm glyph tiếng Việt:** app quét font hệ thống (`C:\Windows\Fonts`) và font người dùng (`%LOCALAPPDATA%\Microsoft\Windows\Fonts`) bằng `opentype.js`, đọc **bảng ký tự (cmap) thật của từng file** và kiểm cả 134 chữ có dấu. Kết quả (máy chủ): 223 họ font, **22 họ đủ dấu**; Segoe UI, Arial, Consolas đủ; **Impact, TR Impact, Pensum Display, Tactic Sans thiếu** (khớp tài liệu kit). Chữ có dấu mà font thiếu thì `GET /warnings` (và `project_get`) trả lỗi `font-no-vietnamese`; font không có trong máy thì `font-missing`. Danh sách font có cache (`%APPDATA%/tool-edit/cache/fonts-index.json`), quét nền lần đầu.
- **Cách dùng (người):** nút **+ Chữ** hoặc **+ Chữ từ preset…** trên thanh trên (tự tạo track video mới nếu track bị chiếm); chọn clip chữ rồi sửa ở tab Thuộc tính (nội dung lưu khi rời ô; danh sách font chia nhóm "Đủ dấu / Thiếu dấu" và hiện cảnh báo đỏ).
- **File mã chính:** `src/core/text.ts` (kiểu, `defaultText`, `mergeText`, `validateText`), `src/core/vn.ts` (`projectWarnings`), `src/main/fonts.ts` (`FontIndex`), `src/render/text-raster.ts` (`rasterizeText`), `src/renderer/engine.ts` (`layersAt`), `src/renderer/ui/Inspector.tsx`.
- **Giới hạn đã biết:** chỉ dùng font đã cài trong máy (chưa nạp file font riêng của dự án); chưa có chữ trên đường cong, chưa kiểm cặp ghép kerning khi animator tách từng ký tự (dùng đo tiền tố nên giữ kerning, nhưng chưa so với AE); `add_clip` chữ tự bổ sung trường thiếu từ mặc định.
- **Bẫy đã gặp:** `fill.color` trước đây chỉ được kiểm khi fill là `solid`, màu rác lọt qua khi đang dùng gradient (test bắt được, đã sửa). Công cụ ghi file/hiển thị của phiên làm việc **nuốt một nửa dấu `\`**: viết regex hoặc đường dẫn có `\` qua heredoc dễ sai; dùng `split/join`, `String.fromCharCode`, hoặc sửa theo số dòng.
- **Cách kiểm:** `npm run e2e-text` (51 kiểm: dựng chữ, tiếng Việt, gradient, viền, bóng, glow, neo, animator, font, cảnh báo), `npm test`, `npm run ui-test-text`.
- **Cách nâng cấp:** nạp font riêng bằng `FontFace` + IPC; thêm kiểu animator thì thêm nhánh trong `unitState` (text-raster.ts) + `ANIM_PRESETS` (text.ts) + test.

### F-21 Chữ fill gradient (animate được)
- **Trạng thái:** chạy. `Fill`: `solid`, `linear` (góc 0 = trái→phải, 90 = trên→dưới), `radial` (tâm cx, cy, bán kính), `angular` (conic, góc bắt đầu). Nhiều điểm dừng (`stops`, ≥ 2, màu `#rrggbb[aa]`).
- **Animate:** `text.fill.angle` và `text.fill.offset` là thuộc tính keyframe được (offset: trượt gradient dọc trục với linear, xoay vòng với angular, phình bán kính với radial). Gradient trải theo **hộp dòng** của khối chữ (nên 10% đầu của nét chữ chưa phải màu thuần).
- **Đã đo:** gradient dọc đỏ→xanh: đỉnh nghiêng đỏ, đáy nghiêng xanh; gradient góc 0: trái xanh lá, phải hồng; radial/angular cho nhiều mức màu; keyframe `fill.offset` đổi màu giữa chữ theo thời gian; preset `keyword-gradient`: tím #7563ff (đỉnh) → lavender #dcd3ff (đáy).
- **Giao diện:** kiểu fill, danh sách điểm màu (chọn màu, vị trí %, thêm/xoá), góc, trượt.

### F-22 Viền, bóng đổ, glow
- **Trạng thái:** chạy. Viền (màu, độ dày, để lên/dưới chữ), bóng đổ (màu, độ đục, mờ, lệch x/y), glow (màu, bán kính, cường độ; cường độ lớn hơn vẽ nhiều lượt). Tất cả keyframe được (`text.stroke.width`, `text.shadow.*`, `text.glow.*`).
- **Cách làm:** Canvas 2D (`shadowBlur`); bóng vẽ **riêng khỏi hình chữ** bằng mẹo dịch hình ra ngoài canvas. Glow là bóng cùng màu độ lệch 0, nhiều lượt (**không dùng effect cộng màu** nên chữ màu không bị trắng xoá, đúng bẫy đã ghi trong kit).
- **Giới hạn đã biết:** glow là mờ Gaussian của Canvas chứ chưa phải bloom nhiều mức trên GPU (F-60); bán kính lớn tốn CPU khi animator làm raster đổi từng khung (chữ tĩnh được cache).

### F-23 Animator chữ theo ký tự / từ / dòng
- **Trạng thái:** chạy. 9 kiểu: `none`, `fade`, `slide-up`, `slide-down`, `pop` (vọt qua rồi về), `bounce`, `typewriter`, `blur-in`, `color-wave`. Đơn vị: ký tự (tách theo **cụm ký tự đồ hoạ** bằng `Intl.Segmenter`, không làm gãy chữ có dấu), từ, hoặc dòng. Tham số: thời lượng mỗi đơn vị, khoảng cách giữa các đơn vị, trễ, khoảng trượt, độ mờ, chạy ngược ở cuối clip, màu thứ hai.
- **Đã đo (điểm ảnh):** fade theo ký tự: số pixel tăng dần (1780 < 13463 < 26103); slide-up theo từ: lúc đầu chỉ 1–2 từ; typewriter: chiều rộng chữ tăng 90 → 540 px.
- **Cache:** chữ tĩnh (đã vào xong, không `out`, không `color-wave`) chỉ rasterize một lần; đang chạy animator thì rasterize từng khung (làm tròn 1/120 giây).

### F-24 Hệ keyframe + nút thoi (kiểu CapCut) + ease preset
- **Trạng thái:** chạy. Thuộc tính keyframe được: `transform.x|y|scale|rotation|opacity`, `volume` (clip media), `text.size|letterSpacing|lineHeight|fill.angle|fill.offset|stroke.width|shadow.opacity|blur|x|y|glow.strength|radius`. **Thời gian keyframe tính từ đầu clip** (đi theo clip khi kéo; khi cắt, hai nửa giữ liên tục giá trị tại điểm cắt; khi trim đầu hoặc đổi `in`, keyframe lùi theo nội dung).
- **Cách dùng:** nút **◇** cạnh mỗi ô số: bấm = thêm keyframe tại con trỏ (◆ khi đang đứng đúng keyframe, ◈ khi thuộc tính có keyframe ở chỗ khác); bấm lại tại ◆ = xoá. **‹ ›** nhảy tới keyframe trước/sau. **Khi thuộc tính đã có keyframe, gõ số vào ô sẽ tạo/ghi keyframe tại con trỏ** (CapCut); ô số luôn hiện giá trị **nội suy tại con trỏ**. Dấu hình thoi vàng hiện trên clip trong timeline; click để nhảy tới.
- **Ease (đường cong) mỗi keyframe:** `linear`, `hold`, hoặc `bezier` (x1, y1, x2, y2, như CSS `cubic-bezier`; y vượt 0..1 cho hiệu ứng vọt). Preset: `ease`, `ease-in`, `ease-out`, `ease-in-out`, `snap` (của kit), `accel`, `overshoot`.
- **File mã chính:** `src/core/anim.ts` (`bezierAt`, `evalTrack`, `resolveClip`, `valueAt`, `splitKeys`, `shiftKeys`, `volumeExpr`), `src/core/session.ts` (op `set_keyframe`, `set_keyframes`, `remove_keyframe`), `src/renderer/ui/Inspector.tsx` (`Kf`, `AnimField`), `src/renderer/actions.ts`.
- **Quy ước ease khác After Effects:** ease thuộc **đoạn đi ra từ keyframe** (như CSS), không có "ảnh hưởng vào/ra" riêng từng keyframe như AE. Hệ quả: một keyframe có đường cong vào và ra khác nhau thì chỉnh ease của hai đoạn kề nó. Khi **cắt** một đoạn đã làm mượt bằng bezier, nửa sau chỉ **xấp xỉ** đường cong gốc (giá trị tại điểm cắt đúng, hình dáng đoạn còn lại gần đúng).
- **Cách kiểm:** `npm test` (bezier khớp cài đặt độc lập trên 50 điểm × mọi preset; nội suy, hold, tách/dịch keyframe, op và validate), `npm run e2e-text` (độ đục tuyến tính 50% đúng 188; tỉ lệ 1:2:3; vị trí; hold; gradient.offset; **preview giống file xuất MAE ≤ 0,51**), `npm run ui-test-text`.

### F-25 Graph editor (Bezier keyframe, Ease In / Ease Out)
- **Trạng thái:** chạy (đã kiểm bằng chuột thật qua Playwright). Tab **"Đường cong"** bên phải.
- **Cách dùng:** chọn clip có keyframe → chọn thuộc tính; đồ thị vẽ giá trị theo thời gian, con trỏ phát (đỏ), điểm keyframe: **kéo điểm** để đổi (thời gian, giá trị) hoặc gõ số chính xác; chọn một điểm thì hiện **hộp bezier** với **hai tay nắm tím** kéo được (đường cong chuyển thành "tuỳ chỉnh"); danh sách preset ease; **bốn nút nhanh Ease In / Ease Out / Easy Ease / Tuyến tính** (áp cho keyframe đang chọn, hoặc cho mọi đoạn của thuộc tính nếu chưa chọn khung nào; bấm nền đồ thị để bỏ chọn); **Sao chép / Dán** keyframe (Ctrl+C / Ctrl+V; dán tại con trỏ, cho phép dán sang clip khác); nút Xoá; "+ thuộc tính" để thêm keyframe cho thuộc tính khác.
- **Ý nghĩa:** Ease In = bắt đầu chậm rồi nhanh dần (`cubic-bezier(0.42, 0, 1, 1)`); Ease Out = nhanh rồi chậm dần (`0, 0, 0.58, 1`); Easy Ease = vào và ra đều mềm (`0.42, 0, 0.58, 1`). Đã đo trên dữ liệu thật: tại 25% của đoạn, Ease In đi được ít hơn tuyến tính, Ease Out đi được nhiều hơn.
- **File mã chính:** `src/renderer/ui/Graph.tsx`, `src/renderer/actions.ts` (`setEaseMany`, `moveKey`, `setKeyEase`, `copyKeys`, `pasteKeys`).
- **Giới hạn đã biết:** đồ thị theo từng thuộc tính (chưa chồng nhiều đường); chưa có tay nắm "ảnh hưởng vào/ra" kiểu AE; kéo tay nắm giới hạn y trong [−0,5, 1,5] (đủ cho vọt vừa phải).

### F-26 Preset chữ/chuyển động
- **Trạng thái:** chạy (8 preset). Mỗi preset gồm kiểu chữ + keyframe (có keyframe tính từ **cuối clip**, vd tắt dần 3 khung cuối) và **ghi nguồn số đo**.
- **Lấy từ kit talking-head (`th-lib.jsx`):** `keyword-gradient` (T.keyword: gradient #7563ff→#dcd3ff, bóng 40%, vào scale 135%→100% trong 5 khung kiểu `snap`, tắt 3 khung); `neon-number` (T.number: #9a82ff, viền #8ff8ff 12px đè lên chữ, glow #5ff4ff r30, scale 150→100 + xoay −14°→0 trong 8 khung); `neon-label` (nhãn #1f4fff, glow #2a5cff); `caption-word` (T.capGroup: cỡ 112, #5cf7e0, glow, mỗi từ trượt lên 30px + mờ dần trong 5 khung). Còn lại (`title-white`, `gradient-sunset`, `typewriter`, `bounce-words`) là kiểu chuẩn chung.
- **Font:** kit dùng TRImpact/Pensum/Tactic Sans (**thiếu dấu tiếng Việt**), nên preset dùng Segoe UI Black / Segoe UI (đủ dấu). Màu và nhịp giữ nguyên.
- **Cách dùng:** thanh trên "+ Chữ từ preset…"; hoặc tab Thuộc tính → mục Preset → Áp dụng (hỏi xác nhận nếu sẽ **thay** keyframe có sẵn). MCP: `list_presets`, `apply_preset`, `add_text`.
- **Cách kiểm:** `npm run e2e-text` (preset keyword-gradient: số đo đúng kit, màu đỉnh/đáy, vào nhanh, tắt dần), `npm test` (mọi preset áp dụng hợp lệ ngay cả trên clip 0,5 giây).
- **Giới hạn đã biết:** chưa dựng lại **video SaaS/talking head hoàn chỉnh** để so với bản After Effects (giai đoạn 6); chưa có hiệu ứng quét sáng (`H.sweep`), light leak, viền nở của `T.strokeUp`.

### F-27 Neo vị trí 9:16 ↔ 16:9
- **Trạng thái:** chạy. `transform.anchorH` (trái/giữa/phải), `anchorV` (trên/giữa/dưới), `margin` (lề an toàn, tỉ lệ cạnh ngắn); `x`, `y` là **dịch từ điểm neo** (tỉ lệ theo khung). Mặc định giữa/giữa nên video và dự án cũ không đổi hành vi. Cỡ chữ theo cạnh ngắn, lề theo cạnh ngắn: cùng một clip chữ cho **cùng khoảng cách tới mép** và **cùng cỡ** ở 9:16 và 16:9.
- **Đã đo:** neo trái-trên lề 10%: (66, 74) ở cả 9:16 và 16:9; neo phải-dưới: (68, 101) ở cả hai; `x,y = −10%` đẩy vào trong đúng 54 / 96 px; cùng chiều cao chữ 107 px ở hai tỉ lệ.
- **Giới hạn đã biết:** neo tính theo hộp chữ (trừ phần lề bóng/glow nhưng **tính cả khoảng descent** của hộp dòng), nên chữ neo "dưới" cách đáy khung nhiều hơn mực chữ; chưa có bố cục riêng cho từng tỉ lệ (vd đổi neo khi sang 16:9).

### F-28 Keyframe âm lượng (phát + xuất)
- **Trạng thái:** chạy. Phát lại: đường gain của `AudioContext` lấy mẫu 25 lần/giây. Xuất: biểu thức `volume=...:eval=frame` của ffmpeg do `volumeExpr` sinh ra (gấp khúc, mỗi đoạn có ease chia 10 phần; sai số < 0,02 so với `evalTrack`).
- **Đã đo:** xuất clip có âm lượng 0 → 1 → 0: RMS −46 dB (0s) → −29 (1s) → −24 (2s) → −45 (3,8s).
- **Giới hạn đã biết:** chưa fade tự động ở ranh cắt; chưa chuẩn loudness.

### F-29 MCP cho chữ + keyframe + preset + font
- **Trạng thái:** chạy (42 kiểm). Tool mới: `list_presets`, `list_fonts(vietnamese, query)`, `add_text`, `set_keyframes`, `apply_preset`. **Tất cả tool ghi chỉ tạo đề xuất chờ duyệt.** `add_text` tự chọn track video còn trống (hoặc tạo mới), áp preset rồi ghi đè font/cỡ/màu/neo; sai preset/track/màu/thuộc tính thì bị từ chối ngay kèm lý do. `project_get` kèm `warnings` (font thiếu dấu tiếng Việt).
- **File mã chính:** `src/mcp/server.ts`, `src/main/main.ts` (route `/fonts`, `/warnings`, `/presets`).

### F-30 Whisper từng từ (job GPU)
- **Trạng thái:** chạy (2026-11-16). `faster-whisper` chạy ở `py/transcribe.py` trên GPU máy bạn, **không gửi dữ liệu đi đâu**, `local_files_only` (không tự tải mô hình; thiếu thì thoát mã 3 = `MODEL_MISSING`, phải hỏi người dùng).
- **Cách dùng:** chọn clip → tab **Lời thoại** → chọn ngôn ngữ/mô hình → "Nhận dạng lời thoại" (thanh tiến độ). MCP: `transcribe` (trả `job_id`), `get_transcript`. Kết quả lưu ở `Media.transcript` (từng từ: chữ, bắt đầu, kết thúc, độ tin cậy).
- **Đã đo:** large-v3-turbo trên CUDA: 14,5 s tiếng Anh (giọng TTS) trong **~0,8 s**, **WER 0,0 %**, mốc từng từ khớp với phụ đề dựng ra.
- **CHƯA đo:** **độ chính xác tiếng Việt thật** (máy không có giọng Việt, Voice Studio chưa chạy). Đo bằng `node scripts/wer-test.mjs <clip> <văn-bản-đúng.txt> vi` (in WER có dấu và WER bỏ dấu thanh). Nếu WER cao thì cân nhắc PhoWhisper (cần hỏi người dùng trước khi tải).
- **File mã chính:** `py/transcribe.py`, `src/main/analysis.ts` (`transcribeFile`), `src/main/main.ts` (`/transcribe`, `/transcript`), `src/core/transcript.ts`.
- **Bẫy:** mô hình có sẵn trong máy: large-v3-turbo, medium, small. Không có mô hình thì báo lỗi, **không tự tải**. Chạy lại nhận dạng sẽ **mất các chỗ sửa tay**.

### F-31 Phụ đề từng từ + style + sửa transcript
- **Trạng thái:** chạy. Ba kiểu: `karaoke` (từ đang nói sáng lên, các từ khác mờ), `word-pop` (mỗi từ trượt lên), `line-fade` (cả dòng mờ dần). Nhóm theo tối đa N từ / M ký tự, ngắt ở dấu câu và khoảng nghỉ. Mỗi nhóm là một clip chữ (tag `captions:<clipId>`) trên track "Phu de", mốc từng từ lấy từ `animator.times`.
- **Cách dùng:** tab **Lời thoại**: bấm đôi một từ để sửa (hộp thoại), "Tạo phụ đề" / "Tạo lại phụ đề", chọn kiểu, màu, màu nhấn. MCP: `fix_transcript` (đề xuất sửa chính tả theo chỉ số từ), `generate_captions` (đề xuất).
- **Đã đo:** phụ đề karaoke khớp mốc từng từ trong ảnh dựng; từ đã sửa ("cáo") xuất hiện đúng dấu trong phụ đề; chữ Việt ra đúng dấu.
- **File mã chính:** `src/core/captions.ts`, `src/renderer/ui/Transcript.tsx`, `src/render/text-raster.ts` (`waveColor`).
- **Giới hạn:** chưa tự tách dòng theo độ rộng thật của chữ (chỉ theo số từ/ký tự); QC báo chữ tràn khung.

### F-32 Dựng theo transcript và cắt khoảng lặng
- **Trạng thái:** chạy. Op `remove_ranges` (cắt nhiều đoạn nguồn một lần = split + ripple_delete theo thứ tự giảm dần, rồi **tạo lại phụ đề** của các mảnh còn lại). Một bước hoàn tác (Ctrl+Z) cho cả lần cắt.
- **Cách dùng:** chọn từ (click, Shift+click chọn đoạn) → "Cắt đoạn đã chọn"; hoặc "Tìm khoảng lặng" (ngưỡng giây) → "Cắt N khoảng". Có lời thoại thì tìm theo lời (nhanh, đúng ý), chưa có thì theo âm thanh (`silencedetect`). Chừa 0,12 s mỗi đầu để nhịp thở tự nhiên. MCP: `cut_words`, `cut_silences` (cả hai chỉ tạo đề xuất).
- **Đã đo:** cắt 2,13 s thì phụ đề dịch đúng 2,13 s; hoàn tác khôi phục; sau cắt phụ đề vẫn phủ 100 % lời thoại.
- **File mã chính:** `src/core/session.ts` (`remove_ranges`), `src/core/transcript.ts` (`silenceGaps`, `speechRanges`), `src/main/analysis.ts` (`detectSilences`).

### F-33 SFX/nhạc: kho có tag và SFX theo sự kiện (chờ duyệt)
- **Trạng thái:** chạy. Kho đọc từ thư mục âm thanh của kit (27 SFX, 8 nhạc Mixkit có BPM; trùng bản sao đã loại). Tag suy từ tên file (`swoosh` = `whoosh`). Tab **Thư viện**: tìm, nghe thử, "+" thêm vào timeline tại con trỏ, "+ thư mục" thêm kho.
- **SFX theo sự kiện:** quy tắc `cut` (cắt cảnh), `text` (chữ hiện), `marker`/`beat` (nhịp). Bấm "Gợi ý SFX" → tạo **một đề xuất**; ở tab Đề xuất **mỗi SFX có ô tick riêng**, bỏ tick cái không thích rồi Chấp nhận (chỉ các mục còn tick được thêm, tự kèm track/media phụ thuộc). **Không có SFX nào tự áp dụng** (người dùng từng chê SFX AI tự đặt). MCP: `list_library`, `suggest_sfx` (tag không có trong kho bị từ chối).
- **Đã đo:** 2 SFX whoosh tại 2,96 s và 5,96 s; chấp nhận riêng mục 2; SFX nghe được trong file xuất (−20 dB so với −120 dB khi bỏ).
- **File mã chính:** `src/main/library.ts`, `src/core/sfx.ts`, `src/renderer/ui/Library.tsx`, `src/renderer/ui/Panels.tsx` (`ProposalCard`), `src/main/main.ts` (`subsetWithDeps`).

### F-34 Duck nhạc và chuẩn loudness
- **Trạng thái:** chạy. **Duck:** op `duck_clip` sinh keyframe âm lượng cho clip nhạc dựa trên lời thoại ở các clip khác (hạ `amount` dB, vào `attack`, ra `release`); sửa được trong graph editor. **Loudness:** ô "−14 LUFS" cạnh nút Xuất (mặc định bật) = `loudnorm` **2 lượt** (đo rồi chỉnh tuyến tính) + đỉnh −1,5 dBTP. MCP: `duck_music`; `render_start` có `loudness_lufs`.
- **Đã đo:** duck −13,9 dB trên sóng 7 kHz trong file xuất; loudness −21,9 → −14,5 LUFS (đỉnh −1,5 dBTP); xuất từ nút giao diện ra −14,55 LUFS.
- **Giới hạn:** `loudnorm linear` sẽ **không lên tới −14** nếu mix có đỉnh quá cao (phải hạ để không vượt −1,5 dBTP), cần limiter: chưa làm. Preview không nghe thấy chuẩn hoá (chỉ file xuất).

### F-35 Marker và nhịp nhạc
- **Trạng thái:** chạy. `py/beats.py` (numpy, chọn pha theo băng trầm, bù trễ 0,044 s) cho BPM + lưới nhịp. Marker (`Project.markers`) hiện trên thước thời gian và là **điểm bám** của timeline. Tab Lời thoại (chọn clip nhạc): "Nhận nhịp", "Đặt marker nhịp" (mỗi N nhịp). MCP: `detect_beats`, `beat_markers`.
- **Đã đo:** nhạc tổng hợp 120 BPM: BPM chính xác, sai pha tối đa 5,4 ms; hai bài Mixkit ~129 BPM (lệch ≤ 0,2 %).
- **Giới hạn:** **có thể gấp đôi/một nửa nhịp** (một ca 75 BPM ra 150); lưới `beat0` của kit không khoá pha nên đừng dùng làm chuẩn; chưa kiểm bằng tai.

### F-36 `qc_check`
- **Trạng thái:** chạy một phần. Tab **Kiểm tra** + MCP `qc_check`: font thiếu dấu Việt, chữ tràn khung 9:16/16:9, loudness bản trộn (LUFS, đỉnh, nhận xét), phụ đề có phủ lời thoại không. **Chưa có:** khung đen, vùng an toàn chi tiết, ảnh nhấp nháy.

### F-41 Tách nền video (RVM) + matte alpha
- **Trạng thái:** chạy (2026-11-17). `py/matte.py` chạy **Robust Video Matting** (mobilenetv3, ONNX) bằng `onnxruntime-gpu` (CUDA), có bộ nhớ theo thời gian nên viền ít nhấp nháy hơn tách từng khung. Kết quả là **video xám** (0 = nền, 255 = người) cùng số khung/fps với file gốc, lưu lossless (FFV1) ở `<userData>/cache/matte/`, rồi nhập như một media phụ `role: "matte"` (đi qua đúng đường ống cache H.264 như media thường) và gắn vào media gốc (`Media.matte`). Media matte **bị ẩn khỏi kho media**.
- **Mô hình:** `models/rvm_mobilenetv3_fp32.onnx` (~15 MB) tải từ trang phát hành của RVM **sau khi người dùng đồng ý** (2026-11-17). **Giấy phép RVM: GPL-3.0**: dùng nội bộ thì ổn, nhưng đừng đóng gói/phát hành kèm mô hình mà không xem lại giấy phép. Thiếu file → lỗi `MODEL_MISSING`, không tự tải. `models/` không đưa lên GitHub.
- **Cách dùng:** chọn clip video → Thuộc tính → mục **Tách nền** → "Tách nền (RVM, GPU)" (thanh tiến độ, chạy nền; chỉ một phân tích chạy một lúc cùng whisper/nhịp). Xong thì bật **Chỉ hiện người** (clip có `matte`: nền trong suốt, thấy lớp phía dưới). Chỉnh **Đen/Trắng** (cắt viền mờ) và **Làm mềm viền** (0..16 texel). Tách lại cùng file thì dùng lại matte đã có. MCP: `remove_background` (job), `apply_matte` (đề xuất).
- **Cách render:** lớp video có `matte` dùng shader riêng (`fs_layer_matte`): alpha = kênh đỏ của khung matte (giải mã cùng khung chỉ số với video gốc), qua mức đen/trắng (`smoothstep`) và làm mềm 9 mẫu; trộn trong không gian tuyến tính như mọi lớp.
- **Đã đo (clip talking head thật 1080×1920, 6 s):** RVM xong trong ~15 s trên RTX 3060 (CUDA). Ghép matte: vùng người (matte>0,97) **100 %** giống video gốc, vùng nền (matte<0,03) **100 %** thấy nền phía sau; người chiếm 56 % khung. Làm mềm 8 → nhiều điểm chuyển tiếp hơn (1938 → 2711); mức đen/trắng 0,45..0,55 → viền gọn (1938 → 115). So với `aroll_matte.mp4` của kit: sai số TB 0,0001 (IoU 1,000): **nhưng matte đó cũng do RVM tạo, nên chỉ chứng minh chạy đúng như kit, không phải độ chính xác tuyệt đối so với thực tế**.
- **File mã chính:** `py/matte.py`, `src/main/analysis.ts` (`matteVideo`), `src/main/main.ts` (`startMatte`, route `/matte`), `src/render/renderer.ts` (`MATTE_WGSL`), `src/renderer/engine.ts` (`getMatte`), `src/core/schema.ts` (`Media.role/matte`, `Clip.matte`, ops `set_media_matte`, `set_clip_matte`).
- **Giới hạn đã biết:** chưa kiểm viền tóc/tay nhanh bằng mắt trên nhiều clip khác nhau; chỉ tách **một người/vật chính** (RVM); tốc độ ~10 khung/s (chuyển ONNX qua numpy, chưa dùng IO binding); matte lưu ở thư mục cache (đổi máy thì tách lại); tách lại bằng mô hình khác chưa có giao diện (F-40); matte cũ không bị xoá khi tách lại; chưa có làm mịn theo thời gian ngoài RVM; không tách theo clip (tách cả file gốc).

### F-42 Chữ sau lưng người
- **Trạng thái:** chạy. Nút **Chữ sau người** (mục Tách nền) và MCP `text_behind_person` dựng 2 track mới: track **chữ** (giữa) và track **người tách nền** (trên cùng); lớp người là bản sao clip (cùng thời gian, keyframe, tốc độ; `volume = 0` nên không đúp tiếng; `tag: cutout:<clip>`). Video gốc giữ ở dưới. Một bước Ctrl+Z hoàn tác cả ba thay đổi.
- **Đã đo:** chỗ chữ giao với người: người che chữ (100 % điểm = video gốc); chỗ không có người: chữ hiện rõ (100 %); khung xuất khớp xem trước (sai số TB 2,4/255).
- **File mã chính:** `src/core/behind.ts` (`personCutoutPlan`), `src/renderer/actions.ts` (`textBehindPerson`), `src/mcp/server.ts`.
- **Giới hạn:** sửa clip gốc (đổi thời gian, cắt) **không** tự đồng bộ lớp người (là bản sao độc lập); cần tạo lại; chữ ra/vào "đi xuyên qua người" (chiều sâu 3D) chưa có.

### F-43 Time remap / speed ramp
- **Trạng thái:** chạy. Thuộc tính `speed` (0,05..16): **cố định** (`Clip.speed`) hoặc **keyframe** (track `speed`, có bezier/Ease như mọi keyframe, hiện ở tab Đường cong). Thời điểm nguồn = `in + ∫ speed(t) dt` (`srcTimeAt`, tích phân hình thang mỗi 1/120 s). **Độ dài clip trên timeline giữ nguyên**, đoạn nguồn tiêu thụ thay đổi; nếu vượt độ dài nguồn thì bị từ chối ngay (validate). 5 preset (`SPEED_PRESETS`): hero-time, bullet-time, speed-up-end, slow-start, pulse (co giãn theo độ dài clip).
- **Cách dùng:** Thuộc tính → mục **Tốc độ**: ô "Tốc độ (x)" + nút thoi ◇ (keyframe), preset + "Áp dụng", "Đặt lại 1x". MCP: `set_speed` (`speed` | `preset` | `keys`).
- **Chậm (<1x):** **trộn hai khung nguồn kề nhau** theo phần lẻ (khung sau vẽ lên với độ đục = phần lẻ) để không bị giật: đo trên dải răng cưa, lệch tối đa 4/255 so với đường liên tục (bậc thang sẽ ~14). **Đây là frame blending, không phải nội suy chuyển động RIFE (F-44 chưa làm)**: chuyển động nhanh khi chậm sẽ ra bóng mờ.
- **Âm thanh:** tốc độ cố định: xuất dùng `atempo` (**giữ cao độ**: đo 440 Hz không lên 880 Hz); nghe thử dùng `playbackRate` nên **cao độ đổi khi nghe thử**. **Speed ramp: tắt tiếng clip đó** (cả nghe thử và xuất).
- **Đã đo:** preview và file xuất hiện đúng khung nguồn (tốc độ 2x có `in`; ramp 1→3: tích phân đúng; xuất 2x tại giây 1,5 = khung nguồn giây 3); xuất 4 s đúng 4,00 s.
- **Ràng buộc đã chặn:** speed ramp không trim đầu/đổi `in`, không cắt theo lời/khoảng lặng và không tạo phụ đề (các phép đó giả định tốc độ 1); `split_clip` tính lại `in` của mảnh phải bằng thời điểm nguồn tại điểm cắt và giữ tốc độ liên tục ở điểm cắt. Trim đầu clip tốc độ cố định nhân `in` theo tốc độ.
- **File mã chính:** `src/core/speed.ts`, `src/core/anim.ts` (prop `speed`), `src/core/session.ts` (`set_speed`, `split_clip`), `src/renderer/engine.ts` (`layersAt`), `src/renderer/audio.ts`, `src/main/exporter.ts` (`atempoChain`).
- **Giới hạn:** chưa "bám nhịp nhạc" (căn keyframe tốc độ theo marker), chưa kéo giãn âm thanh theo đường cong, chưa RIFE; waveform trên timeline không co theo tốc độ.

### F-50 Chỉnh màu cơ bản gộp thành 3D LUT
- **Trạng thái:** chạy (2026-11-17). Mỗi clip video/ảnh có `Clip.grade` (schema v5). Tham số: nguồn log, phơi sáng (stop), nhiệt độ, tint, tương phản + pivot, bão hòa, 4 bánh màu **lift / gamma / gain / offset** (mỗi bánh có R, G, B và master), đường cong, LUT `.cube`, mức áp dụng (mix). Không keyframe được (chưa làm).
- **Thứ tự xử lý (cho mỗi điểm màu):** giá trị mã hóa của video → (log hoặc sRGB) về ánh sáng tuyến tính → phơi sáng → nhiệt độ/tint (nhân kênh, gần đúng, **không phải Kelvin**) → mã hóa sRGB → tương phản quanh pivot → đường cong (master rồi từng kênh) → lift/gamma/gain/offset (`gain·(x + lift·(1−x))`, rồi mũ `2^−gamma`, rồi `+offset`) → bão hòa (theo luma 709) → LUT `.cube` → trộn theo `mix`.
- **Cách chạy:** `core/grade.ts` **nướng** cả chuỗi này thành một **LUT 3D 33³** (CPU, ~35 nghìn điểm, được nhớ theo nội dung grade), nạp thành texture 3D `rgba16float`; shader lớp video lấy mẫu LUT (nội suy tam tuyến tính) thay cho bước sRGB EOTF. Clip không chỉnh (hoặc grade = identity) **không dùng LUT** (đường cũ, không tốn gì). Có thể đi cùng matte (tách nền) và speed ramp.
- **Cách dùng:** chọn clip → tab **Màu**: ô số + thanh trượt (thả chuột/phím mới ghi: một bước hoàn tác), bánh màu có nút ↺, "Đặt lại" xóa mọi chỉnh. MCP: `grade_get`, `grade_set` (đề xuất).
- **Đã đo (ảnh thật, `e2e-color`):** GPU so với công thức CPU trên lưới 700+ điểm: phơi sáng, tương phản + bão hòa, nhiệt độ/tint, lift/gamma/gain/offset, đường cong, S-Log3, V-Log, mix, LUT: **sai số TB 0,01–0,27, lớn nhất 1–3 / 255**. Đường LUT khi gần như không chỉnh: sai số TB 0,005 (33³ + float16 không làm sai màu). Xuất file khớp xem trước: sai số TB 3,0/255 (nén H.264 + đổi NV12, cùng mức các bài so sánh trước). Chỉnh màu **không làm chậm xuất** (90 khung: 1,54 s so với 1,50 s).
- **File mã chính:** `src/core/grade.ts`, `src/render/renderer.ts` (`layerWgsl`, `getLutTexture`), `src/renderer/engine.ts` (`gradeLayer`), `src/renderer/ui/Color.tsx`.
- **Giới hạn đã biết:** LUT nướng ở mã hóa 0..1 nên **giá trị vượt 1 bị cắt trước LUT** (phơi sáng không "kéo lại" được vùng đã cháy); xem bằng mắt trên màn hình chuẩn chưa kiểm; grade áp **theo clip**, chưa theo track/điều chỉnh lớp (adjustment layer); chưa copy/dán grade giữa các clip (dùng `match_color` hoặc `apply_lut` tạm).

### F-51 Input Transform log và LUT `.cube`
- **Trạng thái:** một phần. **S-Log3** và **V-Log**: công thức đường cong → ánh sáng tuyến tính, kiểm điểm xám 18 % (`0,41056` → 0,18 và `0,423311` → 0,18). **Chỉ biến đổi đường cong**: không chuyển gam màu (S-Gamut3/V-Gamut → Rec.709) và không tone-map, nên màu cần chỉnh thêm hoặc dùng LUT của hãng. **Chưa làm Canon Log, Apple Log** (không chắc hằng số nên không đoán).
- **LUT `.cube`:** đọc 3D (`LUT_3D_SIZE` 2..129, `DOMAIN_MIN/MAX`, tiêu đề); từ chối LUT 1D và file thiếu dòng kèm lý do. Gắn qua tab Màu (hộp thoại chọn file) hoặc MCP `apply_lut` (đọc thử file trước). LUT là **mã hóa hiển thị Rec.709/sRGB** và chạy sau chỉnh màu cơ bản. File LUT bị xóa/di chuyển → xem trước **báo lỗi rõ** (không im lặng bỏ qua). **Xuất `.cube`:** nút "Xuất grade thành .cube" nướng grade (kèm LUT đang gắn) ra 33³; vòng ghi → đọc lại đúng trong test đơn vị, **hộp thoại lưu file chưa kiểm bằng tay**.
- **Bẫy:** đường dẫn LUT lưu tuyệt đối trong dự án: đổi máy thì phải gắn lại.

### F-52 Scope và chế độ xem
- **Trạng thái:** chạy. **Compute shader** (`SCOPE_WGSL`) đếm trên khung đã ghép sau Output Transform (atomic): histogram (R, G, B, luma), waveform theo cột (320 cột × 256 mức × 4 kênh), vectorscope Cb/Cr 256². Số đếm đọc về CPU; `core/scopes.ts` (thuần, có test) vẽ ảnh và tính thống kê. Tab **Scope**: Waveform, RGB Parade, Vectorscope (lưới 25/50/75 %, **đường da cam 123°**, 6 ô mục tiêu 75 %), Histogram + số đo bên dưới. Cập nhật theo con trỏ, chạy được khi phát.
- **Chế độ xem (chỉ preview, không vào file xuất):** **Màu giả** (tím = đen ép, xanh dương = tối, xanh lá = da/giữa, vàng/cam = sáng, đỏ = cháy; **gần đúng, không theo chuẩn ARRI/RED**) và **Cảnh báo clip** (vạch hồng ≥ 99 %, xanh lơ ≤ 1 %).
- **Đã đo:** ramp 0..1: luma TB 0,4998 (đúng 0,5), độ lệch 0,2886 (đúng 0,2887), trung vị 0,498; waveform là **đường chéo** (điểm sáng đúng mức = vị trí cột), histogram phẳng; thanh màu 75 %: R,G,B TB = 0,4265 / 0,4283 / 0,43 (đúng 4/7·0,75 = 0,4286), **6 chấm màu R,Y,G,C,B,M nằm đúng ô mục tiêu** của vectorscope. Chế độ màu giả/clip: tìm thấy đúng các vùng màu trên ramp.
- **File mã chính:** `src/render/renderer.ts` (`analyze`, `SCOPE_WGSL`, `fs_out` view), `src/core/scopes.ts`, `src/renderer/ui/Scope.tsx`.
- **Giới hạn:** scope đo **khung ghép toàn bộ** (hoặc một clip qua `analyze_frame` có `clip_id`), chưa đo một vùng chọn; chưa so với DaVinci/ffmpeg `waveform` bằng cùng một clip thật (chỉ so với dữ liệu tổng hợp có đáp án); màu giả/clip tính theo luma/kênh sau Output Transform sRGB.

### F-53 Đường cong
- **Trạng thái:** một phần. Đường cong **master + R, G, B** (tối đa 16 điểm, nội suy đơn điệu Fritsch–Carlson nên không lượn quá 0..1). Editor: bấm thêm điểm, kéo đổi, nhấp đôi xóa, nút S (chữ S nhẹ), ↺ đặt lại từng kênh. **Chưa làm:** log wheels (shadow/mid/highlight theo log), **qualifier HSL**, **power window** (cần mặt nạ theo điểm ảnh, không nướng được vào LUT, cần pipeline riêng).

### F-54 MCP chỉnh màu
- **Trạng thái:** chạy (+91 kiểm trong `mcp-test`). `analyze_frame` (đo bằng số: trung bình/lệch/min/max/p1/p50/p99 của R,G,B,luma, % cháy/ép đen, % kênh clip, bão hòa, lệch màu tổng thể (`cast`), % điểm da, % theo vùng sáng; `clip_id` đo riêng một clip, `graded=false` đo màu gốc, `proposal_id` đo kết quả của đề xuất **chưa duyệt**), `scope_image` (ảnh scope để AI "nhìn"), `grade_get`, `grade_set` (đề xuất, chỉ gửi trường cần đổi), `apply_lut` (đề xuất), `match_color` (đề xuất gain + offset theo kênh để trung bình/độ lệch R,G,B của clip khớp clip tham chiếu).
- **Đã đo `match_color`:** sau khi áp đề xuất (xem trước), khoảng cách trung bình R,B tới clip tham chiếu giảm ít nhất một nửa trên cặp clip thử. **Đây là khớp thống kê đơn giản** (trung bình + độ lệch từng kênh), không phải khớp cảm nhận; có thể làm da sai màu; luôn xem lại bằng `preview_frame`.
- **Lưu ý cho AI:** AI **không thể xem màu như người**; dùng `analyze_frame`/`scope_image` để quyết định, rồi `preview_frame(proposal_id)`.

### F-103..F-108 Nâng cấp chỉnh màu và scope (2026-11-18)
- **Không gian màu (F-103):** `Grade.input` có 11 mục (xem `src/core/colorspace.ts`, `INPUT_SPACES`): `none` (Rec.709/sRGB), `slog3` và `vlog` (chỉ đường cong, giữ cho dự án cũ), `slog3_sgamut3cine`, `slog3_sgamut3`, `vlog_vgamut`, `logc3_awg3`, `applelog`, `davinci_dwg`, `acescct`, `log3g10_rwg`. Gam màu được đổi sang Rec.709 bằng ma trận **tính từ tọa độ xy** của 3 màu gốc + điểm trắng (kèm Bradford cho ACES D60→D65), không chép ma trận từ trí nhớ. Màu ngoài gam Rec.709 được **nén liên tục về phía độ sáng** (không cắt cứng, vì cắt cứng tạo vách gây lệch hue). `tonemap: 'aces'` (Stephen Hill fit RRT+ODT): xám 18 % ra ~0,10 tuyến tính hiển thị.
- **Độ tin cậy từng mục** (`INPUT_SPACES[..].checked`): đường cong LogC3, DaVinci Intermediate, ACEScct, Log3G10, S-Log3, V-Log kiểm bằng điểm xám 18 % của tài liệu hãng; ma trận AWG3→Rec.709 khớp ma trận ARRI; **các gam màu còn lại và Apple Log chưa đối chiếu số hãng**, chỉ kiểm quay vòng và tính nhất quán.
- **Hai bước (F-104):** bước A chạy bằng giải tích trong fragment shader (`stage_a` trong `layerWgsl`), bước B (levels, tương phản, đường cong, lift/gamma/gain/offset, log wheels, bão hòa, vibrance, qualifier, LUT .cube) nướng thành 3D LUT (2³ nếu bước B không làm gì, 33³ thường, 65³ có qualifier). Phần vượt 1 sau bước A được cộng lại nguyên (không mất năng lượng vùng cháy). Khóa LUT (`gradeKey`) bỏ `input`, `exposure`, `temperature`, `tint`, `tonemap`, `mix`, `win`: kéo các thanh này **không nướng lại**. CPU tham chiếu: `stageA`, `stageB`, `gradePixel` (= A rồi B).
- **Qualifier (F-105):** `Grade.qual`: sắc độ (tâm, nửa rộng, độ mềm), bão hòa/độ sáng (từ, đến, mềm), đảo, `adjust` (xoay sắc độ, nhân bão hòa, cộng độ sáng), `show` xem mặt nạ. Mặt nạ tính trên ảnh sau bước A.
- **Log wheels (F-106):** `Grade.logw`: `shadows` (cộng, chỉ vùng tối), `mids` (mũ), `highlights` (nhân, chỉ vùng sáng), `shadowRange`, `highlightRange`.
- **Cửa sổ (F-107):** `Grade.win`: elip/chữ nhật theo tỉ lệ clip, xoay, mép mềm, đảo. Chỉ áp chỉnh màu trong hình; ngoài hình giữ màu gốc. Chạy trong shader (không nướng).
- **Scope (F-108):** thêm `ycbcr` (Y, Cb, Cr tách riêng; shader đếm 6 kênh), đơn vị trục % / 8-bit / 10-bit / IRE (0 IRE = mã 16, 100 IRE = mã 235). `scope_image` nhận `kind=ycbcr`.
- **Đã đo (GPU thật):** quay vòng log (`scripts/e2e-colorspace.mjs`): tạo video có ô màu trong gam Rec.709 được mã hóa vào từng đường cong + gam màu, Tool Edit giải mã lại; GPU so với công thức CPU trên **chính mã đã giải mã**: xám ≤ 1,6/255, màu ≤ 1,8/255 trên 9 không gian (trước khi chuyển bước A sang shader: đến 8,5/255). `scripts/e2e-color2.mjs` (17 kiểm): GPU = CPU cho log wheels, qualifier, tổng hợp; cửa sổ GPU = CPU (TB 0,05); scope khớp số đo độc lập từ ảnh (lệch TB 0,0001). `e2e-color` 35/35, `ui-test-color` 35, `ui-test-view` 55, `e2e` 38, `ui-test` 52, `mcp-test` 106, `security-test` 22 (chạy với `TOOL_EDIT_AUTO_APPLY=0`).
- **Giới hạn:** ảnh quay vòng là 8-bit H.264, nên so với màu gốc vẫn lệch đến ~20/255 ở màu bão hòa của gam rất rộng (do lượng tử hóa mã log 8-bit, không phải lỗi pipeline); footage log 10-bit thật sẽ tốt hơn. Mặt nạ qualifier mềm ở mép (LUT 65³), kiểm mặt nạ chỉ xét sai số trung bình. Scope vẫn đếm 256 mức (8-bit) trên ảnh sau Output Transform sRGB. Chưa có: keyframe chỉnh màu, cửa sổ bám chuyển động, Canon Log, HLG/PQ, chuyển gam màu đầu ra (chỉ Rec.709/sRGB), grade theo track/adjustment layer.
- **Bẫy đã gặp:** (1) cắt cứng màu ngoài gam hoặc log cực sáng cho giá trị vọt ở góc lưới LUT, nội suy tam tuyến kéo sai các điểm lân cận (lệch đến 120/255) → nén gam liên tục + giải mã log trong shader; (2) tăng LUT lên 65³ không sửa được (lỗi do vách, không do độ phân giải); (3) bài kiểm dùng ảnh KHÔNG phải log làm lộ mẫu cực bão hòa ngoài gam: phải kiểm quay vòng bằng ảnh log giả; (4) sau khi AI tự áp dụng, các bài kiểm cũ chờ đề xuất `pending` hỏng giả: chạy app kiểm thử với `TOOL_EDIT_AUTO_APPLY=0`.

### F-60 Hiệu ứng lớp và chế độ trộn
- **Trạng thái:** chạy (2026-11-17), schema v6. Mỗi clip có `fx` (blur, glow, shadow, round, crop, vignette, wipe) và `blend` (normal, add, screen, multiply). Đơn vị px theo cạnh ngắn 1080. Thông số của hiệu ứng **keyframe được** (`fx.<tên>.<trường>`, ví dụ `fx.wipe.progress`, `fx.blur.radius`; hiệu ứng phải có trước; gỡ hiệu ứng thì gỡ luôn keyframe của nó).
- **Cách chạy (GPU):** clip có hiệu ứng (blur/glow/shadow/vignette/wipe) hoặc blend ≠ normal được **vẽ riêng** ra texture RGBA16F premultiplied, chạy chuỗi pass toàn khung theo thứ tự **blur → glow → bóng → vignette → wipe**, rồi ghép lên khung bằng pipeline blend (normal: `1, 1−a`; add: `1, 1`; screen: `1−dst, 1`; multiply: `dst, 1−a`; đều trong ánh sáng tuyến tính). `round` và `crop` chạy ngay trong shader lớp video/ảnh (SDF bo góc có khử răng cưa), nên rẻ; crop cắt hình chữ nhật theo tỉ lệ của lớp (dùng để cắt video vào "thẻ").
  - Blur: Gaussian tách 2 pass (33 mẫu, bước tự giãn). Glow: ngưỡng độ sáng → blur → cộng (tô màu tuỳ chọn). Bóng: blur kênh alpha, lệch, đặt dưới lớp. Vignette: tối dần về góc. Wipe: mặt nạ quét theo góc có độ mềm.
- **Cách dùng:** Thuộc tính → mục **Hiệu ứng và chế độ trộn** (chọn → "+", ô số có nút thoi ◇, ✕ để gỡ). MCP: `set_fx` (chỉ gửi trường cần đổi; `remove`/`remove_all` để gỡ), `set_blend`; mọi thứ là đề xuất.
- **Đã đo (ảnh thật, `e2e-fx`, 25 kiểm):** blur 40 làm mềm mép hình và giữ tổng ánh sáng tuyến tính (±4 %); bóng đỏ lệch 120 px hiện đúng chỗ và nằm dưới hình; glow cyan làm sáng vùng ngoài mép; bo góc 0,3 làm 4 góc video thành đen; vignette 0,9 làm góc còn ~10 % ánh sáng tuyến tính; wipe 50 % ở góc 0° và 90° che đúng nửa; keyframe wipe 0→1 hiện 25 % ở 0,5 s và 75 % ở 1,5 s; **blend add/screen/multiply khớp công thức tuyến tính trong ±5/255**.
- **File mã chính:** `src/core/fx.ts`, `src/render/renderer.ts` (`FX_WGSL`, `drawWithFx`, `fxPipe`, `layerWgsl` có bo góc/crop), `src/renderer/ui/Inspector.tsx` (`FxControls`).
- **Giới hạn đã biết:** hiệu ứng áp **theo clip** (chưa có lớp điều chỉnh/adjustment layer áp cho nhiều lớp); thứ tự hiệu ứng cố định; `round`/`crop` chỉ cho clip video/ảnh (không cho chữ/hình, hình có `radius` riêng); khi chậm (<1x) lớp trộn khung phụ cũng chịu hiệu ứng riêng (có thể khác nhẹ so với AE); ảnh PNG **có alpha** đi qua đường canvas nên **chưa chỉnh màu/crop/bo góc** được (ảnh không alpha vẫn đủ); chưa có motion blur, noise, grid, gradient 4 màu, tint, edge, minimax, kính làm mờ nền (backdrop blur).

### F-63 Hình vector
- **Trạng thái:** chạy. Nguồn clip mới `shape`: `rect` (bo góc), `ellipse`, `ring` (chỉ viền), `star` (số cạnh, tỉ lệ trong). Tô (màu + độ đục), viền (màu + độ dày), `trim` 0..1 (viền "tự vẽ" theo chiều kim đồng hồ từ đỉnh). Vẽ bằng Canvas 2D thành texture premultiplied như chữ (nên dùng được glow/bóng/blend). Keyframe được: `shape.w`, `shape.h`, `shape.stroke.width`, `shape.fillOpacity`, `shape.radius`, `shape.trim`.
- **Cách dùng:** menu **+ Hình** trên thanh trên; mục **Hình** trong Thuộc tính. MCP: `add_shape` (đề xuất).
- **Giới hạn:** `trim` của rect/sao dùng nét đứt theo chu vi **xấp xỉ**; chưa có đường tự do/path, nhiều hình trong một nhóm, trim bắt đầu/offset (chỉ từ đỉnh).

### F-62 Dựng lại video talking head "Foodtage" (lần 1)
- **Cách làm:** `scripts/build-foodtage.mjs` dựng **bằng API của Tool Edit** từ đúng bộ dữ liệu `D` của `build.jsx` (zoom, số, từ khoá, tile, vòng nổ, logo, B-roll, light leak, SFX): nhập 21 media, tách nền RVM aroll, aroll + grade (levels, vibrance, bão hòa, tương phản, vignette) + zoom key HOLD, chữ sau lưng người (lớp người tách nền trên cùng), hook "Here's 3 Ways", tile icon (thẻ shape + glow, icon net neon chuẩn bị bằng ffmpeg + `screen`), vòng nổ (shape ring), "Keyboard Shortcut", thanh kính + hàng logo (PNG alpha), B-roll thẻ bo góc + màn hình ghi (crop), light leak (`screen`), phụ đề từng từ từ transcript của kit, 102 SFX theo cue kit (kể cả click mỗi từ). Lưu `out/gd6/foodtage.tedit`, xuất `out/gd6/foodtage-tooledit.mp4`.
- **Số đo:** ~177 clip trên 42 track; xuất 666 khung 1080×1920 trong **17,5 s** (~38 khung/s với toàn bộ lớp); âm −14,67 LUFS (kit v1: −15,5); `bash scripts/compare-frames.sh ten "t1 t2 ..."` xếp ảnh bản dựng (trên) với `ref/video-mau.mp4` (dưới) để xem bằng mắt.
- **Giống:** bố cục, thời điểm, vị trí, chữ sau lưng người (matte), tile và vòng nổ, logo trên thanh kính, B-roll thẻ, phụ đề cyan xếp chồng, zoom nhảy theo ý.
- **Còn khác bản AE (CHƯA đạt, chờ người dùng chấm):** (1) **rings 17,85 s trở đi** (vòng icon xoay 2.5D trên nền xanh đậm) **chưa làm**; (2) bản AE dùng **font thay thế** nên "Here's 3 Ways" và số 1 trông khác (bản của Tool Edit dùng đúng Tactic Sans/Pensum như thiết kế của kit); (3) không có **tia sét** quanh số, **strokeUp** của "Keyboard Shortcut", **vệt sáng chạy viền tile**, **glow tím góc thẻ**, **thanh kính làm mờ nền**, B-roll **không nghiêng 3D** (chỉ xoay −2°/−3°); (4) light leak **chọn lại** (kit v1 ghi nhận chọn sai 3 đoạn): 4 đoạn theo contact sheet, bỏ đoạn trắng đè B-roll; (5) màu chỉnh bằng công cụ của Tool Edit nên **không trùng từng pixel** (levels/vibrance/vignette đã gần, AE Brightness & Contrast chưa có tương đương chính xác).
- **Cảnh báo:** clip, meme, SFX, font thuộc bộ tài liệu khoá học, chỉ để học (như `HUONG-DAN-AI.md`).

### F-80 Trang chủ
- **Trạng thái:** chạy (2026-11-17). Khi mở phần mềm bình thường, màn hình đầu tiên là **Trang chủ** (chạy kiểm thử tự động `TOOL_EDIT_CDP_PORT`/`DEV_API` thì vào thẳng trình dựng; muốn thử Trang chủ khi đó đặt `TOOL_EDIT_START_HOME=1`). Có: **Dự án mới** (tên + 9:16 dọc / 16:9 ngang → lưu ngay thành file `.tedit` trong thư mục dự án, mặc định `Documents\Tool Edit\Du an`, đổi bằng `TOOL_EDIT_PROJECTS_DIR`), **Mở dự án…**, **Tiếp tục dự án đang mở**, khôi phục phiên chưa lưu, **Dự án gần đây** (tìm theo tên; mỗi thẻ có số clip/media, độ dài, khung/fps, dung lượng, lần sửa cuối) với các nút **Mở / Đổi tên / Nhân bản / Bỏ khỏi danh sách / Xóa**.
- **Cách làm:** danh sách = file đã mở/lưu gần đây (`recent.json`, không gồm phiên tự lưu) + mọi `.tedit` trong thư mục dự án. **Xóa** chuyển file vào **Thùng rác** (khôi phục được) sau khi xác nhận; **Đổi tên** đổi cả tên trong file lẫn tên file; **Nhân bản** tạo bản sao riêng (`… (bản sao)`). "Bỏ khỏi danh sách" không xóa file (file trong thư mục dự án vẫn được quét lại).
- **Route (chỉ giao diện/IPC, HTTP cần `DEV_API`):** `GET /projects`, `POST /projects/create|duplicate|rename|forget|trash`. Có kiểm trong `security-test`.
- **File mã chính:** `src/renderer/ui/Home.tsx`, `src/main/main.ts` (khối "cài đặt + trang chủ"), `src/renderer/actions.ts`.
- **Giới hạn:** chưa có ảnh bìa (thumbnail) cho thẻ dự án; chưa sắp xếp lại/nhóm/gắn sao; xóa dự án **không** xóa cache media.

### F-81 Cài đặt và phím tắt
- **Trạng thái:** chạy. Nút **⚙ Cài đặt** (hoặc Ctrl+,) → bảng **Phím tắt**: 38 hành động (phát/dừng, cắt, xóa, xóa liền, hoàn tác, lưu, mở, nhập media/thư mục, marker, thêm chữ, zoom, chiều cao track, phóng to timeline/khung xem, đổi tab, nhảy điểm cắt, …). Bấm vào ô phím rồi nhấn tổ hợp mới (Esc hủy); **báo trùng phím**; bỏ gán ✕; đặt lại từng phím ↺ hoặc **Đặt lại tất cả**. Phím không hoạt động khi đang gõ trong ô nhập hoặc khi đang mở hộp thoại.
- **Lưu bền:** `settings.json` trong thư mục dữ liệu app (`userData`), chỉ lưu phần khác mặc định. Phím mặc định xem `src/renderer/keymap.ts` (`ACTIONS`).
- **Đã đo:** gán phím X cho "Cắt" → X cắt clip và S cũ hết tác dụng; sửa phím xong được lưu xuống file; đặt lại về mặc định (`ui-test-ux`); 4 test đơn vị (`comboOf`, bản đồ mặc định, trộn cấu hình, báo trùng).
- **Sao chép / dán / nhân đôi clip (thêm 2026-11-17):** **Ctrl+C** sao chép, **Ctrl+X** cắt (lấy đi), **Ctrl+V** dán tại con trỏ, **Ctrl+D** nhân đôi (đặt ngay sau bản gốc). Chọn nhiều clip thì dán cả nhóm **giữ khoảng cách giữa các clip**; nếu chỗ dán đã có clip thì cả nhóm tự **dịch tới chỗ trống** (không chồng nhau). Bản sao giữ hiệu ứng, chế độ trộn, chỉnh màu, keyframe, tốc độ, matte; bỏ nhãn phụ đề/SFX tự sinh (thành clip thường). Một lần dán = một bước Ctrl+Z. Ở tab **Đường cong**, Ctrl+C / Ctrl+V dành cho keyframe (như cũ).
- **Xuất / nhập bộ phím (thêm 2026-11-17):** nút **Xuất…** (file JSON chỉ chứa phím khác mặc định) và **Nhập…** (thay bộ hiện tại; mục lạ/sai bị bỏ qua và báo số lượng; file hỏng bị từ chối) trong Cài đặt. Hàm `parseKeymapJson` có test đơn vị; **hộp thoại chọn/lưu file chưa kiểm bằng tay** (không bấm được hộp thoại hệ điều hành trong kiểm thử tự động).
- **Giới hạn:** không bắt được phím hệ thống (Alt+F4…); chưa có phím cho chuột/cử chỉ; dán không tạo track mới khi track gốc bị xóa (dùng track cùng loại đầu tiên).

### F-82 Con lăn chuột trên timeline
- Ctrl + con lăn: phóng to / thu nhỏ **quanh vị trí chuột** (thời điểm dưới con trỏ chuột đứng yên). **Alt + con lăn: cuộn timeline sang trái / phải.** Shift + con lăn: cuộn ngang nhanh. Con lăn thường: cuộn các track lên / xuống. Alt khi kéo clip: tắt bám dính (như cũ). Dùng listener gốc không thụ động để chặn được cuộn mặc định.

### F-83 Bố cục kéo được
- **Thanh chia** giữa Media | Khung xem | Thuộc tính (dọc) và giữa khung xem | Timeline (ngang): kéo để đổi kích thước, **bấm đúp để thu gọn / mở lại**. Nút **⤢ Phóng to** ở timeline và ở khung xem (hoặc Shift+T / Shift+P) phóng to tạm một khung. Thanh **Cao track** (hoặc Ctrl+= / Ctrl+−) đổi chiều cao mọi track để dễ nhìn khi nhiều layer. Bố cục được lưu (không lưu trạng thái phóng to tạm).

### F-84 Thanh đo âm lượng trái / phải
- Bên phải khung xem: hai cột **T** (trái) và **P** (phải), thang −60…0 dBFS, màu xanh → vàng → đỏ, **đỉnh giữ 1,5 giây**, chữ đỏ khi chạm 0 dB. Đo từ `AnalyserNode` gắn sau chuỗi tổng (không đổi âm thanh), cập nhật ~30 lần/giây, rơi dần khi dừng.
- **Đã đo:** file chỉ có tiếng tai trái: cột T nhảy lên (−18 dB), cột P im (`-inf`); dừng phát thì rơi xuống.
- **Giới hạn:** đo mức **đỉnh mẫu** (sample peak) của phần phát lại trong preview, **không phải** LUFS (xem tab Kiểm tra) và không gồm tiếng nghe thử ở tab Âm thanh.

### F-85 Nhập thư mục và tab Âm thanh
- **Nhập media:** kéo file **hoặc thư mục** từ Explorer vào cửa sổ, nút **+ Nhập thư mục** (thanh trên) / **+ Thư mục** (kho media), phím Ctrl+Shift+I: nhập mọi file video/âm thanh/ảnh trong thư mục (cả thư mục con, tối đa 300 file mỗi lần).
- **Tab Âm thanh** (trước đây "Thư viện"): danh sách **thư mục SFX/nhạc** lưu bền (`library.json`): **+ Thêm thư mục**, **✕ bỏ khỏi kho** (không xóa file), **↻ Quét lại**; bên dưới là kho có tìm/lọc/nghe thử/thêm vào timeline và "Gợi ý SFX theo sự kiện". **AI chỉ dùng âm thanh trong các thư mục này** (`list_library`, `suggest_sfx`) và mọi SFX AI gợi ý vẫn **chờ bạn duyệt từng mục**. Route `POST /library/remove_dir` (chỉ giao diện).

### F-86 Việt hóa giao diện
- Toàn bộ chữ trong giao diện (nút, nhãn, gợi ý, hộp thoại, thông báo, tên preset/kiểu phụ đề/hiệu ứng/preset tốc độ, thang scope…) đã có dấu tiếng Việt; tên dự án mặc định "Chưa đặt tên", track phụ đề tên "Phụ đề".
- **Thông báo từ lõi/tiến trình chính** (lỗi xác thực, lỗi nhập…) vẫn không dấu trong mã (để MCP/AI và các bài kiểm không đổi); khi **hiển thị** trên giao diện chúng được khôi phục dấu tự động bằng `src/renderer/vi-runtime.ts` (sinh từ `scripts/_vi.py`). Có thể sót vài từ chưa có trong từ điển; báo lại để thêm.
- Tên kỹ thuật vẫn giữ tiếng Anh (glow, matte, keyframe, LUT, scope…) vì là thuật ngữ nghề.

### F-71 Snapshot/restore dự án
- **Trạng thái:** chạy (ui-test: bấm nút thật). 2026-11-16.
- **Làm gì:** snapshot có tên của cả dự án (trong bộ nhớ). **Khôi phục là một thay đổi hoàn tác được** (Ctrl+Z) và **giữ cache media hiện tại** (không bị snapshot ghi đè).
- **Cách dùng:** nút **Snapshot** (hộp thoại nhập tên), nút **Khôi phục** (hộp thoại chọn từ danh sách). MCP: `snapshot_create`, `snapshots_list` (AI chỉ **tạo**; **không có tool khôi phục**).
- **File mã chính:** `src/core/session.ts` (`snapshot`, `restoreSnapshot`, `listSnapshots`), `src/renderer/actions.ts`.
- **Giới hạn đã biết:** snapshot không lưu vào file `.tedit` (mất khi tắt app); tên trùng thì ghi đè.

---

## 4. Tool MCP và route HTTP hiện có

**Tool MCP** (server `tool-edit`, `dist/mcp.mjs`, 47 tool). Chi tiết tham số xem `src/mcp/server.ts`.

| Tool | Làm gì | Tham số chính | Trả về | F | Cần duyệt? |
|---|---|---|---|---|---|
| `app_status` | Trạng thái app, GPU, job, đề xuất chờ | — | JSON | F-01 | không |
| `project_get` | Đọc dự án (kèm 5 history gần nhất) | — | JSON | F-03 | không |
| `media_import` | Nhập media, tạo cache nền | `path` | `{mediaId, job_id}` | F-06 | không (nhập có thể hoàn tác) |
| `job_status` | Trạng thái tác vụ nền | `job_id` | `{state, progress, result/error}` | F-11 | không |
| `propose_ops` | **Đề xuất** thay đổi (dry-run, chờ duyệt) | `ops[]`, `note` | `{proposal_id}` hoặc lỗi | F-13 | **có: người duyệt trong giao diện** |
| `proposals_list` | Xem trạng thái đề xuất | — | JSON | F-13 | không |
| `preview_frame` | Xem một khung (có thể xem trước một đề xuất) | `t`, `scale`, `aspect?`, `proposal_id?` | ảnh PNG | F-05 | không |
| `contact_sheet` | Xem nhiều khung xếp ngang | `times` hoặc `from/to/count`, `scale` | ảnh PNG | F-05 | không |
| `list_presets` | Preset chữ/chuyển động (kèm nguồn số đo từ kit) | — | JSON | F-26 | không |
| `list_fonts` | Font cài trong máy, đủ dấu tiếng Việt hay không | `vietnamese`, `query` | JSON | F-20 | không |
| `add_text` | **Đề xuất** thêm clip chữ (tự chọn track, áp preset) | `text`, `start`, `duration`, `preset?`, `font?`, `size?`, `color?`, `track?`, `anchor_*`, `x`, `y` | `{proposal_id, clip_id, track}` | F-29 | **có: người duyệt** |
| `set_keyframes` | **Đề xuất** thay track keyframe của một thuộc tính | `clip_id`, `property`, `keys[{t,value,ease,bezier}]` | `{proposal_id}` | F-24 | **có: người duyệt** |
| `apply_preset` | **Đề xuất** áp preset lên clip chữ | `clip_id`, `preset` | `{proposal_id}` | F-26 | **có: người duyệt** |
| `transcribe` | Nhận dạng giọng nói từng từ (whisper GPU, chạy nền) | `media_id`, `language`, `model`, `prompt?` | `{job_id}` | F-30 | không (kết quả lưu vào media) |
| `get_transcript` | Đọc lời thoại + mốc từng từ + chỉ số từ | `media_id`, `from?`, `to?` | JSON | F-30 | không |
| `fix_transcript` | **Đề xuất** sửa chính tả từ nhận sai | `media_id`, `edits[{index,text}]` | `{proposal_id}` | F-31 | **có** |
| `generate_captions` | **Đề xuất** phụ đề từng từ | `clip_id`, `style`, `max_words`, `font?`, `color?`... | `{proposal_id}` | F-31 | **có** |
| `cut_silences` | **Đề xuất** cắt khoảng lặng | `clip_id`, `min_silence`, `keep` | `{proposal_id, silences}` | F-32 | **có** |
| `cut_words` | **Đề xuất** cắt đoạn lời theo chỉ số từ | `clip_id`, `media_id`, `from_word`, `to_word` | `{proposal_id, range}` | F-32 | **có** |
| `list_library` | Kho SFX/nhạc đã duyệt | `kind?`, `tag?`, `query?` | JSON | F-33 | không |
| `suggest_sfx` | **Đề xuất** SFX theo sự kiện (duyệt từng SFX) | `rules[{event,tag,volume}]` | `{proposal_id, plan}` | F-33 | **có (từng mục)** |
| `duck_music` | **Đề xuất** hạ nhạc dưới giọng nói | `clip_id`, `amount_db`, `attack`, `release` | `{proposal_id}` | F-34 | **có** |
| `detect_beats` | Phân tích nhịp (nền) | `media_id` | `{job_id}` | F-35 | không |
| `beat_markers` | **Đề xuất** đặt marker nhịp | `clip_id`, `every` | `{proposal_id}` | F-35 | **có** |
| `qc_check` | Kiểm tra chất lượng bản trộn | — | `{ok, issues, loudness, speech}` | F-36 | không |
| `remove_background` | Tách nền video bằng RVM (GPU, chạy nền) | `media_id` | `{job_id}` | F-41 | không (kết quả là media phụ ẩn) |
| `apply_matte` | **Đề xuất** chỉ hiện người / gỡ matte | `clip_id`, `enabled`, `lo`, `hi`, `feather` | `{proposal_id}` | F-41 | **có** |
| `text_behind_person` | **Đề xuất** chữ sau lưng người (2 track mới + clip) | `clip_id`, `text`, `start?`, `duration?`, `preset?`, `font?`, `size?`, `color?`, `y?` | `{proposal_id, text_clip, person_clip,...}` | F-42 | **có** |
| `set_speed` | **Đề xuất** đổi tốc độ / speed ramp | `clip_id`, một trong `speed` / `preset` / `keys` | `{proposal_id}` | F-43 | **có** |
| `grade_get` | Đọc chỉnh màu của clip (hoặc mặc định) | `clip_id` | JSON | F-50 | không |
| `grade_set` | **Đề xuất** chỉnh màu (gộp từng phần) | `clip_id`, `exposure`, `temperature`, `tint`, `contrast`, `saturation`, `lift/gamma/gain/offset`, `curves`, `input`, `mix`, `reset` | `{proposal_id}` | F-50 | **có** |
| `apply_lut` | **Đề xuất** gắn LUT `.cube` | `clip_id`, `path`, `mix` | `{proposal_id}` | F-51 | **có** |
| `analyze_frame` | Đo số liệu màu của khung | `t`, `clip_id?`, `graded?`, `proposal_id?` | JSON thống kê | F-52 | không |
| `scope_image` | Ảnh scope (waveform/parade/vectorscope/histogram) | `t`, `kind`, `clip_id?`, `graded?`, `proposal_id?` | ảnh PNG | F-52 | không |
| `match_color` | **Đề xuất** khớp màu với clip khác | `clip_id`, `t`, `reference_clip_id`, `reference_t`, `strength` | `{proposal_id, gain, offset}` | F-54 | **có** |
| `set_fx` | **Đề xuất** thêm/sửa/gỡ hiệu ứng lớp (blur, glow, shadow, round, crop, vignette, wipe) | `clip_id`, mỗi hiệu ứng là object, `remove[]`, `remove_all` | `{proposal_id}` | F-60 | **có** |
| `set_blend` | **Đề xuất** đổi chế độ trộn (normal, add, screen, multiply) | `clip_id`, `blend` | `{proposal_id}` | F-60 | **có** |
| `add_shape` | **Đề xuất** thêm hình vector (rect, ellipse, ring, star) | `kind`, `start`, `duration`, `w`, `h`, `fill`, `stroke_*`, `radius`, `trim`, `x`, `y`, `track?` | `{proposal_id, clip_id, track}` | F-63 | **có** |
| `snapshot_create` | Lưu mốc có tên | `name` | JSON | F-71 | không (chỉ tạo) |
| `snapshots_list` | Liệt kê mốc | — | JSON | F-71 | không |
| `render_start` | Xuất video nền | `preset`, `out?`, `loudness_lufs?` | `{job_id, frames,...}` | F-11 | không |
| `export_timeline` | Xuất timeline sang phần mềm khác (premiere/resolve/capcut/ae/edl); phần không chuyển được thành MỘT lớp .mov trong suốt (job nền) | `target`, `aspect`, `overlay` | `job_id`; `job_status` trả `out_dir`, `files`, `warnings`, `verified` | F-97 | không (chỉ ghi file vào thư mục exports, không sửa dự án) |
| `job_cancel` | Hủy job | `job_id` | `{ok}` | F-11 | không |

**Route HTTP nội bộ** `127.0.0.1:17480` (đổi bằng `TOOL_EDIT_PORT`). Cột "Chỉ giao diện" nghĩa là HTTP trả 403 trừ khi `TOOL_EDIT_DEV_API=1` (F-17); giao diện gọi qua IPC (`window.toolEdit.api`).

| Route | Làm gì | Chỉ giao diện |
|---|---|---|
| `GET /status`, `GET /project`, `GET /project/autosave` | trạng thái, dự án, phiên tự lưu | không |
| `POST /ops`, `/undo`, `/redo` | áp op trực tiếp, hoàn tác/làm lại | **có** |
| `POST /project/save\|load\|new\|rename` | lưu/mở/mới/đổi tên | **có** |
| `POST /snapshots` (tạo), `GET /snapshots`, `POST /snapshots/restore` | snapshot | khôi phục: **có** |
| `POST /propose`, `GET /proposals`, `GET /proposals/:id/draft` | đề xuất, danh sách, dự án giả định | không |
| `POST /proposals/:id/accept\|reject` | duyệt | **có** |
| `POST /media_import` | nhập media | không |
| `GET /fonts?vietnamese=1&q=`, `POST /fonts/rescan`, `GET /warnings`, `GET /presets` | font, cảnh báo, preset | không |
| `GET /jobs`, `GET /jobs/:id`, `POST /jobs/:id/cancel` | job nền | không |
| `POST /render_start` | xuất video (có `loudness`) | không |
| `POST /transcribe`, `GET /transcript?media_id=`, `POST /beats` | whisper, đọc lời thoại, nhận nhịp | không |
| `GET /silences?clip_id=&min=&keep=&source=` | tìm khoảng lặng | không |
| `GET /library`, `POST /library/scan`, `POST /library/tags`, `POST /suggest_sfx` | kho SFX/nhạc, gợi ý SFX | không |
| `GET /analyze_frame?t=&clip_id=&graded=&proposal=` | số liệu màu (compute shader) | không |
| `GET /scope_image?t=&kind=&clip_id=&graded=&proposal=` | ảnh scope | không |
| `POST /matte` | tách nền video (job) | không (chỉ thêm media phụ ẩn) |
| `GET /qc` | kiểm tra chất lượng (nhờ giao diện đo loudness và chữ) | không |
| `GET /preview_frame?t=&scale=&aspect=&proposal=` | ảnh PNG một khung | không |

Quy ước khi thiết kế tool MCP:
- Schema đơn giản (object phẳng, tránh `anyOf`/`oneOf` lồng nhau) để Claude, Gemini, GPT đều nhận.
- Tác vụ dài trả `job_id` + dùng `job_status`; không chặn.
- Lỗi trả có cấu trúc (`isError` + thông điệp, kèm hướng dẫn sửa khi có thể).
- Tool ghi đi qua `propose_ops`; tool màu và SFX luôn thành **đề xuất chờ duyệt**. Không có tool áp dụng/duyệt/hoàn tác/khôi phục cho AI.

---

## 5. Cách chạy và kiểm

| Lệnh (trong `tool-edit/`) | Làm gì |
|---|---|
| `npm install`, rồi `node node_modules/electron/install.js` | cài lần đầu (npm chặn script cài đặt nên phải tải Electron tay) |
| `npm run build` | build `dist/` |
| `npm start` | mở app (dùng thật; **không** bật cờ dev) |
| `npm test` | 112 test đơn vị (trong đó 11 mới: xuất timeline, gộp hoàn tác, hình học khung chọn) (thêm phím tắt, nhập bộ phím, khôi phục dấu) (thêm hiệu ứng lớp, blend, hình vector, levels/vibrance): lõi + timeline + diff + snapshot + keyframe/bezier/chữ/preset (không cần GPU) |
| `npm run typecheck` | kiểm kiểu TypeScript |
| `npm run selftest` | selftest GPU (ramp, thanh màu, BT.709, benchmark) → `out/selftest.json` |
| `npm run e2e` | 38 kiểm đầu-cuối HTTP (app phải chạy **với `TOOL_EDIT_DEV_API=1`**; cần `out/media/{seq,color,test-a}.mp4`) |
| `npm run e2e-text` | 51 kiểm dựng chữ + keyframe bằng điểm ảnh, font, cảnh báo, preview = file xuất (app chạy với `TOOL_EDIT_DEV_API=1`) |
| `npm run mcp-test` | 118 kiểm MCP (47 tool) (app chạy với `TOOL_EDIT_DEV_API=1`) |
| `npm run ui-test` | 52 kiểm giao diện thật (app chạy với `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333`; cần thêm `out/media/{img.png,beep.wav}`) |
| `npm run ui-test-text` | 44 kiểm giao diện chữ/keyframe/graph editor (app chạy với `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333`) |
| `npm run e2e-audio` | 43 kiểm đầu-cuối âm thanh bằng dữ liệu thật: whisper GPU, phụ đề, cắt lặng, duck, loudness, SFX duyệt từng mục, nhịp (app chạy với `TOOL_EDIT_DEV_API=1`; tự tạo file thử trong `out/media/`) |
| `npm run ui-test-audio` | 24 kiểm giao diện giai đoạn 3 (tab Lời thoại/Thư viện/Kiểm tra, duyệt từng SFX, xuất −14 LUFS); cần `out/media/speech-en.mp4` do `e2e-audio` tạo (app chạy với `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333`) |
| `node scripts/wer-test.mjs <clip> <văn-bản-đúng.txt> vi` | **đo độ chính xác nhận dạng trên clip của bạn** (WER có dấu / bỏ dấu thanh) |
| `npm run e2e-video` | 26 kiểm đầu-cuối giai đoạn 4 bằng dữ liệu thật: tốc độ/speed ramp (preview + xuất, cao độ), trộn khung, tách nền RVM trên clip talking head thật, ghép matte, chữ sau người (app chạy với `TOOL_EDIT_DEV_API=1`; cần `models/rvm_mobilenetv3_fp32.onnx` và clip kit `aroll.mp4`; tự tạo `ramp-lin.mp4`, `ramp-saw.mp4`, `aroll6.mp4` trong `out/media/`) |
| `npm run ui-test-video` | 17 kiểm giao diện giai đoạn 4 (mục Tốc độ, preset, nút thoi, Tách nền, chỉnh matte, Chữ sau người, kho media ẩn matte); cần các file do `e2e-video` tạo (app chạy với `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333`) |
| `npm run e2e-color` | 30 kiểm đầu-cuối giai đoạn 5 bằng điểm ảnh: GPU so với công thức CPU (phơi sáng, tương phản, log, bánh màu, đường cong, LUT), xuất khớp xem trước, tốc độ xuất, scope trên ramp/thanh màu có đáp án, `analyze_frame`/đề xuất (app chạy với `TOOL_EDIT_DEV_API=1`; cần `out/media/color-test.mp4`, tạo bằng lệnh ở cuối mục này) |
| `npm run ui-test-color` | 22 kiểm giao diện giai đoạn 5 (tab Màu, thanh trượt, bánh màu, đường cong, LUT, tab Scope 4 loại, màu giả, cảnh báo clip); cần `e2e-color` chạy trước để có `out/e2e-color/dao.cube` (app chạy với `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333`) |
| `npm run e2e-fx` | 25 kiểm đầu-cuối giai đoạn 6 (engine) bằng điểm ảnh: hình vector, blur, bóng, glow, bo góc, vignette, wipe + keyframe, blend add/screen/multiply so với công thức (app chạy với `TOOL_EDIT_DEV_API=1`; cần `out/media/color-test.mp4`) |
| `npm run ui-test-fx` | 14 kiểm giao diện giai đoạn 6 (menu + Hình, mục Hình, hiệu ứng thêm/sửa/keyframe/gỡ, chế độ trộn, tóm tắt đề xuất) |
| `npm run ui-test-ux` | 46 kiểm giao diện mới (Trang chủ, Cài đặt/phím tắt, Alt+con lăn, thanh chia, phóng to, chiều cao track, thanh đo âm lượng, nhập thư mục, tab Âm thanh); app chạy với `TOOL_EDIT_PROJECTS_DIR=out/projects-test TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333`; cần `out/media/{left-only.wav,folder-test/}` (xem script) |
| `npm run ui-test-view` | 55 kiểm khung xem: zoom/pan/phím tắt, chọn + kéo + đổi cỡ + xoay + snap + keyframe trên khung xem, ô thông số đổi ngay, gộp hoàn tác, khung chọn khớp điểm ảnh ảnh/chữ (app chạy với `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9334`, cổng khác bằng `TOOL_EDIT_PORT`; cần `out/media/img.png`) |
| `npm run ui-test-export` | 17 kiểm hộp thoại "Xuất sang…" (chọn đích, tóm tắt, cảnh báo, chạy job, thông báo xong); cần `out/media/aroll6.mp4` |
| `npm run e2e-export` | 25 kiểm xuất timeline bằng file thật: EDL, xmeml/FCPXML hợp lệ (parser Python), .jsx đúng cú pháp, bản nháp CapCut (nếu có khuôn), lớp phủ qtrle có alpha khớp preview (MAE 0,001/255); cần `out/media/{aroll6.mp4,test-a.mp4,beep.wav}` |
| `npm run build-foodtage` | dựng lại video Foodtage bằng Tool Edit và xuất (xem F-62); cần RVM, ffmpeg, bộ tài nguyên kit; mất ~1–2 phút |
| `bash scripts/compare-frames.sh ten "t1 t2 ..."` | xếp ảnh bản dựng với video mẫu để xem bằng mắt (`out/gd6/cmp-<ten>.png`) |
| `npm run security-test` | 22 kiểm bảo mật (thêm cài đặt, trang chủ, xóa thư mục kho, `export_timeline` trên timeline rỗng) (app chạy **không** có `TOOL_EDIT_DEV_API`) |
| `npm run mcp-config-check` | khởi chạy server từ `.mcp.json` như một client, liệt kê tool |
| `npm run mcp-report` | chấm một phiên AI (đề xuất sai, vi phạm luật, file xuất) |

Mở app cho kiểm thử trong Git Bash: `TOOL_EDIT_DEV_API=1 TOOL_EDIT_CDP_PORT=9333 node node_modules/electron/cli.js .`. Dừng app **chỉ bằng cách dừng tiến trình giữ cổng 17480** (xem mục 6).

## 6. Bẫy chung đã biết

- [có] Cờ `force_high_performance_gpu` + `powerPreference: high-performance` cho adapter NVIDIA trên máy chủ (F-01). Chưa kiểm Windows chọn gì nếu thiếu cờ.
- [có] WebGPU trong Electron 45 chạy tốt trên RTX 3060 Laptop (xem `NHAT-KY.md`).
- [có] `npm install` chặn script cài đặt: binary Electron phải tải tay bằng `node node_modules/electron/install.js`.
- [có] Khi dừng app thử, **chỉ dừng tiến trình giữ cổng 17480** (`Get-NetTCPConnection -LocalPort 17480`). Đừng `taskkill electron`: Claude desktop cũng là Electron.
- [có] `ffmpeg` mặc định đổi RGB→YUV theo BT.601. Mọi chỗ tạo video/cache phải ép `out_color_matrix=bt709` và gắn cờ.
- [có] Kiểm thử bằng mảng rỗng đạt oan (`[].every(...)` đúng): hàm `near` trong `e2e.mjs` đã chặn mảng rỗng.
- [có] Màu tham chiếu của file thử là số **đo bằng ffmpeg giải mã chính file đó**, không phải giá trị lý thuyết.
- [có] Mọi tác vụ trả `job_id`; không bao giờ có hộp thoại chặn đối với AI.
- [có] **Đừng giữ nhiều `VideoFrame`**: bộ giải mã phần cứng cạn bề mặt và treo (xem F-07). Mọi thứ dùng bộ giải mã phải đi qua `locked()` (F-15).
- [có] **Electron không có `window.prompt`** (dùng hộp thoại của app); `window.confirm` dùng được.
- [có] Node trên Windows có thể báo `Assertion failed: UV_HANDLE_CLOSING` nếu gọi `process.exit()` khi `fetch` còn mở: dùng `process.exitCode`.
- [có] Khi sửa file bằng Python qua heredoc, `\\n` trong chuỗi có thể thành xuống dòng thật: kiểm lại bằng `node --check` / `tsc`.
- [có] **Công cụ viết/hiển thị file của phiên làm việc làm hao một nửa dấu `\\`** (đã gặp: regex `\\b`, `\\(`, `\\n` thành sai, bài kiểm "đạt/trượt" khó hiểu). Tránh regex có `\\`; dùng `split/join`, `String.fromCharCode`, hoặc sửa theo số dòng.
- [có] Chữ canh giữa theo **hộp dòng**, gradient trải theo hộp dòng, neo "dưới" tính cả descent: khi viết bài kiểm điểm ảnh, so sánh **tương đối** (giữa 9:16 và 16:9, giữa hai thời điểm), đừng đo tuyệt đối theo mực chữ.
- [có] Canvas 2D cho ảnh **premultiplied**: texture chữ nạp với `premultipliedAlpha: true` và shader trộn kiểu premultiplied, nếu không viền chữ bị đen.
- [có] Trùng tên lớp CSS giữa các thành phần gây lỗi bố cục khó thấy (xem F-08): đặt tiền tố theo thành phần.
- [có] **Whisper không bao giờ tự tải mô hình** (`local_files_only`); thiếu mô hình là lỗi `MODEL_MISSING`, phải hỏi người dùng.
- [có] `loudnorm` phải **2 lượt** và `linear=true`, nếu không âm lượng nhảy theo thời gian; mix đỉnh cao sẽ không lên tới −14 LUFS.
- [có] Test xuất phải đợi **job mới** (so với danh sách job cũ), đừng lấy "job render xong cuối cùng" vì có thể là file của bài khác (đã gặp ở `ui-test-audio`).
- [có] Hộp thoại huỷ/lỗi xuất trên Windows: file đích còn bị khoá khi ffmpeg chưa thoát; xoá file phải đợi sự kiện `close` và bắt lỗi (đã sửa: lỗi EPERM từng làm job treo ở 55 %).
- [có] `ui-test` giả định tab Thuộc tính đang mở; giao diện giữ tab cũ sau `/project/new`, nên bài kiểm bấm tab trước.
- [có] Nhịp nhạc có thể bị gấp đôi/một nửa; `beat0` trong `index.json` của kit không khoá pha, đừng tin làm chuẩn.
- [có] **RVM cần `models/rvm_mobilenetv3_fp32.onnx`** (không tự tải, không đưa lên Git; giấy phép GPL-3.0). Cần `nvidia-cublas-cu12`/`nvidia-cudnn-cu12` (đã có do whisper) để `onnxruntime-gpu` dùng CUDA; thiếu thì rơi về CPU rất chậm (`add_cuda_dlls` ở `py/matte.py`).
- [có] Giá trị xám của video thử có thể lệch công thức (file `ramp-lin.mp4` đo thực tế thấp hơn `255*T/10` khoảng 5): **đo giá trị nguồn bằng ffmpeg**, đừng so với công thức.
- [có] Test đợi **job tách nền** phải chấp nhận trường hợp matte đã có trong cache (xong ngay, không có thanh tiến độ).
- [có] Giải mã đồng thời: lớp có matte dùng thêm một `CachedVideo` cho matte (+ khung kề khi chậm); cùng media dùng chung một bộ giải mã. Đã kiểm 3 lớp (nền, chữ, người+matte) xuất đủ khung; vẫn chú ý giới hạn bề mặt giải mã phần cứng (F-07).
- [có] Tạo file thử màu: `ffmpeg -f lavfi -i "smptebars=s=640x360:r=30:d=3" -f lavfi -i "testsrc2=s=640x360:r=30:d=3" -filter_complex "[0:v][1:v]vstack,scale=360:640,format=yuv420p" -c:v libx264 -crf 10 -g 15 -bf 0 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv out/media/color-test.mp4`. Bài kiểm lấy **ảnh chưa chỉnh làm đầu vào** cho công thức CPU nên không phụ thuộc ma trận màu của file.
- [có] Slider phải ghi **giá trị mới nhất** (dùng `useRef`): bấm phím mũi tên nhanh từng làm mất một lần ghi vì closure cũ.
- [có] `layout: 'auto'` của WebGPU chỉ giữ binding **có dùng** trong shader: mỗi tổ hợp (matte × LUT) là một pipeline riêng (`getLayerPipe`), không dùng chung bind group.
- [có] Scope đếm trên ảnh 8-bit sau Output Transform: phân bố ramp hơi lệch giữa các bin khi số cột không chia hết 256 (cột cao so le), nên bài kiểm histogram phẳng dùng ngưỡng rộng.
- [có] Cache LUT đã nướng giữ theo **nội dung grade** (24 mục) và texture 3D (12 mục); sửa file `.cube` ngoài app cần mở lại dự án để nạp lại (`forgetCubes` chưa gắn nút).
- [có] **`layout: 'auto'` của WebGPU bỏ binding không dùng trong shader**: bind group "đủ" bị lỗi và **cả khung ra đen không báo lỗi**. Các pass hiệu ứng dùng bind group layout cố định (`fxLayout`); đã thêm `uncapturederror` ghi log `WebGPU loi:` vào console để lần sau thấy ngay.
- [có] Blur/glow/bóng tính trong **ánh sáng tuyến tính** nên tổng giá trị **sRGB** tăng sau blur (đúng như vật lý); bài kiểm phải so trong ánh sáng tuyến tính.
- [có] PNG có alpha **mất trong suốt** nếu đi qua `VideoFrame`/external texture: ảnh có alpha đi qua canvas premultiplied (đã sửa lỗi "ô đen quanh logo").
- [có] Icon video ngắn hơn thời gian hiển thị cần **lặp** (AE dùng `loopOut`): Tool Edit chưa có lặp clip, kịch bản dựng nối nhiều clip bằng độ dài file.
- [có] Tên font phải **đúng tên họ font trong `list_fonts`** (vd `TacticSansExd-Blk`, `Pensum Display Book`, `TR Impact`); font đã cài ở thư mục người dùng nên không cần cài thêm.
- [có] **Kiểm thử tự động làm bẩn cài đặt thật** (`settings.json` bố cục, `recent.json`): dọn lại sau khi chạy bộ kiểm; trạng thái giao diện còn sót (zoom, bố cục) làm hỏng test sau → `ui-test` đặt lại zoom/bố cục ở đầu.
- [có] Bài kiểm giao diện dựa **chữ hiển thị** (`getByRole(name)`, regex trên `innerText`) phải đổi theo bản dịch; ưu tiên `data-testid`.
- [có] `POST /library/scan` do HTTP thêm thư mục không làm giao diện tự cập nhật; bấm ↻ Quét lại (tab Âm thanh) để nạp.
- [có] Công cụ ghi file làm hao dấu `\` khi sinh code bằng Python (đã gặp nhiều lần: regex, `\n`): dùng `chr(92)`/`String.fromCharCode(92)`.

### F-87 Nâng cấp giao diện
Viết lại `styles.css` thành một hệ thiết kế (biến màu/bo góc/đổ bóng, thanh cuộn mảnh, ô nhập/chọn/checkbox/thanh trượt tự vẽ). Thêm `Icon.tsx` (~45 icon SVG vẽ tay). Thanh trên gom nhóm nút có icon; tab bên phải chỉ hiện nhãn ở tab đang chọn (hết xuống 2 hàng); các mục thuộc tính gập/mở được (nhấn tiêu đề); thanh cuộn lồng nhau ở tab Âm thanh đã bỏ; Trang chủ, thẻ dự án, timeline, track head, clip, modal được làm lại kiểu dáng.
Kèm sửa lỗi: danh sách dự án trùng thẻ khi thư mục dự án cấu hình bằng đường dẫn tương đối (chuẩn hóa đường dẫn trong `GET /projects`).
Kiểm: tsc sạch, `npm test` đạt, toàn bộ ui-test/e2e/mcp-test/security-test không lỗi; xem bằng ảnh chụp ở 1600×950. **Chưa kiểm:** cửa sổ nhỏ hơn 1280 px, hiển thị ở DPI khác, đánh giá thẩm mỹ của người dùng.

### F-88 Thả media tự vào đúng loại track, tách video/audio
- Thả media lên track nào (hoặc ra vùng trống của timeline) cũng được: video/ảnh vào track video, âm thanh vào track audio; chưa có track loại đó thì tự tạo. Không còn báo lỗi "thả sai track". Nút "+" và nhấp đôi dùng chung đường này.
- Thả/thêm khi media còn đang tạo cache (vài giây): app tự chờ rồi thêm clip (tối đa 2 phút), lỗi thật thì báo lý do.
- Chuột phải lên clip: menu "Tách video và âm thanh" (phím mặc định Alt+S), ghép/hủy ghép, cắt, sao chép, nhân đôi, xóa; phím hiển thị theo bộ phím hiện tại. Tách = tạo clip audio cùng media, cùng vị trí/độ dài/điểm vào/âm lượng/tốc độ (và keyframe âm lượng, tốc độ) trên track audio còn trống (không có thì tạo track audio mới); clip video bị tắt tiếng (volume 0). Hai clip độc lập sau khi tách (muốn dính nhau thì ghép Ctrl+G).

### F-89 Quét chọn và clip ghép
- Giữ chuột trái và kéo trên vùng trống của timeline: hiện khung quét, chọn mọi clip bị khung chạm (giữ Shift để cộng thêm vào lựa chọn). Bấm không kéo = bỏ chọn và đặt con trỏ như cũ.
- Clip ghép: **Ctrl+G** ghép các clip đang chọn; **Ctrl+Shift+G** hủy ghép (đổi được ở Cài đặt). Dữ liệu: trường `group` trên clip (op `group_clips`, `ungroup`, hoàn tác được; AI dùng được qua propose_ops). Bấm một clip trong nhóm thì chọn cả nhóm, kéo thì cả nhóm dịch cùng nhau, xóa/sao chép cả nhóm; dán nhóm tạo nhóm MỚI; cắt một clip thì mảnh mới giữ nhóm. Clip trong nhóm có viền tím và icon móc xích.
- **Giới hạn:** đây là NHÓM clip trên timeline (như "Group" của nhiều phần mềm), không phải clip lồng (compound clip có timeline riêng bên trong); chưa có hiệu ứng/chỉnh màu áp lên cả nhóm một lần; kéo đổi track chỉ làm khi chọn một clip.

### F-90 Scope màu chính xác hơn
- **Đo chính xác hơn:** vùng đo chọn được (toàn khung / giữa 50% / nửa trên / nửa dưới; HTTP/MCP thêm `roi=full|center|upper|lower|left|right|x0,y0,x1,y1`), để bỏ viền đen/letterbox hoặc đo riêng khuôn mặt; số điểm đo hiện rõ (WxH). Đứng yên đo ở 0,5 độ phân giải khung (trước là 0,25), đang phát 0,3. `analyze_frame` thêm `below_legal_pct` (luma < 16) và `above_legal_pct` (luma > 235), `roi`, `measured_px`.
- **Vẽ rõ hơn:** vẽ ở độ phân giải màn hình, có nhãn % (0–100), vạch cam mức hợp lệ 16/235, vách ngăn + chữ R/G/B ở parade, vectorscope có ô mục tiêu 75% (R, Y, G, C, B, M), vòng 25/50/75/100%, đường da, phóng 1×/2×/4×, quầng sáng cho điểm màu phẳng; thu nhỏ theo MAX nên vệt mảnh không bị mờ. Thêm scope "RGB chồng" (rgbwave).
- **Rê chuột lên scope để đọc giá trị:** waveform/parade (mức % và mã 0–255, cảnh báo ngoài dải hợp lệ), histogram (giá trị và % điểm đúng giá trị đó từng kênh), vectorscope (Cb, Cr, độ bão hòa, góc, cách đường da bao nhiêu độ).
- **Bảng số đo:** TB/p1/giữa/p99/min/max cho Luma, R, G, B; cháy sáng/đen ép; ngoài dải hợp lệ; kẹp từng kênh; lệch màu; thanh phân bố vùng sáng.
- Kiểm: e2e-color kiểm vùng đo trên ramp có đáp án (nửa trái TB 0,25, nửa phải 0,75, đúng số điểm; 6,25% dưới 16 và 7,8% trên 235), ui-test-color kiểm 5 loại scope, đọc chuột, vùng đo, phóng vector. **Chưa kiểm:** so với scope của DaVinci/Premiere trên cùng clip; ảnh HDR/log (scope đo sau chuyển đổi đầu ra 8-bit nên không phản ánh vùng sáng vượt 100%).

### F-91 Vô hiệu hóa clip và kéo lên/xuống tự do
- **Vô hiệu hóa:** chọn clip, bấm **V** (hoặc nút "Tắt clip" trên thanh timeline, hoặc chuột phải). Bấm lần nữa để bật lại; nhiều clip: còn clip đang bật thì tắt hết, tất cả đã tắt thì bật lại hết. Clip tắt vẫn nằm trên timeline (mờ, gạch ngang tên, icon mắt gạch) nhưng không hiện hình (xem trước, scope, xuất), không phát tiếng, không vào bản trộn âm xuất. Dữ liệu: `disabled: true` trên clip, đặt qua `set_clip` patch `disabled` (bật lại = xóa trường); AI dùng được qua propose_ops.
- **Kéo lên/xuống:** kéo clip sang bất kỳ track CÙNG LOẠI (video chỉ giữa các track video, audio chỉ giữa track audio; kéo audio lên hàng video thì không chuyển). Chọn nhiều clip thì cả nhóm cùng dịch số hàng. Trùng thời gian với clip có sẵn ở track đích thì bị từ chối kèm thông báo.
- **Track mới:** khi kéo, hiện vùng đứt nét "Audio mới" (dưới hàng audio cuối) hoặc "Video mới" (ngay dưới thước, đè mép hàng video trên cùng); thả vào đó tạo track "Audio N" / "Video N" và chuyển clip vào (chỉ khi kéo MỘT clip của loại đó). Ví dụ: cắt một đoạn âm thanh rồi kéo xuống đáy sẽ ra Audio 2, 3, 4.
- Kiểm: ui-test-timeline (27 kiểm, gồm hình tắt thật = luma 0,50 → 0, kéo tạo Audio 3 / Video 3, audio không qua được hàng video), test/group.test.ts (bật/tắt, xuất âm thanh bỏ clip tắt). **Chưa làm:** tự xóa track rỗng; kéo xuống nhiều track mới liên tiếp cho nhiều clip cùng lúc; hiệu ứng ghim/khóa track.

**Bổ sung F-91 (hàng trống tự mất):** khi thao tác trên giao diện làm một track hết clip (kéo clip sang track khác, xóa, xóa liền, kéo ra track mới), track đó tự bị gỡ trong CÙNG bước hoàn tác (Ctrl+Z khôi phục cả clip lẫn track). Luôn giữ lại ít nhất 1 track video và 1 track audio. Chỉ gỡ track VỪA bị làm trống bởi thao tác đó: track trống do bấm "+ Track video/audio" hoặc đã trống sẵn thì giữ nguyên. Op mới `remove_track` (chỉ gỡ track không còn clip); thao tác qua HTTP/MCP không tự dọn. Tên track mới lấy số nhỏ nhất chưa dùng ("Audio 3") nên không trùng sau khi giữa bị gỡ. Kiểm: ui-test-timeline (31 kiểm), test/group.test.ts.

### F-92 Chỉnh màu sống và cửa sổ Scope riêng
- **Kéo là đổi ngay:** khi kéo thanh trượt ở tab Màu (phơi sáng, nhiệt độ, tint, tương phản, pivot, bão hòa, mức áp dụng, mức LUT, từng ô bánh màu lift/gamma/gain/offset) hoặc kéo điểm trên đường cong, khung xem và scope đổi theo NGAY trong lúc kéo; chỉ khi thả chuột mới ghi vào dự án (vẫn là MỘT bước hoàn tác). Cách làm: `store.live` giữ giá trị tạm, `live.ts` ghép tạm vào clip khi vẽ; không ghi lịch sử, không autosave cho đến khi thả. Gõ số vào ô thì ghi ngay như cũ.
- **Scope riêng:** nút "Scope riêng" ở đầu tab Màu hoặc **Ctrl+L** (đổi được ở Cài đặt) mở cửa sổ Scope nổi trong app: kéo bằng thanh tiêu đề, đổi cỡ bằng góc dưới phải, vị trí và cỡ được nhớ, bấm đúp thanh tiêu đề để về mặc định, nút thu nhỏ đưa về tab Scope bên phải. Mở cùng lúc với tab Màu để vừa chỉnh vừa xem; tab Scope bên phải báo "đang mở ở cửa sổ riêng" (không đo hai lần).
- **Giới hạn:** cửa sổ nằm TRONG cửa sổ app (chưa tách ra cửa sổ hệ điều hành để đặt sang màn hình thứ hai); ô chọn màu và gõ số không có bản xem trước trong lúc đang gõ; tốc độ khi kéo phụ thuộc GPU, chưa đo trên video dài hay độ phân giải cao hơn 1080×1920.
- Kiểm: ui-test-color (35 kiểm): đang kéo chưa thả thì hình đổi (độ lệch pixel 26) mà `grade` của clip chưa đổi; thả mới ghi; không nhảy màu sau khi thả; scope trong cửa sổ riêng đổi lúc đang kéo; kéo cửa sổ; Ctrl+L.

### F-93 File ToolEdit.exe
- `npm run package` (script `scripts/package.mjs`) tạo thư mục chạy được `release/ToolEdit/` (~375 MB): lấy runtime Electron sẵn trong `node_modules` (không tải thêm gì), đổi tên thành `ToolEdit.exe`, đặt mã đã build + `py/` + `models/` (RVM ONNX) vào `resources/app`. Bấm đúp `ToolEdit.exe` là mở; chép cả thư mục sang máy khác được.
- Dữ liệu người dùng (cài đặt, danh sách gần đây, cache, autosave) dùng chung với bản chạy từ mã nguồn (cùng thư mục userData `tool-edit`); dự án ở `Documents\Tool Edit\Du an`.
- Vẫn cần trên máy: `ffmpeg` trong PATH; tách nền, nhận diện lời thoại, nhịp nhạc cần Python và thư viện như trước.
- Kiểm: chạy chính file exe này với ui-test-timeline (31/31) và ui-test-color (35/35) đều đạt (GPU, giải mã, scope, chỉnh màu). **Chưa làm:** biểu tượng riêng (đang dùng biểu tượng Electron mặc định, đổi cần công cụ rcedit/electron-builder, phải tải thêm: cần bạn đồng ý), file cài đặt (installer), ký số (Windows có thể hỏi "Không nhận ra ứng dụng" khi chạy lần đầu), tự cập nhật, bản không cần ffmpeg cài sẵn.

### F-94 Khung xem: zoom và kéo (pan)
- **Trạng thái:** chạy (đã kiểm bằng giao diện thật qua `ui-test-view`)
- **Giai đoạn / cập nhật:** UX / 2026-11-18
- **Làm gì:** phóng to / thu nhỏ khung xem để nhìn chi tiết, kéo để dịch, về lại "vừa khung" hoặc 100% (1 điểm ảnh khung = 1 điểm ảnh màn hình).
- **Cách dùng (người):** cuộn chuột trên khung xem = zoom quanh con trỏ (điểm dưới con trỏ đứng yên); thanh nổi dưới khung có `−`, thanh trượt (10%–800%, thang log), `+`, nhãn %, nút **Vừa** và **100%**. Kéo chuột trái trên vùng trống hoặc chuột giữa ở bất cứ đâu = dịch khung. Phím (đổi được ở Cài đặt, nhóm Xem): `Alt+=` phóng, `Alt+-` thu, `Alt+0` vừa khung, `Alt+1` 100%, `Alt+G` vùng an toàn. Đổi tỉ lệ 9:16/16:9 thì về "vừa khung".
- **Cách dùng (AI/MCP):** không (chỉ giao diện; không ảnh hưởng dự án / file xuất).
- **Dữ liệu:** `store.pv = {fit, zoom, x, y, sw, sh}` (không vào dự án, không vào hoàn tác).
- **File mã chính:** `src/renderer/pview.ts` (toán zoom/pan, `previewScaleFor`), `src/renderer/ui/Stage.tsx` (khung + thanh `ZoomBar`), `engine.ts` (`previewCfg.scale`), `styles.css` (`.stage`, `.pvwrap`, `.pvbar`), `keymap.ts` + `ui/App.tsx` (phím).
- **Cách hoạt động:** canvas WebGPU được đặt trong `.pvwrap` có kích thước `W·zoom × H·zoom` (W,H = khung dự án theo tỉ lệ đang xem), dịch bằng `left/top`. **Độ phân giải render preview tăng theo zoom** (0,5 khi vừa khung → 0,75 → 1,0 khi zoom ≥ 75% trên màn 100% DPI) để zoom vào vẫn sắc nét; đo: vừa khung canvas 540 px, 100% canvas 1080 px.
- **Giới hạn đã biết:** zoom tối đa 800%; ở 100% khung 1080×1920 lớn hơn vùng xem nên phải kéo (đó là chủ ý). Preview vẫn qua `output transform` như bình thường, không phải "pixel-peeping" của bản xuất NVENC (nén H.264 khác).
- **Bẫy:** `wheel` phải gắn listener `passive:false` mới chặn được cuộn trang; thanh nổi phải `stopPropagation` pointerdown để không kích hoạt kéo-chọn phía sau.
- **Cách kiểm:** `npm run ui-test-view` (đo bề rộng `pvwrap`, `canvas.width`, điểm dưới con trỏ trước/sau zoom, dx/dy khi kéo, phím tắt).
- **Cách nâng cấp:** đổi dải zoom ở `pview.ts` (`PV_MIN/PV_MAX`); thêm cử chỉ chạm/pinch ở `Stage.tsx`.

### F-95 Tương tác trực tiếp trên khung xem
- **Trạng thái:** chạy (đã kiểm: hộp chọn khớp điểm ảnh thật của ảnh và chữ, kể cả khi xoay 30°)
- **Giai đoạn / cập nhật:** UX / 2026-11-18
- **Làm gì:** chọn clip chữ/hình vector/ảnh/video ngay trên khung xem; khung chọn có 4 tay nắm góc + tay xoay; kéo để dời, kéo góc để đổi cỡ, kéo tay xoay để xoay; có đường gióng/snap vào giữa, mép khung và vùng an toàn.
- **Cách dùng (người):** bấm vào clip trên khung xem = chọn (Shift = chọn thêm; ưu tiên clip đang chọn rồi tới clip trên cùng); bấm chỗ trống = bỏ chọn. Kéo thân khung chọn = dời (cả nhóm nếu chọn nhiều clip; giữ **Shift** để khoá một trục); kéo tay nắm góc = đổi tỉ lệ đều quanh **tâm hộp** (bám về 100% khi gần 1,0); kéo tay tròn phía trên = xoay (tự bám góc vuông ±3°; giữ **Shift** bám 15°). **Alt** = tắt bám tạm thời; nút **Bám** bật/tắt hẳn; nút **An toàn** hiện hai khung vùng an toàn (5% và 10% cạnh ngắn) + đường giữa. Đường gióng hồng hiện khi đang bám.
- **Keyframe:** thuộc tính nào (`transform.x/y/scale/rotation`) đang có keyframe thì kéo **ghi keyframe tại con trỏ** (giống ô số), không đổi giá trị nền; thuộc tính không có keyframe thì đổi giá trị nền.
- **Hoàn tác:** cả lượt kéo là **một** mục lịch sử / một lần Ctrl+Z (xem F-96, `coalesce`).
- **Dữ liệu:** chỉ đổi `clip.transform` (`x,y,scale,rotation`) và keyframe qua op `set_transform` / `set_keyframe` (không có op mới).
- **File mã chính:** `src/renderer/clip-geom.ts` (hình học: `boxOf`, `boxesAt`, `hit`, `corners`, `snapMove`; dùng đúng `Renderer.layerRect` nên khớp hình thật), `ui/Stage.tsx` (lớp SVG phủ, kéo, `transformOps`, hàng đợi "mới nhất thắng" `pushOps`), `actions.ts` (`beginGesture/endGesture`).
- **Cách hoạt động:** hộp chữ lấy từ `rasterizeText().blockW/blockH × scale` (không tính đệm glow/bóng); hộp video/ảnh từ kích thước media × `fit × scale`; vị trí theo neo + `x,y` (cùng công thức bộ render). Mỗi lần chuột di chuyển gửi op mới nhất (một yêu cầu bay tại một thời điểm), preview đổi theo dự án thật nên **đang kéo là thấy đúng hình sẽ xuất**.
- **Giới hạn đã biết:** đổi cỡ luôn đều (không kéo giãn riêng chiều rộng/cao; chữ dùng cỡ chữ ở bảng Thuộc tính cho kích thước khối); không có tay nắm cạnh; không sửa neo (anchor) bằng chuột; clip `gen` và âm thanh không chọn được trên khung xem; không bám vào clip khác (chỉ giữa/mép/an toàn); vùng an toàn chung chung (5%/10%), **không** phải vùng giao diện của TikTok/Reels; trong lúc phát hộp chọn ẩn.
- **Bẫy:** (1) `DOM boundingBox` của polygon SVG gồm cả nét viền → khi kiểm khung phải đọc thuộc tính `points`; (2) đổi cỡ với neo trái/phải làm tâm dịch (bộ render giữ cạnh neo) nên phải bù `x,y` để tâm đứng yên; (3) rotation dương = theo chiều kim đồng hồ (như CSS), đã đối chiếu với shader.
- **Cách kiểm:** `npm run ui-test-view` (kéo → x,y đổi đúng theo px/zoom; snap về x=0 đúng; Alt tắt bám; đổi cỡ 1,6; xoay 30° và Shift→45°; keyframe tại 1 s; kéo 2 clip; hộp ảnh = bbox điểm ảnh ±0,5 px; hộp xoay 4/4 cạnh đúng mép) và `npm test` (`clip-geom`: `hit`, `bounds`, `snapMove`).
- **Cách nâng cấp:** thêm tay nắm cạnh / kéo giãn: sửa `Stage.tsx` (thêm tay nắm + op `set_text`/`set_shape` cho kích thước khối); bám vào clip khác: thêm mục tiêu vào `snapMove`.

### F-96 Ô thông số đổi ngay khi gõ, gộp hoàn tác
- **Trạng thái:** chạy (đã kiểm)
- **Giai đoạn / cập nhật:** UX / 2026-11-18
- **Làm gì:** mọi ô số, ô màu, ô nội dung chữ trong bảng Thuộc tính ghi vào dự án **ngay khi gõ** (không cần bấm ra ngoài); cả lượt gõ là **một** bước hoàn tác.
- **Cách dùng:** gõ vào ô (X, Y, tỉ lệ, xoay, độ đục, cỡ chữ, v.v.) hoặc bấm mũi tên: preview đổi tức thì; khi đã có keyframe ở thuộc tính đó thì ghi keyframe tại con trỏ (như trước). Bấm Enter / ra ngoài chỉ kết thúc lượt gõ.
- **Cách hoạt động:** op đi qua `POST /ops` kèm trường **`coalesce`** (chuỗi ≤ 80 ký tự, chỉ giao diện/`trusted`); `Session.apply(ops, source, coalesce)` nếu cùng khoá với lần áp dụng liền trước (cùng nguồn) thì **không đẩy thêm bước hoàn tác** mà thay kết quả và thay mục lịch sử cuối. Khoá do `beginGesture()` (focus ô, bắt đầu kéo) / `endGesture()` (blur, thả chuột); `commit()` tự gắn khoá hiện hành nên mọi ô cũ không cần sửa gọi.
- **File mã chính:** `src/core/session.ts` (`apply`, `lastCoalesce`), `src/main/main.ts` (`POST /ops`), `src/renderer/actions.ts` (`beginGesture`, `endGesture`, `commit`), `ui/fields.tsx` (`NumField`, `ColorField`), `ui/Inspector.tsx` (`ContentField`, nhịp trễ 60 ms).
- **Giới hạn đã biết:** ô có `min`/`max` bị kẹp ngay khi gõ (gõ "3" trong ô min 20 sẽ tạm ghi 20 rồi "30" ghi 30); các thanh trượt màu dùng cơ chế "sống" riêng (F-92); ô Tên dự án và các ô nhập khác ngoài Thuộc tính vẫn áp dụng khi rời ô; mỗi lần gộp mất các op trung gian khỏi lịch sử (lịch sử chỉ giữ op cuối của lượt).
- **Bẫy:** ô văn bản phải **không** ghi đè nội dung đang gõ bằng bản cũ đang bay về (đã chặn bằng cờ focus); undo/redo/nạp/khôi phục snapshot xoá khoá gộp để lượt sau không dính vào bước cũ.
- **Cách kiểm:** `npm test` (`Session.apply`: 4 lần cùng khoá = +1 lịch sử, một undo, redo; khoá khác/không khoá thì tách) và `npm run ui-test-view` (gõ "25" rồi ".5" vào ô X: giá trị ghi ngay 0,25 → 0,255, +1 mục lịch sử, một Ctrl+Z về 0; ô tỉ lệ/xoay/độ đục/Y; nội dung chữ; cỡ chữ).

### F-97 Xuất timeline sang phần mềm khác
- **Trạng thái:** chạy (file xuất đã kiểm tự động; **chưa mở thử trong Premiere, DaVinci Resolve, After Effects; bản nháp CapCut chưa mở thử trong CapCut**)
- **Giai đoạn / cập nhật:** Hệ thống / 2026-11-18
- **Làm gì:** xuất timeline sang **Premiere Pro** (xmeml `.xml`), **DaVinci Resolve** (`.fcpxml` + `.xml`), **CapCut** (thư mục bản nháp `draft_content.json`), **After Effects** (script `.jsx` dựng lại comp), **EDL** (CMX3600, chỉ điểm cắt). Phần **không có tương ứng nguyên bản** (chữ gradient/animator, hình vector, hiệu ứng lớp, chỉnh màu, matte, chế độ trộn, speed ramp, đổi tốc độ ở nơi đích không có) được **vẽ sẵn thành MỘT lớp video trong suốt** `lop-phu.mov` đặt trên cùng.
- **Cách dùng (người):** nút **Xuất sang…** trên thanh trên → chọn đích, tỉ lệ (theo dự án / 9:16 / 16:9) → hộp thoại hiện ngay *bao nhiêu clip chuyển nguyên bản, bao nhiêu vào lớp phủ, các cảnh báo, mức kiểm* → **Xuất**. Job chạy nền; xong có thông báo + nút "Mở thư mục". Thư mục kết quả: `<exports>/<tên-dự-án>-<đích>-<mốc giờ>/` gồm file đích, `lop-phu.mov` (nếu cần), `HUONG-DAN.txt` (cách mở, mức kiểm, cảnh báo). Bỏ chọn "Vẽ sẵn lớp phủ" thì chữ/hình/hiệu ứng **không** có trong bản xuất (có cảnh báo). CapCut: tuỳ chọn "Chép luôn vào thư mục bản nháp CapCut" (đóng CapCut trước).
- **Cách dùng (AI/MCP):** tool `export_timeline {target, aspect?, overlay?}` → `job_id`; `job_status` trả `result.out_dir`, `files`, `warnings`, `verified`, `overlay`. AI **không** chọn được đường dẫn ra và **không** cài vào CapCut (chỉ giao diện/`trusted` dùng `out`, `install`); không sửa dự án nên không cần duyệt. Route: `POST /export_timeline`, `GET /export_targets` (có sẵn / thiếu khuôn CapCut + mức kiểm).
- **Cái gì chuyển nguyên bản:** clip video + ảnh (cắt `in/duration`, vị trí, tỉ lệ, xoay, độ đục, **keyframe** của x/y/scale/rotation/opacity — lấy mẫu tại mọi mốc keyframe nên đúng cả khi neo lệch), clip âm thanh + tiếng của clip video (âm lượng cố định). CapCut còn nhận đổi tốc độ cố định.
- **Cái gì KHÔNG:** chữ/hình/hiệu ứng/chỉnh màu/matte/blend/speed ramp (→ lớp phủ, không sửa được ở đích); đường cong ease/Bezier (đích nhận tuyến tính → cảnh báo); keyframe âm lượng; EDL không có biến đổi; FCPXML chỉ có giá trị tĩnh của biến đổi (keyframe có ở `.xml`); thứ tự chồng lớp: lớp phủ luôn trên cùng (cảnh báo khi có clip video nằm trên clip chữ cùng lúc); clip đổi tốc độ (ở đích không có) bị vẽ vào lớp phủ **không kèm tiếng** (cảnh báo).
- **File mã chính:** `src/core/export-plan.ts` (phân loại nguyên bản/lớp phủ, `buildPlan`, `mediaPlacement`, cảnh báo), `src/core/export-writers.ts` (`writeXmeml`, `writeFcpxml`, `writeEdl`, `writeAeJsx`), `src/main/export-capcut.ts` (bản nháp CapCut theo khuôn + `findCapcutTemplate`, `installCapcutDraft`), `src/main/main.ts` (`startTimelineExport`, `/export_timeline`, `/export_targets`), `src/main/exporter.ts` (`startOverlayFfmpeg`), `src/renderer/engine.ts` (`doOverlayExport`), `src/render/renderer.ts` (`FrameOpts.bg`), `src/renderer/ui/ExportDialog.tsx`, `src/mcp/server.ts`.
- **Cách hoạt động (lớp phủ):** dự án chỉ giữ các clip "vào lớp phủ" (clip còn lại `disabled`); mỗi khung trong khoảng có clip phủ được vẽ **hai lần** (nền đen, nền trắng) rồi tách alpha: `a = 1 − (trắng − đen)`, màu thẳng = `đen / a`; khung ngoài khoảng gửi rỗng (trong suốt, không tốn vẽ). Ra `.mov` codec `qtrle` (có alpha, không nén mất) qua ffmpeg. CapCut / Premiere / Resolve / AE đều nhận loại file này (CapCut đã được người dùng thử với webm, mov qtrle, mov png). Đo: lớp phủ phủ lên nền đen **khớp** `preview_frame` chỉ có chữ, sai số trung bình 0,001/255, lớn nhất 1/255.
- **CapCut:** cấu trúc bản nháp không có tài liệu công khai và đổi theo phiên bản → app **lấy khuôn từ một bản nháp CapCut thật của người dùng** (mới nhất đọc được, có cả video và âm thanh, JSON thường) trong `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft` (đổi bằng biến `TOOL_EDIT_CAPCUT_DRAFTS`). Không có khuôn → báo lỗi rõ ràng, không tạo file hỏng. Đây là bản chuyển viết lại bằng TypeScript từ bộ chuyển tay `output/f20-set-qua-2011/capcut/tedit_to_capcut.py` (đã thêm: vị trí/tỉ lệ/xoay/độ đục tĩnh, keyframe xoay + độ đục, đổi tốc độ, ảnh, nhiều track tuỳ ý, không còn cứng `c5`, `v1/v2`, hay âm lượng nhạc 0,06).
- **Mức kiểm đã làm:** (1) `npm test`: 11 test (kế hoạch, EDL timecode, xmeml/FCPXML cân bằng thẻ + escape, `.jsx` qua `vm.Script`, gộp hoàn tác, hình học khung chọn); (2) `e2e-export` 25 kiểm bằng file thật: XML hợp lệ bằng parser Python, lớp phủ `qtrle` 1080×1920 đủ 180 khung, alpha = 0 ngoài khoảng chữ, khớp preview, bản nháp CapCut đọc lại được (track, keyframe `KFTypeScaleX`, lớp phủ, độ dài 6 s); (3) `ui-test-export`. **Chưa kiểm:** mở thật trong Premiere Pro / DaVinci Resolve / After Effects (không có trên máy kiểm hoặc không phản hồi) và mở bản nháp mới này trong CapCut. Các điểm **đoán** cần xem lần đầu mở: đơn vị `center` của xmeml (đang dùng tỉ lệ khung, 0 = giữa, y xuống dương) và `when` của keyframe (đang dùng khung tính từ đầu clip); đơn vị `position` của FCPXML (đang dùng % chiều cao khung, y lên dương) và chiều `rotation`; hướng xoay của CapCut. Kết quả mở thật nên ghi vào đây và vào `exportVerified` (`main.ts`) để dòng "Mức kiểm" trong hộp thoại và `HUONG-DAN.txt` đổi theo.
- **Giới hạn đã biết:** tốc độ ve lớp phủ ~10–15 khung/s (đọc về 2 lần/khung, ~8 MB/khung qua IPC) nên video 2 phút có chữ suốt có thể mất vài phút; `.mov` qtrle khá lớn (vài chục MB/phút khi chữ ít, hàng trăm MB nếu phủ kín); alpha tính ở không gian đã mã hoá sRGB nên cạnh mờ có thể lệch rất nhẹ so với Tool Edit khi đích trộn khác; chỉ Windows; chỉ một job xuất (video hoặc timeline) tại một thời điểm; media phải còn ở đường dẫn gốc (file xuất dùng đường dẫn tuyệt đối, không sao chép media).
- **Bẫy:** (1) CapCut chỉ thấy bản nháp mới sau khi **đóng và mở lại** CapCut; (2) xmeml cần `<file id>` dùng lại cho cùng file, nếu không Premiere nhân đôi media; (3) script AE chỉ chứa ASCII (chuỗi Unicode đã escape `\uXXXX`) vì ExtendScript đọc file theo mã hoá hệ thống, và **không có hộp thoại** (trả chuỗi kết quả); (4) `safeName` bỏ dấu tiếng Việt khỏi tên thư mục/file.
- **Cách nâng cấp:** thêm đích mới → thêm vào `TARGETS` (`export-plan.ts`), viết writer thuần trong `export-writers.ts`, nối vào `writeTimelineFiles` (`main.ts`), thêm test; thêm loại hiệu ứng chuyển được nguyên bản → sửa `nonNativeReason`.
- **Phụ thuộc:** F-11 (xuất, ffmpeg), F-06 (đường dẫn media), F-60/F-63 (hiệu ứng/hình), F-20 (chữ).

### F-94 Chuyển cảnh
- **Là gì:** thuộc tính `transition: {kind, duration}` trên clip, tác dụng ở ĐẦU clip. Nếu có clip liền trước trên cùng track (sát nhau, lệch < 0,1 ms) thì chuyển từ clip đó sang clip này: clip trước kéo dài thêm phần đuôi (nguồn còn thì chạy tiếp, hết thì giữ khung cuối). Không có clip trước thì clip này vào từ nền / lớp bên dưới. Dùng được cho video, ảnh, chữ, hình, biểu đồ. Thời lượng 0,1–5 giây và không dài hơn clip.
- **18 kiểu:** `dissolve`, `fadeblack`, `fadewhite`, `slideleft/right/up/down`, `wipeleft/right/up/down`, `zoomin`, `zoomout`, `blur`, `spin`, `flip` (lật 3D), `cube` (khối 3D), `glitch`. Không có shader riêng: mỗi kiểu là bộ tham số (độ đục, dịch, tỉ lệ, xoay, xoay 3D, mờ, quét) áp lên lớp ra và lớp vào (`core/transition.ts`, `engine.layersAt`), nên xem trước và xuất đi chung một đường GPU. Tiến độ làm mượt (ease in-out bậc ba).
- **Dùng:** chọn clip, mục "Chuyển cảnh vào" ở tab Thuộc tính (kiểu + thời lượng); clip có vạch sáng ở đầu. Op `set_transition` (null = gỡ), công cụ MCP `set_transition`. Xuất sang Premiere/DaVinci/AE/CapCut: clip có chuyển cảnh bị tính là "lớp phủ" (vẽ sẵn), phần đuôi của clip trước không có trong lớp phủ nên chỉ còn đoạn vào.
- **Giới hạn:** âm thanh chưa chéo mờ (clip trước dừng đúng chỗ cắt); chỉ chuyển cảnh VÀO (chưa có "ra" riêng); chuyển cảnh với lớp "nền sinh tự động" (gen) không có tác dụng vì lớp đó không có biến đổi.
- **Kiểm (e2e-transition, điểm ảnh thật):** p=0 giống clip trước, p=1 giống clip sau; hòa tan 50/50 đúng trong ánh sáng tuyến tính (sai khác 0,05); trượt, quét đúng cột/hàng (sai khác 0,00); mờ qua đen đúng độ đục; lật 3D đúng hình học phối cảnh; cả 18 kiểu vẽ được; vào từ nền; xuất MP4 khớp xem trước.

### F-95 Xoay 3D (2.5D)
- **Là gì:** `transform.rotX`, `rotY` (độ) và `persp` (khoảng cách máy quay, bội số cạnh dài khung, mặc định 1,2; nhỏ = méo mạnh) cho MỌI loại clip (video, ảnh, chữ, hình, biểu đồ). Shader đỉnh xoay quanh trục Y rồi X, chia w phối cảnh và nhân lại w ở clip-space để GPU nội suy uv ĐÚNG phối cảnh (không méo kiểu affine).
- **Dùng:** Thuộc tính > Biến đổi: "Xoay 3D ngang/dọc (độ)" (có nút keyframe); ô "Phối cảnh" hiện khi có xoay. rotX = rotY = 0 cho kết quả giống hệt như trước.
- **Kiểm (e2e-transition):** cạnh trái/phải/trên/dưới của hình sau xoay 60°/50° khớp công thức hình học (lệch ≤ 0,5% khung), phối cảnh xa (persp 3) đúng, keyframe xoay 3D thu hẹp hình.
- **Giới hạn:** khung chọn bằng chuột (gizmo) vẫn vẽ theo hình chữ nhật chưa xoay; xoay quanh tâm clip (chưa có điểm neo xoay riêng); không có che khuất theo độ sâu giữa các lớp (chỉ thứ tự lớp).

### F-96 Clip biểu đồ / số đếm
- **Là gì:** nguồn clip `{type:'chart', chart}`: `bar` (cột), `hbar` (cột ngang), `line` (đường), `pie` (tròn), `donut` (vành khuyên), `number` (số đếm từ `from` tới giá trị đích). Dữ liệu `data:[{label,value,color?}]` (1–24 mục), tiêu đề, tiền tố/hậu tố, số lẻ, trục tối đa, kích thước (px @ cạnh ngắn 1080), nền thẻ + độ đục + bo góc, bảng màu, font, lưới, nhãn giá trị. Hoạt họa vào theo `delay`, `duration`, `stagger` (so le giữa các cột), `ease`; sau đó giữ hình cuối. Số định dạng kiểu Việt (1.250,5), không phụ thuộc locale máy.
- **Dùng:** thanh trên "+ Biểu đồ" (đặt tại con trỏ) rồi chỉnh ở Thuộc tính > Biểu đồ (nhập dữ liệu mỗi dòng "Nhãn: giá trị"). Op `set_chart`; MCP `add_chart` (tạo) và `propose_ops` với `set_chart` (sửa). Vẽ bằng Canvas 2D (`render/chart-raster.ts`) rồi đi chung đường GPU như chữ/hình: chuyển cảnh, 3D, hiệu ứng lớp, kính mờ đều áp lên được.
- **Kiểm:** unit test (định dạng số, trục đẹp, hoạt họa, validate, merge); e2e-chart (điểm ảnh): cột B (100) cao gấp đôi cột A (50) đúng 2,00; cột ngang 3,98 (≈ 4); diện tích tròn 2,99 (≈ 3); đang hoạt họa (50%) cột cao 0,50 và tròn quét 0,50; vành khuyên rỗng giữa; đường vẽ dần; số đếm đổi rồi đứng yên; không đổi hình sau khi xong.
- **Giới hạn:** không keyframe được các số bên trong biểu đồ (chỉ biến đổi/hiệu ứng của clip); chưa có biểu đồ nhiều chuỗi / xếp chồng / trục kép; font phải có trong máy (chưa kiểm glyph tiếng Việt như clip chữ); chưa xuất sang phần mềm khác (tính là lớp phủ).

### F-97 Kính mờ và mẫu dựng sẵn
- **Kính mờ:** hiệu ứng lớp `backdrop {radius}` (tab Thuộc tính > Hiệu ứng > "Kính mờ"): chụp mọi thứ đang nằm DƯỚI clip, làm mờ, rồi thay vào đúng hình dạng clip. Hình vector dùng mặt nạ đầy đủ nên kính mờ HOÀN TOÀN trong hình dù độ đục tô thấp (kính trắng 12%); độ đục clip = 0 thì kính biến mất; bo góc, chuyển cảnh, xoay 3D đều theo. Dùng chung đường mờ tách hai pass có sẵn (không thêm bộ nhớ lớn). Kiểm (e2e-glass): độ sắc nét nền giảm 216 → 14, ngoài hình không đổi (sai khác 0,00), cắt đúng mép, bo góc lớn thì góc ngoài sắc nét, bán kính lớn mờ hơn.
- **Mẫu dựng sẵn (8 mẫu):** Thẻ kính, Tên + chức danh (lower third), Tiêu đề lớn (chữ gradient), Số liệu nổi bật, Nút kêu gọi, Thẻ giá, Biểu đồ cột, Thông báo kiểu ứng dụng. Mỗi mẫu là DỮ LIỆU (không phải mã): danh sách clip (hình, chữ, biểu đồ) + keyframe + biến thay được (chữ, số, màu, dữ liệu). Hộp thoại "Mẫu" trên thanh trên: ảnh xem trước vẽ thật trên nền thanh màu, điền biến, "Thêm vào timeline tại con trỏ". Mỗi lần thêm sinh các `add_clip` cùng MỘT nhóm (clip ghép), tự chọn track trống (thiếu thì tạo mới, giữ đúng thứ tự lớp), một bước hoàn tác. Vị trí và keyframe x, y tính bằng px @ 1080 nên đúng cả 9:16 và 16:9. MCP: `list_templates`, `add_template` (`template_id`, `start`, `vars`).
- **Kiểm:** unit test mẫu (mọi mẫu hợp lệ, thứ tự lớp, dùng lại track, biến, đổi px sang tỉ lệ cho 9:16 và 16:9); ui-test-motion (hộp thoại, thêm mẫu, nhóm, hoàn tác); mcp-test (118/118).
- **Giới hạn:** chỉ 8 mẫu, người dùng chưa tự lưu mẫu của mình; mẫu dùng font mặc định Segoe UI; ký tự ✓ trong thông báo phụ thuộc font; mẫu chưa có âm thanh/SFX.
