import assert from 'node:assert/strict';
import { ACTIONS, actionFor, comboOf, conflicts, defaultKeymap, mergeKeymap, parseKeymapJson, prettyCombo } from '../src/renderer/keymap';
import { viText } from '../src/renderer/vi-runtime';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const ev = (key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

t('comboOf: chuẩn hóa tổ hợp phím, bỏ phím bổ trợ đơn', () => {
  assert.equal(comboOf(ev('s')), 'S');
  assert.equal(comboOf(ev('z', { ctrlKey: true })), 'Ctrl+Z');
  assert.equal(comboOf(ev('S', { ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+S');
  assert.equal(comboOf(ev(' ')), 'Space');
  assert.equal(comboOf(ev('ArrowLeft', { shiftKey: true })), 'Shift+ArrowLeft');
  assert.equal(comboOf(ev('=')), '=');
  assert.equal(comboOf(ev('+', { shiftKey: true })), '+'); // ký hiệu: không ghi Shift
  assert.equal(comboOf(ev('Control', { ctrlKey: true })), null);
  assert.equal(comboOf(ev('Shift', { shiftKey: true })), null);
  assert.equal(comboOf(ev('m', { metaKey: true })), 'Ctrl+M');
});

t('keymap mặc định: mỗi hành động một id, không trùng phím, tra ngược đúng', () => {
  const km = defaultKeymap();
  assert.equal(Object.keys(km).length, ACTIONS.length);
  assert.equal(new Set(ACTIONS.map((a) => a.id)).size, ACTIONS.length);
  assert.deepEqual(conflicts(km), []);
  assert.equal(actionFor(km, 'S'), 'split');
  assert.equal(actionFor(km, 'ctrl+z'), 'undo');
  assert.equal(actionFor(km, 'Q'), null);
});

t('mergeKeymap: ghi đè phần người dùng sửa, bỏ id lạ, phát hiện trùng', () => {
  const km = mergeKeymap({ split: 'X', khongCo: 'Y', delete: 'X' });
  assert.equal(km.split, 'X');
  assert.equal(km.undo, 'Ctrl+Z');
  assert.equal('khongCo' in km, false);
  const dup = conflicts(km);
  assert.equal(dup.length, 1);
  assert.ok(dup[0].ids.includes('delete') && dup[0].ids.includes('split'));
  assert.equal(prettyCombo('Shift+ArrowLeft'), 'Shift+←');
  assert.equal(prettyCombo(''), 'chưa gán');
});

t('viText: khôi phục dấu cho thông báo lõi, giữ nguyên chuỗi đã có dấu và mã', () => {
  assert.equal(viText('khong co clip c1'), 'không có clip c1');
  assert.equal(viText('Khong luu duoc: loi'), 'Không lưu được: lỗi');
  assert.equal(viText('clip c1: in+duration vuot do dai media'), 'clip c1: in+duration vượt độ dài media');
  assert.equal(viText('Đã lưu rồi'), 'Đã lưu rồi');
  assert.equal(viText('propose_ops'), 'propose_ops');
  assert.equal(viText(''), '');
});

t('parseKeymapJson: nhận file xuất ra, bỏ mục lạ, từ chối file hỏng', () => {
  const ok = parseKeymapJson(JSON.stringify({ format: 'tool-edit-keymap', version: 1, keymap: { split: 'X', paste: 'Ctrl+Shift+V', khongCo: 'Q', undo: 5 } }));
  assert.equal(ok.keymap.split, 'X');
  assert.equal(ok.keymap.paste, 'Ctrl+Shift+V');
  assert.equal(ok.keymap.undo, 'Ctrl+Z'); // giá trị sai: giữ mặc định
  assert.equal(ok.applied, 2);
  assert.equal(ok.ignored, 2);
  assert.equal(parseKeymapJson(JSON.stringify({ play: 'P' })).keymap.play, 'P'); // cũng nhận dạng phẳng
  assert.throws(() => parseKeymapJson('{khong json'), /JSON/);
  assert.throws(() => parseKeymapJson('[1,2]'), /không tìm thấy/);
  assert.throws(() => parseKeymapJson(JSON.stringify({ abc: 'x' })), /không có hành động/);
  assert.deepEqual(conflicts(defaultKeymap()), []); // Ctrl+C/X/V/D mới không trùng phím mặc định nào
});

console.log(`${n} test keymap dat`);
