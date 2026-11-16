# HƯỚNG DẪN CHO AI: ĐỌC FILE NÀY TRƯỚC TIÊN

Bạn là AI làm việc trong dự án **Full Studio**. Đọc hết file này trước khi làm bất cứ việc gì, rồi mới mở các file con nó chỉ tới.
Trả lời người dùng bằng **tiếng Việt**, ngắn gọn, nói rõ đã làm gì và còn gì chưa kiểm.

Quy ước độ tin cậy trong file này:
- **[có]** = đã thấy trong mã/tài liệu của repo.
- **[chạy thật]** = tài liệu gốc ghi đã chạy trên máy chủ repo.
- **[thiết kế]** = mục tiêu người dùng đã chốt, **chưa được triển khai**. Đừng coi là đã có.
- **[chưa kiểm]** = ý tưởng hoặc suy luận, cần thử trước khi tin.

---

## 1. Dự án này là gì

Full Studio là hệ thống **nhiều agent để edit video**. Người dùng đưa **chủ đề, brief, ý tưởng**. Hệ thống đọc **file kiến thức của đúng loại video**, viết kịch bản, tạo nguyên liệu (video AI, giọng AI) khi cần, rồi edit thành video hoàn chỉnh.

Hiện có **hai loại video** (mỗi loại một kit kiến thức riêng, sau này sẽ thêm loại khác):

| Loại | Là gì | Kit |
|---|---|---|
| **SaaS** | Quảng cáo phần mềm, giao diện kính, nền tối, motion graphics, 16:9 và 9:16 | `phong-cach/saas-animation/` |
| **Talking head dọc** | Người nói trước camera, 1080×1920 (TikTok/Reels/Shorts), phụ đề từng từ, chữ sau lưng người, B-roll | `phong-cach/talking-head/` |
| **UGC AI một cú máy** (thời trang/sản phẩm, người mẫu AI nói, camera cố định, không chữ) — **thể loại thử, đã chạy thật 1 lần (2026-11-15)**; bẫy Flow chặn chữ tuổi/giới tính ở mục 6b của kit | `phong-cach/ugc-ai-thoi-trang/` (`PHONG-CACH.md`, `ref-notes.md`) |

Hai kit **khác nhau, đừng nhầm**. Chúng dùng chung thư viện `saas-lib.jsx` nhưng luật, hiệu ứng và quy trình khác nhau.

Ngoài hai kit còn một dòng cũ chạy bằng ffmpeg, không cần After Effects: **video giải thích nhiều cảnh + giọng đọc, nhiều tập** (series "Đạo lý", video USP sản phẩm). Dòng này do `edit/` (lệnh `vf`) làm.

---

## 2. Luồng làm việc mục tiêu [thiết kế]

```
Người dùng đưa brief
   │
   ▼
Phiên chính (quản lý): đọc brief, chọn loại video, chọn kit, gọi subagent lần lượt
   │
   ▼
Subagent CONTENT → kịch bản + danh sách cảnh ──► NGƯỜI DÙNG DUYỆT (cổng 1)
                                                      │ duyệt rồi mới đi tiếp
                                                      ▼
Subagent TẠO ASSET → giọng AI, ảnh/video AI (Flow, Muse), làm sạch logo nếu cần
   │
   ▼
Subagent EDIT → dựng bằng After Effects (MCP) hoặc bản nháp CapCut / `vf`
   │
   ▼
Tự kiểm bằng checklist QC của kit → giao cho người dùng xem (cổng 2)
```

Quyết định của người dùng (đã chốt):
- Dùng **subagent**, không tạo agent riêng chạy tách rời.
- **Không có agent chấm điểm.** Agent Edit tự chạy checklist QC của kit (`knowledge/08-qc.md` ở mỗi kit) rồi ghi vào báo cáo cái gì đạt, cái gì **không kiểm được**.
- **Subagent Content đưa kịch bản cho người dùng duyệt. Chỉ khi người dùng duyệt mới tạo video.** Không tự tốn credit Flow/Muse trước khi được duyệt.
- Phát hiện lỗi sau khi giao: sửa **đúng cảnh lỗi**, không dựng lại cả video.

