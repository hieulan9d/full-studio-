// th-lib.jsx — thư viện dựng TALKING HEAD dọc trong After Effects qua MCP (ExtendScript ES3).
// Cần nạp saas-lib.jsx trước (cung cấp $.global.H: H.text, H.anim, H.fx, H.shape, H.comp, H.attach...).
//
//   $.evalFile(File(KIT + '/lib/saas-lib.jsx'));
//   $.evalFile(File(KIT + '/lib/th-lib.jsx'));
//   T.init({ dur: 22.2, media: '<thư mục có aroll.mp4, aroll_matte.mp4>', assets: '<thư mục tài sản>' });
//
// Mọi hàm nhận thời gian theo GIÂY trên timeline comp MAIN (khớp mốc từ trong transcript).
// Toạ độ: comp 1080×1920, (0,0) góc trên trái. Các con số mặc định lấy từ ví dụ Foodtage (đã render thật).
(function () {
  var H = $.global.H;
  if (!H) throw new Error('Nạp saas-lib.jsx trước th-lib.jsx');
  var T = $.global.T = {};
  T.VERSION = '1.0';
  var F = 1 / 30;
  T.F = F;

  // ======================================================================
  // 0. CẤU HÌNH
  // ======================================================================
  // fonts: PostScript name có trên máy (xem T.fontList). Font PHẢI có dấu tiếng Việt nếu chữ là tiếng Việt.
  T.init = function (cfg) {
    T.W = cfg.w || 1080; T.HT = cfg.h || 1920; T.DUR = cfg.dur; T.FPS = cfg.fps || 30;
    H.FPS = T.FPS; H.HUE = 0; F = 1 / T.FPS; T.F = F;
    T.MEDIA = cfg.media; T.ASSETS = cfg.assets;
    T.FONT = cfg.fonts || { title: 'TRImpact', cap: 'PensumDisplay-BookItalic', script: 'SVN-RosellindaAlyamore', wide: 'TacticSansExd-BlkIt', wideUp: 'TacticSansExd-Blk' };
    T.COL = cfg.colors || { titleTop: '#7563ff', titleBot: '#dcd3ff', label: '#1f4fff', labelGlow: '#2a5cff',
      digit: '#9a82ff', digitEdge: '#8ff8ff', digitGlow: '#5ff4ff', cap: '#5cf7e0', capAlt: '#d35bff',
      card: '#101318', cardGlow: '#7a1cff', edge: '#9b3cff', sweep: '#e9d6ff', icon: '#55f2ff', iconGlow: '#3fd8ff', iconGlow2: '#a040ff' };
    return T;
  };
  T.fontList = function (re) {
    var out = [], all = app.fonts.allFonts, rx = new RegExp(re || '.', 'i');
    for (var i = 0; i < all.length; i++) for (var j = 0; j < all[i].length; j++) { var f = all[i][j]; if (rx.test(f.familyName + ' ' + f.postScriptName)) out.push(f.postScriptName + ' | ' + f.familyName + ' | ' + f.styleName); }
    return out;
  };

  // ======================================================================
  // 1. TIỆN ÍCH
  // ======================================================================
  // Import 1 lần (tìm theo tên file trong project trước)
  T.imp = function (path, folder) {
    var f = new File(path); if (!f.exists) throw new Error('missing ' + path);
    var it = H.find(f.displayName); if (it && !(it instanceof CompItem)) return it;
    it = app.project.importFile(new ImportOptions(f)); if (folder) it.parentFolder = H.folder(folder);
    return it;
  };
  T.main = function () { return H.find('MAIN'); };
  T.span = function (l, t0, t1) { l.inPoint = Math.max(0, t0); l.outPoint = t1; return l; };
  // Text: o = {text, size, font, color, pos, just:'c'|'l'|'r', lead, stroke, sw, strokeOver, noFill, track, name}
  T.txt = function (comp, o) {
    var l = H.text(comp, { text: o.text, size: o.size, font: o.font, color: o.color || '#ffffff', pos: o.pos, just: o.just || 'c', track: o.track, name: o.name });
    var sp = l.property('ADBE Text Properties').property('ADBE Text Document'), d = sp.value;
    if (o.lead) { d.autoLeading = false; d.leading = o.lead; }
    if (o.stroke) { d.applyStroke = true; d.strokeColor = H.rgb(o.stroke); d.strokeWidth = o.sw || 4; d.strokeOverFill = !!o.strokeOver; }
    if (o.noFill) d.applyFill = false;
    sp.setValue(d); H.anchorText(l, o.just || 'c');
    return l;
  };
  // Gradient dọc trong chữ: Ramp + Set Matte lấy alpha chính layer. Gọi NGAY sau khi tạo chữ, ngoài undo group.
  T.grad = function (l, top, bot) {
    var r = l.sourceRectAtTime(l.inPoint > 0 ? l.inPoint : 0, false);
    H.fx(l, 'ADBE Ramp', { 'ADBE Ramp-0001': [r.left + r.width / 2, r.top], 'ADBE Ramp-0002': H.rgb(top),
                           'ADBE Ramp-0003': [r.left + r.width / 2, r.top + r.height], 'ADBE Ramp-0004': H.rgb(bot) });
    var sm = H.fx(l, 'ADBE Set Matte3', {}); sm.property('ADBE Set Matte3-0001').setValue(l.index); sm.property('ADBE Set Matte3-0002').setValue(4);
    return l;
  };
  // Ramp trong vùng alpha của shape/text. shape: 1 linear, 2 radial
  T.rampIn = function (l, p1, c1, p2, c2, shape) {
    H.fx(l, 'ADBE Ramp', { 'ADBE Ramp-0001': p1, 'ADBE Ramp-0002': H.rgb(c1), 'ADBE Ramp-0003': p2, 'ADBE Ramp-0004': H.rgb(c2), 'ADBE Ramp-0005': shape || 1 });
    var sm = H.fx(l, 'ADBE Set Matte3', {}); sm.property('ADBE Set Matte3-0001').setValue(l.index); sm.property('ADBE Set Matte3-0002').setValue(4);
    return l;
  };
  // Glow GIỮ MÀU: 2 Drop Shadow cùng màu, distance 0. KHÔNG dùng effect Glow (ADBE Glo2): nó cộng màu → chữ màu bị trắng xoá.
  // col mặc định = màu fill (hoặc stroke) của text layer. thr không dùng (giữ chữ ký).
  T.glow = function (l, thr, rad, inten, col) {
    var rgb = col ? H.rgb(col) : null;
    if (!rgb) { try { var d = l.property('ADBE Text Properties').property('ADBE Text Document').value; rgb = d.applyFill ? d.fillColor : d.strokeColor; } catch (e) { rgb = [1, 1, 1]; } }
    var a = Math.min(255, inten * 200), b = Math.min(255, inten * 120);
    H.fx(l, 'ADBE Drop Shadow', { 'ADBE Drop Shadow-0001': rgb, 'ADBE Drop Shadow-0002': a, 'ADBE Drop Shadow-0004': 0, 'ADBE Drop Shadow-0005': rad });
    return H.fx(l, 'ADBE Drop Shadow', { 'ADBE Drop Shadow-0001': rgb, 'ADBE Drop Shadow-0002': b, 'ADBE Drop Shadow-0004': 0, 'ADBE Drop Shadow-0005': rad * 3 });
  };
  T.shadow = function (l, op, dist, soft) { return H.fx(l, 'ADBE Drop Shadow', { 'ADBE Drop Shadow-0002': op * 2.55, 'ADBE Drop Shadow-0004': dist, 'ADBE Drop Shadow-0005': soft }); };

  // ======================================================================
  // 2. VÀO / RA
  // ======================================================================
  // Bật vào: scale from% → 100 trong dur (mặc định 6 khung) kiểu snap + opacity 2 khung
  T.punchIn = function (l, t, from, dur) {
    from = from || 160; dur = dur || 6 * F;
    H.anim(H.scl(l), [t, t + dur], [[from, from], [100, 100]], 'snap');
    H.anim(H.opa(l), [t, t + 2 * F], [0, 100], 'linear');
    return l;
  };
  T.popIn = function (l, t, dur) { H.pop(H.scl(l), t, [0, 0], [100, 100], dur || 0.3, 0.12); H.anim(H.opa(l), [t, t + 2 * F], [0, 100], 'linear'); return l; };
  // Tắt nhanh (3 khung) và đặt outPoint
  T.cut = function (l, t, dur) { dur = dur || 3 * F; var o = H.opa(l); o.setValueAtTime(t - dur, 100); o.setValueAtTime(t, 0); l.outPoint = t; return l; };
  // Stroke Up (preset DaVinci "Strock Up"): chữ đi lên 70 px vào chỗ trong 10 khung; bản viền nở 100→250 %, mờ dần.
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

  // ======================================================================
  // 3. NỀN: A-roll đã grade + người tách nền + camera zoom
  // ======================================================================
  // o = { aroll, matte (đường dẫn), grade: {black, white, gamma, vib, sat, bright, contrast, vignette},
  //       zooms: [[giây, scale%], ...] (key HOLD = cắt nhảy), focus: [x, y] tâm zoom (thường là mặt) }
  // Tạo: AROLL_G (precomp có grade), MAIN với BG_Plate (dưới), MATTE_Person, FG_Person (Track Matte Luma), CAM (null).
  // Chữ "sau lưng người" đặt giữa BG_Plate và MATTE_Person: T.behind(layer).
  T.base = function (o) {
    H.setupFolders();
    var a = T.imp(o.aroll, '06_ASSETS'), m = o.matte ? T.imp(o.matte, '06_ASSETS') : null;
    var g = H.find('AROLL_G'); if (g) H.clearComp(g); else g = H.comp('AROLL_G', T.DUR, '01_ENV', T.W, T.HT);
    var al = g.layers.add(a); al.name = 'ARoll';
    var sc = T.W / a.width * 100; if (Math.abs(sc - 100) > 0.1) H.scl(al).setValue([sc, sc]);
    var gr = o.grade || {};
    H.fx(al, 'ADBE Easy Levels2', { 'ADBE Easy Levels2-0003': (gr.black === undefined ? 24 : gr.black) / 255, 'ADBE Easy Levels2-0004': (gr.white || 228) / 255, 'ADBE Easy Levels2-0005': gr.gamma || 0.92 });
    H.fx(al, 'ADBE Vibrance', { 'ADBE Vibrance-0001': gr.vib === undefined ? 45 : gr.vib, 'ADBE Vibrance-0002': gr.sat === undefined ? 25 : gr.sat });
    H.fx(al, 'ADBE Brightness & Contrast 2', { 'ADBE Brightness & Contrast 2-0001': gr.bright === undefined ? -8 : gr.bright, 'ADBE Brightness & Contrast 2-0002': gr.contrast === undefined ? 32 : gr.contrast });
    H.fx(al, 'CC Vignette', { 'CS Vignette-0001': gr.vignette === undefined ? 35 : gr.vignette });

    var c = H.comp('MAIN', T.DUR, '00_MAIN', T.W, T.HT); c.bgColor = [0, 0, 0];
    var plate = H.place(c, g, 'BG_Plate', 0, 8), layers = [plate];
    if (m) {
      var matte = c.layers.add(m); matte.name = 'MATTE_Person'; matte.audioEnabled = false;
      var ms = T.W / m.width * 100; if (Math.abs(ms - 100) > 0.1) H.scl(matte).setValue([ms, ms]);
      var person = H.place(c, g, 'FG_Person', 0, 8); person.audioEnabled = false;
      person.moveBefore(matte); person.setTrackMatte(matte, TrackMatteType.LUMA);
      layers.push(matte, person);
    }
    var f = o.focus || [540, 700];
    var cam = H.null(c, 'CAM', f); cam.moveToEnd(); H.anc(cam).setValue([50, 50]);
    H.attachAll(layers, cam, 0);
    var zs = o.zooms || [[0, 100]], sp = H.scl(cam);
    for (var i = 0; i < zs.length; i++) sp.setValueAtTime(zs[i][0], [zs[i][1], zs[i][1]]);
    for (var k = 1; k <= sp.numKeys; k++) sp.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
    return c.numLayers;
  };
  // Đưa layer (hoặc mảng layer) xuống SAU người nói (ngay trên BG_Plate)
  T.behind = function (x) {
    var c = T.main(), plate = c.layer('BG_Plate'), a = (x instanceof Array) ? x : [x];
    for (var i = 0; i < a.length; i++) a[i].moveBefore(plate);
    return a;
  };

  // ======================================================================
  // 4. KHỐI CHỮ
  // ======================================================================
  // Từ khoá to (thường đặt sau đầu bằng T.behind): font tiêu đề, gradient dọc, light sweep, bóng.
  // lines: ['Sound','Design']; y: tâm khối chữ; size: cỡ chữ (230–300 cho 1 từ ~8 ký tự ngang 1080).
  T.keyword = function (c, name, lines, t0, t1, y, size, o) {
    o = o || {};
    var l = T.txt(c, { text: lines.join('\r'), size: size, font: o.font || T.FONT.title, pos: [o.x || 540, y], lead: size * 0.98, name: name });
    T.grad(l, o.top || T.COL.titleTop, o.bot || T.COL.titleBot);
    if (o.sweep !== false) H.sweep(l, t0, t1, -400, 1400, 0);
    T.shadow(l, 40, 6, 20);
    T.span(l, t0, t1); T.punchIn(l, t0, 135, 5 * F); T.cut(l, t1);
    return l;
  };
  // Nhãn + số neon lớn ("Number" + "1"): nhãn trên trái, số bên phải. Trả [nhãn, số, tia sét].
  T.number = function (c, label, digit, t0, t1, o) {
    o = o || {};
    var a = T.txt(c, { text: label, size: o.labelSize || 190, font: o.labelFont || T.FONT.title, color: T.COL.label, pos: o.labelPos || [70, 205], just: 'l', name: 'TXT_' + label });
    T.glow(a, 92, 20, 0.9, T.COL.labelGlow);
    T.span(a, t0, t1); T.punchIn(a, t0, 140, 5 * F); T.cut(a, t1);
    var d = T.txt(c, { text: digit, size: o.digitSize || 1050, font: o.digitFont || T.FONT.cap, color: T.COL.digit, pos: o.digitPos || [850, 430], stroke: T.COL.digitEdge, sw: 12, strokeOver: true, name: 'NUM_' + digit });
    T.glow(d, 92, 30, 0.9, T.COL.digitGlow);
    T.span(d, t0 + 2 * F, t1);
    H.anim(H.scl(d), [t0 + 2 * F, t0 + 10 * F, t1], [[150, 150], [100, 100], [94, 94]], 'snap');
    H.anim(H.rot(d), [t0 + 2 * F, t0 + 10 * F], [-14, 0], 'snap');
    H.anim(H.opa(d), [t0 + 2 * F, t0 + 4 * F], [0, 100], 'linear');
    T.cut(d, t1);
    var out = [a, d];
    if (o.bolt !== false) {
      var bolt = H.path(c, 'NUM_' + digit + '_Bolt', [[820, 40], [870, 200], [840, 230], [905, 420], [880, 440], [940, 620]], { stroke: '#d8fbff', sw: 5 });
      T.glow(bolt, 30, 16, 1.2, '#7ff0ff'); T.span(bolt, t0 + 3 * F, t0 + 16 * F);
      H.anim(H.opa(bolt), [t0 + 3 * F, t0 + 5 * F, t0 + 8 * F, t0 + 10 * F, t0 + 16 * F], [0, 100, 30, 100, 0], 'linear');
      out.push(bolt);
    }
    return out;
  };

  // ======================================================================
  // 5. PHỤ ĐỀ TỪNG TỪ (chồng dòng, căn giữa, từ hiện đúng mốc nói)
  // ======================================================================
  // g = { t1: giây tắt cả nhóm, lines: [ [ [chữ, giây, {c: màu, k: hệ số cỡ, su: 1 = Stroke Up}], ...], ... ] }
  // Tạo nhóm tự động từ transcript: python tools/caption_groups.py transcript.json → dán vào build.
  T.capGroup = function (c, g, size, y0, lh, o) {
    o = o || {}; var out = [];
    for (var i = 0; i < g.lines.length; i++) {
      var line = g.lines[i], ls = [], wsum = 0, gap = size * 0.2, lineK = 1;
      for (var j = 0; j < line.length; j++) {
        var oo = line[j][2] || {}, k = oo.k || 1; if (k > lineK) lineK = k;
        var l = T.txt(c, { text: line[j][0], size: size * k, font: o.font || T.FONT.cap, color: oo.c || o.color || T.COL.cap, pos: [0, 0], just: 'l', name: 'CAP_' + line[j][0] + '@' + line[j][1].toFixed(2) });
        var r = l.sourceRectAtTime(0, false); ls.push([l, r.width, line[j][1], oo]); wsum += r.width + (j ? gap : 0);
      }
      var x = 540 - wsum / 2, y = y0 + i * lh + (lineK - 1) * size * 0.35;
      for (j = 0; j < ls.length; j++) {
        var L = ls[j][0], t = ls[j][2], w = ls[j][3];
        H.pos(L).setValue([x, y]); x += ls[j][1] + gap;
        T.glow(L, 55, 14, 1.0);
        T.span(L, t, g.t1);
        if (w.su) T.strokeUp(c, L, t, o.stroke || '#c9fff6');
        else { H.anim(H.pos(L), [t, t + 5 * F], [[H.pos(L).value[0], y + 30], [H.pos(L).value[0], y]], 'snap'); H.blurIn(L, t, 5 * F, 18); }
        T.cut(L, g.t1, 2 * F);
        out.push(L.name);
      }
    }
    return out;
  };
  // groups: mảng g; size 112, y0 990, lh 82 = cỡ của Foodtage (chữ ở ngực, trên icon tile)
  T.captions = function (groups, size, y0, lh, o) {
    var c = T.main(), n = 0;
    for (var i = 0; i < groups.length; i++) n += T.capGroup(c, groups[i], size || 112, y0 || 990, lh || 82, o).length;
    return n;
  };

  // ======================================================================
  // 6. ICON TILE (preset "icon effect") + vòng nổ
  // ======================================================================
  // Icon minh hoạ tô đặc → nét sáng trên đen (edge detect như preset DaVinci)
  T.edges = function (l) {
    H.fx(l, 'ADBE Find Edges', { 'ADBE Find Edges-0001': 1 });
    H.fx(l, 'ADBE Easy Levels2', { 'ADBE Easy Levels2-0003': 25 / 255, 'ADBE Easy Levels2-0004': 90 / 255 });
    H.fx(l, 'ADBE Minimax', { 'ADBE Minimax-0001': 2, 'ADBE Minimax-0002': 2 });
    H.fx(l, 'ADBE Tint', {});
    return l;
  };
  // Precomp TILE_<key> 420×420: thẻ bo 22 %, nền tối + ánh tím góc dưới phải, viền tím,
  // vệt sáng 20 % chạy vòng viền (6 s/vòng), icon thành nét neon (file: video/ảnh icon nền trắng hoặc trong suốt).
  T.tile = function (key, file) {
    var name = 'TILE_' + key, S = 420, cs = 380;
    var c = H.find(name); if (c) H.clearComp(c); else c = H.comp(name, 10, '03_UI', S, S);
    var card = H.shape(c, { name: 'Card', w: cs, h: cs, r: cs * 0.22, fill: T.COL.card, pos: [S / 2, S / 2] });
    T.rampIn(card, [S * 0.95, S * 0.95], T.COL.cardGlow, [S * 0.5, S * 0.45], T.COL.card, 2);
    H.shape(c, { name: 'Edge', w: cs, h: cs, r: cs * 0.22, stroke: T.COL.edge, sw: 5, pos: [S / 2, S / 2] });
    var sweep = H.shape(c, { name: 'EdgeSweep', w: cs, h: cs, r: cs * 0.22, stroke: T.COL.sweep, sw: 7, pos: [S / 2, S / 2] });
    var tr = H.vec(sweep).addProperty('ADBE Vector Filter - Trim');
    tr.property('ADBE Vector Trim Start').setValue(0); tr.property('ADBE Vector Trim End').setValue(20);
    H.anim(tr.property('ADBE Vector Trim Offset'), [0, 6], [0, 360], 'linear');
    tr.property('ADBE Vector Trim Offset').expression = 'loopOut()';
    T.glow(sweep, 30, 14, 1.2, '#c99bff');
    var it = T.imp(file, '06_ASSETS');
    var ic = c.layers.add(it); ic.name = 'Icon'; ic.audioEnabled = false;
    var k = 300 / Math.max(it.width, it.height) * 100; H.scl(ic).setValue([k, k]); H.pos(ic).setValue([S / 2, S / 2]);
    T.edges(ic);
    H.fx(ic, 'ADBE Tint', { 'ADBE Tint-0001': [0, 0, 0], 'ADBE Tint-0002': H.rgb(T.COL.icon) });
    ic.blendingMode = BlendingMode.SCREEN;
    if (it.duration > 0 && !it.mainSource.isStill) { ic.timeRemapEnabled = true; ic.property('ADBE Time Remapping').expression = 'loopOut()'; }
    ic.outPoint = 10;
    T.glow(ic, 20, 10, 1.2, T.COL.iconGlow); T.glow(ic, 20, 22, 0.8, T.COL.iconGlow2);
    return c;
  };
  // Đặt tile vào MAIN: bay lên 260 px trong 15 khung + scale 60→100 % + motion blur. sc: scale cuối (%).
  T.placeTile = function (c, comp, t0, t1, pos, sc) {
    var l = H.place(c, comp, comp.name + '@' + t0.toFixed(1), t0, 11); l.motionBlur = true;
    sc = sc || 100; T.span(l, t0, t1);
    H.anim(H.pos(l), [t0, t0 + 15 * F], [[pos[0], pos[1] + 260], pos], 'snap');
    H.anim(H.scl(l), [t0, t0 + 10 * F], [[sc * 0.6, sc * 0.6], [sc, sc]], 'snap');
    H.anim(H.opa(l), [t0, t0 + 3 * F], [0, 100], 'linear');
    T.cut(l, t1);
    return l;
  };
  // Vòng trắng nổ ra rồi tắt (0,4 s) — rắc quanh icon/từ khoá
  T.burst = function (c, x, y, t, d) {
    var l = H.c(c, 'POP_' + t.toFixed(2), x, y, d || 70, null, null, '#ffffff', 6);
    T.span(l, t, t + 0.4);
    H.anim(H.scl(l), [t, t + 0.4], [[60, 60], [190, 190]], 'snap');
    H.anim(H.opa(l), [t, t + 0.15, t + 0.4], [100, 100, 0], 'linear');
    return l;
  };

  // ======================================================================
  // 7. HÀNG LOGO trên thanh kính (trượt vào từ phải, logo giữa to hơn)
  // ======================================================================
  T.logoBar = function (name, files, bigIndex) {
    var c = H.find(name); if (c) H.clearComp(c); else c = H.comp(name, 3, '03_UI', 1040, 380);
    H.shape(c, { name: 'Bar', w: 940, h: 300, r: 60, fill: '#ffffff', fillOp: 16, pos: [520, 190] });
    var row = H.null(c, 'Row', [520, 190]); H.anc(row).setValue([50, 50]);
    var mid = (files.length - 1) / 2; if (bigIndex === undefined) bigIndex = Math.round(mid);
    for (var i = 0; i < files.length; i++) {
      var it = T.imp(files[i], '06_ASSETS');
      var l = c.layers.add(it); l.name = 'Logo_' + i;
      var big = (i === bigIndex), tgt = big ? 270 : 215, s = tgt / Math.max(it.width, it.height) * 100;
      H.scl(l).setValue([s, s]); H.pos(l).setValue([520 + (i - mid) * 185, 190]); if (big) { l.moveToBeginning(); T.shadow(l, 70, 0, 30); }
      H.attach(l, row, 0);
    }
    H.anim(H.pos(row), [0, 0.3, 2.0], [[820, 190], [520, 190], [490, 190]], 'snap');
    return c;
  };

  // ======================================================================
  // 8. B-ROLL THẺ 3D (nửa trên: clip trong thẻ bo góc; nửa dưới: clip thứ hai nghiêng) — thay A-roll vài giây
  // ======================================================================
  // o = { top: file, topScale, topPos:[x,y] trong thẻ 900×760, topStart: giây trong file ứng với t0,
  //       bottom: file (tuỳ chọn), bottomAnchor:[x,y] điểm nguồn đặt giữa nửa dưới, bottomScale, bottomStart }
  T.brollCard = function (name, t0, t1, o) {
    var c = T.main(), D = t1 - t0;
    var mc = H.find(name + '_CARD'); if (mc) H.clearComp(mc); else mc = H.comp(name + '_CARD', D + 1, '02_SCENES', 900, 760);
    var top = mc.layers.add(T.imp(o.top, '06_ASSETS')); top.audioEnabled = false;
    if (o.topScale) H.scl(top).setValue([o.topScale, o.topScale]); H.pos(top).setValue(o.topPos || [450, 380]); top.startTime = -(o.topStart || 0);
    var m = H.shape(mc, { name: 'CardMatte', w: 880, h: 740, r: 70, fill: '#ffffff', pos: [450, 380] });
    top.setTrackMatte(m, TrackMatteType.ALPHA); m.enabled = false;
    var b = H.find(name); if (b) H.clearComp(b); else b = H.comp(name, D, '02_SCENES', T.W, T.HT);
    var bg = H.solid(b, 'BG_Grain', '#2a2a2c'); H.fx(bg, 'ADBE Noise', { 'ADBE Noise-0001': 18 }); H.fx(bg, 'CC Vignette', { 'CS Vignette-0001': 60 });
    if (o.bottom) {
      var rec = b.layers.add(T.imp(o.bottom, '06_ASSETS')); rec.name = 'Bottom'; rec.audioEnabled = false;
      rec.threeDLayer = true; var ba = o.bottomAnchor || [rec.source.width / 2, rec.source.height / 2];
      H.anc(rec).setValue([ba[0], ba[1], 0]); H.pos(rec).setValue([540, 1460, 0]);
      var bs = o.bottomScale || 150; H.anim(H.scl(rec), [0, D], [[bs, bs, bs], [bs + 8, bs + 8, bs + 8]], 'linear');
      H.rotX(rec).setValue(8); H.rotY(rec).setValue(-6); H.rot(rec).setValue(-3); rec.startTime = -(o.bottomStart || 0);
      T.shadow(rec, 70, 20, 50);
    }
    var card = H.place(b, mc, 'Card', 0, 11); card.threeDLayer = true;
    // z −250: đưa thẻ lên trước lớp nghiêng, nếu không lớp 3D phía dưới che mất thẻ
    H.pos(card).setValue([550, o.bottom ? 420 : 960, -250]); H.rotX(card).setValue(6); H.rotY(card).setValue(-6); H.rot(card).setValue(-2);
    H.anim(H.scl(card), [0, 8 * F, D], [[85, 85, 85], [106, 106, 106], [110, 110, 110]], 'snap');
    T.shadow(card, 80, 25, 60);
    var cam = b.layers.addCamera('Cam', [540, 960]); cam.moveToEnd();
    var l = H.place(c, b, name, t0, 11); T.span(l, t0, t1);
    return l;
  };

  // ======================================================================
  // 9. NỀN VÒNG TRÒN (thay nền phía sau người, người vẫn đứng trước nhờ matte)
  // ======================================================================
  // icons: file icon quay quanh vòng; o = {cx, cy, R, bg, bgHi, flares:true}
  T.ringsBg = function (name, t0, t1, icons, o) {
    o = o || {}; var c = T.main(), D = t1 - t0, cx = o.cx || 540, cy = o.cy || 760, R = o.R || 575;
    var r = H.find(name); if (r) H.clearComp(r); else r = H.comp(name, D, '02_SCENES', T.W, T.HT);
    var bg = H.solid(r, 'BG', o.bg || '#0a0e1c');
    H.fx(bg, 'ADBE Ramp', { 'ADBE Ramp-0001': [cx, cy], 'ADBE Ramp-0002': H.rgb(o.bgHi || '#232c52'), 'ADBE Ramp-0003': [cx, cy + 1150], 'ADBE Ramp-0004': H.rgb('#04050b'), 'ADBE Ramp-0005': 2 });
    var r1 = H.c(r, 'Ring_Outer', cx, cy, R * 2, null, null, '#ffffff', 3, 70);
    var r2 = H.c(r, 'Ring_Inner', cx, cy, R * 1.56, null, null, '#ffffff', 2, 35);
    var orb = H.null(r, 'Orbit', [cx, cy]); H.anc(orb).setValue([50, 50]);
    var n = icons.length;
    for (var i = 0; i < n; i++) {
      var it = r.layers.add(T.imp(icons[i], '06_ASSETS')); it.name = 'Sat_' + i; it.audioEnabled = false;
      T.edges(it); it.blendingMode = BlendingMode.SCREEN;
      if (!it.source.mainSource.isStill) { it.timeRemapEnabled = true; it.property('ADBE Time Remapping').expression = 'loopOut()'; }
      it.outPoint = D;
      var a = (-150 + i * 180 / Math.max(1, n - 1)) * Math.PI / 180, k = 225 / Math.max(it.source.width, it.source.height) * 100;
      H.scl(it).setValue([k, k]); H.pos(it).setValue([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      H.attach(it, orb, 0);
      H.attach(H.c(r, 'Gear_' + i, cx + R * 0.78 * Math.cos(a + 0.4), cy + R * 0.78 * Math.sin(a + 0.4), 22, null, null, '#ffffff', 5, 90), orb, 0);
    }
    H.attach(r1, orb, 0); H.attach(r2, orb, 0);
    if (o.flares !== false) {
      var fl1 = H.path(r, 'Flare_L', [[-200, -200], [420, -200], [-200, 520]], { fill: '#ffffff', closed: true });
      var fl2 = H.path(r, 'Flare_R', [[1280, -200], [660, -200], [1280, 520]], { fill: '#ffffff', closed: true });
      H.gblur(fl1, 120); H.gblur(fl2, 120); H.opa(fl1).setValue(85); H.opa(fl2).setValue(85);
      fl1.moveBefore(r1); fl2.moveBefore(r1);
    }
    H.anim(H.rot(orb), [0, D], [0, 38], 'linear');
    H.anim(H.scl(orb), [0, 10 * F], [[125, 125], [100, 100]], 'snap');
    var fl = H.solid(r, 'Flash', '#ffffff'); H.anim(H.opa(fl), [0, 4 * F], [85, 0], 'linear'); fl.outPoint = 5 * F;
    var l = H.place(c, r, name, t0, 13); T.span(l, t0, t1);
    var mt = c.layer('MATTE_Person'); if (mt) l.moveAfter(mt); else l.moveBefore(c.layer('BG_Plate'));
    return l;
  };

  // ======================================================================
  // 10. LIGHT LEAK + SFX
  // ======================================================================
  // list: [[giây trên timeline, giây trong file leak], ...]. Chọn đoạn leak SÁNG MỀM (xem knowledge/06):
  // file leak tổng hợp thường lẫn cả nhiễu/glitch/loé đỏ.
  T.leaks = function (file, list, dur, opacity) {
    var c = T.main(), it = T.imp(file, '06_ASSETS');
    var sc = Math.max(T.W / it.width, T.HT / it.height) * 100 * 1.02;
    for (var i = 0; i < list.length; i++) {
      var l = c.layers.add(it); l.name = 'LEAK_' + list[i][0]; l.audioEnabled = false;
      l.startTime = list[i][0] - list[i][1]; l.inPoint = list[i][0]; l.outPoint = list[i][0] + (dur || 0.45);
      H.opa(l).setValue(opacity || 75); H.scl(l).setValue([sc, sc]); l.blendingMode = BlendingMode.SCREEN;
    }
    return list.length;
  };
  // SFX: file (đường dẫn), t (giây trên timeline), src (giây bắt đầu trong file), len (0 = hết file), db (mức)
  T.sfx = function (file, t, src, len, db) {
    var c = T.main(), l = c.layers.add(T.imp(file, '04_SFX'));
    l.name = 'SFX_' + new File(file).displayName.replace(/\.[^.]+$/, '') + '@' + t.toFixed(2);
    l.startTime = t - (src || 0); l.inPoint = t; if (len) l.outPoint = Math.min(T.DUR, t + len);
    if (db) l.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([db, db]);
    if (l.hasVideo) l.enabled = false;
    l.moveToEnd(); return l;
  };

  // ======================================================================
  // 11. CHẠY GIAI ĐOẠN
  // ======================================================================
  // KHÔNG bọc beginUndoGroup: trong undo group, sourceRectAtTime của text vừa tạo có thể trả 0.
  // Trả SỐ, không trả mảng: ghép chuỗi với mảng (vd 'a:' + H.describe(c)) trong ExtendScript ném "divide by zero".
  T.run = function (fn) { var r = fn(); return (r instanceof Array) ? r.length : r; };
  return 'th-lib ' + T.VERSION + ' ok';
})();
