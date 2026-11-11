# Tập 8 (sức khỏe tinh thần): theo quy tắc của sách - không mô tả phương pháp, không số liệu gây sốc, luôn kèm đường dây hỗ trợ.
import json
CH="A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
SUF=" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm and hopeful mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces."
S=[
("Có những lúc mọi thứ nặng nề đến mức không thấy lối ra. Bốn điều dưới đây có thể giúp bạn, hoặc người bạn thương. Một: Nói ngay với người bên cạnh.",
 CH+"sitting on a doorstep of a Vietnamese house at dusk with a small lantern glowing beside, a quiet empty street ahead, thoughtful and tired.","the lantern flame flickers softly and the character slowly lifts the head toward the glow, dusk light fades"),
("Khi ý nghĩ làm hại bản thân vừa xuất hiện, hãy nói ngay với một người bạn tin. Trong một nghiên cứu phỏng vấn, gần một nửa số người từng trải qua cho biết, từ lúc ý nghĩ xuất hiện đến lúc hành động không quá mười phút.",
 "Two simple characters with round blank egg-shaped white heads sitting side by side on a wooden bench at night under a warm street lamp, one turned toward the other, calm.","the street lamp glows steadily, moths flutter around it, the two characters lean slightly closer"),
("Vì vậy, chỉ cần vượt qua vài chục phút đó, và không ở một mình. Phần lớn người từng phải nhập viện vì tự làm hại bản thân, về sau không mất mạng vì chuyện đó.",
 "A round wall clock beside a window where the first light of dawn is rising over rooftops, a warm lamp on the sill, no people.","the clock minute hand moves slowly and the dawn light grows brighter across the window"),
("Hai: Hỏi thẳng, bạn có đang nghĩ đến chuyện làm hại mình không? Nghiên cứu chưa thấy việc hỏi làm tăng ý nghĩ đó, kể cả ở học sinh trung học.",
 "Two simple characters with round blank egg-shaped white heads sitting facing each other at a small tea table, steam rising from two cups, one leaning forward gently as if asking, calm warm lamp light.","steam rises from the cups, the listening character nods slowly, lamp light steady"),
("Theo hướng dẫn của Tổ chức Y tế Thế giới: chọn lúc và chỗ phù hợp, hỏi trực tiếp, và không phán xét.",
 "Two simple characters with round blank egg-shaped white heads sitting on a sofa in a quiet living room, one holding a cup, the other listening attentively with an open posture, soft lamp light.","the listening character tilts the head gently, lamp light flickers softly, steam drifts from the cup"),
("Khuyến khích người đó gặp nhân viên y tế và đề nghị đi cùng. Nếu thấy nguy cơ ngay trước mắt, đừng để họ ở một mình.",
 "Two simple characters with round blank egg-shaped white heads walking side by side along a quiet street toward a clinic door glowing with warm light, one gently touching the other's shoulder.","the two characters walk slowly toward the glowing door, warm light spreads over the street"),
("Ba: Cất những vật nguy hiểm ra khỏi tầm tay. Một số nghiên cứu cho thấy hạn chế vật nguy hiểm trong tầm tay làm số ca giảm rõ rệt.",
 CH+"placing a closed box on a high shelf inside a wooden cabinet and closing the cabinet door, calm and careful, soft evening light in a Vietnamese home.","the character closes the cabinet door gently and exhales, soft light steady in the room"),
("Khi nguy hiểm đang ở ngay trước mắt, hãy gọi số một một năm, hoặc đến khoa cấp cứu gần nhất.",
 "A glowing phone on a table with a red cross symbol on the screen, an ambulance light flashing softly through the window, no people.","the phone screen pulses and the ambulance light flashes softly across the wall"),
("Đường dây Ngày Mai: không chín sáu, ba không sáu, một bốn một bốn. Mở từ mười ba giờ đến hai mươi giờ ba mươi, từ thứ Tư đến Chủ nhật.",
 "An old-fashioned telephone on a small wooden table beside a warm lamp and a wall clock showing evening, a quiet room at night, no people.","the lamp glows steadily, the clock hands move slowly, a soft shadow shifts across the wall"),
("Bốn: Cờ bạc đến mức phải vay tiền vẫn chơi, là một căn bệnh, không phải yếu đuối. Bệnh viện Bạch Mai xác định nghiện cờ bạc là một rối loạn tâm thần.",
 CH+"sitting at a table with scattered playing cards and a few coins under a dim hanging lamp, head resting on one hand, tired and quiet.","the hanging lamp sways slightly, a card edge flutters, the character slowly looks up"),
("Nghiên cứu ở Thụy Điển cho thấy người rối loạn cờ bạc có nguy cơ làm hại bản thân cao hơn nhiều lần. Bước đầu: tìm hỗ trợ tâm lý, và nhờ gia đình quản lý tiền giúp.",
 "Two simple characters with round blank egg-shaped white heads at a kitchen table, one handing a small wallet to the other, a notebook and a calculator on the table, warm caring mood.","the wallet slides across the table and a hand takes it, warm lamp light steady"),
("Bạn không phải đi một mình. Hãy nói với một người, ngay hôm nay.",
 CH+"stepping through an open door into soft dawn light, a lit lantern left behind on the doorstep, calm and hopeful.","the character steps forward into the growing dawn light, the lantern flame steadies behind"),
]
json.dump({"scenes":[{"id":f"c{i:02d}","clip_s":8,"voice":v,"image_prompt":p+SUF,"motion":m} for i,(v,p,m) in enumerate(S,1)]},open('scenes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
open('loi-thoai.txt','w',encoding='utf-8').write('\n'.join(v for v,_,_ in S)); print(len(S))
