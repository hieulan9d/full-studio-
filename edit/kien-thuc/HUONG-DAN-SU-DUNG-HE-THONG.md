# Hướng dẫn dùng hệ thống từ A đến Z: Canvas → Voice Studio → Muse/Flow → Dựng

Tài liệu cho người dùng và Claude. Đi theo đúng thứ tự làm một video. Chi tiết sâu hơn nằm ở các file được dẫn ở cuối mỗi phần. Cập nhật 2026-11-14.
Quy ước: **[đã chạy thật]** = đã kiểm tra trong thực tế. Phần không đánh dấu lấy từ tài liệu và mã nguồn của dự án.

---------------------------------------------------------------------------

## 0. Tổng quan một video đi qua những đâu

```
Kịch bản + lời đọc
   │
   ├─ (A) VOICE STUDIO (localhost:3900)   → giọng đọc .wav
   ├─ (B) CANVAS / Infinity Studio        → ảnh, rồi video (Flow hoặc Muse)
   │       agent 127.0.0.1:17371 · web :3100 · Muse :18610
   │       "Xuất file" → E:\antigravyti\infinite-canvas\exports\manifest.json
   └─ (C) vf (hệ thống edit)              → project.json → check → render mp4 / CapCut
           app xem trước localhost:5180
```

Thứ tự làm: **kịch bản → giọng (biết độ dài từng cảnh) → ảnh → video → xuất file → dựng → kiểm tra**.
Làm giọng trước vì độ dài giọng quyết định độ dài clip (6/8/10 giây).

Trước khi bắt đầu, bật đủ 3 thứ: Voice Studio (3900), Canvas `app.bat` (đợi ~15 giây cho agent 17371), và nếu dùng Muse thì có file `.env` đúng (mục 4).

---------------------------------------------------------------------------

## 1. Canvas (Infinity Studio)

### 1.1 Canvas làm gì
Là bảng node. Mỗi lần tạo ảnh/video/âm thanh là một node kết quả. Canvas gọi Flow (Google) hoặc Muse để sinh. Claude không bấm giao diện mà **gọi agent HTTP** bằng `canvas-tools/cv.py`:

```python
from cv import call
call('canvas_get_state', {})
```
Token nằm ở `%USERPROFILE%\.infinite-canvas\canvas-agent.json` (không in ra, không commit).

### 1.2 Tool hay dùng
| Tool | Việc |
|---|---|
| `canvas_get_state` | Đọc nodes, connections, viewport |
| `canvas_generate_image` | Tạo ảnh (`prompt`, `model`, `size:"9:16"`, `referenceNodeIds`, `title`) |
| `canvas_generate_video` | Tạo video (`prompt`, `model`, `size`, `seconds` là **chuỗi**, `referenceNodeIds`, `title`) |
| `canvas_create_node` | Tạo node `image/text/config/video/audio` (không tạo được node "Xuất file") |
| `canvas_run_generation` | Chạy node đã có (`nodeId`, `mode`, `prompt`) |
| `canvas_apply_ops` | `update_node`… (dùng để đặt `exportRequest`) |
| `canvas_move_nodes`, `canvas_set_viewport` | Xếp node, đưa node vào khung nhìn |
| `canvas_delete_nodes` | Xóa node, khóa là **`ids`** (không phải `nodeIds`) |

Tool lạ sẽ trả lỗi. Danh sách đầy đủ: `infinite-canvas/app/canvas-agent/src/canvas/schemas.ts`.

### 1.3 Script có sẵn (đừng viết lại)
`python -X utf8 canvas-tools/ep.py <lệnh> N` với N là số tập:

| Lệnh | Việc |
|---|---|
| `img N [cảnh…]` | Sinh ảnh khung đầu từng cảnh theo `scenes.json` |
| `waitimg N` | Chờ ảnh xong |
| `vid N [cảnh…] [--dry]` | Sinh video từng cảnh (`--dry` chỉ in prompt, không đụng canvas) |
| `waitvid N` | Chờ video xong |
| `export N` | Xuất file ra đĩa |
| `layout N X0` | Xếp node thành **một cột dọc** của tập |
| `clean N` | Xóa node lỗi của tập để sinh lại |
| `clip_s.py N` | Chọn 6/8/10 giây cho từng cảnh theo độ dài giọng |

