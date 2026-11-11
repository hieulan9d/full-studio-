// Giao diện: xem trước, timeline, sửa cảnh, khung chat với Claude. Không cần build.
const $ = (s) => document.querySelector(s);
const SIZE_COLOR = { T: 'var(--T)', Tr: 'var(--Tr)', C: 'var(--C)', SP: 'var(--SP)', L: 'var(--L)' };
let P = null, t = 0, playing = false, zoom = 14, sel = null, lastRev = 0, busy = false, dragging = false;
const vids = [$('#vA'), $('#vB')], slot = [{ idx: -1 }, { idx: -1 }], voice = $('#voice');
let active = 0, lastTick = 0, voiceOK = false;

const api = (u, o) => fetch(u, o).then((r) => (r.ok ? r.json() : Promise.reject(r)));
const post = (u, b) => api(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) });
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

// ---------- tải dự án ----------
async function load(keepSel = true) {
  P = await api('/api/project'); lastRev = P.rev; zoom = +$('#zoom').value;
  $('#pname').textContent = P.name + ' · ' + P.duration.toFixed(0) + 's · ' + P.clips.length + ' cảnh';
  $('#proxyinfo').textContent = P.proxies.ok < P.proxies.total ? `đang tạo bản xem trước ${P.proxies.ok}/${P.proxies.total}…` : '';
  $('#errs').textContent = P.errors.length ? '⚠ ' + P.errors.length + ' lỗi luật (xem chat)' : '✓ đạt luật';
  $('#errs').style.color = P.errors.length ? 'var(--red)' : '#4ade80'; $('#errs').title = P.errors.join('\n');
  voiceOK = P.voiceover.length > 0; const vurl = '/api/file?rel=voice/voice_all.wav&v=' + P.rev;
  if (voiceOK && !voice.src.endsWith(vurl)) voice.src = vurl;
  if (!keepSel || (sel !== null && !P.clips.some((c) => c.idx === sel))) sel = null;
  drawTimeline(); drawInspector(); seek(Math.min(t, P.duration), true);
}

function clipAt(x) { return P.clips.find((c) => x >= c.start && x < c.start + c.tdur) || null; }

// ---------- timeline ----------
function drawTimeline() {
  const w = Math.max(P.duration * zoom + 80, 400); $('#tlin').style.width = w + 64 + 'px';
  const rl = $('#ruler'); rl.innerHTML = ''; const step = zoom >= 24 ? 2 : zoom >= 12 ? 5 : 10;
  for (let s = 0; s <= P.duration; s += step) rl.insertAdjacentHTML('beforeend', `<div class="tick" style="left:${s * zoom}px">${fmt(s).replace('.0', '')}</div>`);
  const lv = $('#lane-v'); lv.innerHTML = ''; lv.style.width = w + 'px';
  P.clips.forEach((c) => {
    const bad = c.shake !== null && c.shake > 0.5;
    const d = document.createElement('div'); d.className = 'clip' + (sel === c.idx ? ' sel' : '') + (bad ? ' bad' : ''); d.dataset.idx = c.idx;
    d.style.cssText = `left:${c.start * zoom}px;width:${Math.max(c.tdur * zoom - 2, 6)}px;background:${SIZE_COLOR[c.size] || '#475569'}`;
    d.innerHTML = `<span class="sz">${c.size || ''}</span><span>${c.label || ''}</span><span class="nm">${c.name} · ${c.in.toFixed(1)}s${c.shake !== null ? ' · rung ' + c.shake : ''}</span>`;
    d.title = `${c.name}\nnguồn ${c.in.toFixed(1)}–${(c.in + c.dur).toFixed(1)}s, tốc độ ${c.speed || 1}\n${c.shake !== null ? 'rung ' + c.shake : ''}`;
    d.onmousedown = (e) => clipDown(e, c, d); lv.appendChild(d);
  });
  const lt = $('#lane-t'); lt.innerHTML = ''; lt.style.width = w + 'px';
  P.events.forEach((e) => { const d = document.createElement('div'); d.className = 'tev ' + e.style; d.style.cssText = `left:${e.start * zoom}px;width:${Math.max((e.end - e.start) * zoom - 1, 3)}px`; d.textContent = e.text; d.title = e.text; lt.appendChild(d); });
  const la = $('#lane-a'); la.innerHTML = ''; la.style.width = w + 'px';
  P.voiceover.forEach((o) => { const d = document.createElement('div'); d.className = 'vo'; d.style.cssText = `left:${o.start * zoom}px;width:${o.dur * zoom}px`; d.textContent = '🎙 ' + o.section + (o.speedup > 1.01 ? ` (x${o.speedup})` : ''); la.appendChild(d); });
  moveHead();
}
function moveHead() { $('#head').style.left = t * zoom + 'px'; $('#head').style.height = $('#tlin').scrollHeight + 'px'; }

