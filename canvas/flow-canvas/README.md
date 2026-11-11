# Nối Infinite Canvas với Google Flow qua FlowKit

1. FlowKit: `cd flowkit && pip install -r requirements.txt`, nạp `flowkit/extension` vào Chrome
   (chrome://extensions > Developer mode > Load unpacked), mở https://flow.google.com đã đăng nhập, giữ tab mở.
2. Đặt FLOW_PROJECT_ID (UUID trong URL project Flow), chạy `python -m agent.main` (cổng 8100).
3. Canvas: `cd infinite-canvas/web && bun install && bun run dev` (hoặc `npm i && npm run dev`).
4. Canvas > Cài đặt > thêm nhà cung cấp: Base URL `http://127.0.0.1:8100`, API Key tùy ý,
   model tên tùy ý, bật "script gọi tùy chỉnh" cho ảnh và dán `flow-image-script.js`.

## Video
Dán `flow-video-script.js` vào phần script của model video (Base URL giống ở trên).
Không ảnh = text-to-video; 1 ảnh = khung đầu; 2 ảnh = khung đầu+cuối; >2 ảnh hoặc mode reference = tham chiếu.
Thời lượng 4/6/8/10 giây, 360p/720p. Thử 4 giây trước để đỡ tốn credit.

## Chạy dạng phần mềm (không dùng web dev)
`app.bat` (ở thư mục gốc): build bản web chính thức, mở một cửa sổ app riêng và tự chạy FlowKit bên trong.
Vẫn cần: Python + `pip install -r flowkit/requirements.txt`, extension FlowKit trong Chrome, tab flow.google.com đã đăng nhập.
Sau khi sửa code trong `app/web`, chạy `npm --prefix app/web run build` để cập nhật bản app.
Dữ liệu (canvas, cài đặt) của app tách biệt với trình duyệt: nhập lại `import-flow-config.json` trong app.
