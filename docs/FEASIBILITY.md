# Eyroz integration feasibility

Investigation date: 2026-10-25. Target: one local Codex session in VS Code. Other IDE forks, remote workspaces, WSL bridging, and macOS remain unverified.

## Decision

**CONDITIONAL GO for further feasibility work; NO-GO for full implementation today.**

The local protocol handshake works. Observation of the installed IDE session does not yet work through the tested proxy route. No real running, input-wait, completion, or failure transition has been captured. A desktop UI would not resolve this missing evidence.

Proceed only after a real-session experiment establishes a supported, correctly correlated event source. Do not interpret approval of this document as proof of integration or permission to replace the IDE session with an Eyroz-owned agent.

### Session selection update

A workspace is not a Codex session. A single workspace may host multiple sessions concurrently. Hook events include `session_id`, so Eyroz can discover and present those identities as `workspace · short-session-id`, then bind its single widget to the session explicitly selected by the user. Events for any other discovered session must never update the selected widget. Hook data does not expose a stable human-readable conversation title, so Eyroz must not invent one or read the unsupported transcript format to obtain it.

This solves identity isolation for the single-session MVP. It does not solve full lifecycle fidelity: hooks prove some lifecycle points and tool activity, while only the app-server turn stream documents authoritative `started`, `completed`, `interrupted`, and `failed` outcomes for the thread it owns or is connected to.

## Investigated mechanisms

### App-server

