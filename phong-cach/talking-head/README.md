# Talking Head Kit

Bộ kiến thức và công cụ để **AI edit video talking head dọc** (TikTok/Reels/Shorts) bằng After Effects.
Đưa cả thư mục này cho một AI agent có quyền chạy lệnh và có MCP điều khiển After Effects. AI sẽ đọc `AGENTS.md`
(Claude Code đọc `CLAUDE.md`, file này trỏ sang `AGENTS.md`) rồi làm theo.

## AI cần có

| Thứ | Bắt buộc | Ghi chú |
|---|---|---|
| After Effects 2024+ | có | đã dùng 2026 (26.0) |
| MCP điều khiển AE (`ae_run_script`, `ae_render`, …) | có | **đã kèm trong `ae-bridge/`**: server Node + extension "Claude Bridge". Cài theo `knowledge/00-cai-dat.md` |
| Node.js ≥ 18 | có | để chạy `ae-bridge` |
| Chạy lệnh shell + Python 3.10+ + ffmpeg | có | `pip install -r tools/requirements.txt` |
| GPU NVIDIA | nên có | phiên âm và tách người nhanh hơn 4–10 lần |
| Đọc ảnh | có | để so khung với mẫu |

AI không điều khiển được AE vẫn dùng được: phần chuẩn bị clip (`tools/`), phân tích mẫu, lập plan (knowledge/02 bước 1–4), và tham khảo công thức để dựng bằng công cụ khác.

## Bên trong

```
AGENTS.md, CLAUDE.md    hướng dẫn cho AI (đọc đầu tiên)
CON-THIEU.md            danh sách còn thiếu / chưa kiểm tra (anh cập nhật dần, đánh dấu [x])
ae-bridge/              cầu nối MCP với After Effects + extension Claude Bridge
knowledge/00            cài đặt trên máy mới
knowledge/01–10         thể loại, quy trình, thư viện hiệu ứng, chuẩn bị clip, âm thanh,
                        phân tích mẫu, bẫy lỗi, QC, ví dụ, tiếng Việt và ngành nhạy cảm
knowledge/nguon/        ghi chép gốc khi học 3 video hướng dẫn
lib/                    saas-lib.jsx (H.*) + th-lib.jsx (T.*), thư viện ExtendScript
tools/                  prep.sh, transcribe.py, cut_silence.py, matte.py (+ models/),
                        caption_groups.py, sfx_match.py, fonts_vi.py, sheet.sh, compare.sh
templates/              brief.md, plan.md, report.md
examples/foodtage/      ví dụ đầy đủ: video mẫu, clip gốc, tài nguyên, script dựng, kết quả render
```

## Bắt đầu một video mới

1. Tạo `projects/<slug>/assets/` và bỏ `raw.mp4` vào (thêm `ref.mp4` nếu có video mẫu phong cách).
2. Viết `projects/<slug>/brief.md` theo `templates/brief.md`.
3. Nói với AI: "Đọc AGENTS.md rồi làm video `<slug>`". AI sẽ gửi plan để duyệt một lần, sau đó tự dựng và render.

## Trạng thái kiểm chứng

| Phần | Trạng thái |
|---|---|
| `ae-bridge/` (bản chép, cài mới bằng `npm ci`) | `npm run check`: 13 tool ok, MCP bắt tay ok |
| tools/ (prep, transcribe, cut_silence, matte, caption_groups, compare, sheet, sfx_match) | đã chạy thật |
| Ví dụ Foodtage dựng bằng `build-v1-verified.jsx` → `result/foodtage_v1.mp4` | đã render thật |
| `lib/th-lib.jsx` + `examples/foodtage/build.jsx` (bản tách thư viện) | đã chạy lại trong AE: 8 giai đoạn không lỗi, 144 layer, khung giống hệt v1 (`check/L_cmp.jpg`) |
| Công thức Callaway, minimal premium (knowledge/03 B, C) | chỉ có trên giấy |
| Video tiếng Việt (font Việt, phong cách y tế) | chưa làm video nào |

Dung lượng khoảng 220 MB, phần lớn là `examples/foodtage/` (clip gốc 4K 55 MB, kết quả 43 MB, video mẫu, SFX).
