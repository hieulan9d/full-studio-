# SaaS AE Kit

Bộ kiến thức + thư viện để **AI tự dựng video SaaS animation trong After Effects** chỉ từ một brief —
ra cả **16:9 và 9:16, có nhạc nền và SFX**, chuẩn độ to −14 LUFS.
Kiểu video: quảng cáo/giới thiệu phần mềm 15–30 giây — nền tối có cột sáng và vòng chân trời,
giao diện kính, chữ hiện bằng blur, số đếm, chat AI, thẻ 3D xoay, logo kết.

Rút ra từ: phân tích 2 video hướng dẫn AE (nền SaaS, kính, chat, số đếm, con trỏ 3D…), 1 video mẫu
(NeuraFlow, 20 giây) và quá trình dựng lại video mẫu đó qua 4 phiên bản, kèm mọi lỗi đã gặp và cách sửa.

## Cách dùng (người dùng)

1. Tạo thư mục `projects/<ten-video>/` (chữ thường, gạch nối).
2. Chép `brief-template.md` vào đó thành `brief.md`, điền nội dung.
3. (Tuỳ chọn) bỏ tài sản vào `projects/<ten-video>/assets/`: logo, nhạc, ảnh chụp giao diện thật, video tham chiếu `ref.mp4`.
4. Mở After Effects (panel **Claude Bridge** phải hiện "đã kết nối").
5. Mở Claude Code trong thư mục `saas-ae-kit/` và nói: **"dựng video <ten-video>"**.

AI sẽ tự: đọc brief → (phân tích video tham chiếu) → viết storyboard theo nhịp nhạc → dựng project AE
theo từng cảnh, tự chụp khung kiểm tra và sửa → render → viết báo cáo. Kết quả ở `output/<ten-video>/`.

Góp ý sau khi xem: nói thẳng chỗ chưa ưng ("đoạn thẻ phẳng sang tròn bị giật", "giao diện chưa chi tiết
như mẫu") — AI sửa rồi render bản mới `_v2`, `_v3`…

## Cần có trên máy

| Thứ | Ghi chú |
|---|---|
| After Effects 2026 | Đã thử với 26.0 |
| MCP `after-effects` + panel Claude Bridge | Server `claude-ae-bridge`; panel cài bằng `install-panel.ps1`. Trong AE bật *Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network* |
| ffmpeg, ffprobe | Ghép khung kiểm tra, phân tích video tham chiếu |
| Python 3 + numpy | Đo nhịp nhạc (`tools/beats.py`) |
| Font Inter (khuyên dùng) | Không có thì tự dùng Segoe UI |
| Plugin (không bắt buộc) | Deep Glow, Bounce it… Kit chỉ dùng hiệu ứng có sẵn của AE |

## Cấu trúc

```
saas-ae-kit/
├─ CLAUDE.md               quy trình AI làm theo (đọc đầu tiên)
├─ README.md               file này
├─ brief-template.md       mẫu brief cho người dùng
├─ knowledge/
│  ├─ 01-phong-cach.md         ngôn ngữ hình ảnh SaaS + con số chuẩn
│  ├─ 02-nhip-chuyen-dong.md   nhạc/BPM, ease, so le, chuyển cảnh, SFX
│  ├─ 03-thu-vien-canh.md      danh mục loại cảnh + hàm thư viện
│  ├─ 04-cong-thuc-ae.md       công thức kỹ thuật từ video hướng dẫn (thông số cụ thể)
│  ├─ 05-giao-dien-ui.md       dựng UI dashboard chi tiết như mẫu
│  ├─ 06-du-an-ae.md           cấu trúc project, đặt tên, label
│  ├─ 07-mcp-va-bay-loi.md     điều khiển AE qua MCP + mọi bẫy đã gặp
│  ├─ 08-qc.md                 checklist kiểm tra, mức độ lỗi
│  ├─ 09-vi-du-neuraflow.md    ví dụ đầy đủ: phân tích mẫu + bản dựng
│  ├─ 10-viet-noi-dung.md      phát triển brief, viết chữ, nhãn UI theo ngành
│  ├─ 11-khung-doc.md          làm bản 9:16
│  └─ 12-am-thanh.md           SFX, nhạc nền, độ to
├─ lib/
│  ├─ saas-lib.jsx         thư viện ExtendScript (H.*): ease, layer, kính, môi trường, cảnh dựng sẵn
│  └─ ui-dashboard.jsx     dựng dashboard chi tiết + panel nền
├─ audio/sfx/              27 SFX tự tổng hợp (whoosh, pop, typing, riser, impact…)
├─ audio/music/            8 bài nhạc thật Mixkit + giấy phép + INDEX.md (BPM, điểm cắt, tâm trạng)
├─ tools/                  sfx_gen.py, music_gen.py, finalize.sh, qc_auto.py, beats.py, analyze-ref.sh,
│                          compare.sh, sheet.sh, wait-files.sh
├─ CHANGELOG.md            kit sửa gì sau mỗi video (AI tự cập nhật)
├─ templates/              storyboard.md, report.md
├─ projects/               mỗi video một thư mục: _example-neuraflow (brief), orbiq (brief + storyboard + build.jsx đã chạy)
└─ output/                 project AE, khung kiểm tra, video render (không đưa vào git)
```

## Giới hạn hiện tại

- Giao diện được **vẽ bằng shape**. Muốn giống sản phẩm thật 100%, bỏ ảnh chụp màn hình vào
  `assets/screens/` — AI sẽ cắt ảnh thành từng mảnh (cách của video hướng dẫn 2) thay vì vẽ.
- Nhạc: 8 bài thật (Mixkit — dùng được cho mạng xã hội/quảng cáo online/YouTube, **không** dùng cho TV). SFX tự tổng hợp.
  Muốn thêm nhạc: đưa file vào `assets/`, hoặc bảo AI tìm — AI hỏi bạn từng file trước khi tải.
- Chỉ có một phong cách (tối, cột sáng, kính). Phong cách khác hẳn = thêm gói mới (đề xuất: `styles/<tên>/`).
- `lib/` đã chạy trên AE 2026 / Windows: video thử **Orbiq** (20 s, tông tím) dựng hoàn toàn bằng kit qua
  `projects/orbiq/build.jsx` → `output/orbiq/orbiq_v1.mp4`. Lần thử đó sửa 7 lỗi của kit (xem `projects/orbiq/log.md`).
- Đổi tông màu cả video bằng một số: `H.HUE` (xem `knowledge/01-phong-cach.md`).
