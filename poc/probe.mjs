import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { initialize, inspectResponse } from './protocol.mjs';

const [binary, mode = 'isolated'] = process.argv.slice(2);
if (!binary || !isAbsolute(binary) || !['isolated', 'proxy'].includes(mode)) {
  console.error('Usage: node poc/probe.mjs <absolute-native-codex-binary> [isolated|proxy]');
  process.exit(2);
}

// Isolated mode cannot see the IDE session. No credentials or user config copied.
const isolatedHome = mode === 'isolated' ? await mkdtemp(join(tmpdir(), 'eyroz-probe-')) : null;
const report = { mode, handshake: false, ideSessionVerified: false };
try {
  await new Promise(resolve => {
    const child = spawn(binary, ['app-server', ...(mode === 'proxy' ? ['proxy'] : ['--stdio'])], {
      shell: false, windowsHide: true,
      env: isolatedHome ? { ...process.env, CODEX_HOME: isolatedHome } : process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let buffer = '', expectedId = 1, finished = false;
    const finish = reason => {
      if (finished) return;
      finished = true;
      report.outcome = reason;
      clearTimeout(timer);
      child.stdin.destroy();
      child.kill(); // Only our probe child, never the IDE or a shared daemon.
    };
    const timer = setTimeout(() => finish('TIMEOUT'), 8000);
    child.on('error', () => { finish('SPAWN_FAILED'); resolve(); });
    child.on('close', () => { finish('TRANSPORT_CLOSED'); resolve(); });
    child.stdin.on('error', () => finish('TRANSPORT_WRITE_FAILED'));
    child.stderr.on('data', () => { report.stderrObserved = true; });
    const send = value => child.stdin.write(JSON.stringify(value) + '\n');
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (finished) return;
      buffer += chunk;
      if (Buffer.byteLength(buffer) > 1024 * 1024) return finish('MESSAGE_TOO_LARGE');
      let boundary;
      while (!finished && (boundary = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 1);
        if (!line.trim()) continue;
        try {
          const result = inspectResponse(JSON.parse(line), expectedId);
          if (!result) continue;
          Object.assign(report, result);
          if (expectedId === 1) {
            expectedId = 2;
            send({ method: 'initialized', params: {} });
            send({ id: 2, method: 'thread/loaded/list', params: {} });
          } else finish('PROTOCOL_OK');
        } catch {
          finish('INVALID_OR_REJECTED_RESPONSE');
        }
      }
    });
    send(initialize());
  });
} catch {
  report.outcome = 'PROBE_START_FAILED';
} finally {
  if (isolatedHome) await rm(isolatedHome, { recursive: true, force: true });
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.outcome === 'PROTOCOL_OK' ? 0 : 1;