The [official app-server reference](https://learn.chatgpt.com/docs/app-server) documents initialization, loaded-thread enumeration, runtime status, and turn events. `turn/completed` distinguishes completed, interrupted, and failed outcomes. Runtime flags can indicate approval waits. These describe the connected server, not every Codex process on the machine. The reference marks app-server and WebSocket transport experimental and unsupported for production workloads.

Local CLI help also exposes `app-server proxy`. Our isolated stdio handshake and loaded-thread query passed; proxy connection ended before initialization. Launching a separate server therefore does not establish IDE visibility. No supported external observer attachment to this installed extension was established. Do not resume a conversation merely to subscribe: that may change its lifecycle.

Recommendation: retain this as a diagnostic and possible future adapter, conditional on a supported same-server attachment and stable production contract. Do not ship an experimental transport as verified production support.

### Lifecycle hooks

[Official hooks documentation](https://learn.chatgpt.com/docs/hooks) describes user/project configuration, trust review, session/turn IDs and working directory. Candidate events include UserPromptSubmit, PreToolUse, PermissionRequest, Stop, Interrupt and SessionEnd. Hooks are worth a controlled IDE experiment; availability in this installed IDE runtime is unverified.

Our inference: hooks alone are insufficient for authoritative continuous status. Prompt submission precedes actual work; permission hooks precede final approval routing; another Stop hook can continue execution. Subagent hooks share the parent session ID. No periodic heartbeat or comprehensive terminal-failure hook was established. Transcript formats are explicitly unstable. Do not read transcripts as a substitute.

Any capture experiment should emit no decisions, context, approvals, or denials; retain only allowlisted metadata. Project hooks require trust, and policy may disable hooks. Do not install them silently.

### Completion notify callback

[Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications) documents an external callback for `agent-turn-complete`, carrying thread/turn identity and cwd along with sensitive message fields. This may supply completion evidence after IDE verification, but does not supply a full running/waiting/error lifecycle. Discard message content immediately. Do not use operating-system notifications. Not configured or tested here.

### Extension API, SDK, and other signals

The [IDE documentation](https://learn.chatgpt.com/docs/codex/ide) and [developer settings](https://learn.chatgpt.com/docs/developer-settings?surface=ide) did not establish a public third-party session-status subscription API. This is a finding about the reviewed material, not proof no such API can exist.

The installed extension manifest describes `chatgpt.cliExecutable` as development-only and warns about malfunction. A custom executable wrapper or traffic interception is not a recommended production mechanism. Only the manifest was inspected; private bundled implementation was not scraped.

The [Codex platform guide](https://developers.openai.com/blog/codex-as-a-platform) positions the SDK and exec for application-owned programmatic work. Starting such work would not validate this product's existing-IDE-session requirement. MCP tools or skill instructions called at the model's discretion are not reliable lifecycle observers. Process presence, CPU use, window titles, and screen scraping are rejected as status evidence.

## State evidence and gaps

These are proposed acceptance rules, **not implemented or live-verified mappings**.

| State | Evidence required | Current gap |
| --- | --- | --- |
| RUNNING | Authoritative active-turn signal or fresh authoritative snapshot for the selected session | No attached IDE source; prompt submission is insufficient |
| WAITING_FOR_INPUT | An outstanding user-directed approval/input request or authoritative waiting flag | Hook invocation may be auto-resolved; conversational questions cannot be classified by guessing text |
| COMPLETED | Explicit successful terminal outcome for the current turn | Stop/silence/idle are insufficient; interruption must not become success |
| ERROR | Explicit terminal session/turn failure | A failed shell command, hook, transport, or widget is not a failed AI turn |
| DISCONNECTED | Known loss of the selected source transport or explicit source shutdown | Hooks alone cannot reliably report crashes |
| STALE | Freshness deadline exceeded after receiving usable evidence | This reflects uncertainty, never completion |
| UNKNOWN | Startup, insufficient evidence, unsupported schema, cancellation without a matching core state | Always safe; connected does not mean running |

Confirmed means the evidence proves the displayed claim. Inferred evidence must be labeled and cannot drive the four confirmed activity expressions. Metadata must distinguish source time (when supplied), local receipt time, session/turn identity, evidence source, and connection health. Session creation time is not necessarily task start time. Working directory is not always the IDE workspace root.

## Proposed architecture, pending approval and live proof

Prefer a supported, opt-in IDE lifecycle bridge if real testing establishes adequate semantics; otherwise stop or negotiate reduced scope. Keep transport ingestion separate from a typed normalization/transition module. A single selected root session feeds an immutable snapshot to the UI. No provider payloads enter visual components.

Provisional desktop choice: **Tauri 2 + React + TypeScript**. Native Rust owns transport, validated IPC, window operations, settings and redacted diagnostics; TypeScript owns rendering and expressive eyes. The pure status module remains testable without a window. Use local settings files and bounded diagnostic records, no database or cloud services.

| Candidate | Fit and trade-offs |
| --- | --- |
| Tauri 2 | System webview approach fits the lightweight objective; adds Rust tooling and platform-specific webview verification |
| Electron | Node integration may simplify an adapter and Chromium provides consistent rendering; shipping its runtime requires measurement against footprint goals |

Both expose desktop window controls: [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) and [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window). Neither proves always-on-top, transparency, focus, multi-monitor positioning or full-screen behavior on actual target machines. Prefer an opaque unobtrusive capsule if transparency requires unsuitable platform APIs. Framework selection must follow a measured native-window spike after approval, not aesthetics.

Packaging plan to validate: Windows installer with native build tools/WebView2 for Tauri; macOS app bundle built on macOS with Xcode tools, signing and notarization for distribution. No packages have been built, and signing credentials are not available. Do not claim platform support from documentation or compilation alone.

## Freshness, transitions and failure policy proposal

- Start UNKNOWN. Restart never restores persisted green status as current.
- Require a selected session, current turn, compatible schema and source generation before accepting activity evidence. Reject cross-session data and late prior-turn completion.
- New turns invalidate prior completion. Waiting clears only on authoritative resolution/current-state evidence. A malformed relevant event invalidates current confidence rather than preserving green indefinitely.
- Initially expire activity evidence after 30 seconds without an authoritative refresh. This is a conservative product threshold, not a promised Codex event cadence; quiet legitimate work can become STALE. A generic transport heartbeat alone must not refresh activity evidence.
- Known transport closure gives DISCONNECTED immediately; silent failure gives STALE. Preserve prior status only as historical information with its timestamp.
- Reconnect must re-establish identity and obtain current evidence. Do not replay old completion as current. Use bounded backoff (1, 2, 4, 8, 16, 30 seconds plus jitter), with no tight restart loops.
- Unsupported versions, permission failures and adapter startup failures produce connection diagnostics, not fabricated session ERROR. UI rendering failures must not modify session state.

These rules require tests in Phase 4; the present probe is not the status engine.

## Platform, permissions and privacy

Windows: local CLI 0.149.0 reports daemon lifecycle is Unix-only. Proxy probe failed before handshake; its cause is not diagnosed by the redacted probe. This does not establish that every Windows transport is impossible. WSL requires separate path/IPC and runtime validation and is not silently included.

macOS: no device/runtime test performed. Do not extrapolate Windows findings into compatibility claims.

Opening an IDE folder is documented by the [VS Code CLI](https://code.visualstudio.com/docs/configure/command-line). This is the proposed fallback action, labeled “Open workspace in VS Code”; it does not guarantee focus of the exact Codex conversation. `--reuse-window` can target the last active window, so do not assume it identifies the associated session. Validate absolute local destinations and launch through fixed native arguments, never interpolated shell text. Foreground activation and direct session navigation remain untested.

Eyroz should require no elevation, Accessibility permission, cloud account, or code scanning. The underlying Codex session retains its own authentication/setup requirements. A future local bridge needs user-scoped IPC and authenticated/allowlisted input; no public TCP listener. Hook command paths must be reviewed, and enabling hooks must not overwrite existing configuration or trust decisions. Diagnostics must omit prompts, responses, tokens, raw stderr and command arguments. Hash or omit identifiers in exported diagnostics.

The probe only launches a fixed native executable supplied explicitly by the operator. Isolated mode uses an empty temporary CODEX_HOME and deletes only that generated directory after process exit. Proxy mode attempts the CLI's default existing control socket; it starts no daemon and sends no conversation mutations. It does not access project source or parse saved sessions.

## Proof-of-concept results

See [reproducible probe record](../poc/README.md). Five parser/contract tests passed. Real isolated protocol initialization and loaded-thread enumeration passed, returning zero threads. Existing-server proxy failed before initialization. Initial sandbox process-spawn failures were resolved by running the same bounded probes with tool-approved escalation; no application permissions were changed.

No live IDE transitions, hook delivery, error recovery, IDE opening, UI behavior, macOS behavior, or packaging were tested. Stderr is deliberately discarded, so failure root cause requires a separate targeted diagnostic, not invented conclusions.

## Next experiment and approval gate

1. Confirm the target is the installed local VS Code Codex extension and select one harmless test conversation.
2. Prepare a reviewable, opt-in hook capture configuration with a bounded, metadata-only recorder. Verify the installed IDE actually invokes it; preserve existing hooks and trust controls.
3. Compare prompt, active work, approval pending/resolved, successful completion, interruption and genuine failure against actual UI state. Include another Stop hook continuing a turn, subagent events, an IDE crash, silent long reasoning, and delayed delivery. Do not induce destructive failures.
4. Determine which claims require an authoritative snapshot/terminal source beyond hooks. If no supported source closes the gaps, retain NO-GO for the requested full-status MVP. A reduced completion companion or different owned-session product requires explicit scope approval.
5. Repeat on macOS before claiming cross-platform support. Record versions, redacted evidence and missed-event results.

Approval requested: continue this bounded real-IDE feasibility experiment with a concrete capture configuration prepared for review. **Full application implementation is not recommended yet.** The user's Phase 2 approval boundary remains in force; Phase 3–7 files and UI have intentionally not been generated.
