import { useLayoutEffect, useState } from 'react';
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

export function App() {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<SessionSnapshot>(() => unknownSession());
  const [probing, setProbing] = useState(false);
  const [workspace, setWorkspace] = useState('No verified session');
  useLayoutEffect(() => { window.eyroz?.resize(expanded); }, [expanded]);
  useLayoutEffect(() => { void window.eyroz?.identity().then(value => setWorkspace(value.workspace)); }, []);

  async function probe() {
    setProbing(true);
    const result = await window.eyroz?.probeCodex();
    setProbing(false);
    setSession(current => result?.connected
      ? { ...current, detail: `${result.detail} No verified IDE-session bridge is connected.`, receivedAt: Date.now(), connection: 'unverified' }
      : disconnect(current, result?.detail ?? 'Desktop bridge is unavailable.'));
  }

  return <main className={expanded ? 'shell shell--expanded' : 'shell'}>
    <section className="widget" onDoubleClick={() => setExpanded(value => !value)}>
      <div className="drag-region"><span className="session-label" title={workspace}>{workspace}</span><Eyes state={session.state} compact /></div>
      <button className="chevron" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Collapse Eyroz' : 'Open Eyroz'}>{expanded ? 'x' : '^'}</button>
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
      <div className="actions"><button onClick={probe} disabled={probing}>{probing ? 'Checking Codex…' : 'Check Codex CLI'}</button><button className="secondary" onClick={() => window.eyroz?.close()}>Hide Eyroz</button></div>
    </section>}
  </main>;
}
