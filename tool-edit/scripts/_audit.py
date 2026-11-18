import re,glob,sys
sys.path.insert(0,'scripts')
from _vi import W
BS=chr(92)
words=set(k for k,v in W.items() if v!=k and len(k)>=3)
STR=r"""(['"`])((?:"""+BS+BS+r"""."""+r"""|(?!"""+BS+r"""1)[^"""+BS+"n"+BS+BS+r"""])*)"""+BS+"1"
for f in sorted(glob.glob('src/renderer/ui/*.tsx'))+['src/renderer/actions.ts','src/renderer/store.ts']:
    for i,line in enumerate(open(f,encoding='utf8').read().split('\n'),1):
        if line.strip().startswith('//') or line.strip().startswith('/*'): continue
        texts=[t for _,t in re.findall(STR,line)]+re.findall(r">([^<>{}]*)<",line)+re.findall(r">([^<>{}]+)$",line)
        for t in texts:
            toks=[w.lower() for w in re.findall("[A-Za-z]+",t)]
            hit=[w for w in toks if w in words]
            if hit and ' ' in t.strip() and not re.search("[À-ỹ]",t) and not re.search("[=>]|testid|className",t):
                print(f.split('/')[-1],i,'|',t[:110])
