---
name: talking-head-v3
description: >-
  Quy trình chuẩn sản xuất Video Talking Head dọc (1080x1920 @ 30fps) phong cách
  Dược sĩ / Chuyên gia tư vấn sản phẩm (chuẩn BOJOMI v3 & LT PLUS v3): tách nền
  RVM giữ phòng thật + làm tối mượt khi lên Animation, chữ lớn & vòng xoay sau
  lưng đầu, phụ đề từng từ Face-Safe & Box-Safe phát sáng giữ màu, 4 cảnh Split
  B-Roll 2 lớp riêng biệt khoá tỷ lệ 0% méo hình (Google Flow + Showcase ảnh sản
  phẩm thật), phối âm BGM 2 nửa C-Major + EQ Voice Pocket + Sidechain Ducking
  chuẩn -14.0 LUFS, xuất nháp CapCut đa track và lưu Final lên Google Drive.
---

# Talking Head v3 Skill (Dược Sĩ / Chuyên Gia Tư Vấn Sản Phẩm)

Skill này đóng gói trọn vẹn quy trình dựng **Video Talking Head Dọc (`1080×1920 @ 30fps`)** thế hệ `v3` đã kiểm chứng thực tế trên hai dự án thương mại **BOJOMI An Vượng v3** và **Viên Đặt LT PLUS Hằng Thu v3**, kết hợp **RVM Person Matting**, **Infinity Studio Canvas (Google Flow)**, **Engine Compositing Python + Pillow + NumPy + FFmpeg** và **CapCut Pro Editor**.

---

## 1. Đường Dẫn Lưu Trữ & Môi Trường Chuẩn Trên Máy

