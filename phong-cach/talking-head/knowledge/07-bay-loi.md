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

## Từ lần chạy thử foodtage-thu (2026-11-16)

23. **Từ khoá hai dòng cỡ ≥ 250 sau đầu: dòng dưới bị đầu người che, hoặc chữ tràn khung** (KEYBOARD / SHORTCUTS, SOUND / DESIGN). → Dùng **một dòng**, cỡ 170–240, y 215–255; cụm 12 ký tự cỡ ≤ 175.
24. **`T.ringsBg` đặt layer `RINGS` trên các từ khoá "sau lưng"** nên từ khoá trong đoạn nền vòng biến mất. → Sau `T.ringsBg`, `c.layer('RINGS').moveAfter(c.layer('<từ khoá cuối>'))`.
25. **`H.saveFrames` trả đường dẫn trước khi file ghi xong**; ghép contact sheet ngay thì ffmpeg báo `chunk too big` / không đọc được. → Chờ file > 100 KB (mỗi khung 1,5–2 MB) rồi hãy ghép.
26. **Ghép contact sheet bằng `ffmpeg -pattern_type glob` không chạy trên bản ffmpeg Windows này.** → Dùng `-framerate 1 -start_number 0 -i g_%02d.png`.
27. **Đường dẫn có dấu tiếng Việt** (`D:/dự án antigravity/...`) dùng được trong `File()` của ExtendScript và trong `args` của `ae_run_script`.

## Từ video Bojomi, tiếng Việt (2026-11-16/17)

