# Hướng dẫn cài đặt và chạy toàn bộ hệ thống (từ máy sạch)

Làm theo thứ tự từ trên xuống là dùng được cả 3 mắt xích: **Voice Studio** (giọng), **Infinity Studio** (ảnh/video AI), **hệ thống edit** (`vf`, dựng video).
Quy ước: **[đã chạy thật]** = đã chạy trên máy gốc của chủ repo; **[chưa kiểm]** = suy ra từ mã nguồn/tài liệu, chưa thử trên máy sạch. Gặp lỗi, xem mục 9.

---

## 0. Cần chuẩn bị
| Thứ | Ghi chú |
|---|---|
| Windows 10/11 x64 | Hướng dẫn viết cho Windows (các script `.bat`) |
| Ổ cứng trống ≥ 25 GB | Voice Studio + mô hình giọng ~10 GB; video xuất rất nặng |
| RAM ≥ 16 GB | Khuyến nghị. GPU NVIDIA giúp tạo giọng nhanh; không có GPU vẫn chạy bằng CPU (chậm) |
| Tài khoản Google có **Google Flow** | Dùng để tạo ảnh/video; có điểm tín dụng riêng. Repo **không** chứa tài khoản hay điểm |
| Claude Code (CLI hoặc app desktop) | Khung chat trong app edit và để Claude điều khiển hệ thống |
| CapCut (tùy chọn) | Chỉ khi cần xuất bản nháp để sửa tay |

---

## 1. Cài phần mềm nền
Mở **PowerShell thường (không cần Admin)** và chạy (nếu `winget` báo không thấy gói thì tải từ trang chủ):
```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.11 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Gyan.FFmpeg -e
winget install --id Oven-sh.Bun -e
winget install --id astral-sh.uv -e
winget install --id Brave.Brave -e        # hoặc dùng Google Chrome
```
Đóng và mở lại PowerShell, rồi kiểm tra:
```powershell
git --version; python --version; node --version; ffmpeg -version | Select -First 1; ffprobe -version | Select -First 1; bun --version; uv --version
```
Cả 7 lệnh phải in ra phiên bản. `ffmpeg` và `ffprobe` bắt buộc nằm trong PATH (hệ thống dựng gọi thẳng hai lệnh này). Python nên là 3.11; Node 18 trở lên.

Nếu build Voice Studio từ mã nguồn báo thiếu trình biên dịch: cài **Visual Studio 2022 Build Tools** với workload "Desktop development with C++".

---

## 2. Lấy mã nguồn và đặt đúng chỗ
```powershell
mkdir E:\antigravyti
cd E:\antigravyti
git clone https://github.com/hieulan9d/full-studio-.git full-studio
```
Cấu trúc sau khi clone:
```
E:\antigravyti\full-studio\
  canvas\         Infinity Studio
  voice-studio\   Voice Studio
  edit\           hệ thống edit (vf, app web, script, kiến thức)
```
**Vấn đề đường dẫn:** nhiều script trong `edit\` đọc cứng canvas ở `E:\antigravyti\infinite-canvas` (ví dụ file xuất `...\infinite-canvas\exports\manifest.json`), trong khi repo đặt tên thư mục là `canvas`. Cách đơn giản nhất, **không cần sửa code**: tạo liên kết thư mục (không cần quyền Admin):
```powershell
cmd /c mklink /J E:\antigravyti\infinite-canvas E:\antigravyti\full-studio\canvas
```
Sau lệnh này `E:\antigravyti\infinite-canvas` trỏ tới `canvas\`. Có thể dùng ổ khác (không phải `E:`) bằng cách đặt biến môi trường thay vì đổi code, xem mục 6.

---

## 3. Voice Studio (giọng đọc, cổng 3900)
Voice Studio là dự án mã nguồn mở của tác giả khác (debpalash/VoiceStudio, AGPL-3.0). Có hai cách cài; chọn **một**.

### Cách A: chạy từ mã nguồn trong repo **[chưa kiểm trên máy sạch]**
```powershell
cd E:\antigravyti\full-studio\voice-studio
bun install
bun run setup:api      # chuẩn bị môi trường Python (lâu, tải nhiều)
bun run dev            # mở app Electron, tự chạy backend
```
Lần chạy đầu app tự tải mô hình giọng (vài GB). Khi app báo cần mô hình, đồng ý tải. Kiểm tra backend sống:
```powershell
curl http://127.0.0.1:3900/v1/models
```

### Cách B: cài bản phát hành chính thức
Tải bản Windows ở `https://github.com/debpalash/VoiceStudio/releases/latest` và cài như phần mềm thường. App tự quản lý backend và mô hình.