Bản kịch bản gửi duyệt phải có: hook, lời đọc, danh sách cảnh (mốc thời gian, nội dung, **nguồn asset của từng cảnh**: quay thật / Flow / Muse / đồ hoạ), và **số clip AI sẽ tạo**. Talking head thêm: **2–3 phương án hook** (chữ + hình minh hoạ, `phong-cach/talking-head/knowledge/12-hook.md`) và **số ảnh AI cho hook**; người dùng chọn một phương án khi duyệt, phiên chính ghi `kich_ban.hook_da_chon` trong `job.json` cùng lúc chuyển `da-duyet-kich-ban`.

**Đã có (viết ngày 2026-11-15, chưa chạy thử trên video thật):**
- Ba subagent: `.claude/agents/content.md`, `tao-asset.md`, `edit.md` (mỗi cái tự kiểm trạng thái trong `job.json` trước khi chạy).
- Mẫu `mau/job.json` (file trạng thái mỗi video: brief, cảnh, asset, lỗi, nhật ký) và `mau/kich-ban-duyet.md` (bản người dùng duyệt).
- Luồng điều phối ở `CLAUDE.md` thư mục cha.

Vòng đời `job.json.trang_thai`: `moi` → `cho-duyet-kich-ban` → `da-duyet-kich-ban` → `da-tao-asset` → `dang-dung` → `cho-nguoi-dung-xem` → `xong`; có lỗi thì `sua-loi` rồi quay lại dựng. **Phiên chính (quản lý) chỉ chuyển sang `da-duyet-kich-ban` sau khi người dùng nói rõ là duyệt.** Subagent chỉ chạy được khi đúng trạng thái.

Lưu ý: Claude Code chỉ nạp subagent trong `.claude/agents/` của thư mục đang mở. Mở Claude Code **trong `fullstudio/`** để dùng chúng; kit đầy đủ (nhạc, ví dụ) ở thư mục cha thì dùng đường dẫn tuyệt đối khi cần. Thư mục `output/<slug>/` do agent `content` tạo khi bắt đầu video.

---

## 3. Bản đồ thư mục

Thư mục gốc của repo này: `fullstudio/` (git: `github.com/hieulan9d/full-studio-`, **public**, đừng đẩy gì lên khi chưa hỏi).

```
fullstudio/
  HUONG-DAN-AI.md          file này (đọc đầu tiên)
  README.md                tổng quan 3 mắt xích
  CAI-DAT.md               cài từ máy sạch, cấu hình, smoke test, bảng lỗi (mục 4.6 là Muse)
  HE-THONG-TONG-HOP.md     cách hoạt động chi tiết: canvas, giọng, vf, bẫy đã gặp
  full studido.exe         launcher mở canvas (Electron); mã ở launcher/FullStudio.cs
  canvas/                  Infinity Studio: tạo ảnh/video AI + voice
    app/ desktop/ flow-canvas/   giao diện, vỏ Electron, script Flow
    muse2api/                    cầu nối Muse (cổng 18610)
    muse2api-extension/
  voice-studio/            Voice Studio (AGPL-3.0, của tác giả khác)
  edit/                    hệ thống dựng bằng ffmpeg: `vf`, app web, series, kiến thức
    CLAUDE.md                luật dựng + bảng lệnh `vf`
    kien-thuc/               kinh nghiệm đã học (Đạo lý, Muse, CapCut)
    canvas-tools/            script điều khiển canvas bằng HTTP
    projects/                các dự án đã làm
  phong-cach/              hai kit kiến thức dựng bằng After Effects
    HUONG-DAN-KET-HOP.md     cách ghép full-studio với hai kit
    saas-animation/
    talking-head/
  launcher/                mã nguồn build ra full studido.exe
```

**Lưu ý đường dẫn.** Nhiều tài liệu và script gốc ghi cứng `E:\antigravyti\...` (canvas ở `E:\antigravyti\infinite-canvas`, v.v.). Máy hiện tại đặt repo ở `D:\dự án antigravity\full studio\fullstudio`. Khi một đường dẫn trong tài liệu không tồn tại, **đừng đoán**: kiểm tra thực tế hoặc hỏi người dùng. `CAI-DAT.md` mục 6 nói cách đổi cấu hình theo máy.

