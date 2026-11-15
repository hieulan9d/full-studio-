# 07 — Điều khiển AE qua MCP và các bẫy đã gặp

Mọi mục trong file này là lỗi **đã xảy ra thật** khi dựng NeuraFlow và cách tránh. Đọc trước khi dựng.

## 1. Công cụ MCP

| Tool | Dùng |
|---|---|
| `ae_status` | kiểm tra AE + panel (`bridge: "panel Claude Bridge"`), danh sách comp |
| `ae_run_script` | chạy ExtendScript (thân hàm, `return` giá trị thuần; có `args`) — công cụ chính |
| `ae_new_project` / `ae_open_project` / `ae_save_project` | project (new khi project đang có thay đổi → AE hiện hộp thoại hỏi lưu) |
| `ae_create_comp`, `ae_add_text`, `ae_add_layers`, `ae_import_files` | thao tác nhanh; import nhạc/ảnh |
| `ae_comp_info`, `ae_list_items` | đọc cấu trúc |
| `ae_preview_frame` | xuất 1 khung — **ảnh trả về đôi khi lỗi định dạng**, dùng `saveFrameToPng` + ffmpeg thay thế |
| `ae_render` | render qua Render Queue; AE bị khoá tới khi xong (20 s video ≈ 2–4 phút) |

ExtendScript là **ES3**: không `let/const`, arrow function, `JSON`, template string. Chuỗi tiếng Việt OK.
`var` được hoist lên đầu hàm: một `var L = …` trong hàm sẽ che hàm ngoài tên `L` ngay từ dòng đầu
("Function L is undefined"). Đặt tên hàm tiện ích khác hẳn tên biến cục bộ.

## 2. Nạp thư viện

```js
$.evalFile(File("D:/…/saas-ae-kit/lib/saas-lib.jsx"));
$.evalFile(File("D:/…/saas-ae-kit/lib/ui-dashboard.jsx"));
var H = $.global.H; H.pickFonts();
```
`$.global` còn giữ giữa các lần gọi, **mất khi AE khởi động lại** → lỗi "undefined is not an object" ở dòng dùng `H`
nghĩa là chưa nạp lại.

## 3. Bẫy về parent và transform

1. **Gắn parent khi cha đang scale 0** → con có scale vô hạn, biến mất (thẻ trả lời chat từng không hiện). Gắn trước, keyframe cha sau.
2. **AE quy đổi theo thời điểm đang đứng của comp.** Gắn parent khi cha đang có scale ≠ 100 ở `comp.time` →
   con bị bù scale (đã gặp chữ phụ to 192%) và lệch vị trí. Đặt `comp.time = 0` trước khi dựng, gắn khi cha
   chưa có key, hoặc dùng `H.attach(con, cha)` (tự đặt lại vị trí cục bộ + scale).
3. Đặt vị trí cho layer **đã có parent** phải dùng toạ độ cục bộ của cha: `cục bộ = anchor_cha + (thế_giới − vị_trí_cha) / scale_cha`.
   Đặt nhầm toạ độ màn hình → layer bay ra ngoài khung (bong bóng quỹ đạo từng bay mất). Null trong AE 2026 có
   anchor `[0,0,0]` — luôn đọc `H.anc(null).value` thay vì đoán.
4. Gắn parent cho layer có keyframe: AE tự quy đổi mọi keyframe (ổn nếu cha ở trạng thái gốc tại comp.time).
5. Thuộc tính bị hỏng (NaN) sau khi gắn parent sai → đọc giá trị báo "invalid numeric result (divide by zero?)".
   Cách sửa nhanh nhất: xoá layer và tạo lại đúng thứ tự.

## 4. Bẫy về hiệu ứng

1. **Thêm hiệu ứng mới làm mất hiệu lực tham chiếu tới hiệu ứng cũ** trên cùng layer
   ("Object is invalid"). Sau khi thêm hết, lấy lại bằng `H.efx(layer, 'tên hoặc matchName')`.
2. Mã thuộc tính dễ nhầm: `ADBE HUE SATURATION-0004` là **Hue** (0005 mới là Saturation) — từng đặt nhầm làm lệch màu.
3. Adjustment "kính" lấy alpha của hình làm vùng tác động: fill 22% → hiệu ứng chỉ 22%. `H.glassUnder` đã đặt fill 100%, bỏ stroke.
4. Glow trên hình có fill sáng → cháy trắng. Glow threshold ≥ 60–70, intensity ≤ 0,7; thà làm fill tối hơn.
5. Glow toàn cảnh (adjustment) threshold 55% → cả khung trắng xanh. Dùng 82%.
6. `CC Cylinder` Radius chỉ kéo giãn layer theo chiều ngang — không làm dải thẻ phẳng lại được.
7. Dò mã thuộc tính hiệu ứng chưa biết:
   ```js
   var c = app.project.items.addComp('__probe', 100, 100, 1, 1, 30), l = c.layers.addSolid([1,1,1], 'p', 100, 100, 1), out = {};
   var list = args.effects; // ['ADBE Warp', ...]
   for (var i = 0; i < list.length; i++) { try { var e = l.property('ADBE Effect Parade').addProperty(list[i]), a = [];
     for (var j = 1; j <= e.numProperties; j++) a.push(e.property(j).matchName + '=' + e.property(j).name); out[list[i]] = a.join(' | ');
   } catch (x) { out[list[i]] = 'ERR ' + x; } }
   c.remove(); return out;
   ```

