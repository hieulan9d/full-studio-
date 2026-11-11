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


## Cập nhật (tập 5–7)
Dùng `ep.py` thay các script cũ: `img N`, `waitimg N`, `clip_s.py N` (chọn 6/8/10s theo giọng), `vid N [cảnh…]`, `waitvid N`, `export N`, `layout N X0` (MỖI TẬP MỘT CỘT DỌC), `clean N`. Prompt chuyển động từng cảnh nằm trong `scenes.json` (trường `motion`). Sinh video theo đợt nhỏ để tránh captcha.