Thư mục cha `D:\dự án antigravity\full studio\` có `CLAUDE.md` riêng và một bản `phong-cach/` **có thêm tài nguyên không nằm trong git** (nhạc `audio/music`, `assets` của ví dụ Foodtage, `orbiq_v1.mp4`). Nếu cần nhạc hoặc ví dụ, kiểm tra bản ở thư mục cha. `fullstudio/phong-cach/` là bản trong git đã bỏ các file đó.

---

## 4. Chọn kit theo loại video

| Người dùng yêu cầu | Làm gì |
|---|---|
| Video **SaaS** (quảng cáo phần mềm, kính, nền tối, After Effects) | Đọc `phong-cach/saas-animation/` theo thứ tự: `PHONG-CACH.md` → `CLAUDE.md` (quy trình 11 bước) → `knowledge/01, 02, 03, 07, 10` (**07 bắt buộc**: bẫy đã gặp). Khi cần: `knowledge/11` (9:16), `knowledge/12` + `audio/music/INDEX.md` (âm thanh). Dùng `lib/`, `tools/`, mẫu `projects/orbiq/build.jsx` |
| **Talking head dọc** (người nói, phụ đề từng từ, B-roll) | Đọc `phong-cach/talking-head/`: `AGENTS.md` → `CON-THIEU.md` → `knowledge/01, 02, 07` (**07 bắt buộc**). Khi cần: `03` (hiệu ứng), `04` (chuẩn bị clip), `05` (âm thanh), `10` (font Việt, nội dung y tế). Dùng `lib/` (`saas-lib.jsx` + `th-lib.jsx`), `tools/`, mẫu `examples/foodtage/build.jsx` |
| Video **giải thích nhiều cảnh + giọng đọc, nhiều tập** | `edit/CLAUDE.md`, `edit/kien-thuc/`, lệnh `vf` |
| Giải thích + vài cảnh đồ hoạ đắt tiền | `vf` cho bản chính, kit SaaS cho đoạn đồ hoạ (ghép: `phong-cach/HUONG-DAN-KET-HOP.md` mục 3.2, **chưa kiểm**) |

### 4.1 Tạo thể loại video mới từ video mẫu (việc riêng, không nằm trong luồng làm video)
Phân tích video mẫu là **một việc riêng để tạo ra một thể loại video mới**: kết quả là một kit kiến thức mới (như `saas-animation`, `talking-head`) để hệ thống về sau edit theo thể loại đó. Nó **không** chạy trong mỗi lần làm video thường. Khi đã có kit, các lần làm video sau chỉ đọc kit, không phân tích lại.
Kích hoạt khi người dùng nói họ muốn **thêm thể loại mới / học phong cách từ video mẫu / "video này làm thế nào"**. Khi đó đọc `phong-cach/PHAN-TICH-VIDEO-MAU/PHAN-TICH-VIDEO-MAU.md`. Đầu ra gồm `ref-notes.md` (phiếu phân tích), rồi biến nó thành kit trong `phong-cach/<tên-thể-loại>/` theo cấu trúc của hai kit hiện có, và thêm một dòng vào bảng chọn kit ở trên cùng `CLAUDE.md` thư mục cha. Chỉ tạo kit khi người dùng yêu cầu; đừng tự dựng thể loại mới.
Thư mục phân tích: `phong-cach/PHAN-TICH-VIDEO-MAU/` (hướng dẫn `PHAN-TICH-VIDEO-MAU.md` + công cụ `tools/refkit.py`). Có một bản ở `fullstudio/phong-cach/` (trong git) và một bản ở thư mục cha; nếu sửa một bản thì chép sang bản kia.
Quy trình ngắn: chọn **mức giống 1–4** (mặc định 3, hỏi người dùng nếu chưa rõ) → `python -I tools/refkit.py analyze ref.mp4 out/ref` (đo tự động, xác định xương sống thời gian: nhạc, lời hay hình) → xem 4 lượt (tổng quan, 5 khung/giây, từng khung quanh chỗ cắt, ảnh gốc) → đo chi tiết (`pick`, `track`) → viết `projects/<slug>/ref-notes.md` theo mẫu mục 11 của file → dựng → `refkit.py compare` so lặp với mẫu theo thứ tự sửa và ngưỡng dừng ở mục 7.
Nguyên tắc: mọi kết luận về màu, cỡ, nhịp, ease phải đến từ **số đo**, không đến từ ấn tượng. Bạn chỉ "xem" video qua ảnh khung có mốc giờ, số đo và lời nói theo từng từ.
Bản quyền: học **kỹ thuật** của mẫu, **không** dùng lại logo, nhân vật, footage, nhạc, giọng, chữ của mẫu; mức 4 chỉ khi người dùng có quyền với mẫu. Công cụ `refkit.py` cần whisper cho lời nói; **chưa kiểm** trên máy này, chạy `refkit.py` không tham số để xem hướng dẫn, và dùng `--no-words` nếu thiếu whisper.

Quy tắc ngắn: cần motion/UI/3D/glow → kit After Effects. Cần nhiều tập, nhanh, rẻ → `vf`. Nguyên liệu AI (giọng, ảnh, video) luôn lấy từ canvas và Voice Studio.

Chưa có một kit nào cho loại video thứ ba. Khi người dùng thêm kit mới, thêm một dòng vào bảng này và vào `CLAUDE.md` của thư mục cha.

---

## 5. Các thành phần và cổng dịch vụ

| Thành phần | Cổng | Làm gì | Mở bằng |
|---|---|---|---|
| **Infinity Studio** (canvas), agent HTTP | `127.0.0.1:17371` | Tạo ảnh/video/âm thanh AI; agent nhận lệnh từ script | `full studido.exe` hoặc `canvas/app.bat` |
| Canvas web | `3100` | Giao diện canvas | cùng trên |
| Proxy cục bộ | `127.0.0.1:23210` | Cho canvas gọi Voice Studio (tránh CORS), phục vụ file xuất | `app.bat` tự bật |
| **Voice Studio** | `localhost:3900` | Giọng đọc, nhân bản giọng, whisper nhận dạng chữ (API kiểu OpenAI `/v1/audio/speech`, model `omnivoice`) | cài riêng; launcher mở nếu `VOICESTUDIO_EXE` đúng |
| **muse2api** | `127.0.0.1:18610` | Cầu nối Muse (ảnh `muse-image`, video `muse-video`) | `app.bat` tự bật nếu có `pyproject.toml`, hoặc `python -m muse2api` |
| App web `vf` | `localhost:5180` | Timeline, xem trước, khung chat | `edit/chay-app.bat` |
| After Effects + MCP `after-effects` | (qua MCP) | Dựng cho hai kit phong cách | cần panel Claude Bridge "đã kết nối" |

Trước khi gọi bất cứ dịch vụ nào, **kiểm tra nó đang chạy** (ví dụ `canvas_get_state`, `curl http://127.0.0.1:3900/v1/models`). `ConnectionRefused` nghĩa là chưa mở app: nhờ người dùng mở, đợi ~15 giây, thử lại.

