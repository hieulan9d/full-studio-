# KẾ HOẠCH TOOL EDIT

Phiên bản kế hoạch: **0.1** (2026-11-16, bản thảo để thảo luận). Cập nhật cột "Trạng thái" ở mục 5 khi làm.
Quy ước nhãn: [thiết kế] / [chưa kiểm] / [có], như `HUONG-DAN-AI.md`.

---

## 1. Mục tiêu và tiêu chí thành công

**Mục tiêu:** một phần mềm dựng video chạy mượt trên máy RTX 3060 Laptop, AI điều khiển được qua MCP, người chỉnh tay được, thay dần After Effects trong Full Studio.

| # | Tiêu chí thành công | Cách đo |
|---|---|---|
| T1 | Preview 1080×1920 phát mượt (mục tiêu 30fps) với 3 track video + chữ + phụ đề | Đo fps trong app, so với AE cùng cảnh |
| T2 | Xuất video 1 phút 1080×1920 nhanh hơn thời gian thực khi dùng NVENC | Đo thời gian render |
| T3 | AI (Claude, Gemini, GPT) dựng một video hoàn chỉnh chỉ bằng MCP, người duyệt | Chạy thử từng mô hình |
| T4 | Dựng lại **một video SaaS và một video talking head** của hai kit, người chấm đạt | So với bản AE (giai đoạn 6) |
| T5 | Không có hộp thoại chặn, không treo khi AI gọi liên tục | Chạy 100 lệnh liên tiếp |
| T6 | Mỗi chức năng có mục trong `CHUC-NANG.md` đã kiểm | Rà soát cuối mỗi giai đoạn |

## 2. Phạm vi

**Trong phạm vi (đã chốt):** dựng/cắt, chữ gradient + animator, keyframe, phụ đề từng từ, SFX/nhạc, tách nền, speed ramp, chỉnh màu + scope, hiệu ứng của hai kit, xuất 9:16 và 16:9, MCP.

**Ngoài phạm vi (ít nhất đến hết giai đoạn 6):** HDR, 3D thật, tracking nâng cao, khử nhiễu, hiệu ứng hạt phức tạp, làm việc cộng tác qua mạng, bản Mac, plugin bên thứ ba, bán/phát hành.

**Nguyên tắc chống phình:** chỉ thêm hiệu ứng khi kit của người dùng **thực sự dùng** (kiểm kê ở giai đoạn 0).

## 3. Kiến trúc [thiết kế]

```
              ┌──────────────────────────────────────────┐
              │   Tool Edit daemon (Electron main, Node)  │
              │   • giữ trạng thái dự án + lịch sử op     │
              │   • điều phối job (render, whisper, matte)│
              │   • HTTP/WebSocket nội bộ (127.0.0.1)     │
              └──────┬───────────────┬──────────────┬─────┘
                     │               │              │
          UI (renderer)        MCP server       Worker (tiến trình riêng)
     timeline, preview,    stdio + HTTP,     ffmpeg, whisper, ONNX matting,
     inspector, scope     dùng được cho      audio analysis
     (WebGPU)             Claude/Gemini/GPT
```

Nguyên tắc:
- **Một nguồn sự thật:** file dự án JSON do daemon giữ. UI và MCP đều là client.
- **Render lõi dùng chung:** preview và xuất file chạy cùng một bộ render WebGPU (xuất chạy trong cửa sổ Electron ẩn, seek từng frame, đẩy khung vào ffmpeg NVENC). Nhờ đó preview giống file xuất.
- **Mọi thay đổi là op:** `apply_ops` nhận danh sách op, atomic, có hoàn tác, ghi nguồn (`human` hoặc `ai:<tên>`).
- **Đề xuất của AI:** op từ AI vào hàng `proposals`, UI hiện diff, người duyệt rồi mới áp dụng.
- **Float pipeline:** ảnh nội bộ RGBA16F, chỉ ép về 8/10-bit ở xuất, có dither. Input Transform → không gian làm việc → Output Transform (Rec.709).

Sơ đồ thư mục mã [thiết kế], sẽ tạo dần, **không tạo thư mục rỗng**:

