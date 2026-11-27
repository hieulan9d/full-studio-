---
name: phim-ai-flow-prompt
description: Quy chuẩn viết prompt tạo video bằng Flow cho phim ngắn, drama gia đình và cổ trang. Dùng khi người dùng yêu cầu viết prompt Flow, chuyển kịch bản thành prompt video, xây dựng asset hoặc kiểm tra continuity.
---

# Skill: Quy chuẩn làm phim AI bằng Flow

## Mục tiêu
Viết prompt video rõ ràng, có thể copy trực tiếp vào Flow, bám sát kịch bản, giữ continuity và điều khiển hình ảnh/hành động/diễn xuất chính xác.

## 1. Thời lượng
- Mỗi prompt là một cảnh/đoạn video độc lập.
- Thời lượng tùy nội dung từng cảnh, từ **1 đến tối đa 15 giây**.
- Tự cân đối thời lượng phù hợp với lượng hành động, thoại và nhịp cảm xúc của cảnh.
- Ghi rõ thời lượng đã chọn ngay đầu prompt, ví dụ: `Tạo video 6 giây...` chỉ khi cảnh thực sự cần 6 giây.
- Không mặc định mọi prompt đều 15 giây hoặc bất kỳ thời lượng cố định nào.
- Không kéo dài cảnh để đủ thời gian; không nhồi hành động/thoại khiến cảnh bị gấp.
- Giới hạn tối đa 15 giây mỗi cảnh để tránh mất điểm và đảm bảo chất lượng tạo video.
- **Không tự chia shot hoặc liệt kê Shot 1, Shot 2, Shot 3** trừ khi người dùng yêu cầu nhiều shot/cắt cảnh.
- Mặc định mô tả **một cảnh quay liền mạch**, camera và hành động diễn ra tự nhiên trong thời lượng yêu cầu.
- Nếu kịch bản cần nhiều góc máy/montage, chỉ chia shot khi người dùng yêu cầu.