`full studido.exe` là launcher: nó mở Electron của canvas và đặt biến `VOICESTUDIO_EXE`. Nó báo lỗi nếu thiếu Electron (`npm --prefix canvas/desktop install`) hoặc chưa build web (`npm --prefix canvas/app/web run build`).

---

## 6. Tạo nguyên liệu AI

### 6.1 Video và ảnh
| Nguồn | Model | Ghi chú |
|---|---|---|
| **Google Flow** (qua canvas) | ảnh `flow::flow-nano-banana-pro` (hoặc `…-2-lite`, `…-2-1`); video `flow::flow-omni-1.2-flash` (tối đa 15 s), `flow::flow-omni-1.1-flash` (tối đa 10 s) | 3–15 giây, 360p/720p. Điều khiển Chrome/Brave thật bằng puppeteer. Có điểm tín dụng, có thể nhiều tài khoản. Hay đòi captcha |
| **Muse** (qua muse2api) | `muse-image`, `muse-video` | Video 1–10 giây, tỉ lệ đặt bằng `aspect_ratio`. **Tạo từng video một, tuần tự.** Bẫy: có tài khoản bị chặn video "không khả dụng ở khu vực này" (đổi tài khoản là được); chạy ngầm liên tục từ lúc mở canvas |
| **ChatGPT image** | | **[thiết kế]** chưa có, sẽ thêm sau |

