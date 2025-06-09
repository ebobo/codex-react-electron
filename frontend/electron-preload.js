import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronApi', {
  loadDwg: (buffer) => ipcRenderer.invoke('load-dwg', buffer),
  renderDwg: (layers) => ipcRenderer.invoke('render-dwg', layers),
})
