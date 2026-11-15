// build-v1-verified.jsx — bản ĐÃ RENDER THẬT ra result/foodtage_v1.mp4 (trước khi tách thư viện th-lib).
// Chỉ để đối chiếu. Dùng build.jsx (chạy bằng lib/th-lib.jsx) cho việc mới.
// Cần $.global.H (lib/saas-lib.jsx) và $.global.FT_CFG = {out: <thư mục có media/>, assets: <thư mục assets>}.
(function () {
  var H = $.global.H, C = $.global.FT_CFG;
  var T = {}; $.global.T = T;
  T.W = 1080; T.HT = 1920; T.DUR = 22.2; H.FPS = 30; H.HUE = 0;
  var F = 1 / 30;
  T.F = { impact: 'TRImpact', cap: 'PensumDisplay-BookItalic', script: 'SVN-RosellindaAlyamore',
          wide: 'TacticSansExd-BlkIt', wideUp: 'TacticSansExd-Blk', serif: 'Athelas-BoldItalic' };
  T.COL = { blue: '#2a5cff', blueHi: '#8fb4ff', lavTop: '#7563ff', lavBot: '#dcd3ff', teal: '#5cf7e0',
            purple: '#c24dff', red: '#ff4b2b', green: '#5bff6e', card: '#101318' };

  // ---------- tiện ích ----------
  T.imp = function (path, folder) {
    var f = new File(path); if (!f.exists) throw new Error('missing ' + path);
    var it = H.find(f.displayName); if (it && !(it instanceof CompItem)) return it;
    it = app.project.importFile(new ImportOptions(f)); if (folder) it.parentFolder = H.folder(folder);
    return it;
  };
  T.main = function () { return H.find('MAIN'); };
  T.span = function (l, t0, t1) { l.inPoint = Math.max(0, t0); l.outPoint = t1; return l; };
  T.txt = function (comp, o) {
    var l = H.text(comp, { text: o.text, size: o.size, font: o.font, color: o.color || '#ffffff', pos: o.pos, just: o.just || 'c', track: o.track, name: o.name });
    var sp = l.property('ADBE Text Properties').property('ADBE Text Document'), d = sp.value;
    if (o.lead) { d.autoLeading = false; d.leading = o.lead; }
    if (o.stroke) { d.applyStroke = true; d.strokeColor = H.rgb(o.stroke); d.strokeWidth = o.sw || 4; d.strokeOverFill = !!o.strokeOver; }
    if (o.noFill) d.applyFill = false;
    sp.setValue(d); H.anchorText(l, o.just || 'c');
    return l;
  };
  // Gradient dọc trong chữ: Ramp rồi Set Matte lấy alpha của chính layer
  T.grad = function (l, top, bot) {
    var r = l.sourceRectAtTime(l.inPoint > 0 ? l.inPoint : 0, false);
    H.fx(l, 'ADBE Ramp', { 'ADBE Ramp-0001': [r.left + r.width / 2, r.top], 'ADBE Ramp-0002': H.rgb(top),
                           'ADBE Ramp-0003': [r.left + r.width / 2, r.top + r.height], 'ADBE Ramp-0004': H.rgb(bot) });
    var sm = H.fx(l, 'ADBE Set Matte3', {});
    sm.property('ADBE Set Matte3-0001').setValue(l.index);
    sm.property('ADBE Set Matte3-0002').setValue(4);
    return l;
  };
  // Glow giữ màu: 2 lớp Drop Shadow cùng màu, khoảng cách 0 (Glow của AE cộng màu → trắng xoá).
  // col mặc định = màu chữ (text layer) hoặc trắng. thr bỏ qua (giữ chữ ký cũ).
  T.glow = function (l, thr, rad, inten, col) {
    var rgb = col ? H.rgb(col) : null;
    if (!rgb) { try { var d = l.property('ADBE Text Properties').property('ADBE Text Document').value; rgb = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) { rgb = [1, 1, 1]; } }
    var a = Math.min(255, inten * 200), b = Math.min(255, inten * 120);
    H.fx(l, 'ADBE Drop Shadow', { 'ADBE Drop Shadow-0001': rgb, 'ADBE Drop Shadow-0002': a, 'ADBE Drop Shadow-0004': 0, 'ADBE Drop Shadow-0005': rad });
    return H.fx(l, 'ADBE Drop Shadow', { 'ADBE Drop Shadow-0001': rgb, 'ADBE Drop Shadow-0002': b, 'ADBE Drop Shadow-0004': 0, 'ADBE Drop Shadow-0005': rad * 3 });
  };
  T.shadow = function (l, op, dist, soft) { return H.fx(l, 'ADBE Drop Shadow', { 'ADBE Drop Shadow-0002': op * 2.55, 'ADBE Drop Shadow-0004': dist, 'ADBE Drop Shadow-0005': soft }); };
  // Vào: scale bật + opacity; ra: tắt nhanh
  T.punchIn = function (l, t, from, dur) {
    from = from || 160; dur = dur || 6 * F;
    H.anim(H.scl(l), [t, t + dur], [[from, from], [100, 100]], 'snap');
    H.anim(H.opa(l), [t, t + 2 * F], [0, 100], 'linear');
    return l;
  };
  T.popIn = function (l, t, dur) { H.pop(H.scl(l), t, [0, 0], [100, 100], dur || 0.3, 0.12); H.anim(H.opa(l), [t, t + 2 * F], [0, 100], 'linear'); return l; };
  T.cut = function (l, t, dur) { dur = dur || 3 * F; var o = H.opa(l); o.setValueAtTime(t - dur, 100); o.setValueAtTime(t, 0); l.outPoint = t; return l; };
  T.drift = function (l, t0, t1, amt) { var p = H.scl(l); var v = p.valueAtTime(t0 + 0.3, false); return l; };
  // Stroke Up (preset DaVinci): chữ đi lên vào chỗ trong 10 khung; bản viền nở 100→250 % (khung 10–20), mờ (16–20)
  T.strokeUp = function (comp, l, t, col) {
    var p = H.pos(l).value;
    H.anim(H.pos(l), [t, t + 10 * F], [[p[0], p[1] + 70], p], 'snap');
    H.anim(H.opa(l), [t, t + 3 * F], [0, 100], 'linear');
    var d = l.duplicate(); d.name = l.name + '_StrokeUp'; d.moveBefore(l);
    while (d.property('ADBE Effect Parade').numProperties) d.property('ADBE Effect Parade').property(1).remove();
    var sp = d.property('ADBE Text Properties').property('ADBE Text Document'), td = sp.value;
    td.applyFill = false; td.applyStroke = true; td.strokeColor = H.rgb(col || '#ffffff'); td.strokeWidth = 4; sp.setValue(td);
    H.clearKeys(H.pos(d)); H.pos(d).setValue(p); H.clearKeys(H.opa(d)); H.clearKeys(H.scl(d));
    H.anim(H.scl(d), [t + 6 * F, t + 14 * F], [[100, 100], [250, 250]], 'accel');
    H.anim(H.opa(d), [t + 5 * F, t + 6 * F, t + 10 * F, t + 14 * F], [0, 100, 100, 0], 'linear');
    T.glow(d, 20, 18, 1.0);
    d.inPoint = t; d.outPoint = t + 15 * F;
    return d;
  };

  // ---------- giai đoạn 1: nền ----------
  T.base = function () {
    H.setupFolders();
    var a = T.imp(C.out + '/media/aroll.mp4', '06_ASSETS'), m = T.imp(C.out + '/media/aroll_matte.mp4', '06_ASSETS');
    var g = H.find('AROLL_G'); if (g) H.clearComp(g); else g = H.comp('AROLL_G', T.DUR, '01_ENV', T.W, T.HT);
    var al = g.layers.add(a); al.name = 'ARoll';
    // grade: clip gốc phẳng → tương phản, đậm màu, đen sâu
    H.fx(al, 'ADBE Easy Levels2', { 'ADBE Easy Levels2-0003': 24 / 255, 'ADBE Easy Levels2-0004': 228 / 255, 'ADBE Easy Levels2-0005': 0.92 });
    H.fx(al, 'ADBE Vibrance', { 'ADBE Vibrance-0001': 45, 'ADBE Vibrance-0002': 25 });
    H.fx(al, 'ADBE Brightness & Contrast 2', { 'ADBE Brightness & Contrast 2-0001': -8, 'ADBE Brightness & Contrast 2-0002': 32 });
    H.fx(al, 'CC Vignette', { 'CS Vignette-0001': 35 });

    var c = H.comp('MAIN', T.DUR, '00_MAIN', T.W, T.HT); // xoá hẳn comp cũ: clearComp lỗi chia 0 khi gỡ null CAM có key HOLD
    c.bgColor = [0, 0, 0];
    var plate = H.place(c, g, 'BG_Plate', 0, 8);
    var matte = c.layers.add(m); matte.name = 'MATTE_Person'; matte.audioEnabled = false;
    var person = H.place(c, g, 'FG_Person', 0, 8); person.audioEnabled = false;
    person.moveBefore(matte); // matte phải nằm ngay dưới? setTrackMatte không cần, nhưng giữ gọn
    person.setTrackMatte(matte, TrackMatteType.LUMA);
    // camera: punch-in giữ mặt (tâm ~ 540,700). Key HOLD = cảm giác cắt nhảy.
    var cam = H.null(c, 'CAM', [540, 700]); cam.moveToEnd();
    H.anc(cam).setValue([540, 700]);
    // null có kích thước 100×100; anchor thật sự cần là [50,50] – dùng attach để giữ vị trí con
    H.anc(cam).setValue([50, 50]);
    H.attachAll([plate, matte, person], cam, 0);
    var zs = [[0, 100], [2.58, 120], [4.9, 110], [7.12, 114], [9.22, 122], [11.72, 112], [15.08, 122], [17.66, 112]];
    var sp = H.scl(cam);
    for (var i = 0; i < zs.length; i++) sp.setValueAtTime(zs[i][0], [zs[i][1], zs[i][1]]);
    for (var k = 1; k <= sp.numKeys; k++) sp.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
    // mỗi lần punch có 4 khung trượt nhẹ (đỡ giật)
    return H.describe(c);
  };

  // ---------- giai đoạn 2: chữ SAU lưng người (giữa BG_Plate và MATTE) ----------
  // Từ khoá lớn TR Impact gradient tím, "Number"/"and Last" xanh + số neon.
  T.keyword = function (c, name, lines, t0, t1, y, size) {
    var l = T.txt(c, { text: lines.join('\r'), size: size, font: T.F.impact, pos: [540, y], lead: size * 0.98, name: name });
    T.grad(l, T.COL.lavTop, T.COL.lavBot);
    H.sweep(l, t0, t1, -400, 1400, 0);
    T.shadow(l, 40, 6, 20);
    T.span(l, t0, t1); T.punchIn(l, t0, 135, 5 * F); T.cut(l, t1);
    return l;
  };
  T.number = function (c, label, digit, t0, t1) {
    var a = T.txt(c, { text: label, size: 190, font: T.F.impact, color: '#1f4fff', pos: [70, 205], just: 'l', name: 'TXT_' + label });
    T.glow(a, 92, 20, 0.9, '#2a5cff');
    T.span(a, t0, t1); T.punchIn(a, t0, 140, 5 * F); T.cut(a, t1);
    // số: serif nghiêng to, tím ánh kim + viền xanh ngọc phát sáng
    var d = T.txt(c, { text: digit, size: 1050, font: T.F.cap, color: '#9a82ff', pos: [850, 430], stroke: '#8ff8ff', sw: 12, strokeOver: true, name: 'NUM_' + digit });
    T.glow(d, 92, 30, 0.9, '#5ff4ff');
    T.span(d, t0 + 2 * F, t1);
    H.anim(H.scl(d), [t0 + 2 * F, t0 + 10 * F, t1], [[150, 150], [100, 100], [94, 94]], 'snap');
    H.anim(H.rot(d), [t0 + 2 * F, t0 + 10 * F], [-14, 0], 'snap');
    H.anim(H.opa(d), [t0 + 2 * F, t0 + 4 * F], [0, 100], 'linear');
    T.cut(d, t1);
    // tia sét: vài nét path trắng-xanh nháy quanh số
    var bolt = H.path(c, 'NUM_' + digit + '_Bolt', [[820, 40], [870, 200], [840, 230], [905, 420], [880, 440], [940, 620]], { stroke: '#d8fbff', sw: 5 });
    T.glow(bolt, 30, 16, 1.2, '#7ff0ff'); T.span(bolt, t0 + 3 * F, t0 + 16 * F);
    H.anim(H.opa(bolt), [t0 + 3 * F, t0 + 5 * F, t0 + 8 * F, t0 + 10 * F, t0 + 16 * F], [0, 100, 30, 100, 0], 'linear');
    return [a, d, bolt];
  };
  T.behind = function () {
    var c = T.main(), plate = c.layer('BG_Plate');
    var made = [];
    function keep(arr) { for (var i = 0; i < arr.length; i++) { arr[i].moveBefore(plate); made.push(arr[i].name); } }
    keep(T.number(c, 'Number', '1', 2.58, 3.75));
    keep(T.number(c, 'Number', '2', 9.22, 10.4));
    keep(T.number(c, 'and Last', '3', 15.08, 16.25));
    keep([T.keyword(c, 'KW_Faster', ['FASTER'], 5.64, 6.74, 215, 270)]);
    keep([T.keyword(c, 'KW_Efficient', ['Efficient'], 6.74, 8.6, 215, 230)]);
    keep([T.keyword(c, 'KW_SoundDesign', ['Sound', 'Design'], 10.88, 12.0, 330, 300)]);
    keep([T.keyword(c, 'KW_TellingStory', ['Telling', 'Story'], 16.68, 17.95, 330, 290)]);
    return made;
  };

  // ---------- giai đoạn 3: lớp TRƯỚC người (icon tile, hook, logo, vòng nổ) ----------
  // Ramp trong vùng alpha của layer (shape/text). shape: 1 linear, 2 radial
  T.rampIn = function (l, p1, c1, p2, c2, shape) {
    H.fx(l, 'ADBE Ramp', { 'ADBE Ramp-0001': p1, 'ADBE Ramp-0002': H.rgb(c1), 'ADBE Ramp-0003': p2, 'ADBE Ramp-0004': H.rgb(c2), 'ADBE Ramp-0005': shape || 1 });
    var sm = H.fx(l, 'ADBE Set Matte3', {}); sm.property('ADBE Set Matte3-0001').setValue(l.index); sm.property('ADBE Set Matte3-0002').setValue(4);
    return l;
  };
  // Icon tile theo preset "icon effect": thẻ bo 22 %, nền #101318, ánh tím góc dưới phải,
  // viền tím + vệt sáng 20 % chạy vòng (6 s/vòng), icon nét neon xanh ngọc → tím.
  T.tile = function (key, file) {
    var name = 'TILE_' + key, S = 420, cs = 380;
    var c = H.find(name); if (c) H.clearComp(c); else c = H.comp(name, 10, '03_UI', S, S);
    var card = H.shape(c, { name: 'Card', w: cs, h: cs, r: cs * 0.22, fill: T.COL.card, pos: [S / 2, S / 2] });
    T.rampIn(card, [S * 0.95, S * 0.95], '#7a1cff', [S * 0.5, S * 0.45], T.COL.card, 2);
    var edge = H.shape(c, { name: 'Edge', w: cs, h: cs, r: cs * 0.22, stroke: '#9b3cff', sw: 5, pos: [S / 2, S / 2] });
    var sweep = H.shape(c, { name: 'EdgeSweep', w: cs, h: cs, r: cs * 0.22, stroke: '#e9d6ff', sw: 7, pos: [S / 2, S / 2] });
    var tr = H.vec(sweep).addProperty('ADBE Vector Filter - Trim');
    tr.property('ADBE Vector Trim Start').setValue(0); tr.property('ADBE Vector Trim End').setValue(20);
    H.anim(tr.property('ADBE Vector Trim Offset'), [0, 6], [0, 360], 'linear');
    tr.property('ADBE Vector Trim Offset').expression = 'loopOut()';
    T.glow(sweep, 30, 14, 1.2, '#c99bff');
    var ic = c.layers.add(T.imp(file, '06_ASSETS')); ic.name = 'Icon'; ic.audioEnabled = false;
    var k = 300 / 512 * 100; H.scl(ic).setValue([k, k]); H.pos(ic).setValue([S / 2, S / 2]);
    T.edges(ic);
    H.fx(ic, 'ADBE Tint', { 'ADBE Tint-0001': [0, 0, 0], 'ADBE Tint-0002': H.rgb('#55f2ff') });
    ic.blendingMode = BlendingMode.SCREEN;
    ic.timeRemapEnabled = true; ic.property('ADBE Time Remapping').expression = 'loopOut()'; ic.outPoint = 10;
    T.glow(ic, 20, 10, 1.2, '#3fd8ff'); T.glow(ic, 20, 22, 0.8, '#a040ff');
    return c;
  };
  // Icon minh hoạ tô đặc → nét sáng trên nền đen (như edge detect của preset DaVinci)
  T.edges = function (l) {
    H.fx(l, 'ADBE Find Edges', { 'ADBE Find Edges-0001': 1 });
    H.fx(l, 'ADBE Easy Levels2', { 'ADBE Easy Levels2-0003': 25 / 255, 'ADBE Easy Levels2-0004': 90 / 255 });
    H.fx(l, 'ADBE Minimax', { 'ADBE Minimax-0001': 2, 'ADBE Minimax-0002': 2 });
    H.fx(l, 'ADBE Tint', {});
    return l;
  };
  T.placeTile = function (c, comp, t0, t1, pos, sc) {
    var l = H.place(c, comp, comp.name + '@' + t0.toFixed(1), t0, 11); l.motionBlur = true;
    sc = sc || 100; T.span(l, t0, t1);
    H.anim(H.pos(l), [t0, t0 + 15 * F], [[pos[0], pos[1] + 260], pos], 'snap');
    H.anim(H.scl(l), [t0, t0 + 10 * F], [[sc * 0.6, sc * 0.6], [sc, sc]], 'snap');
    H.anim(H.opa(l), [t0, t0 + 3 * F], [0, 100], 'linear');
    T.cut(l, t1);
    return l;
  };
  T.burst = function (c, x, y, t, d) {
    var l = H.c(c, 'POP_' + t.toFixed(2), x, y, d || 70, null, null, '#ffffff', 6);
    T.span(l, t, t + 0.4);
    H.anim(H.scl(l), [t, t + 0.4], [[60, 60], [190, 190]], 'snap');
    H.anim(H.opa(l), [t, t + 0.15, t + 0.4], [100, 100, 0], 'linear');
    return l;
  };
  T.logos = function () {
    var c = H.find('LOGOS'); if (c) H.clearComp(c); else c = H.comp('LOGOS', 3, '03_UI', 1040, 380);
    var bar = H.shape(c, { name: 'Bar', w: 940, h: 300, r: 60, fill: '#ffffff', fillOp: 16, pos: [520, 190] });
    var files = ['Premiere-Pro-logo-Adobe-symbol-professional-video-editing-transparent-png-image.png', 'CapCut-Logo-Video-Editing-App-Icon.png',
                 'davinci vuông.png', 'Adobe-After-Effects-Logo-84.png', 'icons8-final-cut-pro-x-480.png'];
    var row = H.null(c, 'Row', [520, 190]); H.anc(row).setValue([50, 50]);
    for (var i = 0; i < files.length; i++) {
      var it = T.imp(C.assets + '/icon&logo/' + files[i], '06_ASSETS');
      var l = c.layers.add(it); l.name = 'Logo_' + i;
      var big = (i === 2), tgt = big ? 270 : 215, s = tgt / Math.max(it.width, it.height) * 100;
      H.scl(l).setValue([s, s]); H.pos(l).setValue([520 + (i - 2) * 185, 190]); if (big) l.moveToBeginning();
      if (big) T.shadow(l, 70, 0, 30);
      H.attach(l, row, 0);
    }
    H.anim(H.pos(row), [0, 0.3, 2.0], [[820, 190], [520, 190], [490, 190]], 'snap');
    return c;
  };
  T.front = function () {
    var c = T.main();
    // hook: Here's / 3 / Ways
    var a = T.txt(c, { text: "Here's", size: 150, font: T.F.wideUp, color: '#2d6bff', pos: [545, 980], name: 'HOOK_Heres' });
    T.grad(a, '#4b86ff', '#1238ff'); T.glow(a, 70, 20, 0.7); T.span(a, 0.1, 2.45); T.punchIn(a, 0.1, 150); T.cut(a, 2.45);
    var b = T.txt(c, { text: '3', size: 360, font: T.F.wideUp, color: T.COL.red, pos: [280, 1215], name: 'HOOK_3' });
    T.grad(b, '#ff7a2b', '#ff2b2b'); T.glow(b, 70, 25, 0.8); T.span(b, 0.34, 2.45); T.punchIn(b, 0.34, 170); T.cut(b, 2.45);
    var w = T.txt(c, { text: 'Ways', size: 300, font: T.F.script, color: T.COL.green, pos: [640, 1335], color: '#2dff4f', stroke: '#d6ffd6', sw: 3, strokeOver: true, name: 'HOOK_Ways' });
    T.glow(w, 50, 35, 1.4); T.span(w, 0.56, 2.45); T.punchIn(w, 0.56, 140); T.cut(w, 2.45);
    // tiles
    var assets = C.assets + '/icon&logo/';
    var tk = T.tile('Keyboard', assets + 'keyboard-and-mouse (1).mp4');
    var ta = T.tile('Audio', assets + 'audio-editing.mp4');
    var ts = T.tile('Story', assets + 'storytelling.mp4');
    H.rot(T.placeTile(c, tk, 1.0, 2.45, [200, 310], 72)).setValue(-12); T.burst(c, 200, 300, 1.15, 60);
    T.placeTile(c, ta, 1.15, 2.45, [540, 250], 72); T.burst(c, 540, 250, 1.3, 60);
    H.rot(T.placeTile(c, ts, 1.3, 2.45, [880, 310], 72)).setValue(12); T.burst(c, 880, 300, 1.45, 60);
    T.placeTile(c, tk, 3.67, 7.12, [540, 1460]); T.burst(c, 400, 1660, 4.0); T.burst(c, 700, 1560, 4.25, 45);
    T.placeTile(c, ta, 10.88, 12.0, [540, 1460]); T.burst(c, 760, 1470, 11.2);
    T.placeTile(c, ts, 16.68, T.DUR, [540, 1460]); T.burst(c, 380, 1300, 17.0); T.burst(c, 720, 1560, 19.7, 50);
    // Keyboard Shortcut — Stroke Up
    var ks = T.txt(c, { text: 'Keyboard\rShortcut', size: 118, font: T.F.wide, color: '#2a5cff', pos: [540, 1120], lead: 108, name: 'KS_Text' });
    T.grad(ks, '#7fa8ff', '#1d4dff'); T.glow(ks, 92, 16, 0.8, '#3a70ff'); T.span(ks, 3.8, 4.9);
    T.strokeUp(c, ks, 3.8, '#9cc0ff'); T.cut(ks, 4.9);
    // logo bar
    var lg = H.place(c, T.logos(), 'LOGOS', 7.12, 11); T.span(lg, 7.12, 9.04);
    H.pos(lg).setValue([540, 1300]); H.anim(H.opa(lg), [7.12, 7.2], [0, 100], 'linear'); T.cut(lg, 9.04);
    T.burst(c, 360, 1240, 7.5); T.burst(c, 760, 1360, 7.9, 50);
    return H.describe(c).length;
  };

  // ---------- giai đoạn 4: phụ đề từng từ (Pensum nghiêng, xanh ngọc, chồng dòng) ----------
  // Mỗi nhóm: các dòng; mỗi từ [chữ, giây bắt đầu, (tuỳ chọn) {c: màu, k: hệ số cỡ, su: stroke up}].
  T.CAPS = [
    { t1: 5.64, lines: [[['This', 4.90], ['will', 5.02]], [['make', 5.14]], [['you', 5.30], ['way', 5.42]]] },
    { t1: 7.12, lines: [[['and...', 6.08]], [['way', 6.32]], [['more', 6.52, { k: 1.25 }]]] },
    { t1: 7.80, lines: [[['no', 7.12]], [['matter', 7.36], ['what', 7.56]]] },
    { t1: 8.46, lines: [[['editing', 7.80]], [['software', 8.10]]] },
    { t1: 9.12, lines: [[['that', 8.46]], [["you're", 8.64]], [['using', 8.80]]] },
    { t1: 10.88, lines: [[['You', 9.86]], [['need', 9.94], ['to', 10.20]], [['be', 10.32]], [['Practicing', 10.44, { k: 1.3, su: 1 }]]] },
    { t1: 16.68, lines: [[['but', 15.40], ['not', 15.56]], [['least', 15.70]], [['focus', 16.22, { k: 1.35 }]]] },
    { t1: 18.88, lines: [[['Practice', 17.66], ['editing', 17.96]], [['all', 18.26]], [['different', 18.60]]] },
    { t1: 19.62, lines: [[['types', 18.88]], [['of', 19.16]], [['projects', 19.30]]] },
    { t1: 20.26, lines: [[['in', 19.62]], [['order', 19.86, { k: 1.4 }]], [['to', 20.06]]] },
    { t1: T.DUR, lines: [[['improve', 20.26]], [['your', 20.64]], [['storytelling', 20.84, { c: '#d35bff' }]], [['abilities', 21.22, { c: '#d35bff', k: 0.8 }]]] }
  ];
  T.capGroup = function (c, g, size, y0, lh) {
    var out = [];
    for (var i = 0; i < g.lines.length; i++) {
      var line = g.lines[i], ls = [], wsum = 0, gap = size * 0.2, lineK = 1;
      for (var j = 0; j < line.length; j++) {
        var o = line[j][2] || {}, k = o.k || 1; if (k > lineK) lineK = k;
        var l = T.txt(c, { text: line[j][0], size: size * k, font: T.F.cap, color: o.c || T.COL.teal, pos: [0, 0], just: 'l', name: 'CAP_' + line[j][0] + '@' + line[j][1].toFixed(2) });
        var r = l.sourceRectAtTime(0, false); ls.push([l, r.width, line[j][1], o]); wsum += r.width + (j ? gap : 0);
      }
      var x = 540 - wsum / 2, y = y0 + i * lh + (lineK - 1) * size * 0.35;
      for (j = 0; j < ls.length; j++) {
        var L = ls[j][0], t = ls[j][2], oo = ls[j][3];
        H.pos(L).setValue([x, y]); x += ls[j][1] + gap;
        T.glow(L, 55, 14, 1.0);
        T.span(L, t, g.t1);
        if (oo.su) T.strokeUp(c, L, t, '#c9fff6');
        else { H.anim(H.pos(L), [t, t + 5 * F], [[H.pos(L).value[0], y + 30], [H.pos(L).value[0], y]], 'snap'); H.blurIn(L, t, 5 * F, 18); }
        T.cut(L, g.t1, 2 * F);
        out.push(L.name);
      }
    }
    return out;
  };
  T.caps = function () {
    var c = T.main(), n = 0;
    for (var i = 0; i < T.CAPS.length; i++) n += T.capGroup(c, T.CAPS[i], 112, 990, 82).length;
    return n;
  };

  // ---------- giai đoạn 5: B-roll 12,0–14,73 s (meme trong thẻ + timeline DaVinci, nghiêng 3D) ----------
  T.broll = function () {
    var c = T.main(), D = 14.73 - 12.0;
    var mc = H.find('MEME_CARD'); if (mc) H.clearComp(mc); else mc = H.comp('MEME_CARD', 4, '02_SCENES', 900, 760);
    var meme = mc.layers.add(T.imp(C.assets + '/B-Roll/meme khóc rồi cười.mp4', '06_ASSETS')); meme.audioEnabled = false;
    H.scl(meme).setValue([157, 157]); H.pos(meme).setValue([450, 470]); meme.startTime = -0.4;
    var m = H.shape(mc, { name: 'CardMatte', w: 880, h: 740, r: 70, fill: '#ffffff', pos: [450, 380] });
    meme.setTrackMatte(m, TrackMatteType.ALPHA); m.enabled = false;
    var b = H.find('BROLL'); if (b) H.clearComp(b); else b = H.comp('BROLL', D, '02_SCENES', T.W, T.HT);
    var bg = H.solid(b, 'BG_Grain', '#2a2a2c'); H.fx(bg, 'ADBE Noise', { 'ADBE Noise-0001': 18 }); H.fx(bg, 'CC Vignette', { 'CS Vignette-0001': 60 });
    var rec = b.layers.add(T.imp(C.assets + '/B-Roll/Record.mov', '06_ASSETS')); rec.name = 'Timeline'; rec.audioEnabled = false;
    rec.threeDLayer = true; H.anc(rec).setValue([1500, 1420, 0]); H.pos(rec).setValue([540, 1460, 0]);
    H.anim(H.scl(rec), [0, D], [[150, 150, 150], [158, 158, 158]], 'linear');
    H.rotX(rec).setValue(8); H.rotY(rec).setValue(-6); H.rot(rec).setValue(-3); rec.startTime = -4.0;
    T.shadow(rec, 70, 20, 50);
    var card = H.place(b, mc, 'MemeCard', 0, 11); card.threeDLayer = true;
    H.pos(card).setValue([550, 420, -250]); H.rotX(card).setValue(6); H.rotY(card).setValue(-6); H.rot(card).setValue(-2);
    H.anim(H.scl(card), [0, 8 * F, D], [[85, 85, 85], [106, 106, 106], [110, 110, 110]], 'snap');
    T.shadow(card, 80, 25, 60);
    var cam = b.layers.addCamera('Cam', [540, 960]); cam.moveToEnd();
    var l = H.place(c, b, 'BROLL', 12.0, 11); T.span(l, 12.0, 14.73);
    return 'broll';
  };

  // ---------- giai đoạn 6: nền vòng tròn 17,85–22,2 s (người tách nền đứng trước) ----------
  T.rings = function () {
    var c = T.main(), t0 = 17.85, D = T.DUR - t0, cx = 540, cy = 760;
    var r = H.find('RINGS'); if (r) H.clearComp(r); else r = H.comp('RINGS', D, '02_SCENES', T.W, T.HT);
    var bg = H.solid(r, 'BG', '#0a0e1c');
    H.fx(bg, 'ADBE Ramp', { 'ADBE Ramp-0001': [cx, cy], 'ADBE Ramp-0002': H.rgb('#232c52'), 'ADBE Ramp-0003': [cx, cy + 1150], 'ADBE Ramp-0004': H.rgb('#04050b'), 'ADBE Ramp-0005': 2 });
    var r1 = H.c(r, 'Ring_Outer', cx, cy, 1150, null, null, '#ffffff', 3, 70);
    var r2 = H.c(r, 'Ring_Inner', cx, cy, 900, null, null, '#ffffff', 2, 35);
    var orb = H.null(r, 'Orbit', [cx, cy]); H.anc(orb).setValue([50, 50]);
    var icons = ['keyboard-and-mouse (1).mp4', 'audio-editing.mp4', 'storytelling.mp4', 'keyboard-and-mouse (1).mp4', 'storytelling.mp4'];
    var ang = [-150, -105, -60, -15, 30];
    for (var i = 0; i < icons.length; i++) {
      var it = r.layers.add(T.imp(C.assets + '/icon&logo/' + icons[i], '06_ASSETS')); it.name = 'Sat_' + i; it.audioEnabled = false;
      T.edges(it); it.blendingMode = BlendingMode.SCREEN;
      it.timeRemapEnabled = true; it.property('ADBE Time Remapping').expression = 'loopOut()'; it.outPoint = D;
      var a = ang[i] * Math.PI / 180; H.scl(it).setValue([44, 44]);
      H.pos(it).setValue([cx + 575 * Math.cos(a), cy + 575 * Math.sin(a)]);
      H.attach(it, orb, 0);
      var g = H.c(r, 'Gear_' + i, cx + 450 * Math.cos(a + 0.4), cy + 450 * Math.sin(a + 0.4), 22, null, null, '#ffffff', 5, 90);
      H.attach(g, orb, 0);
    }
    H.attach(r1, orb, 0); H.attach(r2, orb, 0);
    var fl1 = H.path(r, 'Flare_L', [[-200, -200], [420, -200], [-200, 520]], { fill: '#ffffff', closed: true });
    var fl2 = H.path(r, 'Flare_R', [[1280, -200], [660, -200], [1280, 520]], { fill: '#ffffff', closed: true });
    H.gblur(fl1, 120); H.gblur(fl2, 120); H.opa(fl1).setValue(85); H.opa(fl2).setValue(85);
    fl1.moveBefore(r1); fl2.moveBefore(r1);
    H.anim(H.rot(orb), [0, D], [0, 38], 'linear');
    H.anim(H.scl(orb), [0, 10 * F], [[125, 125], [100, 100]], 'snap');
    var fl = H.solid(r, 'Flash', '#ffffff'); H.anim(H.opa(fl), [0, 4 * F], [85, 0], 'linear'); fl.outPoint = 5 * F;
    var l = H.place(c, r, 'RINGS', t0, 13); T.span(l, t0, T.DUR);
    l.moveAfter(c.layer('MATTE_Person'));
    return 'rings';
  };

  // ---------- giai đoạn 7: light leak (Screen) ----------
  T.leaks = function () {
    var c = T.main(), it = T.imp(C.assets + '/ánh sáng chuyển cảnh 1.mp4', '06_ASSETS');
    var L = [[1.0, 3.2], [6.0, 6.35], [7.67, 9.55], [12.0, 11.95], [16.67, 12.6]];
    for (var i = 0; i < L.length; i++) {
      var l = c.layers.add(it); l.name = 'LEAK_' + L[i][0]; l.audioEnabled = false;
      l.startTime = L[i][0] - L[i][1]; l.inPoint = L[i][0]; l.outPoint = L[i][0] + 0.45; H.opa(l).setValue(75);
      H.scl(l).setValue([345, 345]); l.blendingMode = BlendingMode.SCREEN;
    }
    return L.length;
  };

  // ---------- giai đoạn 8: SFX ----------
  T.sfx = function () {
    var c = T.main(), S = C.assets + '/SFX/';
    function put(file, t, src, len, db) {
      var l = c.layers.add(T.imp(S + file, '04_SFX')); l.name = 'SFX_' + file.replace(/\.[^.]+$/, '') + '@' + t.toFixed(2);
      l.startTime = t - (src || 0); l.inPoint = t; if (len) l.outPoint = Math.min(T.DUR, t + len);
      if (db) l.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([db, db]);
      if (l.hasVideo) l.enabled = false;
      l.moveToEnd(); return l;
    }
    put('Tiktok SFX 2.mp3', 0.0, 0, 1.2, -4);
    put('pop sound.MP3', 1.0, 0, 0, -3); put('pop sound.MP3', 1.15, 0, 0, -3); put('pop sound.MP3', 1.3, 0, 0, -3);
    var hits = [2.56, 9.2, 15.06];
    for (var i = 0; i < hits.length; i++) {
      put('MUI IMPACT SWEETENER Space Impact.wav', hits[i], 0.05, 2.4, -2);
      put('2. Lightsaber.mp3', hits[i] + 0.05, 0, 0, -8);
    }
    put('ping.MP3', 3.67, 0, 0, -6); put('ping.MP3', 10.88, 0, 0, -6); put('ping.MP3', 16.68, 0, 0, -6);
    put('Camera Shutter Sound Effect.mp3', 5.62, 0, 0, -6); put('Camera Shutter Sound Effect.mp3', 6.72, 0, 0, -8);
    put('riser long classique.mp3', 7.3, 0.8, 1.92, -4);
    put('Tiktok SFX 2.mp3', 13.5, 0, 1.5, -6);
    put('Gears 1.wav', 17.85, 0, 0, -4);
    put('riser long classique.mp3', 18.3, 0, 0, -6);
    for (var g = 0; g < T.CAPS.length; g++) for (var a = 0; a < T.CAPS[g].lines.length; a++) for (var b = 0; b < T.CAPS[g].lines[a].length; b++)
      put('click-for transitions.MP3', T.CAPS[g].lines[a][b][1], 0, 0, -14);
    return 'sfx';
  };

  T.all = function () {
    var st = ['base', 'behind', 'front', 'caps', 'broll', 'rings', 'leaks', 'sfx'], out = [];
    for (var i = 0; i < st.length; i++) out.push(st[i] + ':' + T.run(st[i]));
    return out;
  };

  // Không bọc undo group: trong undo group sourceRectAtTime của text mới tạo trả 0 → Ramp start = end → lỗi chia 0.
  // Trả về số đếm, không trả mảng: ghép mảng H.describe ('a:' + arr) trong ExtendScript ném "divide by zero".
  T.run = function (stage) { var r = T[stage](); return (r instanceof Array) ? r.length : r; };
  return 'build ok';
})();
