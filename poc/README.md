# Read-only Codex protocol probe

Requires Node.js 22+ and an installed native Codex executable. No npm dependencies. This is a diagnostic, not an integration or simulated preview.

```powershell
node poc/protocol.test.mjs
node poc/probe.mjs 'C:/absolute/path/to/codex.exe' isolated
node poc/probe.mjs 'C:/absolute/path/to/codex.exe' proxy
```

On macOS use the absolute native executable path. Do not pass a .cmd/.ps1 launcher. Modes:

- `isolated`: starts a separate app-server with an empty temporary CODEX_HOME; initializes and lists loaded thread IDs, reporting only the count. It cannot observe the IDE. No login or inference request is made.
- `proxy`: invokes the installed CLI's documented-in-help proxy command against its default existing control socket. It does not start or restart a daemon. It only initializes and queries loaded-thread count. A success would still require proving that the server belongs to the IDE.

Both modes have an eight-second response deadline, a 1 MiB buffer limit, no shell execution and no automatic retry. They terminate only their own child process. Output omits raw payloads, identifiers and stderr. Paginated counts are explicitly only one page. Neither mode starts, resumes, interrupts or modifies a conversation, nor answers an approval request.

### VS Code thread-list experiment

`node poc/list-local-vscode-threads.mjs` starts a separate local `codex app-server` process using the normal Codex state and performs only the documented `initialize` handshake plus `thread/list` for `sourceKinds: ["vscode"]` and the current working directory. Its redacted result reports a count only. It is a feasibility experiment, not a production integration: a positive result still needs live status-event testing, while a zero result means this app-server process cannot presently see a matching persisted VS Code thread.

Actual Windows run on 2026-10-25: handshake succeeded and returned `vscodeThreads: 2` for this workspace. No conversation content, identifiers, or thread metadata were printed.

## Actual run: Windows, 2026-10-25

Node v22.13.1; Codex CLI 0.149.0; installed VS Code extension openai.chatgpt 26.908.40401.

Five tests passed using `node poc/protocol.test.mjs`: initialization scope, handshake semantics, redaction/pagination, unrelated-event rejection, and malformed/RPC-error validation. Tests use explicit fixtures and do not validate real session transitions.

Isolated mode (exit 0):

```json
{
  "mode": "isolated",
  "handshake": true,
  "ideSessionVerified": false,
  "loadedThreadsOnPage": 0,
  "hasMore": false,
  "outcome": "PROTOCOL_OK"
}
```

Proxy mode (exit 1):

```json
{
  "mode": "proxy",
  "handshake": false,
  "ideSessionVerified": false,
  "stderrObserved": true,
  "outcome": "TRANSPORT_CLOSED"
}
```

Separately, `codex app-server daemon version` reported that daemon lifecycle is only supported on Unix platforms. This does not diagnose every possible proxy failure.

Initial sandbox execution denied Node child-process spawning (`EPERM`), including the test runner subprocess. The bounded commands were subsequently allowed through the tool's escalation review and produced the results above. The probe now catches synchronous startup errors and returns `PROBE_START_FAILED` without dumping paths or raw error content.

Not tested: real IDE event visibility, hook installation/delivery, live state normalization, protocol streaming under sustained load, timeout behavior against a hanging child, reconnection, macOS or native desktop windows. `ideSessionVerified` intentionally remains false: these probes cannot establish that fact.