Chọn model bằng biến môi trường trước khi chạy:
```
IMAGE_MODEL=flow::flow-nano-banana-pro      (mặc định)
VIDEO_MODEL=flow::flow-omni-flash           (mặc định)
IMAGE_MODEL=muse::muse-image   VIDEO_MODEL=muse::muse-video   (dùng Muse)
```
Tập mới: `python -X utf8 canvas-tools/new_ep.py N` tạo `projects/dao-ly-tapN/` từ `kich-ban/`.

### 1.4 Xuất file ra đĩa
Node canvas chỉ giữ link `blob:`. Muốn có file thật:
1. Người dùng thêm **một lần** node **"Xuất file"** (loại `export:folder`), đặt trong khung nhìn. API không tạo được node này.
2. `canvas_apply_ops` → `update_node`: `metadata.exportAll=true`, rồi `metadata.exportRequest` = **giá trị mới mỗi lần** (ví dụ `dd-<giây>`).
3. Đợi, đọc `E:\antigravyti\infinite-canvas\exports\manifest.json`. Mỗi mục có `nodeId`, `type`, `file`, `path`, `durationMs`, `prompt`.
4. **Nhận diện bằng `nodeId`/`order`, không bằng tên file** (tên bị cắt, có thể trùng). Thư mục exports dùng chung nhiều tập nên manifest có mục cũ.
5. Canvas bị reset thì node "Xuất file" mất, phải thêm lại.

### 1.5 Xếp node
Mỗi tập **một cột dọc riêng**, mỗi cảnh một hàng, không xếp ngang. Canvas tự đặt node mới nằm ngang nên **luôn chạy `ep.py layout N X0` sau khi sinh xong**. X0: tập 5=15000, 6=17000, 7=19000, 8=21000, mỗi tập sau +2000.

Tham khảo: `canvas-tools/README.md`, `kien-thuc/HE-THONG-TONG-HOP.md` mục 4.

---------------------------------------------------------------------------

## 2. Voice Studio (giọng đọc)

### 2.1 Là gì
VoiceStudio mã nguồn mở chạy ở `http://127.0.0.1:3900`, API kiểu OpenAI: `/v1/audio/speech` (model `omnivoice`) để đọc, `/v1/audio/transcriptions` (whisper) để nghe lại. Chỉ nhân bản giọng khi có sự đồng ý của chủ giọng.

Giọng đã dùng: `70afd348` (series Đạo lý), `d00dc307` ("thanh thanh tvc", video USP). Danh sách giọng: canvas → Cài đặt âm thanh → "Tải danh sách giọng".

### 2.2 Hai cách tạo giọng
**Cách 1: node âm thanh trên canvas** (dùng cho video USP) **[đã chạy thật]**
- Một cảnh một node: `python -X utf8 canvas-tools/voice_nodes.py N [giọng] [ngôn_ngữ]`. Script bỏ qua cảnh đã có node thành công.
- Hoặc gọi tay: `canvas_create_node(nodeType='audio', metadata={model:'uceIu3NT0oAFMnrTCzwjF::omnivoice', audioVoice:'<id>', audioFormat:'wav', audioSpeed:'1', audioLanguage:'vi'})` rồi `canvas_run_generation(nodeId, mode='audio', prompt=<lời đọc>)`.
- **Không nối node chữ vào node cấu hình rồi tạo giọng**: nhãn node ("【Văn bản 1】") bị đọc thừa. Nhập lời thẳng vào node âm thanh.

**Cách 2: đường `vf`/script từng đoạn** (dùng cho Đạo lý)
- `make_voice.py` tạo từng câu, whisper nghe lại, tạo lại tới 4–6 lần tới khi đúng.
- `rebuild_voice.py` cắt âm thừa đầu câu, nghỉ **0,167 giây (5 khung hình)** giữa câu, ghép `voice/voice_all.wav` kèm `voice_marks.json`.
- Hoặc `python -X utf8 -m vf voice <project> [--only s5 s6]`.

