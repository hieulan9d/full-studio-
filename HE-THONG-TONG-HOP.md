# Hệ thống làm video toàn diện: cách hoạt động và cách dùng (tổng hợp)

Tài liệu gốc để người mới (hoặc Claude ở máy mới) hiểu toàn bộ hệ thống mà không cần hỏi lại. Cập nhật 2026-11-11.
Quy ước: **[đã chạy thật]** = đã kiểm tra trong thực tế; **[chưa kiểm]** = suy ra từ tài liệu/mã nguồn.

---------------------------------------------------------------------------

## 1. Bức tranh chung: 3 mắt xích

```
 Kịch bản + lời đọc
        │
        ├─► (2) VOICE STUDIO  ── giọng đọc (.wav/.mp3), nhận dạng chữ (whisper)      localhost:3900
        │
        ├─► (1) INFINITY STUDIO ── ảnh + video AI qua Google Flow                     agent 17371, web 3100
        │         └─ "Xuất file" → E:\antigravyti\infinite-canvas\exports\ (+ manifest.json)
        │
        └─► (3) HỆ THỐNG EDIT (vf) ── file dự án JSON → ffmpeg dựng → mp4 / bản nháp CapCut
                  └─ app web xem trước + khung chat Claude                             localhost:5180
```

| Mắt xích | Thư mục (repo gộp) | Nguồn / giấy phép |
|---|---|---|
| Infinity Studio (canvas) | `canvas/` | Giao diện: basketikun/infinite-canvas (MIT) + phần mới (desktop, flow-canvas). `flowkit/` cũ đã bỏ khỏi repo gộp. |
| Voice Studio | `voice-studio/` | **debpalash/VoiceStudio, AGPL-3.0** (dự án của người khác, giữ nguyên LICENSE). Chỉ nhân bản giọng khi có sự đồng ý. |
| Hệ thống edit | `edit/` | Của người dùng: bộ lệnh `vf`, app web, script series, kiến thức. |

Đường dẫn mặc định trên máy chính (nhiều script đọc cứng):
- Dự án edit: `E:\antigravyti\edit video toàn diện`
- Canvas: `E:\antigravyti\infinite-canvas`; xuất file: `...\exports\manifest.json`
- Video thành phẩm series Đạo lý: `D:\đạo lý\dao-ly-tapN.mp4`
- Bản nháp CapCut: `E:\file cap cut\CapCut Drafts\<tên>`
- Kho SFX có sẵn: `D:\tai nguyen premre\sfx` (kèm `Furys - SFX Pack`)

---------------------------------------------------------------------------

## 2. Cài đặt máy mới (tóm tắt, chi tiết ở `edit/SETUP.md`)
1. Python 3.11, ffmpeg + ffprobe trong PATH, Git, Node.js 18+, Chrome/Brave, Claude Code.
2. `pip install -r requirements.txt` (numpy, opencv-python, requests, fastapi, uvicorn).
3. Voice Studio: cài riêng (app Electron hoặc từ `voice-studio/`), chạy ở `localhost:3900`.
4. Canvas: `npm --prefix app/web install --legacy-peer-deps`, `npm --prefix desktop install`, chạy `app.bat` (hoặc `agent.bat`). Đăng nhập Google Flow **bằng tài khoản của bạn** trong cửa sổ trình duyệt mà app mở ra.
5. Agent canvas ở `127.0.0.1:17371`; token tự tạo ở `%USERPROFILE%\.infinite-canvas\canvas-agent.json` (không nằm trong repo).
6. Mở Claude Code trong `edit/`: nó đọc `CLAUDE.md`, rồi `kien-thuc/`.

---------------------------------------------------------------------------

## 3. Mắt xích 3: hệ thống edit `vf` (trung tâm)

