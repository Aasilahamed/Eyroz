import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('eyroz', {
  probeCodex: () => ipcRenderer.invoke('eyroz:probe-codex') as Promise<{ connected: boolean; detail: string }>,
  identity: () => ipcRenderer.invoke('eyroz:identity') as Promise<{ workspace: string }>,
  openWorkspace: (workspace?: string) => ipcRenderer.invoke('eyroz:open-workspace', workspace) as Promise<boolean>,
  resize: (expanded: boolean) => ipcRenderer.send('eyroz:resize', expanded),
  close: () => ipcRenderer.send('eyroz:close'),
});
