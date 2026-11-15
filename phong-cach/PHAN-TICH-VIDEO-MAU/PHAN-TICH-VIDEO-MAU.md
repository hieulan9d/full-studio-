# Phân tích video mẫu để dựng lại giống

File này dạy AI **xem – đo – ghi lại** một video mẫu bất kỳ, rồi bàn giao một phiếu đủ chi tiết để dựng ra video giống mẫu
(trong After Effects hoặc công cụ khác). Rút từ hai dự án đã làm thật:
- **SaaS animation** (`phong-cach/saas-animation`): dựng lại quảng cáo NeuraFlow qua 4 phiên bản, rồi làm video mới Orbiq.
- **Talking head** (`phong-cach/talking-head`): dựng lại video Foodtage (người nói + chữ sau lưng + icon + B-roll).

Công cụ đi kèm: `tools/refkit.py` (đo tự động). Mẫu phiếu: mục 11 cuối file.

> AI không xem được video liên tục. AI "xem" bằng **ảnh khung có mốc giờ**, **số đo** và **lời nói theo từng từ**.
> Mọi kết luận về màu, cỡ, nhịp, ease phải đến từ **số đo**, không đến từ ấn tượng.

---

## 1. Chọn mức "giống" trước khi phân tích

Hỏi người dùng (hoặc suy từ yêu cầu). Mức càng cao, phân tích càng sâu và càng phải thay nội dung cẩn thận.

| Mức | Nghĩa | Phải đo | Giữ từ mẫu | Thay bằng nội dung của mình |
|---|---|---|---|---|
| **1. Phong cách** | "trông cùng một kiểu" | bảng màu, ánh sáng, chất liệu, font, kiểu chuyển động, mật độ | ngôn ngữ hình ảnh | toàn bộ cấu trúc, cảnh, chữ |
| **2. Cấu trúc + nhịp** | cùng cách kể, cùng nhịp | + bảng cảnh, độ dài cảnh, cách nối, nhịp nhạc/lời | thứ tự loại cảnh, nhịp | nội dung từng cảnh |
| **3. Bám từng cảnh** | xem song song thấy tương ứng từng cảnh | + bố cục từng cảnh (px), chuyển động từng vật (ease, thời lượng), SFX theo mốc | bố cục, chuyển động, chuyển cảnh | chữ, logo, sản phẩm, nhạc |
| **4. Gần từng khung** | khó phân biệt với mẫu | + mọi mốc keyframe, màu từng vật, đường cong từng chuyển động | gần như mọi thứ | chỉ những gì bắt buộc (logo, chữ) |

Mặc định khi người dùng không nói: **mức 3**. Mức 4 tốn gấp 3–5 lần và chỉ hợp khi luyện tập hoặc làm lại sản phẩm của chính
khách. Người dùng có thể đổi mức giữa chừng ("cảnh 5 làm giống hẳn, còn lại chỉ cần phong cách").

---

## 2. Quy trình

```
A. Thu thập → B. Đo tự động → C. Xem 4 lượt → D. Đo chi tiết → E. Viết ref-notes.md → F. Dựng + so sánh lặp
```

### A. Thu thập
- Video mẫu (`ref.mp4`). Link → hỏi người dùng tải hoặc cho phép tải.
- **Thứ đi kèm, nếu có, quý hơn video**:
  - clip gốc chưa dựng (so ra được grade, zoom, cắt);
  - preset (`.setting` DaVinci là văn bản, đọc được keyframe; `.ffx`, `.mogrt` nhị phân → nhờ người dùng áp thử);
  - font, SFX, file dự án.
- Tài sản người dùng muốn thay vào: logo, ảnh sản phẩm, lời thoại, nhạc.

