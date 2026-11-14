# Công cụ điều khiển canvas (Infinity Studio) cho series Đạo lý

Gọi canvas qua HTTP (không cần MCP): `cv.py` → `call(tên_tool, input)` tới `http://127.0.0.1:17371/api/tools`.
Token đọc từ `%USERPROFILE%\.infinite-canvas\canvas-agent.json` (KHÔNG nằm trong repo).

Quy trình một tập (xem `kien-thuc/dao-ly/project-canvas-den-edit.md` để biết bẫy):
1. Viết `projects/dao-ly-tapN/scenes.json` + `loi-thoai.txt` (mẫu: `mk_scenes.py` của tập 3/4).
2. Tạo giọng: `make_voice.py` rồi `rebuild_voice.py` (cắt âm thừa đầu câu, nghỉ 0,167s giữa câu).
3. Sinh ảnh `genimg3.py` (đổi tiền tố T3→T4…), chờ `wait3.py`; sinh video `genvid3.py` (mỗi cảnh một câu lệnh chuyển động), chờ `wait_v3.py`.
4. Xếp node dọc: `layout.py T4 <x_gốc> <số_cảnh>`. Xuất file: đặt `metadata.exportRequest` mới cho node "Xuất file" (phải nằm trong khung nhìn; dùng `canvas_set_viewport`).
5. Dựng: `build_project.py` → `vf check` → `vf render`.

Lưu ý: các script có đường dẫn/tiền tố riêng từng tập (T3-, T4-, tap3, tap4): sửa trước khi chạy tập mới. Đừng đưa trẻ em/bé vào prompt (Flow chặn); xóa node phải dùng khóa `ids`.


## Video Flow bằng node video + thẻ @ảnh (thay node cấu hình)
`ep.py vid N` (Flow) không còn dùng node chữ + node cấu hình (đã làm prompt gửi Flow có `【Văn bản 1】`). Nó tạo **node video** trực tiếp, nối ảnh tham chiếu vào, prompt có thẻ `@tên-ảnh`. Tên ảnh = **tiêu đề node ảnh** (≤ 24 ký tự) = tên file ảnh trên Flow.
- `scenes.json` mỗi cảnh: `video_prompt` (tự do, ví dụ `@sanpham bay trên không`, `@me và @congai đi trên đường`); `mode` tùy chọn `frames` (ảnh là khung đầu) | `reference` (ảnh là thành phần). Không có `video_prompt` thì dùng `motion` + ảnh khung đầu của cảnh (đặt tên ảnh = id cảnh, ví dụ `c03`).
- Mặc định: chỉ nhắc ảnh khung đầu → `frames`; nhắc ảnh khác (hoặc nhiều ảnh) → `reference`.
- Ảnh ngoài cảnh (`sanpham`, `me`, `congai`…): đặt tiêu đề node ảnh đúng tên tag trên canvas. Thiếu tag thì cảnh đó bị bỏ qua và báo.
- `python -X utf8 canvas-tools/ep.py vid N [cảnh…] --dry` chỉ in prompt/tag/mode, không đụng canvas.
- Cần canvas bản có sửa `canvas-node-generation.ts` (node video hiểu thẻ `@[node:…]`) và `project.tsx` (giữ tiêu đề node video): build lại và mở lại canvas.
- Muse (`VIDEO_MODEL=muse::muse-video`) vẫn dùng kiểu cũ.

## Muse (ảnh/video thay Flow)
Canvas có kênh `muse` (muse2api, cổng 18610). Cài đặt, `.env`, bẫy: `kien-thuc/muse-canvas.md`. Kiểm tra nhanh: `python -X utf8 canvas-tools/muse.py models|test "prompt"` (đặt `MUSE2API_KEY` trong terminal, KHÔNG commit key).

## Cập nhật (tập 5–7)
Dùng `ep.py` thay các script cũ: `img N`, `waitimg N`, `clip_s.py N` (chọn 6/8/10s theo giọng), `vid N [cảnh…]`, `waitvid N`, `export N`, `layout N X0` (MỖI TẬP MỘT CỘT DỌC), `clean N`. Prompt chuyển động từng cảnh nằm trong `scenes.json` (trường `motion`). Sinh video theo đợt nhỏ để tránh captcha.
