# 12. Hook: chữ kèm hình trong vài giây đầu

Rút từ video mẫu tiếng Việt "Cách mở đầu video thu hút hơn" (phân tích ở `11-vi-du-hook-mo-dau-viet.md`, 2026-11-16), cộng luật sẵn có ở `01-the-loai.md`.
**Độ tin cậy:** đây là lời khuyên của một người làm nội dung, **chưa được đo trên kênh nào của dự án này**. Mục 5 nói cách đo.

## 1. Luật cốt lõi
Hook không chỉ là chữ. **Mỗi từ khoá trong hook có một hình hoặc đồ hoạ minh hoạ cho chính từ đó**, hiện cùng lúc, để người xem hình dung ngay.
- Chữ đơn giản thì dễ lướt qua; chữ có hình thì người xem "thấy" điều đang nghe (lập luận của video mẫu; chưa kiểm).
- Hình có thể là ảnh minh hoạ, icon, emoji, số liệu, thẻ video, đường kẻ chỉ vào chỗ cần nhìn (video mẫu dùng khung nét đứt sáng quanh chữ + ảnh + emoji).

## 2. Công thức lời cho 3–5 giây đầu
1. **Lời hứa cụ thể** (một ý, có kết quả): "mở đầu video thu hút hơn chỉ với một yếu tố đơn giản".
2. **Bằng chứng nhanh** (một câu): số liệu, ví dụ hoặc kết quả thật. **Chỉ nói điều có thật và kiểm được**; không bịa số.
3. Vào ý chính ngay, không chào hỏi dài.
Nếu nhắc tên một người hoặc sản phẩm: cắt sang mặt/hình của họ trong khoảng ±0,25 s quanh lúc nói tên, kèm thẻ tên (cần có phép nếu là người thật khác).

## 3. Cách đặt chữ + hình
| Mục | Quy định |
|---|---|
| Chữ | hai cấp: dòng nhỏ làm nhãn, dòng to đậm nghiêng làm từ khoá. Font phải có dấu tiếng Việt (`tools/fonts_vi.py`) |
| Vị trí | ngực (dưới cằm) hoặc đỉnh đầu; **không che mặt** |
| Mốc giờ | chữ và hình vào trong ±0,3 s quanh mốc từ trong transcript |
| Vào | mờ/nhoè rồi nét ~0,3–0,4 s |
| Hình | cùng giây với từ khoá; nếu là ví dụ dài thì chia đôi màn hình (đồ hoạ ~46% trên, người ~54% dưới) để người nói vẫn hiện |
| Số hình | mỗi từ khoá một hình; không chồng hai hình lên nhau |
| Nguồn hình | ghi trong `plan.md` mục Hook: Flow/Muse (ảnh), icon, quay thật. Ảnh rẻ hơn clip video |

## 4. Nội dung nhạy cảm (y tế, phụ khoa, thực phẩm chức năng)
Hình minh hoạ dùng **sơ đồ hoặc minh hoạ**, không ảnh cơ thể thật, không trước/sau (xem `10-tieng-viet-va-nganh-nhay-cam.md`). Video mẫu dùng ảnh nướu viêm thật: **đừng bắt chước phần này** cho nội dung y tế. Lời hứa trong hook cũng phải dùng "hỗ trợ/giúp/góp phần", bỏ "trị/khỏi/nhanh/100%".

## 5. Đo hiệu quả (để biết lời khuyên có đúng với kênh này không)
- Làm một vài video có hook chữ+hình và một vài video hook chỉ có chữ, cùng chủ đề và độ dài.
- Ghi vào `report.md`: lượt xem sau 48 giờ, tỉ lệ xem hết, thời gian xem trung bình. Chưa có số liệu từ kênh của bạn thì ghi "chưa đo".
- Không nói với người dùng rằng cách này "tăng view" nếu chưa có số đo.

## 6. Còn thiếu
- Chưa có hàm `T.*` cho chữ hai cấp, thẻ hình minh hoạ, chia đôi màn hình (xem `CON-THIEU.md` B3b). Dựng bằng `T.txt` + `H.shape` + `T.punchIn` rồi kiểm khung.
- Chưa dựng thử hook nào theo luật này trên clip thật.
