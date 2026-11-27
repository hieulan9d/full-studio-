# Hướng dẫn AI dựng video kiểu Hằng Thu Pharma

Đọc trước: `memory/README.md` và các file trong đó → `PHONG-CACH.md` → `ref-notes.md` mục liên quan.

## Quy trình
1. **Hỏi cho đủ** (một lần): dạng `ngan` hay `dai`; clip người nói; sản phẩm và nhãn; chữ CTA; nhạc nền (dạng dai); ảnh/clip B-roll đã có chưa.
2. **Mốc từng từ** (CPU được):
   ```
   python phong-cach/talking-head/tools/transcribe.py <clip.mp4> <du-an>/words.json --lang vi --cpu --prompt "<tên sản phẩm, hoạt chất>"
   ```
   **Đọc soát và sửa hết lỗi chính tả, tên sản phẩm, số liệu** trước khi dựng. Whisper hay sai tên riêng và bịa câu ở đuôi lặng.
3. Cắt khoảng lặng nếu cần (`talking-head/tools/cut_silence.py`) rồi phiên âm lại.
4. **Viết `plan.md`** (bảng giây → chữ/đồ hoạ, kịch bản trên màn, SFX, câu khẳng định sức khoẻ) và **chờ người dùng duyệt**. Chỉ sau đó mới tạo ảnh/clip AI (tốn điểm, theo `HUONG-DAN-AI.md`).
5. Viết `plan.json` (mẫu: `mau/plan-ngan.json`, `mau/plan-dai.json`).
6. Xem khung thử rồi mới dựng cả video:
   ```
   python -X utf8 -B phong-cach/hang-thu-pharma/tools/dung.py <du-an>/plan.json -o <du-an>/thu --khung 1,5,11,21,40
   python -X utf8 -B phong-cach/hang-thu-pharma/tools/dung.py <du-an>/plan.json -o <du-an>/final.mp4
   ```
7. Kiểm: số khung, độ to, lưới khung (`ffmpeg -vf fps=1,scale=180:-2,tile=10x6`), dấu tiếng Việt, chữ không che mặt, không che nhãn sản phẩm.
8. Giao kèm `report.md` (câu khẳng định sức khoẻ, chỗ chưa kiểm). Tên file: `<YYMMDD> HTPM <tên có dấu> final.mp4`. Ghi `memory/`.

## plan.json
Đường dẫn tính từ thư mục chứa file.

| Khoá | Ý nghĩa |
|---|---|
| `mau` | `"ngan"` hoặc `"dai"` |
| `video` | clip người nói (tự co về 1080×1920/30) |
| `words` | `[[từ, bắt đầu, kết thúc], …]` hoặc JSON của `transcribe.py` |
| `matte` | video trắng/đen người nói (`talking-head/tools/matte.py`); bắt buộc cho `dark`, nên có cho `title` |
| `caption` | `style`: `ngan`, `hop_toi`, `hop_trang`, `vien`; `accent` (mã màu); `keywords` (danh sách); `y` |
| `items` | danh sách phần tử, mỗi cái có `type`, `t`, `end` (giây) |
| `audio` | `bgm` (file), `bgm_db` (mặc định −18), `lufs`, `sfx_auto` (mặc định bật), `sfx`: `[{"t":3.0,"name":"pop_a","db":-14}]` (tên trong `saas-animation/audio/sfx`) |

| `type` | Trường riêng | Dùng cho |
|---|---|---|
| `hook` | `lines`; `pill` (dai) | cả hai |
| `icons` | `icons`: 2 emoji; `color` | ngan |
| `card` | `side` `trai`/`phai`, `tag`, `title`, `sub`, `image`, `color` | ngan |
| `title` | `lines` (2), `colors`, `number` | ngan |
| `dark` | (cần `matte`) | ngan, đoạn kết |
| `zoom` | `from`, `to` | ngan |
| `steps` | `cards` (3): `image`, `label`, `sub`, `color` | dai |
| `pair` | `cards` (2): `image`, `label`; `pill` | dai |
| `bigtitle` | `text`, `pill` | dai |
| `split` | `image`, `tag`, `caption`, `footer`, `color` | dai |
| `product` | `image` (nền), `pill`, `info` {`tag`, `title` [2 dòng], `sub`}, `pack` (PNG tách nền), `color` | dai |
| `cta` | `pill`, `lines` (2), `disclaimer` | dai |

## Luật dựng
- Theo khe thời gian ở `ref-notes.md` mục 1; mốc chữ bám mốc từ.
- `dai`: không để vùng trên đầu trống quá ~6 s trong 25 s đầu; đổi mẫu đồ hoạ giữa các khe; một màu chủ đạo theo sản phẩm; không phóng khung.
- `ngan`: mỗi video một bộ màu; thẻ ở hai bên đầu, không che mặt (x 405–675 để trống).
- Mỗi lúc chỉ một thứ ở vùng trên: đừng cho `title`/`bigtitle` chồng thời gian với thẻ.
- Người nói đang cầm và chỉ sản phẩm thì không phủ màn sản phẩm/chia đôi lên đoạn đó.
- Chữ trên bao bì phải đến từ ảnh chụp thật, không để AI vẽ.
- SFX tự đặt chỉ là đề xuất: người dùng từng chê SFX do AI tự đặt, nên báo rõ và hỏi sau lần giao đầu.
