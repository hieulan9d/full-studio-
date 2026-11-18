# KIỂM KÊ HIỆU ỨNG CỦA HAI KIT (đầu vào cho Tool Edit)

Ngày: 2026-11-16. Nguồn: `../phong-cach/saas-animation/lib/{saas-lib,ui-dashboard}.jsx`, `../phong-cach/talking-head/lib/{saas-lib,th-lib}.jsx` (~2300 dòng).
**Phương pháp và độ tin cậy [chưa kiểm sâu]:** đếm tên hiệu ứng AE (`ADBE ...`) bằng lệnh tìm chuỗi và liệt kê tên hàm trợ giúp. **Chưa đọc từng hàm**, chưa mở 3D (`orbit`, `place`, `buildEnv*`) kỹ. Danh sách là điểm xuất phát; giai đoạn 6 phải đọc từng hàm khi port.

Cột "Cách làm trong Tool Edit" là **đề xuất [thiết kế]**. Ưu tiên: P1 = cần cho dựng cơ bản/talking head, P2 = cần cho SaaS, P3 = sau.

## 1. Hiệu ứng AE được dùng (số lần xuất hiện trong mã)

| Hiệu ứng AE | Lần | Dùng để | Cách làm trong Tool Edit | Ưu tiên |
|---|---|---|---|---|
| Ramp (`ADBE Ramp`) | 27 | Gradient nền, gradient chữ (`T.grad`, `T.rampIn`, `H.ramp`) | Shader gradient tuyến tính/tròn nhiều điểm dừng; dùng làm fill chữ và nền | P1 |
| Gaussian Blur (`Gaussian Blur 2`) | 24 | Làm mờ vào/ra, nền, kính (`H.gblur`, `H.blurIn/Out`) | Blur tách hai pass (separable), tăng tốc bằng mip | P1 |
| 4-Color Gradient | 18 | Nền lưới màu mềm | Shader 4 góc nội suy | P2 |
| Vector (shape layer): fill, stroke, trim path, rect, ellipse, star, group | ~60 | Icon, thẻ, vòng, đường (`H.shape`, `H.r`, `H.ring`, `H.star`, `H.icon`) | Lớp vector tự viết: hình cơ bản + stroke + **trim path** + bo góc, vẽ bằng SDF hoặc tessellate | P2 |
| Tint | 14 | Đổi tông màu | Shader map đen/trắng→hai màu | P2 |
| Fractal Noise | 14 | Nền nhiễu, tia sáng, texture | Shader noise (simplex/fbm) có animate | P2 |
| Drop Shadow | 14 | Bóng chữ/thẻ (`T.shadow`) | Blur + offset từ alpha | P1 |
| Grid | 12 | Nền lưới kỹ thuật số | Shader lưới | P2 |
| Linear Wipe | 10 | Quét lộ chữ/ảnh | Shader mặt nạ quét có làm mềm | P1 |
| Glow (`ADBE Glo2`) | 9 | Phát sáng (`T.glow`, `H.glow`) | Threshold + blur nhiều mức + cộng (bloom) | P1 |
| Brightness & Contrast | 9 | Chỉnh sáng cơ bản | Gộp vào primary color | P1 |
| Easy Levels | 7 | Levels | Gộp vào primary color | P1 |
| Hue/Saturation | 6 | Đổi hue/sat | Primary color | P1 |
| Set Matte | 6 | Mặt nạ theo alpha/luma (kính, chữ sau lưng người: `T.behind`) | Matte theo track/clip (luma/alpha), dùng cả matte tách nền | P1 |
| Box Blur | 6 | Mờ kính | Dùng chung bộ blur | P2 |
| Vibrance | 3 | Tăng màu | Primary color | P2 |
| Minimax | 3 | Co/giãn viền matte | Erode/dilate trên alpha | P2 |
| Geometry2 (Transform) | 4 | Biến đổi trong hiệu ứng | Transform cơ bản | P1 |
| Slider Control | 4 | Tham số điều khiển bằng expression | Tham số/keyframe có tên, **không dùng expression** | P1 |
| Time Remapping | 2 | Speed ramp, co giãn thời gian | Hệ `timeRemap` (giai đoạn 4) | P1 |
| Audio Levels | 5 | Mức âm lượng | Keyframe âm lượng trên track âm | P1 |
| Text Properties / Range Advanced (animator) | ~15 | Chữ động từng ký tự/từ | Animator chữ (giai đoạn 2) | P1 |

