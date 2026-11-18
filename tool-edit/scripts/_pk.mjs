import { chromium } from 'playwright-core';
const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = b.contexts()[0].pages()[0];
await new Promise(r=>setTimeout(r,1500));
console.log(await page.title(), page.url().slice(-40));
console.log(await page.evaluate(()=>({home: !!document.querySelector('[data-testid="home"]'), ready: !!window.__te})));
await page.screenshot({path:'out/ui/pkg-home.png'});
await b.close();