```
tool-edit/
  src/
    core/        mô hình dự án, op, lịch sử, validator schema, preset
    render/      WebGPU: pipeline, shader hiệu ứng, văn bản, màu, scope
    media/       ffprobe, proxy, giải mã, cache khung
    audio/       waveform, trộn, duck, chuẩn loudness
    jobs/        hàng đợi job, worker (ffmpeg, whisper, matting)
    mcp/         MCP server, định nghĩa tool, schema
    app/         giao diện (React): timeline, preview, inspector, scope
  test/          test tự động (ramp, round-trip màu, schema, render ảnh mẫu)
  presets/       preset chữ/hiệu ứng/tông màu chuyển từ kit
```

## 4. Mô hình dự án (JSON) [thiết kế]

Schema đầy đủ viết ở giai đoạn 0 (`src/core/schema`). Khung chính:

- `project`: tên, fps, kích thước (hai bản 9:16 và 16:9), không gian màu, phiên bản schema.
- `media[]`: id, đường dẫn, loại, thông số (ffprobe), proxy, matte (nếu có), transcript (nếu có).
- `tracks[]`: video, âm thanh, chữ, hiệu ứng điều chỉnh.
- `clips[]`: id, track, `start`/`duration`, nguồn, `trim`, transform, `effects[]`, `keyframes{}`, `timeRemap` (speed ramp).
- `text`: nội dung, font, fill (màu/gradient), stroke, shadow, glow, animator theo ký tự/từ.
- `captions`: danh sách từ có mốc giờ, style.
- `grade`: tham số chỉnh màu theo clip hoặc track.
- `markers`: mốc nhịp, mốc cắt, SFX cue.
- `proposals[]`: bộ đề xuất chờ duyệt.
- `history`: nhật ký op (ai sửa, khi nào).

Quy tắc: schema có **số phiên bản** và công cụ **di chuyển** (migrate). Đổi schema phải ghi vào `NHAT-KY.md`.

## 5. Các giai đoạn

Cỡ việc: S (nhỏ), M (vừa), L (lớn). Không hứa số ngày; đo lại sau giai đoạn 0.
Cột "Trạng thái": `chưa làm` / `đang làm` / `xong (đã kiểm)`.

### Giai đoạn 0: Nền móng và spike (cỡ S) | Trạng thái: xong (đã kiểm), còn 2 mục chưa đo: so với AE và xem cửa sổ bằng mắt
Việc:
1. **Kiểm kê hiệu ứng** trong `../phong-cach/*/lib/saas-lib.jsx`, `th-lib.jsx` (và `ui-dashboard.jsx`): liệt kê mọi hiệu ứng/thao tác AE đang dùng, ghi vào `KIEM-KE-HIEU-UNG.md`. Đây là danh sách tối thiểu cho giai đoạn 6.
2. Dựng khung Electron + TypeScript + Vite + WebGPU. Ép chạy bằng RTX; app báo tên GPU đang dùng.
3. Một khung RGBA16F 1080×1920 vẽ bằng WebGPU, Output Transform Rec.709, xuất PNG.
4. Schema dự án v0 + validator + op `apply_ops` tối thiểu.
5. `preview_frame` qua CLI/HTTP.
6. **Benchmark** so với AE: thời gian dựng một khung và phát preview.

Tiêu chí xong: app mở bằng RTX; ramp 0→1023 ra đường thẳng; round-trip màu đúng; `preview_frame` trả PNG; có số benchmark ghi vào `NHAT-KY.md`; nếu WebGPU không ổn trên máy này thì **dừng và thảo luận phương án** (WebGL2 hoặc nền khác).

### Giai đoạn 1: Lõi dựng + MCP v1 (cỡ L) | Trạng thái: **xong (đã kiểm)** — 1A lõi + 1B giao diện (2026-11-16)
Việc đã làm (chi tiết và số đo ở `CHUC-NANG.md`, `NHAT-KY.md`):
- **1A (lõi):** schema v1 + op, nhập media + cache NVENC, giải mã WebCodecs, ghép lớp, xuất NVENC (41–52 khung/s), MCP, hàng đề xuất.
- **1B (giao diện):** giao diện React kiểu CapCut (kho media, xem trước, timeline kéo/trim/snap/cắt/xoá/zoom, bảng thuộc tính), phát có tiếng (đồng hồ âm thanh) + waveform, lưu/mở/tự lưu (`.tedit`), ảnh tĩnh làm media, snapshot/khôi phục, tab duyệt đề xuất (diff, xem thử trên timeline), bảo mật HTTP (đường "áp dụng" chỉ giao diện gọi được), MCP 12 tool.
- **Kiểm:** 28 test đơn vị, selftest GPU, e2e 38, MCP 23, giao diện thật (Playwright qua CDP) 52, bảo mật 14.

