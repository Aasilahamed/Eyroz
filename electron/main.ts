import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const devUrl = process.env.VITE_DEV_SERVER_URL;
let mainWindow: BrowserWindow | null = null;
const compactBounds = { width: 292, height: 86 };
const expandedBounds = { width: 392, height: 610 };

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const window = new BrowserWindow({
    ...compactBounds,
    minWidth: compactBounds.width,
    minHeight: compactBounds.height,
    maxWidth: expandedBounds.width,
    maxHeight: expandedBounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    vibrancy: 'under-window',
    webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.setMenuBarVisibility(false);
  window.on('closed', () => { mainWindow = null; });
  if (devUrl) void window.loadURL(devUrl); else void window.loadFile(path.join(root, '../dist/index.html'));
  mainWindow = window;
  return window;
}

function runVersionProbe(): Promise<{ connected: boolean; detail: string }> {
  return new Promise(resolve => {
    const command = process.platform === 'win32' ? 'codex.cmd' : 'codex';
    const child = spawn(command, ['--version'], { windowsHide: true, shell: false });
    let output = '';
    const timer = setTimeout(() => { child.kill(); resolve({ connected: false, detail: 'Codex command timed out.' }); }, 5000);
    child.stdout.on('data', chunk => { output += String(chunk); });
    child.on('error', () => { clearTimeout(timer); resolve({ connected: false, detail: 'Codex CLI was not found on PATH.' }); });
    child.on('close', code => {
      clearTimeout(timer);
      resolve(code === 0 ? { connected: true, detail: output.trim() || 'Codex CLI available.' } : { connected: false, detail: 'Codex CLI could not be started.' });
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle('eyroz:probe-codex', runVersionProbe);
  ipcMain.handle('eyroz:identity', () => ({ workspace: path.basename(process.cwd()) || 'Eyroz' }));
  ipcMain.handle('eyroz:open-workspace', async (_event, workspace?: string) => {
    if (!workspace || !path.isAbsolute(workspace) || !existsSync(workspace)) return false;
    const result = await shell.openPath(workspace);
    return result === '';
  });
  ipcMain.on('eyroz:resize', (event, expanded: boolean) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.setBounds(expanded ? expandedBounds : compactBounds, true);
  });
  ipcMain.on('eyroz:close', event => BrowserWindow.fromWebContents(event.sender)?.hide());
  app.on('activate', () => { if (!mainWindow) createWindow(); else mainWindow.show(); });
});

app.on('second-instance', () => {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