## 2. Định dạng video & Xuất Kép Ngang + Dọc Độc Lập Trên Flow
- Photorealistic, live-action, người thật.
- Phong cách phim truyền hình/điện ảnh, diễn xuất chân thực.
- **Mặc định mỗi lần sản xuất video bắt buộc tạo riêng 2 lượt độc lập trên Google Flow**:
  1. **1 lượt Ngang `16:9` riêng biệt** (`size: "16:9"` → xuất `1920×1080` cho YouTube/Facebook) — **bắt buộc lưu tách riêng vào thư mục con `Ngang\`** bên trong thư mục hoàn thiện của kênh/nhãn hàng (`<Thư_mục_Kênh>\Ngang\`).
  2. **1 lượt Dọc `9:16` riêng biệt** (`size: "9:16"` → xuất `1080×1920` cho TikTok/Reels/Shorts) — lưu tại thư mục gốc hoàn thiện của kênh/nhãn hàng.
  *(Không crop từ 16:9 sang 9:16 hay ngược lại).*
- Không hoạt hình, CGI giả tạo, phong cách game.
- Không tự thêm phụ đề, chữ trên màn hình, logo hoặc watermark.

## 3. Image reference và asset
Dùng đúng ảnh tham chiếu và mã người dùng đã chỉ định:
- CH-1, CH-2...: nhân vật
- BO-1, BO-2...: bối cảnh
- PR-1, PR-2...: đạo cụ

Bắt buộc:
- Giữ nguyên 100% khuôn mặt, tóc, vóc dáng, đặc điểm cơ thể và trang phục theo image reference.
- Không redesign, không đổi quần áo, không tự thêm nhân vật.
- Không thêm đạo cụ hoặc chi tiết bối cảnh không có trong reference/kịch bản.
- Trong prompt, gọi nhân vật bằng mã image/CH, không tự mô tả ngoại hình làm sai reference.

Mỗi prompt có mục `IMAGE XUẤT HIỆN`, chỉ liệt kê ảnh thực sự xuất hiện. Không liệt kê asset không dùng.

## 4. Camera và ngôn ngữ hình ảnh
- Cận cảnh là chủ đạo: close-up/extreme close-up; medium shot chỉ khi cần thấy hành động; wide shot chỉ để xác lập không gian hoặc cho thấy hành động tổng thể.
- Khi phù hợp, ưu tiên khoảng 70–80% hình ảnh là cận cảnh/đặc tả.
- Tập trung vào mắt, biểu cảm, môi khi thoại, bàn tay, phản ứng và chi tiết hành động.
- Ưu tiên camera cố định hoặc chuyển động nhẹ có lý do.
- Tránh zoom liên tục, rung máy vô cớ, lia máy quá nhiều, toàn cảnh kéo dài.
- Mặc định không chia nhiều shot; mô tả một khung/cảnh liền mạch với chuyển động camera tinh tế.

## 5. Chốt không gian và continuity
Với cảnh có nhiều nhân vật hoặc hành động phức tạp, thêm mục `CHỐT KHÔNG GIAN`:
- Xác định trái/phải, trước/sau, vị trí đứng/ngồi, hướng nhìn, đồ vật đang ở đâu.
- Giữ trục không gian và vị trí nhân vật.
- Không tự đảo trái/phải, đổi trục, đổi bối cảnh, đổi tư thế hoặc làm đạo cụ biến mất.
- Mọi thay đổi vị trí phải có hành động chuyển tiếp rõ ràng.

## 6. Hành động rõ ràng, dứt khoát
Không để nhân vật đi lại, xoay vòng hoặc diễn hành động vô nghĩa.
Mô tả hành động theo trình tự:
1. Vị trí ban đầu.
2. Hướng nhìn.
3. Hành động bắt đầu.
4. Các bước thực hiện.
5. Phản ứng của nhân vật khác.
6. Trạng thái kết thúc.

Đối với cảnh vật, đẩy, kéo, tát, nắm, đánh hoặc hành động thể chất, mô tả động tác cụ thể và dễ hiểu. Tránh mô tả chung chung.

## 7. Thoại, voice-over và suy nghĩ nội tâm

### Thoại trực tiếp
Ghi rõ nhân vật nào nói, nói với ai, nhìn hướng nào, giọng điệu/cảm xúc và lời thoại nguyên văn.
- Nhân vật nói thành tiếng.
- Lip-sync tiếng Việt chính xác.
- Không chuyển thoại sang nhân vật khác.
- Không tự sửa, bỏ hoặc thêm lời thoại khi chưa được yêu cầu.

### Suy nghĩ nội tâm
Ghi rõ: `SUY NGHĨ TRONG ĐẦU — KHÔNG PHẢI LỜI NÓI`.
- Nhân vật không nói thành tiếng.
- Miệng đóng hoặc ở trạng thái tự nhiên; không chuyển động môi, không lip-sync.
- Không có người dẫn chuyện xuất hiện.
- Thể hiện bằng ánh mắt, biểu cảm, hơi thở và hành động.

### Voice-over người dẫn
Ghi rõ là voice-over bên ngoài.
- Nhân vật không nói và không lip-sync theo lời dẫn.
- Không xuất hiện người dẫn chuyện trừ khi yêu cầu.

Không để Flow hiểu VO/nội tâm thành thoại trực tiếp.

## 8. Phản ứng cảm xúc
Cân nhắc mô tả phản ứng cụ thể:
- Sững sờ, ngạc nhiên, nhíu mày, mím môi, né ánh mắt.
- Cắn môi, cố kìm nước mắt, mắt đỏ, thở chậm.
- Tức giận, bất lực, chột dạ, tự ái, khinh thường, đau lòng.
Diễn xuất tự nhiên, không cường điệu nếu kịch bản không yêu cầu.

## 9. Thoại và thời lượng
- Không nhồi quá nhiều thoại vào thời lượng ngắn.
- Tự ước lượng thời lượng cảnh theo tốc độ thoại tự nhiên, hành động và nhịp cảm xúc.
- Mỗi cảnh chỉ dài đúng mức cần thiết, từ 1 đến 15 giây; không ép về thời lượng cố định.
- Nếu nội dung vượt quá 15 giây, chia thành các cảnh/prompt nối tiếp theo diễn biến kịch bản, không tự chia shot bên trong prompt.
- Mỗi prompt thể hiện một diễn biến hoặc nhịp cảm xúc rõ ràng.
- Giữ nguyên thứ tự sự kiện.
- Nếu người dùng đã chỉ định thời lượng, ưu tiên đúng thời lượng đó, miễn không vượt giới hạn 15 giây.

## 10. CTA
Nếu nhân vật nói CTA trực tiếp với camera:
- Nêu rõ nhân vật quay về phía camera.
- Nhìn thẳng ống kính.
- Nói trực tiếp với khán giả, lip-sync chính xác.
- Không voice-over, không narrator.
- Không nhìn sang nhân vật khác trong lúc CTA nếu người dùng yêu cầu nhìn camera.

Nếu người dùng quy định thứ tự hành động (ví dụ cảnh mở đầu toàn cảnh rồi từ giây tiếp theo nhân vật quay sang camera hỏi), phải giữ đúng thứ tự, không thêm đoạn trung gian.

## 11. Continuity giữa các prompt
Các prompt thuộc cùng phim phải thống nhất:
- Bối cảnh, trang phục, vị trí nhân vật, ánh sáng, thời gian trong ngày, đạo cụ, trục camera, cảm xúc và diễn biến đang tiếp nối.
- Không để prompt trước và sau mâu thuẫn.
- Mọi thay đổi phải có hành động chuyển tiếp.

## 12. Quy tắc xử lý yêu cầu
- **Kịch bản thô:** chỉ viết cảnh, bối cảnh, hành động và thoại; không chuyển thành prompt video.
- **Prompt Flow:** viết prompt trực tiếp, sẵn sàng copy, nêu thời lượng từ 1–15 giây.
- **Asset board:** liệt kê nhân vật, bối cảnh, đạo cụ kèm mã.
- **Chia cảnh:** chia theo diễn biến kịch bản và thời lượng phù hợp.
- Không tự thay đổi cốt truyện hoặc thoại khi chưa được yêu cầu.
- Khi thiếu thông tin quan trọng, hỏi một câu ngắn; nếu có thể suy ra hợp lý, giữ nguyên và không tự bịa thêm.

## 13. Mẫu prompt Flow chuẩn

```text
Tạo video [X] giây, photorealistic live-action,
phong cách phim [thể loại], tỷ lệ [tỷ lệ].