### 3.1 File dự án `projects/<tên>/project.json`
Mọi lệnh đọc/ghi file này. Các trường:
- `name`, `fps` (30), `canvas` {w,h}: video dọc là `1080×1920`.
- `clips`: nối tiếp nhau. Mỗi clip `{src, in, dur, speed?, size, label, zoom?, inset?, focus_x?}` hoặc `{gap: giây}`.
  `src` nên tương đối (`media/c01.mp4`). `size`: `T` toàn, `Tr` trung, `C` cận (bị luật xen kẽ); `SP`/`L` không tính (hoạt hình, clip dựng sẵn).
  `speed < 1` = làm chậm (độ dài trên timeline = `dur/speed`); render tự giữ khung cuối (tpad) nếu thiếu.
  `zoom: [1.0, 1.06]` zoom dần suốt clip.
- `sections`: `{id, title, start, end, script, onscreen:[{start,end,text,style,pos?,parts?}]}`.
  Style chữ: `Sub` (phụ đề dưới, y=-0,86), `SubTop`, `SubW`, `Key`, `Big`, `Tag`, `Dark`, `DarkB`, `DarkS`.
- `voice`: `{profile, pron:[{from,to}]}`; `voiceover`: `[{section:'all', file:'voice/voice_all.wav', start:0, dur, speedup:1.0}]`.
- `music` / `music_tracks` (nhạc nền), `subs:{mode:'sentence'|'word'}`.
- `rules`: `shake_max`, `alternate_sizes`, `shake_exempt:['media/']` (clip AI/CGI không đo rung).

### 3.2 Bộ lệnh (chạy từ thư mục gốc `edit/`: `python -X utf8 -m vf <lệnh>`)
| Việc | Lệnh |
|---|---|
| Xem cảnh | `ls <project.json>` |
| Thêm/xóa/dời/sửa | `add --src F --in S --dur D --size T\|Tr\|C --label X [--at IDX]`, `rm IDX…`, `mv IDX ĐẾN`, `set IDX khóa=giá_trị` |
| **Kiểm luật (sau MỖI lần sửa)** | `check <project.json>` |
| Đo/xem clip | `scan <thư mục>`, `stable <clip>`, `look <clip> t0 t1 [--n 8]` (ghi `%TEMP%\vf_look.jpg`, **ghi đè mỗi lần**: chép đi ngay), `scenes <clip>` |
| Giọng đọc | `voice <project> [--only s5 s6]` (cần Voice Studio chạy) |
| Dựng | `render <project> <out.mp4> [--vertical] [--no-audio] [--sub-mode sentence\|word]` |
| CapCut | `capcut <project> <tên> [--audio none\|full\|mp3\|one\|min]` |
| Nhạc | `beats <file nhạc>` |
| Tìm/tải cảnh | `search "từ khóa" --source youtube\|pexels`, `download <url> [--start --end]` (chỉ khi người dùng yêu cầu; hỏi về bản quyền) |

**Bẫy `--vertical`:** cờ này dành cho nguồn **ngang** cần cắt giữa khung thành 9:16. Nếu clip nguồn đã dọc và `canvas` là 1080×1920 thì **không** dùng `--vertical` (dùng sẽ lỗi crop). **[đã chạy thật]**

### 3.3 Luật dựng của người dùng (bắt buộc)
- Chỉ dùng cảnh không rung (`check` báo rung > 0,5 là vi phạm; clip AI/CGI nằm trong `shake_exempt`).
- Cỡ cảnh luân phiên **Toàn (T) → Trung (Tr) → Cận (C)**, không hai cảnh cùng cỡ liền nhau. Cỡ do người xem ảnh (`look` + Read ảnh) gán, không đoán mù.
- Cảnh đứng im zoom nhẹ (`1.0→1.06~1.12`); chủ thể ở giữa khung.
- Chữ nằm vùng dưới, cố định. Chuyển cảnh nên rơi đúng nhịp nhạc / đầu câu đọc.
- Đổi cảnh **ở đầu câu đầu tiên của cảnh**; tốc độ clip 0,7–1,25×; cần cảnh dài hơn clip thì làm chậm (≥0,75) hoặc giữ khung cuối; cảnh ngắn hơn thì cắt.

### 3.4 App web (`python app/server.py`, `chay-app.bat`, cổng 5180)
Timeline + xem trước + khung chat gọi `claude -p` (dùng gói Claude Code, không cần API key). Chat chỉ được đọc/sửa file trong dự án và chạy `vf` (không chạy lệnh tùy ý). Tự nạp lại khi `project.json` đổi; có lịch sử hoàn tác (`.history`).

