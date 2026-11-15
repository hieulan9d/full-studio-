# 05 — Dựng giao diện app chi tiết

Góp ý thực tế của người dùng: "các thông tin không được chi tiết như video mẫu". Giao diện là
nhân vật chính của video SaaS — khối trống, vạch xám thay chữ sẽ lộ ngay. Mục tiêu: mọi vùng
đều có **nội dung đọc được** (nhãn, số, đơn vị, trục, icon).

## 1. Hai cách

| Cách | Khi nào | Làm |
|---|---|---|
| **Ảnh chụp thật** | brief có `assets/screens/*.png` | Import ảnh, nhân bản N lần, mỗi bản mask 1 mảnh (thanh trên, sidebar, từng thẻ); Roughen Edges bo góc (sharpness 10, border 20); lấy màu nền bằng eyedropper; animate từng mảnh (công thức 04 §3.8) |
| **Vẽ bằng shape** | không có ảnh | `H.uiDashboard(o)` trong `lib/ui-dashboard.jsx`, đổi chữ/số theo brief |

Ảnh thật luôn đẹp và đúng sản phẩm hơn — nhắc người dùng gửi nếu có.

## 2. Bố cục chuẩn (comp `UI_Dashboard` 1600×1120)

Đo từ khung hình mẫu (cửa sổ 670 px trong ảnh × 2,39). Toạ độ là tâm phần tử.

| Vùng | Vị trí / cỡ | Nội dung |
|---|---|---|
| Cửa sổ | 1594×1114, bo 34, gradient `#22379a`→`#0a1240`, viền `#8fb8ff` 2 px 55% + vạch sáng 3 px ở mép trên | |
| Sidebar | x 5–295, nền `#0d1850` 45% | logo (sao + tên 29 px), ô tài khoản 262×64 (avatar 38, tên 18 semibold, vai trò 13), menu 6 mục y 251→485 (icon 18 + chữ 18, mục đang chọn nền `#2e45b8` 60%), nhãn PREFERENCE 13, Settings, Help Center, "Dark Mode" + công tắc ở đáy |
| Thanh trên | y 65 | ô tìm kiếm 550×48 (icon kính lúp + "Search"), 3 nút tròn 50 px có icon (lịch, chat, chuông), vạch chia y 112 |
| Lời chào | x 333 | "Hello, Mark" 54 semibold trắng (y 180); "How can I help you today?" 50 semibold `#5fb4ff` (y 253) |
| Chip | y 265, cao 44 | "Ask AI" (nền `#56a8ff`), "Management", "New project" (viền) — icon 13 + chữ 15 |
| Hàng giữa | y 358–750 | v1: Welcome (800 rộng) + Task completion (384); v2: Documents (399) + Analytics (779) |
| Hàng dưới | y 775–1076 | Costs (533×301, biểu đồ vùng) + danh sách task 2 cột (ô 285×52, ô tick 28) + nút AI tròn 90 px góc phải dưới |

Thẻ bên trong: fill `#3a5fd8` 22%, viền `#7e9cf0` 1 px 45%, bo 18.

## 3. Widget và độ chi tiết tối thiểu

| Widget | Phải có |
|---|---|
| Thẻ Documents | ô icon 52×52, nút 3 chấm, tiêu đề 42, thanh dung lượng (track + phần đầy `#5fb4ff`), "1,328 Files" trái + "1.3GB" phải |
| Biểu đồ cột Analytics | tiêu đề, chú thích 2 màu (Income/Outcome), nút năm "2025 ⌄", nhãn trục Y 5 mức (50K…10K) + đường lưới mờ, 8 tháng × 2 cột (trắng + xanh lơ, rộng 10, bo 5), nhãn tháng |
| Biểu đồ vùng Costs | tiêu đề, nút "Weekly ⌄", trục Y 0–40, đường răng cưa ~24 điểm + vùng tô 35% |
| Task completion | tiêu đề + "From all projects", vòng tiến độ hở đáy 210 px nét 16, icon tick giữa, số % đếm, nhãn 0% / 100% |
| Welcome | "Welcome back," + tên 40 + mô tả; thẻ lịch hẹn con: giờ, ngày, mô tả 2 dòng, "5 guests", 3 avatar chồng |
| Danh sách task | ô tick có dấu ✓ + chữ 17 trong viên bo 12 |
| Panel nền (zoom-out) | Documents lớn, biểu đồ vùng, thông báo có avatar + "8m ago", hàng chip task, 2 thẻ "New task" (tag, ✓ 99%, ⏱ 13h), Processes (donut + chú thích 4 mục %), Analytics nhỏ, **đường lưới mảnh chạy qua cả khung ở mép cửa sổ** |

Ký tự đặc biệt (⌄ ✦ ✓ ⏱) có thể không có trong font → vẽ bằng `H.icon` (chev, star, check, clock).

## 4. Chuyển động trong UI

- Số đếm và vòng tiến độ chạy cùng keyframe (vòng: Trim End = 66,7 × %).
- Đổi nội dung (v1 → v2): nội dung cũ tắt trong 0,2 s; nội dung mới trượt xuống 30 px + hiện (0,4 s, so le 0,06 s);
  cột biểu đồ mọc từ đáy (scale Y 0→100, so le 0,02 s/cột); thanh dung lượng chạy từ trái.
- Nút AI xuất hiện cuối cùng bằng `H.pop`.
- Panel nền: hiện cùng lúc camera lùi, opacity 0→60–85%, sau lớp `ADJ_DOF` blur 5–8 (không blur 14 — mẫu vẫn đọc được panel nền).

## 5. Nội dung chữ

Lấy từ brief (tên user, menu, số liệu). Không có thì dùng bộ mẫu trong `ui-dashboard.jsx`.
**Mọi nhãn** đổi được qua `o.labels` (search, costs, welcome, evTime, evDay, ev1, ev2, guests, task, taskSub, docs,
analytics, leg1, leg2, notifs, ntLabel, nt1, nt2, tag1, tag2, process, processLegend) — xem đầu `ui-dashboard.jsx`
và ví dụ đầy đủ ở `projects/orbiq/build.jsx`. Đổi nhãn cho đúng ngành của sản phẩm (vd. Orbiq: Recordings,
Meeting hours, Talk time, Action items) — để nhãn mặc định "Documents/Costs" cho app họp là lỗi nội dung.
Số liệu nên tròn, đẹp, nhất quán giữa thẻ chính và panel nền (vd. 1,328 Files / 1.3GB ở cả hai).