function clipDown(e, c, el) {
  if (e.button !== 0) return; const x0 = e.clientX; let moved = false; sel = c.idx; seek(c.start, true);
  document.querySelectorAll('.clip').forEach((n) => n.classList.toggle('sel', +n.dataset.idx === c.idx)); drawInspector();
  const mv = (ev) => { if (Math.abs(ev.clientX - x0) > 5) { moved = true; dragging = true; el.classList.add('drag'); el.style.transform = `translateX(${ev.clientX - x0}px)`; } };
  const up = async (ev) => {
    document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); dragging = false; el.classList.remove('drag'); el.style.transform = '';
    if (!moved) return;
    const dropT = c.start + (ev.clientX - x0) / zoom + c.tdur / 2; let to = P.clips.filter((o) => o.idx !== c.idx && o.start + o.tdur / 2 < dropT).length;
    const order = P.clips.map((o) => o.idx).filter((i) => i !== c.idx); order.splice(to, 0, c.idx);
    const raw = P.raw_clips, slots = raw.map((r, i) => i).filter((i) => !('gap' in raw[i])), nr = raw.slice();
    order.forEach((i, k) => (nr[slots[k]] = raw[i])); await save(nr);
  };
  document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
}

async function save(rawClips) { P = await post('/api/project', { clips: rawClips }); lastRev = P.rev; drawTimeline(); drawInspector(); seek(t, true); }

$('#ruler').onmousedown = (e) => { const r = $('#ruler').getBoundingClientRect(); seek(Math.max(0, (e.clientX - r.left) / zoom)); };
$('#lane-v').onmousedown = (e) => { if (e.target.id === 'lane-v') { const r = $('#lane-v').getBoundingClientRect(); seek((e.clientX - r.left) / zoom); } };
$('#zoom').oninput = () => { zoom = +$('#zoom').value; drawTimeline(); };

