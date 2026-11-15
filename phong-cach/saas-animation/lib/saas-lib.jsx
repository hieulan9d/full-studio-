// saas-lib.jsx — thư viện dựng SaaS animation trong After Effects qua MCP.
// Nạp (mỗi lần AE khởi động lại):  $.evalFile(File("<đường dẫn>/saas-ae-kit/lib/saas-lib.jsx"));  var H = $.global.H;
// ExtendScript là ES3: không let/const, không arrow function, không JSON.
// Quy ước toạ độ: comp 1920×1080, 30 fps, điểm (0,0) ở góc trên trái.
(function () {
  var H = {};
  H.VERSION = '1.3.0';
  // H.W/H.Hh = KHÔNG GIAN THIẾT KẾ của cảnh (luôn 1920×1080 — mọi hàm cảnh vẽ theo toạ độ này).
  // H.FRAME = khung ra thật của MAIN/ENV: 16:9 1920×1080 hoặc 9:16 1080×1920 (H.setFormat).
  H.W = 1920; H.Hh = 1080; H.FPS = 30;
  H.FRAME = { w: 1920, h: 1080, vertical: false };
  H.setFormat = function (f) {
    // KHÔNG dùng ternary lồng (a ? x : b ? y : z) — ExtendScript tính sai, từng biến '9:16' thành khung vuông.
    if (f === '9:16') H.FRAME = { w: 1080, h: 1920, vertical: true };
    else if (f === '1:1') H.FRAME = { w: 1080, h: 1080, vertical: false, square: true };
    else H.FRAME = { w: 1920, h: 1080, vertical: false };
    return H.FRAME;
  };
  // Comp có kích thước khung ra (MAIN, ENV)
  H.frameComp = function (name, dur, folder) { return H.comp(name, dur, folder, H.FRAME.w, H.FRAME.h); };
  // Đặt layer cảnh (thiết kế 1920×1080) vào khung ra: phóng s (mặc định 1), dời dy px theo chiều dọc khung.
  // 9:16 ở s=1 thấy dải giữa rộng 1080 của cảnh; phần ngoài bị cắt. Xem knowledge/11-khung-doc.md.
  // Khung dọc: bật collapse transformations để nội dung vượt vùng thiết kế 1080 px cao (cửa sổ dashboard,
  // panel nền) không bị cắt thành đường ngang cứng. dx dời ngang (cụm chat lệch phải trong thiết kế → dx âm).
  H.frame = function (layer, s, dy, dx) {
    var F = H.FRAME; H.pos(layer).setValue([F.w / 2 + (dx || 0), F.h / 2 + (dy || 0)]);
    H.scl(layer).setValue([s || 100, s || 100]);
    if (F.vertical) layer.collapseTransformation = true;
    return layer;
  };

  // =====================================================================
  // 1. CƠ BẢN: màu, project, comp
  // =====================================================================
  // Mọi màu trong kit đi qua H.rgb. H.HUE (độ) xoay sắc độ của TẤT CẢ màu → đổi tông cả video bằng một số:
  // 0 = xanh dương (mặc định) · +45 = tím · −30 = xanh lơ/teal · +150 = hồng. Trắng/xám không đổi.
  H.HUE = 0;
  H.rgb = function (hex) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substr(0, 2), 16) / 255, g = parseInt(hex.substr(2, 2), 16) / 255, b = parseInt(hex.substr(4, 2), 16) / 255;
    if (!H.HUE) return [r, g, b];
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d < 1e-6) return [r, g, b];
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h = (h * 60 + H.HUE + 720) % 360 / 360;
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)];
  };
  // Màu giữ nguyên không xoay (vd. màu logo bắt buộc)
  H.rgbRaw = function (hex) { var k = H.HUE; H.HUE = 0; var c = H.rgb(hex); H.HUE = k; return c; };

  H.folder = function (name) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var it = app.project.item(i);
      if (it instanceof FolderItem && it.name === name) return it;
    }
    return app.project.items.addFolder(name);
  };

  H.find = function (name) {
    for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).name === name) return app.project.item(i);
    return null;
  };

  // Thư mục chuẩn của project
  H.setupFolders = function () {
    var f = ['00_MAIN', '01_ENV', '02_SCENES', '03_UI', '04_SFX', '05_MUSIC', '06_ASSETS'];
    for (var i = 0; i < f.length; i++) H.folder(f[i]);
  };

  // Tạo comp mới; comp cũ cùng tên bị xoá (chạy lại được).
  // CẢNH BÁO: xoá comp cũ sẽ xoá luôn các layer đang dùng nó ở comp khác.
  // Muốn giữ tham chiếu (vd. UI dùng ở 2 cảnh) thì dùng H.clearComp.
  H.comp = function (name, dur, folder, w, h) {
    var old = H.find(name); if (old) old.remove();
    var c = app.project.items.addComp(name, w || H.W, h || H.Hh, 1, dur, H.FPS);
    if (folder) c.parentFolder = H.folder(folder);
    c.bgColor = [0, 0, 0];
    return c;
  };
  // Xoá hết layer trong comp nhưng giữ comp (các nơi dùng comp này vẫn nguyên)
  H.clearComp = function (c) { c.time = 0; while (c.numLayers) c.layer(1).remove(); return c; };

  // Thêm comp con vào comp cha
  H.place = function (parent, child, name, start, label) {
    var l = parent.layers.add(child); l.name = name || child.name; l.startTime = start || 0; l.label = label || 9;
    return l;
  };

  // =====================================================================
  // 2. KEYFRAME + EASE
  // =====================================================================
  // style: snap (lao nhanh rồi phanh — kiểu chính của SaaS), smooth (Easy Ease),
  //        soft (start slow end slow — camera trôi), accel (tăng tốc ra khỏi khung), linear
  var STY = { smooth: [33, 33], soft: [80, 80], snap: [8, 92], accel: [92, 8], linear: null };
  H.dims = function (p) {
    if (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL) return 1;
    return (p.value instanceof Array) ? p.value.length : 1;
  };
  H.ease = function (p, k, inInf, outInf) {
    var n = H.dims(p), a = [], b = [];
    for (var d = 0; d < n; d++) { a.push(new KeyframeEase(0, Math.max(0.1, inInf))); b.push(new KeyframeEase(0, Math.max(0.1, outInf))); }
    p.setTemporalEaseAtKey(k, a, b);
  };
  H.anim = function (p, times, values, style) {
    style = style || 'snap';
    for (var i = 0; i < times.length; i++) p.setValueAtTime(times[i], values[i]);
    var s = STY[style];
    for (var k = 1; k <= p.numKeys; k++) {
      var t = p.keyTime(k), idx = -1;
      for (var j = 0; j < times.length; j++) if (Math.abs(times[j] - t) < 0.001) idx = j;
      if (idx < 0) continue;
      if (!s) { p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR); continue; }
      H.ease(p, k, idx === 0 ? 33 : s[1], idx === times.length - 1 ? 33 : s[0]);
    }
    return p;
  };
  // Bounce bằng keyframe (thay plugin Bounce it): from → vượt `over` → to
  H.pop = function (p, t, from, to, dur, over) {
    dur = dur || 0.5; over = (over === undefined) ? 0.1 : over;
    var o;
    if (to instanceof Array) { o = []; for (var i = 0; i < to.length; i++) o.push(to[i] + (to[i] - from[i]) * over); }
    else o = to + (to - from) * over;
    H.anim(p, [t, t + dur * 0.55, t + dur], [from, o, to], 'smooth');
    H.ease(p, p.nearestKeyIndex(t), 33, 8);
    return p;
  };
  // Xoá mọi keyframe của thuộc tính
  H.clearKeys = function (p) { while (p.numKeys) p.removeKey(1); return p; };
  // Nhân giá trị scale (mọi keyframe hoặc giá trị tĩnh) — dùng khi phóng to cả cảnh
  H.mulScale = function (p, f) {
    if (p.numKeys) { for (var k = 1; k <= p.numKeys; k++) { var v = p.keyValue(k); p.setValueAtKey(k, [v[0] * f, v[1] * f]); } }
    else { var w = p.value; p.setValue([w[0] * f, w[1] * f]); }
  };

  // =====================================================================
  // 3. TRUY CẬP LAYER
  // =====================================================================
  H.tr = function (l) { return l.property('ADBE Transform Group'); };
  H.pos = function (l) { return H.tr(l).property('ADBE Position'); };
  H.scl = function (l) { return H.tr(l).property('ADBE Scale'); };
  H.rot = function (l) { return H.tr(l).property('ADBE Rotate Z'); };
  H.rotX = function (l) { return H.tr(l).property('ADBE Rotate X'); };
  H.rotY = function (l) { return H.tr(l).property('ADBE Rotate Y'); };
  H.opa = function (l) { return H.tr(l).property('ADBE Opacity'); };
  H.anc = function (l) { return H.tr(l).property('ADBE Anchor Point'); };
  H.vec = function (l) { return l.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group'); };
  H.efx = function (l, matchOrName) { return l.property('ADBE Effect Parade').property(matchOrName); };

  // Gắn parent AN TOÀN. AE quy đổi transform theo thời điểm đang đứng của comp,
  // nên nếu cha đang có scale ≠ 100 ở đó, con bị bù scale/vị trí sai (đã gặp 192%).
  // Hàm này gắn cha rồi đặt lại vị trí cục bộ và scale theo trạng thái cha ở thời điểm tBase (mặc định 0).
  // Cha không được xoay ở tBase. Chỉ dùng cho layer 2D.
  H.attach = function (child, parent, tBase) {
    tBase = tBase || 0;
    var W = H.pos(child).value, S = H.scl(child).value;
    child.parent = parent;
    var P = H.pos(parent).valueAtTime(tBase, false), A = H.anc(parent).value, PS = H.scl(parent).valueAtTime(tBase, false);
    var sx = PS[0] / 100, sy = PS[1] / 100;
    H.pos(child).setValue([A[0] + (W[0] - P[0]) / sx, A[1] + (W[1] - P[1]) / sy]);
    H.scl(child).setValue([S[0] / sx, S[1] / sy]);
    return child;
  };
  H.attachAll = function (layers, parent, tBase) { for (var i = 0; i < layers.length; i++) H.attach(layers[i], parent, tBase); };

  // =====================================================================
  // 4. TẠO LAYER
  // =====================================================================
  // Shape: o = {kind:'rect'|'ellipse', w,h,r, fill,fillOp, stroke,sw,strokeOp, pos, name, label}
  H.shape = function (comp, o) {
    var l = comp.layers.addShape(); l.name = o.name || 'Shape';
    var g = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'); g.name = o.name || 'Group';
    var c = g.property('ADBE Vectors Group'), s;
    if (o.kind === 'ellipse') { s = c.addProperty('ADBE Vector Shape - Ellipse'); s.property('ADBE Vector Ellipse Size').setValue([o.w, o.h || o.w]); }
    else { s = c.addProperty('ADBE Vector Shape - Rect'); s.property('ADBE Vector Rect Size').setValue([o.w, o.h]); s.property('ADBE Vector Rect Roundness').setValue(o.r || 0); }
    if (o.stroke) {
      var st = c.addProperty('ADBE Vector Graphic - Stroke');
      st.property('ADBE Vector Stroke Color').setValue(H.rgb(o.stroke)); st.property('ADBE Vector Stroke Width').setValue(o.sw || 1);
      if (o.strokeOp !== undefined) st.property('ADBE Vector Stroke Opacity').setValue(o.strokeOp);
    }
    if (o.fill) {
      var f = c.addProperty('ADBE Vector Graphic - Fill');
      f.property('ADBE Vector Fill Color').setValue(H.rgb(o.fill));
      if (o.fillOp !== undefined) f.property('ADBE Vector Fill Opacity').setValue(o.fillOp);
    }
    H.pos(l).setValue(o.pos || [960, 540]);
    l.label = o.label || 10;
    return l;
  };
  H.r = function (comp, name, x, y, w, h, rad, fill, fop, stroke, sw, sop) { return H.shape(comp, { name: name, w: w, h: h, r: rad || 0, fill: fill, fillOp: fop, stroke: stroke, sw: sw, strokeOp: sop, pos: [x, y] }); };
  H.c = function (comp, name, x, y, d, fill, fop, stroke, sw, sop) { return H.shape(comp, { name: name, kind: 'ellipse', w: d, fill: fill, fillOp: fop, stroke: stroke, sw: sw, strokeOp: sop, pos: [x, y] }); };

  // Text: o = {text,size,font,color,pos,just:'c'|'l'|'r',track,name,label}. Anchor đặt giữa chiều cao chữ.
  // Font phải là PostScript name có trên máy (vd. 'Inter-SemiBold', 'SegoeUI-Semibold'). Xem H.fonts().
  H.text = function (comp, o) {
    var l = comp.layers.addText(o.text); l.name = o.name || o.text.substr(0, 20);
    var sp = l.property('ADBE Text Properties').property('ADBE Text Document'), d = sp.value;
    d.resetCharStyle(); d.resetParagraphStyle();
    d.fontSize = o.size || 40; d.font = o.font || H.FONT.regular;
    d.fillColor = H.rgb(o.color || '#ffffff'); d.applyFill = true; d.applyStroke = false;
    d.justification = (o.just === 'l') ? ParagraphJustification.LEFT_JUSTIFY : ((o.just === 'r') ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY);
    d.tracking = o.track || 0;
    sp.setValue(d);
    H.anchorText(l, o.just);
    H.pos(l).setValue(o.pos || [960, 540]);
    l.label = o.label || 9;
    return l;
  };
  H.anchorText = function (l, just) {
    var r = l.sourceRectAtTime(0, false);
    H.anc(l).setValue([just === 'l' ? r.left : (just === 'r' ? r.left + r.width : r.left + r.width / 2), r.top + r.height / 2]);
  };
  // Đổi nội dung/cỡ chữ mà KHÔNG làm mất font (setValue chỉ text sẽ reset font về mặc định)
  H.setText = function (l, text, size, just) {
    var sp = l.property('ADBE Text Properties').property('ADBE Text Document'), d = sp.value;
    var f = d.font, col = d.fillColor;
    if (text !== undefined && text !== null) d.text = text;
    if (size) d.fontSize = size;
    d.font = f; d.fillColor = col; sp.setValue(d);
    H.anchorText(l, just);
    return l;
  };
  H.t = function (comp, name, text, x, y, size, color, font, just) { return H.text(comp, { name: name, text: text, size: size, color: color, font: font, just: just || 'l', pos: [x, y] }); };

  H.FONT = { regular: 'SegoeUI', medium: 'SegoeUI-Semibold', bold: 'SegoeUI-Bold', black: 'SegoeUIBlack' };
  // Chọn font: ưu tiên Inter nếu máy có, không thì Segoe UI. Trả danh sách font tìm được.
  H.pickFonts = function () {
    var want = { regular: ['Inter-Regular', 'Inter'], medium: ['Inter-SemiBold', 'Inter-Medium'], bold: ['Inter-Bold'], black: ['Inter-Black', 'Inter-ExtraBold'] };
    var have = {};
    try { var all = app.fonts.allFonts; for (var i = 0; i < all.length; i++) for (var j = 0; j < all[i].length; j++) have[all[i][j].postScriptName] = 1; } catch (e) { return H.FONT; }
    for (var k in want) for (var m = 0; m < want[k].length; m++) if (have[want[k][m]]) { H.FONT[k] = want[k][m]; break; }
    return H.FONT;
  };
  H.fonts = function (re) {
    var out = []; var all = app.fonts.allFonts;
    for (var i = 0; i < all.length; i++) for (var j = 0; j < all[i].length; j++) if (!re || re.test(all[i][j].postScriptName)) out.push(all[i][j].postScriptName);
    return out;
  };

  H.solid = function (comp, name, hex, w, h) { return comp.layers.addSolid(H.rgb(hex || '#000000'), name, w || comp.width, h || comp.height, 1); };
  H.adj = function (comp, name) { var l = comp.layers.addSolid([0, 0, 0], name, comp.width, comp.height, 1); l.adjustmentLayer = true; l.label = 5; return l; };
  H.null = function (comp, name, pos, is3D) { var n = comp.layers.addNull(); n.name = name; n.label = 1; if (is3D) n.threeDLayer = true; if (pos) H.pos(n).setValue(pos); return n; };

  // Đường gấp khúc / vùng: pts theo toạ độ comp; o = {fill,fillOp,stroke,sw,sop,closed}
  H.path = function (comp, name, pts, o) {
    var l = comp.layers.addShape(); l.name = name; l.label = 10;
    var c = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group');
    var s = new Shape(); s.vertices = pts; s.closed = !!o.closed;
    c.addProperty('ADBE Vector Shape - Group').property('ADBE Vector Shape').setValue(s);
    if (o.stroke) { var st = c.addProperty('ADBE Vector Graphic - Stroke'); st.property('ADBE Vector Stroke Color').setValue(H.rgb(o.stroke)); st.property('ADBE Vector Stroke Width').setValue(o.sw || 1); if (o.sop !== undefined) st.property('ADBE Vector Stroke Opacity').setValue(o.sop); st.property('ADBE Vector Stroke Line Join').setValue(2); st.property('ADBE Vector Stroke Line Cap').setValue(2); }
    if (o.fill) { var f = c.addProperty('ADBE Vector Graphic - Fill'); f.property('ADBE Vector Fill Color').setValue(H.rgb(o.fill)); if (o.fillOp !== undefined) f.property('ADBE Vector Fill Opacity').setValue(o.fillOp); }
    H.anc(l).setValue([0, 0]); H.pos(l).setValue([0, 0]);
    return l;
  };

  // Ngôi sao 4 cánh (icon AI). inner = độ cong cánh (40 mảnh, 70 béo)
  H.star = function (comp, o) {
    var l = comp.layers.addShape(); l.name = o.name || 'ICON_Star';
    var c = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group');
    var s = c.addProperty('ADBE Vector Shape - Star');
    s.property('ADBE Vector Star Type').setValue(1); s.property('ADBE Vector Star Points').setValue(4);
    s.property('ADBE Vector Star Outer Radius').setValue(o.size / 2);
    s.property('ADBE Vector Star Inner Radius').setValue(o.size * (o.fat || 0.11));
    s.property('ADBE Vector Star Inner Roundess').setValue(o.inner === undefined ? 40 : o.inner);
    c.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue(H.rgb(o.fill || '#ffffff'));
    H.pos(l).setValue(o.pos || [960, 540]); l.label = o.label || 9;
    return l;
  };

  // Icon nét mảnh: kind = doc|chart|bell|chat|cal|report|gear|help|grid|search|check|plus|dots|chev|star|user|clip|clock
  H.icon = function (comp, name, kind, x, y, s, col) {
    s = s || 20; col = col || '#9fb2ee'; var h = s / 2, L = [];
    if (kind === 'doc') L.push(H.r(comp, name, x, y, s * 0.75, s, 3, null, 0, col, 1.8));
    else if (kind === 'chart') L.push(H.path(comp, name, [[x - h, y + h], [x - h, y], [x - h * 0.2, y + h], [x - h * 0.2, y - h * 0.6], [x + h * 0.6, y + h], [x + h * 0.6, y - h]], { stroke: col, sw: 2.2 }));
    else if (kind === 'bell') L.push(H.path(comp, name, [[x - h * 0.8, y + h * 0.5], [x - h * 0.6, y - h * 0.3], [x, y - h], [x + h * 0.6, y - h * 0.3], [x + h * 0.8, y + h * 0.5]], { stroke: col, sw: 1.8, closed: true }));
    else if (kind === 'chat') L.push(H.c(comp, name, x, y, s, null, 0, col, 1.8));
    else if (kind === 'cal') { L.push(H.r(comp, name, x, y, s, s * 0.9, 3, null, 0, col, 1.8)); L.push(H.r(comp, name + '_L', x, y - s * 0.15, s, 1.6, 0, col)); }
    else if (kind === 'report') L.push(H.path(comp, name, [[x - h, y + h * 0.6], [x - h * 0.3, y - h * 0.1], [x + h * 0.2, y + h * 0.3], [x + h, y - h * 0.6]], { stroke: col, sw: 2 }));
    else if (kind === 'gear') { L.push(H.c(comp, name, x, y, s, null, 0, col, 1.8)); L.push(H.c(comp, name + '_i', x, y, s * 0.35, null, 0, col, 1.6)); }
    else if (kind === 'help') { L.push(H.c(comp, name, x, y, s, null, 0, col, 1.8)); L.push(H.t(comp, name + '_q', '?', x, y + 1, s * 0.7, col, H.FONT.medium, 'c')); }
    else if (kind === 'grid') { var q = s * 0.4; L.push(H.r(comp, name, x - q / 1.6, y - q / 1.6, q, q, 2, col)); L.push(H.r(comp, name + '_2', x + q / 1.6, y - q / 1.6, q, q, 2, col)); L.push(H.r(comp, name + '_3', x - q / 1.6, y + q / 1.6, q, q, 2, col)); L.push(H.r(comp, name + '_4', x + q / 1.6, y + q / 1.6, q, q, 2, col)); }
    else if (kind === 'search') { L.push(H.c(comp, name, x - s * 0.1, y - s * 0.1, s * 0.7, null, 0, col, 1.8)); L.push(H.path(comp, name + '_h', [[x + s * 0.18, y + s * 0.18], [x + h, y + h]], { stroke: col, sw: 2 })); }
    else if (kind === 'check') L.push(H.path(comp, name, [[x - h * 0.6, y], [x - h * 0.1, y + h * 0.5], [x + h * 0.7, y - h * 0.5]], { stroke: col, sw: 2.2 }));
    else if (kind === 'plus') { L.push(H.r(comp, name, x, y, s * 0.8, 2, 1, col)); L.push(H.r(comp, name + '_v', x, y, 2, s * 0.8, 1, col)); }
    else if (kind === 'dots') { for (var i = -1; i <= 1; i++) L.push(H.c(comp, name + '_' + (i + 2), x, y + i * s * 0.3, s * 0.15, col)); }
    else if (kind === 'chev') L.push(H.path(comp, name, [[x - h * 0.6, y - h * 0.3], [x, y + h * 0.3], [x + h * 0.6, y - h * 0.3]], { stroke: col, sw: 1.8 }));
    else if (kind === 'star') L.push(H.star(comp, { name: name, size: s, fill: col, pos: [x, y] }));
    else if (kind === 'user') { L.push(H.c(comp, name, x, y, s, null, 0, col, 1.8)); L.push(H.c(comp, name + '_h', x, y - s * 0.12, s * 0.32, null, 0, col, 1.6)); }
    else if (kind === 'clip') L.push(H.r(comp, name, x, y, s * 0.45, s, s * 0.22, null, 0, col, 1.8));
    else if (kind === 'clock') { L.push(H.c(comp, name, x, y, s, null, 0, col, 1.8)); L.push(H.path(comp, name + '_n', [[x, y - s * 0.3], [x, y], [x + s * 0.22, y]], { stroke: col, sw: 1.6 })); }
    return L;
  };

  // =====================================================================
  // 5. HIỆU ỨNG
  // =====================================================================
  // Thêm hiệu ứng + đặt giá trị. CẢNH BÁO: thêm hiệu ứng mới làm mất hiệu lực tham chiếu
  // tới hiệu ứng cũ trên cùng layer → lấy lại bằng H.efx(l, tên) sau khi thêm xong.
  H.fx = function (l, match, props, name) {
    var e = l.property('ADBE Effect Parade').addProperty(match);
    if (name) e.name = name;
    if (props) for (var k in props) {
      var p = null; try { p = e.property(k); } catch (x) { p = null; }
      if (!p) throw new Error('Không có thuộc tính "' + k + '" trong ' + match);
      p.setValue(props[k]);
    }
    return e;
  };
  H.blur = function (l, amt) { return H.fx(l, 'ADBE Box Blur2', { 'ADBE Box Blur2-0001': amt, 'ADBE Box Blur2-0002': 3 }); };
  H.gblur = function (l, amt) { return H.fx(l, 'ADBE Gaussian Blur 2', { 'ADBE Gaussian Blur 2-0001': amt }); };
  H.glow = function (l, thr, rad, inten) { return H.fx(l, 'ADBE Glo2', { 'ADBE Glo2-0002': thr, 'ADBE Glo2-0003': rad, 'ADBE Glo2-0004': inten }); };
  H.ramp = function (l, p1, c1, p2, c2) { return H.fx(l, 'ADBE Ramp', { 'ADBE Ramp-0001': p1, 'ADBE Ramp-0002': H.rgb(c1), 'ADBE Ramp-0003': p2, 'ADBE Ramp-0004': H.rgb(c2) }); };
  H.sweep = function (l, t0, t1, x0, x1, y) {
    var e = H.fx(l, 'CC Light Sweep', { 'CC Light Sweep-0002': 20, 'CC Light Sweep-0004': 60, 'CC Light Sweep-0005': 60 });
    H.anim(H.efx(l, 'CC Light Sweep').property('CC Light Sweep-0001'), [t0, t1], [[x0, y || 0], [x1, y || 0]], 'soft');
    return e;
  };

  // Hiện bằng blur + fade (cách chữ/UI vào trong SaaS)
  H.blurIn = function (l, t, dur, amt, fromOp) {
    H.gblur(l, 0);
    var e = l.property('ADBE Effect Parade').property(l.property('ADBE Effect Parade').numProperties);
    H.anim(e.property('ADBE Gaussian Blur 2-0001'), [t, t + dur], [amt || 30, 0], 'snap');
    H.anim(H.opa(l), [t, t + dur * 0.7], [fromOp || 0, 100], 'snap');
    return l;
  };
  H.blurOut = function (l, t, dur, amt) {
    H.gblur(l, 0);
    var e = l.property('ADBE Effect Parade').property(l.property('ADBE Effect Parade').numProperties);
    H.anim(e.property('ADBE Gaussian Blur 2-0001'), [t, t + dur], [0, amt || 30], 'accel');
    H.anim(H.opa(l), [t + dur * 0.3, t + dur], [100, 0], 'accel');
    return l;
  };
  // Tắt (opacity về 0) trong khoảng [t, t+dur] — giữ các key cũ trước t
  H.fadeOut = function (l, t, dur) { var o = H.opa(l); o.setValueAtTime(t, o.valueAtTime(t, false)); o.setValueAtTime(t + (dur || 0.2), 0); };

  // Kính: adjustment layer cùng hình, nằm ngay dưới l (làm mờ + phóng nhẹ thứ phía sau).
  // Adjustment lấy alpha của hình làm vùng tác động → fill phải đặc 100%, bỏ stroke.
  H.glassUnder = function (comp, l, blurAmt, scale) {
    var g = l.duplicate(); g.name = l.name + '_Glass'; g.moveAfter(l); g.adjustmentLayer = true;
    var fx = g.property('ADBE Effect Parade'); while (fx.numProperties > 0) fx.property(1).remove();
    var vg = H.vec(g);
    for (var i = vg.numProperties; i >= 1; i--) {
      var p = vg.property(i);
      if (p.matchName === 'ADBE Vector Graphic - Stroke') p.remove();
      else if (p.matchName === 'ADBE Vector Graphic - Fill') p.property('ADBE Vector Fill Opacity').setValue(100);
    }
    H.blur(g, blurAmt || 30);
    H.fx(g, 'ADBE Geometry2', { 'ADBE Geometry2-0003': scale || 115 });
    return g;
  };
  // Thẻ kính đầy đủ: thân (màu thương hiệu 20–30%) + viền sáng + lớp kính phía dưới
  H.glassCard = function (comp, name, x, y, w, h, rad, brand) {
    var l = H.r(comp, name, x, y, w, h, rad, brand || '#3a5fd8', 22, '#b4ccff', 1.5, 70);
    H.glassUnder(comp, l, 25, 110);
    return l;
  };

  // Vòng tiến độ (hở dưới đáy). Trả {ring, track, end}. end = Trim End (66.7 = đầy vòng)
  H.ring = function (comp, o) {
    var bg = H.shape(comp, { name: (o.name || 'UI_Ring') + '_Track', kind: 'ellipse', w: o.w, stroke: o.track || '#2a3a7a', sw: o.sw || 10, pos: o.pos });
    var l = H.shape(comp, { name: o.name || 'UI_Ring', kind: 'ellipse', w: o.w, stroke: o.color || '#7fc0ff', sw: o.sw || 10, pos: o.pos });
    H.vec(l).property('ADBE Vector Graphic - Stroke').property('ADBE Vector Stroke Line Cap').setValue(2);
    var tr = H.vec(l).addProperty('ADBE Vector Filter - Trim');
    H.vec(bg).addProperty('ADBE Vector Filter - Trim').property('ADBE Vector Trim End').setValue(66.7);
    H.rot(l).setValue(-135); H.rot(bg).setValue(-135);
    return { ring: l, track: bg, end: H.vec(l).property('ADBE Vector Filter - Trim').property('ADBE Vector Trim End') };
  };
  // Số đếm: text + Slider. Keyframe Slider; expression chỉ đổi số thành chữ (được phép).
  H.counter = function (comp, o) {
    var l = H.text(comp, { text: '00%', size: o.size || 40, font: o.font || H.FONT.medium, color: o.color || '#ffffff', pos: o.pos, name: o.name || 'TXT_Counter', just: o.just });
    var sl = l.property('ADBE Effect Parade').addProperty('ADBE Slider Control'); sl.name = 'Value';
    l.property('ADBE Text Properties').property('ADBE Text Document').expression = (o.prefix ? '"' + o.prefix + '" + ' : '') + 'Math.round(effect("Value")("Slider")) + "' + (o.suffix === undefined ? '%' : o.suffix) + '"';
    return { layer: l, value: H.efx(l, 'Value').property('ADBE Slider Control-0001') };
  };
  // Gõ chữ: animator opacity 0 + keyframe Start 0→100 trong [t0,t1]
  H.typewriter = function (l, t0, t1) {
    var an = l.property('ADBE Text Properties').property('ADBE Text Animators').addProperty('ADBE Text Animator'); an.name = 'Typewriter';
    an.property('ADBE Text Animator Properties').addProperty('ADBE Text Opacity').setValue(0);
    var sel = an.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
    sel.property('ADBE Text Range Advanced').property('ADBE Text Range Type2').setValue(1);
    sel.property('ADBE Text Range Advanced').property('ADBE Text Selector Smoothness').setValue(0);
    H.anim(sel.property('ADBE Text Percent Start'), [t0, t1], [0, 100], 'linear');
    return l;
  };

  // =====================================================================
  // 6. MÔI TRƯỜNG (nền chung) — theo bảng màu P (xem H.palette)
  // =====================================================================
  // Bảng màu mặc định "tối xanh". Đổi theo thương hiệu: H.palette({accent:'#7b5cff', ...})
  H.P = { bgTop: '#000208', bgBottom: '#020a1e', beam: '#4f8dff', beamWide: '#1d4fd8', haze: '#0b2670', rim: '#9fd2ff', halo: '#3a7bff', atm: '#1c4bd0', accent: '#5fb4ff', glass: '#3a5fd8', text: '#e8efff', muted: '#8fa3e0', windowTop: '#22379a', windowBottom: '#0a1240' };
  H.palette = function (o) { for (var k in o) H.P[k] = o[k]; return H.P; };

  // ENV_Space: nền gradient, sao, quầng mờ, cột sáng rọi từ trên (thở nhẹ). dur = độ dài video.
  H.buildEnvSpace = function (dur) {
    var P = H.P, env = H.frameComp('ENV_Space', dur, '01_ENV'), W = env.width, Ht = env.height, cx = W / 2, k = Ht / 1080;
    var bg = H.solid(env, 'BG_Gradient', '#000000'); bg.label = 8;
    H.ramp(bg, [cx, 0], P.bgTop, [cx, Ht], P.bgBottom);
    var st = H.solid(env, 'ENV_Stars', '#000000'); st.label = 8;
    H.fx(st, 'ADBE Fractal Noise', { 'ADBE Fractal Noise-0004': 600, 'ADBE Fractal Noise-0005': -290, 'ADBE Fractal Noise-0010': 3.5, 'ADBE Fractal Noise-0015': 1 });
    H.efx(st, 'ADBE Fractal Noise').property('ADBE Fractal Noise-0023').expression = 'time*12';
    st.blendingMode = BlendingMode.SCREEN; H.opa(st).setValue(18);
    var hz = H.shape(env, { name: 'ENV_Haze', kind: 'ellipse', w: 1900, h: 1400 * k, fill: P.haze, pos: [cx, 380 * k] });
    H.blur(hz, 300); hz.blendingMode = BlendingMode.ADD; H.opa(hz).setValue(22);
    var bw = H.shape(env, { name: 'ENV_Beam_Wide', w: 520, h: 1500 * k, fill: P.beamWide, pos: [cx, 150 * k] });
    H.blur(bw, 170); bw.blendingMode = BlendingMode.ADD; H.opa(bw).setValue(32);
    var bc = H.shape(env, { name: 'ENV_Beam_Core', w: 150, h: 1150 * k, fill: P.beam, pos: [cx, 60 * k] });
    H.blur(bc, 65); bc.blendingMode = BlendingMode.ADD;
    var ts = [], vs = []; for (var t = 0; t <= dur; t += 2) { ts.push(t); vs.push((t / 2) % 2 ? 40 : 50); }
    H.anim(H.opa(bc), ts, vs, 'soft');
    return env;
  };
  // ENV_Planet: "hành tinh" có vòng chân trời phát sáng ở đáy khung (đỉnh vòng ở y=950)
  H.buildEnvPlanet = function (dur) {
    // đỉnh vòng ở 88% chiều cao khung; ở khung dọc dùng bán kính nhỏ hơn cho cong rõ hơn
    var P = H.P, pl = H.frameComp('ENV_Planet', dur, '01_ENV'), cx = pl.width / 2, top = pl.height * 0.88, R = pl.width < pl.height ? 2000 : 2800, cy = top + R / 2;
    var atm = H.shape(pl, { name: 'Planet_Atmosphere', kind: 'ellipse', w: R + 140, fill: P.atm, pos: [cx, cy] });
    H.blur(atm, 140); atm.blendingMode = BlendingMode.ADD; H.opa(atm).setValue(40);
    var halo = H.shape(pl, { name: 'Planet_Halo', kind: 'ellipse', w: R, stroke: P.halo, sw: 60, pos: [cx, cy] });
    H.blur(halo, 70); halo.blendingMode = BlendingMode.ADD;
    var hot = H.shape(pl, { name: 'Planet_Hotspot', kind: 'ellipse', w: 1300, h: 160, fill: '#5fa0ff', pos: [cx, top + 5] });
    H.blur(hot, 120); hot.blendingMode = BlendingMode.ADD; H.opa(hot).setValue(35);
    var body = H.shape(pl, { name: 'Planet_Body', kind: 'ellipse', w: R, fill: '#02050f', fillOp: 75, pos: [cx, cy] });
    H.ramp(body, [cx, top], '#163a8c', [cx, top + 450], '#030a20');
    var rim = H.shape(pl, { name: 'Planet_Rim', kind: 'ellipse', w: R, stroke: P.rim, sw: 5, pos: [cx, cy] });
    H.glow(rim, 30, 40, 1.5);
    return pl;
  };
  // Lớp chỉnh tổng ở trên cùng MAIN: chỉnh màu (giảm bão hoà, tăng tương phản), bloom nhẹ, vignette
  H.finishMain = function (main) {
    var gr = H.adj(main, 'ADJ_Grade');
    var hs = gr.property('ADBE Effect Parade').addProperty('ADBE HUE SATURATION');
    hs.property('ADBE HUE SATURATION-0004').setValue(-8); hs.property('ADBE HUE SATURATION-0005').setValue(-28);
    var bc = gr.property('ADBE Effect Parade').addProperty('ADBE Brightness & Contrast 2');
    bc.property('ADBE Brightness & Contrast 2-0001').setValue(-12); bc.property('ADBE Brightness & Contrast 2-0002').setValue(22);
    var vg = H.solid(main, 'VIG_Vignette', '#000000'); vg.label = 5;
    var m = vg.property('ADBE Mask Parade').addProperty('ADBE Mask Atom'), sh = new Shape();
    var mx = main.width / 2, my = main.height / 2, rx = main.width * 0.625, ry = main.height * 0.625, kx = 0.5523 * rx, ky = 0.5523 * ry;
    sh.vertices = [[mx, my - ry], [mx + rx, my], [mx, my + ry], [mx - rx, my]];
    sh.inTangents = [[-kx, 0], [0, -ky], [kx, 0], [0, ky]]; sh.outTangents = [[kx, 0], [0, ky], [-kx, 0], [0, -ky]]; sh.closed = true;
    m.property('ADBE Mask Shape').setValue(sh); m.inverted = true; m.property('ADBE Mask Feather').setValue([500, 500]);
    H.opa(vg).setValue(55);
    var bl = H.adj(main, 'ADJ_Bloom'); H.glow(bl, 82, 70, 0.35);
    vg.moveToBeginning(); gr.moveToBeginning(); bl.moveToBeginning();
    return main;
  };

  // =====================================================================
  // 7. KHỐI CẢNH DỰNG SẴN (đã chạy được trong bản NeuraFlow v4)
  //    Mọi hàm nhận o = {...} và trả về comp cảnh. Thời gian là thời gian cục bộ của cảnh.
  // =====================================================================

  // Logo: ngôi sao xoay về thẳng + wordmark blur→nét. o = {name, dur, word, scale, outAt}
  H.sceneLogo = function (o) {
    var c = H.comp(o.name || 'S01_Logo', o.dur || 1.5, '02_SCENES');
    var g = H.null(c, 'NULL_Logo', [960, 540]);
    var txt = H.text(c, { name: 'TXT_Wordmark', text: o.word || 'Brand', size: 118, font: H.FONT.medium, color: '#d6e4ff', just: 'l', pos: [745, 540] });
    H.ramp(txt, [0, -60], '#ffffff', [0, 60], '#9dbcff');
    var ico = H.star(c, { name: 'ICON_Star', size: 92, pos: [680, 540] }); H.glow(ico, 40, 25, 1.2);
    // căn giữa cả cụm theo độ rộng chữ thật
    var w = txt.sourceRectAtTime(0, false).width, total = 92 + 25 + w, x0 = 960 - total / 2;
    H.pos(ico).setValue([x0 + 46, 540]); H.pos(txt).setValue([x0 + 92 + 25, 540]);
    txt.parent = g; ico.parent = g;
    H.blurIn(txt, 0, 0.45, 28, 0);
    H.anim(H.rot(ico), [0, 0.45], [45, 0], 'snap');
    H.anim(H.scl(ico), [0, 0.45], [[60, 60], [100, 100]], 'snap');
    var s = o.scale || H.logoScale(o.word);
    H.anim(H.scl(g), [0, 0.85], [[s * 0.96, s * 0.96], [s, s]], 'soft');
    if (o.outAt !== undefined) {
      H.anim(H.pos(g), [o.outAt, o.outAt + 0.45], [[960, 540], [960, 760]], 'accel');
      H.fadeOut(ico, o.outAt + 0.03, 0.24); H.fadeOut(txt, o.outAt + 0.03, 0.24);
    }
    H.cue(c, 0.02, 'sparkle'); if (o.outAt !== undefined) H.cue(c, o.outAt, 'whoosh_fast');
    return c;
  };

  // Tiêu đề có chấm sáng + 2 vạch + dòng phụ có vệt sáng. Thêm vào comp c. Trả mảng layer.
  H.titleBlock = function (c, title, sub, t, y) {
    y = y || 120;
    var orb = H.c(c, 'ICON_Orb', 960, y, 46, '#d6ecff'); H.glow(orb, 20, 30, 2);
    H.pop(H.scl(orb), t, [0, 0], [100, 100], 0.4, 0.15);
    var lL = H.r(c, 'UI_Line_L', 935, y, 170, 2, 0, '#79a6ff'), lR = H.r(c, 'UI_Line_R', 985, y, 170, 2, 0, '#79a6ff');
    H.anc(lL).setValue([85, 0]); H.anc(lR).setValue([-85, 0]);
    H.anim(H.scl(lL), [t + 0.1, t + 0.5], [[0, 100], [100, 100]], 'snap'); H.anim(H.scl(lR), [t + 0.1, t + 0.5], [[0, 100], [100, 100]], 'snap');
    var tt = H.text(c, { name: 'TXT_Title', text: title, size: 62, font: H.FONT.medium, pos: [960, y + 102] });
    var ts = sub ? H.text(c, { name: 'TXT_Sub', text: sub, size: 44, color: '#a9bdf0', pos: [960, y + 172] }) : null;
    H.blurIn(tt, t + 0.05, 0.45, 25);
    var out = [orb, lL, lR, tt];
    if (ts) { H.blurIn(ts, t + 0.17, 0.45, 25); H.sweep(ts, t + 0.35, t + 1.45, -200, 900, 30); out.push(ts); }
    return out;
  };

  // Thẻ UI 3D cho trụ thẻ (360×480): kính xanh đậm, icon trong vòng, 3 vạch chữ
  H.cardComp = function (name, iconKind, brand) {
    var old = H.find(name); if (old) old.remove();
    var k = app.project.items.addComp(name, 360, 480, 1, 10, H.FPS); k.parentFolder = H.folder('03_UI');
    var bg = H.r(k, 'CARD_BG', 180, 240, 352, 472, 26, brand || '#2a5ae0', 92, '#b4d0ff', 2, 55);
    H.ramp(bg, [180, 0], '#244fc4', [180, 480], '#060d2e');
    var sh = H.r(k, 'CARD_Shine', 180, 100, 352, 200, 26, '#ffffff'); H.blur(sh, 60); H.opa(sh).setValue(7);
    var ring = H.c(k, 'ICON_Ring', 180, 190, 96, '#6a9cff', 20, '#d8ecff', 2.5); H.glow(ring, 70, 25, 0.7);
    H.icon(k, 'ICON', iconKind || 'star', 180, 190, 40, '#ffffff');
    for (var j = 0; j < 3; j++) H.r(k, 'CARD_Line_' + (j + 1), 180, 330 + j * 26, 220 - j * 50, 9, 4, '#b4d0ff', 45 - j * 10);
    return k;
  };

  // Trụ thẻ 3D: thẻ giữa → 3 thẻ phẳng → dải UỐN DẦN thành vòng (không cross-fade) → xoay + nghiêng.
  // o = {name, dur, cards:[comp,...8], tFlat:1.3, tRound:2.15, spinTo:-140, tilt:12}
  // Bí quyết: vị trí từng thẻ tính theo "độ cong" c (0 thẳng → 1 tròn), lấy mẫu dày, key tuyến tính.
  // Góc Rotate Y của thẻ = −θ (quy ước AE ngược với toán học thông thường).
  H.sceneCardRing = function (o) {
    var c = H.comp(o.name || 'S06_Cards', o.dur || 4.4, '02_SCENES'); c.time = 0;
    var Wc = 376, N = 8, R = N * Wc / (2 * Math.PI);
    var nl = H.null(c, 'NULL_Cylinder', [960, 560, R], true); H.pos(nl).setValue([960, 560, R]);
    var A = H.anc(nl).value; if (A.length < 3) A = [A[0], A[1], 0];
    function loc(x, y, z) { return [x + A[0], y + A[1], z + A[2]]; }
    function place(k, cv) { var s = k * Wc; cv = Math.max(cv, 0.0005); var Rc = R / cv, th = s / Rc; return { p: loc(Rc * Math.sin(th), 0, -Rc * Math.cos(th) + Rc - R), r: -th * 180 / Math.PI }; }
    var ks = [0, 1, -1, 2, -2, 3, -3, 4], T0 = o.tFlat || 1.3, T1 = o.tRound || 2.15, S = 10;
    for (var q = 0; q < ks.length; q++) {
      var k = ks[q], L = c.layers.add(o.cards[q % o.cards.length]); L.name = 'CARD_k' + k; L.threeDLayer = true; L.label = 10; L.parent = nl;
      var P = H.pos(L), RY = H.rotY(L), O = H.opa(L);
      if (k === 0) { P.setValueAtTime(0, loc(0, 0, -R + 140)); P.setValueAtTime(0.55, loc(0, 0, -R)); }
      else if (Math.abs(k) === 1) { var sg = k > 0 ? 1 : -1; P.setValueAtTime(0.3, loc(sg * (Wc + 90), 0, -R + 120)); P.setValueAtTime(0.85, loc(sg * Wc, 0, -R)); }
      P.setValueAtTime(T0, place(k, 0).p); RY.setValueAtTime(T0, 0);
      for (var i = 1; i <= S; i++) { var u = i / S, e = 1 - Math.pow(1 - u, 3), pl = place(k, e), t = T0 + (T1 - T0) * u; P.setValueAtTime(t, pl.p); RY.setValueAtTime(t, pl.r); }
      for (var n = 1; n <= P.numKeys; n++) P.setInterpolationTypeAtKey(n, KeyframeInterpolationType.LINEAR);
      for (var n2 = 1; n2 <= RY.numKeys; n2++) RY.setInterpolationTypeAtKey(n2, KeyframeInterpolationType.LINEAR);
      if (Math.abs(k) <= 1) { P.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER); P.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER); H.ease(P, 1, 33, 8); H.ease(P, 2, 92, 33); }
      if (k === 0) H.anim(O, [0, 0.2], [0, 100], 'linear');
      else if (Math.abs(k) === 1) H.anim(O, [0.3, 0.6], [0, 100], 'linear');
      else H.anim(O, [T0 + 0.15, T0 + 0.6], [0, 100], 'linear');
      // thẻ quay lưng về camera thì tối đi (expression hợp lệ: chạy theo góc, không có nhịp để chỉnh)
      O.expression = 'var f = toWorldVec([0,0,1])[2];\nvalue * (f > 0 ? linear(f, 0, 0.35, 0.4, 1) : linear(f, 0, -0.4, 0.4, 0.12));';
    }
    H.anim(H.rotY(nl), [T0 + 0.3, c.duration], [0, o.spinTo || -140], 'soft');
    H.anim(H.rotX(nl), [T0 + 0.3, T0 + 1.8], [0, o.tilt === undefined ? 12 : o.tilt], 'soft');
    H.anim(H.pos(nl), [T0 + 0.2, T0 + 1.8], [[960, 560, R], [960, 570, R + 60]], 'soft');
    var pu = H.shape(c, { name: 'FX_Purple', kind: 'ellipse', w: 1200, h: 700, fill: '#7a3dff', pos: [1500, 1050], label: 11 });
    H.blur(pu, 220); pu.blendingMode = BlendingMode.ADD; H.anim(H.opa(pu), [T0, c.duration - 1.0, c.duration - 0.7], [0, 70, 90], 'soft');
    H.cue(c, 0, 'whoosh'); H.cue(c, 0.3, 'pop'); H.cue(c, T0, 'whoosh'); H.cue(c, T1, 'shimmer');
    return c;
  };

  // Ngôi sao morph: sao hồng-tím mềm nuốt cảnh trước (track matte), chuyển trắng, thu thành icon tại (ix,iy).
  // o = {name, inner: comp cảnh trước, innerOffset: giây (startTime âm), iconPos:[x,y], iconScale: % so với sao 1800px}
  H.sceneStarMorph = function (o) {
    var c = H.comp(o.name || 'S07_Star', o.dur || 1.5, '02_SCENES'); c.time = 0;
    var nS = H.null(c, 'NULL_Star', [960, 540]);
    var inner = c.layers.add(o.inner); inner.name = 'INNER_' + o.inner.name; inner.startTime = -(o.innerOffset || 0);
    var fill = H.star(c, { name: 'STAR_Fill', size: 1800, fill: '#a64dff', fat: 0.133, inner: 70, label: 11 });
    H.fx(fill, 'ADBE 4ColorGradient', { 'ADBE 4ColorGradient-0001': [560, 240], 'ADBE 4ColorGradient-0002': H.rgb('#d46cf0'), 'ADBE 4ColorGradient-0003': [1360, 240], 'ADBE 4ColorGradient-0004': H.rgb('#5fb8ff'), 'ADBE 4ColorGradient-0005': [560, 840], 'ADBE 4ColorGradient-0006': H.rgb('#8e5cf2'), 'ADBE 4ColorGradient-0007': [1360, 840], 'ADBE 4ColorGradient-0008': H.rgb('#c05ee8') });
    H.fx(fill, 'ADBE Tint', { 'ADBE Tint-0001': H.rgb('#ffffff'), 'ADBE Tint-0002': H.rgb('#ffffff'), 'ADBE Tint-0003': 0 }, 'Tint_White');
    H.fx(fill, 'ADBE Gaussian Blur 2', { 'ADBE Gaussian Blur 2-0001': 45, 'ADBE Gaussian Blur 2-0003': 0 }, 'Soft');
    var matte = H.star(c, { name: 'STAR_Matte', size: 1800, fat: 0.133, inner: 70, label: 11 }); H.scl(matte).setValue([78, 78]);
    H.fx(matte, 'ADBE Gaussian Blur 2', { 'ADBE Gaussian Blur 2-0001': 30 });
    fill.moveToEnd(); inner.moveBefore(fill); matte.moveBefore(inner);
    inner.setTrackMatte(matte, TrackMatteType.ALPHA);
    fill.parent = nS; matte.parent = nS;
    // mặc định: bay về icon của S08_End vừa dựng (dựng S08 trước S07); cỡ sao 1800 px → icon 92 px × scale logo
    var ip = o.iconPos || H.lastEndIcon || [554, 497], is = o.iconScale || (H.lastEndScale ? 92 * H.lastEndScale / 1800 : 7.4);
    H.anim(H.scl(nS), [0, 0.35, 0.72, 1.15], [[175, 175], [130, 130], [42, 42], [is, is]], 'snap');
    H.anim(H.rot(nS), [0, 0.65, 1.15], [-20, 30, 90], 'snap');
    H.anim(H.pos(nS), [0.85, 1.2], [[960, 540], ip], 'snap');
    H.anim(H.scl(inner), [0, 0.28, 0.65], [[100, 100], [100, 100], [45, 45]], 'snap');
    H.anim(H.opa(inner), [0.45, 0.7], [100, 0], 'linear');
    H.anim(H.efx(fill, 'Tint_White').property('ADBE Tint-0003'), [0.45, 0.8], [0, 100], 'snap');
    H.anim(H.efx(fill, 'Soft').property('ADBE Gaussian Blur 2-0001'), [0.4, 0.9], [45, 0], 'snap');
    H.anim(H.opa(fill), [0, 0.08], [0, 100], 'linear');
    H.cue(c, 0, 'riser'); H.cue(c, 0, 'impact'); H.cue(c, 0.75, 'sparkle');
    return c;
  };

  // Vòng "New Updates": vòng kính giữa, 2 quỹ đạo, chữ 2 dòng, 6 bong bóng icon bay vào rồi quay.
  // o = {name, dur, line1, line2, icons:['star','doc',...]}
  H.sceneOrbit = function (o) {
    var c = H.comp(o.name || 'S04_Updates', o.dur || 2.25, '02_SCENES'); c.time = 0;
    var sc = H.null(c, 'NULL_Scene', [960, 540]);
    function orbit(name, d, op, t) {
      var l = H.shape(c, { name: name, kind: 'ellipse', w: d, stroke: '#5c9bff', sw: 4.5, strokeOp: op, pos: [960, 540] });
      var tr = H.vec(l).addProperty('ADBE Vector Filter - Trim');
      H.anim(H.vec(l).property('ADBE Vector Filter - Trim').property('ADBE Vector Trim End'), [t, t + 0.6], [0, 78], 'snap');
      H.glow(l, 30, 20, 1); H.anim(H.rot(l), [0, c.duration], [-40, 10], 'linear');
      return l;
    }
    var L = [orbit('RING_Orbit_Inner', 900, 90, 0.15), orbit('RING_Orbit_Outer', 1380, 60, 0.25)];
    var halo = H.c(c, 'RING_Halo', 960, 540, 560, '#1d4fd8'); H.blur(halo, 90); halo.blendingMode = BlendingMode.ADD; H.anim(H.opa(halo), [0, 0.4], [0, 60], 'snap');
    var core = H.c(c, 'RING_Glass', 960, 540, 470, '#081440', 85);
    var rim = H.c(c, 'RING_Rim', 960, 540, 470, null, 0, '#a8d4ff', 3); H.glow(rim, 40, 30, 1.4);
    var inr = H.c(c, 'RING_Inner', 960, 540, 400, null, 0, '#4f8dff', 1.5, 60);
    H.anim(H.scl(core), [0, 0.4], [[135, 135], [100, 100]], 'snap'); H.anim(H.opa(core), [0, 0.15], [0, 100], 'linear');
    H.anim(H.scl(rim), [0, 0.4], [[135, 135], [100, 100]], 'snap'); H.anim(H.opa(rim), [0, 0.15], [0, 100], 'linear');
    H.anim(H.scl(inr), [0.05, 0.45], [[140, 140], [100, 100]], 'snap');
    var tn = H.text(c, { name: 'TXT_Line1', text: o.line1 || 'New', size: 150, font: H.FONT.bold, pos: [960, 500] });
    H.ramp(tn, [0, -70], '#ffffff', [0, 70], '#a9c8ff');
    var tu = H.text(c, { name: 'TXT_Line2', text: o.line2 || 'Updates', size: 80, font: H.FONT.medium, color: '#cfe0ff', track: 40, pos: [960, 600] });
    H.blurIn(tn, 0.15, 0.45, 30); H.blurIn(tu, 0.38, 0.45, 30);
    L.push(halo, core, rim, inr, tn, tu);
    var orbN = H.null(c, 'NULL_Orbit', [960, 540]);
    var icons = o.icons || ['star', 'doc', 'star', 'chart', 'star', 'doc'], angs = [-60, -10, 40, 110, 165, 220], R = 450;
    for (var i = 0; i < 6; i++) {
      var a = angs[i] * Math.PI / 180, x = 960 + R * Math.cos(a), y = 540 + R * Math.sin(a);
      var b = H.c(c, 'BUBBLE_' + (i + 1), x, y, 154, '#173a9c', 40, '#8fc0ff', 2); H.glow(b, 70, 20, 0.6);
      var ic = H.icon(c, 'ICON_Bubble_' + (i + 1), icons[i], x, y, 52, '#ffffff');
      var bn = H.null(c, 'NULL_Bubble_' + (i + 1), [x, y]);
      b.parent = bn; for (var j = 0; j < ic.length; j++) ic[j].parent = bn;
      bn.parent = orbN;
      // bn giờ ở toạ độ cục bộ của NULL_Orbit → đặt key theo cục bộ
      var Ao = H.anc(orbN).value, t = 0.2 + i * 0.07;
      H.anim(H.pos(bn), [t, t + 0.6], [[Ao[0] + 1000 * Math.cos(a), Ao[1] + 1000 * Math.sin(a)], [Ao[0] + R * Math.cos(a), Ao[1] + R * Math.sin(a)]], 'snap');
      H.anim(H.scl(bn), [t, t + 0.6], [[60, 60], [100, 100]], 'snap');
      H.anim(H.rot(bn), [0.2, c.duration], [0, -32], 'linear');
    }
    H.anim(H.rot(orbN), [0.2, c.duration], [0, 32], 'linear');
    orbN.parent = sc; for (var m = 0; m < L.length; m++) L[m].parent = sc;
    H.anim(H.scl(sc), [0.3, c.duration - 0.15], [[123, 123], [111, 111]], 'soft');
    H.exitBlur(c, c.duration - 0.3, 0.25);
    H.cue(c, 0, 'impact'); H.cue(c, 0.2, 'pop'); H.cue(c, 0.34, 'pop'); H.cue(c, 0.48, 'pop'); H.cue(c, 0.15, 'shimmer'); H.cue(c, c.duration - 0.3, 'whoosh_fast');
    return c;
  };

  // Chat: gõ câu hỏi → gửi (bong bóng trượt lên) → AI "•••" → thẻ trả lời kính, chữ hiện từng dòng.
  // o = {name, dur, user, question, aiName, answer:[dòng...], scale}
  H.sceneChat = function (o) {
    var c = H.comp(o.name || 'S05_Chat', o.dur || 4.15, '02_SCENES'); c.time = 0;
    var grid = H.solid(c, 'BG_Grid', '#000000'); grid.label = 8;
    H.fx(grid, 'ADBE Grid', { 'ADBE Grid-0002': 3, 'ADBE Grid-0004': 160, 'ADBE Grid-0005': 160, 'ADBE Grid-0006': 1.2, 'ADBE Grid-0012': H.rgb('#4f7fe8') });
    grid.blendingMode = BlendingMode.ADD; H.anim(H.opa(grid), [1.9, 2.6], [0, 22], 'soft');
    // câu hỏi
    var inp = H.r(c, 'CHAT_Input', 960, 540, 640, 66, 14, '#2f62e6', 55, '#9cc2ff', 1.5, 80);
    H.ramp(inp, [640, 540], '#14214f', [1280, 540], '#3a7bff'); var inpG = H.glassUnder(c, inp, 20, 108);
    var q = H.t(c, 'TXT_Question', o.question || 'How can I help?', 668, 541, 25, '#e8f0ff'); H.typewriter(q, 0, 0.65);
    var qr = q.sourceRectAtTime(0, false);
    var cur = H.r(c, 'UI_Caret', 668, 541, 2, 30, 0, '#ffffff'); H.anim(H.pos(cur), [0, 0.65], [[668, 541], [672 + qr.width, 541]], 'linear');
    H.opa(cur).setValueAtTime(0.7, 100); H.opa(cur).setValueAtTime(0.71, 0);
    var usr = H.t(c, 'TXT_User', o.user || 'User', 646, 488, 16, '#8fa6e6');
    var av = H.c(c, 'AVATAR_User', 588, 540, 50, '#2b4fc4', 60, '#a8c8ff', 2); var avI = H.icon(c, 'AVATAR_Icon', 'user', 588, 540, 24, '#cfe0ff');
    H.anim(H.opa(usr), [0.3, 0.5], [0, 100], 'snap'); H.pop(H.scl(av), 0.3, [0, 0], [100, 100], 0.45, 0.12);
    var qN = H.null(c, 'NULL_Question', [960, 540]);
    var qs = [inp, inpG, q, cur, usr, av].concat(avI); for (var i = 0; i < qs.length; i++) qs[i].parent = qN;
    H.anim(H.pos(qN), [0.72, 1.05], [[960, 540], [840, 360]], 'snap'); H.anim(H.scl(qN), [0.72, 1.05], [[100, 100], [86, 86]], 'snap');
    // AI
    var aiN = H.null(c, 'NULL_AI', [960, 540]);
    var ai = H.c(c, 'AI_Orb', 1255, 520, 60, '#16348f', 80, '#b8d4ff', 2); H.glow(ai, 80, 24, 0.35);
    var aiS = H.star(c, { name: 'AI_Orb_Star', size: 30, pos: [1255, 520] });
    var aiT = H.t(c, 'TXT_AI', o.aiName || 'AI Agent', 1222, 478, 15, '#8fa6e6', null, 'r');
    var ais = [ai, aiS, aiT];
    for (var d = 0; d < 3; d++) {
      var dot = H.c(c, 'AI_Dot_' + (d + 1), 1175 + d * 20, 522, 12, '#cfe0ff'); var dp = H.pos(dot), t0 = 1.05 + d * 0.08;
      for (var kk = 0; kk < 4; kk++) { dp.setValueAtTime(t0 + kk * 0.24, [1175 + d * 20, 522]); dp.setValueAtTime(t0 + kk * 0.24 + 0.12, [1175 + d * 20, 512]); }
      H.anim(H.opa(dot), [1.0 + d * 0.08, 1.12 + d * 0.08, 1.85, 1.95], [0, 100, 100, 0], 'linear'); ais.push(dot);
    }
    for (var z = 0; z < ais.length; z++) ais[z].parent = aiN;
    H.pop(H.scl(ai), 0.85, [0, 0], [100, 100], 0.5, 0.15); H.pop(H.scl(aiS), 0.95, [0, 0], [100, 100], 0.5, 0.2);
    H.anim(H.rot(aiS), [0.95, c.duration], [0, 180], 'linear'); H.anim(H.opa(aiT), [1.1, 1.3], [0, 100], 'snap');
    // thẻ trả lời: dựng ở trạng thái gốc, gắn null, RỒI mới keyframe null (tránh lỗi scale 0)
    var lines = o.answer || ['Answer line one.', 'Answer line two.'];
    var aN = H.null(c, 'NULL_Answer', [930, 555]);
    var hCard = 60 + lines.length * 36;
    var ans = H.r(c, 'CARD_Answer', 930, 555 + hCard / 2, 640, hCard, 16, '#2a5ae0', 30, '#a8c8ff', 1.5, 75);
    H.ramp(ans, [930, 555], '#3a7bff', [930, 555 + hCard], '#101c4a'); var ansG = H.glassUnder(c, ans, 25, 110);
    var tl = []; for (var m = 0; m < lines.length; m++) tl.push(H.t(c, 'TXT_Answer_' + (m + 1), lines[m], 640, 600 + m * 36, 17, '#dbe6ff'));
    var all = [ans, ansG].concat(tl); for (var n = 0; n < all.length; n++) all[n].parent = aN;
    H.anim(H.scl(aN), [1.9, 2.25], [[100, 0], [100, 100]], 'snap');
    H.anim(H.opa(ans), [1.9, 2.0], [0, 85], 'linear'); H.anim(H.opa(ansG), [1.9, 2.0], [0, 100], 'linear');
    for (var p = 0; p < tl.length; p++) H.blurIn(tl[p], 2.3 + p * 0.18, 0.4, 14);
    // cả cảnh: phóng to cho lấp khung + trôi
    var sc = H.null(c, 'NULL_Scene', [960, 540]); qN.parent = sc; aiN.parent = sc; aN.parent = sc;
    var s = o.scale || 145;
    // cụm chat (câu hỏi x≈588–1280, AI x≈1255) lệch trái so với tâm → đẩy null sang phải để cả cụm nằm giữa khung
    H.anim(H.pos(sc), [1.1, c.duration - 0.1], [[1190, 580], [1170, 565]], 'soft');
    H.anim(H.scl(sc), [1.1, c.duration - 0.1], [[s, s], [s * 1.04, s * 1.04]], 'soft');
    H.exitBlur(c, c.duration - 0.25, 0.22);
    H.cue(c, 0, 'typing', 0.68); H.cue(c, 0.72, 'swoosh_up'); H.cue(c, 0.85, 'pop'); H.cue(c, 1.05, 'tick'); H.cue(c, 1.29, 'tick'); H.cue(c, 1.53, 'tick'); H.cue(c, 1.9, 'whoosh_fast'); H.cue(c, c.duration - 0.25, 'whoosh_fast');
    return c;
  };

  // End card: logo to (icon + wordmark lộ dần bằng Linear Wipe) + tagline có vệt sáng, cột sáng từ dưới lên.
  // o = {name, dur, word, tagline, scale}. Trả comp; icon nằm ở toạ độ H.endIconPos(scale).
  H.sceneEnd = function (o) {
    var c = H.comp(o.name || 'S08_End', o.dur || 2.75, '02_SCENES'); c.time = 0;
    var bw = H.r(c, 'ENV_BeamUp_Wide', 960, 1050, 700, 900, 0, H.P.beamWide); H.blur(bw, 220); bw.blendingMode = BlendingMode.ADD;
    var bc = H.r(c, 'ENV_BeamUp_Core', 960, 1100, 220, 800, 0, H.P.beam); H.blur(bc, 90); bc.blendingMode = BlendingMode.ADD;
    H.anim(H.opa(bc), [0, 0.5], [0, 85], 'snap'); H.anim(H.opa(bw), [0, 0.5], [0, 60], 'snap');
    var g = H.null(c, 'NULL_Logo', [960, 540]);
    var ico = H.star(c, { name: 'ICON_Star', size: 92, pos: [680, 510] }); H.glow(ico, 40, 25, 1.2);
    H.anim(H.rot(ico), [0, 0.45], [20, 0], 'snap');
    var txt = H.text(c, { name: 'TXT_Wordmark', text: o.word || 'Brand', size: 118, font: H.FONT.medium, color: '#d6e4ff', just: 'l', pos: [745, 510] });
    H.ramp(txt, [0, -60], '#ffffff', [0, 60], '#9dbcff');
    var wp = H.fx(txt, 'ADBE Linear Wipe', { 'ADBE Linear Wipe-0002': 270, 'ADBE Linear Wipe-0003': 120 });
    H.anim(H.efx(txt, 'ADBE Linear Wipe').property('ADBE Linear Wipe-0001'), [0, 0.5], [100, 0], 'snap');
    // căn giữa cụm sao + chữ theo độ rộng chữ thật
    var wd = txt.sourceRectAtTime(0, false).width, x0 = 960 - (92 + 25 + wd) / 2;
    H.pos(ico).setValue([x0 + 46, 510]); H.pos(txt).setValue([x0 + 117, 510]);
    var tg = H.text(c, { name: 'TXT_Tagline', text: o.tagline || '', size: 32, color: '#a9bdf0', pos: [960, 598] });
    H.blurIn(tg, 0.25, 0.45, 20); H.sweep(tg, 0.3, 1.9, -200, 600, 20);
    ico.parent = g; txt.parent = g; tg.parent = g;
    var s = o.scale || H.logoScale(o.word); H.anim(H.scl(g), [0.4, c.duration], [[s, s], [s * 1.03, s * 1.03]], 'soft');
    // vị trí icon trên màn hình lúc vào (để ngôi sao morph bay về đúng chỗ): H.lastEndIcon
    H.lastEndScale = s;
    H.lastEndIcon = [960 + (x0 + 46 - 960) * s / 100, 540 + (510 - 540) * s / 100];
    H.cue(c, 0, 'impact'); H.cue(c, 0.3, 'shimmer'); H.cue(c, 0.05, 'sparkle');
    return c;
  };
  // Cỡ logo (%) để cụm sao + chữ rộng ~1000 px; tên ngắn được phóng to hơn (120–220%)
  H.logoScale = function (word) {
    var t = app.project.items.addComp('__measure', 400, 200, 1, 1, H.FPS);
    var l = H.text(t, { text: word || 'Brand', size: 118, font: H.FONT.medium, just: 'l' });
    var w = l.sourceRectAtTime(0, false).width; t.remove();
    return Math.max(120, Math.min(220, Math.round(100000 / (92 + 25 + w))));
  };
  // Vị trí icon end card trên màn hình sau khi phóng to (để ngôi sao morph bay về đúng chỗ)
  // (Dựng S08_End TRƯỚC S07_Star rồi dùng H.lastEndIcon. Hàm cũ giữ cho tương thích — giả định chữ 'NeuraFlow'.)
  H.endIconPos = function (scale) { if (H.lastEndIcon) return H.lastEndIcon; var f = (scale || 145) / 100; return [960 + (680 - 960) * f, 540 + (510 - 540) * f]; };

  // Blur thoát cảnh (adjustment ở trên cùng)
  H.exitBlur = function (c, t, dur) {
    var ex = H.adj(c, 'ADJ_Exit'); H.gblur(ex, 0);
    H.anim(H.efx(ex, 'ADBE Gaussian Blur 2').property('ADBE Gaussian Blur 2-0001'), [t, t + dur], [0, 40], 'accel');
    ex.moveToBeginning(); return ex;
  };

  // =====================================================================
  // 7b. ÂM THANH — mốc SFX lưu trong comment của comp cảnh (không mất khi AE khởi động lại)
  // =====================================================================
  // H.cue(comp, t, loại, độ dài?) — loại = tên file SFX bỏ đuôi biến thể (whoosh, pop, typing, riser...).
  // riser: t = mốc KẾT THÚC (file được đặt sao cho đuôi trùng t). Còn lại: t = mốc bắt đầu.
  H.cue = function (comp, t, type, dur) {
    comp.comment = (comp.comment ? comp.comment + ';' : 'cues:') + t.toFixed(3) + '|' + type + (dur ? '|' + dur : '');
  };
  H.cues = function (comp) {
    var m = /cues:([^\n]*)/.exec(comp.comment || ''); if (!m) return [];
    var a = m[1].split(';'), out = [];
    for (var i = 0; i < a.length; i++) { var p = a[i].split('|'); if (p.length >= 2) out.push({ t: parseFloat(p[0]), type: p[1], dur: p[2] ? parseFloat(p[2]) : 0 }); }
    return out;
  };
  // Mức (dB) mặc định theo loại; nhạc nền đặt riêng
  H.SFX_DB = { whoosh: -9, whoosh_fast: -11, swoosh_up: -11, pop: -13, click: -15, tick: -19, typing: -15, riser: -10, impact: -6, sparkle: -12, glitch: -13, shimmer: -15 };
  H.importAudio = function (path) {
    var f = new File(path), nm = f.name;
    var it = H.find(decodeURI(nm)) || H.find(nm); if (it) return it;
    it = app.project.importFile(new ImportOptions(f)); it.parentFolder = H.folder(/music/i.test(path) ? '05_MUSIC' : '04_SFX');
    return it;
  };
  H.setDb = function (l, db) { l.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([db, db]); };
  // Rải SFX + nhạc vào main theo mốc của mọi comp cảnh đang đặt trong main.
  // o = {sfxDir:'<KIT>/audio/sfx', music:'<đường dẫn mp3/wav>'|null, musicStart: giây bắt đầu trong bài, musicDb:-6, sfxDb:0, minGap:0.12}
  // Chạy lại được: xoá layer SFX_/MUSIC_ cũ trước.
  H.buildAudio = function (main, o) {
    for (var i = main.numLayers; i >= 1; i--) if (/^(SFX_|MUSIC_)/.test(main.layer(i).name)) main.layer(i).remove();
    var dir = new Folder(o.sfxDir), files = dir.getFiles('*.wav'), byType = {}, k;
    for (k = 0; k < files.length; k++) { var n = decodeURI(files[k].name).replace(/\.wav$/, ''), ty = n.replace(/_[a-z]$/, ''); (byType[ty] = byType[ty] || []).push(files[k].fsName); }
    var placed = [], rot = {}, count = 0;
    for (i = 1; i <= main.numLayers; i++) {
      var L = main.layer(i); if (!(L.source instanceof CompItem)) continue;
      var cs = H.cues(L.source);
      for (var j = 0; j < cs.length; j++) {
        var cu = cs[j], tw = L.startTime + cu.t;
        if (tw < L.inPoint - 0.01 || tw > L.outPoint + 0.01 || tw < 0 || tw > main.duration) continue;
        if (!byType[cu.type]) continue;
        var dup = false; for (var q = 0; q < placed.length; q++) if (placed[q].type === cu.type && Math.abs(placed[q].t - tw) < (o.minGap || 0.12)) dup = true;
        if (dup) continue;
        rot[cu.type] = ((rot[cu.type] || 0) + 1) % byType[cu.type].length;
        var item = H.importAudio(byType[cu.type][rot[cu.type]]);
        var a = main.layers.add(item); a.name = 'SFX_' + cu.type + '_' + L.name; a.label = 14;
        a.startTime = cu.type === 'riser' ? tw - item.duration : tw;
        if (cu.dur) a.outPoint = Math.min(a.startTime + item.duration, tw + cu.dur);
        H.setDb(a, (H.SFX_DB[cu.type] || -12) + (o.sfxDb || 0));
        a.moveToEnd(); placed.push({ t: tw, type: cu.type }); count++;
      }
    }
    if (o.music) {
      var mi = H.importAudio(o.music), ml = main.layers.add(mi); ml.name = 'MUSIC_' + mi.name; ml.label = 14;
      // musicStart: giây trong bài bắt đầu phát (lấy cut15/20/30 trong audio/music/index.json) → đặt layer lùi lại
      ml.startTime = -(o.musicStart || 0); ml.inPoint = 0; ml.outPoint = main.duration; ml.moveToEnd();
      var lv = ml.property('ADBE Audio Group').property('ADBE Audio Levels'), db = o.musicDb === undefined ? -6 : o.musicDb;
      // vào nhẹ 0,3 s (cắt giữa bài không bị "bụp"), ra fade 1,5 s
      lv.setValueAtTime(0, [o.musicStart ? -30 : db, o.musicStart ? -30 : db]); lv.setValueAtTime(0.3, [db, db]);
      lv.setValueAtTime(Math.max(0.4, main.duration - 1.5), [db, db]); lv.setValueAtTime(main.duration, [-48, -48]);
    }
    return count;
  };

  // =====================================================================
  // 8. KIỂM TRA
  // =====================================================================
  // Xuất nhiều khung PNG. LƯU Ý: ghi file BẤT ĐỒNG BỘ — chờ file xuất hiện/đổi giờ rồi mới đọc.
  H.saveFrames = function (comp, times, dir, prefix) {
    var out = [], fd = new Folder(dir); if (!fd.exists) fd.create();   // thư mục chưa có → ghi thất bại im lặng
    for (var i = 0; i < times.length; i++) { var f = new File(dir + '/' + prefix + '_' + (i < 10 ? '0' : '') + i + '.png'); comp.saveFrameToPng(times[i], f); out.push(f.fsName); }
    return out;
  };
  // Liệt kê layer của comp (tên, in/out, parent) — để AI tự kiểm tra cấu trúc
  H.describe = function (comp) {
    var a = [];
    for (var i = 1; i <= comp.numLayers; i++) { var l = comp.layer(i); a.push(i + ' ' + l.name + ' [' + l.inPoint.toFixed(2) + '–' + l.outPoint.toFixed(2) + ']' + (l.parent ? ' ⟵ ' + l.parent.name : '')); }
    return a;
  };

  $.global.H = H;
  return 'saas-lib ' + H.VERSION + ' ok';
})();
