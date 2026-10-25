# Status model

The status engine is deliberately conservative. A beautiful green animation must never stand in for evidence that Codex is working.

| Normalized state | Required evidence | Expression |
| --- | --- | --- |
| `RUNNING` | Authoritative active turn for the selected session | Green, gentle movement |
| `WAITING_FOR_INPUT` | Authoritative approval/input wait | Amber, attentive gaze |
| `COMPLETED` | Explicit successful turn terminal event | Blue, calm happy eyes |
| `ERROR` | Explicit failed turn terminal event | Red, brief alert |
| `DISCONNECTED` | Known bridge closure or startup failure | Dim neutral eyes |
| `STALE` | Previously confirmed activity exceeded freshness window | Dim neutral eyes |
| `UNKNOWN` | No reliable source or unsupported data | Neutral eyes |

Each `SessionSnapshot` records its state, confirmation flag, evidence source, local receipt timestamp, connection health, optional workspace and user-safe detail. The present code has three possible evidence sources: `app-server`, `hook`, and `cli-availability`. CLI availability can never establish a confirmed session state. The hook bridge labels a session as `workspace · short-session-id`; documented hook events do not provide a friendly conversation name.

## Rules

- Start at `UNKNOWN` after launch and after any untrusted event.
- A confirmed state requires `app-server` or `hook` evidence. The UI cannot create one.
- At 30 seconds without a fresh authoritative update, a confirmed state becomes `STALE`; silence is never completion.
- Connection loss becomes `DISCONNECTED`, distinct from `ERROR` and `COMPLETED`.
- A future adapter must invalidate a previous terminal state when a newer turn begins, and reject late events for other sessions or turns.

The 30-second window is a product-side conservative default. It must be configurable only after actual provider cadence is measured.
