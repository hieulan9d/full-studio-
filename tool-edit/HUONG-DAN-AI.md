# TOOL EDIT: ĐỌC FILE NÀY TRƯỚC TIÊN

Bạn là AI làm việc trong **Tool Edit**, phần mềm dựng video nằm trong dự án Full Studio.
Trả lời người dùng bằng **tiếng Việt**, ngắn gọn, nói rõ đã làm gì và còn gì chưa kiểm.

Quy ước độ tin cậy (giống `../HUONG-DAN-AI.md`):
- **[có]** = đã thấy trong mã hoặc đã chạy thật trong thư mục này.
- **[thiết kế]** = mục tiêu đã chốt, **chưa triển khai**. Đừng coi là đã có.
- **[chưa kiểm]** = ý tưởng hoặc suy luận, cần thử trước khi tin.

Trạng thái hiện tại: **xong giai đoạn 0, 1, 2, 3, 4, lõi của 5 và engine của 6**: lõi + giao diện CapCut (media, timeline, phát có tiếng, lưu/mở/tự lưu, xuất NVENC 9:16 và 16:9, snapshot, duyệt đề xuất AI ngay trong giao diện) + **chữ** (gradient, viền, bóng, glow, animator, kiểm glyph tiếng Việt, 8 preset từ kit, neo vị trí 9:16 ↔ 16:9) + **keyframe** (nút thoi ◇, graph editor Bezier, Ease In/Out, sao chép/dán) + **phụ đề từng từ** (whisper GPU, karaoke), sửa lời thoại, cắt theo lời/khoảng lặng, **kho SFX/nhạc có tag**, SFX theo sự kiện **chờ duyệt từng mục**, duck nhạc, chuẩn −14 LUFS, marker nhịp, `qc_check` + **tách nền RVM (GPU) + chữ sau lưng người + speed ramp** (tốc độ keyframe bezier, giữ cao độ khi xuất) + **chỉnh màu** (phơi sáng, nhiệt độ, tương phản, bánh màu lift/gamma/gain/offset, đường cong, log S-Log3/V-Log, LUT `.cube`, gộp thành LUT 3D trên GPU) + **scope** (waveform, parade, vectorscope, histogram, màu giả, cảnh báo clip) + **hiệu ứng lớp** (blur, glow, bóng, bo góc, crop, vignette, wipe), **chế độ trộn** (add/screen/multiply), **hình vector** + MCP 47 tool; Foodtage đã dựng lại lần 1 bằng Tool Edit (`scripts/build-foodtage.mjs`), **chờ chấm so với bản AE, chưa tuyên bố thay AE**. **Chưa đo:** whisper tiếng Việt thật (`scripts/wer-test.mjs`). **Chưa có**: qualifier HSL, power window, log wheels, Canon/Apple Log, nội suy khung RIFE (đang trộn khung) + scope (5), thay After Effects hoàn toàn (6). MCP chưa thử với AI thật (`THU-MCP.md`). Chạy: `npm install` (lần đầu, rồi `node node_modules/electron/install.js` nếu thiếu binary), `npm test`, `npm start`; kiểm: `npm run e2e`, `e2e-text`, `mcp-test`, `ui-test`, `ui-test-text`, `e2e-audio`, `ui-test-audio`, `e2e-video`, `ui-test-video`, `e2e-color`, `ui-test-color`, `e2e-fx`, `ui-test-fx`, `security-test` (bảng lệnh và cờ dev ở `CHUC-NANG.md` mục 5). **Bảo mật:** đường "áp dụng thay đổi" chỉ giao diện gọi được; AI chỉ đề xuất (`propose_ops`, `add_text`, `set_keyframes`, `apply_preset`, `generate_captions`, `cut_silences`, `cut_words`, `fix_transcript`, `suggest_sfx`, `duck_music`, `beat_markers`, `apply_matte`, `text_behind_person`, `set_speed`, `grade_set`, `apply_lut`, `match_color`, `set_fx`, `set_blend`, `add_shape`) rồi người duyệt (đừng bật `TOOL_EDIT_DEV_API` khi dùng thật). **Chữ tiếng Việt:** luôn dùng font đủ dấu (`list_fonts`), cảnh báo ở `project_get.warnings`.

