import sys,os,json,time;sys.path.insert(0,os.environ['TEMP']);from cv import call
for _ in range(30):
    r=call('canvas_get_state',{})['result']; N={n['id']:n for n in r['nodes']}
    cf=[n for n in N.values() if n['type']=='config' and (n.get('title') or '').startswith('T3-c') and n['title'].endswith('ảnh')]
    st={}
    for c in cf:
        o=[N[x['toNodeId']] for x in r['connections'] if x['fromNodeId']==c['id'] and N[x['toNodeId']]['type']=='image']
        st[c['title']]=o[0]['metadata'].get('status') if o else 'none'
    vals=list(st.values()); print(len(st),{v:vals.count(v) for v in set(vals)},flush=True)
    if len(st)==13 and all(v in('success','error') for v in vals): print('ERR',[k for k,v in st.items() if v=='error']); break
    time.sleep(20)
