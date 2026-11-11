# Kiến thức: canvas tạo ảnh/video qua Google Flow

Tài liệu để sửa/fix sau này. Mô tả cách canvas làm việc với Flow, các file liên quan, các "bẫy" đã gặp.
FlowKit (Python agent :8100 + extension Chrome) **không còn dùng**; thư mục `flowkit/` chỉ còn là di sản.

## 1. Tổng quan

```
Canvas (web, :3100)                       Electron main process                      Chrome/Brave thật
┌──────────────────────┐   IPC (preload)  ┌────────────────────────┐  CDP :9333   ┌────────────────────┐
│ script model "flow"  │ ───────────────▶ │ flow-driver.js         │ ───────────▶ │ trang Flow project │
│ flow-image/video-    │ window.desktop   │ (puppeteer-core)       │  page.evaluate│ flow-page-driver.js│
│ script.js            │ .flow.generate*  │ hàng đợi, tài khoản,   │              │ điền prompt, ảnh,  │
└──────────────────────┘ ◀─────────────── │ điểm, tải kết quả      │ ◀─────────── │ cài đặt, bấm tạo   │
        blob / data URL      {data,mime}  └────────────────────────┘   kết quả    └────────────────────┘
```

- Google **chặn đăng nhập trong cửa sổ Electron**, nên app mở một trình duyệt Chromium thật (ưu tiên Brave > Chrome > Edge, hoặc biến môi trường `FLOW_BROWSER`) với profile riêng, bật cổng debug `127.0.0.1:9333`, rồi điều khiển bằng `puppeteer-core` (ES Module: `await import("puppeteer-core")`).
- Canvas coi Flow như một **kênh model** (id `flow`) có "script yêu cầu model" (JS chạy trong trang canvas). Script gọi `window.desktop.flow.generateVideo/generateImage`.
- Chỉ chạy trong app desktop (`app.bat`). Trình duyệt thường không có `window.desktop`.

## 2. Các file

| File | Vai trò |
|---|---|
| `flow-canvas/flow-video-script.js` | Script model video (canvas → IPC). Map model, ratio, giây, chế độ ảnh, đổi tên ảnh tham chiếu. |
| `flow-canvas/flow-image-script.js` | Script model ảnh. Trả mảng data URL. |
| `flow-canvas/import-flow-config.json` | Cấu hình nhập: kênh Flow (+ Muse, VoiceStudio, mặc định), key để trống. |
| `flow-canvas/import-full-config.local.json` | Bản có API key, **gitignore** (`*.local.json`). Không commit. |
| `desktop/flow-driver.js` | Main process: mở trình duyệt, kết nối CDP, hàng đợi, tài khoản, điểm, tải kết quả, IPC. |
| `desktop/flow-page-driver.js` | Bơm vào trang Flow: `window.__flowUi = {submit, poll, ...}`. Đọc lại file **mỗi lần tạo** nên sửa file này không cần mở lại app. |
| `desktop/preload.js` | Phơi `window.desktop.flow.*`. |
| `desktop/main.js` | Gọi `flow.setup(app)`, `syncFlowScripts()` (chép script + sửa danh sách model vào localStorage canvas). |
| `app/web/src/components/layout/config-flow-accounts.tsx` | Tab Cài đặt → "Tài khoản Flow". |

Sửa code **main process** (`flow-driver.js`, `main.js`, `preload.js`) → phải đóng hẳn và mở lại app.
Sửa `flow-page-driver.js` → có hiệu lực ngay lần tạo sau. Sửa `app/web/src` → `npm --prefix app/web run build` rồi mở lại app (`app.bat` chỉ build khi chưa có `dist`).

## 3. Luồng một lần tạo