---

## 1. Tool Edit là gì

Phần mềm dựng video kiểu **CapCut** (dễ dùng, timeline, keyframe) nhưng **thay After Effects** trong Full Studio:
chữ động, hiệu ứng, phụ đề, tách nền, speed ramp, chỉnh màu. Điểm khác biệt: **AI điều khiển được qua MCP** và
**người cũng chỉnh tay được trên cùng một dự án**.

Vì sao làm: After Effects lag trên máy của người dùng, và điều khiển AE bằng ExtendScript chậm, dễ treo
(hộp thoại chặn, mỗi lệnh phải dưới ~60 giây, AI không xem được kết quả). Tool Edit giải quyết ba việc:
1. **Nhanh**: mọi thứ chạy trên GPU (RTX), hiệu ứng là shader biên dịch sẵn, không có trình thông dịch expression.
2. **AI dùng được**: lệnh trả kết quả có cấu trúc, tác vụ dài chạy nền theo `job_id`, không bao giờ có hộp thoại chặn, AI "nhìn" được qua `preview_frame`.
3. **Người cùng sửa được**: giao diện timeline; AI chỉ **đề xuất**, người duyệt.

Người dùng muốn **thay hẳn After Effects**, nhưng đó là mục tiêu cuối: AE còn là đường lui cho đến khi
Tool Edit dựng lại được video SaaS và talking head của hai kit mà đạt (xem `KE-HOACH.md` giai đoạn 6).

## 2. Ai dùng, dùng thế nào

| Người dùng | Cách dùng |
|---|---|
| **Người** (chủ dự án) | Mở app, kéo thả, chỉnh keyframe/chữ/màu, **duyệt hoặc từ chối** đề xuất của AI |
| **AI** (Claude, Gemini, GPT) | Gọi **MCP** của Tool Edit: đọc timeline, gửi đề xuất, xem khung, xuất video |
| **Subagent `edit`** của Full Studio | Sau này gọi Tool Edit thay cho After Effects (khi giai đoạn 6 đạt) |

Cả hai cùng sửa **một file dự án JSON**. Thay đổi hiện trực tiếp ở bên kia và có ghi **ai sửa** (người hay AI).

## 3. Quyết định đã chốt (đừng hỏi lại, đừng đổi khi chưa hỏi)

| Mục | Quyết định |
|---|---|
| Máy chủ | Windows, **RTX 3060 Laptop (6GB)** + Intel Iris Xe, RAM ~16GB, CPU 4 nhân |
| Nền tảng | Chỉ Windows |
| Công nghệ | **Electron + TypeScript + WebGPU**; xuất bằng ffmpeg (NVENC); lõi tự viết gọn, tham khảo mã nguồn mở nhưng không phụ thuộc |
| GPU | Laptop hai GPU: **bắt buộc ép chạy bằng RTX** (cờ `force_high_performance_gpu`), kiểm tra ngay trong app |
| Màu | Pipeline **float 16-bit** từ ngày đầu, ra **Rec.709/sRGB**. HDR để sau. Màn người dùng chưa hiệu chỉnh |
| Định dạng | **9:16 và 16:9**, một dự án hai bản xuất |
| Giao diện | **Kiểu CapCut**, chú trọng **keyframe** (nút thoi, ease preset, sau đó graph editor bezier) |
| AI | AI **không sửa thẳng**: tạo **bộ đề xuất** hiện dạng diff, người bấm Chấp nhận/Từ chối. Riêng **SFX và màu bắt buộc duyệt** |
| MCP | Dùng được cho **Claude, Gemini, GPT**: schema đơn giản (không `anyOf` phức tạp), lệnh batch có hoàn tác |
| Ưu tiên | Dựng, chữ (gradient), phụ đề trước; chỉnh màu + scope ở giai đoạn sau; lõi float khoá sẵn từ đầu |
| Tiếng Việt | Quan trọng ngang tiếng Anh: kiểm glyph dấu Việt tự động |

