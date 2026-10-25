import { useEffect, useLayoutEffect, useState } from 'react';
import { disconnect, type SessionSnapshot, unknownSession } from '../status/model';
import { Eyes } from './Eyes';

const statusCopy: Record<SessionSnapshot['state'], string> = {
  RUNNING: 'Codex is working on the current turn.',
  WAITING_FOR_INPUT: 'Codex needs a response or approval.',
  COMPLETED: 'The current turn completed successfully.',
  ERROR: 'The current turn reported a failure.',
  DISCONNECTED: 'The Codex source is disconnected.',
  STALE: 'The last verified state is no longer current.',
  UNKNOWN: 'Connect a supported Codex source to show a live session.',
};

function title(state: SessionSnapshot['state']) { return state.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()); }

function isBridgeSnapshot(value: unknown): value is Omit<SessionSnapshot, 'receivedAt'> & { sessionId: string; sessionLabel: string } {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return ['RUNNING', 'UNKNOWN', 'DISCONNECTED'].includes(String(event.state))
    && typeof event.confirmed === 'boolean'
    && event.evidence === 'hook'
    && typeof event.workspace === 'string'
    && typeof event.sessionId === 'string'
    && typeof event.sessionLabel === 'string'
    && typeof event.detail === 'string'
    && ['connected', 'disconnected', 'unverified'].includes(String(event.connection));
}

type DiscoveredSession = { id: string; label: string; lastSeen: number };

export function App() {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<SessionSnapshot>(() => unknownSession());
  const [probing, setProbing] = useState(false);
  const [workspace, setWorkspace] = useState('No verified session');
  const [attaching, setAttaching] = useState(false);
  const [sessions, setSessions] = useState<DiscoveredSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  useLayoutEffect(() => { window.eyroz?.resize(expanded); }, [expanded]);
  useLayoutEffect(() => { void window.eyroz?.identity().then(value => setWorkspace(value.workspace)); }, []);
  useEffect(() => window.eyroz?.onSessionEvent(event => {
    if (!isBridgeSnapshot(event)) return;
    setSessions(current => [{ id: event.sessionId, label: event.sessionLabel, lastSeen: Date.now() }, ...current.filter(candidate => candidate.id !== event.sessionId)].slice(0, 8));
    if (event.sessionId !== selectedSessionId) return;
    setWorkspace(event.sessionLabel);
    setSession({ ...event, receivedAt: Date.now() });
  }), [selectedSessionId]);

  async function probe() {
    setProbing(true);
    const result = await window.eyroz?.probeCodex();
    setProbing(false);
    setSession(current => result?.connected
      ? { ...current, detail: `${result.detail} Session discovery begins after the workspace hook is trusted and Codex emits an event.`, receivedAt: Date.now(), connection: 'unverified' }
      : disconnect(current, result?.detail ?? 'Desktop bridge is unavailable.'));
  }

  async function attachWorkspace() {
    const selected = await window.eyroz?.chooseWorkspace();
    if (!selected) return;
    setAttaching(true);
    try {
      const result = await window.eyroz?.installBridge(selected);
      setWorkspace(result?.label ?? workspace);
      setSelectedSessionId(undefined);
      setSessions([]);
      setSession(current => ({ ...current, detail: `${result?.detail ?? 'Bridge setup did not return a result.'} Select a discovered session before Eyroz shows its status.`, receivedAt: Date.now() }));
    } catch (error) {
      setSession(current => disconnect(current, error instanceof Error ? error.message : 'Bridge installation failed.'));
    } finally { setAttaching(false); }
  }

  function togglePanel() {
    const next = !expanded;
    window.eyroz?.resize(next);
    setExpanded(next);
  }

  function selectSession(candidate: DiscoveredSession) {
    setSelectedSessionId(candidate.id);
    setWorkspace(candidate.label);
    setSession(current => ({ ...current, state: 'UNKNOWN', confirmed: false, evidence: 'none', connection: 'unverified', detail: 'Selected session. Waiting for its next verified Codex hook event.', receivedAt: Date.now() }));
  }

  return <main className={expanded ? 'shell shell--expanded' : 'shell'}>
    <section className="widget" onDoubleClick={togglePanel}>
      <div className="drag-region"><span className="session-label" title={workspace}>{workspace}</span><Eyes state={session.state} compact /></div>
      <button className="chevron" onClick={togglePanel} aria-label={expanded ? 'Collapse Eyroz' : 'Open Eyroz'}>{expanded ? 'x' : '^'}</button>
    </section>
    {expanded && <section className="panel" aria-live="polite">
      <header><div className="brand"><Eyes state={session.state} compact /><div><strong>Eyroz</strong><span>AI Signal</span></div></div><span className={`badge badge--${session.state.toLowerCase().replaceAll('_', '-')}`}>{title(session.state)}</span></header>
      <div className="session-card">
        <div className="ide-icon">&lt;/&gt;</div><div><strong>{workspace}</strong><span>Codex · VS Code · unverified</span></div>
        <button disabled title="Direct session focusing is not verified yet">Open in IDE</button>
      </div>
      <div className={`status-card status-card--${session.state.toLowerCase().replaceAll('_', '-')}`}>
        <div><span className="status-dot" /><strong>{title(session.state)}</strong><p>{statusCopy[session.state]}</p></div>
        <small>{session.confirmed ? 'Verified now' : 'Not verified'}</small>
      </div>
      <div className="details">
        <p><span>Connection</span><b>{session.connection}</b></p>
        <p><span>Evidence</span><b>{session.evidence}</b></p>
        <p><span>Last updated</span><b>{new Date(session.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b></p>
      </div>
      <p className="note">{session.detail}</p>
      {sessions.length === 0 && <p className="discovery-hint">No sessions discovered yet. In Codex, review and trust the Eyroz project hook, then start or resume a session and let it perform a local tool action. Sessions will appear here.</p>}
      {sessions.length > 0 && <div className="sessions" aria-label="Discovered Codex sessions">
        <span>Discovered sessions</span>
        {sessions.map(candidate => <button key={candidate.id} className={candidate.id === selectedSessionId ? 'session-choice session-choice--selected' : 'session-choice'} onClick={() => selectSession(candidate)}>{candidate.label}{candidate.id === selectedSessionId ? ' · selected' : ''}</button>)}
      </div>}
      <div className="actions"><button onClick={attachWorkspace} disabled={attaching}>{attaching ? 'Installing bridge...' : 'Attach workspace'}</button><button className="secondary" onClick={probe} disabled={probing}>{probing ? 'Checking...' : 'Check Codex'}</button></div>
    </section>}
  </main>;
}
