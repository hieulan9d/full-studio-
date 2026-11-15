# SaaS AE Kit — AI dựng video SaaS animation trong After Effects

Thư mục này biến **một brief** thành **một video SaaS animation** (kiểu quảng cáo phần mềm:
nền tối, cột sáng, giao diện kính, chữ blur-in, chuyển cảnh liền) bằng cách điều khiển
After Effects qua MCP (`mcp__after-effects__*`). Người dùng không phải duyệt từng bước.

Trả lời người dùng bằng **tiếng Việt**. Không gửi ảnh chụp vào chat trừ khi họ hỏi;
ảnh kiểm tra chỉ để AI tự xem.

## Đọc trước khi làm (theo thứ tự)

1. `knowledge/01-phong-cach.md` — ngôn ngữ hình ảnh, con số chuẩn (màu, sáng, cỡ khung).
2. `knowledge/02-nhip-chuyen-dong.md` — BPM, ease, so le, chuyển cảnh.
3. `knowledge/03-thu-vien-canh.md` — danh mục loại cảnh + hàm thư viện tương ứng.
4. `knowledge/07-mcp-va-bay-loi.md` — **bắt buộc**: các bẫy đã gặp, cách kiểm tra.
5. Khi cần: `04-cong-thuc-ae.md` (công thức kỹ thuật), `05-giao-dien-ui.md` (UI chi tiết),
   `06-du-an-ae.md` (cấu trúc project), `08-qc.md` (kiểm tra), `09-vi-du-neuraflow.md` (ví dụ đầy đủ).

## Đầu vào

Mỗi video là `projects/<slug>/`:
- `brief.md` theo `brief-template.md` (người dùng viết). Không tự sửa brief của người dùng.
- `assets/` (tuỳ chọn): `logo.png|svg`, `music.mp3|wav`, `sfx/*.wav`, `screens/*.png` (ảnh UI thật), `ref.mp4` (video tham chiếu).

Đầu ra ở `output/<slug>/`: `<slug>.aep`, `frames/`, `<slug>_vN.mp4`, `contact.jpg`, `report.md`.

## Quy trình

Làm tuần tự, mỗi bước xong mới sang bước sau. Ghi tiến độ vào `projects/<slug>/log.md` (1–2 dòng/bước).

1. **Kiểm tra môi trường.** `ae_status` (panel "Claude Bridge" phải kết nối). Nạp thư viện:
   ```js
   $.evalFile(File("<KIT>/lib/saas-lib.jsx")); $.evalFile(File("<KIT>/lib/ui-dashboard.jsx")); var H = $.global.H; H.pickFonts();
   ```
   `<KIT>` là đường dẫn tuyệt đối tới thư mục này, dùng dấu `/`. Nạp lại sau mỗi lần AE khởi động lại.
2. **Đọc brief + tài sản.** Nếu có `ref.mp4`: `bash tools/analyze-ref.sh assets/ref.mp4 output/<slug>/ref`
   rồi xem các sheet và `beats.txt`, viết `projects/<slug>/ref-notes.md` (bảng cảnh theo giây như
   `09-vi-du-neuraflow.md`). Nếu có nhạc: đo BPM bằng `tools/beats.py`. Không có nhạc: dùng lưới 120 BPM
   (1 phách 0,5 s, mốc cảnh mỗi 1,0 s).
3. **Storyboard.** Viết `projects/<slug>/storyboard.md` theo `templates/storyboard.md`:
   mỗi cảnh = loại cảnh trong `03-thu-vien-canh.md`, mốc vào/ra **đặt trên lưới nhịp**, chữ chính xác,
   layer cần có, chuyển động, cách nối sang cảnh sau. Tự soát với checklist "Storyboard" trong `08-qc.md`.
4. **Dựng project.** Project mới (nếu AE đang mở project có thay đổi chưa lưu → hỏi người dùng trước),
   `H.setupFolders()`, lưu ngay vào `output/<slug>/<slug>.aep`. Bảng màu: `H.palette({...})` theo brand.
   Dựng `ENV_Space`, `ENV_Planet`, comp `MAIN` (1920×1080, 30 fps, đúng thời lượng).
