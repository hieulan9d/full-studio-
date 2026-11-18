// Phím tắt: danh sách hành động, phím mặc định, chuẩn hóa tổ hợp phím, phát hiện trùng. Cấu hình lưu ở settings.json (người dùng sửa được).
export interface ActionDef {
  id: string;
  label: string;
  group: 'Phát lại' | 'Chỉnh sửa' | 'Dự án' | 'Xem';
  keys: string; // mặc định ('' = chưa gán)
}

export const ACTIONS: ActionDef[] = [
  { id: 'play', label: 'Phát / dừng', group: 'Phát lại', keys: 'Space' },
  { id: 'frameBack', label: 'Lùi 1 khung', group: 'Phát lại', keys: 'ArrowLeft' },
  { id: 'frameFwd', label: 'Tiến 1 khung', group: 'Phát lại', keys: 'ArrowRight' },
  { id: 'secBack', label: 'Lùi 1 giây', group: 'Phát lại', keys: 'Shift+ArrowLeft' },
  { id: 'secFwd', label: 'Tiến 1 giây', group: 'Phát lại', keys: 'Shift+ArrowRight' },
  { id: 'prevEdit', label: 'Nhảy tới điểm cắt trước', group: 'Phát lại', keys: 'ArrowUp' },
  { id: 'nextEdit', label: 'Nhảy tới điểm cắt sau', group: 'Phát lại', keys: 'ArrowDown' },
  { id: 'seekStart', label: 'Về đầu', group: 'Phát lại', keys: 'Home' },
  { id: 'seekEnd', label: 'Tới cuối', group: 'Phát lại', keys: 'End' },
  { id: 'split', label: 'Cắt clip tại con trỏ', group: 'Chỉnh sửa', keys: 'S' },
  { id: 'delete', label: 'Xóa clip đã chọn', group: 'Chỉnh sửa', keys: 'Delete' },
  { id: 'rippleDelete', label: 'Xóa liền (kéo lại khoảng trống)', group: 'Chỉnh sửa', keys: 'Shift+Delete' },
  { id: 'undo', label: 'Hoàn tác', group: 'Chỉnh sửa', keys: 'Ctrl+Z' },
  { id: 'redo', label: 'Làm lại', group: 'Chỉnh sửa', keys: 'Ctrl+Y' },
  { id: 'copy', label: 'Sao chép clip đã chọn', group: 'Chỉnh sửa', keys: 'Ctrl+C' },
  { id: 'cut', label: 'Cắt clip đã chọn (lấy đi, dán lại được)', group: 'Chỉnh sửa', keys: 'Ctrl+X' },
  { id: 'paste', label: 'Dán clip tại con trỏ', group: 'Chỉnh sửa', keys: 'Ctrl+V' },
  { id: 'duplicate', label: 'Nhân đôi clip (đặt ngay sau bản gốc)', group: 'Chỉnh sửa', keys: 'Ctrl+D' },
  { id: 'toggleClip', label: 'Vô hiệu hóa / bật lại clip đã chọn', group: 'Chỉnh sửa', keys: 'V' },
  { id: 'groupClips', label: 'Ghép các clip đã chọn thành clip ghép', group: 'Chỉnh sửa', keys: 'Ctrl+G' },
  { id: 'ungroupClips', label: 'Hủy clip ghép', group: 'Chỉnh sửa', keys: 'Ctrl+Shift+G' },
  { id: 'separateAudio', label: 'Tách video và âm thanh', group: 'Chỉnh sửa', keys: 'Alt+S' },
  { id: 'selectAll', label: 'Chọn tất cả clip', group: 'Chỉnh sửa', keys: 'Ctrl+A' },
  { id: 'deselect', label: 'Bỏ chọn', group: 'Chỉnh sửa', keys: 'Escape' },
  { id: 'addMarker', label: 'Đặt marker tại con trỏ', group: 'Chỉnh sửa', keys: 'M' },
  { id: 'addText', label: 'Thêm chữ tại con trỏ', group: 'Chỉnh sửa', keys: 'T' },
  { id: 'save', label: 'Lưu dự án', group: 'Dự án', keys: 'Ctrl+S' },
  { id: 'saveAs', label: 'Lưu thành…', group: 'Dự án', keys: 'Ctrl+Shift+S' },
  { id: 'open', label: 'Mở dự án…', group: 'Dự án', keys: 'Ctrl+O' },
  { id: 'newProject', label: 'Dự án mới', group: 'Dự án', keys: 'Ctrl+N' },
  { id: 'importMedia', label: 'Nhập media…', group: 'Dự án', keys: 'Ctrl+I' },
  { id: 'importFolder', label: 'Nhập cả thư mục…', group: 'Dự án', keys: 'Ctrl+Shift+I' },
  { id: 'home', label: 'Về Trang chủ', group: 'Dự án', keys: 'Ctrl+H' },
  { id: 'settings', label: 'Mở Cài đặt', group: 'Dự án', keys: 'Ctrl+,' },
  { id: 'export916', label: 'Xuất 9:16', group: 'Dự án', keys: '' },
  { id: 'export169', label: 'Xuất 16:9', group: 'Dự án', keys: '' },
  { id: 'zoomIn', label: 'Phóng to timeline', group: 'Xem', keys: '=' },
  { id: 'zoomOut', label: 'Thu nhỏ timeline', group: 'Xem', keys: '-' },
  { id: 'zoomFit', label: 'Vừa khít timeline', group: 'Xem', keys: 'Shift+Z' },
  { id: 'trackTaller', label: 'Track cao hơn', group: 'Xem', keys: 'Ctrl+=' },
  { id: 'trackShorter', label: 'Track thấp hơn', group: 'Xem', keys: 'Ctrl+-' },
  { id: 'maxTimeline', label: 'Phóng to / thu lại timeline', group: 'Xem', keys: 'Shift+T' },
  { id: 'maxPreview', label: 'Phóng to / thu lại khung xem', group: 'Xem', keys: 'Shift+P' },
  { id: 'scopeWindow', label: 'Mở / đóng cửa sổ Scope riêng', group: 'Xem', keys: 'Ctrl+L' },
  { id: 'pvZoomIn', label: 'Khung xem: phóng to', group: 'Xem', keys: 'Alt+=' },
  { id: 'pvZoomOut', label: 'Khung xem: thu nhỏ', group: 'Xem', keys: 'Alt+-' },
  { id: 'pvFit', label: 'Khung xem: vừa khung', group: 'Xem', keys: 'Alt+0' },
  { id: 'pvActual', label: 'Khung xem: 100%', group: 'Xem', keys: 'Alt+1' },
  { id: 'pvSafe', label: 'Khung xem: bật/tắt vùng an toàn', group: 'Xem', keys: 'Alt+G' },
  { id: 'tabProps', label: 'Mở tab Thuộc tính', group: 'Xem', keys: '1' },
  { id: 'tabColor', label: 'Mở tab Màu', group: 'Xem', keys: '2' },
  { id: 'tabAudio', label: 'Mở tab Âm thanh', group: 'Xem', keys: '3' },
];

