# 06 — Cấu trúc project AE

Mục tiêu: editor mở project ra là sửa tay được ngay — giống project một người làm nghề dựng.

## 1. Thư mục (`H.setupFolders()`)

| Thư mục | Chứa |
|---|---|
| `00_MAIN` | `MAIN` — comp ghép cuối, 1920×1080, 30 fps, đúng thời lượng |
| `01_ENV` | `ENV_Space` (nền, sao, quầng, cột sáng), `ENV_Planet` (vòng chân trời) |
| `02_SCENES` | `S01_Logo`, `S02_Dashboard`, … mỗi cảnh một comp, thời gian cục bộ từ 0 |
| `03_UI` | comp giao diện dùng lại: `UI_Dashboard`, `UI_Card_A/B/C` |
| `04_SFX` | file âm thanh hiệu ứng |
| `05_MUSIC` | nhạc |
| `06_ASSETS` | logo, ảnh chụp màn hình, video |

## 2. Thứ tự layer trong MAIN (trên → dưới)

```
ADJ_Bloom        glow toàn cảnh (threshold 82, radius 70, intensity 0.35)
ADJ_Grade        Hue/Sat (−8, −28) + Brightness/Contrast (−12, +22)
VIG_Vignette     solid đen, mask ellipse đảo, feather 500, 55%
S08_End … S01_Logo   các cảnh, startTime = mốc storyboard, chồng 0,1–0,2 s
ENV_Planet_End   (nếu có end card)
ENV_Planet_Intro collapse transformations BẬT (không thì hành tinh bị cắt phẳng ở mép comp)
ENV_Space
MUSIC / SFX_*
```

## 3. Đặt tên layer

| Tiền tố | Loại | Ví dụ |
|---|---|---|
| `TXT_` | chữ | `TXT_Title`, `TXT_Question` |
| `UI_` | phần tử giao diện | `UI_Window`, `UI_Chip_0` |
| `ICON_` | icon | `ICON_Star`, `ICON_SB_Chat` |
| `NULL_` | null gom chuyển động | `NULL_Scene`, `NULL_Logo`, `NULL_Cylinder` |
| `CARD_` / `CHIP_` / `BUBBLE_` | khối kính | `CARD_Answer`, `CARD_k0` |
| `…_Glass` | adjustment kính dưới khối | `CARD_Answer_Glass` |
| `BG_` / `ENV_` | nền | `BG_Grid`, `ENV_Beam_Core` |
| `ADJ_` | adjustment | `ADJ_DOF`, `ADJ_Exit` |
| `FX_` | hiệu ứng ánh sáng | `FX_Purple`, `FX_Window_Glow` |
| `SFX_` | âm thanh | `SFX_Whoosh_S02` |
| `V1_` / `V2_` | nội dung theo trạng thái | `V2_Bar_In_3` |

## 4. Label màu

1 null (đỏ) · 5 adjustment · 8 nền · 9 chữ/icon/cảnh · 10 UI/kính · 11 nội dung đổi trạng thái / hiệu ứng đặc biệt.

## 5. Quy ước chuyển động

- Mỗi cảnh có `NULL_Scene` ở (960,540) để trôi/phóng cả cảnh và để phóng to khi cảnh bị nhỏ (`H.mulScale`).
- Khối nhiều layer → một null riêng; animate null, không animate từng layer con.
- Cảnh kết thúc bằng `ADJ_Exit` (blur thoát) ở trên cùng.
- Comp UI dùng ở nhiều cảnh: đặt `startTime` của layer sao cho thời gian bên trong comp UI = thời gian toàn cục − mốc đầu tiên dùng nó (vd. UI_Dashboard dùng ở S02 bắt đầu 1,0 s và S03 bắt đầu 3,9 s → trong S03 đặt `startTime = -2.9`). Nội dung đổi trạng thái liền mạch qua 2 cảnh.
- Muốn dựng lại một comp đang được dùng ở comp khác: `H.clearComp(c)` — **không** xoá comp (xoá comp là mất layer ở nơi dùng).

## 6. Lưu & phiên bản

- Lưu `.aep` sau mỗi cảnh (`app.project.save()`).
- Render ra `<slug>_v1.mp4`, `_v2`… không ghi đè bản trước (người dùng so sánh).
- Ghi `report.md` mỗi bản: đã đổi gì so với bản trước.
