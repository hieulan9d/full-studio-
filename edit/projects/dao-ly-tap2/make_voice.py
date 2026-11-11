# Tạo giọng tập 2 bằng VoiceStudio: từng đoạn, nghe lại bằng whisper để bắt lỗi, cắt lặng đầu/cuối (tránh âm thừa), ghép + ghi mốc từng đoạn.
import sys,os,re,json,difflib,subprocess
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')))
from vf import tts
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'voice'); TMP=os.path.join(OUT,'parts')
PROFILE='70afd348'
GAP_SENT,GAP_CLAUSE,GAP_ITEM=0.12,0.06,0.18   # nghỉ giữa câu / vế / trước mục liệt kê (≈5-6 khung hình)
sc=json.load(open(os.path.join(HERE,'scenes.json'),encoding='utf-8'))['scenes']
pcs=[]   # (scene, text, is_item_start)
for s in sc:
    for t in re.split(r'(?<=[.?!])\s+',s['voice'].strip()):
        # câu mở đầu bằng "Một:" … đứng riêng là mục liệt kê; tách phần mở đầu và mục liệt kê nếu cùng một câu không có (đã tách bởi dấu chấm)
        m=re.match(r'^(.*?[.?!]\s+)?((?:Một|Hai|Ba|Bốn|Năm):.*)$',t)
        if m and m.group(1): pcs.append((s['id'],m.group(1).strip(),False)); pcs.append((s['id'],m.group(2).strip(),True))
        else: pcs.append((s['id'],t,bool(re.match(r'^(Một|Hai|Ba|Bốn|Năm):',t))))
ff=tts.ff
files=[];log=[];low=[]
for j,(sid,t,item) in enumerate(pcs):
    best=None
    for k in range(4):
        raw=os.path.join(TMP,f'p{j:02d}_{k}.wav'); tts.speak(tts.say(t,[]),PROFILE,raw)
        heard=tts.transcribe(raw); sim=difflib.SequenceMatcher(None,tts.norm(t),tts.norm(heard)).ratio()
        if best is None or sim>best[0]: best=(sim,raw,heard)
        if sim>=0.88: break
    sim,raw,heard=best; fin=os.path.join(TMP,f'p{j:02d}.wav')
    ff('-i',raw,'-af','silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse','-ar','44100','-ac','1',fin)
    files.append((sid,t,item,fin)); log.append(f'[{sim:.2f}] {t}\n      nghe: {heard}'); print(j,len(pcs),f'{sim:.2f}',flush=True)
    if sim<0.85: low.append((j,t,heard,round(sim,2)))
# ghép + mốc
parts=[];t=0.0;marks=[]
sil={}
def silence(g):
    p=os.path.join(TMP,f'sil_{g}.wav')
    if not os.path.exists(p): ff('-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t',str(g),p)
    return p
for i,(sid,txt,item,f) in enumerate(files):
    d=tts.dur(f); marks.append({'scene':sid,'text':txt,'start':round(t,3),'end':round(t+d,3),'item':item}); parts.append(f); t+=d
    if i<len(files)-1:
        nxt=files[i+1]; g=GAP_ITEM if nxt[2] else (GAP_SENT if True else 0)
        if nxt[0]==sid and not nxt[2]: g=GAP_SENT
        parts.append(silence(g)); t+=g
lst=os.path.join(TMP,'list.txt'); open(lst,'w',encoding='utf-8').write(''.join("file '%s'\n"%x.replace(chr(92),'/') for x in parts))
raw=os.path.join(OUT,'voice_cat.wav'); ff('-f','concat','-safe','0','-i',lst,'-c:a','pcm_s16le',raw)
ff('-i',raw,'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','44100','-ac','1',os.path.join(OUT,'voice_all.wav'))
T=tts.dur(os.path.join(OUT,'voice_all.wav'))
json.dump({'total':T,'marks':marks,'low':low},open(os.path.join(HERE,'voice_marks.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
open(os.path.join(OUT,'log.txt'),'w',encoding='utf-8').write('\n'.join(log))
print('XONG',round(T,1),'s',len(marks),'đoạn; nghi sai:',len(low))
