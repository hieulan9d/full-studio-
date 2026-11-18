import re
BS=chr(92)
# từ điển từ -> từ có dấu (chữ thường)
W = {}
def add(s):
    for pair in s.split(','):
        k,v=pair.strip().split('=')
        W[k]=v
add("am=âm,anh=ảnh,ap=áp,bai=bài,bam=bấm,ban=bạn,bang=bảng,banh=bánh,bao=báo,bat=bật,bi=bị,bien=biến,bo=bỏ,bong=bóng,cac=các,cach=cách,can=cần,canh=cảnh,cap=cấp,cat=cắt,chap=chấp,chat=chất,chay=chạy,che=chế,chep=chép,chi=chỉ,chinh=chỉnh,choi=chơi,chon=chọn,chu=chữ,chua=chưa,chuan=chuẩn,chuyen=chuyển,co=có,cua=của,cung=cùng,cuoi=cuối,cuong=cường,da=đã,dai=dài,dam=đậm,dan=dán,dang=đang,dat=đặt,dau=đầu,day=dày,de=để,den=đen,di=đi,diem=điểm,dinh=đỉnh,do=độ,doan=đoạn,doi=đổi,don=đơn,dong=dòng,du=đủ,dua=đưa,duc=đục,duoc=được,duoi=dưới,duong=đường,duyet=duyệt")
add("gia=giả,giai=giải,giay=giây,giu=giữ,giua=giữa,go=gỡ,goc=góc,goi=gợi,gui=gửi,ha=hạ,hien=hiện,hieu=hiệu,hinh=hình,hoa=hóa,hoac=hoặc,hoan=hoàn,hon=hơn,hop=hộp,huy=hủy,khac=khác,khoang=khoảng,khoi=khối,khong=không,kiem=kiểm,kieu=kiểu,kinh=kính,keo=kéo,lai=lại,lam=làm,lay=lấy,le=lệ,lech=lệch,len=lên,lien=liền,lieu=liệu,loai=loại,loi=lỗi,luong=lượng,luot=lượt,luu=lưu,ma=mã,mat=mất,mau=màu,may=máy,mem=mềm,mep=mép,moc=mốc,moi=mới,mot=một,muc=mục,nao=nào,nay=này,nen=nền,nghieng=nghiêng,ngon=ngôn,ngu=ngữ,nguoc=ngược,nguoi=người,nguon=nguồn,nguong=ngưỡng,nguyen=nguyên,nhac=nhạc,nhan=nhận,nhap=nhập,nhat=nhật,nhe=nhẹ,nhiet=nhiệt,nhip=nhịp,nhom=nhóm,noi=nói,nuong=nướng,phai=phải,phan=phần,phat=phát,phien=phiên,phoi=phơi,phong=phóng,phu=phụ,phuc=phục,qua=quá,rong=rộng,sac=sắc,sang=sáng,sua=sửa,tach=tách,tai=tại,tam=tâm,tang=tăng,tao=tạo,tat=tắt,ten=tên,tha=thả,the=thẻ,them=thêm,thi=thì,thieu=thiếu,thoai=thoại,thoi=thời,thu=thử,thuoc=thuộc,ti=tỉ,tien=tiến,tieng=tiếng,tiep=tiếp,tieu=tiêu,tim=tìm,tinh=tính,toc=tốc,toi=tối,tong=tổng,tra=trả,trai=trái,trang=trắng,tre=trễ,tren=trên,tri=trí,tro=trỏ,tron=trộn,truoc=trước,truot=trượt,tu=từ,tung=từng,tuong=tương,tuy=tùy,tuyen=tuyến,ung=ứng,va=và,van=văn,vao=vào,ve=về,vi=vị,vien=viền,viet=Việt,vong=vòng,vua=vừa,xac=xác,xoa=xóa,xuat=xuất")
add("lui=lùi,su=sự,tuan=tuân,tam=tâm,hang=hãng,cach=cách,nhanh=nhanh,xac=xác,gon=gọn,gi=gì,het=hết,tuc=tục,it=ít,luc=lúc,ca=cả,o=ở,day=đây,bang=bằng,ky=ký,ket=kết,nua=nữa,nhieu=nhiều,ngoai=ngoài,hang=hàng,san=sẵn,nho=nhỏ,lon=lớn,gan=gắn,nut=nút,o=ô,chuot=chuột,quet=quét,thuc=thực,vuot=vượt,cu=cũ,cot=cột,dem=đếm,dich=dịch,doc=đọc,gop=góp,khoa=khóa,lap=lặp,nhin=nhìn,quan=quản,tap=tập,thong=thông,toan=toàn,ton=tồn,trinh=trình,tuyet=tuyệt,viec=việc,xu=xử,xam=xám,vang=vàng,hong=hồng,nang=năng,mong=mỏng,mac=mặc,muon=muốn,chuc=chức,hoi=hỏi,giong=giọng,lang=lặng,ngan=ngắn,khop=khớp,cuon=cuộn,dap=đáp,kenh=kênh,mo=mở,la=là,sat=sát,cham=chậm,chiem=chiếm,lanh=lạnh,ro=rõ,so=số,dung=dùng,rieng=riêng,ghep=ghép,xep=xếp,nghi=nghỉ,chuoi=chuỗi,gion=giãn,gian=giãn,thay=thay,an=ẩn")
del W['an']
# cụm từ cần dịch riêng (áp dụng trước, so khớp không phân biệt hoa thường, giữ hoa đầu)
PH = [
 ("ra khoi","ra khỏi"),("video goc","video gốc"),("mau goc","màu gốc"),("hinh dung","hình dung"),("tu mo","từ mờ"),("goc o duoi","gốc ở dưới"),("ban goc","bản gốc"),("file goc","file gốc"),
 ("goi y","gợi ý"),("grade thanh","grade thành"),("ho tro","hỗ trợ"),("de do","để đo"),("thanh .cube","thành .cube"),("thanh truot","thanh trượt"),("thanh chia","thanh chia"),("tao thanh","tạo thành"),
 ("su kien","sự kiện"),("chinh xac","chính xác"),("nhanh nhat","nhanh nhất"),("thu tu","thứ tự"),("cua hang","của hãng"),("dang trong","đang trống"),("tam x","tâm X"),("khung hinh","khung hình"),("gradient goc","gradient góc"),("hoan tac","hoàn tác"),("banh mau","bánh màu"),("sao chep","sao chép"),("ca video","cả video"),("giay tren","giây trên"),("duoi loi thoai","dưới lời thoại"),("tai ","tại "),("loi thoai","lời thoại"),("khong doi","không đổi"),("nhan vao","nhận vào"),("ma hoa","mã hóa"),("hien thi","hiển thị"),("chinh sua","chỉnh sửa"),
 ("tu choi","từ chối"),("dang cho","đang chờ"),("cua so","cửa sổ"),("khong con gi","không còn gì"),("bao phu","bao phủ"),("ban tron","bản trộn"),("van de","vấn đề"),("tim thay","tìm thấy"),
 ("o so","ô số"),("o nhap","ô nhập"),("canh mot","cạnh một"),("duoi day","dưới đây"),("day vien","dày viền"),("di chuyen","di chuyển"),("mo dan","mờ dần"),("hien dan","hiện dần"),
 ("tang dan","tăng dần"),("cham dan","chậm dần"),("giam dan","giảm dần"),("khoi clip","khỏi clip"),("it nhat","ít nhất"),("tieu de","tiêu đề"),("may danh chu","máy đánh chữ"),
 ("binh thuong","bình thường"),("dung luc","đúng lúc"),("mo (px)","mờ (px)"),("bong: mo","bóng: mờ"),("mo toi da","mờ tối đa"),("le an toan","lề an toàn"),("du lieu","dữ liệu"),
 ("di dau","đi đâu"),("khong tu tai","không tự tải"),("toi cuoi","tới cuối"),("nhan chu","nhãn chữ"),("tiep tuc","tiếp tục"),("moi tu","mỗi từ"),("moi muc","mỗi mục"),("moi sfx","mỗi SFX"),
 ("moi n ","mỗi N "),("moi khoang","mỗi khoảng"),("moi doan","mỗi đoạn"),("moi nhom","mỗi nhóm"),("moi lan","mỗi lần"),
 ("vi tri","vị trí"),("thoi gian","thời gian"),("thoi luong","thời lượng"),("gia tri","giá trị"),("ky tu","ký tự"),("do thi","đồ thị"),("tay nam","tay nắm"),("nam tim","nắm tím"),("tim theo","tìm theo"),("can le","căn lề"),("gian dong","giãn dòng"),("gian chu","giãn chữ"),("ngat dong","ngắt dòng"),("bong do","bóng đổ"),("bien doi","biến đổi"),("toi da","tối đa"),("ti le","tỉ lệ"),("tieu thu","tiêu thụ"),("du dau","đủ dấu"),("thieu dau","thiếu dấu"),("tuy chinh","tùy chỉnh"),("that bai","thất bại"),("sao chep","sao chép"),("nhay toi","nhảy tới"),("phu de","phụ đề"),("phu kin","phủ kín"),("cong (add)","cộng (Add)"),("go hieu ung","gỡ hiệu ứng"),("nuong thanh","nướng thành"),("khong ton chi phi","không tốn chi phí"),("ton chi phi","tốn chi phí"),("xoa moi","xóa mọi"),("xoa het","xóa hết"),("muc ap dung","mức áp dụng"),("ap dung","áp dụng"),("tren do thi","trên đồ thị"),("noi suy","nội suy"),("khung ghep","khung ghép"),("song","sóng"),("cuon ngang","cuộn ngang"),("dung de","dùng để"),("dung chung","dùng chung"),("bat it nhat","bật ít nhất"),("quy tac","quy tắc"),("bam dinh","bám dính"),("do phan giai","độ phân giải"),("phan giai","phân giải"),("ngon ngu","ngôn ngữ"),("van ban","văn bản"),("vi du","ví dụ"),("nghe thu","nghe thử"),("khong nghe","không nghe"),("tuyen","tuyến"),("ban sao","bản sao"),("nhan ban","nhân bản"),("dang quet","đang quét"),("quet lai","quét lại"),("them thu muc","thêm thư mục"),("danh sach","danh sách"),("vao kho","vào kho"),("kho am thanh","kho âm thanh"),("duoc ghi","được ghi"),("ghi de","ghi đè"),("nguoi dung","người dùng"),("khong lam","không làm"),("lam cham","làm chậm"),("dung nghe","đừng nghe"),("dung ","dùng "),
 ("thuoc tinh","thuộc tính"),("duong cong","đường cong"),("loi thoai","lời thoại"),("thu vien","thư viện"),("thu muc","thư mục"),("kiem tra","kiểm tra"),("de xuat","đề xuất"),
 ("khoi phuc","khôi phục"),("hoan tac","hoàn tác"),("lam lai","làm lại"),("luu thanh","lưu thành"),("nhap thu muc","nhập thư mục"),("mau gia","màu giả"),
 ("xanh la","xanh lá"),("tuyen tinh","tuyến tính"),("xem thu","xem thử"),("chay thu","chạy thử"),("thu lai","thử lại"),("thu nho","thu nhỏ"),("thu gon","thu gọn"),
 ("mo hinh","mô hình"),("lam mo","làm mờ"),("lam mem","làm mềm"),("mo ta","mô tả"),("mo thu muc","mở thư mục"),("do duc","độ đục"),("do sang","độ sáng"),("do toi","độ tối"),
 ("do mem","độ mềm"),("do day","độ dày"),("do dai","độ dài"),("do lech","độ lệch"),("cuong do","cường độ"),("do cao","độ cao"),("do rong","độ rộng"),("do mo","độ mờ"),
 ("do am","độ ấm"),("goc do","góc độ"),("tu dong","tự động"),("tu ve","tự vẽ"),("tu khoa","từ khóa"),("khoang lang","khoảng lặng"),("am thanh","âm thanh"),("am luong","âm lượng"),
 ("che do","chế độ"),("che do tron","chế độ trộn"),("phim tat","phím tắt"),("cai dat","cài đặt"),("trang chu","trang chủ"),("du an","dự án"),("chu nhat","chữ nhật"),
 ("hieu ung","hiệu ứng"),("ban kinh","bán kính"),("nhiet do","nhiệt độ"),("bao hoa","bão hòa"),("tuong phan","tương phản"),("phoi sang","phơi sáng"),
 ("banh mau","bánh màu"),("duong cheo","đường chéo"),("diem anh","điểm ảnh"),("tinh nang","tính năng"),("nguon goc","nguồn gốc"),("mat do","mật độ"),("ket qua","kết quả"),
 ("xem truoc","xem trước"),("truoc khi","trước khi"),("sau khi","sau khi"),("phat lai","phát lại"),("phat / dung","phát / dừng"),("phat/dung","phát/dừng"),("cho nguoi dung","cho người dùng"),
 ("dua con tro","đưa con trỏ"),("con tro","con trỏ"),("tai con tro","tại con trỏ"),("giu nguyen","giữ nguyên"),("giu lai","giữ lại"),("dang chuan bi","đang chuẩn bị"),
 ("chuan bi","chuẩn bị"),("giai ma","giải mã"),("nhan dang","nhận dạng"),("nhan nhip","nhận nhịp"),("tach nen","tách nền"),("chi hien","chỉ hiện"),("chu sau","chữ sau"),
 ("track am thanh","track âm thanh"),("kho media","kho media"),("kich thuoc","kích thước"),("bo goc","bo góc"),("cat khung","cắt khung"),("lam moi","làm mới"),
 ("khong gian","không gian"),("nhap doi","nhấp đôi"),("bam dup","bấm đúp"),("keo tha","kéo thả"),("keo de","kéo để"),("keo file","kéo file"),("tha vao","thả vào"),
 ("dat lai","đặt lại"),("dat som","đặt sớm"),("moi ","mỗi "),("de len","đè lên"),("tat ca","tất cả"),("bat dau","bắt đầu"),("ket thuc","kết thúc"),("o nhap","ô nhập"),
 ("khung hinh","khung hình"),("dinh dang","định dạng"),("hop thoai","hộp thoại"),("tham so","tham số"),("ten file","tên file"),("tai nguyen","tài nguyên"),
 ("doi ten","đổi tên"),("nhan doi","nhân đôi"),("xoa lien","xóa liền"),("xoa het","xóa hết"),("bo qua","bỏ qua"),("bo chon","bỏ chọn"),("bo tick","bỏ tick"),
 ("chon tat ca","chọn tất cả"),("chua luu","chưa lưu"),("chua co","chưa có"),("khong co","không có"),("khong the","không thể"),("khong duoc","không được"),
 ("khong thay","không thấy"),("khong ton tai","không tồn tại"),("khong hop le","không hợp lệ"),("hop le","hợp lệ"),("phu hop","phù hợp"),("co dinh","cố định"),
 ("toc do","tốc độ"),("tien do","tiến độ"),("so do","số đo"),("nguoi noi","người nói"),("lop nguoi","lớp người"),("tieng noi","tiếng nói"),("nhip nhac","nhịp nhạc"),
 ("dinh gia","định giá"),("tam thoi","tạm thời"),("hien tai","hiện tại"),("thanh chia","thanh chia"),("cao track","cao track"),("tren cung","trên cùng"),
 ("duoi cung","dưới cùng"),("giua khung","giữa khung"),("mep khung","mép khung"),("tran khung","tràn khung"),("vua khung","vừa khung"),("phu kin","phủ kín"),("vua khit","vừa khít"),
 ("giay","giây"),("tung tu","từng từ"),("tung muc","từng mục"),("tung nhom","từng nhóm"),("mot luc","một lúc"),("nhieu","nhiều"),
]
PH.sort(key=lambda x:-len(x[0]))