### 2.3 Cách viết lời cho giọng đọc đúng
- Mục đánh số: "Một:", "Hai:", "Ba:" có dấu hai chấm (trên canvas script đổi thành "Một –").
- **Năm viết bằng chữ số** ("năm 2021"); các số/phần trăm khác viết bằng chữ ("sáu mươi phần trăm").
- Câu ngắn, mỗi câu một ý, bỏ dấu phẩy thừa, không câu cụt một chữ.
- Số khẩn cấp: "gọi số một một bốn". Số lớn tránh "nghìn không trăm…" (TTS rớt chữ), viết "hơn bốn nghìn người".
- Thuật ngữ/viết tắt khó: viết theo cách đọc (`HP` → "hép pê", `acid` → "a xít"). Phụ đề vẫn hiện đúng chính tả.
- Từ nhạy cảm: chết/tử vong → "mất mạng", "gặp nạn"; rượu bia → "đồ uống có cồn".
- Không có câu "Nguồn…" trong lời đọc.
- TTS hay bỏ chữ lạ ("PrEP", "HIV" đầu mục): viết bằng chữ đầy đủ.

### 2.4 Xử lý sau khi có giọng
1. Cắt lặng đầu/cuối, đổi về 44100 Hz mono, chuẩn âm lượng `loudnorm=I=-16:TP=-1.5:LRA=11`.
2. VoiceStudio chèn **âm thừa 0,1–0,2 giây ở đầu mỗi đoạn**: cắt từng đoạn, không chỉ đầu file.
3. Nghe lại bằng whisper có mốc từng chữ để canh cảnh và phụ đề. Whisper nghe lệch dấu/số là bình thường, không phải lỗi giọng.
4. Tiếng thừa giữa câu ("Đúng/Đụng/Nếu"): tắt tiếng đúng khoảng đó (`volume=0` theo thời gian), giữ bản gốc `voice_all_raw.wav`.
5. **Chỉ chạy MỘT tiến trình tạo giọng một lúc.** Chạy hai cái làm VoiceStudio treo (tắt hẳn rồi mở lại).
6. Proxy cục bộ `127.0.0.1:23210` cần bật vì CORS khi gọi từ canvas.

Tham khảo: `kien-thuc/dao-ly/feedback-viet-loi-thoai-cho-voice.md`, `feedback-voice-thua-am-dau.md`.

---------------------------------------------------------------------------

## 3. Tạo ảnh

Ảnh là khung đầu của clip, nên **chất lượng ảnh quyết định chất lượng video**. Luôn sinh và xem ảnh trước khi sinh video.

### 3.1 Thông số
- Model Flow: `flow::flow-nano-banana-pro` (mặc định), hoặc `…-nano-banana-2-lite`, `…-nano-banana-2-1`. Muse: `muse::muse-image`.
- `size: "9:16"` cho video dọc. Muse cho ra 1152×2048.
- Mỗi cảnh một ảnh, đặt `title` rõ (ví dụ `T9-c03 ảnh`). **Tiêu đề node ảnh (≤ 24 ký tự) chính là tên ảnh trên Flow**, dùng cho thẻ `@` (mục 5.4).

### 3.2 Công thức prompt ảnh (viết tiếng Anh)
```
[Nhân vật / chủ thể + hành động + bối cảnh], + [phong cách] + [bố cục] + [điều cấm]
```
Phong cách cố định đặt ở **hậu tố** để mọi cảnh đồng nhất. Mẫu Đạo lý:

```
A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, <hành động + bối cảnh Việt Nam>.
Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces.
```