## 4. Luật làm việc (bắt buộc)

- **Thêm/đổi chức năng, tool MCP hay hành vi AI thấy được thì cập nhật `HUONG-DAN-SU-DUNG-AI.md` (file AI đọc để edit video) trong cùng lần làm**, cùng với `CHUC-NANG.md` và `NHAT-KY.md`.

1. **Làm xong bất cứ chức năng nào thì cập nhật `CHUC-NANG.md`** (trạng thái, cách dùng, file mã, tool MCP, giới hạn, bẫy, cách kiểm, cách nâng cấp) **và `NHAT-KY.md`**. Chưa cập nhật = chưa xong.
2. Không ghi điều chưa chạy như thể đã chạy được. Đổi nhãn `[thiết kế]` → `[có]` chỉ sau khi đã chạy kiểm thật.
3. **Không có hộp thoại chặn** trong bất cứ tác vụ nào AI gọi. Mọi tác vụ dài trả `job_id` và hỏi trạng thái.
4. **Render phải deterministic theo khung** (seek từng frame): preview và file xuất phải giống nhau.
5. Mọi thay đổi dự án đi qua **op có hoàn tác** (batch atomic), không ghi thẳng file ở chỗ khác.
6. Thêm tính năng AI thì phải có **bản đề xuất chờ duyệt**, không tự áp dụng. SFX và màu: luôn chờ duyệt.
7. Kiểm bằng số/ảnh khi được: histogram, ramp, `preview_frame`, `qc_check`. Bạn **không nghe được âm thanh** và không xem được video trực tiếp.
8. Mỗi chức năng có **cách kiểm tự động hoặc quy trình kiểm tay** ghi trong `CHUC-NANG.md`; thiếu thì thêm.

## 5. Việc phải hỏi người dùng trước

- **Đẩy lên GitHub** hoặc đưa thư mục này ra ngoài (repo `full-studio-` là **public**). Thư mục này chưa được phép đẩy.
- **Tải mô hình AI** (whisper, mô hình tách nền, RIFE...) hoặc cài công cụ ngoài: nêu tên, nguồn, dung lượng, **giấy phép** (RVM theo trí nhớ là GPL-3.0, cần kiểm lại; `voice-studio` là AGPL).
- Thêm hoặc đổi **SFX, nhạc**. Người dùng từng chê SFX do AI tự đặt.
- Dùng phông, nhạc, SFX có bản quyền không rõ. Tài nguyên Foodtage chỉ để học.
- Xoá nhiều thứ cùng lúc, đổi quyết định ở mục 3.
- Mọi bước cần đăng nhập, captcha, token, cookie: để người dùng làm. Không đọc, không in, không commit token/key.

## 6. Cấu trúc thư mục

```
tool-edit/
  HUONG-DAN-AI.md   file này (đọc đầu tiên)
  KE-HOACH.md       kế hoạch chi tiết theo giai đoạn, tiêu chí xong, rủi ro
  CHUC-NANG.md      HƯỚNG DẪN TỪNG CHỨC NĂNG: cập nhật mỗi khi làm xong, dùng để sửa lỗi / nâng cấp
  NHAT-KY.md        nhật ký thay đổi và lỗi (mới nhất ở trên)
  THU-MCP.md        hướng dẫn thử MCP với Claude/Gemini/GPT thật: cấu hình, prompt, bảng kết quả
  KIEM-KE-HIEU-UNG.md  hiệu ứng AE của hai kit cần chuyển sang Tool Edit
  src/core, src/render, src/main, src/renderer, src/mcp  mã nguồn (sơ đồ đầy đủ ở KE-HOACH.md mục 3)
  test/, scripts/   test lõi, build, e2e.mjs, mcp-test.mjs
  out/, dist/, node_modules/   sinh ra khi chạy, không đưa vào git (.gitignore)
```

