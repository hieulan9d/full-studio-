const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getDataDir: () => ipcRenderer.invoke("desktop:get-data-dir"),
  chooseDataDir: () => ipcRenderer.invoke("desktop:choose-data-dir"),
  openDataDir: () => ipcRenderer.invoke("desktop:open-data-dir"),
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