Quy tắc:
- Một cảnh một ý, một hành động rõ ràng. Mô tả vật thể và vị trí, đừng kể chuyện.
- Chừa **khoảng trống trên và dưới** khung cho chữ.
- Luôn có "no text, no letters, no logos". Chữ do vf chèn, không để AI vẽ chữ.
- Cảnh không cần người thì chỉ vẽ đồ vật/nhà cửa.
- Ảnh sản phẩm thật (video USP): dùng ảnh gốc làm `referenceNodeIds`, prompt ghi "giữ nguyên chai/nhãn/chữ, không vẽ lại". Chữ nhỏ trên bao bì vẫn dễ lệch: kiểm từng ảnh, sai thì dán ảnh thật khi ghép.
- Nhân vật cố định: dùng "ảnh mẫu" làm tham chiếu. **Đổi trang phục = tạo ảnh tham chiếu mới** từ ảnh mẫu.

### 3.3 Điều cấm trong prompt (Flow chặn hoặc kẹt "đang tạo")
- **Không trẻ em/bé** ("child", "baby", "kid"). Thay bằng đồ vật (ghế an toàn, gấu bông, áo phao, chốt cửa) hoặc người lớn/người cao tuổi.
- Gợi tự tử, người đứng sát lan can: thay bằng đồ vật (thước dây, thanh lan can).
- Bình gas, khói pin có thể bị chặn: tạo lại ảnh bằng prompt an toàn, rồi sinh video với prompt chuyển động tối giản.
- Từ nặng: "chết" → "mất mạng"; chủ đề nhạy cảm (tự hại, tình dục) dùng thuật ngữ y tế, hình chỉ là đồ vật hoặc người ngồi cạnh nhau.
- Không đưa số liệu Việt Nam chưa kiểm chứng vào hình/chữ.

### 3.4 Quy trình
```
python -X utf8 canvas-tools/ep.py img N        # sinh ảnh
python -X utf8 canvas-tools/ep.py waitimg N    # chờ
```
Xem ảnh đã xuất (hoặc xem trên canvas), cảnh nào sai thì chỉ sinh lại cảnh đó: `ep.py img N 3 7`. Chỉ khi ảnh ổn mới sang video.

---------------------------------------------------------------------------

## 4. Video bằng Muse (và luật)

### 4.1 Muse là gì
muse2api là cầu nối OpenAI-kiểu chạy cục bộ ở `127.0.0.1:18610`, điều khiển một trình duyệt đã đăng nhập tài khoản Muse. Canvas tự khởi động nó khi mở. Kênh `muse` có model `muse-image` và `muse-video`.
Lưu ý: đây là cầu nối không chính thức, có rủi ro điều khoản/khóa tài khoản.

### 4.2 Cài đặt bắt buộc
Phải có file `.env` ở `E:\antigravyti\full studio\canvas\muse2api\` (không nằm trong git). Thiếu `.env` thì driver là `mock` và chỉ trả ảnh giả (ô xanh ~179 byte).
```
MUSE2API_DRIVER=browser
MUSE2API_CHROMIUM_PATH=C:/Users/ADMIN/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe
MUSE2API_CDP_PORT=19311
MUSE2API_BROWSER_PROFILE_DIR=E:/antigravyti/full studio/canvas/muse2api/data/browser-profile
MUSE2API_HEADLESS=true
```
- Dùng dấu `/` trong đường dẫn. Bản dùng `\` + `HEADLESS=false` + cổng 19210 từng lỗi `cdp connection closed` (HTTP 500 ngay).
- Sửa `.env` xong: **thoát hẳn canvas (menu Thoát) rồi mở lại**.
- Thêm tài khoản: cookie ở `http://127.0.0.1:18610/dashboard`. API key ở `muse2api/data/api_key`. **Không dán key vào chat, không commit.**
- Không xóa thư mục `E:\antigravyti\infinite-canvas` (mã nguồn muse2api thật chạy từ đó).

