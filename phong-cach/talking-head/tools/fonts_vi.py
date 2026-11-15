"""Kiểm tra font có đủ dấu tiếng Việt không (trước khi dùng cho chữ trên video).

    python tools/fonts_vi.py <file-font hoặc thư-mục> ...

Cần fontTools:  pip install fonttools
Font thiếu dấu → AE thay ký tự thiếu bằng font mặc định, chữ "Viêm phụ khoa" sẽ lỗi hình.
"""
import glob, os, sys

TEST = "ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵĂÂĐÊÔƠƯẮẶẾỆỐỘỚỢỨỰ"


def check(path):
    from fontTools.ttLib import TTCollection, TTFont
    fonts = TTCollection(path).fonts if path.lower().endswith(".ttc") else [TTFont(path, lazy=True)]
    for f in fonts:
        cmap = f.getBestCmap() or {}
        name = f["name"].getDebugName(4) or os.path.basename(path)
        miss = "".join(ch for ch in TEST if ord(ch) not in cmap)
        print(f"{'OK  ' if not miss else 'THIẾU'} {name}  ({os.path.basename(path)})" + (f"  thiếu: {miss[:20]}" if miss else ""))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    for a in sys.argv[1:]:
        paths = [a] if os.path.isfile(a) else [p for p in glob.glob(os.path.join(a, "**", "*"), recursive=True)
                                               if p.lower().endswith((".ttf", ".otf", ".ttc"))]
        for p in sorted(paths):
            try:
                check(p)
            except Exception as e:
                print("LỖI ", p, e)


if __name__ == "__main__":
    main()
