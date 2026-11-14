import sys,os,json,time;sys.path.insert(0,os.environ['TEMP']);from cv import call
sc=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','projects','dao-ly-tap4','scenes.json'),encoding='utf-8'))['scenes']
MOT=["character looks at the mushroom basket and slowly raises a stop hand, kitchen lamp light flickers gently",
"the silver needle glints beside the mushrooms, one mushroom cap trembles slightly, slow push-in",
"the hospital corridor light flickers softly, an empty chair casts a long shadow, quiet drifting dust",
"the pages of the open field guide turn slowly, the magnifying glass glints under the desk lamp",
"steam rises slowly from the soup bowl, a lamp flickers, the bowls around the table stay still",
"character lifts the lid and seals the container of leftovers, then reaches for the phone on the counter",
"wood ear mushrooms float slowly in the glass bowl, rice noodle sheets settle softly on the tray",
"water bubbles in the pot and steam rises, the bowl of mushrooms stays still beside it",
"rain streaks down the window, the lamp flickers softly over the empty table, steam fades from the bowl",
"character tips the container into the trash bin and closes the lid, the fridge light glows softly",
"character lifts the phone to the ear and nods slowly, the glass of water stays untouched",
"first light spreads across the counter, character slides the basket away and breathes out, curtain sways"]
r=call('canvas_get_state',{})['result']; N={n['id']:n for n in r['nodes']}; ids=[]
for k,s in enumerate(sc,1):
    if k==1: continue
    c=[n for n in N.values() if n['type']=='config' and n['title']==f"T4-{s['id']} ảnh"][0]
    img=[x['toNodeId'] for x in r['connections'] if x['fromNodeId']==c['id'] and N[x['toNodeId']]['type']=='image'][0]
    p="Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. "+MOT[k-1]+". Camera almost static: at most a very slight, barely noticeable slow push-in (under 3 percent), no fast zoom, no big camera movement; only small gentle subject motion and a faint chalk flicker. No text, no letters, no logos."
    res=call('canvas_generate_video',{"prompt":p,"referenceNodeIds":[img],"model":"flow::flow-omni-flash","size":"9:16","seconds":str(s['clip_s']),"title":f"T4-V-c{k:02d} video {s['clip_s']}s"})
    print('video',k,res.get('ok'),flush=True);time.sleep(5)