### B. Đo tự động (luôn chạy đầu tiên)
```bash
python -I tools/refkit.py analyze ref.mp4 out/ref [--lang vi|en|auto] [--no-words]
```
Ra `out/ref/ref-auto.md` (đọc trước), `overview.jpg`, `dense_NN.jpg`, `cut_NN.jpg`, `words.json`. Trong đó:
- **thông số**: kích thước, fps, thời lượng;
- **cắt cảnh**: cứng (1 khung) và mềm (dần dần), kèm danh sách "ứng viên yếu";
- **từng đoạn**: thời lượng, bảng màu hex, độ sáng, bão hoà, độ chi tiết, độ phủ khung;
- **theo giây**: sáng, bão hoà, vùng cháy trắng, vùng đen, chi tiết, chuyển động;
- **nhạc**: BPM, pha lưới, độ rõ nhịp, và **bao nhiêu chỗ cắt trúng phách**;
- **lời nói**: từng từ có mốc, số từ/giây, và **bao nhiêu chỗ cắt trúng đầu từ**;
- **độ to**: LUFS.

Đọc `ref-auto.md` để biết ngay **xương sống thời gian**:
- cắt trúng phách ≥ 60% → video theo **nhạc**: mốc cảnh là bội số phách.
- cắt trúng đầu từ ≥ 60% → video theo **lời**: mốc cảnh là mốc từ.
- cả hai thấp → theo **hình**: chuyển động liền, cảnh nối bằng morph hoặc camera. Đo nhịp bằng độ dài đoạn.

### C. Xem 4 lượt (thô → tinh)
| Lượt | Xem | Trả lời câu hỏi |
|---|---|---|
| 1 | `overview.jpg` (~48 khung toàn video) | Video kể gì? Có mấy cảnh? Phong cách chung? |
| 2 | `dense_NN.jpg` (5 khung/s) | Trong mỗi cảnh, cái gì chuyển động, theo hướng nào, vào/ra thế nào? |
| 3 | `cut_NN.jpg` (từng khung quanh chỗ cắt) | Hai cảnh nối với nhau bằng gì? Có mấy khung chuyển? |
| 4 | `strip` / ảnh gốc độ phân giải cao chỗ cần soi | Chữ chính xác là gì? UI có những phần tử nào? Icon gì? |

```bash
python -I tools/refkit.py strip ref.mp4 13.0 13.6 out/s13.jpg            # mọi khung trong đoạn
ffmpeg -v error -ss 2.6 -i ref.mp4 -frames:v 1 out/f2_6.png                # 1 khung đủ độ phân giải để đọc chữ
```
Khi đọc ảnh thu nhỏ, **quy đổi toạ độ về khung gốc**: ô 320 px của khung 1920 → nhân 6; ô 800 px → nhân 2,4. Đã từng đo
nhầm ×2 thay vì ×2,4 nên tưởng logo lệch. Cần toạ độ chính xác thì đọc trên ảnh gốc.

**Máy bỏ sót chuyển cảnh mờ.** Ví dụ chat mờ dần sang thẻ trên nền tối trong NeuraFlow. Ở lượt 1–2, tự bổ sung các chỗ
nối máy không thấy.

### D. Đo chi tiết (mức 3–4)
```bash
python -I tools/refkit.py pick ref.mp4 2.6 960,40 960,700 100,500          # mã màu tại điểm (toạ độ gốc)
python -I tools/refkit.py track ref.mp4 9.75 10.4 726,532,928,96 out/trk    # bám 1 vật: ease, thời lượng, overshoot
```
`track` cần hộp bao vật **tại T0** (toạ độ gốc, đọc từ ảnh khung). Đã kiểm trên chuyển động biết trước: đo ra bắt đầu
9,82 s / dài 0,30 s / scale 0,85 / "snap", so với thật 9,82 s / 0,33 s / 0,86 / snap.
Độ tin bám < 0,5 → vật đổi hình, mờ hoặc xoay: chọn hộp nhỏ hơn quanh phần không đổi (chữ, icon), hoặc đo bằng mắt
trên `strip` (đếm khung từ lúc bắt đầu tới lúc dừng).

