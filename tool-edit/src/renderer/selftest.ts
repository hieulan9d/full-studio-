// Selftest GPU (chay bang `npm run selftest`): ramp, thanh mau, BT.709, toc do, doc ve.
import { r, toPng } from './engine';
import type { Layer } from '../render/renderer';
import { srgbEotf } from '../core/color';

export async function selfTest() {
  const W = 1080,
    H = 1920;
  const res: Record<string, unknown> = { gpu: r.info };
  const gen = (kind: 'ramp' | 'bars'): Layer[] => [{ type: 'gen', kind, param: 0, time: 0 }];

  const ramp = await r.renderToRgba(gen('ramp'), { width: W, height: H, out: 'srgb' });
  let maxDiff = 0,
    bad = 0;
  const y = (H / 2) | 0;
  for (let x = 0; x < W; x++) {
    const expected = Math.round(((x + 0.5) / W) * 255);
    for (let ch = 0; ch < 3; ch++) {
      const d = Math.abs(ramp[(y * W + x) * 4 + ch] - expected);
      if (d > maxDiff) maxDiff = d;
      if (d > 1) bad++;
    }
  }
  res.ramp = { maxDiff, columnsOverTolerance: bad, pass: bad === 0 };

  const bars = await r.renderToRgba(gen('bars'), { width: W, height: H, out: 'srgb' });
  const cols = [[1, 1, 1], [1, 1, 0], [0, 1, 1], [0, 1, 0], [1, 0, 1], [1, 0, 0], [0, 0, 1]];
  let barBad = 0;
  const detail: number[][] = [];
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(((i + 0.5) / 7) * W);
    const px = [0, 1, 2].map((ch) => bars[(y * W + x) * 4 + ch]);
    detail.push(px);
    const exp = cols[i].map((v) => Math.round(v * 0.75 * 255));
    if (px.some((v, k) => Math.abs(v - exp[k]) > 1)) barBad++;
  }
  res.bars = { samples: detail, barsOverTolerance: barBad, pass: barBad === 0 };

  const l = srgbEotf(0.5);
  const b709 = await r.renderToRgba(gen('ramp'), { width: W, height: H, out: 'bt709' });
  const gpuCode = b709[(y * W + ((W / 2) | 0)) * 4];
  const cpuCode = Math.round((l < 0.018 ? 4.5 * l : 1.099 * Math.pow(l, 0.45) - 0.099) * 255);
  res.bt709 = { gpuCode, cpuCode, pass: Math.abs(gpuCode - cpuCode) <= 1 };

  const bench = await r.benchmark({ width: W, height: H, kind: 'stress', param: 64 }, 120);
  const s = [...bench.serialMs].sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  res.benchmark = { frames: s.length, serialAvgMs: +avg.toFixed(2), serialP95Ms: +s[Math.floor(s.length * 0.95)].toFixed(2), serialMinMs: +s[0].toFixed(2), pipelinedAvgMs: +bench.pipelinedAvgMs.toFixed(2), note: 'canh stress tong hop, KHONG so sanh truc tiep voi AE' };

  const t0 = performance.now();
  const rb = await r.renderToRgba(gen('bars'), { width: W, height: H });
  const t1 = performance.now();
  const png = await toPng(rb, W, H);
  res.readback = { renderAndReadbackMs: +(t1 - t0).toFixed(2), pngEncodeMs: +(performance.now() - t1).toFixed(2), pngBytes: png.length };

  const pngBars = await toPng(await r.renderToRgba(gen('bars'), { width: 360, height: 640 }), 360, 640);
  const pngRamp = await toPng(await r.renderToRgba(gen('ramp'), { width: 360, height: 640 }), 360, 640);
  window.toolEdit.sendSelftest({ result: res, pngBars, pngRamp });
}
