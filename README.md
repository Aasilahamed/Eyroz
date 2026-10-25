# Eyroz

Eyroz is a local floating desktop companion for showing a **verified** Codex session state at a glance.

## Current implementation

- Frameless, always-on-top Electron widget for Windows and macOS.
- Dark capsule robot eyes with state-specific expressions and reduced-motion support.
- Expandable single-session panel with connection evidence and freshness-safe presentation.
- Typed status engine with unit tests for unknown, verified, stale and disconnected states.
- Local Codex CLI availability probe; it never starts, resumes or changes an AI session.

Eyroz deliberately starts as `UNKNOWN`. It does not currently observe an existing Codex IDE conversation, because that bridge has not been verified by the feasibility work. The UI does not simulate live activity.

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
