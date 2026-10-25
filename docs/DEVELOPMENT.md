# Development

## Prerequisites

- Node.js 22 or later
- npm
- Codex CLI is optional; it enables the availability button only

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install local app tooling |
| `npm run dev` | Run Vite and Electron together |
| `npm test` | Run pure status-engine tests |
| `npm run typecheck` | Type-check renderer and Electron code |
| `npm run build` | Build the renderer and Electron main process |
| `npm start` | Launch a prior production build |

## Packaging

Packaging is not configured yet. A Windows installer needs a Windows package/signing pass; macOS requires a Mac build host, signing, notarization and device testing. Compilation is not a platform-compatibility claim.

## Manual checks

1. Launch Eyroz and confirm it opens as a compact neutral-eyed capsule.
2. Drag the eyes, then verify the widget remains on top of a normal application window.
3. Toggle the chevron and confirm the panel expands and collapses.
4. Click **Check Codex CLI**. If the CLI is installed, expect a message about CLI availability while state remains `UNKNOWN`.
5. Enable reduced motion in the operating system and confirm eye movement stops.

Direct IDE focus and live Codex session events remain unverified and therefore are intentionally disabled in this build.
