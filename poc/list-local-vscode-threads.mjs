import { spawn } from 'node:child_process';

// Read-only feasibility check. It starts only its own app-server process and
// asks for metadata for VS Code threads whose cwd is this workspace.
const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'codex';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'codex app-server --stdio'] : ['app-server', '--stdio'];
const report = { handshake: false, workspace: process.cwd(), vscodeThreads: 0, outcome: 'STARTING' };

await new Promise(resolve => {
  let child;
  try { child = spawn(command, args, { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch { report.outcome = 'SPAWN_FAILED'; resolve(); return; }
  let buffer = '';
  let complete = false;
  const finish = outcome => {
    if (complete) return;
    complete = true;
    report.outcome = outcome;
    clearTimeout(timer);
    child.stdin.destroy();
    child.kill();
    resolve();
  };
  const timer = setTimeout(() => finish('TIMEOUT'), 10_000);
  const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
  child.on('error', () => finish('SPAWN_FAILED'));
  child.on('close', () => finish(report.outcome === 'STARTING' ? 'TRANSPORT_CLOSED' : report.outcome));
  child.stdin.on('error', () => finish('WRITE_FAILED'));
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    if (complete) return;
    buffer += chunk;
    if (Buffer.byteLength(buffer) > 1_048_576) return finish('MESSAGE_TOO_LARGE');
    let boundary;
    while (!complete && (boundary = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.id === 1) {
          if (message.error || typeof message.result?.userAgent !== 'string') return finish('INITIALIZE_REJECTED');
          report.handshake = true;
          send({ method: 'initialized', params: {} });
          send({ id: 2, method: 'thread/list', params: { limit: 50, sourceKinds: ['vscode'], cwd: process.cwd() } });
        } else if (message.id === 2) {
          if (message.error || !Array.isArray(message.result?.data)) return finish('LIST_REJECTED');
          report.vscodeThreads = message.result.data.length;
          finish('PROTOCOL_OK');
        }
      } catch { finish('INVALID_RESPONSE'); }
    }
  });
  send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'eyroz-feasibility', version: '0.1.0' } } });
});

console.log(JSON.stringify(report));
process.exitCode = report.outcome === 'PROTOCOL_OK' ? 0 : 1;
