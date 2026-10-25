import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';

export type CodexThread = { id: string; name?: string; updatedAt?: number; status: string };
type PendingRequest = { resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: NodeJS.Timeout };

export class CodexAppServer {
  private child: ChildProcessWithoutNullStreams | undefined;
  private nextId = 1;
  private buffer = '';
  private pending = new Map<number, PendingRequest>();

  async listThreads(workspace: string): Promise<CodexThread[]> {
    await this.ensureStarted();
    const result = await this.request('thread/list', { limit: 50, sourceKinds: ['vscode'], cwd: workspace });
    if (!isRecord(result) || !Array.isArray(result.data)) throw new Error('Codex returned an invalid thread list.');
    return result.data.flatMap(value => {
      if (!isRecord(value) || typeof value.id !== 'string') return [];
      return [{
        id: value.id,
        name: typeof value.name === 'string' && value.name.trim() ? value.name : undefined,
        updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : undefined,
        status: isRecord(value.status) && typeof value.status.type === 'string' ? value.status.type : 'unknown',
      }];
    });
  }

  stop() {
    this.rejectPending(new Error('Codex App Server stopped.'));
    this.child?.kill();
    this.child = undefined;
  }

  private async ensureStarted() {
    if (this.child) return;
    const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'codex';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'codex app-server --stdio'] : ['app-server', '--stdio'];
    let child: ChildProcessWithoutNullStreams;
    try { child = spawn(command, args, { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { throw new Error('Codex App Server could not be started.'); }
    this.child = child;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => this.read(String(chunk)));
    child.on('error', () => this.closed());
    child.on('close', () => this.closed());
    const initialize = await this.request('initialize', { clientInfo: { name: 'eyroz', version: '0.1.0' } });
    if (!isRecord(initialize) || typeof initialize.userAgent !== 'string') {
      this.stop();
      throw new Error('Codex App Server rejected initialization.');
    }
    this.send({ method: 'initialized', params: {} });
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex App Server timed out while calling ${method}.`));
      }, 8_000);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ id, method, params }); }
      catch { clearTimeout(timer); this.pending.delete(id); reject(new Error('Codex App Server connection is unavailable.')); }
    });
  }

  private send(message: Record<string, unknown>) {
    if (!this.child) throw new Error('not started');
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private read(chunk: string) {
    this.buffer += chunk;
    if (Buffer.byteLength(this.buffer) > 1_048_576) { this.stop(); return; }
    let boundary;
    while ((boundary = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 1);
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line) as Record<string, unknown>;
        if (typeof message.id !== 'number') continue;
        const pending = this.pending.get(message.id);
        if (!pending) continue;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (isRecord(message.error)) {
          const code = typeof message.error.code === 'number' ? ` (code ${message.error.code})` : '';
          pending.reject(new Error(`Codex App Server rejected the request${code}.`));
        }
        else pending.resolve(message.result);
      } catch { this.stop(); }
    }
  }

  private closed() {
    this.child = undefined;
    this.rejectPending(new Error('Codex App Server closed.'));
  }

  private rejectPending(error: Error) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
