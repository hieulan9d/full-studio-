import json
CH="A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
EL="An elderly character with a round blank egg-shaped white head, "
SUF=" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces."
S=[
("Một cái đinh. Một tuần sau cứng hàm. Có sáu loại vắc-xin đáng cân nhắc, để tránh những chuyện như vậy. Một: Uốn ván.",
 "A rusty nail sticking out of a wooden plank on the ground of a Vietnamese village yard at dusk, a worn rubber sandal beside it, no people.","the dusk light dims slowly, a faint glint runs along the nail, dust drifts across the yard"),
("Ở Long An, một thanh niên đạp phải đinh, tự rút ra, một tuần sau cứng hàm. Khoảng hai mươi phần trăm ca uốn ván không xác định được vết thương.",
 CH+"sitting on a low stool in a Vietnamese yard holding his jaw with one hand, a plank with a nail beside him, worried posture.","the character slowly lifts a hand to the jaw and lowers the head, evening light fades"),
("Vết thương bẩn, dính đất, mà đã đủ năm năm kể từ mũi trước, thì tiêm nhắc.",
 "An open first aid kit on a wooden table with gauze and a small bottle, a tear-off wall calendar with five pages curled behind it, no people.","a calendar page flutters gently and settles, the lamp light flickers softly"),
("Hai: Viêm gan B. Việt Nam có khoảng sáu phẩy năm triệu người mắc. Mũi đầu nên tiêm trong hai mươi bốn giờ sau sinh.",
 "A hand-drawn outline of a human liver glowing softly in the center, a round shield hovering in front of it, no people.","the shield glows steadily and rotates slightly, chalk dust drifts around the liver"),
("Tiêm ngay sau sinh, giảm tám mươi bốn phần trăm nguy cơ ung thư gan sau này. Người lớn chưa rõ miễn dịch thì xét nghiệm năm chỉ số, rồi mang kết quả đến phòng tiêm.",
 CH+"standing at a clinic reception counter holding a sheet of lab results, a small nurse lamp on the counter, calm and attentive.","the character slides the paper across the counter and nods, lamp light steady"),
("Ba: HPV, càng sớm càng tốt. Ở Thụy Điển, tiêm trước mười bảy tuổi, nguy cơ ung thư cổ tử cung chỉ còn khoảng một phần tám.",
 CH+"standing in a quiet clinic holding a small vaccine vial up to the light, a cotton ball and a tray on the table, thoughtful mood.","the vial glints as the character turns it slowly, soft light shifts across the clinic wall"),
("Tiêm lúc mười bảy đến ba mươi tuổi, nguy cơ vẫn giảm khoảng một nửa. Từ ngày một tháng bảy năm 2026, HPV đã vào danh mục tiêm chủng bắt buộc ở Việt Nam.",
 "A long winding road at dusk with several stone milestones along it, a glowing shield symbol on the first milestone, no people.","a soft light travels along the road from milestone to milestone, mist drifts"),
("Bốn: Cúm. Người bệnh tim mạch và người cao tuổi nên tiêm. Bộ Y tế khuyến cáo tiêm cúm mùa.",
 EL+"wearing a scarf, sitting by a window in cool weather, a vaccine vial and a cotton ball on the windowsill.","the scarf sways slightly, the character looks out at falling leaves outside"),
("Sau nhồi máu cơ tim, nguy cơ mất mạng trong một năm giảm từ bốn phẩy chín xuống hai phẩy chín phần trăm.",
 "A hand-drawn heart outline in the center with a pulse line running across it that slowly steadies, a soft glow, no people.","the pulse line travels across the heart and the beat slowly steadies, glow pulses softly"),
("Năm: Zona, từ năm mươi tuổi. Vắc-xin chặn được chín mươi bảy phần trăm ca zona. Tiêm hai mũi, cách nhau hai tháng, tự chi trả.",
 EL+"sitting in a clinic chair with a small cotton pad on the upper arm, a nurse lamp beside, calm posture.","the character presses the cotton pad and exhales slowly, lamp glows steadily"),
("Sáu: Phế cầu, từ sáu mươi lăm tuổi. Loại mười ba giá chặn khoảng bốn mươi sáu phần trăm viêm phổi do các chủng có trong vắc-xin, và bảy mươi lăm phần trăm nhiễm trùng xâm lấn.",
 EL+"sitting by an open window in the morning, a hand-drawn outline of lungs glowing softly in front of the chest, steady breathing.","the lungs outline expands and contracts slowly with breathing, morning light grows"),
("Người lớn tự chọn vắc-xin phế cầu, vì chương trình tiêm chủng mở rộng chỉ dành cho trẻ dưới một tuổi. Số liệu này chỉ áp dụng cho loại mười ba giá.",
 "A row of vaccine vials on a clinic shelf beside a small notebook and a pen, a lamp glowing softly, no people.","the vials catch the lamp light one after another, the lamp flickers gently"),
("Sáu mũi tiêm, mỗi mũi một lá chắn. Hãy hỏi bác sĩ xem bạn nên tiêm mũi nào, và làm ngay hôm nay.",
 CH+"standing at the door of a small clinic in warm morning light, one hand on the door handle, calm and determined.","the door opens slowly and warm light spills onto the character, dust floats in the light"),
]
json.dump({"scenes":[{"id":f"c{i:02d}","clip_s":8,"voice":v,"image_prompt":p+SUF,"motion":m} for i,(v,p,m) in enumerate(S,1)]},open('scenes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
open('loi-thoai.txt','w',encoding='utf-8').write('\n'.join(v for v,_,_ in S)); print(len(S))
