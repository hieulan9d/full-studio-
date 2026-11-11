import sys,os,json;sys.path.insert(0,os.environ['TEMP']);from cv import call
def layout(pre,bx,n):
    r=call('canvas_get_state',{})['result']; N={n_['id']:n_ for n_ in r['nodes']}; ch={}
    for x in r['connections']: ch.setdefault(x['fromNodeId'],[]).append(x['toNodeId'])
    items=[]
    def chain(t,x0,y):
        cur=t;x=x0
        while cur:
            items.append({"id":cur,"x":x,"y":y}); x+=440
            nx=[i for i in ch.get(cur,[]) if N[i]['type'] in('config','image','video')]; cur=nx[0] if nx else None
    for k in range(1,n+1):
        y=420+640*(k-1)
        for t in N.values():
            ti=t.get('title') or ''
            if t['type']=='text' and ti==f"{pre}-c{k:02d} ảnh": chain(t['id'],bx,y)
            elif t['type']=='text' and ti.startswith(f"{pre}-V-c{k:02d}"):
                off=1100 if 'b ' in ti[:len(pre)+8] else 0
                chain(t['id'],bx+1320+(440 if off else 0),y+(320 if off else 0))
    print(len(items)); call('canvas_move_nodes',{"items":items})
if __name__=='__main__': layout(sys.argv[1],int(sys.argv[2]),int(sys.argv[3]))