### 4.3 Luật khi sinh video Muse
| Luật | Chi tiết |
|---|---|
| Độ dài | 1–10 giây. Chọn 6/8/10 theo độ dài giọng của cảnh (`clip_s.py N`). Cảnh ngắn vẫn cần clip 6 giây, dựng cắt bớt |
| Tỉ lệ | Đặt qua `aspect_ratio` (9:16) |
| Theo đợt nhỏ | Mỗi tài khoản chỉ vài yêu cầu cùng lúc (`MUSE2API_ACCOUNT_MAX_CONCURRENCY`). Chạy 3 cái thử, rồi 5–6 cái mỗi đợt. Đừng tạo song song với người khác trên cùng tài khoản |
| Camera | Muse hay zoom quá mạnh. Prompt **bắt buộc** ghi camera gần như tĩnh, đẩy vào rất nhẹ dưới 3%. Không viết chuyển động camera trong `motion` |
| Chuyển động | Một hành động chậm, nhỏ (hơi thở, khói, nước gợn, đèn nhấp nháy). Không hành động mạnh |
| Kết quả | Video Muse dùng kiểu cũ (node cấu hình), không dùng thẻ `@` |
| Khung đầu | Ảnh tham chiếu thường là khung 0 giây trắng: cắt bỏ ~0,3 giây đầu (`in: 0.3`) khi dựng |

Hậu tố video chuẩn (đã trong `STYLE_SUFFIX` của `ep.py`):
```
Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. <một hành động chậm, nhỏ>. Camera almost static: at most a very slight, barely noticeable slow push-in (under 3 percent), no fast zoom, no big camera movement; only small gentle subject motion and a faint chalk flicker. No text, no letters, no logos.
```

### 4.4 Chạy
```
set MUSE2API_KEY=...                       (trong terminal, không commit)
python -X utf8 canvas-tools/muse.py models           # kiểm tra kết nối, liệt kê model
python -X utf8 canvas-tools/muse.py test "prompt"    # thử nhanh
set IMAGE_MODEL=muse::muse-image
set VIDEO_MODEL=muse::muse-video
python -X utf8 canvas-tools/ep.py img N
python -X utf8 canvas-tools/ep.py vid N
```
Hoặc `muse.py img N [cảnh…]` / `muse.py vid N [cảnh…]` gọi thẳng muse2api (chưa dùng cho cả tập; ảnh tham chiếu video chưa kiểm qua script).

### 4.5 Lỗi Muse thường gặp
| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Ảnh ra ô xanh ~179 byte | Thiếu `.env`, driver `mock` | Thêm `.env`, thoát hẳn và mở lại canvas |
| HTTP 500 `cdp connection closed` | `.env` sai đường dẫn/cổng | Dùng đúng cấu hình ở 4.2 |
| Video "không khả dụng ở khu vực/tài khoản này" | Giới hạn của Muse theo tài khoản | Đổi tài khoản (ảnh vẫn tạo được) |
| Trình duyệt chạy ngầm liên tục | `HEADLESS=true` từ lúc mở canvas | Bình thường; đổi cách mở theo lần tạo cần sửa `drivers/browser/driver.py` (chưa làm) |
| Video zoom quá nhiều | Prompt có "push-in" | Dùng hậu tố camera tĩnh ở trên; sinh lại cảnh đó |
| Không rõ lỗi | — | Nhật ký ở `muse2api/data/requests.db` (cột `error`, `status_code`); đọc bản sao bằng `sqlite3 backup`, đừng mở trực tiếp khi đang chạy |

Tham khảo: `kien-thuc/muse-canvas.md`.

---------------------------------------------------------------------------

## 5. Cách viết prompt cho Flow

### 5.1 Flow là gì và model nào
Canvas điều khiển **Chrome/Brave thật** (cổng debug 9333) mở trang `flow.google.com`, điền prompt, bấm tạo bằng chuột thật, chờ rồi tải về. Phải đăng nhập Google Flow bằng tài khoản của bạn trong cửa sổ trình duyệt mà app mở ra.

| Loại | Model | Giới hạn |
|---|---|---|
| Ảnh | `flow-nano-banana-pro` / `-2-lite` / `-2-1` | `size` 9:16 |
| Video | `flow-omni-1.2-flash` | 3–15 giây |
| Video | `flow-omni-1.1-flash` | 3–10 giây |

