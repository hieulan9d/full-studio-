import sys,os,json,time;sys.path.insert(0,os.environ['TEMP']);from cv import call
sc=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','projects','dao-ly-tap3','scenes.json'),encoding='utf-8'))['scenes']
MOT=["character looks at the window then slowly rests a hand on the small latch, curtain sways gently",
"a screwdriver turns and a small latch tightens onto the window frame, dust drifts in the light",
"window guards on the building glow faintly one after another, a street lamp flickers",
"a few lit windows flicker softly, thin clouds drift behind the tower, the building stays still",
"character slides the tape measure up the railing and nods, the window beside stays open a narrow crack",
"character lifts the life jacket slowly and holds it forward, ripples spread on the still water",
"the life jacket bobs gently on the water, ripples expand outward, reeds sway",
"character keeps watching the water, the phone stays untouched, water ripples softly",
"the ring buoy swings slightly on its post, ripples on the pond, a lamp glows",
"the elderly character lifts one leg slowly and balances, arms float outward, morning light grows",
"the elderly character moves through slow flowing tai chi arms, leaves drift in the yard",
"the night lamp glows on the stair step, a hand slides along the handrail, soft light shifts",
"character presses the latch into place, then relaxes and looks out at the dusk, curtain drifts"]
r=call('canvas_get_state',{})['result']; N={n['id']:n for n in r['nodes']}; ids=[]
for k,s in enumerate(sc,1):
    c=[n for n in N.values() if n['type']=='config' and n['title']==f"T3-{s['id']} ảnh"][0]
    img=[x['toNodeId'] for x in r['connections'] if x['fromNodeId']==c['id'] and N[x['toNodeId']]['type']=='image'][0]
    p="Hand-drawn black and white ink sketch animation on pure black background, white chalk line art with crosshatch shading, same style as the reference image. "+MOT[k-1]+". Camera almost static: at most a very slight, barely noticeable slow push-in (under 3 percent), no fast zoom, no big camera movement; only small gentle subject motion and a faint chalk flicker. No text, no letters, no logos."
    res=call('canvas_generate_video',{"prompt":p,"referenceNodeIds":[img],"model":"flow::flow-omni-flash","size":"9:16","seconds":str(s['clip_s']),"title":f"T3-V-c{k:02d} video {s['clip_s']}s"})
    print('video',k,res.get('ok'),flush=True);time.sleep(5)