### 3.5 Xuất CapCut (`vf capcut`)
- Dựng theo khuôn một draft thật (`TEMPLATE = massage body win2` trong `E:\file cap cut\CapCut Drafts`). Tạo thư mục mới `<tên>/` gồm `draft_content.json`, `draft_meta_info.json`, `draft_settings`, `draft_cover.jpg`. Clip trỏ thẳng vào file nguồn (không copy): **không đổi tên/di chuyển `media/`**.
- `--audio`: `none` (mặc định, an toàn), `one` = 1 đoạn mp3 cả bài (hợp khi giọng là một file), `mp3`/`full`/`min` = từng đoạn. Track giọng trong CapCut còn **thử nghiệm**. Zoom **không** mang sang CapCut.
- **Không ghi đè draft CapCut đã có**; hỏi người dùng trước.
- CapCut bản mới lưu thêm `Timelines/<id>/draft_content.json` (giống file gốc). Thư mục draft đang mở có file `.locked`: **đừng sửa trực tiếp** khi CapCut còn mở (CapCut sẽ ghi đè). Muốn sửa: tạo **bản sao** draft rồi sửa cả hai file `draft_content.json`, bỏ `.locked`/`.bak`, đổi `draft_id`, `draft_name`, `draft_fold_path` trong `draft_meta_info.json`. **[đã chạy thật]**
- Thêm track âm thanh vào draft: nhân bản một segment audio có sẵn (material `audios` + các `extra_material_refs`), đổi `path`, `duration`, `target_timerange`. Đơn vị thời gian là micro giây, làm tròn theo khung hình 30 fps.

---------------------------------------------------------------------------

## 4. Mắt xích 1: Infinity Studio (canvas tạo ảnh/video)

### 4.1 Cách hoạt động với Google Flow (theo `infinite-canvas/FLOW-KIEN-THUC.md`, bản mới)
- Canvas coi Flow là một kênh model. Script chạy trong trang canvas gọi `window.desktop.flow.generateImage/Video` → app Electron mở **Chrome/Brave thật** (profile riêng, cổng debug `127.0.0.1:9333`) và điều khiển trang `flow.google.com/project/<id>` bằng puppeteer: điền prompt, tải ảnh tham chiếu, chọn cài đặt, **bấm bằng chuột thật**, chờ kết quả, tải về.
- FlowKit (agent :8100 + extension) **không còn dùng**. `HUONG-DAN.md` còn mô tả FlowKit/Veo: phần đó **đã cũ**; Veo đã bỏ.
- Model hiện dùng: **ảnh** `flow::flow-nano-banana-pro` (hoặc `…-2-lite`, `…-2-1`); **video** `flow::flow-omni-1.2-flash` (tối đa 15 s) và `flow::flow-omni-1.1-flash` (tối đa 10 s). Tên cũ `flow-omni-flash` vẫn được hiểu. Giây = 3–15, độ phân giải **360p/720p** (720p cho ra 1280×720 hoặc tương ứng dọc).
- Chế độ ảnh cho video: ≤ 2 ảnh → **Khung hình** (đầu/cuối); nhiều hơn → **Thành phần** (ảnh tham chiếu).
- Nhiều tài khoản Flow: app đọc điểm tín dụng trước mỗi lần tạo, dưới ngưỡng (mặc định 50) thì đổi tài khoản khác. Chi phí điểm mỗi lệnh chưa rõ.
- Bẫy: Google chặn đăng nhập trong Electron (nên dùng trình duyệt thật); đừng tải lại/khởi động lại app lúc đang tạo; Flow đôi khi báo "hoạt động bất thường"/captcha (xem mục 8); không né kiểm tra bot.