## 2. Thao tác/hàm trợ giúp của kit (tên hàm, dùng để đoán chức năng)

- **Chuyển động:** `H.ease`, `H.anim`, `H.pop` (nảy), `H.pos/scl/rot/rotX/rotY/opa/anc`, `H.attach` (cha–con), `H.null`, `T.punchIn`, `T.popIn`, `T.cut`, `H.fadeOut`, `H.exitBlur`. → hệ keyframe + ease + parent (nhóm/lớp cha).
- **Chữ:** `H.text`, `H.anchorText`, `H.setText`, `H.typewriter`, `H.counter` (đếm số), `T.txt`, `T.keyword`, `T.number`, `T.capGroup`, `T.captions`, `T.strokeUp`. → công cụ chữ, đếm số, phụ đề từng từ.
- **Bố cục/khối:** `H.solid`, `H.adj` (lớp điều chỉnh), `H.glassCard`, `H.glassUnder` (thẻ kính), `H.ring`, `H.icon`, `H.star`, `H.palette`, `T.tile`, `T.placeTile`, `T.brollCard`, `T.logoBar`, `T.ringsBg`, `T.edges`. → lớp điều chỉnh, kính (blur nền + viền sáng), thẻ.
- **Hiệu ứng riêng của kit talking head:** `T.burst`, `T.leaks` (light leak), `T.behind` (chữ sau lưng người). → overlay screen/add, matte người.
- **3D / cảnh phức tạp:** `H.buildEnvSpace`, `H.buildEnvPlanet`, `H.sceneOrbit`, `H.sceneCardRing`, `H.sceneStarMorph`, `orbit`/`place` (cong thẻ theo vòng, camera). **3D thật chưa nằm trong phạm vi** (`KE-HOACH.md` mục 2): cần đọc kỹ rồi quyết định xấp xỉ 2.5D hay hoãn. [chưa kiểm]
- **Âm thanh:** `H.cue/cues`, `H.importAudio`, `H.setDb`, `H.buildAudio`, `T.sfx`. → track âm, cue SFX gắn sự kiện (chờ duyệt).
- **Hệ thống:** `H.frame*`, `H.comp`, `H.place`, `H.saveFrames` (xuất khung để kiểm), `H.describe`, `T.run`. → `preview_frame`, `contact_sheet`, `qc_check`.

## 3. Hệ quả cho kế hoạch

1. **Danh sách tối thiểu của engine** (P1): transform + keyframe + ease, parent, chữ + gradient + animator, blur, glow, shadow, wipe, matte (alpha/luma), primary color, time remap, audio level.
2. **P2 (SaaS):** lớp vector có trim path, noise, grid, 4-color gradient, tint, kính, erode/dilate matte.
3. **Điểm rủi ro:** cảnh 3D của kit SaaS (`sceneOrbit`, `buildEnvSpace`) và expression (`Slider Control`). Đã quyết định không có expression; cần chuyển thành keyframe/tham số có tên.
4. **Light leak** và hiệu ứng overlay của talking head dùng clip có sẵn ở thư mục cha (không nằm trong repo công khai): dùng blend mode (screen/add), không cần shader riêng.
5. **Việc tiếp theo:** ở giai đoạn 6, đọc từng hàm trong danh sách trên, ghi thông số thật (giá trị mặc định, đường cong ease) vào preset.
