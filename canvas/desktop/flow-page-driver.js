/**
 * UI driver — điều khiển giao diện web Google Flow ngay trong trang (không API, không captcha riêng).
 * Electron (desktop/flow-driver.js) nạp file này vào cửa sổ Flow bằng executeJavaScript rồi gọi
 *   window.__flowUi.submit(job)  -> điền ảnh + prompt + cài đặt, bấm tạo, trả {baseline, expect}
 *   window.__flowUi.poll({baseline, expect, t0}) -> {state:'running'|'done'|'failed', videos:[{id,url}]}
 *
 * Selector dùng tên icon Material (add, arrow_forward, close, videocam, crop_free, ...) và class
 * để không phụ thuộc ngôn ngữ giao diện. Mọi selector tập trung ở SEL bên dưới để sửa nhanh.
 */
(() => {

  const SEL = {
    editor: '.ProseMirror',
    composer: '.base-prompt-box',
    generate: 'button[aria-label="Bắt đầu tạo"], button[aria-label="Start generating"], button[aria-label="Generate"]',
    settings: 'button.settings-trigger-button',
    clearPrompt: 'button[aria-label="Xoá câu lệnh"]',
    addMedia: 'button[aria-label="Thêm thành phần vào ô nhập câu lệnh"]',
    pickerSearch: '.cdk-overlay-container input.search-input, input[aria-label="Tìm kiếm thành phần"], input[aria-label="Search for assets"]',
    pickerOption: 'button[role=option].asset-item',
    pickerAdd: 'button.detail-add-to-prompt-btn',
    pickerUpload: '.sidebar-footer',
    chip: '.mention-chip',
    composerThumbRemove: '.chip-container',
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const txt = (e) => (e?.innerText || e?.textContent || '').trim();
  const log = [];
  const note = (m) => { log.push(`${new Date().toISOString().slice(11, 19)} ${m}`); if (log.length > 200) log.shift(); };

  async function waitFor(fn, timeout = 15000, step = 150, what = '') {
    const t0 = Date.now();
    for (;;) {
      let v;
      try { v = await fn(); } catch { v = null; }
      if (v) return v;
      if (Date.now() - t0 > timeout) throw new Error('UI_TIMEOUT: ' + what);
      await sleep(step);
    }
  }

  // Chặn input.click() của Flow khi ta đang upload để lấy input file mà không mở hộp thoại hệ thống.
  // trạng thái bắt input nằm trên window để bản driver nạp lại vẫn dùng chung bản vá click
  const cap = (window.__flowUiCap = window.__flowUiCap || { on: false, input: null });
  if (!window.__flowUiClickPatched) {
    const orig = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file' && window.__flowUiCap.on) { window.__flowUiCap.input = this; return; }
      return orig.apply(this, arguments);
    };
    window.__flowUiClickPatched = true;
  }

  const realClick = (el) => {
    if (!el) throw new Error('UI_NO_ELEMENT');
    el.focus?.();
    el.click();
  };

  const iconBtn = (root, icon) => $$('button', root).find((b) => txt(b).split('\n')[0].trim() === icon);

  // ───────── Cài đặt (video/ảnh, khung hình/thành phần, tỉ lệ, model, độ phân giải, giây, số lượng) ─────────
  async function openSettings() {
    const open = () => $$('button[role=radio]').find((b) => /videocam/.test(txt(b)) && b.getBoundingClientRect().width);
    if (open()) return;
    const trigger = await waitFor(() => $(SEL.settings), 10000, 200, 'settings button');
    for (let i = 0; i < 3; i++) {
      realClick(trigger);
      try { await waitFor(open, 2500, 150, 'settings popover'); return; } catch { /* bấm lại */ }
    }
    throw new Error('UI_TIMEOUT: settings popover');
  }
  const radio = (re) => $$('button[role=radio]').find((b) => re.test(txt(b)) && b.getBoundingClientRect().width);
  async function pickRadio(re, label) {
    const b = await waitFor(() => radio(re), 4000, 150, 'radio ' + label);
    if (b.getAttribute('aria-checked') !== 'true') { realClick(b); await sleep(250); }
  }
  async function setModel(name) {
    const btn = $$('button').find((b) => /arrow_drop_down/.test(txt(b)) && b.getBoundingClientRect().width);
    if (!btn) return;
    if (txt(btn).includes(name)) return;
    realClick(btn);
    const opt = await waitFor(() => $$('[role=option],mat-option,.mat-mdc-option,[role=menuitem]').find((o) => txt(o).split('\n')[0].trim().endsWith(name)), 4000, 150, 'model ' + name);
    realClick(opt);
    await sleep(300);
  }
  const chipSeconds = () => { const m = txt($(SEL.settings)).match(/(\d+)\s*(?:giây|s\b|sec)/i); return m ? +m[1] : null; };
  async function setSeconds(sec) {
    const input = $('input.mdc-slider__input');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const min = +input.min, max = +input.max;
    for (let guess = Math.min(max, Math.max(min, sec - 3)), tries = 0; tries < 6; tries++) {
      setter.call(input, String(guess));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(250);
      const cur = chipSeconds();
      if (cur === sec || cur == null) return;
      guess = Math.min(max, Math.max(min, guess + (sec > cur ? 1 : -1)));
    }
  }

  async function applySettings(job) {
    await openSettings();
    if (job.kind === 'image') {
      await pickRadio(/^\s*image\b/, 'image');
      const ratio = job.ratio || (job.aspect === 'portrait' ? '9:16' : '16:9');
      await pickRadio(new RegExp('(^|\\s)' + ratio.replace(':', ':') + '$'), 'ratio ' + ratio);
      if (job.model) await setModel(job.model);
      if (job.quality) await pickRadio(new RegExp('^\\s*' + job.quality + '\\s*$', 'i'), 'quality ' + job.quality);
      await pickRadio(new RegExp('^x' + (job.count || 1) + '$'), 'count');
      await closeSettings();
      return;
    }
    await pickRadio(/videocam/, 'video');
    await pickRadio(job.mode === 'frames' ? /crop_free/ : /chrome_extension/, 'mode');
    await pickRadio(job.aspect === 'portrait' ? /crop_9_16/ : /crop_16_9/, 'aspect');
    if (job.model) await setModel(job.model);
    // một số model (Veo) không có lựa chọn độ phân giải: bỏ qua thay vì báo lỗi
    await pickRadio(new RegExp('^\\s*(?:info\\s*)?' + (job.resolution || '720p') + '\\b|' + (job.resolution || '720p')), 'resolution').catch(() => {});
    if (job.seconds) await setSeconds(job.seconds);
    await pickRadio(new RegExp('^x' + (job.count || 1) + '$'), 'count');
    await closeSettings();
  }
  const settingsOpen = () => { const r = $$('button[role=radio]').find((b) => /videocam/.test(txt(b))); return !!(r && r.getBoundingClientRect().width); };
  async function closeSettings() {
    if (!settingsOpen()) return;
    realClick($(SEL.settings)); // bấm lại nút cài đặt để đóng bảng
    try { await waitFor(() => !settingsOpen(), 2500, 100, 'close settings'); }
    catch { document.body.click(); await waitFor(() => !settingsOpen(), 2500, 100, 'close settings (click ngoài)'); }
  }

  // ───────── Composer ─────────
  async function clearComposer() {
    const clr = $(SEL.clearPrompt);
    if (clr) { realClick(clr); await sleep(400); }
    // gỡ thumbnail thành phần còn sót
    // (cả thumbnail thành phần lẫn ô khung hình đầu/cuối đã có ảnh đều có nút "cancel")
    for (let i = 0; i < 10; i++) {
      const rm = $$('button', $(SEL.composer) || document).find((b) => txt(b).split('\n').includes('cancel'));
      if (!rm) break;
      realClick(rm); await sleep(250);
    }
  }

  async function openPicker() {
    if ($(SEL.pickerSearch) && $(SEL.pickerSearch).getBoundingClientRect().width) return;
    // chế độ Khung hình không có nút "+": dùng ô "Bắt đầu" để mở cùng hộp chọn ảnh
    const add = $(SEL.addMedia) || iconBtn($(SEL.composer) || document, 'add') || $('.frame-trigger button');
    const shown = () => { const s = $(SEL.pickerSearch); return s && s.getBoundingClientRect().width; };
    await closeSettings().catch(() => {}); // bảng cài đặt còn mở sẽ nuốt cú bấm
    await sleep(300);
    realClick(add);
    // chờ lâu hơn trước khi bấm lại: bấm lần 2 khi hộp đang mở dở sẽ đóng nó lại
    try { await waitFor(shown, 7000, 150, 'asset picker'); }
    catch { if (shown()) return; realClick(add); await waitFor(shown, 7000, 150, 'asset picker (retry)'); }
  }
  const optName = (o) => txt(o).split('\n')[0].trim();
  async function pickAsset(name) {
    const opt = await waitFor(() => $$(SEL.pickerOption).find((o) => optName(o) === name), 15000, 200, 'asset ' + name);
    realClick(opt); await sleep(500);
    // chọn từ "@" thì Flow chèn chip luôn; chọn từ nút + thì phải bấm "Thêm vào câu lệnh"
    const addBtn = await waitFor(() => { const b = $(SEL.pickerAdd); return b && b.getBoundingClientRect().width && !b.disabled ? b : null; }, 2500, 150, 'add').catch(() => null);
    if (addBtn) realClick(addBtn);
    await sleep(900);
  }

  async function uploadFile(file) {
    await openPicker();
    cap.on = true; cap.input = null;
    const up = await waitFor(() => $(SEL.pickerUpload), 4000, 150, 'upload button');
    realClick(up.closest('button') || up.querySelector('button') || up);
    try { await waitFor(() => cap.input, 4000, 100, 'file input'); } finally { cap.on = false; }
    const dt = new DataTransfer(); dt.items.add(file);
    cap.input.files = dt.files;
    cap.input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => $$(SEL.pickerOption).find((o) => optName(o) === file.name), 30000, 300, 'upload ' + file.name);
    await sleep(3500); // chờ upload xong (thanh tiến trình)
    await closePicker();
  }
  const pickerShown = () => { const s = $(SEL.pickerSearch); return !!(s && s.getBoundingClientRect().width); };
  async function closePicker() {
    if (!pickerShown()) return;
    const s = $(SEL.pickerSearch);
    for (const type of ['keydown', 'keyup']) s.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
    try { await waitFor(() => !pickerShown(), 2000, 100, 'close picker'); } catch { document.body.click(); await sleep(500); }
  }

  const b64ToFile = (b64, mime, name) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], name, { type: mime || 'image/png' });
  };

  async function typeText(s) {
    if (!s) return;
    const ed = $(SEL.editor); ed.focus();
    document.execCommand('insertText', false, s);
    await sleep(120);
  }

  /** Điền prompt; mọi lần xuất hiện của tên ảnh (có hoặc không có @) được đổi thành mention chip. */
  async function fillPrompt(prompt, names) {
    const ed = $(SEL.editor); ed.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    const sorted = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = sorted.length ? new RegExp('@?(' + sorted.join('|') + ')', 'g') : null;
    let last = 0; const parts = [];
    if (re) for (const m of prompt.matchAll(re)) { parts.push({ t: prompt.slice(last, m.index) }, { ref: m[1] }); last = m.index + m[0].length; }
    parts.push({ t: prompt.slice(last) });
    for (const p of parts) {
      if (p.ref) {
        // Flow chỉ mở hộp chọn khi "@" đứng sau khoảng trắng/ký tự; ở đầu ô trống thì không
        const before = $(SEL.editor).innerText.replace(/\n+$/, '');
        if (!before || !/\s$/.test(before)) await typeText(' ');
        await typeText('@');
        await waitFor(() => { const s = $(SEL.pickerSearch); return s && s.getBoundingClientRect().width; }, 5000, 150, 'mention picker');
        await pickAsset(p.ref);
        $(SEL.editor).focus();
      } else await typeText(p.t);
    }
  }

  const videoSrc = (v) => v.currentSrc || v.src || $('source', v)?.src || '';
  // baseline = mọi video đang có trên trang (theo src) để nhận ra video MỚI sau khi bấm tạo
  // ảnh sinh ra nằm trong lưới tile; lấy theo src (asb/ hoặc flow-content/image)
  // chữ ký (?Expires=...&Signature=...) đổi liên tục nên so sánh theo URL đã bỏ query
  const keyOf = (u) => String(u).split('?')[0];
  const tileImgSrcs = () => $$('cdk-virtual-scroll-viewport img, .tiles-container img')
    .filter((i) => !i.closest('.cdk-overlay-container') && !/\b\d{1,3}%/.test(txt(i.closest('flow-image-tile, .tile, [class*=tile]') || i.parentElement || i)))
    .map((i) => i.currentSrc || i.src || '').filter((u) => /flow\.google\.com\/asb\/|flow-content\.google\/image\//.test(u));
  // video xong: thẻ <flow-video-tile> có ảnh thu nhỏ mà URL chính là URL video (không cần <video>, thẻ đang tạo thì chưa có)
  const videoSrcs = () => [...new Set([
    ...$$('flow-video-tile').filter((t) => !/\b\d{1,3}%/.test(txt(t))).map((t) => $('img.thumbnail', t)?.src || ''),
    ...$$('video').map(videoSrc),
  ].filter((u) => /flow\.google\.com\/asb\/|flow-content\.google\//.test(u)))];
  const mediaIdsOnPage = (kind) => [...new Set(kind === 'image' ? tileImgSrcs() : videoSrcs())];

  async function submit(job) {
    note('submit ' + (job.prompt || '').slice(0, 40));
    await waitFor(() => $(SEL.editor), 20000, 300, 'editor').catch(() => {}); // trang vừa tải lại: chờ ô nhập
    if (!$(SEL.editor)) throw new Error('UI_NO_EDITOR: mở tab project Flow trước');
    await clearComposer();
    await applySettings(job);
    const images = job.images || [];
    const names = [];
    for (const im of images) {
      const f = b64ToFile(im.base64, im.mime, im.name);
      await uploadFile(f);
      names.push(im.name);
      if (job.mode === 'frames') continue; // khung hình: gắn sau (xem attachFrames)
      // ảnh được nhắc trong prompt sẽ tự gắn khi chèn chip @; ảnh còn lại gắn bằng nút +
      if (!(job.prompt || '').includes(im.name)) { await openPicker(); await pickAsset(im.name); }
    }
    if (job.mode === 'frames' && images.length) await attachFrames(names);
    let promptText = job.prompt || '';
    if (job.mode === 'frames') for (const n of names) promptText = promptText.split('@' + n).join('').split(n).join(''); // ảnh đã nằm ở ô khung hình, không cần tên file trong prompt
    await fillPrompt(promptText.replace(/\n{3,}/g, '\n\n').trim(), job.mode === 'frames' ? [] : names);
    // chờ mọi tile đang tải lên/đang tạo (hiện "NN%") xong để thumbnail ổn định trước khi chụp baseline
    await waitFor(() => !$$('cdk-virtual-scroll-viewport, .tiles-container').some((v) => /\b\d{1,3}%/.test(txt(v))), 40000, 500, 'upload tiles settle').catch(() => {});
    await sleep(1500);
    const baseline = mediaIdsOnPage(job.kind);
    const btn = $(SEL.generate) || iconBtn($(SEL.composer) || document, 'arrow_forward');
    await waitFor(() => btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true', 8000, 200, 'generate enabled');
    const state = { baseline, t0: Date.now(), expect: job.count || 1, kind: job.kind === 'image' ? 'image' : 'video' };
    if (job.dryRun) return { ...state, dryRun: true, log: log.slice(-12) };
    if (job.trustedClick) {
      // Flow bỏ qua click giả lập ở chế độ ẩn: trả vị trí nút để Electron click bằng chuột thật
      btn.scrollIntoView({ block: 'center' });
      await sleep(200);
      const r = btn.getBoundingClientRect();
      return { ...state, clickAt: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, log: log.slice(-12) };
    }
    realClick(btn);
    await sleep(1500);
    return { ...state, log: log.slice(-12) };
  }

  // Khung hình đầu/cuối: bấm ô "Bắt đầu"/"Kết thúc" -> hộp chọn ảnh; chọn ảnh là hộp tự đóng và ô nhận ảnh
  async function attachFrames(names) {
    for (const [i, n] of names.slice(0, 2).entries()) {
      const slot = await waitFor(() => $$('.frame-trigger')[i], 6000, 200, 'frame slot ' + i);
      await sleep(600); // chờ hộp chọn cũ đóng hẳn, kẻo bấm trúng lúc nó đang đóng
      for (let t = 0; t < 3 && !pickerShown(); t++) {
        realClick($('button', slot) || slot);
        try { await waitFor(pickerShown, 2500, 150, 'frame picker ' + i); } catch { /* bấm lại */ }
      }
      await waitFor(pickerShown, 1000, 150, 'frame picker ' + i);
      await pickAsset(n);
      await waitFor(() => !pickerShown(), 4000, 150, 'frame picker close');
    }
  }

  // Video: ô mới nhất nằm ĐẦU lưới. Chỉ coi là xong khi đã thấy ô đang chạy (NN%) của chính lệnh này ở đầu lưới,
  // rồi các ô đầu lưới (đủ số lượng) đã có ảnh thu nhỏ và hết %. Không dựa vào "video mới bất kỳ" vì video của các lần tạo trước có thể vừa xong.
  const isRunning = (t) => /\b\d{1,3}%/.test(txt(t));
  function pollVideo(j) {
    const g = (window.__flowPollState = window.__flowPollState && window.__flowPollState.t0 === j.t0 ? window.__flowPollState : { t0: j.t0, seen: false });
    const top = $$('flow-video-tile, flow-error-tile').slice(0, j.expect || 1);
    const elapsed = Date.now() - j.t0;
    if (top.some(isRunning)) g.seen = true;
    // ô lỗi của Flow nằm TRONG <flow-video-tile> (có chữ "Không thành công"), không chỉ là thẻ <flow-error-tile> riêng
    const err = top.find((t) => t.tagName === 'FLOW-ERROR-TILE' || t.querySelector('flow-error-tile') || /Không thành công|Generation failed|unusual activity/i.test(txt(t)));
    if (err && (g.seen || elapsed > 4000)) return { state: 'failed', error: txt(err).replace(/\s+/g, ' ').slice(0, 220), videos: [] };
    if (g.seen && top.length >= (j.expect || 1) && top.every((t) => !isRunning(t) && $('img.thumbnail', t)?.src)) {
      return { state: 'done', videos: top.map((t) => { const u = $('img.thumbnail', t).src; return { id: keyOf(u), url: u }; }) };
    }
    if (!g.seen && elapsed > 120000) return { state: 'failed', error: 'Không thấy ô video mới xuất hiện trên Flow sau khi bấm tạo', videos: [] };
    return { state: 'running', videos: [], elapsed, seen: g.seen };
  }

  function poll(j) {
    if (j.kind !== 'image') return pollVideo(j);
    const videos = [];
    const srcs = j.kind === 'image' ? tileImgSrcs() : videoSrcs();
    for (const u of srcs) {
      const k = keyOf(u);
      if (u && !j.baseline.some((b) => keyOf(b) === k) && !videos.some((x) => keyOf(x.url) === k)) videos.push({ id: k, url: u });
    }
    const failed = $$('[class*=error],[class*=fail]').map(txt).find((t) => /không thể|thất bại|failed|couldn.t|vi phạm|policy/i.test(t));
    if (videos.length >= j.expect) return { state: 'done', videos };
    if (failed && Date.now() - j.t0 > 8000) return { state: 'failed', error: failed.slice(0, 200), videos };
    return { state: 'running', videos, elapsed: Date.now() - j.t0 };
  }

  window.__flowUi = { version: 1, submit, poll, log, mediaIdsOnPage, SEL };
})();