### 4.2 Agent HTTP (cách `canvas-tools` điều khiển canvas)
`canvas-tools/cv.py`: `call(tên_tool, input)` → POST `http://127.0.0.1:17371/api/tools`, header `x-canvas-agent-token`. Tool đã dùng **[đã chạy thật]**:
- `canvas_get_state` (nodes, connections, viewport), `canvas_apply_ops` (update_node, …), `canvas_move_nodes`, `canvas_set_viewport`, `canvas_delete_nodes` (khóa `ids`).
- `canvas_generate_image` / `canvas_generate_video` / `canvas_generate_audio`: tạo **luồng** (node chữ → node cấu hình → node kết quả) và chạy ngay. Tham số: `prompt`, `model`, `size` ("9:16"), `seconds` (chuỗi), `referenceNodeIds` (ảnh tham chiếu), `title`, và với âm thanh `audioVoice`, `audioFormat`, `audioSpeed`, `audioLanguage`.
- `canvas_create_node` (`nodeType`: image|text|config|video|audio; **không tạo được node plugin** như "Xuất file"), `canvas_create_config_node` (`prompt`, `mode`, `autoRun`), `canvas_run_generation` (`nodeId`, `mode`, `prompt`).
- Tool lạ trả lỗi (tên tool tiếng Trung). Danh sách tool đầy đủ: `infinite-canvas/app/canvas-agent/src/canvas/schemas.ts`.
- Kết nối mất (`ConnectionRefused`): canvas/agent chưa mở. Sau khi mở lại app đợi ~15 giây; có thể phải Connect lại trong canvas.

### 4.3 Xuất file ra đĩa ("Xuất file")
Node canvas chỉ giữ link `blob:` dùng trong cửa sổ app. Muốn có file thật:
1. Người dùng thêm **một lần** node **"Xuất file"** (loại `export:folder`; API không tạo được). Node phải nằm trong khung nhìn.
2. `canvas_apply_ops` → `update_node` đặt `metadata.exportAll=true`, rồi đặt `metadata.exportRequest` = **giá trị mới mỗi lần** (ví dụ `dd-<giây>`).
3. Đợi, đọc `E:\antigravyti\infinite-canvas\exports\manifest.json`: mỗi mục có `nodeId`, `type`, `name`, `file`, `path` (đường dẫn thật), `durationMs`, `prompt`. **Nhận diện bằng `nodeId`/`order`, không bằng tên file** (tên bị cắt và có thể trùng).
4. Map node video → cảnh: đi theo `connections` từ node cấu hình có tiêu đề `DD-cNN …` tới node `video`. Thư mục exports dùng chung nhiều dự án (tích lũy vài trăm file, manifest ghi nhiều mục cũ).
5. Mã mẫu: `canvas-tools/ep.py` (`export`, `layout`, `clean`…).

### 4.4 Quy tắc tạo ảnh/clip (rút ra khi làm video thực)
- **Khóa sản phẩm:** dùng ảnh sản phẩm gốc (tờ nhiều góc nhìn cũng được) làm `referenceNodeIds`; prompt ghi "giữ nguyên chai/nhãn/chữ, không vẽ lại". Chữ nhỏ trên bao bì vẫn dễ lệch: kiểm từng clip, sai thì dán ảnh thật lên khi ghép.
- **Khóa nhân vật:** dùng "ảnh mẫu" làm tham chiếu; **đổi trang phục = tạo ảnh tham chiếu mới** từ ảnh mẫu (giữ mặt, tóc, dáng).
- **Clip không lời:** thêm vào prompt "no speech, mouth closed, no talking, no text overlays, no captions, no children".
- **Khung đầu tờ tham chiếu:** clip dùng ảnh tham chiếu thường có **khung 0 giây là ảnh tham chiếu trắng**: cắt bỏ ~0,3 s đầu (`in: 0.3`).
- Chuyển động nhẹ, camera đẩy chậm; hình giải phẫu 3D: không máu, không ghê.
- Sinh video **theo đợt nhỏ** (3 rồi 5–6 cái, cách nhau vài giây); đã chạy 7 clip liên tiếp ổn. Mỗi clip ~1–2 phút, Flow xử lý lần lượt.

---------------------------------------------------------------------------

## 5. Mắt xích 2: Voice Studio (giọng đọc)

