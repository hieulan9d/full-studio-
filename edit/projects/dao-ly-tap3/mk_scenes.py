import json
CH="A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
SUF=" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces."
S=[
("Ba việc nhỏ trong nhà, tốn rất ít tiền, mà giúp trẻ nhỏ và người già tránh được tai nạn đáng tiếc. Một: Chốt giới hạn cho cửa sổ và ban công.",
 CH+"standing in a dark living room at night beside a tall window with a small metal latch on its frame, one hand resting on the window sill, looking at the window calmly."),
("Lưới chống muỗi không phải biện pháp bảo vệ. Chốt giới hạn giá rất rẻ, lắp chỉ mất khoảng mười phút.",
 "A close view of a tall Vietnamese apartment window with a thin mosquito screen, a small metal limiter latch on the frame, a screwdriver and two screws lying on the window sill, no people."),
("Ở New York, chính quyền phát chắn cửa sổ miễn phí cho hộ có nguy cơ cao. Sau ba năm, số trẻ rơi ngã ở một quận giảm một nửa.",
 "A row of identical apartment windows on a tall brick city building in New York at night, each window fitted with a small metal window guard, a stack of boxed window guards on the sidewalk below, no people."),
("Ở Hà Nội, trẻ rơi từ chung cư đã xảy ra nhiều lần, có vụ từ tầng mười một, có vụ từ tầng hai mươi bốn.",
 "A very tall Vietnamese apartment tower seen from the street at night, many small windows and balconies, a few windows lit, heavy quiet mood, no people."),
("Một kiến trúc sư khuyến nghị: lan can cao tối thiểu một phẩy một mét, khe hở dưới mười xăng ti mét, cửa sổ chỉ mở hé khoảng mười lăm độ.",
 CH+"measuring the height of a balcony railing with a tape measure on a Vietnamese apartment balcony at dusk, a window beside it open only a narrow crack."),
("Hai: Cho trẻ mặc áo phao khi ở gần nước.",
 CH+"holding up a small round life jacket in front of a calm pond at dusk, a wooden dock and still water behind."),
("Áo phao giảm khoảng một nửa nguy cơ đuối nước khi rơi xuống nước. Năm 2021, nước ta có hơn bốn nghìn người đuối nước, bốn mươi phần trăm là trẻ dưới mười bốn tuổi.",
 "A life jacket floating on dark calm water of a Vietnamese village pond, a ring of ripples around it, a bamboo fence on the bank, no people."),
("Đuối nước là nguyên nhân hàng đầu khiến trẻ mất mạng, nhất là từ năm đến mười bốn tuổi. Không để trẻ một mình gần nước, dù chỉ chốc lát.",
 CH+"sitting on the edge of a swimming pool at dusk with eyes fixed on the water, a phone left face down on the floor beside, alert and watchful."),
("Dạy trẻ bơi và kỹ năng an toàn dưới nước. Rào chắn khu vực nguy hiểm. Và học sơ cứu.",
 "A low wooden fence around a village pond, a ring buoy hanging on a post, a small first aid box with a cross symbol on the ground, a swimming lane rope in the distance, no people."),
("Ba: Người trên sáu mươi tuổi, tập thăng bằng.",
 "An elderly character with a round blank egg-shaped white head and a walking cane, standing on one leg in a quiet Vietnamese courtyard at dawn, arms slightly out for balance."),
("Tập thăng bằng hai đến ba lần mỗi tuần, ví dụ thái cực quyền, giảm khoảng hai mươi ba phần trăm số lần ngã. Hơn một nửa số vụ ngã ở người cao tuổi xảy ra ngay trong nhà.",
 "An elderly character with a round blank egg-shaped white head doing slow tai chi in a small Vietnamese front yard in the morning, flowing arms, a plant pot and a rattan chair nearby."),
("Cải tạo nhà giảm khoảng hai mươi phần trăm. Thảm chống trượt trong phòng tắm, tay vịn cầu thang, đèn ngủ ban đêm đều là việc dễ làm.",
 "A narrow Vietnamese staircase at night with a sturdy handrail along the wall, a small night lamp glowing on a step, a non-slip mat on the bathroom floor visible through a doorway, no people."),
("Ba việc nhỏ, làm một lần, giữ an toàn cho cả nhà. Hôm nay, hãy kiểm tra chốt cửa sổ nhà bạn.",
 CH+"closing a window and pressing its small latch in place at dusk, soft light behind the window, a calm and satisfied posture."),
]
json.dump({"scenes":[{"id":f"c{i:02d}","clip_s":8,"voice":v,"image_prompt":p+SUF} for i,(v,p) in enumerate(S,1)]},open('scenes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
open('loi-thoai.txt','w',encoding='utf-8').write('\n'.join(v for v,_ in S))
print(len(S))
