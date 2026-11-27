const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getDataDir: () => ipcRenderer.invoke("desktop:get-data-dir"),
  chooseDataDir: () => ipcRenderer.invoke("desktop:choose-data-dir"),
  openDataDir: () => ipcRenderer.invoke("desktop:open-data-dir"),
  saveOutput: (data, name, mime) => ipcRenderer.invoke("desktop:save-output", data, name, mime),
  gemini: {
    generateVideo: (job) => ipcRenderer.invoke("gemini:generateVideo", job),
    accounts: () => ipcRenderer.invoke("gemini:accounts"),
    check: () => ipcRenderer.invoke("gemini:check"),
    add: () => ipcRenderer.invoke("gemini:add"),
    open: (id) => ipcRenderer.invoke("gemini:open", id),
    use: (id) => ipcRenderer.invoke("gemini:use", id),
    rename: (id, name) => ipcRenderer.invoke("gemini:rename", id, name),
    remove: (id) => ipcRenderer.invoke("gemini:remove", id),
  },
  flow: {
    status: () => ipcRenderer.invoke("flow:status"),
    show: () => ipcRenderer.invoke("flow:show"),
    accounts: () => ipcRenderer.invoke("flow:accounts"),
    switchAccount: (id) => ipcRenderer.invoke("flow:switch-account", id),
    addAccount: () => ipcRenderer.invoke("flow:add-account"),
    removeAccount: (id) => ipcRenderer.invoke("flow:remove-account", id),
    renameAccount: (id, name) => ipcRenderer.invoke("flow:rename-account", id, name),
    openAccount: (id) => ipcRenderer.invoke("flow:open-account", id),
    refreshCredits: () => ipcRenderer.invoke("flow:refresh-credits"),
    setMinCredits: (n) => ipcRenderer.invoke("flow:set-min-credits", n),
    generateVideo: (job) => ipcRenderer.invoke("flow:generate-video", job),
    generateImage: (job) => ipcRenderer.invoke("flow:generate-image", job),
  },
});