### Tạo giọng đọc của bạn
Trong Voice Studio, mục **Voice cloning**: chọn hoặc thêm file ghi âm tham chiếu sạch của giọng bạn có quyền dùng, đặt tên, lưu. **Chỉ nhân bản giọng khi có sự đồng ý của chủ giọng.** Mỗi giọng có một mã (ví dụ `d00dc307`). Mã này **khác trên mỗi máy**: giọng "thanh thanh tvc" và các mã trong tài liệu (`d00dc307`, `70afd348`) là của máy gốc, bạn phải tạo giọng của bạn và dùng mã của bạn (mục 6).

Thử đọc một câu:
```powershell
cd E:\antigravyti\full-studio\edit
python -X utf8 -c "from vf import tts; print([n for n in dir(tts) if not n.startswith('_')][:12])"
```
(Nếu `ModuleNotFoundError` thì làm mục 5 trước.)

---

## 4. Infinity Studio (canvas ảnh/video, cổng 17371 và 3100)
```powershell
cd E:\antigravyti\full-studio\canvas
npm --prefix app/web install --legacy-peer-deps
npm --prefix desktop install
app.bat
```
`app.bat` tự build web lần đầu (nếu chưa có `app\web\dist`) rồi mở cửa sổ riêng của phần mềm. **Lưu ý:** `app.bat` không tự cài thư viện của `app/web`, nên hai lệnh `npm install` ở trên là bắt buộc làm trước.

### 4.1 Đăng nhập Google Flow
App mở một cửa sổ **Chrome/Brave thật** (profile riêng, cổng debug 9333). Trong đó đăng nhập tài khoản Google của bạn, vào `https://flow.google.com`, mở (hoặc tạo) một project Flow. App tự nhớ project. Google chặn đăng nhập trong cửa sổ Electron, nên bắt buộc dùng cửa sổ trình duyệt này. **Giữ cửa sổ này mở, không thu nhỏ/che khuất khi đang tạo.**
Biến môi trường tùy chọn: `FLOW_BROWSER` (đường dẫn trình duyệt). Quản lý nhiều tài khoản: Cài đặt → Tài khoản Flow.

### 4.2 Nhập cấu hình canvas
1. Cài đặt (bánh răng) → **Nhập cài đặt** → chọn `canvas\flow-canvas\import-flow-config.json`.
2. Nhập xong có: kênh Google Flow (model ảnh `flow-nano-banana-pro`; video `flow-omni-1.2-flash`, `flow-omni-1.1-flash`) và nhà cung cấp **VoiceStudio** (`http://127.0.0.1:3900/v1`, model `omnivoice`, loại Âm thanh).
3. Nhập cài đặt **ghi đè** cài đặt hiện có. Nếu đã điền khóa khác, nhập lại sau.
4. Bật **Proxy cục bộ** (Cài đặt → Proxy cục bộ, `http://127.0.0.1:23210`) nếu chưa bật; `app.bat` đã tự chạy proxy này. Proxy cần để gọi Voice Studio từ canvas (tránh CORS).