Gọi canvas bằng `edit/canvas-tools/cv.py` (`call(tên_tool, input)` tới `127.0.0.1:17371`). Token ở `%USERPROFILE%\.infinite-canvas\canvas-agent.json`, **không bao giờ đọc ra, in ra hay commit**. Tool chính: `canvas_get_state`, `canvas_apply_ops`, `canvas_generate_image|video|audio`, `canvas_create_node`, `canvas_run_generation`, `canvas_delete_nodes` (khoá `ids`). Danh sách đầy đủ: `canvas/app/canvas-agent/src/canvas/schemas.ts`. Kiểm tra nhanh Muse: `edit/canvas-tools/muse.py models|test "prompt"` (cần `MUSE2API_KEY` trong terminal).

Quy tắc tạo clip (đã rút ra khi làm thật, chi tiết ở `HE-THONG-TONG-HOP.md` mục 4.4):
- Clip không lời: thêm "no speech, mouth closed, no talking, no text overlays, no captions, no children".
- Không đưa **trẻ em/bé** vào prompt (Flow chặn). Hình giải phẫu: không máu, không ghê.
- Khoá sản phẩm bằng ảnh tham chiếu thật; chữ nhỏ trên bao bì vẫn dễ lệch, phải kiểm từng clip.
- Clip dùng ảnh tham chiếu thường có **khung 0 giây là ảnh trắng**: cắt ~0,3 s đầu.
- Sinh theo **đợt nhỏ** (3 rồi 5–6 clip). Mỗi clip ~1–2 phút. Không chạy hai tiến trình tạo cùng lúc.
- Đừng thu nhỏ hoặc che cửa sổ Flow khi đang tạo.

### 6.2 Lấy file ra đĩa
Node canvas chỉ giữ link `blob:`. Muốn có file thật: node **"Xuất file"** (`export:folder`, người dùng thêm tay một lần), rồi `canvas_apply_ops` đặt `metadata.exportAll=true` và `metadata.exportRequest` bằng **giá trị mới mỗi lần**. Kết quả ở `exports/` kèm `manifest.json`. Nhận diện file bằng `nodeId`/`order`, **không** bằng tên file. Chi tiết: `canvas/TICH-HOP-EDIT.md`.

### 6.3 Giọng đọc
- Tạo bằng **node âm thanh** trên canvas (model `omnivoice`), nhập lời **thẳng vào ô soạn**. **Không nối node văn bản vào node tạo giọng**: giọng sẽ đọc thừa "Văn bản 1".
- Mã giọng khác nhau theo từng máy (`d00dc307`, `70afd348` là của máy gốc). Dùng giọng người dùng chỉ định; **không đổi giọng khi chưa hỏi**.
- Sau khi có giọng: cắt lặng đầu/cuối, whisper nghe lại để lấy mốc từng chữ, chuẩn âm lượng. VoiceStudio hay chèn âm thừa 0,1–0,2 s ở đầu đoạn.
- Viết lời cho TTS: câu ngắn, số bằng chữ, thuật ngữ khó viết theo cách đọc. Xem `edit/kien-thuc/dao-ly/feedback-viet-loi-thoai-cho-voice.md`.
- **Nhân bản giọng chỉ khi chủ giọng đồng ý.**
- Bạn **không nghe được âm thanh**: chỉ kiểm được nội dung và mốc từ bằng whisper, không kiểm được cảm xúc hay độ khớp.

### 6.4 Làm sạch logo AI (CleanPlate) [chưa kiểm]
Công cụ mã nguồn mở `github.com/dieplai/cleanplate` (MIT, Rust CLI cần ffmpeg) xoá dấu hiển thị mà Veo/Gemini/Nano Banana chèn vào video/ảnh. **Chưa cài, chưa thử trong dự án này**, và chưa biết clip từ Flow (Omni) hay Muse có logo hay không. Chỉ đưa vào quy trình sau khi chạy thử một clip thật và thấy logo. Nó không xoá SynthID/C2PA; nhắc người dùng gắn nhãn nội dung AI theo yêu cầu của nền tảng đăng. Tải công cụ về là việc phải hỏi người dùng trước.