Khi thêm thư mục mã, **cập nhật sơ đồ này**.

## 7. Thứ tự đọc khi bắt đầu một việc

1. File này.
2. `KE-HOACH.md`: xác định đang ở giai đoạn nào, việc nào tiếp theo.
3. `CHUC-NANG.md`: mục của chức năng sắp động tới (để biết nó chạy ra sao, bẫy gì, file mã nào).
4. `NHAT-KY.md`: gần đây có gì đổi, có lỗi nào đang mở.
5. Cần hiểu hệ thống rộng hơn (kit, canvas, voice, subagent): `../HUONG-DAN-AI.md`.

Kit kiến thức hiệu ứng cần chuyển từ After Effects sang Tool Edit nằm ở `../phong-cach/` (`saas-animation`, `talking-head`).
Kiểm kê hiệu ứng các kit đang dùng là việc đầu tiên của giai đoạn 0.

**Cập nhật giao diện (2026-11-17):** phần mềm mở bằng **Trang chủ** (tạo/mở/quản lý dự án); toàn bộ giao diện bằng tiếng Việt có dấu; phím tắt đổi được ở **⚙ Cài đặt**; khung kéo/thu phóng được; có thanh đo âm lượng trái/phải; tab **Âm thanh** chứa thư mục SFX/nhạc do người dùng thêm, **AI chỉ dùng âm thanh trong các thư mục này** và mọi SFX AI gợi ý chờ duyệt. Chi tiết: `CHUC-NANG.md` F-80..F-86. AI không mở Trang chủ/Cài đặt; các route quản lý dự án và cài đặt là **chỉ giao diện**.

**Cập nhật 2026-11-17:** op mới `group_clips` / `ungroup` (clip ghép, trường `group`); `analyze_frame` và `scope_image` nhận `roi` (full|center|upper|lower|left|right|x0,y0,x1,y1), `analyze_frame` trả thêm `below_legal_pct`, `above_legal_pct`; `scope_image` có kind `rgbwave`. Khi đo clip không phủ kín khung (có viền đen), dùng `roi` để số đo không bị viền đen kéo lệch.

**Cập nhật 2026-11-18 (F-94..F-97):** (1) **khung xem zoom/kéo** (cuộn chuột, thanh trượt, Vừa/100%, `Alt+=/-/0/1`); (2) **tương tác trực tiếp trên khung xem**: bấm chọn clip, khung chọn có tay nắm, kéo dời / đổi cỡ / xoay, snap giữa-mép-vùng an toàn, kéo khi có keyframe thì ghi keyframe (một lượt kéo = một bước hoàn tác); (3) **ô thông số đổi ngay khi gõ** (op `POST /ops` nhận thêm `coalesce` để gộp hoàn tác, chỉ giao diện); (4) **nút "Xuất sang…"** + tool MCP `export_timeline`: Premiere (xmeml), DaVinci Resolve (fcpxml + xml), CapCut (bản nháp theo khuôn của bản nháp thật của người dùng), After Effects (.jsx), EDL; phần không chuyển được (chữ, hình, hiệu ứng, chỉnh màu…) thành **một lớp `.mov` trong suốt**. **Mức kiểm: đã kiểm file xuất tự động; CHƯA mở thử trong Premiere / Resolve / After Effects / CapCut** (ghi rõ "chưa kiểm trên <phần mềm>" khi báo cho người dùng). Kiểm: `npm run ui-test-view`, `ui-test-export`, `e2e-export`; chi tiết ở `CHUC-NANG.md` F-94..F-97.