- **Kho Lưu Trữ Chính (Master Cloud Storage)**: `Z:\Drive của tôi\AI_Full_Studio`
  - Kho Skills: `Z:\Drive của tôi\AI_Full_Studio\01_Skills`
  - Kho Kiến thức & Tài nguyên âm thanh chuẩn (`3 BGM C-Major` + `10 Studio SFX`):
    `Z:\Drive của tôi\AI_Full_Studio\02_Kien_Thuc_Va_Quy_Chuan\BO_KIEN_THUC_TVC_AI_PORTABLE\03_TAI_NGUYEN_DUNG_CHUNG\audio_bgm_sfx`
  - Kho `18` Họ Font Tiếng Việt TVC (`39` `.ttf`) & Chữ Gradient ưu tiên số 1:
    `d:\AI\full studio\BO_KIEN_THUC_TVC_AI_PORTABLE\03_TAI_NGUYEN_DUNG_CHUNG\fonts_tvc_vi` (đồng bộ tại `Z:\Máy tính khác\My Computer\Document HT Media\TLH\Edit\04_Font Chữ TVC & Chữ Gradient`)
  - Kho mở rộng `1.340` BGM 12 thể loại & `1.043` SFX phẳng:
    `Z:\Máy tính khác\My Computer\Document HT Media\TLH\Edit\01_Nhạc Nền (BGM)` và `02_Hiệu Ứng Âm Thanh (SFX)`
  - Kho `229` Hiệu ứng Chữ & Chuyển cảnh Final Cut Pro / Apple Liquid Glass (khi xuất đoạn Intro/Overlay bằng HyperFrames):
    `d:\AI\full studio\BO_KIEN_THUC_TVC_AI_PORTABLE\03_TAI_NGUYEN_DUNG_CHUNG\fcp_hyperframes_pack`
  - Hồ sơ Dự án (kịch bản, transcript, script dựng, báo cáo QC): `E:\LUU-VIDEO\03_Du_An\<slug>`
  - **Thư mục Xuất Video Final Hằng Thu Pharma (`HTPM`)**: **`E:\LUU-VIDEO\hang-thu-pharma\`** (đồng bộ bản sao tại `E:\XUAT-VIDEO\hằng thu pharma\` và `E:\LUU-VIDEO\04_Videos_Final\`), **bắt buộc đặt tên theo chuẩn `<YYMMDD> HTPM <tên tiếng Việt có dấu> final.mp4`** (ví dụ: `261119 HTPM 5 sản phẩm tuổi 25 final.mp4`).
- **Thư mục Render Trung Gian Tốc Độ Cao (Local Scratch)**: `d:\AI\full studio\output\<slug>` (giữ file trung gian nặng `_mc_p1.mp4`, `_v3_video_only.mp4` trên ổ D cục bộ để tránh nghẽn mạng Google Drive khi render frame-by-frame).
- **Python Venv Có Đủ Thư Viện (`PIL`, `numpy`, `onnxruntime`, `faster_whisper`)**:
  `d:\AI\full studio\voice-studio\.venv\Scripts\python.exe`
- **Dự án CapCut Desktop**: `C:\Users\Hang thu\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft`

---

## 2. Quy Trình 7 Bước Sản Xuất Talking Head v3 (End-to-End)

### Bước 1: Kiểm Tra Footage A-Roll, Phiên Âm `--cpu` & Hiệu Đính 100% Chính Tả
1. Trích xuất lưới khung hình `raw_sheet.jpg` và phóng cận vùng ngực/bàn (`box_closeup.jpg`) để đo chính xác toạ độ `y` của **cằm người nói**, **mép bàn** và **vùng hộp sản phẩm thật** (trên bàn hoặc cầm trên tay).
2. Chạy nhận dạng mốc từng chữ bằng `faster-whisper` (**bắt buộc truyền `--cpu`** trên máy thiếu `cudnn_ops_infer64_8.dll`):
   ```powershell
   & "d:\AI\full studio\voice-studio\.venv\Scripts\python.exe" "d:\AI\full studio\phong-cach\talking-head\tools\transcribe.py" "<main_cut.mp4>" "<main_cut.json>" --lang vi --cpu --prompt "<tên thương hiệu, hoạt chất>"
   ```
3. **[BẮT BUỘC]** Đọc soát toàn bộ `segments` & `words` trong `main_cut.json`, sửa sạch 100% lỗi dấu tiếng Việt, tên sản phẩm (ví dụ gộp `"LT"` + `"và lớn"` → `"LT Plus"`) và thuật ngữ y khoa trước khi dựng (`main_cut_clean.json`).

### Bước 2: Tách Nền Người Nói RVM Song Song 2 Nửa (`main_cut_matte.mp4`)
- Chia đôi `main_cut.mp4` thành 2 nửa (`_mc_p1.mp4`, `_mc_p2.mp4`) và chạy song song 2 tiến trình `matte.py` (`rvm_mobilenetv3_fp32.onnx`), sau đó nối `ffmpeg -f concat` thành `main_cut_matte.mp4`. Kiểm tra `ffprobe -count_frames` đảm bảo đủ tổng số khung hình.

### Bước 3: Sinh Ảnh Tham Chiếu (Dự Phòng 4 Tầng) & Tạo Video AI Google Flow Có Tham Chiếu Bắt Buộc
1. **Quy tắc Mặc Định Bắt Buộc: Mọi Video AI Phải Gửi Kèm Ảnh Tham Chiếu (`Reference-First Video`)**:
   - **Tuyệt đối không tạo Video AI chay (Text-to-Video không tham chiếu)**. Mọi clip B-Roll AI đều phải đi qua 2 bước:
     - **Bước 3A — Sinh Ảnh Tham Chiếu Khung Đầu (`Reference Image`) với Chuỗi Dự Phòng 4 Tầng Tự Động (`ChatGPT → Gemini → Flow → Muse`)**:
       1. `chatgpt::chatgpt-image` (ChatGPT — ưu tiên 1, có thể chạy song song khi Flow đang render video).
       2. `gemini::gemini-image` / `flow::flow-nano-banana-2-1` (Gemini — dự phòng 2).
       3. `flow::flow-nano-banana-pro` (Google Flow — dự phòng 3).
       4. `muse::muse-image` (Muse — dự phòng 4).
     - **Bước 3B — Sinh Video AI trên Google Flow (`flow::flow-omni-1.2-flash`) Ở Chế Độ "Thành Phần" (`videoMode: "reference"`) & Cân Chỉnh Đúng Giây Tiết Kiệm Điểm**:
       Đặt tiêu đề node ảnh ngắn gọn (`<= 20` ký tự ASCII, ví dụ `ref_aa01`), nối trực tiếp node ảnh vào node video (`@[node:<ref_img_id>]`, **bắt buộc `videoMode: "reference"` = chế độ `Thành phần` / `Ingredients`, không dùng `frames` Bắt đầu/Kết thúc!**) và **tính toán `seconds` (`3s`, `4s`, `5s`...) sát đúng thời lượng hiển thị của từng footage (`calc_optimal_flow_seconds`) để không tốn thừa điểm Flow**. Chỉ dự phòng sang `muse::muse-video` kèm `referenceNodeIds` khi Flow ngừng phản hồi. Sử dụng helper chuẩn `d:\AI\full studio\edit\canvas-tools\ai_ref_video.py`.
2. **Quy tắc an toàn Y khoa & Kiểm duyệt nền tảng (`knowledge/10`)**:
   - Tuyệt đối không đưa máu, cơ thể thật, trẻ em hoặc từ nhạy cảm vào prompt ảnh/video.
   - Với **cảnh B-Roll có hộp sản phẩm tiếng Việt**, dựng clip Showcase chuyển động trực tiếp từ **bộ ảnh chụp sản phẩm thật chất lượng cao tách nền bằng `IS-Net 1024px` (`cutout_product_png.py`)** để chữ tiếng Việt trên bao bì sắc nét 100%, không bị AI làm biến dạng chữ và không bị lem góc hộp trắng.
3. **Chống trùng tên file khi xuất từ Infinity Studio Canvas (`127.0.0.1:17371`)**:
   - Trước khi kích hoạt node `export:folder` (`exportRequest` mới), **bắt buộc đổi `title` của từng node ảnh/video đầu ra thành mã duy nhất** (`OUT_<slug>_v01`...) và đưa viewport về gần node `export:folder`, sau đó tra cứu theo `nodeId` trong `d:\AI\full studio\canvas\exports\manifest.json`.
   - Cắt bỏ `0.20s – 0.25s` đầu của mọi clip Flow (tránh khung tĩnh đầu tiên), áp LUT `10_AI_Clip_Harmonizer_Natural.cube` và chuẩn hoá CFR `30fps`.
   - Xuất bảng kiểm `brolls_qc.jpg` để xem bằng mắt 100% tài nguyên trước khi ghép.
4. **Quy tắc Typography (`Asap Condensed`) & SFX Sạch**:
   - Ưu tiên họ font **`Asap Condensed`** (`AsapCondensed-Bold.ttf` cho phụ đề Sentence-Case *"Viết hoa đầu câu"* viền mảnh `2px`; `AsapCondensed-ExtraBold.ttf` / `Black.ttf` cho tiêu đề thẻ Liquid-Glass Bento & hiệu ứng FCP/AE).
   - Tuyệt đối không sử dụng các SFX ồn/gắt (đã xoá vĩnh viễn `Whoosh - Lướt chuyển cảnh cơ bản.mp3`); chỉ chọn SFX êm nhẹ (`-19dB` đến `-21dB`).

### Bước 4: Luật Thiết Kế Đồ Hoạ & Chuyển Động Chuẩn v3 (`scripts/render_talking_head_v3_template.py`)
1. **Nền Phòng Thật + Làm Tối Mượt Khi Lên Animation (`ANIM_DIM_WINDOWS`)**:
   - Không thay phông giả cứng suốt video. Khi người nói dẫn chuyện bình thường (`dim == 0`), giữ **100% nền phòng thật tự nhiên**.
   - Khi vào vùng có chữ lớn sau đầu / số thứ tự / Hook / Orbital Rings (`ANIM_DIM_WINDOWS`), dùng hàm bao `smooth_in_out_env` (`smoothstep` bậc 3, `0.50s` ra/vào) hạ độ sáng nền sau lưng xuống `25%` kèm `GaussianBlur(radius=5px)`, trong khi lớp `FG_Person` + `Desk_Box_Mask` giữ nguyên độ sáng sắc nét ở tiền cảnh.
2. **4 Cảnh Split B-Roll 2 Lớp Riêng Biệt — `0%` Méo Tỷ Lệ (`fit_cover`)**:
   - Tuyệt đối không dùng phép biến đổi phối cảnh kéo giãn ảnh tĩnh. Dùng `fit_cover(rgb, 920, 720, zoom)` khoá cứng tỷ lệ khung hình trên 2 thẻ bo góc `radius=54`, xoay nhẹ đối xứng `±1.0°`, trượt mượt `±42px` kèm crossfade `0.42s` và 2 clip chuyển động hoàn toàn khác nhau ở tầng Trên – Dưới.
   - *Lưu ý đạo diễn*: Khi người nói đang **cầm hộp sản phẩm trên tay và chỉ trực tiếp vào hộp** (*"1 hộp như thế này..."*), giữ cảnh người nói cầm hộp trên màn hình (kèm `Orbital Rings` + `Từ khoá lớn` sau lưng), không đè B-Roll che mất hành động thật.
3. **Bố Cục Chữ Face-Safe, Box-Safe & An Toàn Kiểm Duyệt**:
   - **Từ khoá lớn sau đầu (`Oswald-Bold`, `y = 445`)**: Luôn để 1 dòng; cụm `≥ 12` ký tự giữ cỡ `132–158px` để cách lề trái/phải tối thiểu `50px`; quét vệt sáng chéo `sweep_prog`.
   - **Chữ Hook 3 kiểu font (`0.05 – 4.5s`)**: Dùng từ ngữ y khoa trung tính, không che mặt, đi kèm **3 thẻ Icon Tile viền sáng chạy vòng (`EdgeSweep`)** xếp vòng cung trên đỉnh đầu (`cx = 215, 540, 865`, bật lệch nhau `0.18s` + nổ vòng tròn `Burst`).
   - **Phụ đề từng từ (`Palatino Bold Italic` / `Asap Condensed`, tối đa 2 dòng)**: Đặt đúng dải áo tối giữa cằm và hộp sản phẩm (thường `y_base = 1130`, `lh = 66`), bề ngang nằm gọn trong vùng trắng an toàn nửa dưới `X = [54..884px]` và mép dưới `Y <= 1545px` (tuyệt đối không chạm cột nút tương tác phải `X >= 886px` hay vùng đen đáy `Y >= 1548px` theo `safe_zone_9x16.py`), dùng **Dual Drop-Shadow Glow giữ màu** (không dùng Glow cộng sáng gây trắng xoá chữ), kèm hiệu ứng nở viền `Stroke Up` cho 4–5 từ nhấn quan trọng.
   - **Thẻ `Icon Tile` & Lớp phủ thân bài**: Luôn tuân thủ **Vùng Trắng An Toàn TikTok × Reels (`Y = 250..1545px`, nửa trên `X = 54..1024px`, nửa dưới `Y >= 860px` giới hạn `X = 54..884px`)**. Nếu hộp sản phẩm đặt bên phải bàn, đặt `Icon Tile` ở góc trái dưới (`cx = 215, cy = 1410`, mép dưới `<= 1545px`) để vừa không đè sản phẩm thật vừa không chạm vùng đen đáy.

### Bước 5: Kiểm Định Khung Thử Trước Render (`--test`)
- Luôn chạy `render_..._v3.py --test` xuất 8–9 khung đại diện ghép thành `v3_test_grid.jpg`, kiểm tra bằng mắt bằng công cụ `read_file`: dấu tiếng Việt, lề trái/phải của chữ sau đầu, vị trí phụ đề so với cằm & hộp sản phẩm, và tính đúng đắn của mọi icon trước khi chạy render toàn bộ.

### Bước 6: Phối Âm BGM 2 Nửa C-Major + EQ Voice Pocket + Sidechain Ducking (`-14.0 LUFS`)
- **Nhạc nền 2 nửa cảm xúc**: Nửa đầu (nêu vấn đề/triệu chứng) dùng `bgm_warm_fretless.mp3`, crossfade `1.6s` sang `bgm_bright_riley.mp3` ở nửa sau (giới thiệu giải pháp sản phẩm & CTA).
- **EQ Voice Pocket + Sidechain Ducking + `Tactile Micro-SFX` (`phong-cach/kobe-ai-motion-talking-head/CHUYEN-DONG-LOP-PHU-VA-SFX.md`)**: Lọc `highpass=f=75,equalizer=f=1750:t=q:w=1.25:g=-4.5` trên nhạc nền (`-13.5` đến `-15.7 dB` dưới giọng đọc), kết hợp `sidechaincompress` theo tín hiệu giọng nói. Mọi thẻ `Icon Tile`, chữ từ khóa hoặc B-Roll vào/ra bằng mở nét quang học `Blur-Focus` (`0.26s` vào / `0.20s` ra) kèm `Micro-SFX` xúc giác ngắn gọn (`30–120ms`, `-9` đến `-14 dB` dưới giọng đọc, đặt `0ms` đúng frame chạm đích, `Whoosh` sớm `-110ms`, chuỗi nhiều mục tăng `+1 semitone`/bậc, cấm tiếng nổ `Boom` rền to).
- **Chuẩn hoá 2 lượt (`2-pass loudnorm`)**: Đưa bản trộn cuối cùng về đúng **`-14.0 LUFS`** (`True Peak <= -0.95 dBTP`).

### Bước 7: Xuất Bản Final Cục Bộ & Lưu Hồ Sơ Dự Án Lên Google Drive (Không Xuất Nháp CapCut)
1. **Chỉ xuất 1 bản Final cục bộ duy nhất** tại **`E:\XUAT-VIDEO\<TEN_VIDEO>_FINAL.mp4`** (kèm đồng bộ kho lưu trữ trung tâm `E:\LUU-VIDEO\04_Videos_Final\<TEN_VIDEO>_FINAL.mp4`). **Không tạo bản nháp vào `com.lveditor.draft` của CapCut Desktop** trừ khi người dùng có yêu cầu riêng.
2. Kiểm tra lại bằng `ffprobe -count_frames`, giải mã thử `ffmpeg -v error ... -f null -` và chụp Contact Sheet 20 khung `v3_sheet.jpg`.
3. Lưu toàn bộ kịch bản (`job.json`), báo cáo QC (`report.md`), lưới `v3_sheet.jpg` và mã dựng (`.py`) vào **`E:\LUU-VIDEO\03_Du_An\<slug>`**.
