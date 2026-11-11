import json
CH="A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
SUF=" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces."
S=[
("Hai việc nhỏ trong bếp, giúp bạn tránh ngộ độc thực phẩm. Một: Không ăn nấm hoang.",
 CH+"standing in a small Vietnamese kitchen at night, looking at a basket of wild mushrooms on the table and holding up one hand in a stop gesture."),
("Kim bạc đổi màu, nấm sâu ăn, nấm màu sặc sỡ mới độc. Cả ba đều sai.",
 "A cluster of wild mushrooms on a wooden table, a thin silver needle lying beside them, one mushroom with a small insect hole, no people."),
("Năm 2025, Trung Quốc ghi nhận tám trăm hai mươi tám vụ ngộ độc nấm, hơn hai nghìn người mắc, mười ba người mất mạng.",
 "A quiet hospital corridor at night with a row of empty chairs and a single door with a soft light above it, no people."),
("Và phát hiện thêm ba mươi bốn loài nấm mới gây độc. Theo cơ quan kiểm soát dịch bệnh Trung Quốc, hiện chưa có cách nhận biết nấm độc vừa đơn giản, vừa đáng tin.",
 "A field guide book open on a table with sketches of many different mushrooms, a magnifying glass resting on the page, a desk lamp, no people."),
("Năm 2026, ở Sơn La, sáu người ăn canh nấm rừng, một người mất mạng, bốn người nguy kịch, phải chuyển lên Bạch Mai lọc máu.",
 "A bowl of soup with mushrooms on a rustic table in a Vietnamese mountain house at night, six empty bowls arranged around the table, steam rising, no people."),
("Nghi ăn nhầm nấm độc, đi khám ngay. Giữ lại nấm thừa và thức ăn còn lại. Cần cấp cứu thì gọi số một một năm.",
 CH+"carefully putting leftover mushrooms and food into a container with a lid, a phone on the kitchen counter beside, calm and determined."),
("Hai: Mộc nhĩ, nấm tuyết ngâm quá lâu và các món từ gạo ướt, như bánh phở, bánh cuốn, có thể sinh độc tố nếu để hỏng.",
 "A glass bowl of soaking wood ear mushrooms next to a tray of fresh rice noodle sheets on a Vietnamese kitchen counter, no people."),
("Độc tố này không bị phá hủy khi đun sôi, và chưa có thuốc giải đặc hiệu.",
 "A pot of boiling water on a gas stove with steam rising, a small bowl of mushrooms beside the pot, no people."),
("Ở Trung Quốc, giai đoạn 2010 đến 2020, khoảng ba mươi phần trăm người mắc đã mất mạng. Đó là tỷ lệ trong các ca được ghi nhận, không phải nguy cơ của một bữa ăn.",
 "A single empty dinner table with a bowl, chopsticks and a lit lamp, a window with rain outside, quiet mood, no people."),
("Ngâm vừa đủ dùng. Mua bánh phở, bánh cuốn vừa dùng. Bảo quản theo hướng dẫn, và bỏ ngay thực phẩm biến chất.",
 CH+"dropping spoiled food from a container into a trash bin in a Vietnamese kitchen, a refrigerator door slightly open in the background."),
("Nếu nghi ngộ độc, không tự gây nôn khi chưa có hướng dẫn của y tế.",
 CH+"sitting at a kitchen table holding a phone to the ear to call for medical advice, a glass of water untouched on the table."),
("Hai việc nhỏ, làm ngay hôm nay: không ăn nấm hoang, và bỏ thực phẩm đã biến chất.",
 CH+"standing at a clean Vietnamese kitchen counter at dawn, the basket of mushrooms pushed away, light coming through the window."),
]
json.dump({"scenes":[{"id":f"c{i:02d}","clip_s":8,"voice":v,"image_prompt":p+SUF} for i,(v,p) in enumerate(S,1)]},open('scenes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
open('loi-thoai.txt','w',encoding='utf-8').write('\n'.join(v for v,_ in S)); print(len(S))
