# 02. Quy trình từ clip gốc tới video

`KIT` là đường dẫn tuyệt đối tới thư mục kit. Trong ExtendScript dùng dấu `/`. Lệnh bash chạy từ thư mục kit.
Ghi tiến độ mỗi bước 1–2 dòng vào `projects/<slug>/log.md`.

## 0. Môi trường (một lần mỗi máy)

- After Effects (đã dùng bản 2026 / 26.0). MCP `after-effects` có các tool `ae_status`, `ae_run_script`, `ae_render`, `ae_import_files`, `ae_save_project`, `ae_new_project`.
  - AE: bật Preferences > Scripting & Expressions > *Allow Scripts to Write Files and Access Network*.
- ffmpeg/ffprobe trong PATH. Python 3.10+: `pip install -r tools/requirements.txt`.
  - Với GPU NVIDIA: gỡ `onnxruntime` thường trước (`pip uninstall onnxruntime`), vì nó xung đột với `onnxruntime-gpu`. Chi tiết ở knowledge/04.
- Mô hình tách người: `tools/models/rvm_mobilenetv3_fp32.onnx` (đã kèm).
- Font: cài vào máy (Windows: chuột phải > Install for all users, hoặc chép vào `%LOCALAPPDATA%\Microsoft\Windows\Fonts`). AE thường nhận ngay, không cần khởi động lại. Kiểm tra bằng `T.fontList('tên')`.

## 1. Kiểm tra

```js
// ae_run_script (args: {kit: KIT})
$.evalFile(File(args.kit + '/lib/saas-lib.jsx')); $.evalFile(File(args.kit + '/lib/th-lib.jsx'));
return T.fontList('Impact|Pensum|Montserrat');
```

- `ae_status` phải có trường `bridge`. Không trả lời trong 60 s thì AE đang có hộp thoại: nhờ người dùng bấm OK.
- Font của chữ tiếng Việt phải qua `python tools/fonts_vi.py <file|thư mục>` (OK = đủ dấu).

## 2. Chuẩn bị clip (knowledge/04)

```bash
bash tools/prep.sh projects/<slug>/assets/raw.mp4 output/<slug>/aroll --lang vi --prompt "tên thương hiệu, tên sản phẩm"
```

Lệnh trên tạo `aroll.mp4` (đã cắt lặng, −14 LUFS), `aroll_matte.mp4` và `aroll.transcript.json/.txt` (mốc từng từ trên clip mới).

- Clip 4K: hạ về 1080×1920 trước, nếu không matte sẽ chậm gấp 4 lần:
  `ffmpeg -i raw.mp4 -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 14 -c:a aac -b:a 256k raw1080.mp4`
- Clip đã được người dựng cắt sẵn (như Foodtage): không chạy `cut_silence`. Thay vào đó chạy riêng `transcribe.py` và `matte.py`.
- Có nhạc nền dưới giọng: thêm `--from-words`.
- Đọc `aroll.transcript.txt`, sửa chính tả sai (tên riêng, thuật ngữ y khoa) ngay trong file JSON trước khi lập kế hoạch.

## 3. Phân tích video mẫu (nếu có, knowledge/06)

```bash
bash tools/sheet.sh assets/ref.mp4 output/<slug>/ref/sheet.jpg 3
python tools/transcribe.py assets/ref.mp4 output/<slug>/ref/ref.json --lang vi
python tools/sfx_match.py assets/ref.mp4 assets/raw.mp4 assets/sfx      # chỉ khi ref dùng đúng clip gốc
```

Viết `projects/<slug>/ref-notes.md`: bảng từng giây (giây | lời | hình | âm thanh), giống `09-vi-du-foodtage.md`.

## 4. Kế hoạch (bước quan trọng nhất)

Viết `projects/<slug>/plan.md` theo `templates/plan.md`:
- Mỗi câu một dòng: mốc (giây, lấy từ transcript), lời, khối hiệu ứng (tên trong knowledge/03), chữ hiện trên màn hình, SFX.
- Nháp phụ đề: `python tools/caption_groups.py output/<slug>/aroll/aroll.transcript.json --skip <các đoạn có chữ to/B-roll>`.
- Kiểm tra mật độ theo nhịp đã chọn (knowledge/01), xem có từ ngữ nhạy cảm hay rủi ro pháp lý không (knowledge/10).
- **Gửi người dùng duyệt một lần.** Theo HD-CL, AI tự lên toàn bộ kế hoạch thì "không đủ sáng tạo"; người dùng nên chọn cảnh.

