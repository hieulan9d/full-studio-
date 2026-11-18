import re,glob,sys
sys.path.insert(0,'scripts')
from _vi import W
words=set(k for k,v in W.items() if v!=k and len(k)>=3 and k not in ('the','can','set','som'))
for f in sorted(glob.glob('src/renderer/ui/*.tsx'))+['src/renderer/actions.ts']:
    for i,line in enumerate(open(f,encoding='utf8').read().split('\n'),1):
        s=line.strip()
        if s.startswith('//') or s.startswith('/*') or s.startswith('*'): continue
        code=re.sub(r"//.*$","",line)
        toks=[w.lower() for w in re.findall("[A-Za-z]+",code)]
        hit=[w for w in toks if w in words]
        if len(hit)>=2 and not re.search("[À-ỹ]",code): print(f.split('/')[-1],i,'|',s[:130])
