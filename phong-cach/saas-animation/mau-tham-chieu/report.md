# Mẫu tham chiếu — Orbiq (kit 1.3.0)

Video thử của kit: **Orbiq**, trợ lý AI ghi chú cuộc họp, tông tím (`H.HUE = 45`), 20 s. Dựng hoàn toàn bằng
`projects/orbiq/build.jsx`.

| File | Nội dung |
|---|---|
| `orbiq_v3_final.mp4` | **Bản chuẩn 16:9** — nhạc thật "Better Times are Coming" (Mixkit, 119,8 BPM) + 36 SFX, −14 LUFS, qc_auto 9/9 PASS |
| `orbiq_916_v1_final.mp4` | **Bản 9:16** (1080×1920) — nhạc tự tạo 120 BPM + 36 SFX, −14 LUFS, qc_auto PASS |
| `contact_v3.jpg` / `contact_916.jpg` | khung mỗi 1 s của hai bản trên |
| `orbiq_v1.mp4`, `contact.jpg` | bản đầu (kit 1.1, không tiếng) — giữ để so sánh |

## Cảnh (mốc trong MAIN)

| # | Cảnh | Giây | Nội dung |
|---|---|---|---|
| 1 | logo-reveal | 0.0–1.1 | sao + "Orbiq" blur-in |
| 2 | dashboard-rise | 1.0–4.1 | "Meeting Hub / All your meetings in one place", chip Record / Live notes, thẻ "Summary ready", tiến độ 40→88% |
| 3 | zoom-out-overview | 3.9–7.1 | camera lùi, panel nền chi tiết, chữ nền "Orbiq", đổi sang Recordings + Meeting hours |
| 4 | feature-orbit | 7.0–9.2 | "Live / Notes", 6 bong bóng icon |
| 5 | ai-chat | 9.1–13.2 | "What did we decide on the launch?" → trả lời 3 dòng |
| 6 | card-ring | 13.1–16.25 | 1 → 3 thẻ → uốn thành trụ 8 thẻ, xoay |
| 7 | star-morph | 16.2–17.45 | sao tím-hồng nuốt trụ thẻ, thành icon |
| 8 | end-card | 17.4–20.0 | "Orbiq / Meet smarter with Orbiq" |

## Lỗi còn giữ
- Bong bóng và nút AI hơi rực so với phần còn lại.
- Cảnh 2: thẻ "Summary ready" che chip "New meeting" của dashboard.
- Bản v3: phách nhạc rơi muộn ~0,1 s so với mốc chuyển cảnh (cộng 0,1 vào `musicStart` để khớp hẳn).
- Chữ trong thẻ trả lời chat còn nhỏ.
