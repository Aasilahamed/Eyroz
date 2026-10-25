export type SessionState =
  | 'RUNNING'
  | 'WAITING_FOR_INPUT'
  | 'COMPLETED'
  | 'ERROR'
  | 'DISCONNECTED'
  | 'STALE'
  | 'UNKNOWN';

export type Evidence = 'app-server' | 'hook' | 'cli-availability' | 'none';

export interface SessionSnapshot {
  state: SessionState;
  confirmed: boolean;
  evidence: Evidence;
  receivedAt: number;
  workspace?: string;
  detail: string;
  connection: 'connected' | 'disconnected' | 'unverified';
}

export const unknownSession = (now = Date.now()): SessionSnapshot => ({
  state: 'UNKNOWN', confirmed: false, evidence: 'none', receivedAt: now,
  detail: 'Eyroz has not verified a Codex IDE session.', connection: 'unverified',
});

export function receiveConfirmed(
  current: SessionSnapshot,
  next: Extract<SessionState, 'RUNNING' | 'WAITING_FOR_INPUT' | 'COMPLETED' | 'ERROR'>,
  evidence: Exclude<Evidence, 'none' | 'cli-availability'>,
  now: number,
  detail: string,
): SessionSnapshot {
  return { ...current, state: next, confirmed: true, evidence, receivedAt: now, detail, connection: 'connected' };
}

export function disconnect(current: SessionSnapshot, detail: string, now = Date.now()): SessionSnapshot {
  return { ...current, state: 'DISCONNECTED', confirmed: false, evidence: 'none', receivedAt: now, detail, connection: 'disconnected' };
}

export function freshness(current: SessionSnapshot, now = Date.now(), maxAgeMs = 30_000): SessionSnapshot {
  if (!current.confirmed || now - current.receivedAt <= maxAgeMs) return current;
  return { ...current, state: 'STALE', confirmed: false, detail: 'The last verified update is no longer fresh.', connection: 'unverified' };
}