## 5. Bẫy về 3D

1. Thẻ trên vòng tròn tại góc θ (x = R·sinθ, z = −R·cosθ): **Rotate Y = −θ**. Dấu + làm các thẻ quay răng cưa,
   nhìn như hai cụm — một khung đơn lẻ có thể vẫn "trông đúng", phải xem khi vòng đã xoay.
2. Thẻ trong suốt nhìn thấy mặt sau bị lật → expression opacity theo hướng mặt (`toWorldVec([0,0,1])[2]`) cho thẻ quay lưng mờ còn 12–15%.
3. Chuyển phẳng → tròn: **không cross-fade hai bộ vật thể** (bóng đôi + nhảy). Dùng một bộ, vị trí theo độ cong c (0→1),
   bán kính R/c, lấy mẫu 10 key tuyến tính (`H.sceneCardRing`).
4. Precomp chứa vật to hơn khung (hành tinh) → bật `collapseTransformation` không thì bị cắt phẳng ở mép comp.

## 6. Bẫy về chữ

1. Gán `textDocument.text` rồi `setValue` có thể làm font về mặc định (chữ thành font có chân) → `H.setText` giữ font.
2. Đổi cỡ chữ xong phải đặt lại anchor (`H.anchorText`) không thì chữ lệch khỏi tâm.
3. Ký tự đặc biệt (✦ ⌄ ✓) không có trong font → ô vuông. Vẽ bằng `H.icon`.
4. Font: dùng PostScript name (`SegoeUI-Semibold`, `Inter-SemiBold`). Liệt kê: `H.fonts(/Inter/)`.

## 7. Bẫy về phiên làm việc AE

1. **Không gửi lệnh nào khi đang render.** Lệnh thứ hai → hộp thoại "Attempt was made to run a second script…" chặn AE.
2. Script lỗi giữa chừng → hộp thoại "Undo group mismatch". Vô hại nhưng chặn AE tới khi bấm OK.
3. Có hộp thoại → mọi lệnh MCP treo tới timeout. Nhờ người dùng bấm OK, đừng gửi thêm lệnh.
4. Lệnh MCP bị đẩy chạy nền khi quá lâu; khi AE mở lại, các lệnh đang chờ có thể chạy **sai thứ tự** →
   kiểm tra lại kết quả (đã gặp: lệnh render chạy trước lệnh sửa → bản render thiếu phần sửa).
5. Mỗi `ae_run_script` giữ dưới ~60 s (timeout mặc định 120 s). Dựng UI 150+ layer thì tách 2–3 lệnh.
6. Sau khi AE khởi động lại: nạp lại thư viện, `ae_status` kiểm tra project đang mở đúng file.

## 8. Kiểm tra bằng hình

```js
// trong ae_run_script
H.saveFrames(H.find('MAIN'), [0.5, 2.6, 5.8], 'C:/…/frames', 'chk');
```
```bash
bash tools/wait-files.sh 60 frames/chk_00.png frames/chk_01.png frames/chk_02.png   # PNG ghi BẤT ĐỒNG BỘ
bash tools/sheet.sh frames/chk.jpg frames/chk_0*.png                              # ghép lưới JPG nhẹ để đọc
```
Đọc `chk.jpg` (không đọc PNG 1920×1080 trực tiếp — nặng và đôi khi lỗi). Nếu ảnh y hệt lần trước: file chưa ghi xong, chờ lại.

- Ô trong sheet rộng 800 px = **1920 / 2,4**. Đo vị trí từ ảnh phải nhân 2,4 (đã đo nhầm ×2 và tưởng logo lệch).
  Nghi lệch vị trí thì đọc thẳng giá trị trong AE (`H.pos(layer).value`, toạ độ cha) thay vì đoán từ ảnh.
- Thư mục đích của `saveFrameToPng` chưa tồn tại → **thất bại im lặng**, không báo lỗi. `H.saveFrames` đã tự tạo thư mục.

Soi chuyển động: xuất khung mỗi 0,1–0,15 s quanh đoạn cần soi, ghép lưới 4×3. Sau render: `ffmpeg … -vf "fps=5,scale=480:-1,tile=4x5"` trên mp4.