### E. Viết `ref-notes.md` theo mẫu mục 11
Tiêu chí đủ: **một AI chưa từng xem video vẫn dựng lại được ở mức đã chọn.** Mỗi con số ghi rõ nguồn: (đo) hoặc (ước).

### F. Dựng và so sánh lặp
Dựng theo kit của thể loại (mục 3). Sau mỗi phần, so với mẫu ở cùng mốc giây:
```bash
python -I tools/refkit.py compare ref.mp4 ours.mp4 out/cmp 0.5 2.6 5.8 8.2 11.9 15.6 18.8
```
Ra ảnh cạnh nhau (trái mẫu, phải bản dựng) và bảng số kèm gợi ý sửa. Thứ tự sửa và ngưỡng dừng ở mục 7.

---

## 3. Thể loại: xương sống và thứ phải đo

| Thể loại | Xương sống thời gian | Phải đo kỹ | Kit / cách dựng |
|---|---|---|---|
| **Motion graphics / SaaS / app promo** | nhạc (phách) | ánh sáng có nguồn, chất liệu kính, bảng màu, cỡ vật so khung, ease, cách nối, độ chi tiết UI | `phong-cach/saas-animation` |
| **Talking head dọc** | lời (từng từ) | vị trí chữ so với mặt, chữ trước/sau người, phụ đề (font, màu, mấy từ/lần), mật độ hiệu ứng (1 thứ mới mỗi bao nhiêu giây), zoom giật, B-roll %, SFX theo từ | `phong-cach/talking-head` |
| **Kinetic typography** | lời hoặc nhạc | font, cỡ, cách tách chữ (từ/ký tự), hướng vào/ra, nhịp đổi câu | AE text animator |
| **Quảng cáo quay thật / vlog / phim ngắn** | hình + nhạc | độ dài shot, loại shot (cận/trung/toàn), chuyển động máy, **grade** (đen, trắng, bão hoà, tông da, LUT), chuyển cảnh, speed ramp | ffmpeg/Premiere/DaVinci; AE cho đồ hoạ |
| **Slideshow / template ảnh** (cưới, kỷ niệm) | nhạc | số ảnh, thời gian mỗi ảnh, khung/viền, chuyển cảnh, Ken Burns (zoom/pan %), chữ tiêu đề | AE: precomp ảnh + transform |
| **UGC / TikTok tự nhiên** | lời | cắt nhảy (jump cut), phụ đề to, sticker/emoji, zoom vào mặt, âm thanh trend | talking-head kit, nhẹ hơn |
| **Explainer 2D / minh hoạ** | lời đọc | phong cách vẽ (nét, phẳng, bóng), bảng màu, cách nhân vật chuyển động, chuyển cảnh | AE shape layers; ảnh AI cho minh hoạ |
| **Sản phẩm 3D / packshot** | nhạc | ánh sáng (key/rim), phản chiếu, xoay sản phẩm (độ/giây), DOF | AE 3D/Element, hoặc render 3D ngoài |

Video lai (ví dụ talking head có cảnh SaaS chen vào): tách thành từng phần và phân tích mỗi phần theo hàng của nó.

---

## 4. Danh mục quan sát (12 lớp)

Điền đủ các lớp hợp với mức đã chọn. ★ = bắt buộc từ mức 2.

1. ★ **Thông số & khung**: kích thước, fps, thời lượng, vùng an toàn (9:16 che ~150 px trên, ~250 px dưới).
2. ★ **Xương sống thời gian**: nhạc / lời / hình; BPM hoặc số từ/giây; lưới mốc.
3. ★ **Bảng cảnh**: mốc vào–ra, loại cảnh, nội dung, cách nối.
4. ★ **Màu & ánh sáng**:
   - nền (hex đo), màu nhấn, độ sáng TB, bão hoà;
   - nguồn sáng (cột sáng, đèn hậu, rim), vùng cháy trắng;
   - grade: tương phản, tông da, vignette.
