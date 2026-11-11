import json,os,sys,urllib.request
def call(name,inp):
    t=json.load(open(os.path.expandvars(r'%USERPROFILE%/.infinite-canvas/canvas-agent.json')))['token']
    r=urllib.request.Request('http://127.0.0.1:17371/api/tools',json.dumps({'name':name,'input':inp}).encode(),{'content-type':'application/json','x-canvas-agent-token':t})
    return json.load(urllib.request.urlopen(r,timeout=120))
