// Tool definitions: zod input shape + the ExtendScript body that runs in AE.
// The body sees `args` (the tool input) and the `__ae` helpers from jsx/lib.jsx,
// and must `return` a plain value (objects/arrays/strings/numbers).
import { z } from "zod";

const ref = z.union([z.number().int(), z.string()]);
const compRef = ref.optional().describe("Comp id hoặc tên; bỏ trống = comp đang mở");

export const tools = [
  {
    name: "ae_status",
    description: "Phiên bản AE, file project đang mở và danh sách comp.",
    schema: {},
    jsx: `
      var p = app.project, comps = [];
      for (var i = 1; i <= p.numItems; i++) if (p.item(i) instanceof CompItem) comps.push(__ae.itemInfo(p.item(i)));
      return { version: app.version, projectFile: p.file ? p.file.fsName : null, numItems: p.numItems,
               activeItem: p.activeItem ? p.activeItem.name : null, comps: comps };`,
  },
  {
    name: "ae_list_items",
    description: "Liệt kê item trong project (footage, comp, folder, solid) với id, kích thước, thời lượng, đường dẫn file.",
    schema: { kind: z.enum(["comp", "footage", "folder", "solid"]).optional() },
    jsx: `
      var p = app.project, out = [];
      for (var i = 1; i <= p.numItems; i++) {
        var info = __ae.itemInfo(p.item(i));
        if (!args.kind || info.kind === args.kind) out.push(info);
      }
      return out;`,
  },
  {
    name: "ae_comp_info",
    description: "Chi tiết một comp: kích thước, fps, thời lượng, work area và các layer.",
    schema: { comp: compRef },
    jsx: `return __ae.compInfo(__ae.findComp(args.comp));`,
  },
  {
    name: "ae_new_project",
    description: "Tạo project mới. Nếu project hiện tại có thay đổi chưa lưu, AE sẽ hỏi lưu trong cửa sổ AE.",
    schema: {},
    jsx: `app.newProject(); return { ok: true };`,
  },
  {
    name: "ae_open_project",
    description: "Mở file .aep.",
    schema: { path: z.string() },
    jsx: `
      var f = new File(args.path);
      if (!f.exists) throw new Error("File not found: " + args.path);
      app.open(f);
      return { projectFile: app.project.file.fsName };`,
  },
  {
    name: "ae_save_project",
    description: "Lưu project; truyền path để Save As.",
    schema: { path: z.string().optional() },
    jsx: `
      if (args.path) app.project.save(new File(args.path)); else app.project.save();
      return { projectFile: app.project.file ? app.project.file.fsName : null };`,
  },
  {
    name: "ae_import_files",
    description: "Import file (video, ảnh, audio, .psd...) vào project, tuỳ chọn đưa vào một folder.",
    schema: { paths: z.array(z.string()).min(1), folder: z.string().optional() },
    jsx: `
      var folder = args.folder ? __ae.getFolder(args.folder) : null, out = [];
      for (var i = 0; i < args.paths.length; i++) {
        var f = new File(args.paths[i]);
        if (!f.exists) throw new Error("File not found: " + args.paths[i]);
        var it = app.project.importFile(new ImportOptions(f));
        if (folder) it.parentFolder = folder;
        out.push(__ae.itemInfo(it));
      }
      return out;`,
  },
  {
    name: "ae_create_comp",
    description: "Tạo comp mới (mặc định 1080x1920 dọc, 30fps, 10s).",
    schema: {
      name: z.string(),
      width: z.number().int().default(1080),
      height: z.number().int().default(1920),
      fps: z.number().default(30),
      duration: z.number().default(10),
      bgColor: z.string().optional().describe("Hex, vd #000000"),
      folder: z.string().optional(),
    },
    jsx: `
      var c = app.project.items.addComp(args.name, args.width, args.height, 1.0, args.duration, args.fps);
      if (args.bgColor) c.bgColor = __ae.rgb(args.bgColor);
      if (args.folder) c.parentFolder = __ae.getFolder(args.folder);
      c.openInViewer();
      return __ae.compInfo(c);`,
  },
  {
    name: "ae_add_layers",
    description:
      "Đặt footage/comp vào comp. sequential=true xếp nối tiếp nhau (dựng clip theo thứ tự). " +
      "fit: cover = phủ kín khung, contain = vừa khung. Tự kéo dài comp nếu clip vượt quá.",
    schema: {
      comp: compRef,
      items: z.array(z.object({
        item: ref.describe("Item id hoặc tên"),
        start: z.number().optional().describe("Giây bắt đầu trong comp (ghi đè xếp nối tiếp)"),
        trimIn: z.number().optional().describe("Bỏ bao nhiêu giây đầu clip"),
        duration: z.number().optional().describe("Thời lượng giữ lại (giây)"),
        name: z.string().optional(),
      })).min(1),
      sequential: z.boolean().default(true),
      startAt: z.number().default(0),
      gap: z.number().default(0).describe("Khoảng cách giữa các clip; số âm = chồng lên nhau"),
      fit: z.enum(["none", "cover", "contain"]).default("cover"),
      extendComp: z.boolean().default(true),
    },
    jsx: `
      var comp = __ae.findComp(args.comp), t = args.startAt, added = [];
      for (var i = 0; i < args.items.length; i++) {
        var s = args.items[i], item = __ae.findItem(s.item);
        var L = comp.layers.add(item);
        L.moveToEnd();
        var start = (s.start !== undefined && s.start !== null) ? s.start : t;
        var trim = s.trimIn || 0;
        L.startTime = start - trim;
        L.inPoint = start;
        if (s.duration) L.outPoint = start + s.duration;
        if (s.name) L.name = s.name;
        if (args.fit !== "none" && item.width && item.height) {
          var sx = comp.width / item.width, sy = comp.height / item.height;
          var k = (args.fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy)) * 100;
          L.property("Transform").property("Scale").setValue([k, k]);
        }
        if (args.sequential) t = L.outPoint + args.gap;
        if (args.extendComp && L.outPoint > comp.duration) comp.duration = L.outPoint;
        added.push(__ae.layerInfo(L));
      }
      if (args.extendComp) { comp.workAreaStart = 0; comp.workAreaDuration = comp.duration; }
      return { comp: comp.name, duration: comp.duration, layers: added };`,
  },
  {
    name: "ae_add_text",
    description: "Thêm layer chữ (phụ đề, tiêu đề) vào comp với font, cỡ, màu, viền, vị trí và thời gian.",
    schema: {
      comp: compRef,
      text: z.string(),
      start: z.number().default(0),
      duration: z.number().optional().describe("Bỏ trống = tới hết comp"),
      x: z.number().optional().describe("Mặc định giữa ngang"),
      y: z.number().optional().describe("Mặc định 80% chiều cao (vùng phụ đề)"),
      fontSize: z.number().default(72),
      font: z.string().optional().describe("PostScript name, vd Arial-BoldMT"),
      color: z.string().default("#FFFFFF"),
      strokeColor: z.string().optional(),
      strokeWidth: z.number().default(0),
      justify: z.enum(["left", "center", "right"]).default("center"),
      name: z.string().optional(),
    },
    jsx: `
      var comp = __ae.findComp(args.comp);
      var L = comp.layers.addText(args.text);
      var prop = L.property("Source Text"), td = prop.value;
      td.fontSize = args.fontSize;
      td.fillColor = __ae.rgb(args.color);
      if (args.font) td.font = args.font;
      td.justification = args.justify === "left" ? ParagraphJustification.LEFT_JUSTIFY
        : args.justify === "right" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY;
      if (args.strokeColor && args.strokeWidth > 0) {
        td.applyStroke = true; td.strokeColor = __ae.rgb(args.strokeColor);
        td.strokeWidth = args.strokeWidth; td.strokeOverFill = false;
      }
      prop.setValue(td);
      var x = (args.x !== undefined) ? args.x : comp.width / 2;
      var y = (args.y !== undefined) ? args.y : comp.height * 0.8;
      L.property("Transform").property("Position").setValue([x, y]);
      L.startTime = 0;
      L.inPoint = args.start;
      L.outPoint = args.duration ? args.start + args.duration : comp.duration;
      if (args.name) L.name = args.name;
      return __ae.layerInfo(L);`,
  },
  {
    name: "ae_preview_frame",
    description: "Xuất một khung hình của comp ra PNG và trả ảnh về để Claude xem (kiểm tra bố cục, chữ).",
    schema: { comp: compRef, time: z.number().default(0), path: z.string().optional() },
    jsx: `
      var comp = __ae.findComp(args.comp);
      var f = new File(args.path);
      comp.saveFrameToPng(args.time, f);
      return { path: f.fsName };`,
    image: true,
  },
  {
    name: "ae_render",
    description:
      "Render một comp qua Render Queue ra file (chỉ render comp này, các mục khác trong hàng đợi giữ nguyên). " +
      "AE bị khoá cho tới khi render xong.",
    schema: {
      comp: compRef,
      output: z.string().describe("Đường dẫn file ra, vd D:\\\\out\\\\video.mp4"),
      outputModuleTemplate: z.string().optional().describe("Vd 'H.264 - Match Render Settings - 15 Mbps'"),
      renderSettingsTemplate: z.string().optional().describe("Vd 'Best Settings'"),
      timeoutSec: z.number().default(1800),
    },
    timeout: (a) => (a.timeoutSec ?? 1800) * 1000,
    jsx: `
      var comp = __ae.findComp(args.comp), rq = app.project.renderQueue, saved = [];
      for (var i = 1; i <= rq.numItems; i++) {
        try { saved.push([rq.item(i), rq.item(i).render]); rq.item(i).render = false; } catch (e) {}
      }
      var item = rq.items.add(comp);
      if (args.renderSettingsTemplate) item.applyTemplate(args.renderSettingsTemplate);
      var om = item.outputModule(1);
      if (args.outputModuleTemplate) om.applyTemplate(args.outputModuleTemplate);
      om.file = new File(args.output);
      rq.render();
      var status = item.status === RQItemStatus.DONE ? "done" : String(item.status);
      for (var j = 0; j < saved.length; j++) { try { saved[j][0].render = saved[j][1]; } catch (e) {} }
      return { status: status, output: om.file.fsName, templates: om.templates };`,
  },
  {
    name: "ae_run_script",
    description:
      "Chạy ExtendScript tuỳ ý trong AE (cho việc các tool khác chưa có: hiệu ứng, keyframe, expression, mask...). " +
      "Code là thân một hàm: dùng `return` để trả kết quả (giá trị thuần). Có sẵn `args` và helper " +
      "__ae.findComp(ref), __ae.findItem(ref), __ae.findLayer(comp, ref), __ae.compInfo(c), __ae.rgb('#hex'). " +
      "ExtendScript là ES3: không có let/const, arrow function, JSON.",
    schema: {
      code: z.string(),
      args: z.record(z.any()).optional(),
      timeoutSec: z.number().default(120),
    },
    timeout: (a) => (a.timeoutSec ?? 120) * 1000,
    raw: true, // body is args.code, args are args.args
  },
];