5. **Chất liệu**: kính (độ trong, viền, blur sau), kim loại, giấy, neon, grain/noise, chromatic aberration, glow (màu, độ lan).
6. ★ **Chữ**:
   - nội dung nguyên văn;
   - font (tên nếu biết, không thì mô tả: đậm hẹp / serif nghiêng / viết tay), cỡ (px gốc), màu, hiệu ứng;
   - vị trí;
   - cách vào: blur, từng từ, typewriter, bật.
7. **Đồ hoạ / UI**: liệt kê phần tử đến mức đọc được (nhãn, số, trục, icon). Độ dày chi tiết (**chỉ số "chi tiết" của refkit**).
8. ★ **Chuyển động**: vật nào, từ đâu tới đâu, thời lượng (khung), ease (`track`), overshoot, so le giữa các vật.
9. **Camera**: trôi (scale %/giây), đẩy/lùi, xoay 3D, DOF, rung tay, zoom giật (bao nhiêu %, mấy khung).
10. ★ **Chuyển cảnh**: kiểu (cắt, blur, morph, wipe, vòng sáng, light leak, zoom), số khung, có SFX không.
11. **Âm thanh**:
    - nhạc: thể loại, BPM, tâm trạng, chỗ dâng/drop;
    - SFX: loại, mốc (`onsets`, nghe theo lưới);
    - giọng: nam/nữ, nhịp, mức so với nhạc;
    - độ to LUFS.
12. **Nội dung / kịch bản**: hook mấy giây đầu, cấu trúc (vấn đề → giải pháp → CTA), mật độ thông tin, CTA cuối.

---

## 5. Quy đổi quan sát → kỹ thuật dựng (AE)

| Thấy trong mẫu | Dựng bằng |
|---|---|
| Chữ/UI hiện mờ rồi nét | Gaussian Blur 25–30 → 0 + Opacity 0 → 100 trong 0,4 s, ease snap |
| Khung kính trong, thấy mờ phía sau | shape fill 20–30% + viền sáng 1–1,5 px + adjustment layer cùng hình (blur + transform 110–120%) đặt ngay dưới |
| Cột sáng / quầng | rectangle hoặc ellipse + Fast Box Blur lớn + blend Add, opacity 30–50 |
| Vòng chân trời phát sáng | ellipse rất lớn: stroke mảnh + glow, quầng stroke dày blur, lòng ellipse gradient tối |
| Chữ sau lưng người | tách người (matte AI) → chữ nằm giữa nền và lớp người (talking-head kit) |
| Chữ phát sáng màu (neon) | 2 Drop Shadow cùng màu, distance 0. **Không dùng Glow cho chữ màu** (Glow làm chữ trắng xoá) |
| Phụ đề từng cụm từ | transcript từng từ → nhóm 1–4 từ → mỗi nhóm một text layer theo mốc |
| Số đếm chạy | Slider keyframe + expression đổi số thành chữ |
| Gõ chữ | text animator Opacity 0 + Range Start 0 → 100 tuyến tính |
| Thẻ phẳng cong dần thành trụ | 3D layer, vị trí theo "độ cong" lấy mẫu dày. **Không cross-fade hai bản dựng** |
| Vật bay về thành logo (morph) | hình làm track matte cho cảnh trước, scale lớn → nhỏ, đổi màu |
| Zoom giật vào mặt | scale 100 → 108–115% trong 2–4 khung, giữ, về |
| Light leak / loé sáng chuyển cảnh | file leak (chọn đoạn sáng mềm, đo độ sáng theo thời gian) blend Screen/Add |
| Ken Burns ảnh | scale 100 → 108–112% + pan nhẹ suốt thời gian ảnh, tuyến tính hoặc ease nhẹ |
| Grade phim | Lumetri/Curves: đo đen (p5), trắng (p95), bão hoà, tông da từ khung → chỉnh tới khớp số |
| Grain / noise | Noise/Add Grain nhẹ, so độ "nhám" bằng chỉ số chi tiết ở vùng phẳng |

