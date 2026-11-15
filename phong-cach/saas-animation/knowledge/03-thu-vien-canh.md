# 03 — Thư viện loại cảnh

Storyboard chọn cảnh từ danh sách này. Cột "Hàm" là hàm dựng sẵn trong `lib/` (đã chạy được);
"tay" nghĩa là dựng bằng các hàm cơ bản theo công thức ở `04-cong-thuc-ae.md`.
Thời gian là thời gian cục bộ trong precomp cảnh.

## Cảnh có hàm dựng sẵn

### logo-reveal — mở đầu
- **Hàm:** `H.sceneLogo({name:'S01_Logo', dur:1.5, word:'Brand', outAt:0.85})` (bỏ `scale` → tự tính theo độ dài tên)
- **Hình:** sao 4 cánh xoay 45°→0 + wordmark blur→nét, cả cụm phóng 96→100%. `outAt`: cụm trượt
  xuống và tắt (dùng khi cảnh sau là cửa sổ dâng lên che logo).
- **Cần trong MAIN:** `ENV_Space` + `ENV_Planet` (vòng chân trời ở đáy).
- **Dài:** 1 ô lưới.

### dashboard-rise — cửa sổ app dâng lên + tiêu đề + chip bật ra
- **Hàm:** `H.uiDashboard(o)` (tạo `UI_Dashboard`, xem 05) rồi
  `H.sceneDashboardRise({name:'S02_Dashboard', dur:3.2, title:'…', sub:'…', chips:['Record','Live notes'], chipIcons:['chat','doc'], card:['dòng 1','dòng 2'], cardTitle:'…'})`
- **Hình:** cửa sổ dâng (0,6 s snap) + `H.titleBlock`; chip kính trái và thẻ kính phải bật ra so le 0,15 s;
  số đếm/vòng tiến độ chạy trong `UI_Dashboard`. Cuối cảnh: cả cảnh scale 97%→52% để giao cảnh sau.
- **Cần trong MAIN:** `ENV_Planet` dời lên sau cửa sổ (pos y 540→145, scale 100→45 trong 0,6 s), tắt ở cuối cảnh.
- **Dài:** 3 ô.

### zoom-out-overview — camera lùi, cửa sổ lơ lửng giữa panel nền, đổi nội dung
- **Hàm:** `H.sceneZoomOut({name:'S03_ZoomOut', dur:3.25, word:'Brand', uiOffset:2.9, labels:…, v2:…})` — nhận cùng
  object `o` đã đưa cho `uiDashboard` (để panel nền dùng chung nhãn/số liệu). `uiOffset` = giây UI-local ở đầu cảnh
  (= startTime cảnh này trong MAIN − startTime cảnh dashboard-rise).
- **Hình:** panel nền chi tiết + đường lưới, chữ khổng lồ 330 px (32%) trượt xuống, `ADJ_DOF` blur 6, quầng sau cửa sổ,
  cửa sổ 72→57→54%; nội dung đổi ở `tSwap`.
- **Dài:** 3 ô.

### feature-orbit — vòng kính giữa + chữ 2 dòng + bong bóng icon quay
- **Hàm:** `H.sceneOrbit({name, dur:2.25, line1:'New', line2:'Updates', icons:['star','doc','chart',…]})`
- **Dài:** 2 ô. Dùng làm "chương mới", ra mắt tính năng.

### ai-chat — gõ câu hỏi, gửi, AI trả lời
- **Hàm:** `H.sceneChat({name, dur:4.15, user:'Mark Smith', question:'…?', aiName:'AI Agent', answer:['• …','• …'], scale:145})`
- **Ghi chú:** câu hỏi ≤ 32 ký tự; câu trả lời 2–4 dòng, mỗi dòng ≤ 70 ký tự.
- **Dài:** 4 ô.

