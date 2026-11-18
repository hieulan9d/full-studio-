import re,glob,sys,io,json
sys.path.insert(0,'scripts')
from _vi import vi,has_vn,W,TOK
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf8')
APPLY='--apply' in sys.argv
files=sorted(glob.glob('src/renderer/ui/*.tsx'))+['src/renderer/actions.ts','src/renderer/store.ts','src/core/presets.ts','src/core/captions.ts','src/core/fx.ts','src/core/grade.ts','src/core/scopes.ts','src/core/speed.ts','src/core/anim.ts']
CORE=lambda f: f.startswith('src/core')
def ok_text(t):
    if re.search(r"[À-ỹ]",t): return False            # đã có dấu
    if re.search(r"(=>|&&|\|\||===|==|\$\{|\n)",t) and False: return False
    toks=TOK.findall(t)
    if not toks: return False
    vn=[w for w in toks if w.lower() in W and W[w.lower()]!=w.lower()]
    if not vn: return False
    if re.search("[a-z][A-Z]",t): return False       # camelCase = mã
    if ' ' not in t.strip() and t.strip()[:1].islower(): return False   # định danh một từ viết thường
    if re.fullmatch("["+BS+"w"+BS+"-./:]+",t.strip()) and '-' in t: return False  # id kiểu tab-props, đường dẫn
    return len(vn)/len(toks)>=0.25
changes=[]
BS=chr(92)
STRPAT=r"(?<!["+BS+"w$])(['"+BS+'"`])((?:'+BS+BS+'.|(?!'+BS+'1)[^'+BS+'n'+BS+BS+'])*)'+BS+'1'
def tr_literal(m):
    q=m.group(1); body=m.group(2)
    if CUR_CORE and (q=='`' or '${' in body): return m.group(0)
    if q=='`':
        parts=re.split(r"(\$\{[^}]*\})",body)
        new=''.join((re.sub(STRPAT,tr_literal,p) if p.startswith('${') else (vi(p) if ok_text(p) else p)) for p in parts)
    else:
        new=vi(body) if ok_text(body) else body
    if new!=body: changes.append((body,new))
    return q+new+q
CUR_CORE=False
for f in files:
    CUR_CORE=CORE(f)
    s=open(f,encoding='utf8').read()
    o=s
    s=re.sub(STRPAT,tr_literal,s)
    def tr_jsx(m):
        t=m.group(1)
        if re.search(r"(=>|&&|\|\||==| \? | : )",t): return m.group(0)
        if ok_text(t):
            n=vi(t)
            if n!=t: changes.append((t,n))
            return '>'+n+'<'
        return m.group(0)
    s=re.sub(r">([^<>{}\n]+)<",tr_jsx,s)
    def tr_jsx2(m):
        t=m.group(1)
        if re.search(r"(=>|&&|"+BS+"|"+BS+"||==| ? | : |;"+BS+"s*$)",t): return m.group(0)
        if ok_text(t):
            n=vi(t)
            if n!=t: changes.append((t,n))
            return m.group(0).replace(t,n)
        return m.group(0)
    s=re.sub(r"(?<=[>}])([^<>{}"+BS+"n]*[A-Za-z][^<>{}"+BS+"n]*)(?=[<{])",tr_jsx2,s)
    # dòng chỉ có văn bản JSX (nhiều dòng)
    def tr_line(m):
        t=m.group(2)
        if re.search(r"(=>|&&|"+BS+"|"+BS+"||==|[;=])",t) or t.strip().startswith(('//','/*','*','import','export','const','return','if','}',')',']')): return m.group(0)
        if ok_text(t):
            n=vi(t)
            if n!=t: changes.append((t,n))
            return m.group(1)+n+m.group(3)
        return m.group(0)
    if f.endswith('.tsx'): s=re.sub(r"^("+BS+"s*)([^<>{}"+BS+"n]*[A-Za-z][^<>{}"+BS+"n]*)("+BS+"s*<?)$",tr_line,s,flags=re.M)
    if APPLY and s!=o: open(f,'w',encoding='utf8').write(s)
seen=set()
for a,b in changes:
    if (a,b) in seen: continue
    seen.add((a,b)); print(a,'  =>  ',b)
print(len(seen),'chuỗi')
