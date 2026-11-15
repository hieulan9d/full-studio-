# Ví dụ Foodtage: dựng lại video mẫu HD1 trong After Effects

Video tiếng Anh "3 ways to become a kickass video editor", dọc, 22,2 s. Phân tích từng giây: `knowledge/09-vi-du-foodtage.md`.

| Thư mục / file | Nội dung |
|---|---|
| `ref/video-mau.mp4` | **video mẫu** (đích cần đạt) |
| `result/foodtage_v1.mp4` | **kết quả AI dựng** bằng script này (render thật) |
| `assets/` | bộ tài nguyên gốc: clip gốc 4K, B-roll, icon/logo, SFX, font, preset `.setting`, light leak |
| `media/` | clip đã chuẩn bị: `aroll.mp4` (1080×1920), `aroll_matte.mp4`, `transcript.json` |
| `build.jsx` | script dựng, chạy bằng `lib/th-lib.jsx`: khối DATA ở trên, STAGES ở dưới. **Mẫu để chép cho video mới** |
| `build-v1-verified.jsx` | bản script đã render ra `result/foodtage_v1.mp4` (trước khi tách thư viện). Chỉ để đối chiếu |
| `check/` | ảnh so sánh: hàng trên là bản dựng, hàng dưới là mẫu (`*_cmp.jpg`); `v1_sheet.jpg` là toàn bộ v1 |

## Chạy lại

1. Cài font trong `assets/Fonts/` (giải nén Tactic Sans).
2. Trong AE (qua MCP), mỗi dòng là một `ae_run_script`, `args = {kit: '<KIT>'}`, dùng dấu `/`:
   ```js
   $.evalFile(File(args.kit+'/lib/saas-lib.jsx')); $.evalFile(File(args.kit+'/lib/th-lib.jsx'));
   $.global.EX = args.kit+'/examples/foodtage'; $.evalFile(File($.global.EX+'/build.jsx')); return 'ok';
   ```
   ```js
   return B.all();   // timeoutSec: 400
   ```
3. Kiểm tra: `H.saveFrames(T.main(), [0.8,3.2,5.4,10.7,13,18.4], args.kit+'/examples/foodtage/check', 'z')`, rồi
   `bash tools/compare.sh examples/foodtage/check z examples/foodtage/ref/video-mau.mp4 0.8 3.2 5.4 10.7 13 18.4`
4. Render MAIN (knowledge/02 bước 6).

Làm lại từ clip gốc thay vì dùng `media/` có sẵn:
```bash
ffmpeg -i "assets/clip gốc.mp4" -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 14 -c:a aac -b:a 256k media/aroll.mp4
python ../../tools/transcribe.py media/aroll.mp4 media/transcript.json --lang en
python ../../tools/matte.py media/aroll.mp4 media/aroll_matte.mp4
```

## Kết quả v1

Kết quả: đủ 666 khung, −15,5 LUFS.

Lệch còn lại:
- Light leak chọn sai đoạn ở 6,0 / 7,67 / 16,67 s.
- Âm lượng mới chạy loudnorm một lượt.
- Nét icon mảnh.
- B-roll hơi nghiêng.

Chi tiết ở knowledge/09.

`build.jsx` (bản dùng thư viện) đã chạy lại trong AE và ra khung giống hệt v1: `check/L_cmp.jpg` (hàng trên `build.jsx`, hàng dưới v1). Project của lần chạy đó: `check/foodtage_lib.aep`.

Lưu ý bản quyền: clip, meme, SFX và font thuộc bộ tài liệu khoá học đi kèm HD1. Chỉ dùng để học và thử nghiệm.
