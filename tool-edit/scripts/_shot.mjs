import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const out = process.argv[2];
const BASE='http://127.0.0.1:17480';
const call = async (m,p,b)=> (await fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined})).json();
const br = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = br.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1600, height: 950 });
await call('POST','/project/new',{});
await page.reload(); await new Promise(r=>setTimeout(r,2500));
const r = await call('POST','/media_import',{path: resolve('out/media/color-test.mp4')});
for (const id of [r.job_id, r.audio_job_id]) if (id) for(;;){ const j=await call('GET','/jobs/'+id); if(j.state==='done')break; await new Promise(x=>setTimeout(x,300)); }
await call('POST','/ops',{source:'human',ops:[{op:'add_clip',clip:{id:'c',track:'v1',src:{type:'media',mediaId:r.mediaId},start:0,duration:3,in:0,volume:1,transform:{fit:'cover'},keyframes:{}}}]});
await new Promise(r=>setTimeout(r,1000));
await page.locator('[data-testid="tab-scope"]').click();
await page.evaluate(()=>window.__te.player.seek(1));
for (const k of ['waveform','rgbwave','parade','vectorscope','histogram']) {
  await page.locator(`[data-testid="scope-${k}"]`).click();
  await new Promise(r=>setTimeout(r,1200));
  const cv = await page.locator('[data-testid="scope-canvas"]').boundingBox();
  await page.mouse.move(cv.x+cv.width*0.4, cv.y+cv.height*0.4);
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({ path: `${out}/scope-${k}.png` });
}
await br.close();
