// Helpers inlined into every job sent to After Effects (ExtendScript = ES3: no JSON object).
var __ae = {};

__ae.esc = function (s) {
  s = String(s);
  var out = "";
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), n = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === "\\") out += "\\\\";
    else if (n < 32 || n > 126) {
      var h = n.toString(16);
      while (h.length < 4) h = "0" + h;
      out += "\\u" + h;
    } else out += c;
  }
  return '"' + out + '"';
};

__ae.stringify = function (v, d) {
  d = d || 0;
  if (d > 20) return '"[too deep]"';
  if (v === null || v === undefined) return "null";
  var t = typeof v;
  if (t === "boolean") return v ? "true" : "false";
  if (t === "number") return isFinite(v) ? String(v) : "null";
  if (t === "string") return __ae.esc(v);
  if (t === "function") return "null";
  if (v instanceof Array) {
    var a = [];
    for (var i = 0; i < v.length; i++) a.push(__ae.stringify(v[i], d + 1));
    return "[" + a.join(",") + "]";
  }
  if (v instanceof File || v instanceof Folder) return __ae.esc(v.fsName);
  var parts = [];
  for (var k in v) {
    if (v.hasOwnProperty(k)) parts.push(__ae.esc(k) + ":" + __ae.stringify(v[k], d + 1));
  }
  return "{" + parts.join(",") + "}";
};

// Language-independent item kind (item.typeName is localised).
__ae.kind = function (it) {
  if (it instanceof CompItem) return "comp";
  if (it instanceof FolderItem) return "folder";
  if (it instanceof FootageItem) return (it.mainSource instanceof SolidSource) ? "solid" : "footage";
  return "other";
};

__ae.itemInfo = function (it) {
  var o = {
    id: it.id,
    name: it.name,
    kind: __ae.kind(it),
    folder: (it.parentFolder && it.parentFolder !== app.project.rootFolder) ? it.parentFolder.name : null
  };
  if (o.kind !== "folder" && o.kind !== "other") {
    o.width = it.width; o.height = it.height;
    o.duration = it.duration; o.fps = it.frameRate;
  }
  if (o.kind === "footage" && it.file) o.file = it.file.fsName;
  if (o.kind === "comp") o.numLayers = it.numLayers;
  return o;
};

__ae.layerInfo = function (L) {
  return {
    index: L.index, name: L.name,
    inPoint: L.inPoint, outPoint: L.outPoint, startTime: L.startTime,
    enabled: L.enabled,
    sourceId: (L.source && L.source.id) ? L.source.id : null
  };
};

__ae.compInfo = function (c) {
  var o = __ae.itemInfo(c);
  o.bgColor = c.bgColor;
  o.workAreaStart = c.workAreaStart;
  o.workAreaDuration = c.workAreaDuration;
  o.layers = [];
  for (var i = 1; i <= c.numLayers; i++) o.layers.push(__ae.layerInfo(c.layer(i)));
  return o;
};

// ref: numeric id or exact name.
__ae.findItem = function (ref, kind) {
  var p = app.project;
  for (var i = 1; i <= p.numItems; i++) {
    var it = p.item(i);
    var hit = (typeof ref === "number") ? it.id === ref : it.name === String(ref);
    if (hit && (!kind || __ae.kind(it) === kind)) return it;
  }
  throw new Error("No " + (kind || "item") + " found for: " + ref);
};

__ae.findComp = function (ref) {
  if (ref === undefined || ref === null || ref === "") {
    if (app.project.activeItem instanceof CompItem) return app.project.activeItem;
    throw new Error("No comp given and no active comp");
  }
  return __ae.findItem(ref, "comp");
};

__ae.findLayer = function (comp, ref) {
  if (typeof ref === "number") return comp.layer(ref);
  var L = comp.layer(String(ref));
  if (!L) throw new Error("No layer '" + ref + "' in comp " + comp.name);
  return L;
};

__ae.getFolder = function (name) {
  var p = app.project;
  for (var i = 1; i <= p.numItems; i++) {
    var it = p.item(i);
    if (it instanceof FolderItem && it.name === name) return it;
  }
  return p.items.addFolder(name);
};

__ae.rgb = function (hex) {
  hex = String(hex).replace("#", "");
  if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
  return [parseInt(hex.substr(0, 2), 16) / 255, parseInt(hex.substr(2, 2), 16) / 255, parseInt(hex.substr(4, 2), 16) / 255];
};
