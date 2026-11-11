import json,re,os
st=json.load(open(os.path.join(os.environ['TEMP'],'state.json'),encoding='utf-8'))['result']
n=[x for x in st['nodes'] if x['id']=='qtyvIffRrJNJJLaEhnwi0'][0]['metadata']
s=[x for x in re.split(r'(?<=[.!?])\s+',n['prompt'].replace('\n',' ')) if x]
tot=sum(map(len,s)); cum=[0]
for x in s: cum.append(cum[-1]+len(x))
T=n['durationMs']/1000
A=[(0,"seated in a car at night, pulling the seat belt across the body toward the buckle, dashboard and road visible through the windshield",8),
(4,"seated in the back seat of a car at night, clicking the rear seat belt into the buckle, an empty front seat ahead, street lights outside the window",8),
(6,"seated in the back seat of a car at night, looking at a loose unfastened seat belt hanging beside the seat, quiet and worried mood",8),
(8,"standing beside a motorbike at night, a plain helmet hanging from the handlebar, a faceless police officer silhouette far behind with a ticket book",8),
(12,"sitting on a motorbike at night, wearing a plain helmet with the chin strap fastened under the chin, empty street lit by lamp posts",8),
(13,"standing under a street lamp holding a helmet, inspecting a small label inside the helmet, no readable text",6),
(15,"riding a motorbike fast at night, road markings streaking past, lamp posts blurred, tense mood",8),
(18,"sitting on a stopped motorbike staring at a glowing phone screen in one hand, the dark road ahead blurred",8),
(20,"seated at a small plastic table with a glass of beer and a set of car keys, hesitating, night street cafe",6),
(23,"resting on a low plastic stool at a roadside tea stall late at night, a glass of tea, a car parked behind",6),
(26,"a baby car seat in the back seat of a car, a tiny egg-headed child character buckled safely inside, soft light from the car interior",8),
(28,"leaning into the back seat of a car adjusting the safety harness of a small child seat for a tiny egg-headed child, warm interior light",10),
(29,"standing at the start of a long road at dawn, raising one finger, faint light on the horizon, hopeful calm mood",10)]
STY=" Hand-drawn black and white ink sketch on a pure black background, white chalk line art with fine crosshatch shading, rough pencil texture, Vietnamese everyday atmosphere, melancholic but calm mood, scene centered with empty black space at the top and bottom for captions, vertical 9:16 composition, no text, no letters, no logos, no realistic human faces."
CH="A simple minimalist character with a round blank egg-shaped white head and a plain white t-shirt, "
sc=[]
for k,(i0,a,d) in enumerate(A):
    i1=A[k+1][0] if k+1<len(A) else len(s)
    t0=cum[i0]/tot*T;t1=cum[i1]/tot*T
    sc.append({"id":f"c{k+1:02d}","t0":round(t0,1),"t1":round(t1,1),"voice_dur":round(t1-t0,1),"clip_s":d,"voice":' '.join(s[i0:i1]),"image_prompt":(a if k==10 else CH+a)+"."+STY})
json.dump({"voice_total":T,"scenes":sc},open('scenes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print([ (x['id'],x['t0'],x['voice_dur'],x['clip_s']) for x in sc])
