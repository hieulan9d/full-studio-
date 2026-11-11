# Dựng project.json tập 3: chép video từ exports, căn cảnh theo mốc giọng đã tạo, phụ đề theo thời gian chữ (whisper) và số viết bằng chữ số.
import json,os,re,shutil,sys,subprocess
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')))
from vf import tts,subs
HERE=os.path.dirname(os.path.abspath(__file__))
m=json.load(open(r'E:/antigravyti/infinite-canvas/exports/manifest.json',encoding='utf-8')); by={i['nodeId']:i for i in m['items']}
vn=json.load(open(os.path.join(HERE,'video_nodes.json'))); sc=json.load(open(os.path.join(HERE,'scenes.json'),encoding='utf-8'))['scenes']
V=json.load(open(os.path.join(HERE,'voice_marks.json'),encoding='utf-8')); T=V['total']; marks=V['marks']
wav=os.path.join(HERE,'voice','voice_all.wav')
clips=[]
for k,n in enumerate(vn,1):
    dst=os.path.join(HERE,'media',f'v{k:02d}.mp4'); shutil.copy(by[n]['path'],dst); clips.append((dst,by[n]['durationMs']/1000))
# phụ đề: chữ kịch bản căn theo thời gian chữ whisper
toks=[];pid=[]
for i,mk in enumerate(marks):
    for w in mk['text'].split(): toks.append(w);pid.append(i)
if os.environ.get('NOASR'):   # VoiceStudio tắt: chia thời gian trong từng đoạn theo độ dài chữ
    tm=[None]*len(toks)
    for i,mk in enumerate(marks):
        idx=[k for k in range(len(toks)) if pid[k]==i]; w=[len(toks[k])+1 for k in idx]; t=mk['start']; tot=sum(w)
        for k,wk in zip(idx,w): tm[k]=(t,t+(mk['end']-mk['start'])*wk/tot); t=tm[k][1]
else:
    words=tts.transcribe(wav,words=True); tm=subs._align(toks,words,0,T)
NUM=[("một phẩy một mét","1,1 m"),("mười xăng ti mét","10 cm"),("mười lăm độ","15 độ"),("tầng mười một","tầng 11"),("tầng hai mươi bốn","tầng 24"),
("hơn bốn nghìn người","hơn 4.000 người"),("bốn mươi phần trăm","40%"),("mười bốn tuổi","14 tuổi"),("từ năm đến","từ 5 đến"),("sáu mươi tuổi","60 tuổi"),
("hai đến ba lần","2 đến 3 lần"),("hai mươi ba phần trăm","23%"),("hai mươi phần trăm","20%"),("mười phút","10 phút"),("ba năm","3 năm"),
("Một:","Một –"),("Hai:","Hai –"),("Ba:","Ba –")]
NUM=[(a.split(),b) for a,b in NUM]
def merge(idx):
    out=[];i=0
    while i<len(idx):
        hit=None
        for pat,rep in sorted(NUM,key=lambda x:-len(x[0])):
            seg=[toks[idx[j]] for j in range(i,min(i+len(pat),len(idx)))]
            clean=[re.sub(r'[,.]$','',t) for t in seg[:-1]]+[re.sub(r'[,.]$','',seg[-1])] if seg else []
            if len(seg)==len(pat) and [c.lower() for c in clean]==[p.lower() for p in pat]: hit=(pat,rep,seg);break
        if hit:
            tail=re.search(r'[,.]$',hit[2][-1]); out.append((hit[1]+(tail.group(0) if tail else ''),tm[idx[i]][0],tm[idx[i+len(hit[0])-1]][1])); i+=len(hit[0])
        else: out.append((toks[idx[i]],tm[idx[i]][0],tm[idx[i]][1])); i+=1
    return out