const MODS = ['Ctrl', 'Alt', 'Shift'];
const NAMES: Record<string, string> = { ' ': 'Space', Esc: 'Escape' };

/** Chuẩn hóa một sự kiện bàn phím thành chuỗi "Ctrl+Shift+S" (null nếu chỉ là phím bổ trợ). */
export function comboOf(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }): string | null {
  let k = NAMES[e.key] ?? e.key;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(k)) return null;
  if (k.length === 1) k = k.toUpperCase();
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  // Shift chỉ ghi khi ký tự không tự mang Shift (chữ cái, mũi tên, phím chức năng); với ký hiệu như "+" thì bỏ
  if (e.shiftKey && (k.length > 1 || /[A-Z0-9]/.test(k))) parts.push('Shift');
  parts.push(k);
  return parts.join('+');
}

export type Keymap = Record<string, string>;

export function defaultKeymap(): Keymap {
  return Object.fromEntries(ACTIONS.map((a) => [a.id, a.keys]));
}

/** Gộp phím người dùng đã sửa vào mặc định (bỏ id lạ). */
export function mergeKeymap(user: Keymap | undefined): Keymap {
  const base = defaultKeymap();
  for (const [id, k] of Object.entries(user ?? {})) if (id in base && typeof k === 'string') base[id] = k;
  return base;
}

/** Tra ngược: tổ hợp -> id hành động. */
export function actionFor(km: Keymap, combo: string): string | null {
  for (const [id, k] of Object.entries(km)) if (k && k.toLowerCase() === combo.toLowerCase()) return id;
  return null;
}

/** Các cặp hành động trùng phím. */
export function conflicts(km: Keymap): { combo: string; ids: string[] }[] {
  const by = new Map<string, string[]>();
  for (const [id, k] of Object.entries(km)) if (k) by.set(k.toLowerCase(), [...(by.get(k.toLowerCase()) ?? []), id]);
  return [...by.entries()].filter(([, ids]) => ids.length > 1).map(([combo, ids]) => ({ combo, ids }));
}

export const prettyCombo = (k: string) => (k ? k.replace(/ArrowLeft/g, '←').replace(/ArrowRight/g, '→').replace(/ArrowUp/g, '↑').replace(/ArrowDown/g, '↓') : 'chưa gán');
export const RESERVED = ['Alt+F4', 'Ctrl+W', 'Ctrl+R', 'F5'].map((s) => s.toLowerCase());
void MODS;

/** Đọc file bộ phím (JSON) do "Xuất bộ phím" tạo ra: bỏ id lạ / giá trị sai, trả bộ phím đầy đủ + số mục bỏ qua. */
export function parseKeymapJson(text: string): { keymap: Keymap; applied: number; ignored: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('file không phải JSON hợp lệ');
  }
  const src = (raw as { keymap?: unknown })?.keymap ?? raw;
  if (!src || typeof src !== 'object' || Array.isArray(src)) throw new Error('không tìm thấy bộ phím trong file');
  const base = defaultKeymap();
  let applied = 0,
    ignored = 0;
  for (const [id, k] of Object.entries(src as Record<string, unknown>)) {
    if (id in base && typeof k === 'string' && k.length <= 40) {
      base[id] = k;
      applied++;
    } else ignored++;
  }
  if (!applied && ignored) throw new Error('file không có hành động phím nào nhận ra được');
  return { keymap: base, applied, ignored };
}
