# 07. Bẫy và lỗi đã gặp (bắt buộc đọc)

Mỗi mục dưới đây từng làm mất 10–60 phút. Định dạng: **triệu chứng → nguyên nhân → cách tránh**.

## AE / ExtendScript

1. **Chữ màu thành trắng xoá khi thêm Glow.** Effect Glow (`ADBE Glo2`) cộng ảnh sáng vào chính nó: xanh ngọc thành gần trắng, tím thành hồng phẳng.
   → Không dùng Glow cho chữ hay icon màu. Dùng `T.glow` (2 Drop Shadow cùng màu, distance 0).
2. **"invalid numeric result (divide by zero?)" khi ghép chuỗi với mảng.** Ví dụ `'base:' + H.describe(comp)` (mảng chuỗi có ký tự đặc biệt) ném lỗi này. Lỗi trông như lỗi dựng, khiến ta đi tìm sai chỗ cả tiếng.
   → Hàm giai đoạn trả **số hoặc chuỗi**. `T.run` đã đổi mảng thành độ dài.
3. **Text vừa tạo có `sourceRectAtTime` bằng 0 khi nằm trong `beginUndoGroup`**, dẫn tới Ramp có điểm đầu trùng điểm cuối.
   → Không bọc giai đoạn trong undo group.
4. **Matte layer vẫn hiện.** Với API mới `layer.setTrackMatte(matte, TrackMatteType.LUMA|ALPHA)`, matte không tự ẩn trong mọi trường hợp.
   → Đặt `matte.enabled = false` sau khi gán, matte vẫn có tác dụng. Ngoại lệ: `MATTE_Person` trong MAIN cứ để như hàm `T.base` làm.
5. **Lớp 3D che mất thẻ.** Trong comp có camera, lớp nghiêng (rotX, rotY) và phóng to sẽ có phần nằm gần camera hơn thẻ ở z = 0.
   → Đặt thẻ ở z âm (−250).
6. **Icon minh hoạ thành mảng xám, không ra nét neon.** File icon là hình tô đặc (nền trắng), Invert chỉ đảo màu.
   → Find Edges (invert) → Levels → Minimax → Tint → Screen (`T.edges`).
7. **Effect bị mất tham chiếu.** Thêm effect mới làm biến trỏ tới effect cũ không còn dùng được.
   → Lấy lại bằng tên: `H.efx(layer, 'tên')`.
8. **Gắn parent sai scale.** Gắn parent khi cha đang có scale khác 100 hoặc có key, con sẽ bị bù scale/vị trí.
   → Gắn khi null còn ở 100% (`H.attach`), key sau. `T.base` gắn trước rồi mới đặt key HOLD cho CAM.
9. **`saveFrameToPng` ghi file bất đồng bộ.** File xuất hiện vài giây sau khi lệnh trả về.
   → `tools/compare.sh` tự chờ file. Đọc ảnh tự xuất thì chờ file có kích thước > 0.
10. **Trim Paths của shape**: `H.vec(layer)` đã là nhóm "Contents" của group đầu tiên. Gọi `H.vec(l).addProperty('ADBE Vector Filter - Trim')`, đừng thêm `.property(1)`.
11. **Tên matchName**: Glow `ADBE Glo2`, Levels `ADBE Easy Levels2` (-0003 đen, -0004 trắng, -0005 gamma), Vibrance `ADBE Vibrance`, Ramp `ADBE Ramp` (-0005: 1 tuyến tính, 2 radial), Set Matte `ADBE Set Matte3` (-0001 layer, -0002 = 4 alpha), Tint `ADBE Tint`, Find Edges `ADBE Find Edges`, Minimax `ADBE Minimax`, CC Vignette `CC Vignette` (thuộc tính `CS Vignette-0001`), Directional Blur là `ADBE Motion Blur` (không phải `ADBE Directional Blur`).
    Trước khi dùng effect lạ: thêm nó lên một solid tạm và liệt kê `property(i).matchName` + `name`.
12. **Font**: `textDocument.font` nhận **PostScript name** (`TRImpact`, `PensumDisplay-BookItalic`). Sai tên thì AE lặng lẽ dùng font mặc định. Font cài thêm thường được AE nhận ngay, kiểm bằng `T.fontList`.
13. **Font thiếu dấu tiếng Việt** (TR Impact, Pensum, Tactic Sans đều thiếu): chữ có dấu bị thay bằng font khác giữa chừng. → `tools/fonts_vi.py` trước khi chọn font.
14. **Âm thanh nhân đôi**: A-roll dùng hai lần (plate + person). → Tắt `audioEnabled` của FG_Person và matte.

## Render và MCP

15. **Hộp thoại "After Effects can't continue: internal structure inconsistency (seq)" trong lúc render.** Render vẫn ra đủ file, nhưng AE treo ở hộp thoại, MCP chờ 1800 s rồi báo thất bại, mọi lệnh sau đó hết giờ sau 60 s.
    → Không gửi lệnh nào khi đang render. Nếu MCP báo lỗi, kiểm tra file bằng `ffprobe -count_frames` (đủ khung là xong). Nhờ người dùng bấm OK trước khi gửi lệnh tiếp.
16. **"Undo group mismatch" / "a second script while another was running"**: script lỗi giữa chừng, hoặc gửi lệnh trong lúc render. Cả hai đều chặn AE tới khi có người bấm OK.
17. **`$.global` mất sau khi khởi động lại AE.** → Nạp lại `saas-lib.jsx`, `th-lib.jsx`, `build.jsx`.
18. **Mỗi `ae_run_script` nên dưới khoảng 60 s.** Cả 8 giai đoạn Foodtage (khoảng 150 layer) mất khoảng 1–2 phút, đặt `timeoutSec: 400`.

## Công cụ ngoài AE

19. **ffmpeg drawtext segfault trên Windows** (thiếu Fontconfig). → Chép một file .ttf vào cùng thư mục rồi `fontfile=_f.ttf` (`sheet.sh` đã làm).
20. **curl không ghi được vào đường dẫn có dấu tiếng Việt.** → `cd` vào thư mục rồi ghi tên ngắn.
21. **onnxruntime-gpu mới cần CUDA 13**, faster-whisper thiếu cublas: xem knowledge/04.
22. **Tiếng Việt trong Python trên Windows**: `sys.stdout.reconfigure(encoding="utf-8")` hoặc `PYTHONIOENCODING=utf-8`, nếu không sẽ gặp UnicodeEncodeError.

## Thói quen chống lỗi

- Dựng từng giai đoạn, **xuất khung so với mẫu sau mỗi giai đoạn**. Bản Foodtage cần 8 vòng so mới đạt.
- Khi một giai đoạn báo lỗi lạ: chạy lại riêng giai đoạn đó trong một lệnh mới, bắt `e.line`, rồi chia nhỏ từng bước để biết dòng nào lỗi.
- Ghi lỗi mới vào file này kèm triệu chứng, nguyên nhân và cách tránh.
