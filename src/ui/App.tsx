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

function isBridgeSnapshot(value: unknown): value is Omit<SessionSnapshot, 'receivedAt'> & { sessionLabel: string } {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return ['RUNNING', 'UNKNOWN', 'DISCONNECTED'].includes(String(event.state))
    && typeof event.confirmed === 'boolean'
    && event.evidence === 'hook'
    && typeof event.workspace === 'string'
    && typeof event.sessionLabel === 'string'
    && typeof event.detail === 'string'
    && ['connected', 'disconnected', 'unverified'].includes(String(event.connection));
}

export function App() {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<SessionSnapshot>(() => unknownSession());
  const [probing, setProbing] = useState(false);
  const [workspace, setWorkspace] = useState('No verified session');
  const [attaching, setAttaching] = useState(false);
  useLayoutEffect(() => { void window.eyroz?.identity().then(value => setWorkspace(value.workspace)); }, []);
  useEffect(() => window.eyroz?.onSessionEvent(event => {
    if (!isBridgeSnapshot(event)) return;
    setWorkspace(event.sessionLabel);
    setSession({ ...event, receivedAt: Date.now() });
  }), []);

  async function probe() {
    setProbing(true);
    const result = await window.eyroz?.probeCodex();
    setProbing(false);
    setSession(current => result?.connected
      ? { ...current, detail: `${result.detail} No verified IDE-session bridge is connected.`, receivedAt: Date.now(), connection: 'unverified' }
      : disconnect(current, result?.detail ?? 'Desktop bridge is unavailable.'));
  }

  async function attachWorkspace() {
    const selected = await window.eyroz?.chooseWorkspace();
    if (!selected) return;
    setAttaching(true);
    try {
      const result = await window.eyroz?.installBridge(selected);
      setWorkspace(result?.label ?? workspace);
      setSession(current => ({ ...current, detail: result?.detail ?? 'Bridge setup did not return a result.', receivedAt: Date.now() }));
    } catch (error) {
      setSession(current => disconnect(current, error instanceof Error ? error.message : 'Bridge installation failed.'));
    } finally { setAttaching(false); }
  }

  async function togglePanel() {
    const next = !expanded;
    await window.eyroz?.setExpanded(next);
    setExpanded(next);
  }

  return <main className={expanded ? 'shell shell--expanded' : 'shell'}>
    <section className="widget" onDoubleClick={() => void togglePanel()}>
      <div className="drag-region"><span className="session-label" title={workspace}>{workspace}</span><Eyes state={session.state} compact /></div>
      <button className="chevron" onClick={() => void togglePanel()} aria-label={expanded ? 'Collapse Eyroz' : 'Open Eyroz'}>{expanded ? 'x' : '^'}</button>
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
      <div className="actions"><button onClick={attachWorkspace} disabled={attaching}>{attaching ? 'Installing bridge...' : 'Attach workspace'}</button><button className="secondary" onClick={probe} disabled={probing}>{probing ? 'Checking...' : 'Check Codex'}</button></div>
    </section>}
  </main>;
}
