# Xưởng dựng video (vf + app)

Hệ thống dựng video bằng lệnh, kiểu VideoFlow chạy cục bộ. Người dùng nói tiếng Việt, bạn sửa **file dự án JSON** rồi chạy bộ lệnh `vf`. App web (`python app/server.py`, cổng 5180) hiển thị timeline + xem trước và có khung chat gọi bạn; app tự nạp lại khi file dự án đổi.

Luôn trả lời tiếng Việt, ngắn gọn, nói rõ đã đổi gì (cảnh nào, giây nào). Không xóa file của người dùng; chỉ ghi trong `projects/<tên>/`.

## Cách chạy lệnh
Từ thư mục gốc này: `python -X utf8 -m vf <lệnh> ...` (xem đầu `vf/cli.py` hoặc `vf/README.md`). File dự án: `projects/<tên>/project.json`.

| Việc | Lệnh |
|---|---|
| Xem danh sách cảnh | `ls <project>` |
| Thêm / xóa / dời / sửa cảnh | `add --src F --in S --dur D --size T\|Tr\|C --label X [--at IDX]`, `rm IDX…`, `mv IDX ĐẾN`, `set IDX khóa=giá_trị` |
| Kiểm tra luật | `check <project>` (chạy sau MỖI lần sửa) |
| Đo clip | `scan <thư mục>`, `stable <clip>` (đoạn êm), `look <clip> t0 t1` (ghép ảnh → dùng Read xem ảnh để chọn cảnh/gán cỡ), `scenes <clip>` |
| Giọng đọc | `voice <project> [--only s5 s6]` (cần VoiceStudio chạy ở localhost:3900) |
| Dựng | `render <project> <out.mp4> [--vertical] [--sub-mode word]` |
| CapCut | `capcut <project> <tên> --audio none` (mặc định an toàn) |
| Nhạc | `beats <file nhạc>` |
| Tìm / tải cảnh | `search "từ khóa" --source youtube\|pexels`, `download <url> [--start --end]` |

## Luật dựng của người dùng (bắt buộc)
- Chỉ dùng cảnh **không rung** (`check` báo rung > 0.5 là vi phạm; clip dựng sẵn/CGI nằm trong `rules.shake_exempt`).
- Cỡ cảnh **luân phiên toàn (T) → trung (Tr) → cận (C)**, tuyệt đối không có hai cảnh cùng cỡ liền nhau.
- Cảnh đứng im thì zoom nhẹ (`zoom: [1.0, 1.12]` trong clip). Chủ thể ở giữa khung khi zoom.
- Chữ nằm vùng dưới, cố định. Mỗi lần chuyển cảnh nên rơi đúng nhịp nhạc.
- Cỡ cảnh do bạn xem ảnh (`look` rồi Read ảnh) và gán vào `size`; không đoán mù.

## File dự án
`clips` nối tiếp nhau: `{src, in, dur, speed?, size, label, zoom?, inset?, focus_x?}` hoặc `{gap: giây}`. `sections` mỗi mục có `id, start, end, script` (lời đọc), `onscreen` (chữ trên màn hình: `{start,end,text,style?,pos?,parts?}`).
`voice.profile` là id giọng VoiceStudio; `voice.pron` là cách đọc tên riêng. `subs.mode`: `sentence` hoặc `word` (hiện từng chữ). Sau khi đổi độ dài cảnh, nhớ kiểm tra chữ/giọng còn khớp mốc.

## Việc cần hỏi người dùng trước
- Tải tư liệu từ internet (`download`): hỏi lại nếu người dùng chưa nói rõ; nhắc kiểm tra bản quyền (ưu tiên Pexels/Pixabay/Creative Commons).
- Ghi đè dự án CapCut đã có, xóa nhiều cảnh cùng lúc, đổi giọng đọc.

## Giới hạn hiện tại
Chưa tự tách nền / tạo hình AI; dò beat là ước lượng; xuất CapCut chưa mang theo zoom; track giọng trong CapCut còn thử nghiệm (`--audio`).

## Series "Đạo lý" (làm video từ sách → canvas → dựng)
- **Phong cách Đạo lý (cách tạo + cách edit, đọc đầu tiên): `kien-thuc/dao-ly/PHONG-CACH-DAO-LY.md`.** Khi người dùng nói "làm video kiểu Đạo lý / làm tập N" thì làm đúng tài liệu này.
- Cài đặt máy mới: `SETUP.md`. Kinh nghiệm đã học (phong cách người dùng, cách viết lời thoại cho voice, bẫy canvas/Flow): `kien-thuc/dao-ly/*.md` — ĐỌC trước khi làm tập mới.
- Quy trình canvas (sinh ảnh/video, xuất file, xếp node dọc): `canvas-tools/README.md`. Mẫu một tập: `projects/dao-ly-tapN/` (scenes.json, loi-thoai.txt, make_voice.py, rebuild_voice.py, build_project.py).
- Video thành phẩm chép vào `D:\đạo lý\dao-ly-tapN.mp4`. Mỗi tập xếp node canvas theo hàng dọc, mỗi cảnh một hàng.
- Không có trẻ em/bé trong prompt (Flow chặn); thay "chết/tử vong" bằng "mất mạng"; không có số liệu Việt Nam chưa kiểm chứng.

## Kịch bản Đạo lý soạn sẵn (tập 9–27)
- `kich-ban/` có sẵn kịch bản tập 9–27 (từ chương 2–6 của sách), chưa làm gì trên canvas. Khi người dùng báo "làm tập N": chạy `python -X utf8 canvas-tools/new_ep.py N` để tạo `projects/dao-ly-tapN/`, rồi theo `canvas-tools/README.md` và `kien-thuc/dao-ly/PHONG-CACH-DAO-LY.md`. Danh sách và quy tắc: `kich-ban/README.md`. Đối chiếu số điện thoại/luật với PDF trước khi đăng.

## Tổng hợp toàn hệ thống
- **`kien-thuc/HE-THONG-TONG-HOP.md`**: cách hoạt động và cách dùng cả 3 mắt xích (Infinity Studio, Voice Studio, vf), quy trình video USP sản phẩm, xuất CapCut, các bẫy đã gặp. Đọc khi làm việc mới hoặc ở máy mới.