1. Script canvas gọi `desktop.flow.generateVideo({prompt, model, mode, aspect, resolution, seconds, count, images:[{base64,mime,name}]})` (ảnh: `generateImage({prompt, model, ratio, quality, count, images})`).
2. `enqueue()` đưa vào hàng đợi tuần tự (mỗi lúc chỉ một lệnh).
3. `generate(job)`:
   - `pickAccountWithCredits(job)`: đọc điểm tài khoản đang dùng; < ngưỡng thì đổi sang tài khoản khác (mục 6), rồi gọi lại `ensureProjectPage()` để chờ ô nhập sẵn sàng (đọc điểm có thể đã chuyển trang).
   - `ensureProjectPage()` đưa trình duyệt tới `https://flow.google.com/project/<id>` (nếu đang ở `/edit/` thì quay về).
   - `page.bringToFront()` + `closeAccountMenu(page)`: cửa sổ bị thu nhỏ/che làm trang Flow ở trạng thái `hidden` và bỏ qua cú bấm; menu tài khoản còn mở thì phủ lên trang và nuốt cú bấm.
   - `inject(page)` nạp `flow-page-driver.js`.
   - `__flowUi.submit(job + trustedClick)`: chờ ô nhập (tối đa 20 giây), xóa composer, chọn cài đặt, tải ảnh lên và gắn, điền prompt, chụp **baseline**, trả vị trí nút tạo.
   - Electron bấm nút bằng **chuột thật** (`page.mouse.click`). Click giả `el.click()` bị Flow bỏ qua.
   - Xác nhận Flow nhận lệnh: trong tối đa 12 giây, ô nhập phải trống hoặc xuất hiện ô đang chạy (NN%); sau 6 giây chưa có gì thì bấm lại đúng một lần. Không nhận → báo lỗi kèm nội dung hộp thoại Flow đang hiện.
   - Lặp mỗi 5 giây: `__flowUi.poll({baseline, expect, t0, kind})` → `running | done | failed`. Tối đa 10 phút.
     - **Video** (`pollVideo`): ô mới nhất nằm **đầu lưới**. Phải thấy ô đang chạy (NN%) của chính lệnh này ở đầu lưới (`seen`), rồi các ô đầu lưới (đủ `expect`) hết % và có thumbnail mới là `done`. Ô đầu lưới là ô lỗi (`flow-error-tile` nằm trong `flow-video-tile`, chữ "Không thành công") → `failed` ngay. 2 phút không thấy ô mới → `failed`. Không dùng "video mới bất kỳ" vì video của các lần trước có thể vừa xong.
     - **Ảnh**: so URL ảnh mới (bỏ query) với baseline.
4. Tải kết quả:
   - **Ảnh**: URL `flow-content.google/image/...` hoặc `flow.google.com/asb/...`, tải bằng Node `fetch` kèm cookie (`page.cookies`).
   - **Video** (`downloadVideoViaUi`): thumbnail chỉ là JPEG nên không dùng. Mở ô video → nút "Tải nội dung nghe nhìn xuống" → chọn mục **"Kích thước gốc"** (chuẩn hóa Unicode NFC rồi so `/gốc|original/`; nếu không thấy thì lấy mục không phải GIF/"đã tăng độ phân giải") → file về thư mục tạm qua CDP `Browser.setDownloadBehavior` → đọc rồi xóa → quay về trang project. Video 360p cho ra 640×360, 720p cho ra 1280×720.
5. Trả `{ok, items:[{data,mime}]}`; script canvas đổi sang Blob / data URL. Sau đó đọc lại điểm.

## 4. Cấu trúc giao diện Flow mà driver dựa vào (dễ vỡ khi Flow cập nhật)

- Ô nhập: `.ProseMirror`; nút tạo `aria-label="Bắt đầu tạo"`; khung `.base-prompt-box`.
- Nút cài đặt: `button.settings-trigger-button` → popover gồm `button[role=radio]` (icon: `image`, `videocam`, `crop_free`=Khung hình, `chrome_extension`=Thành phần, `crop_16_9`, `crop_9_16`, `crop_square`, `x1`–`x4`, chất lượng ảnh Thấp/Trung bình/Cao).
- Model: nút có `arrow_drop_down` → danh sách `[role=option]`. Video hiện chỉ dùng **Omni 1.2 Flash** và **Omni 1.1 Flash** (Veo đã bỏ). Ảnh: Nano Banana Pro / 2 Lite / 2.1.
- Thời lượng: `input.mdc-slider__input`, giây = giá trị + 3 (3–15 giây). **Omni 1.2 Flash tối đa 15 giây, Omni 1.1 Flash tối đa 10 giây** (giới hạn ở `flow-video-script.js` và `video-settings-panel.tsx`). Độ phân giải chỉ **360p / 720p** (panel canvas chỉ hiện hai nút này khi chọn model Flow).
- Chọn ảnh: nút `aria-label="Thêm thành phần vào ô nhập câu lệnh"` → hộp trong `.cdk-overlay-container` (`input.search-input`, `button[role=option].asset-item`, nút "Thêm vào câu lệnh"). Tải lên: nút ở `.sidebar-footer` → `input[type=file]` ẩn, bắt bằng cách vá `HTMLInputElement.prototype.click`, gán file qua `DataTransfer`.
- Gõ `@` (cần khoảng trắng đứng trước) mở hộp chọn; chọn xong chèn `.mention-chip`.
- Chế độ **Khung hình**: hai ô `.frame-trigger button` ("Bắt đầu"/"Kết thúc"), không có nút "+".
- Ô video: `flow-video-tile`; ô lỗi: `flow-error-tile`. Ô đang chạy có chữ "NN%".