LB="(?<![^"+BS+"W"+BS+"d_])"
LA="(?![^"+BS+"W"+BS+"d_])"
def case_like(orig,new):
    if orig.isupper() and len(orig)>1: return new.upper()
    if orig[:1].isupper(): return new[:1].upper()+new[1:]
    return new

TOK = re.compile("[^"+BS+"W"+BS+"d_]+")
def vi(text):
    out=text
    held=[]
    def hold(rep):
        def f(m):
            held.append(case_like(m.group(0),rep))
            return "@@"+str(len(held)-1)+"@@"
        return f
    for k,v in PH:
        pat=re.compile(LB+re.escape(k).replace(BS+" ",BS+"s+")+(LA if not k.endswith(" ") else ""),re.I)
        out=pat.sub(hold(v),out)
    def one(m):
        w=m.group(0); lw=w.lower()
        if w.isascii() and lw in W: return case_like(w,W[lw])
        return w
    out=TOK.sub(one,out)
    out=re.sub("@@([0-9]+)@@",lambda m:held[int(m.group(1))],out)
    return out
def has_vn(text):
    toks=[t.lower() for t in TOK.findall(text)]
    return any(t in W and W[t]!=t for t in toks) or any(re.search(LB+re.escape(k).replace(BS+" ",BS+"s+"),text,re.I) for k,_ in PH)