**Còn nợ của giai đoạn 1 (không chặn sang giai đoạn 2):**
- MCP chưa thử với Claude / Gemini / GPT thật (`THU-MCP.md`).
- Chưa bấm tay các hộp thoại chọn file của hệ điều hành (Nhập/Lưu/Mở); phần lõi đã kiểm bằng API.
- Chưa kiểm bằng tai việc đồng bộ âm hình (chỉ kiểm đồng hồ và số khung).
- Chưa có: gizmo kéo trực tiếp trên khung hình, chọn bằng khung kéo, ảnh thu nhỏ trên clip, H.265, liên kết lại media bị mất, token HTTP.

### Giai đoạn 2: Chữ và keyframe (cỡ L) | Trạng thái: **xong (đã kiểm)** — 2026-11-16
Đã làm (chi tiết và số đo ở `CHUC-NANG.md` F-20 đến F-29, `NHAT-KY.md`):
1. Công cụ chữ + **kiểm glyph tiếng Việt từ cmap thật** của font (cảnh báo khi thiếu dấu).
2. **Fill gradient** (đơn sắc, tuyến tính, tròn, conic; điểm màu nhiều; animate bằng `fill.offset/angle`), viền, bóng, glow.
3. **Animator** theo ký tự/từ/dòng (9 kiểu).
4. **Hệ keyframe** (transform, thuộc tính chữ, âm lượng), nút thoi kiểu CapCut, ease preset, **graph editor bezier** (kéo điểm, hai tay nắm, Ease In / Ease Out / Easy Ease nhanh), sao chép/dán keyframe.
5. **8 preset** (4 lấy số đo từ kit talking-head), **neo vị trí** 9:16 ↔ 16:9 (cỡ chữ và lề theo cạnh ngắn).
6. MCP: `add_text`, `set_keyframes`, `apply_preset`, `list_presets`, `list_fonts` (đều thành đề xuất chờ duyệt).

Tiêu chí xong: "tái tạo được 3 kiểu chữ tiêu biểu từ kit" **đạt** (từ khoá gradient, số neon, phụ đề từng từ: số đo đúng kit, render đúng); "keyframe chạy đúng ở preview và file xuất" **đạt** (MAE ≤ 0,51 trên chữ + keyframe + animator ở cả 9:16 và 16:9; âm lượng xuất đúng).

**Còn nợ của giai đoạn 2:**
- Chưa dựng lại **một video SaaS/talking head hoàn chỉnh** để người dùng chấm so với After Effects (thuộc giai đoạn 6).
- Chưa có: nạp font riêng của dự án, chữ trên đường cong, glow dạng bloom GPU, tay nắm "ảnh hưởng vào/ra" kiểu AE, bố cục riêng từng tỉ lệ, hiệu ứng quét sáng/light leak/viền nở.
- Ease thuộc đoạn đi ra từ keyframe (kiểu CSS), cắt đoạn đã bezier chỉ xấp xỉ hình dáng nửa sau.
- Preset dùng font đủ dấu (Segoe UI) thay font gốc của kit (thiếu dấu tiếng Việt).

### Giai đoạn 3: Phụ đề và âm thanh (cỡ M) | Trạng thái: **xong 2026-11-16** (còn nợ: đo tiếng Việt thật)
Việc:
1. Job whisper (faster-whisper, GPU) mức từng từ; **thử tiếng Việt thật**, ghi độ chính xác; cân nhắc PhoWhisper nếu kém [chưa kiểm].
2. Phụ đề từng từ sáng lên, các style; sửa transcript; dựng theo transcript (xoá chữ = xoá đoạn); cắt khoảng lặng.
3. Track SFX/nhạc: kho có tag, **SFX gắn theo sự kiện**, chờ duyệt; duck nhạc dưới giọng; chuẩn loudness.
4. Marker nhịp nhạc.

Tiêu chí xong: video tiếng Việt có phụ đề đúng mốc; SFX chỉ được áp dụng sau khi người duyệt; `qc_check` báo glyph và loudness.