MAXC=40
NOBEF={'trăm','vong','sau','trước','hiểm','mũ','đồng','lái','nghìn','triệu','tuổi','lần','tiếng','phút','mét','nạn','tiền','xe','dây','cồn','độ','lại','mươi','cơ','phần','linh'}
NOEND={'có','nguy','khoảng','hãy','và','của','là','bị','phạt','từ','với','trong','cho','ở','một','hai','ba','bốn','năm','sáu','bảy','tám','chín','mười','lăm','trăm','nghìn','mươi','giảm','tăng','không'}
GOBEF={'và','nhưng','mà','hoặc','để','khi','thì','nếu','vì','với','trong','ở','từ'}
def split_piece(ws):
    n=len(ws); L=lambda a,b:len(" ".join(w[0] for w in ws[a:b])); INF=1e18; best=[INF]*(n+1); prv=[0]*(n+1); best[0]=0
    for j in range(1,n+1):
        for i in range(j):
            if best[i]>=INF or L(i,j)>MAXC: continue
            c=best[i]+300+(L(i,j)-26)**2*0.5
            if j-i==1 and n>1: c+=400
            if j<n:
                last=ws[j-1][0]; nxt=ws[j][0]
                if last.endswith((',',';',':')): c-=250
                if nxt.lower().strip(',.') in NOBEF: c+=600
                if nxt.lower() in GOBEF: c-=120
                if not last.endswith((',',';',':')) and last.lower().strip(',.') in NOEND: c+=500
            if i>0 and j==n and j-i<3: c+=300
            if c<best[j]: best[j]=c; prv[j]=i
    cuts=[];j=n
    while j>0: cuts.append((prv[j],j)); j=prv[j]
    return [ws[a:b] for a,b in reversed(cuts)]
ev=[]
for i in range(len(marks)):
    idx=[k for k in range(len(toks)) if pid[k]==i]
    for ch in split_piece(merge(idx)): ev.append({"start":round(ch[0][1],2),"end":round(ch[-1][2]+0.1,2),"text":" ".join(w[0] for w in ch),"style":"Sub"})
ev.sort(key=lambda e:e['start'])
for a,b in zip(ev,ev[1:]):
    if b['start']<a['start']+0.4: b['start']=round(a['start']+0.4,2)
    a['end']=round(min(a['end'],b['start']-0.02),2)
    if a['end']<=a['start']: a['end']=round(a['start']+0.3,2)
# cảnh: cắt đúng đầu đoạn đầu tiên của mỗi cảnh
first={}
for mk in marks: first.setdefault(mk['scene'],mk['start'])
ids=[s['id'] for s in sc]; out=[];secs=[]
for k,(path,cd) in enumerate(clips):
    t0=0.0 if k==0 else first[ids[k]]; t1=T if k==len(clips)-1 else first[ids[k+1]]
    span=t1-t0; sp=max(0.7,min(1.25,cd/span)); use=min(cd,span*sp)
    if cd/span<0.7:   # cảnh quá dài: dùng clip hai lần (như bản bạn sửa tay) thay vì kéo chậm quá
        h=span/2; sp=0.9; dd=min(cd,h*sp); src='media/'+os.path.basename(path)
        out.append({"src":src,"in":0,"dur":round(dd,3),"speed":sp,"size":"SP","label":ids[k]})
        out.append({"src":src,"in":round(cd-dd,3),"dur":round(dd,3),"speed":sp,"size":"SP","label":ids[k]+'b'}); use=dd*2; sp=sp
    else: out.append({"src":'media/'+os.path.basename(path),"in":0,"dur":round(use,3),"speed":round(sp,4),"size":"SP","label":ids[k]})
    secs.append({"id":ids[k],"title":ids[k],"start":round(t0,2),"end":round(t1,2),"script":"","onscreen":[]})
    print(f"{ids[k]} {t0:6.2f}-{t1:6.2f} span {span:5.2f} clip {cd:5.2f} speed {sp:.2f} timeline {use/sp:.2f}")
secs[0]['onscreen']=ev
print('tổng clip',round(sum(c['dur']/c['speed'] for c in out),2),'giọng',round(T,2))
proj={"name":"Đạo lý - Tập 3","fps":30,"canvas":{"w":1080,"h":1920},"clips":out,"sections":secs,
 "voice":{"profile":"70afd348","pron":[]},"voiceover":[{"section":"all","file":"voice/voice_all.wav","start":0,"dur":T,"speedup":1.0}],
 "music":None,"subs":{"mode":"sentence"},"rules":{"shake_max":9,"alternate_sizes":False,"shake_exempt":["media/"]}}
json.dump(proj,open(os.path.join(HERE,'project.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