Thông số cụ thể và mã lệnh: `saas-animation/knowledge/04-cong-thuc-ae.md`, `talking-head/knowledge/03-thu-vien-hieu-ung.md`.

---

## 6. Từ số đo chuyển động sang keyframe

`track` cho **t50** (lúc vật đi được 50% quãng đường, tính theo phần thời lượng). Đặt ease AE theo bảng (influence ra / vào):

| t50 | Cảm giác | Ease AE (influence out / in) |
|---|---|---|
| < 0,28 | lao nhanh rồi phanh ("snap", phổ biến nhất trong motion hiện đại) | 8 / 92 |
| 0,28–0,42 | ease-out vừa | 25 / 75 |
| 0,42–0,58 | Easy Ease / đều | 33 / 33 (hoặc tuyến tính nếu hai đầu cũng dốc) |
| 0,58–0,72 | ease-in vừa | 75 / 25 |
| > 0,72 | tăng tốc ra (thoát khung, phóng lấp màn) | 92 / 8 |
| overshoot > 3% | bounce | thêm 1 key vượt đúng % đo được ở ~55% thời lượng, rồi về |

Thời lượng: ghi bằng **khung** (30 fps: 0,4 s = 12 khung). Chuyển động hay gặp: chữ vào 12–14 khung, khối lớn 15–18,
chip/icon bật 15, zoom giật 3–4, camera trôi = cả cảnh.

---

## 7. Vòng so sánh, thứ tự sửa, ngưỡng dừng

**Mốc so**: 8–12 mốc, mỗi cảnh ít nhất một, đặt **giữa cảnh** (0,3–0,5 s sau khi vào), cộng thêm mốc ngay sau mỗi chuyển cảnh đặc biệt.

**Thứ tự sửa** (tác động lớn trước, rút từ 4 vòng NeuraFlow và 8 vòng Foodtage):
1. **Ánh sáng & màu**: độ sáng, bão hoà, bảng màu, cháy trắng. Lệch là thấy ngay.
2. **Tỉ lệ khung**: vật chính quá nhỏ hoặc khung trống. Bản dựng đầu tiên luôn nhỏ hơn mẫu 1,2–2 lần.
3. **Chất liệu**: kính, glow, grain.
4. **Độ chi tiết**: UI, chữ phụ, icon. Đo bằng chỉ số chi tiết: bản dựng < 70% mẫu nghĩa là còn "trống".
5. **Chuyển động & chuyển cảnh**: soi bằng `strip` và `track`.
6. **Âm thanh**: nhạc trúng nhịp, SFX trúng mốc, độ to.

**Ngưỡng dừng** (theo trung bình các mốc trong `compare`):

| Mức | Sáng | Bão hoà | Chi tiết (dựng / mẫu) | ΔE bảng màu | Kiểm bằng mắt |
|---|---|---|---|---|---|
| 1 | ±15 | ±20 | 60–150% | < 25 (hoặc cố ý đổi tông) | cùng "cảm giác" |
| 2 | ±12 | ±15 | 70–140% | < 20 | + cùng nhịp, cùng loại cảnh |
| 3 | ±8 | ±12 | 80–125% | < 15 | + mỗi cảnh tương ứng, chuyển động cùng hướng/kiểu |
| 4 | ±5 | ±8 | 90–110% | < 10 | + ease và thời lượng khớp ±2 khung |

Đổi tông màu có chủ đích (ví dụ mẫu xanh, bản dựng tím) thì bỏ qua ΔE, chỉ so sáng, bão hoà, chi tiết.
Người dùng nói "chưa đẹp" mà không chỉ chỗ: chạy `compare`, liệt kê 3 khác biệt lớn nhất theo thứ tự trên, sửa, rồi báo.

---

## 8. Bẫy đã gặp (đọc trước khi phân tích)