Độ phân giải video: 360p (640×360) hoặc 720p (1280×720, hoặc tương ứng dọc). Tên cũ `flow-omni-flash` vẫn được hiểu. Veo đã bỏ.

### 5.2 Prompt ảnh
Xem mục 3.2. Tóm tắt: **chủ thể + hành động + bối cảnh → phong cách cố định → bố cục chừa chỗ chữ → "no text…"**. Viết tiếng Anh, câu rõ, không trẻ em.

### 5.3 Prompt video (Omni)
Cấu trúc:
```
[Phong cách, giống ảnh tham chiếu]. [MỘT hành động chậm của chủ thể]. [Camera: gần như tĩnh]. [No text, no logos]. (+ khi không có lời: no speech, mouth closed, no talking, no captions)
```
Quy tắc:
- **Một hành động duy nhất**, nhỏ và chậm. Càng nhiều việc xảy ra càng dễ méo.
- Camera: "almost static, very slight slow push-in under 3 percent". Đừng ghi zoom/pan/quay.
- Clip không lời (hầu hết video giọng đọc riêng): thêm "no speech, mouth closed, no talking, no text overlays, no captions".
- Hình giải phẫu/y tế: không máu, không ghê.
- Một câu lệnh chuyển động riêng cho từng cảnh, nằm trong `scenes.json` trường `motion` hoặc `video_prompt`.

### 5.4 Video với thẻ `@ảnh` (Flow, thay node cấu hình)
`ep.py vid N` tạo **node video trực tiếp**, nối ảnh tham chiếu vào, prompt có thẻ `@tên-ảnh`. Tên ảnh = tiêu đề node ảnh (≤ 24 ký tự) = tên file ảnh trên Flow.

Trong `scenes.json`, mỗi cảnh:
- `video_prompt`: tự do, ví dụ `@sanpham bay trên không`, hoặc `@me và @congai đi trên đường`.
- `mode` (tùy chọn): `frames` (ảnh là khung đầu/cuối) hoặc `reference` (ảnh là thành phần).
- Không có `video_prompt` thì dùng `motion` + ảnh khung đầu của cảnh (đặt tên ảnh trùng id cảnh, ví dụ `c03`).

Quy tắc chế độ:
- Mặc định chỉ nhắc ảnh khung đầu → `frames`; nhắc ảnh khác hoặc nhiều ảnh → `reference`.
- Flow tự chọn: ≤ 2 ảnh và `mode` khác `reference` → **Khung hình**; còn lại → **Thành phần**.
- Ảnh ngoài cảnh (`sanpham`, `me`, `congai`…): đặt tiêu đề node ảnh đúng tên tag. **Thiếu tag thì cảnh bị bỏ qua và báo.**
- Prompt bắt đầu bằng `@tên` thì `@` cần khoảng trắng đứng trước (script tự chèn).
- Xem trước không tốn điểm: `python -X utf8 canvas-tools/ep.py vid N --dry`.

Ví dụ `scenes.json` một cảnh:
```json
{
  "id": "c03",
  "clip_s": 8,
  "voice": "Một: tắt bếp khi rời khỏi nhà.",
  "image_prompt": "A simple minimalist character ... turning off a gas stove ...",
  "motion": "The character slowly reaches to the knob and turns it. Faint steam rises. Camera almost static."
}
```

### 5.5 Giới hạn và chống lỗi của Flow
- **Captcha sau khoảng 13–15 video**: sinh theo đợt 3 cái thử, rồi 5–6 cái. Lỗi hàng loạt thì **dừng**, nhờ người dùng xử lý captcha, rồi `ep.py clean N` và sinh lại.
- **Lỗi 502**: lỗi máy chủ, thử lại sau vài phút, không cần người dùng. Đọc `errorDetails` trong node để phân biệt.
- **"Hoạt động bất thường"**: cơ chế chống lạm dụng, xuất hiện lẻ tẻ; thử lại, tránh tạo dồn dập. **Không né kiểm tra bot.**
- **Kẹt "đang tạo" mãi**: thường do prompt/ảnh có trẻ em hoặc nội dung bị chặn. Xóa đúng node lỗi (đừng xóa node ảnh tham chiếu) rồi tạo lại ảnh/prompt an toàn.
- **Không nhận lệnh tạo**: menu tài khoản che trang hoặc cửa sổ bị thu nhỏ. App tự xử lý; đừng thu nhỏ hay che cửa sổ Flow.
- **Đừng tải lại/khởi động lại app** lúc đang tạo (video sẽ lỗi "gián đoạn do tải lại").
- Hết điểm: app đổi sang tài khoản Flow khác nếu có (ngưỡng mặc định 50 điểm; logic chưa chạy thật).
- Tốn điểm: thử **1 cảnh** trước khi sinh hàng loạt.