## 5. Bẫy đã gặp và cách xử lý

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Google "Couldn't sign you in" | Đăng nhập trong Electron | Dùng Chrome/Brave thật + CDP |
| `require() of ES Module puppeteer-core` | puppeteer-core là ESM | `await import("puppeteer-core")` |
| Flow "hoạt động bất thường" khi chạy ẩn | Chống tự động của Google với headless | Luôn dùng **cửa sổ thật** (có thể thu nhỏ). Không cố giả dạng/né kiểm tra bot. |
| Click tạo không có tác dụng | `el.click()` bị bỏ qua | Click chuột thật qua `page.mouse.click` |
| Ảnh luôn "đang chạy", không về | `poll` thiếu `kind` nên đi tìm video | Truyền `kind` vào `poll` |
| Lấy nhầm ảnh cũ/ảnh khách | URL ảnh có chữ ký (`?Expires&Signature`) đổi liên tục nên baseline lệch | So sánh theo URL đã bỏ query (`keyOf`); bỏ ô đang chạy (%) |
| Canvas nhận ảnh JPEG thay vì video, trình phát rỗng | Thumbnail ô video chỉ là JPEG; trình phát Flow không dùng `<video>` | Mở video → nút "Tải nội dung nghe nhìn xuống" → chọn "Kích thước gốc"/720p → tải qua CDP `Browser.setDownloadBehavior` (`downloadVideoViaUi`) |
| "Không tìm thấy ô video vừa tạo" | Địa chỉ thumbnail đổi sau khi phát hiện | Khớp theo key, không khớp thì lấy ô mới nhất chưa có trong baseline, cuối cùng là ô đầu lưới |
| `UI_TIMEOUT: asset picker (retry)` | Hộp chọn mở chậm; bấm lần 2 lại đóng hộp | Đóng bảng cài đặt trước, chờ 7 giây, chỉ bấm lại nếu chưa mở |
| `UI_TIMEOUT: mention picker` | Prompt bắt đầu bằng tên ảnh, `@` không có khoảng trắng trước | Chèn khoảng trắng trước `@` |
| `UI_NO_ELEMENT` ở chế độ Khung hình | Không có nút "+" | Dùng `.frame-trigger button`, thử lại tối đa 3 lần |
| "Việc tạo bị gián đoạn do tải lại trang" | Canvas bị tải lại (Ctrl+R, mở lại app) giữa lúc tạo | Đừng tải lại/khởi động lại khi đang tạo |
| Canvas báo 503 / script cũ | App còn script FlowKit trong localStorage | `syncFlowScripts()` chép script mới mỗi lần mở app |
| Canvas Agent (:17371) mất sau khi mở lại | Tiến trình cũ còn sót | Vòng 30 giây tự bật lại; đợi ~15 giây giữa lúc tắt và mở |
| Video 360p tải về thành 720p | Chọn mục "Kích thước gốc" bằng so chữ, bị lệch dạng ký tự Unicode nên không khớp, rơi về mục "720p" (đã tăng độ phân giải) | Chuẩn hóa NFC, so `/gốc|original/`, loại GIF và "đã tăng" |
| Tải nhầm video khác khi video thật chưa xong | Coi "video mới bất kỳ" là xong; video của lần trước vừa xong | `pollVideo`: phải thấy ô chạy ở đầu lưới rồi mới nhận xong |
| "Flow không nhận lệnh tạo" | (1) menu tài khoản còn mở phủ trang; (2) cửa sổ bị thu nhỏ/che nên trang `hidden`; (3) kiểm tra quá sớm (1,5 giây) | `closeAccountMenu` (nút "close", Escape không đủ), `bringToFront`, chờ tới 12 giây + bấm lại một lần |
| `UI_NO_EDITOR` | Sau đọc điểm app chuyển trang rồi gửi lệnh trước khi ô nhập tải xong | `ensureProjectPage()` lại sau khi đọc điểm; `submit` chờ ô nhập 20 giây |
| Flow hiện "Không thành công – hoạt động bất thường" (cả khi cửa sổ thật) | Cơ chế chống lạm dụng của Flow, xuất hiện lẻ tẻ, thường không tính điểm | Thử lại; tránh tạo dồn dập. **Không** né/giả dạng kiểm tra bot. App báo lỗi ngay nhờ nhận ô lỗi trong tile |
| Menu Flow không thấy | Menu ẩn | Menu Flow đã bỏ; quản lý ở Cài đặt → Tài khoản Flow |