- Là **VoiceStudio mã nguồn mở** (debpalash/VoiceStudio, AGPL-3.0): nhân bản giọng, thiết kế giọng, lồng tiếng video, nhận dạng chữ, đọc sách; API tương thích OpenAI `http://127.0.0.1:3900/v1` (`/audio/speech`, `/audio/transcriptions`), model đọc chữ `omnivoice`; whisper để nghe lại.
- Giọng đã dùng: **"thanh thanh tvc" = profile `d00dc307`**; giọng khác: `70afd348` (series Đạo lý), "đạo lý", "hiếu", "giọng quảng cáo trầm hương". Lấy danh sách giọng trong canvas: Cài đặt âm thanh → "Tải danh sách giọng".
- **Hai cách tạo giọng:**
  1. **Node âm thanh trên canvas (cách người dùng yêu cầu cho video USP)** **[đã chạy thật]**: `canvas_create_node(nodeType='audio', metadata={model:'uceIu3NT0oAFMnrTCzwjF::omnivoice', audioVoice:'d00dc307', audioFormat:'wav', audioSpeed:'1', audioLanguage:'en'})` rồi `canvas_run_generation(nodeId, mode='audio', prompt=<lời đọc>)`. Có thể dán **cả lời một lần** (kết quả 36,9 s cho ~110 chữ). `audioLanguage='en'` là thiết lập người dùng chọn cho giọng này.
  2. Đường `vf` trực tiếp: `vf voice` hoặc `make_voice.py` (từng đoạn, whisper nghe lại, tạo lại đến 4–6 lần).
- **Đừng nối node văn bản vào node cấu hình rồi tạo giọng**: nhãn node ("【Văn bản 1】") bị gắn vào prompt và giọng **đọc thừa "Văn bản 1, văn bản 1"** ở đầu. Nhập lời trực tiếp vào ô soạn của node âm thanh. **[đã chạy thật, đã gặp lỗi]**
- **Sau khi có giọng:** xuất file; cắt lặng đầu/cuối: `silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse,…,areverse`; chuyển 44100 Hz mono; nghe lại bằng whisper `tts.transcribe(file, words=True)` để lấy **mốc từng chữ**; chuẩn âm lượng `loudnorm=I=-16:TP=-1.5:LRA=11`.
- **Viết lời cho TTS:** "Một:/Hai:" có dấu hai chấm; năm bằng chữ số; số/phần trăm còn lại bằng chữ; câu ngắn; thuật ngữ khó viết theo cách đọc (`HP`→"hép pê", `NSAID`→"en sét", `acid`→"a xít"), còn phụ đề hiển thị lại đúng chính tả. Không câu "Nguồn…" trong lời đọc.
- Bẫy: VoiceStudio chèn **âm thừa 0,1–0,2 s ở đầu mỗi đoạn**; chạy hai tiến trình tạo giọng cùng lúc làm treo (tắt hẳn rồi mở lại); whisper hay nghe lệch dấu (không phải lỗi giọng); proxy cục bộ `127.0.0.1:23210` cần bật vì CORS khi gọi từ canvas.

### Canh cảnh theo giọng (đã làm cho video USP Dạ Dày) **[đã chạy thật]**
1. `words = tts.transcribe(voice_all.wav, words=True)`.
2. Chia lời theo cảnh; `subs._align(tokens, words, 0, T)` gán thời gian từng chữ của kịch bản.
3. Bắt đầu cảnh = thời điểm chữ đầu của cảnh; kết thúc = bắt đầu cảnh sau. Đặt `dur` clip = độ dài cảnh (cắt nếu dài), clip ngắn hơn thì `speed = dur_clip/độ_dài_cảnh` (≥0,75), còn lại giữ khung cuối.
4. Phụ đề: chia câu ≤ ~42 ký tự (`subs.split`), gán mốc theo tỷ lệ chữ, style `Sub`.

---------------------------------------------------------------------------

## 6. Hai dòng sản phẩm đã làm