Tham khảo: `infinite-canvas/FLOW-KIEN-THUC.md`.

---------------------------------------------------------------------------

## 6. Dựng bằng vf

### 6.1 Chuẩn bị
1. Chép clip xuất ra vào `projects/<tên>/media/vNN.mp4` (hoặc `cNN.mp4`) và giọng vào `voice/voice_all.wav`. Dùng `src` tương đối; **không đổi tên/di chuyển `media/`**.
2. Dựng `project.json`: `python projects/dao-ly-tapN/build_project.py` (series Đạo lý) hoặc `vf add/set`.
3. Canh cảnh theo mốc giọng (whisper có mốc từng chữ): **đổi cảnh ở đầu câu đầu tiên của cảnh**.

### 6.2 Luật dựng (bắt buộc)
- Chỉ dùng cảnh không rung (`check` báo rung > 0,5 là vi phạm). Clip AI/CGI nằm trong `rules.shake_exempt: ["media/"]`.
- Cỡ cảnh **luân phiên Toàn (T) → Trung (Tr) → Cận (C)**, không hai cảnh cùng cỡ liền nhau. Cỡ do bạn xem ảnh (`look` rồi Read ảnh) mà gán. Hoạt hình/clip dựng sẵn: `size "SP"`, `alternate_sizes false`.
- **Zoom chỉ nhẹ** (`zoom: [1.0, 1.06~1.12]`, chủ thể ở giữa). Với Đạo lý không thêm zoom mạnh vì Muse/Flow đã zoom sẵn.
- Chữ nằm vùng dưới, cố định. Chuyển cảnh nên rơi đúng nhịp nhạc.
- Tốc độ clip 0,7–1,25×. Cảnh dài hơn clip: làm chậm (≥ 0,75) hoặc dùng clip hai lần (hai đoạn tốc độ ~0,9, đoạn sau lấy phần cuối), hoặc giữ khung cuối. Cảnh ngắn hơn clip: cắt bớt.
- Phụ đề: style `Sub`, cỡ 6, chữ trắng bóng đổ, y = −0,86, mode `sentence`. Mỗi dòng ≤ ~38 ký tự, ngắt theo cụm có nghĩa, không cắt giữa số. Số viết bằng chữ số trong phụ đề (60%, 56 người, tầng 11); mục số dùng "Một – …".

### 6.3 Lệnh
```
python -X utf8 -m vf check  projects/<tên>/project.json     # sau MỖI lần sửa
python -X utf8 -m vf render projects/<tên>/project.json out.mp4
python -X utf8 -m vf capcut projects/<tên>/project.json <tên> --audio none
```
- Nguồn đã dọc (1080×1920) thì **không** dùng `--vertical`.
- `look` ghi `%TEMP%\vf_look.jpg` và ghi đè mỗi lần: chép ảnh ra ngay.
- CapCut: không ghi đè draft đã có, hỏi trước. Không mang theo zoom; track giọng còn thử nghiệm.
- Thành phẩm Đạo lý: chép vào `D:\đạo lý\dao-ly-tapN.mp4`.
- Chạy với `python -X utf8` để tránh lỗi tiếng Việt trên console Windows.

---------------------------------------------------------------------------

## 7. Quy trình tóm tắt một tập (checklist)