---

## 7. Dựng (edit)

### 7.1 Hai kit After Effects
Điều khiển After Effects qua MCP `after-effects` (`ae_run_script`, `ae_render`, `ae_preview_frame`…). Chi tiết quy trình nằm trong kit. Những bẫy làm hỏng nhiều việc nhất:
- **Không gửi lệnh vào AE khi đang render** (hộp thoại chặn AE). Có hộp thoại trong AE thì mọi lệnh MCP treo: nhờ người dùng bấm OK.
- Mỗi `ae_run_script` giữ dưới ~60 giây; chia nhỏ cảnh lớn.
- `saveFrameToPng` ghi bất đồng bộ: chờ file xuất hiện rồi mới đọc.
- Chữ tiếng Việt phải dùng font có dấu (kiểm bằng `talking-head/tools/fonts_vi.py`).
- Danh sách đầy đủ: `saas-animation/knowledge/07-mcp-va-bay-loi.md`, `talking-head/knowledge/07-bay-loi.md`.

### 7.2 Hệ thống `vf` (ffmpeg, không cần AE)
Chạy từ `edit/`: `python -X utf8 -m vf <lệnh>` (luôn có `-X utf8`). Sửa `projects/<tên>/project.json` rồi `vf check` **sau mỗi lần sửa**, `vf render`. Bảng lệnh và luật dựng đầy đủ ở `edit/CLAUDE.md`. Bẫy: clip nguồn đã dọc và canvas 1080×1920 thì **không** dùng `--vertical`.

### 7.3 CapCut
`vf capcut <project> <tên> --audio none` tạo bản nháp từ một **bản nháp mẫu thật** (`TEMPLATE` trong `edit/vf/capcut.py`, mặc định là bản riêng của chủ repo, **không có trong repo**; xem `CAI-DAT.md` mục 6). Không ghi đè bản nháp có sẵn, không sửa khi CapCut đang mở (chỉ sửa bản sao). Zoom chưa mang sang CapCut, track giọng còn thử nghiệm.

### 7.4 B-roll cho talking head [chưa kiểm]
Kit đã có chỗ nhận B-roll: thư mục `assets/broll/`, hàm `T.brollCard`, giai đoạn `broll`, mục "B-roll / thay nền" trong `plan.md`. Việc dùng clip AI từ canvas làm B-roll được `phong-cach/HUONG-DAN-KET-HOP.md` mục 3.3 nêu là điểm ghép giá trị, nhưng **chưa chạy thử trọn vẹn**. Quy tắc: người nói **giới thiệu** ý thì cho thấy mặt; người nói **mô tả hoặc kể ví dụ** thì cho xem hình.

---

## 8. Những việc phải hỏi người dùng trước

- Tạo clip AI số lượng lớn (tốn credit Flow/Muse) khi **kịch bản chưa được duyệt**.
- Tải tư liệu từ internet (nhắc kiểm tra bản quyền; ưu tiên Pexels/Pixabay/CC), tải hay cài công cụ ngoài (như CleanPlate).
- Ghi đè bản nháp CapCut, xoá nhiều cảnh cùng lúc, **đổi giọng đọc**.
- **Đẩy lên GitHub** (repo public) hoặc bất kỳ nơi nào bên ngoài.
- Thêm SFX hoặc sửa bản nháp CapCut: người dùng từng chê SFX do AI tự đặt, **đừng tự thêm khi chưa được dạy**. Với kit SaaS, dùng kho SFX và nhạc đã duyệt trong kit.
- Mọi bước cần xử lý captcha, đăng nhập, cookie tài khoản: để người dùng làm. **Không né kiểm tra bot, không đọc hay in token/API key/cookie.**

---

## 9. Nội dung nhạy cảm và bản quyền