### 6.1 Series "Đạo lý" (video từ sách → canvas → dựng)
Chi tiết đầy đủ: `kien-thuc/dao-ly/PHONG-CACH-DAO-LY.md`. Tóm tắt:
- 9:16, 60–115 s, một giọng đọc liền, hình tranh vẽ tay đen trắng (nét phấn trắng trên nền đen), chữ phụ đề cố định vùng dưới; cấu trúc: câu tóm → "Một:…Sáu:" → số liệu Việt Nam → lời chốt.
- Quy trình một tập: `python -X utf8 canvas-tools/new_ep.py N` (từ `kich-ban/tapNN.md`) → giọng (`make_voice.py`, `rebuild_voice.py`) → `ep.py img/waitimg/vid/waitvid` → `ep.py export N` → `build_project.py` → `vf check` → `vf render` → chép vào `D:\đạo lý`.
- Mỗi tập **một cột dọc riêng** trên canvas: `ep.py layout N X0` (X0: tập 5=15000, 6=17000, 7=19000, 8=21000, +2000 mỗi tập).
- Kịch bản tập 9–27 soạn sẵn trong `kich-ban/` (chưa làm). Đã làm tập 1–8.
- Nguyên tắc: không trẻ em/bé trong prompt (Flow chặn); "chết" → "mất mạng"; không số liệu Việt Nam chưa kiểm chứng; chủ đề nhạy cảm (tập 7, 8, 16) cần người có chuyên môn xem trước khi đăng.

