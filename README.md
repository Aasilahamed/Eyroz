# Eyroz

Eyroz is a local floating desktop companion for showing a **verified** Codex session state at a glance.

## Current implementation

- Frameless, always-on-top Electron widget for Windows and macOS.
- Dark capsule robot eyes with state-specific expressions and reduced-motion support.
- Expandable single-session panel with connection evidence and freshness-safe presentation.
- Typed status engine with unit tests for unknown, verified, stale and disconnected states.
- Opt-in, local Codex workspace bridge. It identifies a real session by workspace and a short session ID.

Eyroz deliberately starts as `UNKNOWN`. Use **Attach workspace** in its expanded panel to install the local hook bridge in the project that has the Codex session. The bridge sends no source code, prompts, transcripts or messages. Codex must trust the project hooks before it can deliver events.

The bridge can confirm active tool work. Lifecycle hooks do not expose a reliable successful/failed terminal outcome, so Eyroz remains `UNKNOWN` when it cannot prove the state.

## Run locally

```powershell
npm install
npm run dev
```

Run checks with `npm test`, `npm run typecheck`, and `npm run build`.

## Documentation

- [Repository assessment](docs/REPOSITORY_ASSESSMENT.md)
- [Feasibility](docs/FEASIBILITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Status model](docs/STATUS_MODEL.md)
- [Development](docs/DEVELOPMENT.md)
- [Protocol probe](poc/README.md)
