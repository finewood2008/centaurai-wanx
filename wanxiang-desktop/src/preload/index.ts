import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('wanxiang', {
  readProject: () => ipcRenderer.invoke('workspace:read-project'),
  saveProject: (project: unknown) =>
    ipcRenderer.invoke('workspace:save-project', project),
  getSystemStatus: () => ipcRenderer.invoke('system:status'),
});