28. **`H.scl(l).setValue(...)` báo "Can not call setValue() on a property with keyframes"** khi layer đã có keyframe scale (vd. sau `T.keyword`/`T.punchIn`). → Co chữ bằng `H.mulScale(H.scl(l), k)`.
29. **Bộ đếm số `H.counter` + `.toFixed` lỗi "v.toFixed is not a function"**: `effect("Value")("Slider")` là Property, không phải số; chữ hiện nguyên "00%". → Expression `var v=effect("Value")("Slider")*1; v.toFixed(1).replace(".",",")+" mg"`. Kiểm bằng `property.expressionError`.
30. **File `.jsx` chứa chữ Việt: `$.evalFile` đọc theo mã máy, chữ hỏng.** → Viết nguồn UTF-8 (`build.src.jsx`), chạy `enc.py` đổi mọi ký tự ngoài ASCII thành `\uXXXX` ra `build.jsx`, nạp bản đó.
31. **Flow tạo video từ ảnh: `UI_TIMEOUT: upload ...` hoặc "Target closed"** khi tên node ảnh tham chiếu là tên tự đặt dài có xuống dòng và `【Văn bản 1】`. → Đổi tên node ảnh ngắn, không dấu (`canvas_update_node` `patch:{title:'vc_hook1'}`) rồi tạo lại; mỗi lần **một** clip, chờ xong mới gửi tiếp.
32. **Flow trả sai**: một clip ra con mèo không liên quan; clip khác đòi `size:"1:1"` nhưng trả **16:9 đã phóng** (mất mép chủ thể). Sau vài lần Flow báo "hoạt động bất thường… tiện ích trình duyệt". → **Dừng, không né kiểm tra**, nhờ người dùng kiểm cửa sổ Flow (captcha/đăng nhập). Chỗ nào chưa có clip thì dùng ảnh tĩnh zoom chậm.
33. **Muse (`muse::muse-video`) qua `canvas_generate_video` chỉ tạo node chữ + node cấu hình ở trạng thái `idle`**, không tự chạy. → `canvas_run_generation {nodeId: <node cấu hình>}` rồi chờ `status: success` (20–60 s/clip 5 s, 720×1280). Muse chèn dấu sao AI nhỏ ở mép dưới → phóng clip ≥ 122 %.
34. **Xuất file khỏi canvas im lặng không chạy** khi node "Xuất file" ngoài khung nhìn. → `canvas_set_viewport` trước, rồi `update_node` đặt `exportAll:true` và `exportRequest` **giá trị mới mỗi lần**; đọc `canvas/exports/manifest.json`, nhận file bằng `nodeId`.
35. **`ae_render` báo thất bại ("không phản hồi 1800 s" / "Connection closed") dù file đã ra.** → Kiểm `ffprobe -count_frames` (đủ khung = xong); nhìn mốc giờ file. Sau khi người dùng mở lại AE: `ae_open_project` rồi **chờ**, `ae_status` có thể liệt kê comp cũ trong khi `app.project.file` rỗng; render theo **tên** `MAIN` (theo id có lúc báo không thấy).
36. **Cắt lời lỗi trong clip đã chuẩn bị**: lấy ranh giới từ năng lượng 20 ms (chỗ im lặng ≤ −50 dB), làm tròn theo khung, `trim`+`concat` cho **cả aroll và matte** (cùng số khung), fade âm 10 ms; phiên âm lại để kiểm. Mọi mốc DATA sau đó ánh xạ bằng hàm `m(t)` (knowledge/13), đừng sửa tay từng mốc.
37. **Whisper tiếng Việt**: sai tên thương hiệu và từ mượn (BOJOMI, An Vượng, MK-7); **đọc "µg" thành "mg"** nên lời và nhãn bao bì mâu thuẫn; **ảo giác ở đuôi** sau khoảng lặng ("subscribe…"). → Chữ màn hình lấy từ nhãn bao bì; nêu mọi chỗ lời ≠ chữ trong báo cáo; đo năng lượng đoạn đuôi trước khi cắt.
38. **Tường sau lưng có logo/chữ lớn làm chữ "sau lưng người" rối.** Phủ xanh 88 % vẫn lộ logo. → Solid màu thương hiệu **100 %** với mask phía trên (mờ dần xuống bàn), dính vào `CAM` để zoom cùng người; chữ đặt trên lớp này, dưới `MATTE_Person`.
39. **Ảnh sản phẩm làm thẻ trắng/khung che mặt khi zoom 110 %** (tóc lên tới y ≈ 580). → PNG tách nền ở y < 560, x ≥ 700; ảnh hướng dẫn to nên thay bằng bảng chữ.
40. **Contact sheet `sheet.sh` mốc 0,5 khung/s đủ xem toàn video 70 s trong một ảnh**; `H.saveFrames` vẫn ghi bất đồng bộ (chờ 8–15 s trước khi ghép).

41. **Đo lệch khẩu hình bằng chuyển động (hiệu khung) cho kết quả sai** (miệng "đi trước" tiếng 80–300 ms), dời hình theo số đó làm lệch hơn. → Đo **độ mở miệng** (bám mặt, cắt chặt vùng miệng, 59,94 fps, cửa sổ 8 s), xác nhận bằng dải ảnh miệng kèm dB ở âm môi (b, p, m). Miệng đi trước tiếng 0–60 ms là tự nhiên. Chiều: tiếng trễ d → `in_hình = in_tiếng − d`. Chi tiết: `fullstudio/docs/kinh-nghiem-giao-gemini.md` mục 4.
42. **Phụ đề từng từ lấy mốc Whisper: từ đầu câu sau khoảng lặng hay sớm hàng trăm ms** ("Khi" sớm 0,7 s). → Kiểm đầu từ bằng năng lượng tiếng; sửa mốc từ (Tool Edit: `set_text` `animator.times`).

## Thói quen chống lỗi

- Dựng từng giai đoạn, **xuất khung so với mẫu sau mỗi giai đoạn**. Bản Foodtage cần 8 vòng so mới đạt.
- Khi một giai đoạn báo lỗi lạ: chạy lại riêng giai đoạn đó trong một lệnh mới, bắt `e.line`, rồi chia nhỏ từng bước để biết dòng nào lỗi.
- Ghi lỗi mới vào file này kèm triệu chứng, nguyên nhân và cách tránh.