1. `python -X utf8 canvas-tools/new_ep.py N` → có `projects/dao-ly-tapN/` (`scenes.json`, `loi-thoai.txt`).
2. Rà lời thoại theo mục 2.3. Đối chiếu số điện thoại/luật với nguồn trước khi đăng.
3. Giọng: `make_voice.py` → `rebuild_voice.py` (một tiến trình một lúc). Nghe lại bằng whisper.
4. `clip_s.py N` chọn 6/8/10 giây.
5. Chọn model (Flow hoặc Muse, mục 1.3). Bật đủ dịch vụ.
6. `ep.py img N` → `waitimg N` → **xem ảnh**, sinh lại cảnh sai.
7. `ep.py vid N --dry` kiểm prompt → `ep.py vid N` theo đợt 3 rồi 5–6 cái → `waitvid N`.
8. `ep.py layout N X0` xếp cột dọc.
9. `ep.py export N` (cần node "Xuất file").
10. `build_project.py` → `vf check` → `vf render` → xem lại (đặc biệt chỗ có số, phụ đề trên cảnh sáng, tốc độ > 1,25×).
11. Chép vào `D:\đạo lý\dao-ly-tapN.mp4`.

---------------------------------------------------------------------------

## 8. Bảng lỗi nhanh

| Hiện tượng | Xử lý |
|---|---|
| Canvas không phản hồi (17371) | Mở `app.bat`, đợi ~15 giây, Connect lại |
| Không xuất được file | Thêm node "Xuất file", đưa vào khung nhìn, đổi giá trị `exportRequest` |
| Giọng đọc thừa "Văn bản 1" | Dùng node âm thanh, nhập lời trực tiếp |
| Giọng thừa âm đầu / rớt chữ | Cắt từng đoạn, whisper nghe lại, tạo lại tối đa 4–6 lần |
| Hai tiến trình giọng làm treo | Tắt hẳn VoiceStudio, mở lại, chạy một cái |
| Flow kẹt "đang tạo" | Kiểm trẻ em/nội dung nhạy cảm trong prompt và ảnh |
| Flow lỗi hàng loạt | 502: chờ vài phút; captcha: nhờ người dùng, rồi `ep.py clean N` |
| Muse ra ô xanh 179 byte | Thiếu `.env` (mục 4.2) |
| Muse video báo không khả dụng | Đổi tài khoản Muse |
| Video zoom mạnh | Sinh lại với hậu tố camera tĩnh (mục 4.3) |
| Clip có khung đầu trắng | `in: 0.3` |
| Chữ bao bì lệch | Kiểm từng clip, dán ảnh thật khi ghép |
| `render --vertical` lỗi crop | Bỏ `--vertical` khi nguồn đã dọc |
| Canvas mất node sau khi reset | Thêm lại node "Xuất file" |

---------------------------------------------------------------------------

## 9. Việc phải hỏi người dùng trước
- Tải tư liệu từ internet (`download`): nhắc kiểm tra bản quyền (ưu tiên Pexels/Pixabay/Creative Commons).
- Ghi đè draft CapCut đã có, xóa nhiều cảnh cùng lúc, đổi giọng đọc, đẩy lên GitHub public.
- Đừng tự thêm SFX hay sửa draft CapCut khi chưa được dạy (người dùng đã chê bản SFX tự đặt).

## 10. Tài liệu liên quan
- `CLAUDE.md`: luật và lệnh nhanh.
- `kien-thuc/HE-THONG-TONG-HOP.md`: toàn cảnh 3 mắt xích, CapCut, video USP.
- `kien-thuc/dao-ly/PHONG-CACH-DAO-LY.md`: phong cách và cách edit series Đạo lý.
- `kien-thuc/muse-canvas.md`: cài đặt và bẫy Muse.
- `canvas-tools/README.md`: script canvas, thẻ `@ảnh`.
- `infinite-canvas/FLOW-KIEN-THUC.md`: kỹ thuật Flow bên trong.
- `SETUP.md`, `kien-thuc/CAI-DAT-DAY-DU.md`: cài máy mới.