**Kết quả (F-30..F-36):** SFX chỉ áp dụng sau duyệt (duyệt **từng mục**), `qc_check` báo glyph/tràn khung/loudness/phủ lời: đạt. Phụ đề đúng mốc: đạt với tiếng Anh (WER 0 %) và chữ Việt gõ tay (đúng dấu); **tiếng Việt nhận dạng thật chưa đo** → nợ: chạy `node scripts/wer-test.mjs <clip> <văn-bản-đúng.txt> vi` trên một clip tiếng Việt; WER cao thì thử PhoWhisper (hỏi trước khi tải). Nợ khác: limiter cho loudness, ngắt dòng phụ đề theo độ rộng thật, nhịp gấp đôi/nửa, nghe thử bằng tai.

### Giai đoạn 4: Tách nền và speed ramp (cỡ M) | Trạng thái: **xong 2026-11-17** (nợ: RIFE, plugin matting, nghe thử bằng tai)
Việc:
1. **Giao diện plugin matting** để thay mô hình; bắt đầu RVM (kiểm giấy phép trước, hỏi người dùng), dự phòng BiRefNet/SAM2 [chưa kiểm].
2. Matte lưu thành alpha dùng lại; làm mịn viền; chữ sau lưng người.
3. Time remap theo keyframe + đường cong bezier; preset (hero time, bullet time); kéo giãn âm giữ cao độ hoặc tắt tiếng; nội suy khung (RIFE) khi chậm [chưa kiểm]; bám nhịp nhạc.

Tiêu chí xong: clip talking head tách nền mượt, không nhấp nháy viền; speed ramp đúng ở preview và xuất.

**Kết quả (F-41..F-43):** RVM (ONNX) tách nền clip talking head thật; ghép matte, chữ sau lưng người, speed ramp đúng ở preview và xuất đều đạt kiểm điểm ảnh. **Chưa đạt/chưa làm:** nội suy RIFE (đang trộn khung); giao diện plugin matting (mới có RVM cố định); bám nhịp nhạc; độ mượt viền chưa xem bằng mắt trên nhiều clip; matte tham chiếu của kit cũng do RVM nên không phải thước đo độc lập.

### Giai đoạn 5: Chỉnh màu và scope (cỡ L) | Trạng thái: **xong lõi 2026-11-17** (nợ: qualifier, power window, log wheels, Canon/Apple Log, keyframe màu)
Việc:
1. Primary: lift/gamma/gain/offset, exposure, contrast + pivot, saturation, nhiệt độ/tint; gộp thành một 3D LUT.
2. Input Transform cho log (S-Log3, V-Log, C-Log, Apple Log) [chưa kiểm]; nhập/xuất LUT `.cube`.
3. **Scope bằng compute shader:** waveform, RGB parade, vectorscope (đường skin tone), histogram, false color, cảnh báo clipping.
4. Curves, log wheels, qualifier HSL, power window; so khớp màu giữa clip.
5. MCP: `grade_get/set`, `analyze_frame` (số), `scope_image`, `match_color`, `apply_lut`; **mọi thay đổi màu chờ duyệt**.
6. Kiểm chuẩn bằng ramp, thanh màu tổng hợp, round-trip.

Tiêu chí xong: scope đúng trên ramp; chỉnh màu không làm giảm fps rõ rệt; AI đọc được `analyze_frame` và đề xuất chỉnh.

**Kết quả (F-50..F-54):** scope đúng trên ramp và thanh màu (có đáp án biết trước); chỉnh màu không làm chậm xuất (+3 %); `analyze_frame`, `scope_image`, `grade_set`, `match_color`, `apply_lut` chạy, mọi thay đổi chờ duyệt. **Chưa đạt/chưa làm:** qualifier HSL, power window, log wheels; Canon Log, Apple Log; chuyển gam màu; chưa so với DaVinci bằng clip thật; màu chưa xem bằng mắt trên màn hình chuẩn.