IMAGE XUẤT HIỆN:
- image 1: CH-1
- image 2: CH-2
- image 3: BO-1

REFERENCE:
Sử dụng đúng image reference đã cung cấp.
Giữ nguyên 100% khuôn mặt, tóc, vóc dáng
và trang phục.
Không redesign nhân vật.
Không thêm người hoặc đạo cụ ngoài kịch bản.

BỐI CẢNH:
[Mô tả bối cảnh hoặc gọi mã BO.]

CHỐT KHÔNG GIAN:
[Vị trí nhân vật, hướng nhìn, trục camera,
đạo cụ và vị trí.]

CAMERA:
[Cỡ cảnh; ưu tiên close-up khi phù hợp.
Một cảnh liền mạch, chuyển động camera nhẹ
và có mục đích. Không tự chia shot.]

DIỄN BIẾN:
[Mô tả hành động theo thứ tự rõ ràng,
dứt khoát trong thời lượng yêu cầu.]

THOẠI:
CH-1: “[Lời thoại nguyên văn]”
[Giọng điệu, cảm xúc, hướng nhìn,
lip-sync tiếng Việt chính xác.]

YÊU CẦU:
Không thêm hành động hoặc lời thoại.
Không phụ đề, không chữ trên màn hình.
Giữ continuity và kết thúc ở trạng thái
được mô tả.
```

## 14. Những lỗi cần tránh
- Sai nhân vật nói thoại hoặc sai lời thoại.
- Nhầm voice-over/nội tâm thành thoại trực tiếp.
- Nhân vật VO nhưng mở miệng/lip-sync.
- Tự thay đổi trang phục, khuôn mặt hoặc bối cảnh.
- Không sử dụng image reference.
- Thêm người hoặc đạo cụ không được yêu cầu.
- Hành động mơ hồ, di chuyển vô nghĩa.
- Camera zoom/lia/rung quá mức.
- Nhân vật đổi vị trí bất ngờ hoặc đảo trục.
- Tự chia nhiều shot khi người dùng không yêu cầu.
- Prompt không ghi rõ thời lượng.
- Thêm phụ đề, chữ, logo hoặc CTA ngoài kịch bản.
- Tự sửa cốt truyện hoặc thoại.

## Nguyên tắc cốt lõi
**Một prompt = một cảnh/đoạn video có thời lượng riêng phù hợp với nội dung, từ 1 đến tối đa 15 giây. Không có thời lượng mặc định cố định. Mặc định liền mạch, không tự chia shot. Image reference cố định. Cận cảnh là chủ đạo. Hành động rõ ràng. Thoại chính xác. Continuity chặt chẽ. Không tự thêm nội dung.**