- **Y tế, phụ khoa, thực phẩm bảo vệ sức khoẻ**: dùng "hỗ trợ/giúp/góp phần"; bỏ "trị/điều trị/khỏi/nhanh/100%"; không ảnh trước/sau; có dòng "Thực phẩm bảo vệ sức khỏe, không phải thuốc, không có tác dụng thay thế thuốc chữa bệnh". B-roll dùng sơ đồ hoặc minh hoạ, **không hình cơ thể thật**. Liệt kê mọi câu khẳng định sức khoẻ trong báo cáo để người có chuyên môn duyệt. Chưa có danh sách từ cấm chuẩn (xem `talking-head/knowledge/10` và `CON-THIEU.md`).
- Chủ đề nhạy cảm (series Đạo lý tập 7, 8, 16): cần người có chuyên môn xem trước khi đăng. Không dùng số liệu Việt Nam chưa kiểm chứng.
- **Nhạc**: 8 bài Mixkit trong `saas-animation/audio/music/` dùng cho mạng xã hội/quảng cáo online/YouTube, **không dùng cho TV**, không đăng lại công khai.
- **Tài nguyên ví dụ Foodtage** (SFX, meme, clip, font) thuộc tài liệu khoá học: chỉ để học, không dùng cho video thương mại.
- Ảnh/video AI: theo điều khoản của Google Flow / Muse, tài khoản của chính người dùng. Muse2api là cầu nối không chính thức, có rủi ro điều khoản hoặc khoá tài khoản.
- **Giấy phép**: `voice-studio/` là AGPL-3.0 của tác giả khác, giữ nguyên LICENSE. Các mô hình giọng có giấy phép riêng.

---

## 10. Giới hạn đã biết

- Không nghe được âm thanh; không đọc được nội dung ảnh/video trong canvas qua API (muốn xem phải xuất file rồi `vf look` hoặc `ae_preview_frame`).
- Chưa có quy trình được duyệt cho nhạc nền talking head và cho SFX tiếng Việt.
- Việc nối giọng Voice Studio vào kit After Effects, và chèn đoạn đồ hoạ SaaS vào video `vf`, **chưa chạy thử trọn vẹn**.
- Talking head mới kiểm chứng với tiếng Anh. Chưa có video tiếng Việt, bộ font Việt, phong cách y tế chuẩn.
- Có chỗ **tài liệu mâu thuẫn**: `edit/kien-thuc/muse-canvas.md` nói thư mục `muse2api` không có `src` và chạy từ `E:\antigravyti\infinite-canvas\muse2api\src`; `canvas/muse2api/INFINITY-STUDIO.md` và `CAI-DAT.md` mục 4.6 (cập nhật 2026-11-15, mới hơn) nói `src/` đã nằm trong repo. Tin hai file mới hơn, nhưng kiểm tra thực tế trước khi dựa vào.

---

## 11. Thứ tự đọc khi bắt đầu một việc

1. File này.
2. Xác định **loại video** (mục 4) rồi đọc đúng kit theo bảng ở đó. Chỉ khi người dùng muốn **tạo thể loại mới từ video mẫu** thì đọc `PHAN-TICH-VIDEO-MAU` (mục 4.1); làm video thường thì không cần.
3. Cần nguyên liệu AI: mục 6 ở trên, rồi `HE-THONG-TONG-HOP.md` mục 4–5, `canvas/TICH-HOP-EDIT.md`, `edit/kien-thuc/muse-canvas.md`.
4. Cần cài hoặc sửa lỗi môi trường: `CAI-DAT.md` (mục 9 là bảng lỗi).
5. Cần ghép các hệ thống với nhau: `phong-cach/HUONG-DAN-KET-HOP.md`.
6. Dòng `vf`/series: `edit/CLAUDE.md`, `edit/kien-thuc/`.

## 12. Cách giữ file này đúng

Khi làm xong việc thật hoặc phát hiện bẫy mới: ghi vào file kiến thức của đúng kit (`CHANGELOG.md` của SaaS, `CON-THIEU.md` của talking head, `edit/kien-thuc/`), và **cập nhật nhãn [thiết kế]/[chưa kiểm] ở đây khi chúng đã thành thật**. Không ghi điều chưa kiểm chứng như thể đã chạy được. Không ghi token, key, cookie, mật khẩu vào bất kỳ file nào.
