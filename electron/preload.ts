import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('eyroz', {
  probeCodex: () => ipcRenderer.invoke('eyroz:probe-codex') as Promise<{ connected: boolean; detail: string }>,
  identity: () => ipcRenderer.invoke('eyroz:identity') as Promise<{ workspace: string }>,
  chooseWorkspace: () => ipcRenderer.invoke('eyroz:choose-workspace') as Promise<string | undefined>,
  installBridge: (workspace: string) => ipcRenderer.invoke('eyroz:install-bridge', workspace) as Promise<{ workspace: string; label: string; detail: string }>,
  onSessionEvent: (listener: (snapshot: unknown) => void) => {
    const callback = (_event: Electron.IpcRendererEvent, snapshot: unknown) => listener(snapshot);
    ipcRenderer.on('eyroz:session-event', callback);
    return () => ipcRenderer.removeListener('eyroz:session-event', callback);
  },
  openWorkspace: (workspace?: string) => ipcRenderer.invoke('eyroz:open-workspace', workspace) as Promise<boolean>,
  setExpanded: (expanded: boolean) => ipcRenderer.invoke('eyroz:set-expanded', expanded) as Promise<[number, number] | undefined>,
  close: () => ipcRenderer.send('eyroz:close'),
});
