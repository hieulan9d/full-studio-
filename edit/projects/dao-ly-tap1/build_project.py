# Dựng project.json tập 1 từ exports của canvas: chép file, nhận dạng giọng, căn cảnh theo câu, tạo phụ đề theo câu.
import json,os,re,shutil,subprocess,sys
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')))
from vf import tts,subs
HERE=os.path.dirname(os.path.abspath(__file__))
m=json.load(open(r'E:/antigravyti/infinite-canvas/exports/manifest.json',encoding='utf-8'))
vids=[i for i in m['items'] if i['type']=='video']; aud=[i for i in m['items'] if i['type']=='audio'][0]
assert len(vids)==13,len(vids)
clips=[]
for k,v in enumerate(vids,1):
    dst=os.path.join(HERE,'media',f'v{k:02d}.mp4'); shutil.copy(v['path'],dst); clips.append((dst,v['durationMs']/1000))
shutil.copy(aud['path'],os.path.join(HERE,'voice','giong_tap1.mp3'))
wav=os.path.join(HERE,'voice','voice_all.wav')
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',aud['path'],'-ar','44100','-ac','1',wav],check=True)
text=aud['prompt']; T=aud['durationMs']/1000
words=tts.transcribe(wav,words=True)
sents=[s for s in re.split(r'(?<=[.!?])\s+',text.replace('\n',' ')) if s]
toks=[];sidx=[]
for i,s in enumerate(sents):
    for w in s.split(): toks.append(w);sidx.append(i)
tm=subs._align(toks,words,0,T)
st=[];en=[]
for i in range(len(sents)):
    ws=[tm[j] for j in range(len(toks)) if sidx[j]==i];st.append(ws[0][0]);en.append(ws[-1][1])
# điểm cắt cảnh: đầu câu gần nhất với mốc cộng dồn độ dài clip
sc0=json.load(open(os.path.join(HERE,'scenes.json'),encoding='utf-8'))['scenes']
bound=[0];cnt=0   # điểm cắt theo câu đầu của từng cảnh trong kịch bản (không đoán theo độ dài clip)
for c in sc0[:-1]:
    cnt+=len([x for x in re.split(r'(?<=[.!?])\s+',c['voice'].replace(chr(10),' ')) if x]); bound.append(cnt)
bound=sorted(set(bound))
sc=json.load(open(os.path.join(HERE,'scenes.json'),encoding='utf-8'))['scenes']
out=[];secs=[];ev=[]
for k,(path,cd) in enumerate(clips):
    i0=bound[k] if k<len(bound) else 0; i1=bound[k+1] if k+1<len(bound) else len(sents)
    t0=0.0 if k==0 else st[i0]; t1=T if k==len(clips)-1 else st[i1]
    span=t1-t0; sp=max(0.75,min(1.25,cd/span)); use=min(cd,span*sp)
    out.append({"src":'media/'+os.path.basename(path),"in":0,"dur":round(use,3),"speed":round(sp,4),"size":"SP","label":f"c{k+1:02d}"})
    secs.append({"id":f"c{k+1:02d}","title":f"c{k+1:02d}","start":round(t0,2),"end":round(t1,2),"script":"","onscreen":[]})
    print(f"c{k+1:02d} câu {i0}-{i1-1} {t0:.1f}-{t1:.1f} ({span:.1f}s) clip {cd:.1f}s speed {sp:.2f}")
MAXC=40
NOBEF={'trăm','vong','sau','trước','hiểm','mũ','đồng','lái','nghìn','triệu','tuổi','lần','tiếng','phút','mét','nạn','tiền','xe','dây','cồn','độ','lại','mươi','cơ','phần','linh'}
NOEND={'có','nguy','khoảng','hãy','và','của','là','bị','phạt','từ','với','trong','cho','ở','một','hai','ba','bốn','năm','sáu','bảy','tám','chín','mười','lăm','trăm','nghìn','mươi','giảm','tăng'}
GOBEF={'và','nhưng','mà','hoặc','để','khi','thì','nếu','vì','với','trong','ở','từ'}
def split_sent(ix):
    n=len(ix); L=lambda a,b:len(" ".join(toks[ix[k]] for k in range(a,b)))
    INF=1e18; best=[INF]*(n+1); prv=[0]*(n+1); best[0]=0
    for j in range(1,n+1):
        for i in range(j):
            if best[i]>=INF or L(i,j)>MAXC: continue
            c=best[i]+300+(L(i,j)-26)**2*0.5
            if j-i==1 and n>1: c+=400
            if j<n:
                last=toks[ix[j-1]]; nxt=toks[ix[j]]
                if last.endswith((',',';',':')): c-=250
                if nxt.lower().strip(',.') in NOBEF: c+=600
                if nxt.lower() in GOBEF: c-=120
                if not last.endswith((',',';',':')) and last.lower() in NOEND: c+=500
            if i>0 and j==n and j-i<3: c+=300
            if c<best[j]: best[j]=c; prv[j]=i
    cuts=[];j=n
    while j>0: cuts.append((prv[j],j)); j=prv[j]
    return [[ix[k] for k in range(a,b)] for a,b in reversed(cuts)]
pend=[]
for i,s in enumerate(sents):
    idx=[k for k in range(len(toks)) if sidx[k]==i]
    if len(idx)<=1: pend+=idx; continue   # "Một." "Hai." ghép vào câu sau
    idx=pend+idx; pend=[]
    for ch in split_sent(idx):
        ev.append({"start":round(tm[ch[0]][0],2),"end":round(tm[ch[-1]][1]+0.1,2),"text":re.sub(r"^(Một|Hai|Ba|Bốn)\. ",r" – "," ".join(toks[k] for k in ch)),"style":"Sub"})
ev.sort(key=lambda e:e['start'])
for a,b in zip(ev,ev[1:]):
    if b['start']<a['start']+0.4: b['start']=round(a['start']+0.4,2)   # đoạn mỗi dòng hiện tối thiểu 0,4s, không chồng đoạn sau
    a['end']=round(min(a['end'],b['start']-0.02),2)
    if a['end']<=a['start']: a['end']=round(a['start']+0.3,2)
secs[0]['onscreen']=ev
proj={"name":"Đạo lý - Tập 1","fps":30,"canvas":{"w":1080,"h":1920},"clips":out,"sections":secs,
 "voice":{"profile":"70afd348","pron":[]},"voiceover":[{"section":"all","file":"voice/voice_all.wav","start":0,"dur":T,"speedup":1.0}],
 "music":None,"subs":{"mode":"sentence"},"rules":{"shake_max":9,"alternate_sizes":False,"shake_exempt":["media/"]}}
json.dump(proj,open(os.path.join(HERE,'project.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