### 4.3 Thêm node "Xuất file" (bắt buộc, làm một lần)
Để lấy ảnh/video/giọng thành file thật trên đĩa:
1. **Node plugin → Cục bộ → bật "Xuất file ra thư mục"**.
2. Thêm node **"Xuất file"** vào canvas. Phải do bạn thêm tay, agent không tạo được node plugin.
3. File xuất nằm ở `E:\antigravyti\infinite-canvas\exports\` kèm `manifest.json` (tạo thư mục khi xuất lần đầu). Đổi nơi xuất bằng biến `CANVAS_EXPORT_DIR` khi chạy proxy.

### 4.4 Kiểm tra agent điều khiển canvas
Agent (cổng 17371) do app tự bật; token tự tạo ở `%USERPROFILE%\.infinite-canvas\canvas-agent.json`. Sau khi mở app đợi ~15 giây, rồi:
```powershell
cd E:\antigravyti\full-studio\edit
python -X utf8 -c "import sys; sys.path.insert(0,'canvas-tools'); import cv; r=cv.call('canvas_get_state',{})['result']; print('canvas OK, nodes =',len(r['nodes']))"
```
In ra `canvas OK` là Claude/script điều khiển được canvas. Nếu `ConnectionRefused`: app chưa mở xong hoặc agent chưa lên (mục 9).

### 4.5 Thử tạo một ảnh và một giọng ngay trong canvas
- **Ảnh:** tạo node cấu hình, chọn `flow::flow-nano-banana-pro`, kích thước 9:16, nhập prompt, bấm Tạo. Lần đầu Flow có thể đòi captcha: xử lý trong cửa sổ trình duyệt Flow.
- **Giọng:** tạo **node âm thanh**, chọn model của VoiceStudio (`omnivoice`), mở Cài đặt âm thanh → **Tải danh sách giọng** → chọn giọng của bạn, gõ lời **trực tiếp vào ô soạn của node âm thanh** rồi bấm tạo. **Đừng nối một node văn bản vào node tạo giọng**: nhãn node sẽ bị đọc thừa ("Văn bản 1…").

---

## 5. Hệ thống edit (`vf`, app web)
```powershell
cd E:\antigravyti\full-studio\edit
pip install -r requirements.txt
python -X utf8 -m vf --help
```
Luôn chạy bằng `python -X utf8 -m vf ...` (tránh lỗi tiếng Việt trên console Windows). Các lệnh chính: `ls`, `check`, `render`, `voice`, `capcut`, `look`… (xem `edit\CLAUDE.md` và `HE-THONG-TONG-HOP.md`).

Chạy app web (timeline + xem trước + khung chat Claude):
```powershell
python app/server.py        # hoặc chay-app.bat, mở http://localhost:5180
```
Khung chat dùng lệnh `claude` (Claude Code) trong PATH, đăng nhập bằng tài khoản của bạn; không cần API key riêng.

### Mở Claude Code để Claude làm thay bạn
Mở Claude Code **trong thư mục `E:\antigravyti\full-studio\edit`**. Claude sẽ tự đọc `CLAUDE.md`, và các tài liệu trong `kien-thuc\` khi bạn giao việc ("làm tập N Đạo lý", "làm video USP cho sản phẩm X"…).

---

## 6. Chỉnh cấu hình theo máy của bạn
| Cần chỉnh | Ở đâu | Sửa gì |
|---|---|---|
| Canvas không ở `E:\antigravyti\infinite-canvas` | Biến môi trường `CANVAS_MANIFEST` (script `ep.py`) | Đặt thành đường dẫn tới `exports\manifest.json` thật. Các `projects\dao-ly-tapN\build_project.py` có dòng `manifest.json` cứng: sửa nếu làm lại series Đạo lý |
| Mã giọng | `voice.profile` trong `projects\<tên>\project.json`; hằng `PROFILE` trong `projects\dao-ly-tapN\make_voice.py` | Thay bằng mã giọng của **bạn** (mục 3) |
| Thư mục nháp CapCut | `DRAFTS` trong `edit\vf\capcut.py` | Đổi thành thư mục bản nháp CapCut của bạn (thường `...\CapCut\User Data\Projects\com.lveditor.draft`) |
| **Mẫu CapCut** | `TEMPLATE` trong `edit\vf\capcut.py` (mặc định là bản nháp riêng của chủ repo, **không có trong repo**) | Xuất CapCut cần một **bản nháp CapCut thật của bạn làm khuôn** (có ít nhất một track âm thanh với ≥ 5 đoạn). Làm một bản nháp mẫu trong CapCut rồi trỏ `TEMPLATE` tới đó. Nếu chưa làm, bỏ qua lệnh `vf capcut` (phần còn lại vẫn chạy) |
| Thư mục thành phẩm Đạo lý | `D:\đạo lý` trong tài liệu | Chép video ra nơi bạn muốn |
| Kho SFX | `D:\tai nguyen premre\sfx` (máy gốc) | Dùng thư viện SFX riêng của bạn |

`vf` dùng cổng Voice Studio `localhost:3900` (hằng `BASE` trong `vf\tts.py`); đổi nếu bạn chạy cổng khác.

---

## 7. Kiểm tra toàn hệ thống (smoke test)
Làm lần lượt; mỗi bước phải qua mới tiếp.

1. **Voice Studio sống:** `curl http://127.0.0.1:3900/v1/models` có trả về danh sách.
2. **Canvas sống:** chạy lệnh ở mục 4.4 ra `canvas OK`.
3. **Tạo 1 giọng ngắn** bằng node âm thanh (mục 4.5), xuất file (đặt `exportRequest` mới), file `.wav/.mp3` xuất hiện trong `exports\` và có trong `manifest.json`.
4. **Tạo 1 clip 4 giây** (`flow::flow-omni-1.2-flash`, 9:16, 720p, có ảnh tham chiếu), xuất file như trên.
5. **Dựng thử:** tạo `projects\thu\project.json` với 1 clip (`src` trỏ file xuất), chạy:
   ```powershell
   python -X utf8 -m vf check projects/thu/project.json
   python -X utf8 -m vf render projects/thu/project.json projects/thu/thu.mp4 --no-audio
   ```
   (Clip đã dọc và `canvas` là 1080×1920 thì **không** dùng `--vertical`.) Có `thu.mp4` mở được là xong.
6. (Tùy chọn) `python -X utf8 -m vf capcut projects/thu/project.json thu --audio none` sau khi đã đặt `DRAFTS` và `TEMPLATE`.

Qua đủ các bước là toàn bộ hệ thống chạy.

---

## 8. Làm video đầu tiên
- **Video USP sản phẩm (30–45 s):** đọc `edit\kien-thuc\HE-THONG-TONG-HOP.md` mục 6.2. Đưa ảnh sản phẩm lên canvas làm tham chiếu, nhờ Claude viết kịch bản an toàn (hỗ trợ, không "trị"), sinh clip không lời, tạo giọng bằng node âm thanh, canh cảnh theo mốc giọng, render.
- **Series Đạo lý:** `edit\kien-thuc\dao-ly\PHONG-CACH-DAO-LY.md`; `python -X utf8 canvas-tools/new_ep.py N` tạo dự án từ kịch bản có sẵn.
- Giao việc cho Claude bằng tiếng Việt trong Claude Code; Claude sẽ sửa `project.json` và chạy `vf`.

---

## 9. Lỗi thường gặp
| Hiện tượng | Cách xử lý |
|---|---|
| `ConnectionRefused` ở cổng 17371 | Mở `canvas\app.bat`, đợi ~15 giây, thử lại. Nếu vẫn lỗi, tắt hẳn app (cả tiến trình Electron) rồi mở lại |
| `app.bat` báo lỗi build hoặc trắng trang | Chưa chạy `npm --prefix app/web install --legacy-peer-deps`; chạy rồi `npm --prefix app/web run build` |
| Flow không nhận lệnh / báo "hoạt động bất thường" / captcha | Đảm bảo cửa sổ Flow đã đăng nhập, không bị thu nhỏ hay che; xử lý captcha thủ công; sinh theo đợt nhỏ, cách nhau vài giây |
| Hết điểm Flow | Kiểm tra điểm ở Cài đặt → Tài khoản Flow; thêm tài khoản khác nếu cần |
| Giọng đọc thừa "Văn bản 1" | Dùng node âm thanh nhập lời trực tiếp, không nối node văn bản |
| Giọng thừa âm đầu / rớt chữ | Cắt lặng đầu cuối, nghe lại bằng whisper (`vf.tts.transcribe`), tạo lại tối đa vài lần |
| Gọi Voice Studio từ canvas báo "Yêu cầu thất bại" / 401 | Bật Proxy cục bộ; chọn model của nhà cung cấp VoiceStudio, không phải model OpenAI |
| `vf` báo lỗi tiếng Việt trên console | Luôn chạy `python -X utf8 -m vf ...` |
| `ffmpeg`/`ffprobe` not found | Cài lại FFmpeg và mở lại PowerShell; kiểm tra `ffmpeg -version` |
| `render --vertical` báo lỗi crop | Nguồn đã dọc: bỏ `--vertical` |
| `vf capcut` lỗi hoặc không tìm thấy mẫu | Chưa đặt đúng `DRAFTS`/`TEMPLATE` (mục 6) |
| Sửa bản nháp CapCut bị mất | CapCut đang mở sẽ ghi đè: đóng CapCut hoặc sửa trên bản sao |
| Xuất file không ra | Node "Xuất file" chưa có/không trong khung nhìn; `exportRequest` trùng lần trước (phải đổi giá trị mỗi lần) |

---

## 10. Cập nhật, sao lưu, bảo mật
- Cập nhật: `cd E:\antigravyti\full-studio; git pull`, rồi chạy lại `npm install` ở `canvas/app/web` và `canvas/desktop` nếu `package.json` đổi.
- **Không commit** token agent, file `*.local.json`, khóa API, `.flow-project-id`, hay cơ sở dữ liệu canvas. Dữ liệu canvas nằm ở `%APPDATA%\infinite-canvas-flow` (đổi: Cài đặt → Lưu trữ cục bộ). Sao lưu bằng "Xuất canvas / Xuất tài sản / Xuất cài đặt".
- Video, ảnh, giọng đã tạo **không** nằm trong repo; sao lưu riêng.
- Giấy phép: giữ nguyên LICENSE từng phần; `voice-studio/` là **AGPL-3.0**, mô hình giọng có giấy phép riêng.