### 6.2 Video USP sản phẩm (phụ khoa, dạ dày…) cho Hằng Thu Pharma
Dự án mẫu: `projects/dah-day-hang-thu/` (Dạ Dày Hằng Thu, 8 cảnh, ~37 s).
- **Nguồn thông tin sản phẩm:** ảnh infographic (công dụng + thành phần) ở `E:\job shoppe\sản phẩm`, bộ tham chiếu bao bì ở `E:\usp phụ khoa\tham chiếu sản phẩm`, file kiến thức/kịch bản mẫu ở `E:\job shoppe\New folder\` (`file kiến thức hằng thu phụ khoa.txt`, `kịch bản phụ khoa.txt`).
- **Cấu trúc nội dung USP:** câu hỏi mở/hook → hiểu lầm phổ biến → giải thích nguyên nhân → sản phẩm hỗ trợ (USP) → CTA "inbox". 30–45 s.
- **Cách nói an toàn** (thực phẩm bảo vệ sức khỏe): dùng "hỗ trợ/giúp/góp phần"; bỏ "trị/điều trị/khỏi/nhanh/100%"; bỏ ý nhạy cảm (u xơ, thụ thai, liệt dương…); không ảnh trước/sau; có dòng "Thực phẩm bảo vệ sức khỏe, không phải thuốc, không có tác dụng thay thế thuốc chữa bệnh."
- **Khung cảnh (8 cảnh, cỡ xen kẽ T–Tr–C…):** hook, vấn đề, nguyên nhân (hình giải phẫu 3D), sản phẩm trên bục kính, thành phần/cơ chế, CTA. Mỗi cảnh ghi bối cảnh, nhân vật + trang phục, sản phẩm, ảnh tham chiếu dùng, chuyển động (không lời), lời đọc, chữ.
- **Quy trình thực hiện:**
  1. Đưa ảnh tham chiếu sản phẩm và "ảnh mẫu" nhân vật lên canvas (node ảnh).
  2. Sinh từng clip 9:16, 4–7 s, **không lời**, tham chiếu bằng `referenceNodeIds`. Kiểm từng clip.
  3. Tạo giọng bằng node âm thanh (mục 5), xuất cả file giọng và clip (mục 4.3).
  4. Chép clip vào `projects/<tên>/media/cNN.mp4`, tạo `project.json`, canh cảnh theo mốc giọng, `vf check`, `vf render` (không `--vertical`).
  5. Xuất CapCut (`--audio one`) nếu người dùng muốn sửa tay.
- **SFX:** người dùng đã chê bản SFX do Claude tự đặt ("dở", sẽ dạy sau). **Đừng tự thêm SFX/sửa draft CapCut khi chưa được hướng dẫn.** Khi được dạy, ghi cách chọn/đặt SFX vào file này.
- Đã làm thử `dah-day-hang-thu`: còn thiếu nhạc nền, dòng pháp lý ở đáy, cảnh 7 (lọ quay mặt sau) và cảnh 2 (nhân vật chưa đúng ý) cần sinh lại.

---------------------------------------------------------------------------

## 7. Sơ đồ quyết định nhanh
- Người dùng nói "làm tập N Đạo lý" → `kien-thuc/dao-ly/PHONG-CACH-DAO-LY.md` + `canvas-tools/README.md`.
- Nói "làm video USP / quảng cáo sản phẩm" → mục 6.2.
- Cần giọng → mục 5 (node âm thanh, đừng nối node chữ).
- Cần file từ canvas → mục 4.3 (cần node "Xuất file").
- Cần bản nháp CapCut → mục 3.5.
- Việc cần hỏi người dùng trước: tải tư liệu từ internet (nhắc bản quyền), ghi đè draft CapCut, xóa nhiều cảnh, đổi giọng đọc, **đẩy lên GitHub public**.

---------------------------------------------------------------------------

## 8. Bẫy và cách xử lý (tổng hợp)
| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Canvas không phản hồi (cổng 17371) | App/agent chưa mở | Mở `app.bat`, đợi ~15 s, Connect lại |
| Không xuất được file | Chưa có node "Xuất file" / không trong khung nhìn / `exportRequest` trùng | Người dùng thêm node; đặt viewport; đổi giá trị `exportRequest` |
| Giọng đọc thừa "Văn bản 1" | Node chữ nối vào node tạo | Dùng node âm thanh với lời nhập thẳng |
| Giọng thừa âm đầu / rớt chữ | VoiceStudio | Cắt lặng + nghe lại whisper, tạo lại tối đa 4–6 lần |
| Clip có khung đầu trắng | Ảnh tham chiếu bị chèn khung 0 s | `in: 0.3` |
| Lọ/chữ bao bì bị lệch | AI vẽ lại chữ nhỏ | Kiểm từng clip; dán ảnh thật khi ghép |
| `render --vertical` lỗi crop | Nguồn đã dọc | Bỏ `--vertical` |
| Flow báo lỗi hàng loạt (captcha, 502) | Chống lạm dụng/máy chủ | 502: thử lại sau vài phút; captcha: nhờ người dùng; xóa đúng node lỗi (đừng xóa node ảnh tham chiếu) rồi sinh lại |
| Flow "Không nhận lệnh tạo" | Menu tài khoản che trang / cửa sổ ẩn | App tự xử; đừng thu nhỏ/che cửa sổ Flow |
| Sửa draft CapCut bị mất | CapCut đang mở ghi đè | Sửa **bản sao** khi CapCut đóng |
| `look` ra ảnh cũ | `%TEMP%\vf_look.jpg` bị ghi đè | Chép ảnh ra file riêng ngay sau mỗi lệnh |
| Tiếng Việt lỗi khi in ra console | Windows cp1252 | Chạy `python -X utf8` |

---------------------------------------------------------------------------

## 9. Giới hạn hiện tại
- Chưa tự tách nền / tạo hình AI ngoài canvas; dò beat chỉ là ước lượng; xuất CapCut chưa mang zoom, track giọng thử nghiệm.
- Chưa tự nghe được âm thanh: kiểm giọng bằng whisper (mốc/nội dung), không kiểm cảm xúc/độ khớp bằng tai.
- Canvas API không đọc được nội dung ảnh/video (chỉ trạng thái); muốn xem phải xuất file rồi `vf look`.
- SFX/nhạc: chưa có quy trình được người dùng duyệt (xem 6.2).

---------------------------------------------------------------------------

## 10. Đưa lên GitHub
- Repo gộp: `github.com/hieulan9d/full-studio-` (public): `canvas/`, `voice-studio/`, `edit/`.
- Chỉ đưa file git đang theo dõi; video, ảnh, giọng (`*.mp4 *.wav *.mp3 *.png *.jpg`), `media/`, `node_modules` bị `.gitignore` loại. Không chứa khóa/token (đã quét). `canvas/flowkit/` (có khóa Google API công khai của client Flow) **đã loại**.
- Giữ nguyên LICENSE từng phần; `voice-studio/` là AGPL-3.0, nên phân phối cần tuân thủ.
