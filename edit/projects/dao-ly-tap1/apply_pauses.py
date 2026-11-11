# Chèn khoảng nghỉ giữa các câu vào giọng đọc (không cần VoiceStudio), rồi dời phụ đề / cảnh theo.
import json,re,wave,subprocess,os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
P=json.load(open(os.path.join(HERE,'project_nopause.json'),encoding='utf-8'))
sc=json.load(open(os.path.join(HERE,'scenes.json'),encoding='utf-8'))['scenes']
ev=P['sections'][0]['onscreen']; T=P['voiceover'][0]['dur']
sents=[]
for c in sc: sents+=[x for x in re.split(r'(?<=[.!?])\s+',c['voice'].replace('\n',' ')) if x]
cum=[0]
for s in sents: cum.append(cum[-1]+len(s.split()))
starts={};pos=0
for e in ev: starts[pos]=e['start']; pos+=len([t for t in e['text'].split() if t!='–'])
st=[starts[max(p for p in starts if p<=cum[i])] for i in range(len(sents))]
BIG,NORM,AFTERNUM=0.55,0.35,0.15
import numpy as np
_w=wave.open(os.path.join(HERE,'voice','voice_all_nopause.wav'),'rb'); _fr=_w.getframerate(); _x=np.frombuffer(_w.readframes(_w.getnframes()),dtype=np.int16).astype(float); _w.close()
def cut_point(t):
    # chọn chỗ lặng nhất (cửa sổ 20ms) trong khoảng ngay trước chữ đầu câu, để không cắt vào đuôi chữ cuối câu trước
    a=int((t-0.35)*_fr); b=int((t+0.02)*_fr); win=int(0.02*_fr); best=None
    for k in range(a,b-win,int(0.005*_fr)):
        e=np.sqrt(np.mean(_x[k:k+win]**2))
        if best is None or e<best[0]: best=(e,k+win//2)
    return round(best[1]/_fr,3)
ins=[]   # (vị trí cắt trong giọng gốc, giây chèn)
for i in range(1,len(sents)):
    isnum=len(sents[i].split())==1; prevnum=len(sents[i-1].split())==1
    add=BIG if isnum else (AFTERNUM if prevnum else NORM)
    ins.append((cut_point(st[i]),add))
def shift(t): return t+sum(a for p,a in ins if p<=t)
w=wave.open(os.path.join(HERE,'voice','voice_all_nopause.wav'),'rb'); n=w.getnframes(); fr=w.getframerate(); ch=w.getnchannels(); sw=w.getsampwidth(); data=w.readframes(n); w.close()
bs=ch*sw; out=[];last=0
for p,a in ins:
    k=int(p*fr)*bs; out.append(data[last:k]); out.append(b'\0'*(int(a*fr)*bs)); last=k
out.append(data[last:])
o=wave.open(os.path.join(HERE,'voice','voice_all.wav'),'wb'); o.setnchannels(ch);o.setsampwidth(sw);o.setframerate(fr);o.writeframes(b''.join(out));o.close()
T2=shift(T)+sum(a for p,a in ins if p>T)
T2=round(sum(len(x) for x in out)/bs/fr,3)
for e in ev: e['start']=round(shift(e['start']),2); e['end']=round(shift(e['end']),2)
for a,b in zip(ev,ev[1:]): a['end']=min(a['end'],round(b['start']-0.02,2))
bound=[0];cnt=0
for c in sc[:-1]:
    cnt+=len([x for x in re.split(r'(?<=[.!?])\s+',c['voice'].replace('\n',' ')) if x]); bound.append(cnt)
cl=P['clips'];secs=P['sections']
for k,c in enumerate(cl):
    t0=0.0 if k==0 else shift(cut_point(st[bound[k]])); t1=T2 if k==len(cl)-1 else shift(cut_point(st[bound[k+1]]))
    t0=0.0 if k==0 else t0; 
    d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',c['src']]).decode())
    sp=max(0.7,min(1.25,d/(t1-t0))); c['speed']=round(sp,4); c['dur']=round(min(d,(t1-t0)*sp),3)
    secs[k]['start']=round(t0,2); secs[k]['end']=round(t1,2)
    print(k+1,round(t0,2),round(t1,2),c['speed'],round(c['dur']/c['speed'],2))
P['voiceover'][0]['dur']=T2
print('giọng',T,'->',T2,'| clip',sum(c['dur']/c['speed'] for c in cl))
json.dump(P,open(os.path.join(HERE,'project.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
