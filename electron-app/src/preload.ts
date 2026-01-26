import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  invoke: (channel: string, args: any) => ipcRenderer.invoke(channel, args),
  onServerPort: (callback: (port: number) => void) =>
    ipcRenderer.on('server-port', (_event, port) => callback(port)),
});