5. **Viết `projects/<slug>/build.jsx`** bằng cách chép `projects/orbiq/build.jsx` (mẫu đã chạy thật, ra video) và đổi
   `CFG` (tên, HUE, mốc, nội dung UI, chat, thẻ). Chạy từng giai đoạn `BUILD.stage(1..5)`, mỗi giai đoạn một
   `ae_run_script`. Cảnh không có trong mẫu thì thêm hàm vào build.jsx bằng các hàm của `lib/`.
   **Dựng từng cảnh** (một precomp/cảnh, tên `S01_…`). Sau MỖI giai đoạn: xuất 4–6 khung
   (`H.saveFrames` → `tools/wait-files.sh` → `tools/sheet.sh`), xem, sửa theo `08-qc.md`.
   Không dựng hết rồi mới xem.
6. **Ghép MAIN** theo mốc storyboard, chồng 0,1–0,2 s ở chỗ nối, `H.finishMain(main)` (chỉnh màu, bloom,
   vignette). Nhạc vào `05_MUSIC`, SFX vào `04_SFX` đặt trên mốc chuyển động (xem `02-nhip-chuyen-dong.md`).
7. **QC toàn bộ.** Xuất khung mỗi 0,5 s + dày (0,1 s) quanh mọi chỗ chuyển cảnh. Nếu có ref:
   `tools/compare.sh` ở 8–12 mốc. Sửa mọi lỗi mức "chặn" trong `08-qc.md`.
8. **Render** `ae_render` → `output/<slug>/<slug>_vN.mp4` (template `H.264 - Match Render Settings - 15 Mbps`).
   **Trong lúc render không gửi bất kỳ lệnh nào vào AE.** Sau đó tạo `contact.jpg` (khung mỗi 1 s) và
   viết `output/<slug>/report.md` theo `templates/report.md`.
9. Lưu project. Báo người dùng: đường dẫn video, những gì giống/khác brief, lỗi còn giữ lại.

Vòng sửa theo góp ý người dùng: đọc góp ý → tìm đúng comp/layer → sửa → xuất khung kiểm tra →
render bản `_v(N+1)`. Nếu góp ý chung chung ("chưa đẹp"), tự đặt bản dựng cạnh tham chiếu
(`compare.sh`), liệt kê các điểm khác biệt lớn nhất rồi sửa theo thứ tự tác động.

## Luật dựng (tóm tắt — chi tiết ở knowledge/)

- Chuyển động bằng **keyframe**. Expression chỉ cho: chuyển động lặp (sao, Evolution `time*k`),
  đổi số thành chữ (counter), độ mờ theo hướng mặt 3D. Không dùng expression cho nhịp cảnh.
- Mỗi cảnh một precomp; layer có tên theo vai trò (`TXT_`, `UI_`, `ICON_`, `NULL_`, `BG_`, `ENV_`,
  `ADJ_`, `FX_`, `SFX_`); label màu theo nhóm; null gom chuyển động.
- **Gắn parent trước, keyframe sau.** Hoặc dùng `H.attach`. Không gắn parent khi cha đang scale ≠ 100.
- Một vật thể đi xuyên suốt một chuyển động — **không cross-fade hai bản dựng khác nhau của cùng vật**.
- Thêm hiệu ứng làm mất tham chiếu hiệu ứng cũ → lấy lại bằng `H.efx(layer, tên)`.
- `saveFrameToPng` ghi file bất đồng bộ → luôn `tools/wait-files.sh` trước khi đọc ảnh.
- Mỗi lệnh `ae_run_script` nên ngắn (dưới ~60 giây). Dựng cảnh lớn thì chia nhiều lệnh.

## Dừng và hỏi người dùng chỉ khi

- AE không phản hồi / panel chưa kết nối / có hộp thoại trong AE (nhờ họ bấm OK và cho biết nội dung).
- Brief thiếu thứ bắt buộc (tên sản phẩm, thông điệp chính, thời lượng) — hỏi một lần, gộp mọi câu.
- Cần ghi đè/đóng project AE đang có thay đổi chưa lưu.
- Thiếu font/plugin mà brief yêu cầu đích danh (đề xuất thay thế, hỏi có dùng không).

Không xoá file của người dùng, không đóng AE, không đổi Preferences của AE.
