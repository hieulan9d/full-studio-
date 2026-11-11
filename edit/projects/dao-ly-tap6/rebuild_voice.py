# Cắt "âm thừa" ở đầu mỗi đoạn giọng (một tiếng ngắn ~0,15s, rồi lặng ~0,4s, rồi mới tới lời), ghép lại giọng, cập nhật mốc.
import sys,os,json,wave
import numpy as np
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')))
from vf import tts
H=os.path.dirname(os.path.abspath(__file__)); TMP=H+'/voice/parts'; OUT=H+'/voice'; ff=tts.ff
def rd(f):
    w=wave.open(f); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16); fr=w.getframerate(); w.close(); return x,fr
def wr(f,x,fr):
    w=wave.open(f,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(fr); w.writeframes(x.astype(np.int16).tobytes()); w.close()
def strip_blip(src,dst):
    x,fr=rd(src); st=int(0.01*fr); rms=np.array([np.sqrt(np.mean(x[i:i+st].astype(float)**2)) for i in range(0,len(x)-st,st)])
    quiet=rms<40; n=len(quiet); cut=0; i=0
    while i<n and quiet[i]: i+=1                      # lặng đầu file
    if i>=8 and i<n: cut=max(0,i-3)*st                # chỉ lặng: cắt tới sát lời
    else:
        # tiếng thừa (<=0,3s) rồi một khoảng lặng >= 80ms rồi mới tới lời
        k=i
        while k<min(n,35):
            if quiet[k]:
                r=k
                while r<n and quiet[r]: r+=1
                if r-k>=8 and r<n: cut=max(0,r-3)*st; break
                k=r
            else: k+=1
    if cut==0:   # tiếng thừa yếu rồi một đoạn rất nhỏ (chưa lặng hẳn) rồi mới tới lời
        S=np.percentile(rms[:100],90); lo=0.12*S; a=0
        while a<n and rms[a]<lo: a+=1
        b=a
        while b<min(n,30) and rms[b]>=lo: b+=1
        c=b
        while c<n and rms[c]<lo: c+=1
        if 2<=b-a<=25 and rms[a:b].max()<0.45*S and c-b>=4 and c<45: cut=max(0,c-2)*st
    y=x[cut:]
    # cắt lặng cuối
    e=len(y)
    while e>st and np.sqrt(np.mean(y[e-st:e].astype(float)**2))<40: e-=st
    wr(dst,y[:min(len(y),e+int(0.05*fr))],fr); return cut/fr
import difflib,re
NUMW={'một':'1','hai':'2','ba':'3','bốn':'4','năm':'5','sáu':'6'}
def first_ok(heard,text):
    norm=lambda t:re.sub(r'[^\w ]','',t.lower()).split()
    e=norm(text)[:3]; h=norm(heard)[:3]
    if not h: return False
    if NUMW.get(e[0]) and h[0]==NUMW[e[0]]: e[0]=h[0]
    return difflib.SequenceMatcher(None,' '.join(e),' '.join(h)).ratio()>=0.8
def candidates(src):
    x,fr=rd(src); st=int(0.01*fr); rms=np.array([np.sqrt(np.mean(x[i:i+st].astype(float)**2)) for i in range(0,len(x)-st,st)])
    q=rms<40; out=[]; i=0; n=min(len(q),150)
    while i<n:
        if q[i]:
            j=i
            while j<len(q) and q[j]: j+=1
            if j-i>=6 and j<len(q): out.append(max(0,j-3)*st)
            i=j
        else: i+=1
    return out,x,fr
def best_cut(src,dst,text):
    cs,x,fr=candidates(src); auto=strip_blip(src,dst)
    for c in sorted(set([int(auto*fr)]+cs),reverse=True):
        y=x[c:]; wr(dst,y,fr)
        if first_ok(tts.transcribe(dst),text): return c/fr
    wr(dst,x,fr); return None
d=json.load(open(H+'/voice_marks.json',encoding='utf-8')); M=d['marks']
A=lambda p:os.path.abspath(p).replace(chr(92),'/')
cuts=[];parts=[];t=0.0
for i,m in enumerate(M):
    src=f'{TMP}/p{i:02d}.wav'; dst=f'{TMP}/c{i:02d}.wav'
    if os.environ.get('FIXED'):   # VoiceStudio tắt: dùng điểm cắt đã kiểm chứng trước đó (đoạn số: dùng cắt tự động)
        FX=[0.5,0.0,0.64,0.23,0.67,0.51,0.47,0.46,0.0,0.67,0.18,0.52,0.64,0.41,0.74,0.55,0.59,0.48,0.48,0.68,0.47,0.53,0.79,0.34,0.1,0.57,0.6,0.45,0.13,0.59,0.0,0.0,0.65,0.0]
        x,fr=rd(src); c=int(FX[i]*fr); y=x[c:]; e=len(y); st=int(0.01*fr)
        while e>st and np.sqrt(np.mean(y[e-st:e].astype(float)**2))<40: e-=st
        wr(dst,y[:min(len(y),e+int(0.05*fr))],fr); cut=FX[i]
    else:
        cut=best_cut(src,dst,m['text'])
        for k in range(6):   # đoạn lỗi (còn âm thừa / rớt chữ đầu): tạo lại cho tới khi whisper nghe đúng 3 chữ đầu
            if cut is not None: break
            raw=f'{TMP}/h{i}_{k}.wav'; tts.speak(tts.say(m['text'],[]),'70afd348',raw); print('tạo lại đoạn',i,k,flush=True)
            ff('-i',raw,'-af','silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse','-ar','44100','-ac','1',src)
            cut=best_cut(src,dst,m['text'])
        cut=cut or 0.0
    cuts.append(round(cut,2)); dd=tts.dur(dst); m['start']=round(t,3); m['end']=round(t+dd,3); parts.append(A(dst)); t+=dd
    if i<len(M)-1:
        g=0.167; s=f'{TMP}/sil_{g}.wav'
        if not os.path.exists(s): ff('-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t',str(g),s)
        parts.append(A(s)); t+=g
print('đã cắt đầu (s):',cuts)
open(f'{TMP}/list.txt','w').write(''.join("file '%s'\n"%x for x in parts))
ff('-f','concat','-safe','0','-i',f'{TMP}/list.txt','-c:a','pcm_s16le',f'{OUT}/voice_cat.wav')
ff('-i',f'{OUT}/voice_cat.wav','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','44100','-ac','1',f'{OUT}/voice_all.wav')
d['total']=tts.dur(f'{OUT}/voice_all.wav'); json.dump(d,open(H+'/voice_marks.json','w',encoding='utf-8'),ensure_ascii=False,indent=1); print('tổng',round(d['total'],1))
