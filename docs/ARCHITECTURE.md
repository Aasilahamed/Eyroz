# Architecture

Eyroz uses Electron with React and TypeScript. Electron was selected over Tauri for the initial Windows build because the available environment has Node and the desktop app needs a local process adapter; Rust/Cargo is not installed. This is a framework decision, not an assertion of macOS support.

```text
Codex source adapter → status/model.ts → React UI
      │                     │               │
 native process/IPC    freshness rules    eyes + panel
      └──────── Electron main + preload ─────┘
```

`electron/main.ts` owns window creation, native process launch, bounded CLI availability checks, fixed-argument workspace opening, and narrow IPC. It exposes no Node APIs to the renderer. `electron/preload.ts` exposes only named operations with primitive return values.

`src/status/model.ts` is a pure state module. Provider adapters must use `receiveConfirmed` only when a source supplies authoritative evidence. The UI receives normalized snapshots and never parses a Codex event.

`src/ui` contains presentation only. It maps states to visual expressions but cannot select a state or infer one from animation. The widget is always on top and may be dragged from its eye region. Hiding the app does not terminate Codex.

The eventual Codex adapter must bind one user-selected root thread, retain its source generation and current turn ID, and send a fresh snapshot over a narrow IPC channel. It must not parse session transcripts or inspect private extension internals. It should reject mismatched thread/turn events and mark the state stale after the documented freshness deadline.

## Security boundary

The renderer runs with `contextIsolation` and without Node integration. The CLI probe uses a fixed command and `shell: false`; it accepts no renderer-controlled executable or arguments. Workspace opening accepts only existing absolute paths. No source files, prompts, responses, tokens, raw stderr, or thread IDs are shown or persisted.

No cloud service, account storage, telemetry, database, generic shell input, or hidden traffic inspection is included.