## 5. Dựng trong AE

1. Project mới (`ae_new_project`). Nếu project đang mở có thay đổi chưa lưu thì hỏi trước. Lưu ngay vào `output/<slug>/<slug>.aep`.
2. Chép `examples/foodtage/build.jsx` vào `projects/<slug>/build.jsx`. Thay **khối DATA** theo plan, sửa khối STAGES nếu cần cảnh khác.
   Hook riêng của mỗi video viết trong `S.front`.
3. Nạp, mỗi dòng là một `ae_run_script`:
   ```js
   $.evalFile(File(args.kit+'/lib/saas-lib.jsx')); $.evalFile(File(args.kit+'/lib/th-lib.jsx'));
   $.global.EX = args.proj; $.evalFile(File(args.proj + '/build.jsx')); return 'ok';
   ```
   `build.jsx` đọc `EX + '/media'` và `EX + '/assets'`. Đặt `aroll.mp4`, `aroll_matte.mp4` và `transcript.json` vào `EX/media`, hoặc sửa đường dẫn trong `T.init`.
4. Chạy từng giai đoạn: `return B.stage('base')`, rồi `'behind'`, `'front'`, `'caps'`, `'broll'`, `'rings'`, `'leaks'`, `'sfx'`.
   `B.all()` chạy hết và bắt lỗi riêng từng giai đoạn.
5. **Sau mỗi giai đoạn**: `H.saveFrames(T.main(), [t1, t2, ...], KIT_OUT + '/check', 'x')`, rồi
   `bash tools/compare.sh output/<slug>/check x assets/ref.mp4 t1 t2 ...`. Xem ảnh và sửa trước khi sang giai đoạn sau.
   Không có ref: dùng `tools/sheet.sh` trên các khung đã xuất.
6. Dựng lại toàn bộ thì chạy lại từ `base`. `T.base` xoá và tạo lại MAIN; các precomp như `TILE_`, `BROLL` được làm sạch và dùng lại.

## 6. Render

```
ae_render  comp: MAIN  output: <...>/output/<slug>/<slug>_raw.mp4  outputModuleTemplate: "H.264 - Match Render Settings - 15 Mbps"
```

- **Không gửi lệnh nào vào AE trong lúc render.** Nếu MCP báo hết giờ, kiểm tra file bằng `ffprobe -count_frames`: đủ số khung (giây × 30) là render đã xong.
- Âm lượng: chạy 2 lượt `loudnorm` (knowledge/05), cho ra `<slug>_vN.mp4`.

## 7. QC và báo cáo (knowledge/08)

- `bash tools/sheet.sh output/<slug>/<slug>_vN.mp4 output/<slug>/check/vN_sheet.jpg 2`: xem toàn bộ video.
- So 6–8 mốc với mẫu bằng `compare.sh`.
- Viết `output/<slug>/report.md` theo `templates/report.md`: những gì khớp, những gì lệch, lỗi còn giữ.
- Báo người dùng: đường dẫn video, các điểm lệch, đề xuất cho bản tiếp theo.

## Vòng sửa

Đọc góp ý, tìm đúng layer hoặc khối DATA, sửa, chạy lại từ `base` (hoặc chỉ giai đoạn liên quan nếu không đụng MAIN), xuất khung, render `_v(N+1)`.
Góp ý chung chung kiểu "chưa đẹp": tự đặt bản dựng cạnh mẫu bằng `compare.sh`, liệt kê 3–5 điểm khác lớn nhất, sửa theo thứ tự tác động.

Thời gian thực tế (ví dụ Foodtage, 22 s): chuẩn bị clip 2 phút, phân tích mẫu 15 phút, dựng và sửa 2–3 giờ (lần đầu, có gỡ lỗi), render khoảng 5 phút.