// ---------- khung sửa cảnh ----------
function drawInspector() {
  const el = $('#insp'), c = P && P.clips.find((x) => x.idx === sel);
  if (!c) { el.className = 'muted'; el.innerHTML = 'Chọn một cảnh trên timeline để sửa. Kéo cảnh để đổi thứ tự.'; el.id = 'insp'; return; }
  const raw = P.raw_clips[c.idx];
  el.className = ''; el.innerHTML = `<b>${c.name}</b>
   <label>từ giây <input id="i-in" type="number" step="0.1" value="${raw.in}"></label>
   <label>dài <input id="i-dur" type="number" step="0.1" value="${raw.dur}"></label>
   <label>tốc độ <input id="i-sp" type="number" step="0.05" value="${raw.speed || 1}"></label>
   <label>cỡ <select id="i-sz">${['T', 'Tr', 'C', 'SP', 'L'].map((s) => `<option ${raw.size === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
   <button id="i-split">Cắt tại đầu phát</button><button id="i-del" class="danger">Xóa cảnh</button>`;
  const upd = async () => { const r = { ...raw, in: +$('#i-in').value, dur: +$('#i-dur').value, size: $('#i-sz').value }; const sp = +$('#i-sp').value; if (sp && sp !== 1) r.speed = sp; else delete r.speed; const a = [...P.raw_clips]; a[c.idx] = r; await save(a); };
  ['#i-in', '#i-dur', '#i-sp', '#i-sz'].forEach((s) => ($(s).onchange = upd));
  $('#i-del').onclick = async () => { const a = P.raw_clips.filter((_, i) => i !== c.idx); sel = null; await save(a); };
  $('#i-split').onclick = async () => {
    const off = (t - c.start) * (raw.speed || 1); if (off < 0.2 || off > raw.dur - 0.2) return;
    const a = [...P.raw_clips]; a.splice(c.idx, 1, { ...raw, dur: +off.toFixed(3) }, { ...raw, in: +(raw.in + off).toFixed(3), dur: +(raw.dur - off).toFixed(3) }); await save(a);
  };
}

// ---------- xem trước ----------
function setSlot(i, c) {
  const v = vids[i]; slot[i] = { idx: c.idx, ready: false }; v.muted = true; v.src = '/api/proxy?src=' + encodeURIComponent(c.src);
  v.onloadedmetadata = () => { slot[i].ready = true; v.currentTime = c.in; };
}
function showClip(c, x) {
  const gap = $('#gap'); if (!c) { gap.style.display = 'block'; vids.forEach((v) => v.classList.remove('on')); vids.forEach((v) => v.pause()); return; }
  gap.style.display = 'none';
  let i = slot.findIndex((s) => s.idx === c.idx && s.src === c.src);
  if (i < 0) i = slot.findIndex((s) => s.idx === c.idx);
  if (i < 0 || slot[i].cl !== c) { i = 1 - active; setSlot(i, c); slot[i].cl = c; }
  const v = vids[i], want = c.in + (x - c.start) * (c.speed || 1);
  if (slot[i].ready) {
    if (Math.abs(v.currentTime - want) > 0.3 || !playing) v.currentTime = want;
    v.playbackRate = c.speed || 1; if (playing && v.paused) v.play().catch(() => {}); if (!playing && !v.paused) v.pause();
    vids.forEach((o, k) => o.classList.toggle('on', k === i)); active = i;
  }
  const n = P.clips[P.clips.indexOf(c) + 1];  // nạp trước cảnh kế tiếp
  if (n && playing && n.start - x < 1.5) { const j = 1 - i; if (!slot[j].cl || slot[j].cl.idx !== n.idx) { setSlot(j, n); slot[j].cl = n; } }
}
function overlay(x) {
  const ov = $('#ov'); const evs = P.events.filter((e) => x >= e.start && x <= e.end); const key = evs.map((e) => e.start + e.text).join('|');
  if (ov.dataset.k === key) return; ov.dataset.k = key; ov.innerHTML = '';
  evs.forEach((e) => { const d = document.createElement('div'); d.className = 'ev ' + e.style; d.textContent = e.text; if (e.pos) { d.style.left = e.pos[0] / 19.2 + '%'; d.style.top = e.pos[1] / 10.8 + '%'; } ov.appendChild(d); });
}
function seek(x, soft) {
  t = Math.max(0, Math.min(x, P ? P.duration : 0)); if (!P) return;
  if (voiceOK && !soft) voice.currentTime = t; else if (voiceOK && Math.abs(voice.currentTime - t) > 0.4) voice.currentTime = t;
  showClip(clipAt(t), t); overlay(t); $('#tc').textContent = fmt(t) + ' / ' + fmt(P.duration); moveHead();
  const sc = $('#tlscroll'), px = t * zoom + 64; if (px < sc.scrollLeft + 80 || px > sc.scrollLeft + sc.clientWidth - 80) { if (playing) sc.scrollLeft = px - 120; }
}
function loop(ts) {
  if (playing && P) {
    const dt = (ts - lastTick) / 1000; let nt = voiceOK && !voice.paused && voice.currentTime > 0 ? voice.currentTime : t + dt;
    if (nt >= P.duration) { playing = false; $('#play').textContent = '▶'; voice.pause(); vids.forEach((v) => v.pause()); nt = P.duration; }
    seek(nt, true);
  }
  lastTick = ts;
}
function toggle() {
  if (!P) return; playing = !playing; $('#play').textContent = playing ? '❚❚' : '▶';
  if (playing) { if (t >= P.duration - 0.1) seek(0); if (voiceOK) { voice.currentTime = t; voice.play().catch(() => {}); } }
  else { voice.pause(); vids.forEach((v) => v.pause()); }
}
$('#play').onclick = toggle;
document.addEventListener('keydown', (e) => {
  if (['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 5 : 1)); if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 5 : 1));
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.key === 'Delete' && sel !== null) $('#i-del') && $('#i-del').click();
});

// ---------- việc nền: dựng, xuất ----------
async function undo() { const r = await post('/api/undo'); if (r.ok) await load(); }
$('#undo').onclick = undo;
async function startJob(url, body) { const r = await post(url, body); pollJobs(); return r; }
$('#rh').onclick = () => startJob('/api/render', { vertical: false, sub_mode: 'word' });
$('#rv').onclick = () => startJob('/api/render', { vertical: true, sub_mode: 'word' });
$('#cc').onclick = () => startJob('/api/capcut', { audio: 'none' });
let jobTimer = null;
async function pollJobs() {
  clearTimeout(jobTimer); const js = await api('/api/jobs'); const box = $('#jobs'); box.innerHTML = '';
  js.filter((j) => j.status === 'đang chạy' || Date.now() - +j.id < 90000).forEach((j) => {
    const link = j.status === 'xong' && j.out ? ` · <a target="_blank" href="/api/file?rel=${encodeURIComponent('out/' + j.out.split(/[\\/]/).pop())}">Mở</a>` : '';
    box.insertAdjacentHTML('beforeend', `<div class="job"><b>${j.title}</b><br>${j.status === 'đang chạy' ? '⏳ đang chạy…' : j.status === 'xong' ? '✓ xong' + link : '✗ lỗi<br><small>' + j.log.slice(-200) + '</small>'}</div>`);
  });
  if (js.some((j) => j.status === 'đang chạy')) jobTimer = setTimeout(pollJobs, 2000); else jobTimer = setTimeout(() => (box.innerHTML = ''), 60000);
}

// ---------- chat ----------
function addMsg(role, text) { const d = document.createElement('div'); d.className = 'm ' + role; d.textContent = text; $('#msgs').appendChild(d); $('#msgs').scrollTop = 1e9; return d; }
async function loadChat() {
  const h = await api('/api/chat'); $('#msgs').innerHTML = '';
  if (!h.messages.length) addMsg('sys', 'Nói với mình điều bạn muốn làm với video, mình sẽ sửa timeline và chạy các công cụ giúp bạn.');
  h.messages.forEach((m) => addMsg(m.role, m.text));
}
async function send(text) {
  if (!text.trim() || busy) return; busy = true; $('#send').disabled = true; $('#stop').hidden = false; addMsg('user', text); $('#inp').value = '';
  const think = addMsg('sys', 'Claude đang làm việc…');
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!r.ok) { think.textContent = (await r.json()).detail || 'Lỗi'; return; }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let k;
      while ((k = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, k); buf = buf.slice(k + 2); if (!line.startsWith('data: ')) continue; const e = JSON.parse(line.slice(6));
        if (e.type === 'text') { think.remove(); addMsg('assistant', e.text); $('#msgs').appendChild(think); }
        else if (e.type === 'tool') { const d = addMsg('tool', '⚙ ' + e.name + ': ' + e.summary); $('#msgs').appendChild(think); }
        else if (e.type === 'refresh') load();
        else if (e.type === 'error') addMsg('sys', 'Lỗi: ' + e.error);
      }
    }
  } catch (err) { addMsg('sys', 'Mất kết nối: ' + err); }
  finally { think.remove(); busy = false; $('#send').disabled = false; $('#stop').hidden = true; await load(); }
}
$('#form').onsubmit = (e) => { e.preventDefault(); send($('#inp').value); };
$('#inp').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('#inp').value); } };
$('#stop').onclick = () => post('/api/chat/stop');
$('#clear').onclick = async () => { await post('/api/chat/clear'); loadChat(); };
document.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { $('#inp').value = b.textContent; $('#inp').focus(); }));

// ---------- khởi động ----------
(async () => {
  const pr = await api('/api/projects'); $('#proj').innerHTML = pr.list.map((n) => `<option ${n === pr.active ? 'selected' : ''}>${n}</option>`).join('');
  $('#proj').onchange = async () => { await post('/api/open', { name: $('#proj').value }); await load(false); loadChat(); };
  await load(false); loadChat(); setInterval(() => loop(performance.now()), 40);
  setInterval(async () => { if (dragging) return; try { const r = await api('/api/rev'); if (r.rev !== lastRev || (P.proxies.ok < P.proxies.total && r.proxies >= 0)) await load(); } catch (e) {} }, 1500);
})();
