// build.jsx — ví dụ Foodtage dựng bằng lib/th-lib.jsx. Mẫu để CHÉP cho video mới: đổi khối DATA, giữ khối STAGES.
// Chạy (mỗi dòng là một lệnh ae_run_script; KIT = đường dẫn tuyệt đối tới talking-head-kit, dấu '/'):
//   $.evalFile(File(KIT+'/lib/saas-lib.jsx')); $.evalFile(File(KIT+'/lib/th-lib.jsx'));
//   $.global.EX = KIT+'/examples/foodtage'; $.evalFile(File(EX+'/build.jsx'));
//   B.stage('base') → 'behind' → 'front' → 'caps' → 'broll' → 'rings' → 'leaks' → 'sfx'   (hoặc B.all())
(function () {
  var H = $.global.H, T = $.global.T, EX = $.global.EX;
  var A = EX + '/assets', ICON = A + '/icon&logo/', SFX = A + '/SFX/';
  T.init({ dur: 22.2, media: EX + '/media', assets: A });
  var F = T.F;

  // =====================================================================
  // DATA — mọi mốc lấy từ media/transcript.json (giây bắt đầu của từ)
  // =====================================================================
  var D = {};
  D.grade = { black: 24, white: 228, gamma: 0.92, vib: 45, sat: 25, bright: -8, contrast: 32, vignette: 35 };
  // punch-in: đổi scale ở đầu mỗi ý chính (key HOLD)
  D.zooms = [[0, 100], [2.58, 120], [4.9, 110], [7.12, 114], [9.22, 122], [11.72, 112], [15.08, 122], [17.66, 112]];
  // Nhãn + số neon (sau lưng người): [nhãn, số, vào, ra]
  D.numbers = [['Number', '1', 2.58, 3.75], ['Number', '2', 9.22, 10.4], ['and Last', '3', 15.08, 16.25]];
  // Từ khoá to sau đầu: [tên layer, dòng, vào, ra, y, cỡ]
  D.keywords = [['KW_Faster', ['FASTER'], 5.64, 6.74, 215, 270], ['KW_Efficient', ['Efficient'], 6.74, 8.6, 215, 230],
                ['KW_SoundDesign', ['Sound', 'Design'], 10.88, 12.0, 330, 300], ['KW_TellingStory', ['Telling', 'Story'], 16.68, 17.95, 330, 290]];
  // Icon tile: [khoá, file]
  D.tiles = { Keyboard: ICON + 'keyboard-and-mouse (1).mp4', Audio: ICON + 'audio-editing.mp4', Story: ICON + 'storytelling.mp4' };
  // Đặt tile: [khoá, vào, ra, [x,y], scale%, xoay°]
  D.tilePlaces = [['Keyboard', 1.0, 2.45, [200, 310], 72, -12], ['Audio', 1.15, 2.45, [540, 250], 72, 0], ['Story', 1.3, 2.45, [880, 310], 72, 12],
                  ['Keyboard', 3.67, 7.12, [540, 1460]], ['Audio', 10.88, 12.0, [540, 1460]], ['Story', 16.68, 22.2, [540, 1460]]];
  // Vòng nổ: [x, y, giây, đường kính]
  D.bursts = [[200, 300, 1.15, 60], [540, 250, 1.3, 60], [880, 300, 1.45, 60], [400, 1660, 4.0], [700, 1560, 4.25, 45],
              [760, 1470, 11.2], [380, 1300, 17.0], [720, 1560, 19.7, 50], [360, 1240, 7.5], [760, 1360, 7.9, 50]];
  D.logos = ['Premiere-Pro-logo-Adobe-symbol-professional-video-editing-transparent-png-image.png', 'CapCut-Logo-Video-Editing-App-Icon.png',
             'davinci vuông.png', 'Adobe-After-Effects-Logo-84.png', 'icons8-final-cut-pro-x-480.png'];
  D.logoSpan = [7.12, 9.04];
  // Phụ đề: mỗi nhóm hiện chồng dòng, tắt ở t1. Tạo nháp bằng tools/caption_groups.py rồi sửa tay.
  D.caps = [
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
    { t1: 22.2, lines: [[['improve', 20.26]], [['your', 20.64]], [['storytelling', 20.84, { c: '#d35bff' }]], [['abilities', 21.22, { c: '#d35bff', k: 0.8 }]]] }
  ];
  D.broll = { t0: 12.0, t1: 14.73, top: A + '/B-Roll/meme khóc rồi cười.mp4', topScale: 157, topPos: [450, 470], topStart: 0.4,
              bottom: A + '/B-Roll/Record.mov', bottomAnchor: [1500, 1420], bottomScale: 150, bottomStart: 4.0 };
  D.rings = { t0: 17.85, icons: [ICON + 'keyboard-and-mouse (1).mp4', ICON + 'audio-editing.mp4', ICON + 'storytelling.mp4', ICON + 'keyboard-and-mouse (1).mp4', ICON + 'storytelling.mp4'] };
  // Light leak: [giây timeline, giây trong file]. LƯU Ý: bản v1 chọn sai 3 đoạn (6.0 nhiễu, 7.67 loé đỏ, 16.67 vệt trắng) — chọn lại khi làm v2.
  D.leaks = [[1.0, 3.2], [6.0, 6.35], [7.67, 9.55], [12.0, 11.95], [16.67, 12.6]];
  // SFX: [file, giây, bắt đầu trong file, độ dài (0 = hết), dB]
  D.sfx = [['Tiktok SFX 2.mp3', 0.0, 0, 1.2, -4], ['pop sound.MP3', 1.0, 0, 0, -3], ['pop sound.MP3', 1.15, 0, 0, -3], ['pop sound.MP3', 1.3, 0, 0, -3],
           ['ping.MP3', 3.67, 0, 0, -6], ['ping.MP3', 10.88, 0, 0, -6], ['ping.MP3', 16.68, 0, 0, -6],
           ['Camera Shutter Sound Effect.mp3', 5.62, 0, 0, -6], ['Camera Shutter Sound Effect.mp3', 6.72, 0, 0, -8],
           ['riser long classique.mp3', 7.3, 0.8, 1.92, -4], ['Tiktok SFX 2.mp3', 13.5, 0, 1.5, -6],
           ['Gears 1.wav', 17.85, 0, 0, -4], ['riser long classique.mp3', 18.3, 0, 0, -6]];
  D.hits = [2.56, 9.2, 15.06];   // impact + lightsaber ở mỗi "Number"
  D.capClick = -14;              // click ở mỗi từ phụ đề (dB)

  // =====================================================================
  // STAGES
  // =====================================================================
  var S = {};
  S.base = function () { return T.base({ aroll: T.MEDIA + '/aroll.mp4', matte: T.MEDIA + '/aroll_matte.mp4', grade: D.grade, zooms: D.zooms, focus: [540, 700] }); };
  S.behind = function () {
    var c = T.main(), n = 0, i;
    for (i = 0; i < D.numbers.length; i++) n += T.behind(T.number(c, D.numbers[i][0], D.numbers[i][1], D.numbers[i][2], D.numbers[i][3])).length;
    for (i = 0; i < D.keywords.length; i++) { var k = D.keywords[i]; T.behind(T.keyword(c, k[0], k[1], k[2], k[3], k[4], k[5])); n++; }
    return n;
  };
  S.front = function () {
    var c = T.main(), i;
    // hook "Here's 3 Ways" — riêng của video này
    var a = T.txt(c, { text: "Here's", size: 150, font: T.FONT.wideUp, color: '#2d6bff', pos: [545, 980], name: 'HOOK_Heres' });
    T.grad(a, '#4b86ff', '#1238ff'); T.glow(a, 70, 20, 0.7); T.span(a, 0.1, 2.45); T.punchIn(a, 0.1, 150); T.cut(a, 2.45);
    var b = T.txt(c, { text: '3', size: 360, font: T.FONT.wideUp, color: '#ff4b2b', pos: [280, 1215], name: 'HOOK_3' });
    T.grad(b, '#ff7a2b', '#ff2b2b'); T.glow(b, 70, 25, 0.8); T.span(b, 0.34, 2.45); T.punchIn(b, 0.34, 170); T.cut(b, 2.45);
    var w = T.txt(c, { text: 'Ways', size: 300, font: T.FONT.script, color: '#2dff4f', pos: [640, 1335], stroke: '#d6ffd6', sw: 3, strokeOver: true, name: 'HOOK_Ways' });
    T.glow(w, 50, 35, 1.4); T.span(w, 0.56, 2.45); T.punchIn(w, 0.56, 140); T.cut(w, 2.45);
    // tiles
    var tiles = {}; for (var k in D.tiles) tiles[k] = T.tile(k, D.tiles[k]);
    for (i = 0; i < D.tilePlaces.length; i++) {
      var p = D.tilePlaces[i], l = T.placeTile(c, tiles[p[0]], p[1], p[2], p[3], p[4]);
      if (p[5]) H.rot(l).setValue(p[5]);
    }
    for (i = 0; i < D.bursts.length; i++) T.burst(c, D.bursts[i][0], D.bursts[i][1], D.bursts[i][2], D.bursts[i][3]);
    // "Keyboard Shortcut" — Stroke Up
    var ks = T.txt(c, { text: 'Keyboard\rShortcut', size: 118, font: T.FONT.wide, color: '#2a5cff', pos: [540, 1120], lead: 108, name: 'KS_Text' });
    T.grad(ks, '#7fa8ff', '#1d4dff'); T.glow(ks, 92, 16, 0.8, '#3a70ff'); T.span(ks, 3.8, 4.9);
    T.strokeUp(c, ks, 3.8, '#9cc0ff'); T.cut(ks, 4.9);
    // hàng logo
    var files = []; for (i = 0; i < D.logos.length; i++) files.push(ICON + D.logos[i]);
    var lg = H.place(c, T.logoBar('LOGOS', files, 2), 'LOGOS', D.logoSpan[0], 11); T.span(lg, D.logoSpan[0], D.logoSpan[1]);
    H.pos(lg).setValue([540, 1300]); H.anim(H.opa(lg), [D.logoSpan[0], D.logoSpan[0] + 0.08], [0, 100], 'linear'); T.cut(lg, D.logoSpan[1]);
    return c.numLayers;
  };
  S.caps = function () { return T.captions(D.caps, 112, 990, 82); };
  S.broll = function () { T.brollCard('BROLL', D.broll.t0, D.broll.t1, D.broll); return 1; };
  S.rings = function () { T.ringsBg('RINGS', D.rings.t0, T.DUR, D.rings.icons); return 1; };
  S.leaks = function () { return T.leaks(A + '/ánh sáng chuyển cảnh 1.mp4', D.leaks, 0.45, 75); };
  S.sfx = function () {
    var i, n = 0;
    for (i = 0; i < D.sfx.length; i++) { var s = D.sfx[i]; T.sfx(SFX + s[0], s[1], s[2], s[3], s[4]); n++; }
    for (i = 0; i < D.hits.length; i++) { T.sfx(SFX + 'MUI IMPACT SWEETENER Space Impact.wav', D.hits[i], 0.05, 2.4, -2); T.sfx(SFX + '2. Lightsaber.mp3', D.hits[i] + 0.05, 0, 0, -8); n += 2; }
    for (var g = 0; g < D.caps.length; g++) for (var a = 0; a < D.caps[g].lines.length; a++) for (var b = 0; b < D.caps[g].lines[a].length; b++) {
      T.sfx(SFX + 'click-for transitions.MP3', D.caps[g].lines[a][b][1], 0, 0, D.capClick); n++;
    }
    return n;
  };

  var B = $.global.B = { D: D, S: S, ORDER: ['base', 'behind', 'front', 'caps', 'broll', 'rings', 'leaks', 'sfx'] };
  B.stage = function (name) { return T.run(S[name]); };
  // Chạy hết, mỗi giai đoạn bắt lỗi riêng. Trả mảng CHUỖI (an toàn để trả về MCP).
  B.all = function () {
    var out = [];
    for (var i = 0; i < B.ORDER.length; i++) { try { out.push(B.ORDER[i] + ':' + B.stage(B.ORDER[i])); } catch (e) { out.push(B.ORDER[i] + ' LỖI ' + e.message + ' (dòng ' + e.line + ')'); } }
    return out;
  };
  return 'foodtage build ok';
})();
