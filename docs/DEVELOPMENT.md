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

Direct IDE focus remains unverified and disabled. Live Codex session events require the opt-in local hook bridge below.

## Attach Eyroz to a Codex session

1. Start Eyroz and open its compact panel with the chevron.
2. Click **Attach workspace** and choose the project open in your Codex IDE session.
3. Eyroz writes `.codex/hooks.json` and `.codex/eyroz-bridge.mjs` inside that project. Existing hooks are retained; duplicate Eyroz hooks are not added.
4. Review and trust the project hooks when Codex asks. This is required by Codex for project-local hooks.
5. Start or resume the Codex session. The capsule becomes labeled as `workspace · short-session-id` after its first lifecycle event.

The hook bridge is local-only and listens on `127.0.0.1`. It sends only session ID, working directory, hook event name and turn ID. It does not parse transcripts or send prompts, source code, assistant text or tool arguments. If Eyroz is closed, hooks return normally without affecting Codex.

`PreToolUse` is the only mapped confirmed activity signal because it proves Codex is invoking a tool. `SessionStart` attaches identity. `PermissionRequest`, `Stop` and `Interrupt` stay `UNKNOWN`, since hooks alone cannot prove that the interface is waiting on you or that a turn completed successfully. `SessionEnd` becomes `DISCONNECTED`.
