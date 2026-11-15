// ui-dashboard.jsx — dựng giao diện dashboard SaaS chi tiết (mật độ như video mẫu NeuraFlow).
// Cần nạp saas-lib.jsx trước. Nạp: $.evalFile(File(".../saas-ae-kit/lib/ui-dashboard.jsx"));
//
// H.uiDashboard(o) dựng vào comp UI_Dashboard 1600×1120 (giữ comp nếu đã có để không gãy tham chiếu).
// Bố cục đo từ khung hình mẫu (cửa sổ 670px trong ảnh → ×2.39 ra 1600px).
//
// o = {
//   brand: 'NeuraFlow', user: 'Mark Smith', role: 'Personal Account',
//   hello: 'Hello, Mark', ask: 'How can I help you today?',
//   chips: ['Ask AI','Management','New project'],
//   menu:  [['Dashboard','grid'],['Tables','chart'],['Notifications','bell'],['Chat','chat'],['Calendar','cal'],['Reports','report']],
//   active: 'Tables',
//   tSwap: 4.0,           // thời điểm (UI-local) đổi nội dung v1 → v2; null = chỉ dùng v2
//   labels: { search, costs, welcome, evTime, evDay, ev1, ev2, guests, task, taskSub, docs, analytics, leg1, leg2,
//             notifs:[[name,ago],..], ntLabel, nt1, nt2, tag1, tag2, process, processLegend:[[name,pct],..] },
//   v1: { welcome:'Mark Smith', note:'Weekly review and refinement of project prototypes', taskPct:[50,93] },
//   v2: { docs:{files:'1,328 Files', size:'1.3GB', pct:55},
//         analytics:{ months:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], income:[110,170,90,140,200,150,130,120], outcome:[70,100,60,90,120,80,70,60] },
//         tasks:['Initial usability assessment','Update the document','Automate time tracking','Unassigned tasks','Project management','New task','Plan weeks'] }
// }
(function () {
  var H = $.global.H;
  if (!H) throw new Error('Nạp saas-lib.jsx trước');

  var LBL = {};
  function LB(k, d) { return (LBL[k] !== undefined) ? LBL[k] : d; }
  function LBA(k, d) { return LBL[k] || d; }
  var MUTED = '#8fa3e0', DIM = '#6f82c0', CARD = '#3a5fd8', LINE = '#4a62c8';

  function card(c, name, x, y, w, h) { return H.r(c, name, x, y, w, h, 18, CARD, 22, '#7e9cf0', 1, 45); }
  function pill(c, name, x, y, w, h, label, filled) {
    var a = H.r(c, name, x, y, w, h, h / 2, filled ? '#56a8ff' : '#2a3c9a', filled ? 100 : 80, filled ? null : LINE, 1, 70);
    var t = H.t(c, name + '_T', label, x, y, Math.round(h * 0.36), '#ffffff', H.FONT.medium, 'c');
    return [a, t];
  }
  function since(c) { return c.numLayers; }
  function grab(c, n0) { var a = []; for (var i = 1; i <= c.numLayers - n0; i++) a.push(c.layer(i)); return a; }

  // ---------- khung chung ----------
  function shell(c, o) {
    var win = H.r(c, 'UI_Window_BG', 800, 560, 1594, 1114, 34, '#1b2d80', 92, '#8fb8ff', 2, 55);
    H.ramp(win, [800, 0], H.P.windowTop, [800, 1120], H.P.windowBottom);
    H.r(c, 'UI_Window_TopShine', 800, 6, 1400, 3, 2, '#cfe4ff', 55);
    // sidebar
    H.r(c, 'UI_SB_BG', 150, 560, 290, 1100, 26, '#0d1850', 45);
    H.icon(c, 'ICON_SB_Logo', 'star', 44, 62, 24, '#ffffff');
    H.t(c, 'TXT_SB_Logo', o.brand, 64, 62, 29, '#ffffff', H.FONT.medium);
    H.r(c, 'UI_SB_Account', 153, 140, 262, 64, 14, '#24369a', 55, LINE, 1, 60);
    H.c(c, 'UI_SB_Avatar', 52, 140, 38, '#c9d6f5'); H.c(c, 'UI_SB_AvatarHead', 52, 134, 14, '#5a6b9a');
    H.t(c, 'TXT_SB_User', o.user, 80, 130, 18, '#ffffff', H.FONT.medium);
    H.t(c, 'TXT_SB_Role', o.role, 80, 152, 13, MUTED);
    H.icon(c, 'ICON_SB_Chev', 'chev', 262, 140, 14, MUTED);
    var ys = [251, 299, 344, 390, 437, 485];
    for (var i = 0; i < o.menu.length && i < ys.length; i++) {
      var act = (o.menu[i][0] === o.active);
      if (act) H.r(c, 'UI_SB_Active', 153, ys[i], 262, 44, 10, '#2e45b8', 60);
      var col = act ? '#ffffff' : MUTED;
      H.icon(c, 'ICON_SB_' + o.menu[i][0], o.menu[i][1], 50, ys[i], 18, col);
      H.t(c, 'TXT_SB_' + o.menu[i][0], o.menu[i][0], 76, ys[i], 18, col, act ? H.FONT.medium : H.FONT.regular);
    }
    H.t(c, 'TXT_SB_Pref', 'PREFERENCE', 40, 550, 13, DIM, H.FONT.medium);
    H.icon(c, 'ICON_SB_Settings', 'gear', 50, 595, 18, MUTED); H.t(c, 'TXT_SB_Settings', 'Settings', 76, 595, 18, MUTED);
    H.icon(c, 'ICON_SB_Help', 'help', 50, 640, 18, MUTED); H.t(c, 'TXT_SB_Help', 'Help Center', 76, 640, 18, MUTED);
    H.t(c, 'TXT_SB_Dark', 'Dark Mode', 36, 1080, 17, '#e8efff');
    H.r(c, 'UI_SB_Toggle', 248, 1080, 46, 24, 12, '#2a3c9a', 90); H.c(c, 'UI_SB_ToggleKnob', 238, 1080, 18, '#ffffff');
    // thanh trên
    H.r(c, 'UI_Search', 598, 65, 550, 48, 24, '#2a3d9e', 55, LINE, 1, 50);
    H.icon(c, 'ICON_Search', 'search', 352, 65, 18, MUTED); H.t(c, 'TXT_Search', LB('search','Search'), 374, 65, 16, DIM);
    var tops = [['cal', 1400], ['chat', 1470], ['bell', 1542]];
    for (var j = 0; j < tops.length; j++) { H.c(c, 'UI_Top_' + j, tops[j][1], 65, 50, '#26389a', 70, LINE, 1.2, 70); H.icon(c, 'ICON_Top_' + j, tops[j][0], tops[j][1], 65, 18, '#dfe8ff'); }
    H.r(c, 'UI_TopDivider', 935, 112, 1240, 1.5, 0, '#3a4fae', 60);
    // lời chào + chip
    H.t(c, 'TXT_Hello', o.hello, 333, 180, 54, '#ffffff', H.FONT.medium);
    H.t(c, 'TXT_Help', o.ask, 333, 253, 50, H.P.accent, H.FONT.medium);
    var cx = 1060;
    for (var k = 0; k < o.chips.length; k++) {
      var w = 40 + o.chips[k].length * 9.5;
      pill(c, 'UI_Chip_' + k, cx + w / 2, 265, w, 44, o.chips[k], k === 0);
      cx += w + 12;
    }
  }

  // ---------- hàng dưới dùng chung: Costs + danh sách task ----------
  function bottomRow(c, o) {
    card(c, 'UI_Costs', 601, 925, 533, 301);
    H.t(c, 'TXT_Costs', LB('costs','Costs'), 360, 816, 26, '#ffffff', H.FONT.medium);
    pill(c, 'UI_Costs_Weekly', 800, 816, 104, 32, 'Weekly    ', false);
    H.icon(c, 'ICON_Costs_Chev', 'chev', 832, 816, 11, '#ffffff');
    var yl = ['40', '30', '20', '10', '0'];
    for (var i = 0; i < yl.length; i++) H.t(c, 'TXT_Costs_Y' + i, yl[i], 362, 872 + i * 38, 13, DIM);
    var pts = [], base = 1030, xs = 395, xe = 850, vals = [12, 30, 48, 38, 62, 44, 70, 52, 40, 58, 35, 28, 46, 66, 90, 72, 55, 40, 30, 48, 38, 26, 30, 22];
    for (var j = 0; j < vals.length; j++) pts.push([xs + (xe - xs) * j / (vals.length - 1), base - vals[j] * 1.6]);
    var area = pts.concat([[xe, base], [xs, base]]);
    H.path(c, 'UI_Costs_Area', area, { fill: '#4f8dff', fillOp: 35, closed: true });
    H.path(c, 'UI_Costs_Line', pts, { stroke: '#9cc8ff', sw: 2 });
    var tasks = o.v2.tasks, colX = [900, 1210], rowY = [805, 887, 968, 1049];
    for (var k = 0; k < tasks.length && k < 8; k++) {
      var x = colX[k < 4 ? 0 : 1], y = rowY[k % 4], w = 285;
      H.r(c, 'UI_Task_' + k, x + w / 2 - 10, y, w, 52, 12, '#22308c', 70, LINE, 1, 50);
      H.r(c, 'UI_TaskBox_' + k, x + 10, y, 28, 28, 7, null, 0, '#7e9cf0', 1.6);
      H.icon(c, 'ICON_TaskCheck_' + k, 'check', x + 10, y, 14, '#cfe0ff');
      H.t(c, 'TXT_Task_' + k, tasks[k], x + 36, y, 17, '#e8efff');
    }
    var orb = H.c(c, 'UI_AI_Orb', 1506, 1032, 90, '#1c3aa8', 90, '#b8d4ff', 2); H.glow(orb, 78, 26, 0.55);
    H.icon(c, 'ICON_AI_Orb', 'star', 1506, 1032, 38, '#ffffff');
  }

  // ---------- nội dung v1: Welcome + Task completion ----------
  function v1(c, o) {
    var n0 = since(c);
    card(c, 'V1_Welcome', 735, 554, 800, 392);
    H.t(c, 'V1_TXT_WB', LB('welcome','Welcome back,'), 365, 405, 18, MUTED);
    H.t(c, 'V1_TXT_Name', o.v1.welcome, 365, 450, 40, '#ffffff', H.FONT.medium);
    H.t(c, 'V1_TXT_Note1', o.v1.note, 365, 505, 19, MUTED);
    H.icon(c, 'V1_ICON_Arrow', 'chev', 1090, 405, 18, MUTED);
    // thẻ lịch hẹn nhỏ
    H.r(c, 'V1_Event', 930, 640, 330, 170, 14, '#22308c', 75, LINE, 1, 55);
    H.t(c, 'V1_TXT_Time', LB('evTime','01:30–02:40 pm'), 785, 585, 17, '#ffffff', H.FONT.medium);
    H.t(c, 'V1_TXT_Day', LB('evDay','on Tuesday'), 785, 608, 14, MUTED);
    H.t(c, 'V1_TXT_EvNote', LB('ev1','Weekly review and refinement'), 785, 648, 15, '#dbe6ff');
    H.t(c, 'V1_TXT_EvNote2', LB('ev2','of project prototypes'), 785, 670, 15, '#dbe6ff');
    H.icon(c, 'V1_ICON_Guests', 'user', 795, 702, 16, MUTED); H.t(c, 'V1_TXT_Guests', LB('guests','5 guests'), 812, 702, 14, MUTED);
    for (var a = 0; a < 3; a++) H.c(c, 'V1_Avatar_' + a, 1010 + a * 26, 700, 32, ['#c9d6f5', '#9fb6f0', '#e6c9b8'][a], 100, '#1b2d80', 2);
    // tiến độ
    card(c, 'V1_Task', 1340, 554, 384, 392);
    H.t(c, 'V1_TXT_Task', LB('task','Task completion'), 1170, 405, 22, '#ffffff', H.FONT.medium);
    H.t(c, 'V1_TXT_From', LB('taskSub','From all projects'), 1170, 432, 15, MUTED);
    var rg = H.ring(c, { name: 'V1_Ring', w: 210, sw: 16, pos: [1340, 600], color: '#86c6ff', track: '#33449e' });
    H.icon(c, 'V1_ICON_Check', 'check', 1340, 595, 40, '#cfe0ff');
    var cnt = H.counter(c, { name: 'V1_TXT_Pct', size: 30, pos: [1340, 735] });
    H.t(c, 'V1_TXT_0', '0%', 1225, 735, 14, DIM, null, 'c'); H.t(c, 'V1_TXT_100', '100%', 1455, 735, 14, DIM, null, 'c');
    var p0 = o.v1.taskPct[0], p1 = o.v1.taskPct[1];
    H.anim(cnt.value, [0.4, 1.4, 3.0], [0, p0, p1], 'snap');
    H.anim(rg.end, [0.4, 1.4, 3.0], [0, 66.7 * p0 / 100, 66.7 * p1 / 100], 'snap');
    return grab(c, n0);
  }

  // ---------- nội dung v2: Documents + Analytics ----------
  function v2(c, o, tIn) {
    var n0 = since(c), D = o.v2.docs, A = o.v2.analytics;
    card(c, 'V2_Docs', 535, 554, 399, 392);
    H.r(c, 'V2_DocIcon_BG', 409, 435, 52, 52, 12, '#2c4bc0', 90);
    H.icon(c, 'V2_DocIcon', 'doc', 409, 435, 22, '#9fd0ff');
    H.icon(c, 'V2_DocDots', 'dots', 700, 404, 20, MUTED);
    H.t(c, 'V2_TXT_Docs', LB('docs','Documents'), 363, 581, 42, '#ffffff');
    H.r(c, 'V2_DocBar_Track', 534, 652, 342, 8, 4, '#24357e');
    var bar = H.r(c, 'V2_DocBar', 363, 652, 342 * D.pct / 100, 8, 4, '#5fb4ff');
    H.anc(bar).setValue([-171 * D.pct / 100, 0]);
    H.t(c, 'V2_TXT_Files', D.files, 366, 695, 22, MUTED);
    H.t(c, 'V2_TXT_Size', D.size, 705, 695, 22, '#ffffff', null, 'r');
    card(c, 'V2_Analytics', 1143, 554, 779, 392);
    H.t(c, 'V2_TXT_Analytics', LB('analytics','Analytics'), 805, 404, 26, '#ffffff', H.FONT.medium);
    H.c(c, 'V2_Leg1', 1105, 404, 10, '#e8efff'); H.t(c, 'V2_TXT_Leg1', LB('leg1','Income'), 1118, 404, 15, MUTED);
    H.c(c, 'V2_Leg2', 1246, 404, 10, '#5fb4ff'); H.t(c, 'V2_TXT_Leg2', LB('leg2','Outcome'), 1259, 404, 15, MUTED);
    pill(c, 'V2_Year', 1443, 404, 86, 30, '2025    ', false);
    H.icon(c, 'V2_ICON_YearChev', 'chev', 1470, 404, 11, '#ffffff');
    var ylab = ['50K', '40K', '30K', '20K', '10K'], gy = [447, 507, 567, 626, 686];
    for (var i = 0; i < ylab.length; i++) { H.t(c, 'V2_TXT_Y' + i, ylab[i], 815, gy[i], 13, DIM); H.r(c, 'V2_Grid_' + i, 1175, gy[i], 650, 1, 0, '#3a4fae', 45); }
    var base = 686, mx = A.months, bars = [];
    for (var m = 0; m < mx.length; m++) {
      var x = 880 + m * 84;
      var b1 = H.r(c, 'V2_Bar_In_' + m, x - 8, base, 10, A.income[m], 5, '#e8efff'); H.anc(b1).setValue([0, A.income[m] / 2]);
      var b2 = H.r(c, 'V2_Bar_Out_' + m, x + 8, base, 10, A.outcome[m], 5, '#5fb4ff'); H.anc(b2).setValue([0, A.outcome[m] / 2]);
      H.t(c, 'V2_TXT_M' + m, mx[m], x, 715, 13, DIM, null, 'c');
      bars.push(b1, b2);
    }
    var L = grab(c, n0);
    // hiện: thẻ/ chữ trượt xuống + mờ → rõ; cột mọc lên lần lượt
    if (tIn !== null && tIn !== undefined) {
      for (var q = 0; q < L.length; q++) {
        if (/^V2_Bar_/.test(L[q].name)) continue;
        var p0 = H.pos(L[q]).value;
        H.anim(H.opa(L[q]), [tIn + 0.15, tIn + 0.45], [0, 100], 'snap');
        H.anim(H.pos(L[q]), [tIn + 0.15, tIn + 0.55], [[p0[0], p0[1] - 30], p0], 'snap');
      }
      for (var b = 0; b < bars.length; b++) H.anim(H.scl(bars[b]), [tIn + 0.4 + b * 0.02, tIn + 0.9 + b * 0.02], [[100, 0], [100, 100]], 'snap');
      H.anim(H.scl(bar), [tIn + 0.5, tIn + 1.0], [[0, 100], [100, 100]], 'snap');
    }
    return L;
  }

  H.uiDashboard = function (o) {
    LBL = o.labels || {};
    var c = H.find('UI_Dashboard');
    if (c) { H.clearComp(c); c.height = 1120; c.width = 1600; }
    else { c = app.project.items.addComp('UI_Dashboard', 1600, 1120, 1, 8, H.FPS); c.parentFolder = H.folder('03_UI'); }
    c.time = 0;
    shell(c, o);
    bottomRow(c, o);
    if (o.tSwap === null || o.tSwap === undefined) { v2(c, o, null); return c; }
    var a = v1(c, o);
    for (var i = 0; i < a.length; i++) H.fadeOut(a[i], o.tSwap, 0.2);
    v2(c, o, o.tSwap);
    return c;
  };

  // Panel nền chi tiết cho cảnh zoom-out (đặt quanh cửa sổ, sẽ bị blur nhẹ). Dựng vào comp c, trả null cha.
  H.uiBackPanels = function (c, o) {
    LBL = o.labels || {};
    var n0 = c.numLayers;
    function panel(name, x, y, w, h) { return H.r(c, name, x, y, w, h, 18, '#0c1640', 85, '#22337a', 1.5, 80); }
    // trái: Documents lớn + biểu đồ vùng
    panel('BG_Docs', 250, 290, 430, 330);
    H.icon(c, 'BG_Docs_Icon', 'doc', 110, 175, 26, '#5f86e0');
    H.t(c, 'BG_Docs_T', LB('docs','Documents'), 85, 285, 42, '#7f93d0');
    H.r(c, 'BG_Docs_Bar', 235, 345, 300, 8, 4, '#3a62c8');
    H.t(c, 'BG_Docs_F', o.v2.docs.files, 85, 385, 24, '#6f82c0'); H.t(c, 'BG_Docs_S', o.v2.docs.size, 440, 385, 24, '#6f82c0', null, 'r');
    panel('BG_Area', 230, 590, 470, 260);
    var pts = [], vals = [20, 40, 30, 70, 50, 90, 60, 110, 80, 130, 70, 50];
    for (var i = 0; i < vals.length; i++) pts.push([10 + i * 40, 700 - vals[i]]);
    H.path(c, 'BG_Area_Fill', pts.concat([[450, 700], [10, 700]]), { fill: '#2c4bb0', fillOp: 45, closed: true });
    // dưới trái: thông báo có avatar
    var nt = LBA('notifs', [['Mark Smith', '8m ago'], ['Kristin Watson', '14m ago']]);
    for (var j = 0; j < nt.length; j++) {
      var y = 920 + j * 75;
      H.c(c, 'BG_Notif_Av' + j, 60, y, 44, ['#c9d6f5', '#e6c9b8'][j]);
      H.t(c, 'BG_Notif_N' + j, nt[j][0], 95, y - 12, 22, '#9fb2ee'); H.t(c, 'BG_Notif_T' + j, "Here's notification text.", 95, y + 14, 17, '#6f82c0');
      H.t(c, 'BG_Notif_Ago' + j, nt[j][1], 450, y - 12, 16, '#6f82c0', null, 'r');
    }
    // dưới giữa: hàng chip task
    var chips = o.v2.tasks, cx = 540, cy = 935;
    for (var k = 0; k < chips.length; k++) {
      var w = 70 + chips[k].length * 10.5; if (cx + w > 1400) { cx = 540; cy += 70; }
      H.r(c, 'BG_Chip_' + k, cx + w / 2, cy, w, 52, 12, '#13235f', 85, '#2a3c86', 1, 80);
      H.icon(c, 'BG_ChipChk_' + k, 'check', cx + 26, cy, 16, '#6f8ee8'); H.t(c, 'BG_ChipT_' + k, chips[k], cx + 46, cy, 19, '#6f82c0');
      cx += w + 14;
    }
    // phải: thẻ "New task" ×2 + Processes donut + Analytics nhỏ
    for (var m = 0; m < 2; m++) {
      var x0 = 1500 + m * 360;
      panel('BG_NewTask_' + m, x0 + 170, 330, 340, 300);
      H.t(c, 'BG_NT_L' + m, LB('ntLabel','New task'), x0 + 20, 215, 20, '#6f82c0');
      H.t(c, 'BG_NT_A' + m, LB('nt1','Analyze, customize, and'), x0 + 20, 262, 27, '#8fa3e0'); H.t(c, 'BG_NT_B' + m, LB('nt2','understand search queries'), x0 + 20, 296, 27, '#8fa3e0');
      H.t(c, 'BG_NT_Tag1' + m, LB('tag1','Development'), x0 + 30, 350, 18, '#5a6fae'); H.t(c, 'BG_NT_Tag2' + m, LB('tag2','Research'), x0 + 190, 350, 18, '#5a6fae');
      H.icon(c, 'BG_NT_Chk' + m, 'check', x0 + 32, 400, 20, '#6f8ee8'); H.t(c, 'BG_NT_P' + m, m ? '96%' : '99%', x0 + 55, 400, 20, '#6f8ee8');
      H.icon(c, 'BG_NT_Clk' + m, 'clock', x0 + 210, 450, 18, '#6f82c0'); H.t(c, 'BG_NT_H' + m, '13h', x0 + 226, 450, 17, '#6f82c0');
    }
    panel('BG_Process', 1630, 660, 420, 290);
    H.t(c, 'BG_Proc_T', LB('process','Processes'), 1440, 545, 18, '#6f82c0');
    var dn = H.ring(c, { name: 'BG_Donut', w: 170, sw: 34, pos: [1530, 680], color: '#3a62c8', track: '#1a2766' }); dn.end.setValue(66.7);
    var leg = LBA('processLegend', [['Approved', '60%'], ['Done', '20%'], ['New', '5%'], ['Briefing', '15%']]);
    for (var q = 0; q < leg.length; q++) { H.c(c, 'BG_Leg' + q, 1660, 590 + q * 48, 9, '#6f82c0'); H.t(c, 'BG_LegT' + q, leg[q][0], 1680, 590 + q * 48, 18, '#7f93d0'); H.t(c, 'BG_LegP' + q, leg[q][1], 1820, 590 + q * 48, 18, '#7f93d0', null, 'r'); }
    panel('BG_Analytics', 1640, 990, 420, 200);
    H.t(c, 'BG_An_T', LB('analytics','Analytics'), 1450, 925, 22, '#7f93d0');
    // đường lưới mảnh chạy qua cả khung (như mẫu)
    var gl = [[960, 140, 1920, 1.2], [960, 870, 1920, 1.2]], gv = [[392, 540, 1.2, 1080], [1112, 540, 1.2, 1080]];
    for (var g = 0; g < gl.length; g++) H.r(c, 'BG_GridH_' + g, gl[g][0], gl[g][1], gl[g][2], gl[g][3], 0, '#3b5bb8', 45);
    for (var v = 0; v < gv.length; v++) H.r(c, 'BG_GridV_' + v, gv[v][0], gv[v][1], gv[v][2], gv[v][3], 0, '#3b5bb8', 45);
    var L = []; for (var z = 1; z <= c.numLayers - n0; z++) L.push(c.layer(z));
    var nb = H.null(c, 'NULL_BG', [960, 540]);
    for (var y2 = 0; y2 < L.length; y2++) L[y2].parent = nb;
    return nb;
  };

  // ---------------------------------------------------------------------------------------------
  // Cảnh dashboard-rise: cửa sổ UI_Dashboard dâng từ đáy, tiêu đề, chip kính trái + thẻ kính phải bật ra,
  // cuối cảnh thu nhỏ để giao cảnh zoom-out. Cần H.uiDashboard(...) dựng trước.
  // o = {name, dur:3.2, title, sub, chips:['Calendar','Chat'], card:['dòng 1','dòng 2'], cardTitle}
  H.sceneDashboardRise = function (o) {
    var c = H.comp(o.name || 'S02_Dashboard', o.dur || 3.2, '02_SCENES'); c.time = 0;
    var sc = H.null(c, 'NULL_Scene', [960, 540]);
    var ui = H.place(c, H.find('UI_Dashboard'), 'UI_Window', 0, 10);
    H.anim(H.pos(ui), [0, 0.6], [[960, 1880], [960, 1040]], 'snap');
    var tl = H.titleBlock(c, o.title || 'Title', o.sub, 0.15, 120);
    var blocks = [];
    function popGroup(name, layers, from, to, t) {
      var n = H.null(c, name, to);
      for (var i = 0; i < layers.length; i++) { layers[i].parent = n; var g = c.layer(layers[i].name + '_Glass'); if (g) g.parent = n; }
      H.pop(H.pos(n), t, from, to, 0.5, 0.08); H.pop(H.scl(n), t, [60, 60], [100, 100], 0.5, 0.1);
      for (var k = 0; k < layers.length; k++) { H.anim(H.opa(layers[k]), [t, t + 0.15], [0, 100], 'linear'); var gg = c.layer(layers[k].name + '_Glass'); if (gg) H.anim(H.opa(gg), [t, t + 0.15], [0, 100], 'linear'); }
      blocks.push(n);
    }
    var chips = o.chips || ['Calendar', 'Chat'], icons = o.chipIcons || ['cal', 'chat'];
    for (var j = 0; j < chips.length && j < 3; j++) {
      var y = 820 + j * 66, w = 120 + chips[j].length * 11, x = 120 + w / 2 - j * 30;
      var ch = H.glassCard(c, 'CHIP_' + j, x, y, w, 54, 27);
      var ic = H.icon(c, 'ICON_Chip_' + j, icons[j] || 'star', x - w / 2 + 30, y, 20, '#ffffff');
      var tx = H.t(c, 'TXT_Chip_' + j, chips[j], x - w / 2 + 52, y, 22, '#ffffff');
      popGroup('NULL_Chip_' + j, [ch, tx].concat(ic), [x + 150, y], [x, y], 0.4 + j * 0.15);
    }
    if (o.card) {
      var cx = 1700, cy = 760, cw = 360, chh = 260;
      var cd = H.glassCard(c, 'CARD_Side', cx, cy, cw, chh, 22);
      var parts = [cd];
      parts.push(H.t(c, 'TXT_Side_L', o.cardTitle || 'New task', cx - cw / 2 + 24, cy - chh / 2 + 34, 16, '#b8c6f0'));
      for (var m = 0; m < o.card.length && m < 2; m++) parts.push(H.t(c, 'TXT_Side_' + m, o.card[m], cx - cw / 2 + 24, cy - chh / 2 + 74 + m * 30, 22, '#ffffff'));
      parts.push(H.r(c, 'UI_Side_Bar', cx, cy + 60, cw - 48, 10, 5, H.P.accent, 80));
      parts.push(H.r(c, 'UI_Side_Bar2', cx - 50, cy + 90, cw - 148, 10, 5, H.P.accent, 40));
      popGroup('NULL_Side', parts, [cx - 180, cy], [cx, cy], 0.8);
    }
    // gắn mọi thứ vào NULL_Scene (null đang ở trạng thái gốc)
    ui.parent = sc; for (var a = 0; a < tl.length; a++) tl[a].parent = sc; for (var b = 0; b < blocks.length; b++) blocks[b].parent = sc;
    var tEnd = c.duration;
    for (var q = 0; q < tl.length; q++) H.fadeOut(tl[q], tEnd - 0.45, 0.2);
    H.anim(H.scl(sc), [0.6, tEnd - 0.4, tEnd - 0.1], [[100, 100], [97, 97], [52, 52]], 'soft');
    H.ease(H.scl(sc), 2, 33, 90);
    H.anim(H.pos(sc), [tEnd - 0.4, tEnd - 0.1], [[960, 540], [960, 380]], 'accel');
    return c;
  };

  // Cảnh zoom-out-overview: panel nền chi tiết + chữ khổng lồ + DOF + cửa sổ thu nhỏ lơ lửng.
  // o = {name, dur:3.25, word:'Brand', uiOffset: giây UI-local tại đầu cảnh (vd 2.9), labels/v2 như uiDashboard}
  H.sceneZoomOut = function (o) {
    var c = H.comp(o.name || 'S03_ZoomOut', o.dur || 3.25, '02_SCENES'); c.time = 0;
    var bg = H.uiBackPanels(c, o);
    H.anim(H.scl(bg), [0, 0.6, c.duration], [[125, 125], [100, 100], [97, 97]], 'snap');
    for (var i = 1; i <= c.numLayers; i++) { var L = c.layer(i); if (/^BG_/.test(L.name)) H.anim(H.opa(L), [0, 0.3], [0, /^BG_Grid/.test(L.name) ? 70 : 80], 'linear'); }
    var big = H.text(c, { name: 'TXT_Wordmark_BG', text: o.word || 'Brand', size: 330, font: H.FONT.medium, color: '#4f7fe8', pos: [960, 125] });
    H.opa(big).setValue(32); H.anim(H.pos(big), [0.25, 0.95], [[960, -180], [960, 125]], 'snap');
    var dof = H.adj(c, 'ADJ_DOF'); H.gblur(dof, 6);
    var gl = H.r(c, 'FX_Window_Glow', 960, 520, 1200, 760, 300, H.P.beamWide); H.blur(gl, 160); gl.blendingMode = BlendingMode.ADD; H.opa(gl).setValue(42);
    var ui = H.place(c, H.find('UI_Dashboard'), 'UI_Window', -(o.uiOffset || 0), 10);
    H.anim(H.scl(ui), [0, 0.5, c.duration], [[72, 72], [57, 57], [54, 54]], 'snap');
    H.anim(H.pos(ui), [0, 0.5], [[960, 470], [960, 520]], 'snap');
    H.anim(H.opa(ui), [0, 0.12], [0, 100], 'linear');
    big.moveToBeginning(); dof.moveToBeginning(); gl.moveToBeginning(); ui.moveToBeginning();
    H.exitBlur(c, c.duration - 0.3, 0.25);
    return c;
  };

  return 'ui-dashboard ok';
})();