### Giai đoạn 6: Thay After Effects (cỡ L) | Trạng thái: **đang làm** (engine hiệu ứng + dựng lại Foodtage lần 1 xong 2026-11-17; chờ người dùng chấm; chưa làm SaaS orbiq)
Việc:
1. Chuyển hiệu ứng trong `KIEM-KE-HIEU-UNG.md` thành preset/shader (glow, kính, parallax, vv.).
2. **Dựng lại** một video SaaS (mẫu `orbiq`) và một talking head (mẫu `foodtage`), ở cả 9:16 và 16:9 khi hợp.
3. Cập nhật subagent `edit` gọi Tool Edit thay cho AE (sau khi người dùng đồng ý).
4. Người dùng chấm so với bản AE; sửa lỗi.

Tiêu chí xong: T4. Chỉ khi đạt thì tuyên bố **thay AE**, và ghi vào `../HUONG-DAN-AI.md`.

**Tiến độ 2026-11-17:** việc 1 làm một phần (blur, glow, bóng, wipe, vignette, bo góc, crop, blend, hình vector; chưa noise/grid/gradient 4 màu/tint/edge/motion blur/2.5D/kính). Việc 2: **Foodtage dựng lại lần 1** (`scripts/build-foodtage.mjs`), còn khác (rings 2.5D, tia sét, strokeUp, font thay thế trong bản AE...), **SaaS orbiq chưa làm**. Việc 3 (subagent `edit`) **chưa làm, cần người dùng đồng ý**. Việc 4: **chờ người dùng chấm**.

### Giai đoạn 7: Đánh bóng (cỡ M) | Trạng thái: chưa làm
Hiệu năng, cache, chống rò RAM (máy 16GB), trình cài đặt, tài liệu, test hồi quy ảnh, dọn nợ kỹ thuật.

## 6. Quy trình làm việc mỗi tính năng

1. Đọc mục liên quan trong `CHUC-NANG.md` và `NHAT-KY.md`.
2. Viết/bổ sung test hoặc quy trình kiểm tay **trước** khi coi là xong.
3. Làm, chạy kiểm bằng số/ảnh.
4. **Cập nhật `CHUC-NANG.md`** (đủ các trường ở mẫu) và **`NHAT-KY.md`**.
5. Đổi nhãn trạng thái ở mục 5 nếu xong giai đoạn.
6. Báo người dùng: đã làm gì, đã kiểm gì, chưa kiểm gì.

## 7. Rủi ro và cách giảm

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| WebGPU trong Electron không ổn trên máy này | Cao | Spike giai đoạn 0; có phương án WebGL2 |
| Laptop chọn nhầm Intel Iris | Cao | Ép RTX, app tự báo GPU đang dùng |
| Phạm vi quá lớn (AE + CapCut) | Cao | Chỉ làm cái kit dùng thật; chia giai đoạn có tiêu chí xong |
| Quản lý màu sai âm thầm | Trung bình | Pipeline float từ ngày đầu; test ramp + round-trip |
| Giải mã/đồng bộ âm hình lệch | Trung bình | Proxy; đo trôi; test A/V sync |
| RAM 16GB, CPU 4 nhân | Trung bình | Cache có trần, đẩy việc nặng sang GPU/NVENC |
| Whisper tiếng Việt kém | Trung bình | Thử thật sớm; PhoWhisper; cho sửa tay |
| Giấy phép mô hình (RVM GPL, voice-studio AGPL) | Trung bình | Hỏi người dùng; plugin thay được; chưa phát hành |
| Gemini/GPT kén schema MCP | Trung bình | Schema đơn giản; thử cả 3 từ giai đoạn 1 |
| AI sửa phá dự án | Trung bình | Đề xuất chờ duyệt, snapshot, hoàn tác |
| Khoảng trống kiến thức giữa các phiên | Cao | Luật cập nhật `CHUC-NANG.md`, `NHAT-KY.md` |

## 8. Câu hỏi còn mở (chưa chốt, cần người dùng)

- Mô hình tách nền: dùng RVM nội bộ (mượt nhất, GPL) hay chọn mô hình giấy phép sạch ngay từ đầu?
- Tên chính thức: đang dùng **Tool Edit**. Tên gói MCP đề xuất `tool-edit` (cần đồng ý).
- Có đẩy mã lên GitHub không, và khi nào (repo hiện public)?
- Có cần nhập/xuất **bản nháp CapCut** để chuyển qua lại không (hiện có `vf capcut`)?
- Giao diện ngôn ngữ: tiếng Việt hoàn toàn hay song ngữ?
- Phím tắt: giống CapCut hay giống Premiere/DaVinci?