### card-ring — thẻ → 3 thẻ → dải uốn thành trụ 3D xoay
- **Hàm:** tạo thẻ `H.cardComp('UI_Card_A','star')`, `…_B 'doc'`, `…_C 'check'` rồi
  `H.sceneCardRing({name:'S06_Cards', dur:4.4, cards:[A,B,C,A,B,C,A,B]})`
- **Ghi chú:** 8 thẻ; thẻ đầu danh sách là thẻ giữa. Muốn nội dung thật trên thẻ: sửa comp thẻ.
- **Dài:** 3 ô (+ phần cuối được cảnh star-morph dùng lại).

### star-morph — sao hồng-tím nuốt cảnh trước, thu thành icon logo
- **Hàm:** `H.sceneStarMorph({name:'S07_Star', inner:<comp cảnh trước>, innerOffset:<giây của cảnh trước tại lúc bắt đầu>})`
- **Dựng S08_End TRƯỚC**: `H.sceneEnd` lưu `H.lastEndIcon` / `H.lastEndScale`, star-morph tự bay về đúng icon.
  Nếu đã nạp lại thư viện giữa chừng (mất biến), truyền tay `iconPos` và `iconScale = 92 × scale / 1800`.
- **Dài:** 1 ô. Luôn đi ngay trước end-card.

### end-card — logo + tagline, cột sáng từ dưới
- **Hàm:** `H.sceneEnd({name:'S08_End', dur:2.75, word:'Brand', tagline:'Discover Brand today'})` — bỏ `scale` để tự tính
  theo độ dài tên (`H.logoScale`: cụm logo rộng ~1000 px; tên ngắn được phóng tới 220%). Cụm tự căn giữa.
- **Cần trong MAIN:** `ENV_Planet` thứ hai (pos y 700→540 khi vào), tắt cột sáng trên trong `ENV_Space` 17,2→17,6 s.
- **Dài:** 2–3 ô.

## Cảnh dựng tay (công thức ở 04)

| Loại | Mô tả | Công thức |
|---|---|---|
| text-pop | Câu ngắn hiện từng từ (Position + Blur + Opacity theo Words), null trượt ngang 2 nhịp | 04 §3.1 |
| app-icon-pop | Icon app trong khung bo góc trắng, bóng mềm, bật vào | 04 §3.2 |
| version-pill | Nhãn "2.0" + 4 vòng sóng lan ra, phóng lấp màn để chuyển | 04 §3.3 |
| glass-pair | 2 thẻ kính UI bật từ 2 bên, icon/chữ thấy qua kính bị méo | 04 §3.4 (HD2) |
| video-grid | Lưới 12 ô kính có video, bay từ xa, lệch 3 frame | 04 §3.5 |
| search-prompt | Thanh tìm kiếm phóng to, gõ prompt, nút gửi có ánh màu, kết quả là ảnh | 04 §3.6 |
| stat-counter | Số % khổng lồ đếm 0→99→0, bevel, camera 2 đoạn | 04 §3.7 |
| cursor-tour | Ảnh chụp app cắt mảnh, con trỏ 3D lướt, thẻ phóng lên khi hover | 04 §3.8 |
| circle-reveal | Chữ lớn lộ qua vòng tròn lan, các vòng nhạt dần tới trắng | 04 §3.9 |
| feature-list | 3–4 dòng tính năng, mỗi dòng icon kính + chữ blur-in so le 0,25 s | dùng `H.glassCard` + `H.blurIn` |

## Chọn cảnh theo thời lượng

- **15 s:** logo-reveal → dashboard-rise → ai-chat (3 ô) → star-morph → end-card.
- **20 s:** như NeuraFlow: logo → dashboard → zoom-out → orbit → chat → card-ring → star → end.
- **30 s:** thêm text-pop sau logo (vấn đề/hứa hẹn), feature-list hoặc search-prompt sau chat, stat-counter trước card-ring.

Mỗi tính năng trong brief nên có đúng một cảnh "khoe" nó; tiêu đề cảnh dùng tên tính năng.