**Khi phân tích**
1. **Tả mà không đo** → bản dựng nhỏ hơn, tối-phẳng hơn, ít chi tiết hơn mẫu. Luôn có số: hex, px, %, khung.
2. **Xem thưa** (1 khung/10 s) chỉ thấy nội dung, không thấy chuyển động. Chuyển động phải xem ≥ 5 khung/s; chuyển cảnh xem từng khung.
3. **Một khung "trông đúng" không có nghĩa là chuyển động đúng** (trụ thẻ sai chiều xoay vẫn đẹp ở một khung). Soi nhiều thời điểm.
4. **Nhầm tỉ lệ ảnh thu nhỏ** khi đo toạ độ. Ghi rõ đơn vị: px gốc hay px ảnh.
5. **BPM nhầm ×2 / ×0,5**. Kiểm lại bằng khoảng cách giữa các onset mạnh. Nhạc tự do / lời nói: độ rõ nhịp < 0,15 → đừng ép lưới phách.
6. **Máy bỏ sót chuyển cảnh mờ** và báo nhầm chuyển động camera lớn thành "chuyển mềm". Xác nhận bằng mắt.
7. **Tả UI chung chung** ("có dashboard"). Phải liệt kê phần tử đọc được (người dùng đã chê đúng lỗi này).
8. **Light leak / file tổng hợp**: đừng lấy đại một đoạn. Đo độ sáng theo thời gian, xem khung từng đỉnh, bỏ đoạn nhiễu hoặc loé đỏ.
9. **Font**: đoán tên font sai thì AE lặng lẽ thay font mặc định. Kiểm tên PostScript; font tiếng Việt kiểm dấu trước.

**Khi dựng lại**
10. **Cross-fade hai bản dựng của cùng một vật** → bóng đôi + giật. Một vật đi xuyên suốt chuyển động.
11. **Glow trên chữ/icon màu** → trắng xoá. Glow toàn cảnh threshold thấp → cả khung cháy.
12. **Bản dựng chưa có tiếng** trông "thiếu lực" dù hình giống: nhạc và SFX theo mốc là một nửa cảm giác của mẫu.
13. Bẫy riêng của AE/ExtendScript: `saas-animation/knowledge/07-mcp-va-bay-loi.md`, `talking-head/knowledge/07-bay-loi.md`.

---

## 9. Bản quyền và đạo đức

- Video mẫu là **tác phẩm của người khác**. Học **kỹ thuật** (cách làm kính, nhịp, ease, bố cục) là được.
- Giao cho khách **không** được:
  - dùng lại logo, nhân vật, ảnh, footage, nhạc, giọng của mẫu;
  - sao y nội dung chữ, kịch bản;
  - giữ watermark.
- Mức 4 ("gần từng khung") chỉ để luyện tập, hoặc khi người dùng có quyền với mẫu (sản phẩm của chính họ hay của khách). Ghi rõ trong report.
- Nhạc/SFX/font của mẫu thường thuộc bản quyền khác. Thay bằng nguồn có giấy phép (thư viện `saas-animation/audio/music/INDEX.md`, hoặc hỏi người dùng).
- Người thật trong mẫu (talking head): không tái tạo khuôn mặt hay giọng của họ.

---

## 10. Ví dụ đã làm (đọc để thấy mức chi tiết cần đạt)

| Ví dụ | Thể loại | Phân tích | Kết quả |
|---|---|---|---|
| NeuraFlow (20 s) | SaaS, theo nhạc 117,5 BPM | `saas-animation/knowledge/09-vi-du-neuraflow.md` | 4 vòng sửa; bài học: phóng to, ánh sáng, kính, chi tiết UI, chuyển động liên tục |
| Orbiq (20 s, nội dung mới theo phong cách NeuraFlow) | SaaS, mức 2–3 | `saas-animation/projects/orbiq/` | 16:9 + 9:16 + nhạc thật; `compare` với NeuraFlow: lệch màu có chủ đích (tím), chi tiết ngang mẫu |
| Foodtage (22 s) | talking head neon, theo lời | `talking-head/knowledge/09-vi-du-foodtage.md` | 8 vòng; bài học: chữ sau lưng, phụ đề theo từ, light leak, Glow làm trắng chữ |

