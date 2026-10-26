import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('lucky', {
  platform: process.platform,
  load: () => ipcRenderer.invoke('activity:load'),
  save: (activity: unknown) => ipcRenderer.invoke('activity:save', activity),
  export: (bytes: Uint8Array) => ipcRenderer.invoke('results:export', bytes),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  setDrawActive: (active: boolean) => ipcRenderer.invoke('draw:active', active),
  onFullscreen: (callback: (fullscreen: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value);
    ipcRenderer.on('fullscreen-change', listener);
    return () => ipcRenderer.removeListener('fullscreen-change', listener);
  },
  onPrepareClose: (callback: () => Promise<void>) => {
    const listener = () => {
      Promise.resolve().then(callback).then(() => ipcRenderer.send('app:ready-to-close')).catch(() => ipcRenderer.send('app:close-error'));
    };
    ipcRenderer.on('app:prepare-close', listener);
    return () => ipcRenderer.removeListener('app:prepare-close', listener);
  },
});