Mẹo debug: kết quả MCP của canvas rất lớn (>120k ký tự) được lưu ra file → dùng grep `errorDetails`. Log phía app in `[flow] <ảnh|video>: ...`.

## 6. Nhiều tài khoản và điểm

- Cấu hình `D:\infiniti canvas\flow-driver.json` (thư mục dữ liệu app): `{ accounts:[{id,name,profile,projectId,email,credits,creditsAt}], active, minCredits:{image,video} }`. Bản cũ chỉ có `projectId` tự chuyển thành "Tài khoản 1".
- Mỗi tài khoản có profile trình duyệt riêng `flow-browser-profile[-<id>]` và project Flow riêng (app tự nhớ project khi bạn mở trong cửa sổ Flow, qua `targetchanged`).
- Điểm đọc từ menu tài khoản Google góc phải Flow ("1.038 tín dụng Google Flow"), nút `aria-label` bắt đầu bằng "Tài khoản Google". Không có nút ở trang hiện tại thì ghé trang chủ `flow.google.com` rồi quay lại.
- Trước mỗi lần tạo: tài khoản đang dùng < `minCredits` (mặc định **50**, cho cả ảnh và video) → lần lượt thử tài khoản khác có project. Mọi tài khoản đều thiếu → báo lỗi kèm điểm từng tài khoản. Đọc điểm thất bại thì cứ chạy.
- IPC: `flow:accounts`, `flow:switch-account`, `flow:add-account`, `flow:remove-account`, `flow:rename-account`, `flow:open-account`, `flow:refresh-credits`, `flow:set-min-credits`, `flow:status`, `flow:show`, `flow:generate-video`, `flow:generate-image`.
- Đổi tài khoản = đóng trình duyệt cũ và mở lại với profile mới (mất vài giây). Đổi chỉ chạy trong hàng đợi, không cắt ngang lệnh đang tạo.

## 7. Model

- Video: `flow-omni-1.2-flash` (Omni 1.2 Flash), `flow-omni-1.1-flash` (Omni 1.1 Flash). Script còn hiểu tên cũ `flow-omni-flash`, `flow-omni-flash-11`.
- Ảnh: `flow-nano-banana-pro`, `flow-nano-banana-2-lite`, `flow-nano-banana-2-1`.
- `syncFlowScripts()` mỗi lần mở app: chép script, đổi tên kênh "Google Flow (tự động)", bỏ model `flow-veo-*`, đổi tên model cũ sang mới, đổi model mặc định trỏ tên cũ.
- Chế độ ảnh video: ≤ 2 ảnh và `params.mode !== "reference"` → **Khung hình** (đầu/cuối); còn lại → **Thành phần** (ảnh tham chiếu). Ảnh đặt tên theo tên node (nhãn `Ảnh N (tên node)` trong prompt, ≤ 24 ký tự).

## 8. Đã kiểm tra / chưa kiểm tra

Đã chạy thật qua canvas: ảnh có ảnh tham chiếu; video Omni 1.2 Flash 4 giây ở 360p (ra 640×360) và 720p (ra 1280×720); đọc điểm; tab Tài khoản Flow.

Chưa kiểm tra hoặc chưa chắc:
- Tự đổi tài khoản khi hết điểm (logic đã viết, chưa chạy thật); chi phí điểm của từng lệnh chưa rõ, ngưỡng 50 chỉnh bằng `minCredits`.
- Chế độ Khung hình 2 ảnh, `count > 1`, Omni 1.1 Flash, 15 giây.
- Flow hay đổi giao diện: khi hỏng, kiểm tra mục 4 trước (chạy script ở `page.evaluate` để xem selector nào không còn).
- Menu tài khoản Google (xem điểm) nằm ở góc phải trang Flow; nút đóng là `button` có chữ "close".
