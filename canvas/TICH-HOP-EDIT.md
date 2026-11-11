# Lấy file từ Infinity Studio (canvas) cho hệ thống edit video

Dành cho Claude quản lý hệ thống edit. Mục tiêu: lấy âm thanh/video/ảnh đã tạo trên canvas thành **file thật trên ổ đĩa**, kèm tên và thứ tự, để ghép thẳng vào `project.json` mà không phải đoán.

## Vì sao cần bước này
Node canvas chỉ giữ link `blob:` dùng được bên trong cửa sổ app, file thật nằm trong cơ sở dữ liệu của app. Bên ngoài không tải trực tiếp được, và các công cụ MCP `infinite-canvas` không trả dữ liệu gốc. Chức năng **"Xuất file"** ghi file ra thư mục cố định rồi tạo `manifest.json`.

## Điều kiện
- App chạy bằng `E:\antigravyti\infinite-canvas\app.bat`, canvas cần lấy file đang mở.
- Canvas Agent đã kết nối (chạy `connect-agent.bat`, trong canvas bấm **Agent > Connect**) và MCP `infinite-canvas` đã được thêm vào Claude Code (xem `HUONG-DAN.md` mục 6). Phiên Claude Code phải mở sau khi thêm MCP.
- Plugin **"Xuất file ra thư mục"** đã bật ở Node plugin > Cục bộ.
- Canvas có sẵn một node **"Xuất file"** (loại `export:folder`). Người dùng thêm một lần; MCP không tạo được node plugin.

## Cách 1: Claude tự gọi qua MCP (khuyên dùng)
1. `canvas_get_state`: tìm node có `"type": "export:folder"`, lấy `id`. Id khác nhau theo từng canvas.
2. Đọc `metadata.exportAll` của node đó:
   - `true`: xuất mọi node âm thanh/video/ảnh đã tạo xong trên canvas.
   - `false` hoặc không có: chỉ xuất các node nối dây vào node "Xuất file".
   Đổi bằng `update_node` với `metadata: {"exportAll": true}` nếu cần.
3. Gọi `canvas_apply_ops`:
   ```json
   {"ops":[{"type":"update_node","id":"<id node export:folder>","metadata":{"exportRequest":"<giá trị MỚI mỗi lần>"}}]}
   ```
   `exportRequest` phải khác lần trước (ví dụ thời gian hiện tại hoặc `req-2`). Cùng giá trị thì plugin coi như đã xử lý và không xuất lại.
4. Đợi vài giây (hai file ~2,5 MB mất khoảng 5 giây), rồi đọc `manifest.json`. Kiểm tra `exportedAt` là mới để chắc đã xuất xong.
5. Plugin cũng ghi kết quả vào `metadata.exportResult` của node (`{at, ok, count, dir, manifest}` hoặc `{at, ok:false, error}`). Phần này chưa được kiểm tra đầy đủ, nên coi `manifest.json` là nguồn đáng tin.

## Cách 2: người dùng bấm tay
Thêm node "Xuất file" (📤), tick **"Xuất toàn bộ canvas"** hoặc nối node vào, bấm **"Xuất ra thư mục"**. Node báo "Đã xuất N file + manifest.json vào: …".

## Kết quả
Thư mục mặc định: `E:\antigravyti\infinite-canvas\exports\` (đổi bằng biến môi trường `CANVAS_EXPORT_DIR` khi chạy proxy).

- Các file media đặt tên `N_<tên node>.<đuôi>`, thứ tự từ **trên xuống dưới** trên canvas, cùng hàng thì trái sang phải.
- Tên node bị app cắt khoảng 32 ký tự và có thể trùng nhau. **Đừng nhận diện bằng tên file**; dùng `nodeId` hoặc `order`.
- Mỗi lần xuất ghi đè `manifest.json` và các file trùng tên. File của lần xuất trước mà tên khác vẫn còn nằm trong thư mục.
- Node đang lỗi hoặc chưa tạo xong bị bỏ qua.

### `manifest.json`
```json
{
  "exportedAt": "2026-11-02T04:04:24.213Z",
  "scope": "canvas",
  "dir": "E:\\antigravyti\\infinite-canvas\\exports",
  "items": [
    {
      "order": 2,
      "nodeId": "qtyvIffRrJNJJLaEhnwi0",
      "type": "audio",
      "name": "T1 - GIỌNG ĐỌC ĐẦY ĐỦ (1p43s)",
      "file": "2_T1 - GIỌNG ĐỌC ĐẦY ĐỦ (1p43s).mp3",
      "path": "E:\\antigravyti\\infinite-canvas\\exports\\2_T1 - GIỌNG ĐỌC ĐẦY ĐỦ (1p43s).mp3",
      "url": "http://127.0.0.1:23210/__export/file/2_T1%20-%20GI...mp3",
      "mimeType": "audio/mpeg",
      "bytes": 1649708,
      "durationMs": 103104,
      "prompt": "Có bốn việc trên đường, ..."
    }
  ]
}
```
- `scope`: `canvas` (xuất toàn bộ) hoặc `upstream` (chỉ node nối vào).
- `order`: thứ tự trên canvas, bắt đầu từ 1. `nodeId`: định danh ổn định của node.
- `path`: đường dẫn file thật trên đĩa. Dùng trực tiếp làm nguồn trong `project.json`.
- `url`: link localhost tải bằng `curl`.
- `durationMs`: có với âm thanh/video, dùng để canh thời lượng. `prompt`: nội dung hoặc lời dùng để tạo.

## Lấy file qua HTTP (khi app đang chạy)
```bash
curl http://127.0.0.1:23210/__export                                  # liệt kê: {dir, files:[{name,bytes,modified,path,url}]}
curl -o out.mp3 "http://127.0.0.1:23210/__export/file/<tên-mã-hóa-URL>"   # tải một file (dùng url trong manifest)
```
Chỉ dùng được khi app đang chạy (proxy chạy cùng app). Đọc thẳng `path` trên đĩa thì không cần app.

## Đưa video thành phẩm về canvas
Dùng MCP `infinite-canvas` (ví dụ `canvas_create_attachment_nodes`) để thêm node video thật, và **đặt tên node rõ ràng** để người dùng tải xuống theo tên.

## Giới hạn và lỗi thường gặp
- Đuôi file cho phép: mp3, wav, m4a, ogg, mp4, webm, mov, png, jpg, jpeg, webp, gif, txt, json. Mỗi file tối đa 1 GB.
- Proxy chỉ nghe ở `127.0.0.1`, và chỉ ghi trong thư mục xuất.
- Kết nối MCP báo `fetch failed`: Canvas Agent (`127.0.0.1:17371`) đang tắt. Chạy lại `connect-agent.bat` rồi Connect trong canvas. Sau khi mở lại app thường phải làm lại bước này.
- Gọi `exportRequest` mà không có file mới: `exportRequest` trùng giá trị lần trước, canvas chưa mở, hoặc node "Xuất file" chưa được dựng trên màn hình. Plugin chạy trong trang canvas nên chưa kiểm tra trường hợp node nằm ngoài khung nhìn.
- Manifest thiếu `path`/`url`: proxy đang chạy bản cũ, tắt hẳn app rồi mở lại bằng `app.bat`.
- Sau khi sửa code plugin hoặc web phải build lại: `npm --prefix app/plugins/canvas/export run build`, rồi `npm --prefix app/web run build`.

## Vị trí mã nguồn
- Plugin: `app/plugins/canvas/export/src/index.tsx`
- Endpoint ghi và tải file: `app/canvas-proxy/index.js` (`/__export`)
