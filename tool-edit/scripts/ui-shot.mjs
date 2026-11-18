// Chup anh cua so Tool Edit dang chay (can TOOL_EDIT_CDP_PORT). Dung: node scripts/ui-shot.mjs ten
import { chromium } from 'playwright-core';
const port = process.env.TOOL_EDIT_CDP_PORT ?? '9333';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await page.screenshot({ path: `out/ui/${process.argv[2] ?? 'shot'}.png` });
console.log('title:', await page.title());
await browser.close();
