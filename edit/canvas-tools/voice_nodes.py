"""Tạo giọng trên canvas: mỗi cảnh một node âm thanh (OmniVoice). Dùng: python -X utf8 canvas-tools/voice_nodes.py N [giọng] [ngôn_ngữ]
Bỏ qua cảnh đã có node thành công (nhận ra bằng prompt trùng lời)."""
import sys, os, json, re, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cv import call
import ep
n = int(sys.argv[1]); voice = sys.argv[2] if len(sys.argv) > 2 else '70afd348'; lang = sys.argv[3] if len(sys.argv) > 3 else 'vi'
MODEL = 'uceIu3NT0oAFMnrTCzwjF::omnivoice'
fix = lambda t: re.sub(r'\b(Một|Hai|Ba|Bốn|Năm|Sáu|Bảy|Tám):', r'\1 –', t)
for k, s in enumerate(ep.scenes(n), 1):
    txt = fix(s['voice'])
    r, N = ep.state()
    ok = [x for x in r['nodes'] if x['type'] == 'audio' and x['metadata'].get('prompt') == txt and x['metadata'].get('status') == 'success']
    if ok: print(k, 'đã có'); continue
    before = {x['id'] for x in r['nodes']}
    call('canvas_create_node', {"nodeType": "audio", "title": f"T{n}-A-c{k:02d} voice", "metadata": {"model": MODEL, "audioVoice": voice, "audioFormat": "wav", "audioSpeed": "1", "audioLanguage": lang}})
    r, N = ep.state(); new = [x for x in r['nodes'] if x['type'] == 'audio' and x['id'] not in before]
    call('canvas_run_generation', {"nodeId": new[0]['id'], "mode": "audio", "prompt": txt})
    for _ in range(60):
        r, N = ep.state(); st = N[new[0]['id']]['metadata'].get('status')
        if st in ('success', 'error'): break
        time.sleep(5)
    print(k, st, N[new[0]['id']]['metadata'].get('durationMs'), flush=True)
