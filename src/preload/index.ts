import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  saveProject: (suggestedName: string, content: string) => ipcRenderer.invoke('project:save', suggestedName, content),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveWav: (suggestedName: string, data: ArrayBuffer) => ipcRenderer.invoke('audio:saveWav', suggestedName, data)
})
