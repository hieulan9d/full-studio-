import json
CH="A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
SUF=" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces."
S=[
("Có những dấu hiệu nhỏ của cơ thể, và những chuyện khó nói, mà bạn không nên bỏ qua. Một: Tiểu ra máu.",
 CH+"standing at the door of a quiet clinic at dusk, one hand on the door frame, thoughtful and hesitant, warm lamp light inside.","the lamp light inside flickers softly and the character takes one slow step forward"),
("Một lần, không đau, hôm sau hết, vẫn phải đi khám. Số liệu ở Anh cho thấy khoảng 2,8% người trên sáu mươi tuổi có tiểu máu cuối cùng được chẩn đoán ung thư bàng quang.",
 "A small clear sample cup on a clinic tray beside a clipboard and a desk lamp, soft light, no people.","the lamp light shifts softly across the tray, dust drifts in the beam"),
("Ở người từ bốn mươi đến năm mươi chín tuổi là 1,2%. Tỷ lệ không cao, nhưng đủ để phải kiểm tra một lần.",
 "A hand-drawn outline of a human bladder glowing softly on a light box in a dark clinic, no people.","the light box glows and flickers softly, faint chalk dust drifts"),
("Hai: Rối loạn cương dương không chỉ là chuyện ấy. Người bị rối loạn cương dương có nguy cơ bệnh tim mạch cao hơn khoảng bốn mươi phần trăm, và nhồi máu cơ tim cao hơn khoảng sáu mươi phần trăm.",
 "A hand-drawn heart outline in the center with a pulse line running across it, a soft warning glow around it, no people.","the pulse line travels across the heart, the warning glow pulses softly"),
("Hãy đo huyết áp, đường huyết, mỡ máu trước. Đừng tự mua thuốc để che đi vấn đề.",
 "A blood pressure monitor, a glucose meter and a small blood test tube lined up on a wooden table, warm lamp light, no people.","the lamp light shifts softly across the instruments, a faint glow pulses on the monitor"),
("Ngày 2 tháng 4 năm 2025, Cục An toàn thực phẩm công bố cả bảy mẫu thực phẩm bảo vệ sức khỏe quảng cáo tăng cường sinh lý nam đều chứa hoạt chất của thuốc kê đơn.",
 "A shelf with seven small supplement bottles in a row, one bottle marked with a warning triangle symbol, dim shop light, no people.","the dim light flickers across the row of bottles, the warning symbol glows faintly"),
("Giảm cân, bỏ thuốc lá, kiểm soát huyết áp và đường huyết cũng giúp chức năng này tốt lên.",
 CH+"jogging along a quiet Vietnamese lakeside path at dawn, a broken cigarette on the ground behind, fresh morning light.","the character jogs steadily forward, mist drifts over the lake, morning light grows"),
("Ba: Dùng bao cao su, và không dùng chung bơm kim tiêm. Dùng lần nào cũng đủ suốt quá trình, giảm hơn bảy mươi phần trăm nguy cơ lây HIV giữa nam và nữ.",
 "A large hand-drawn shield with a heart in its center glowing softly in an empty dark room, no people.","the shield glows steadily and a soft ripple of light spreads outward"),
("Chỉ dùng phần lớn các lần thì gần như không khác gì không dùng. Bao cao su cũng không chặn hoàn toàn giang mai và mụn rộp sinh dục ở vùng không được che.",
 "A large hand-drawn shield with a small gap at one corner, light leaking through the gap, in a dark room, no people.","the light leaking through the small gap flickers, the shield trembles slightly"),
("Bốn: Xét nghiệm HIV nếu từng có hành vi nguy cơ. Người dùng thuốc đều đặn đến khi virus không phát hiện được thì không lây cho bạn tình.",
 "A glass test tube and a magnifying glass on a clinic table, a tiny virus outline fading away inside the tube, desk lamp light, no people.","the tiny virus outline fades slowly inside the tube, lamp light steady"),
("Giữa năm 2025, nước ta có hơn hai trăm sáu mươi bảy nghìn người nhiễm HIV còn sống. Luật cấm công khai tên, địa chỉ, hình ảnh người nhiễm.",
 "A closed file folder with a padlock on top of a desk beside a lamp, quiet office at night, no people.","the padlock glints softly, lamp light steady, dust drifts in the beam"),
("Từ đủ mười lăm tuổi, bạn được tự nguyện yêu cầu xét nghiệm. Năm: P r E P, thuốc kê đơn, không tự mua tự uống.",
 "A single pill and a small pill bottle beside a clock on a bedside table, soft lamp light, no people.","the clock hands move slowly, the lamp glows steadily, a soft shadow shifts"),
("Dùng đều, nguy cơ nhiễm HIV thấp hơn khoảng bảy mươi phần trăm so với giả dược. Quy trình gồm xét nghiệm HIV, đánh giá thận và viêm gan, tái khám sau một tháng.",
 "A clipboard with a checklist of check marks beside a stethoscope on a clinic desk, soft light, no people.","a check mark draws itself one by one on the checklist, lamp light steady"),
("Nếu đã có phơi nhiễm, cần đánh giá điều trị dự phòng sau phơi nhiễm, không tự chuyển sang P r E P. Năm điều nhỏ, có thể cứu bạn khỏi những chuyện lớn. Có dấu hiệu lạ, hãy đi khám, đừng ngại.",
 CH+"walking through the door of a small clinic in warm morning light, calm and determined posture.","the door opens and warm light spills onto the character as they step in, dust floats in the light"),
]
json.dump({"scenes":[{"id":f"c{i:02d}","clip_s":8,"voice":v,"image_prompt":p+SUF,"motion":m} for i,(v,p,m) in enumerate(S,1)]},open('scenes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
open('loi-thoai.txt','w',encoding='utf-8').write('\n'.join(v for v,_,_ in S)); print(len(S))
