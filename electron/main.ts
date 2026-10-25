import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const devUrl = process.env.VITE_DEV_SERVER_URL;
let mainWindow: BrowserWindow | null = null;
const compactBounds = { width: 292, height: 86 };
const expandedBounds = { width: 392, height: 610 };
const bridgePort = 18742;
const supportedHookEvents = new Set(['SessionStart', 'PreToolUse', 'PermissionRequest', 'Stop', 'Interrupt', 'SessionEnd']);
let bridgeSecret = '';
let attachedWorkspace: string | undefined;
let bridgeReady = Promise.resolve();

type BridgeSnapshot = {
  state: 'RUNNING' | 'UNKNOWN' | 'DISCONNECTED';
  confirmed: boolean;
  evidence: 'hook';
  workspace: string;
  sessionLabel: string;
  detail: string;
  connection: 'connected' | 'disconnected' | 'unverified';
};

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
    webPreferences: { preload: path.join(root, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.setMenuBarVisibility(false);
  window.on('closed', () => { mainWindow = null; });
  if (devUrl) void window.loadURL(devUrl); else void window.loadFile(path.join(root, '../dist/index.html'));
  mainWindow = window;
  return window;
}

async function loadBridgeSecret() {
  const file = path.join(app.getPath('userData'), 'eyroz-bridge.json');
  try {
    const stored = JSON.parse(await fs.readFile(file, 'utf8')) as { secret?: unknown; workspace?: unknown };
    if (typeof stored.secret !== 'string') throw new Error('invalid bridge secret');
    bridgeSecret = stored.secret;
    if (typeof stored.workspace === 'string' && path.isAbsolute(stored.workspace)) attachedWorkspace = stored.workspace;
  } catch { bridgeSecret = randomBytes(24).toString('base64url'); }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ secret: bridgeSecret, workspace: attachedWorkspace }), { mode: 0o600 });
}

function snapshotFromHook(input: Record<string, unknown>): BridgeSnapshot | null {
  const hook = input.hook_event_name;
  const workspace = input.cwd;
  const sessionId = input.session_id;
  if (typeof hook !== 'string' || typeof workspace !== 'string' || typeof sessionId !== 'string' || !supportedHookEvents.has(hook) || !path.isAbsolute(workspace) || workspace !== attachedWorkspace) return null;
  const sessionLabel = `${path.basename(workspace)} · ${sessionId.slice(-6)}`;
  const base = { evidence: 'hook' as const, workspace, sessionLabel };
  if (hook === 'PreToolUse') return { ...base, state: 'RUNNING', confirmed: true, connection: 'connected', detail: 'Codex is actively using a tool in this session.' };
  if (hook === 'SessionEnd') return { ...base, state: 'DISCONNECTED', confirmed: false, connection: 'disconnected', detail: 'This Codex session ended.' };
  if (hook === 'SessionStart') return { ...base, state: 'UNKNOWN', confirmed: false, connection: 'connected', detail: 'Connected to this Codex session. Waiting for verified activity.' };
  if (hook === 'PermissionRequest') return { ...base, state: 'UNKNOWN', confirmed: false, connection: 'connected', detail: 'An approval flow began; hook data cannot confirm it needs your response.' };
  return { ...base, state: 'UNKNOWN', confirmed: false, connection: 'connected', detail: 'The turn changed state; hooks do not expose its final outcome.' };
}

function startBridgeServer() {
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/event') { response.writeHead(404).end(); return; }
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; if (body.length > 16_384) request.destroy(); });
    request.on('end', () => {
      try {
        const input = JSON.parse(body) as Record<string, unknown>;
        if (input.secret !== bridgeSecret) throw new Error('unauthorized');
        const snapshot = snapshotFromHook(input);
        if (!snapshot) throw new Error('invalid event');
        mainWindow?.webContents.send('eyroz:session-event', snapshot);
        response.writeHead(204).end();
      } catch { response.writeHead(400).end(); }
    });
  });
  server.listen(bridgePort, '127.0.0.1');
}

function hookScript(secret: string) {
  return `const chunks=[]; for await (const chunk of process.stdin) chunks.push(chunk);\ntry {\n  const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));\n  const controller=new AbortController(); setTimeout(()=>controller.abort(),1000).unref();\n  await fetch('http://127.0.0.1:${bridgePort}/event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input,secret:${JSON.stringify(secret)}}),signal:controller.signal});\n} catch {}\n`;
}

async function installWorkspaceBridge(workspace: string) {
  await bridgeReady;
  if (!path.isAbsolute(workspace) || !existsSync(workspace)) throw new Error('Choose an existing workspace.');
  const codexDir = path.join(workspace, '.codex');
  const hookFile = path.join(codexDir, 'eyroz-bridge.mjs');
  const hooksFile = path.join(codexDir, 'hooks.json');
  await fs.mkdir(codexDir, { recursive: true });
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(await fs.readFile(hooksFile, 'utf8')) as Record<string, unknown>; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Existing .codex/hooks.json is not valid JSON.'); }
  const command = `node \"${hookFile.replaceAll('\\', '/')}\"`;
  for (const event of supportedHookEvents) {
    const groups = Array.isArray(config[event]) ? config[event] as Array<Record<string, unknown>> : [];
    const alreadyInstalled = groups.some(group => Array.isArray(group.hooks) && group.hooks.some(hook => typeof hook === 'object' && hook !== null && (hook as Record<string, unknown>).command === command));
    if (!alreadyInstalled) groups.push({ hooks: [{ type: 'command', command, commandWindows: `node \"${hookFile}\"`, timeout: 3 }] });
    config[event] = groups;
  }
  await fs.writeFile(hookFile, hookScript(bridgeSecret), { mode: 0o600 });
  await fs.writeFile(hooksFile, `${JSON.stringify(config, null, 2)}\n`);
  attachedWorkspace = workspace;
  await fs.writeFile(path.join(app.getPath('userData'), 'eyroz-bridge.json'), JSON.stringify({ secret: bridgeSecret, workspace }), { mode: 0o600 });
  return { workspace, label: path.basename(workspace), detail: 'Bridge installed. Trust the project hooks in Codex, then start or resume a session.' };
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
  bridgeReady = loadBridgeSecret();
  void bridgeReady.then(startBridgeServer);
  createWindow();
  ipcMain.handle('eyroz:probe-codex', runVersionProbe);
  ipcMain.handle('eyroz:identity', () => ({ workspace: path.basename(process.cwd()) || 'Eyroz' }));
  ipcMain.handle('eyroz:choose-workspace', async () => {
    const { dialog } = await import('electron');
    const choice = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return choice.canceled ? undefined : choice.filePaths[0];
  });
  ipcMain.handle('eyroz:install-bridge', (_event, workspace: string) => installWorkspaceBridge(workspace));
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
