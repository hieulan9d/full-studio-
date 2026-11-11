import sys,os,json,time;sys.path.insert(0,os.environ['TEMP']);from cv import call
sc=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','projects','dao-ly-tap3','scenes.json'),encoding='utf-8'))['scenes']
r=call('canvas_get_state',{}); print({k:(v if not isinstance(v,(list,dict)) else '...') for k,v in r.get('result',r).items()} if isinstance(r.get('result',r),dict) else r)
for s in sc:
    r=call('canvas_generate_image',{"prompt":s['image_prompt'],"model":"flow::flow-nano-banana-pro","size":"9:16","count":1,"title":f"T3-{s['id']} ảnh"})
    print(s['id'],r.get('ok'),flush=True); time.sleep(3)
