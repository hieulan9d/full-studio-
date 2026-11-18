import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('toolEdit', {
  // render / xuat (engine)
  onRenderRequest: (cb: (req: unknown) => void) => ipcRenderer.on('render-request', (_e, req) => cb(req)),
  onExportStart: (cb: (req: unknown) => void) => ipcRenderer.on('export-start', (_e, req) => cb(req)),
  onExportCancel: (cb: (jobId: string) => void) => ipcRenderer.on('export-cancel', (_e, id) => cb(id)),
  onQcRequest: (cb: (req: unknown) => void) => ipcRenderer.on('qc-request', (_e, req) => cb(req)),
  sendQcResult: (res: unknown) => ipcRenderer.send('qc-result', res),
  sendRenderResult: (res: unknown) => ipcRenderer.send('render-result', res),
  sendSelftest: (res: unknown) => ipcRenderer.send('selftest-result', res),
  ready: (info: unknown) => ipcRenderer.send('renderer-ready', info),
  exportFrame: (buf: ArrayBuffer, jobId: string) => ipcRenderer.invoke('export-frame', buf, jobId),
  exportEnd: (r: unknown) => ipcRenderer.send('export-end', r),
  // du lieu media
  readCache: (mediaId: string) => ipcRenderer.invoke('read-cache', mediaId),
  readAudio: (mediaId: string) => ipcRenderer.invoke('read-audio', mediaId),
  readMediaFile: (mediaId: string) => ipcRenderer.invoke('read-media-file', mediaId),
  // giao dien
  onState: (cb: (s: unknown) => void) => ipcRenderer.on('state', (_e, s) => cb(s)),
  api: (method: string, path: string, body?: unknown) => ipcRenderer.invoke('api', method, path, body),
  readLibrary: (id: string) => ipcRenderer.invoke('read-library', id),
  keymapExport: (text: string) => ipcRenderer.invoke('keymap-export', text),
  keymapImport: () => ipcRenderer.invoke('keymap-import'),
  readLut: (file: string) => ipcRenderer.invoke('read-lut', file),
  dialogCubeOpen: () => ipcRenderer.invoke('dialog:cube-open'),
  dialogCubeSave: (name: string) => ipcRenderer.invoke('dialog:cube-save', name),
  writeText: (file: string, text: string) => ipcRenderer.invoke('write-text', file, text),
  dialogDir: () => ipcRenderer.invoke('dialog:dir'),
  dialogMedia: () => ipcRenderer.invoke('dialog:media'),
  dialogSave: () => ipcRenderer.invoke('dialog:save'),
  dialogOpen: () => ipcRenderer.invoke('dialog:open'),
  showInFolder: (p: string) => ipcRenderer.invoke('show-in-folder', p),
  pathForFile: (f: File) => webUtils.getPathForFile(f), // keo-tha file tu Explorer vao cua so
});