Đo thử `refkit.py analyze` trên hai mẫu:
- **NeuraFlow**: 118 BPM, độ rõ nhịp 0,41. Cắt cứng ở 7,07 / 9,13 s. Nền `#01050c` chiếm 37%, độ sáng TB 35/255.
- **Foodtage**: độ rõ nhịp 0,09 (không theo nhạc), 3,7 từ/s, **11/16 chỗ cắt trúng đầu từ** → xương sống là lời.

---

## 11. Mẫu `ref-notes.md`

Chép mẫu dưới vào `projects/<slug>/ref-notes.md`. Ghi (đo)/(ước) sau số liệu.

````markdown
# Ref-notes: <tên mẫu>

## 0. Tóm tắt
- Nguồn: <file/link> · <W×H> · <fps> · <giây> · thể loại: <…> · mức giống yêu cầu: <1–4>
- Một câu mô tả phong cách: <…>
- Xương sống thời gian: nhạc <BPM, pha> | lời <từ/s> | hình — bằng chứng: <x/y cắt trúng phách/đầu từ>
- 5–8 luật rút ra (để kế hoạch tuân theo):
  1. <vd. mỗi cảnh mới vào đúng phách, 2 phách = 1,02 s>
  2. <vd. chữ luôn blur-in 0,4 s, không bounce khối lớn>
  …

## 1. Phong cách chung
| Lớp | Giá trị (đo/ước) |
|---|---|
| Nền | <hex>, độ sáng TB <x>/255 |
| Màu nhấn | <hex, hex> |
| Ánh sáng | <nguồn, vị trí, màu> |
| Chất liệu | <kính / neon / phẳng / grain…> |
| Font | <tên hoặc mô tả, cỡ tiêu đề/phụ (px gốc)> |
| Độ chi tiết | <chỉ số chi tiết TB %>, <mô tả mật độ> |
| Camera | <trôi/đẩy/xoay, %/giây> |
| Hậu kỳ | <vignette, bloom, grade, LUT…> |

## 2. Bảng cảnh
| # | Giây | Dài | Loại cảnh | Nội dung (chữ nguyên văn) | Vào bằng | Ra bằng | Ghi chú |
|---|---|---|---|---|---|---|---|

## 3. Thẻ cảnh (mỗi cảnh một mục — mức 3–4)
### Cảnh N — <tên> (<t0>–<t1> s)
- Bố cục: <vật chính, vị trí (px gốc), % bề ngang khung>
- Layer (trên → dưới): <TXT_…, UI_…, BG_…>
- Chuyển động:
  | Vật | Thuộc tính | Từ → tới | Khung bắt đầu–kết thúc | Ease (t50) | Overshoot |
  |---|---|---|---|---|---|
- Màu đo: <vật: hex>
- Âm thanh trong cảnh: <SFX ở mốc nào>
- Nối sang cảnh sau: <kiểu, số khung>

## 4. Âm thanh
- Nhạc: <thể loại, BPM, tâm trạng, drop ở giây…> → thay bằng: <bài có giấy phép>
- SFX theo mốc: <giây: loại>
- Giọng: <có/không, nam/nữ, nhịp> · Độ to: <LUFS>

## 5. Cần tài sản
- <logo, ảnh sản phẩm, font X, icon Y, clip B-roll…> — có / thiếu (hỏi người dùng)

## 6. Khó / không làm được
- <vd. hạt 3D thật, footage người thật> → cách thay: <…>

## 7. Thay đổi so với mẫu (bản quyền)
- <logo, chữ, nhạc, nhân vật đã thay bằng gì>
````
