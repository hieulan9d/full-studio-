// build.jsx — dựng video Orbiq (20 s, tông tím) bằng saas-ae-kit. ĐÃ CHẠY THỬ, render ra output/orbiq/orbiq_v1.mp4.
// Dùng làm MẪU cho video mới: chép file, đổi nội dung trong CFG, giữ thứ tự các giai đoạn.
//
// Chạy từng giai đoạn bằng ae_run_script (mỗi lệnh < ~60 s):
//   $.evalFile(File("<KIT>/projects/orbiq/build.jsx")); return BUILD.stage(1);   // rồi 2, 3, 4, 5
// Sau mỗi giai đoạn: xuất khung (BUILD.check(...)) → tools/wait-files.sh → tools/sheet.sh → xem → sửa.
// Trước giai đoạn 6: python -I tools/music_gen.py output/orbiq/music_120.wav --bpm 120 --dur 20 --hits <mốc cảnh>
// Giai đoạn 6 = âm thanh. Sau đó render bằng ae_render (KHÔNG gửi lệnh khác vào AE khi đang render).
// Bản dọc: $.global.BUILD_FORMAT = '9:16' trước evalFile → project orbiq_916.aep, khung 1080×1920.
(function () {
  var KIT = "D:/dự án antigravity/full studio/phong-cach/saas-animation";
  // Định dạng: đặt $.global.BUILD_FORMAT = "9:16" trước khi evalFile để dựng bản dọc (project/video riêng)
  var FMT = $.global.BUILD_FORMAT || "16:9", TAG = FMT === "9:16" ? "_916" : "";
  var OUT = KIT + "/output/orbiq";
  function load() {
    $.evalFile(File(KIT + "/lib/saas-lib.jsx")); $.evalFile(File(KIT + "/lib/ui-dashboard.jsx"));
    var H = $.global.H; H.pickFonts(); H.HUE = CFG.hue; H.setFormat(FMT); return H;
  }

  var CFG = {
    hue: 45, dur: 20, brand: 'Orbiq', tagline: 'Meet smarter with Orbiq',
    // âm thanh: nhạc tạo bằng tools/music_gen.py (cùng BPM với lưới), SFX bộ chuẩn của kit
    // nhạc thật (audio/music/INDEX.md): Better Times are Coming 119,8 BPM ≈ lưới 120; cắt từ cut20 trong index.json
    music: KIT + "/audio/music/mixkit-better-times-are-coming.mp3", musicStart: 37.97, sfxDir: KIT + "/audio/sfx",
    // nhạc tự tạo thay thế: music: KIT + "/output/orbiq/music_120.wav", musicStart: 0,
    // 9:16: phóng (%) và dời dọc (px) từng cảnh trong khung dọc. Cảnh thiết kế 1920×1080 → khung 1080 rộng cắt 2 bên.
    v: { S01_Logo: [100, 0], S02_Dashboard: [66, 80], S03_ZoomOut: [112, 0], S04_Live: [100, 0], S05_Chat: [82, 0, -80], S06_Cards: [125, 0], S07_Star: [100, 0], S08_End: [100, 0] },
    // mốc trong MAIN (lưới 120 BPM → mỗi 1,0 s)
    t: { dash: 1.0, zoom: 3.9, orbit: 7.0, chat: 9.1, cards: 13.1, star: 16.2, end: 17.4 },
    ui: {
      brand: 'Orbiq', user: 'Sarah Chen', role: 'Product Lead',
      hello: 'Hello, Sarah', ask: 'Ready for your next meeting?',
      chips: ['Ask Orbiq', 'Record', 'New meeting'],
      menu: [['Dashboard', 'grid'], ['Meetings', 'cal'], ['Notes', 'doc'], ['Chat', 'chat'], ['Calendar', 'cal'], ['Reports', 'report']],
      active: 'Meetings', tSwap: 4.0,
      labels: { search: 'Search meetings', costs: 'Talk time', welcome: 'Next up,', evTime: '10:00–10:45 am', evDay: 'Today',
        ev1: 'Launch sync with design', ev2: 'and marketing teams', guests: '6 guests', task: 'Action items', taskSub: 'Done this week',
        docs: 'Recordings', analytics: 'Meeting hours', leg1: 'Team', leg2: 'External',
        notifs: [['Sarah Chen', '2m ago'], ['Leo Park', '11m ago']], ntLabel: 'Summary ready', nt1: 'Launch decided for', nt2: 'September 18th',
        tag1: 'Product', tag2: 'Launch', process: 'Meeting types', processLegend: [['Standups', '45%'], ['Reviews', '25%'], ['Planning', '18%'], ['Client', '12%']] },
      v1: { welcome: 'Launch sync', note: 'Agenda, owners and decisions captured live', taskPct: [40, 88] },
      v2: { docs: { files: '248 Meetings', size: '96h', pct: 62 },
        analytics: { months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'], income: [120, 150, 110, 180, 210, 170, 140, 190], outcome: [60, 80, 50, 90, 110, 70, 80, 100] },
        tasks: ['Send recap to design', 'Update launch timeline', 'Review Q3 roadmap', 'Book user interviews', 'Share pricing notes', 'Sync with sales', 'Draft release notes'] }
    },
    dash: { title: 'Meeting Hub', sub: 'All your meetings in one place', chips: ['Record', 'Live notes'], chipIcons: ['chat', 'doc'], card: ['Launch decided for', 'September 18th'], cardTitle: 'Summary ready' },
    orbit: { line1: 'Live', line2: 'Notes', icons: ['chat', 'doc', 'star', 'check', 'check', 'cal'] },
    chat: { user: 'Sarah Chen', question: 'What did we decide on the launch?', aiName: 'Orbiq AI',
      answer: ['• Launch moves to September 18th, after the beta review.', '• Design ships final screens by Sept 5 (owner: Leo).', '• Marketing preps the announcement and pricing page.'] },
    cards: ['check', 'doc', 'chat']
  };

  var B = {};
  B.CFG = CFG;

  B.stage = function (n) {
    var H = load(), T = CFG.t, main;
    function fr(l) { if (H.FRAME.vertical) { var v = CFG.v[l.name] || [100, 0]; H.frame(l, v[0], v[1], v[2]); } return l; }
    if (n === 1) {             // nền + MAIN + logo + UI
      var dir = new Folder(OUT); if (!dir.exists) dir.create();
      H.setupFolders(); H.buildEnvSpace(CFG.dur); H.buildEnvPlanet(CFG.dur);
      main = H.frameComp('MAIN', CFG.dur, '00_MAIN');
      H.place(main, H.find('ENV_Space'), 'ENV_Space', 0, 8);
      var p = H.place(main, H.find('ENV_Planet'), 'ENV_Planet_Intro', 0, 10); p.collapseTransformation = true; p.outPoint = T.zoom + 0.2;
      fr(H.place(main, H.sceneLogo({ name: 'S01_Logo', dur: 1.5, word: CFG.brand, outAt: 0.85 }), 'S01_Logo', 0));
      H.uiDashboard(CFG.ui);
      app.project.save(File(OUT + "/orbiq" + TAG + ".aep"));
      return 'stage 1 ok';
    }
    main = H.find('MAIN');
    function top(comp, name, t) { var l = H.place(main, comp, name, t); l.moveToBeginning(); return fr(l); }
    if (n === 2) {             // dashboard-rise + zoom-out
      top(H.sceneDashboardRise(merge({ name: 'S02_Dashboard', dur: 3.2 }, CFG.dash)), 'S02_Dashboard', T.dash);
      var pl = main.layer('ENV_Planet_Intro'), MW = main.width, MH = main.height;
      if (H.FRAME.vertical) {   // khung dọc: thu nhỏ sẽ lộ cả vòng tròn → chỉ trượt xuống dưới cửa sổ
        H.anim(H.pos(pl), [T.dash, T.dash + 0.6], [[MW / 2, MH / 2], [MW / 2, MH / 2 + 520]], 'snap');
      } else {
        H.anim(H.pos(pl), [T.dash, T.dash + 0.6], [[MW / 2, MH / 2], [MW / 2, MH * 0.134]], 'snap');
        H.anim(H.scl(pl), [T.dash, T.dash + 0.6], [[100, 100], [45, 45]], 'snap');
      }
      H.anim(H.opa(pl), [T.zoom - 0.1, T.zoom + 0.15], [100, 0], 'linear');
      var l3 = top(H.sceneZoomOut(merge({ name: 'S03_ZoomOut', dur: 3.25, word: CFG.brand, uiOffset: T.zoom - T.dash }, CFG.ui)), 'S03_ZoomOut', T.zoom);
      H.anim(H.opa(l3), [T.orbit - 0.05, T.orbit + 0.12], [100, 0], 'linear');
      H.anim(H.opa(main.layer('S02_Dashboard')), [T.zoom + 0.02, T.zoom + 0.18], [100, 0], 'linear');
      app.project.save(); return 'stage 2 ok';
    }
    if (n === 3) {             // orbit + chat
      var l4 = top(H.sceneOrbit(merge({ name: 'S04_Live', dur: 2.25 }, CFG.orbit)), 'S04_Live', T.orbit);
      H.anim(H.opa(l4), [T.chat - 0.05, T.chat + 0.1], [100, 0], 'linear');
      var l5 = top(H.sceneChat(merge({ name: 'S05_Chat', dur: 4.15 }, CFG.chat)), 'S05_Chat', T.chat);
      H.anim(H.opa(l5), [T.chat, T.chat + 0.1, T.cards - 0.05, T.cards + 0.1], [0, 100, 100, 0], 'linear');
      app.project.save(); return 'stage 3 ok';
    }
    if (n === 4) {             // end card TRƯỚC (để biết vị trí icon), rồi trụ thẻ, rồi ngôi sao
      var l8 = top(H.sceneEnd({ name: 'S08_End', dur: CFG.dur - T.end, word: CFG.brand, tagline: CFG.tagline }), 'S08_End', T.end);
      H.anim(H.opa(l8), [T.end, T.end + 0.1], [0, 100], 'linear');
      var A = H.cardComp('UI_Card_A', CFG.cards[0]), Bc = H.cardComp('UI_Card_B', CFG.cards[1]), C = H.cardComp('UI_Card_C', CFG.cards[2]);
      var s6 = H.sceneCardRing({ name: 'S06_Cards', dur: 4.4, cards: [A, Bc, C, A, Bc, C, A, Bc] });
      var l6 = fr(H.place(main, s6, 'S06_Cards', T.cards)); l6.outPoint = T.star + 0.05; l6.moveBefore(main.layer('S05_Chat'));
      H.anim(H.opa(l6), [T.cards, T.cards + 0.15], [0, 100], 'linear');
      var s7 = H.sceneStarMorph({ name: 'S07_Star', dur: 1.5, inner: s6, innerOffset: T.star - T.cards });
      var l7 = fr(H.place(main, s7, 'S07_Star', T.star)); l7.outPoint = T.end + 0.05; l7.moveBefore(l6);
      app.project.save(); return 'stage 4 ok';
    }
    if (n === 5) {             // hành tinh cuối, tắt cột sáng trên, lớp chỉnh tổng
      var pe = H.place(main, H.find('ENV_Planet'), 'ENV_Planet_End', 0, 10); pe.collapseTransformation = true; pe.inPoint = T.end - 0.1; pe.outPoint = CFG.dur;
      H.anim(H.pos(pe), [T.end - 0.1, T.end + 0.5], [[main.width / 2, main.height / 2 + 160], [main.width / 2, main.height / 2]], 'snap'); H.anim(H.opa(pe), [T.end - 0.1, T.end + 0.2], [0, 100], 'linear');
      pe.moveAfter(main.layer('ENV_Planet_Intro'));
      var env = H.find('ENV_Space'), nm = ['ENV_Beam_Core', 'ENV_Beam_Wide'];
      for (var i = 0; i < nm.length; i++) { var op = H.opa(env.layer(nm[i])); for (var k = op.numKeys; k >= 1; k--) if (op.keyTime(k) > T.end - 0.5) op.removeKey(k); op.setValueAtTime(T.end - 0.2, op.valueAtTime(T.end - 0.2, false)); op.setValueAtTime(T.end + 0.2, 0); }
      H.finishMain(main);
      app.project.save(); return H.describe(main);
    }
    if (n === 6) {             // âm thanh: SFX theo mốc của từng cảnh + nhạc nền (tạo trước bằng music_gen.py)
      var cnt = H.buildAudio(main, { sfxDir: CFG.sfxDir, music: File(CFG.music).exists ? CFG.music : null, musicStart: CFG.musicStart || 0, musicDb: -7 });
      app.project.save(); return 'stage 6 ok: ' + cnt + ' SFX';
    }
    return 'stage ' + n + ' không có';
  };

  // Xuất khung kiểm tra của MAIN
  B.check = function (times, prefix) { var H = $.global.H || load(); return H.saveFrames(H.find('MAIN'), times, OUT + '/frames' + TAG, prefix || 'chk'); };

  function merge(a, b) { var o = {}, k; for (k in b) o[k] = b[k]; for (k in a) o[k] = a[k]; return o; }

  $.global.BUILD = B;
  return 'build.jsx ok';
})();
