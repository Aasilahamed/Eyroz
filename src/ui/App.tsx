import { useLayoutEffect, useState } from 'react';
import { disconnect, type SessionSnapshot, unknownSession } from '../status/model';
import { Eyes } from './Eyes';

type CodexSession = { id: string; name?: string; updatedAt?: number; status: string };

const statusCopy: Record<SessionSnapshot['state'], string> = {
  RUNNING: 'Codex is working on the current turn.',
  WAITING_FOR_INPUT: 'Codex needs a response or approval.',
  COMPLETED: 'The current turn completed successfully.',
  ERROR: 'The current turn reported a failure.',
  DISCONNECTED: 'The Codex source is disconnected.',
  STALE: 'The last verified state is no longer current.',
  UNKNOWN: 'Select a Codex session to show its verified live status.',
};

function title(state: SessionSnapshot['state']) { return state.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()); }
function workspaceLabel(workspace: string) { return workspace.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace; }
function sessionLabel(session: CodexSession) { return session.name ?? `Codex session ${session.id.slice(-6)}`; }

export function App() {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<SessionSnapshot>(() => unknownSession());
  const [workspace, setWorkspace] = useState('Choose workspace');
  const [workspacePath, setWorkspacePath] = useState<string>();
  const [sessions, setSessions] = useState<CodexSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const selectedSession = sessions.find(candidate => candidate.id === selectedSessionId);

  useLayoutEffect(() => { window.eyroz?.resize(expanded); }, [expanded]);

  async function loadSessions(path: string) {
    setLoading(true);
    try {
      const found = await window.eyroz?.listSessions(path) ?? [];
      setSessions(found);
      setSelectedSessionId(current => found.some(candidate => candidate.id === current) ? current : undefined);
      setSession(current => ({ ...current, state: 'UNKNOWN', confirmed: false, evidence: 'none', connection: 'connected', detail: found.length ? 'Choose a Codex session. Eyroz lists its stored name directly from local Codex state.' : 'No VS Code Codex sessions were found for this workspace.', receivedAt: Date.now() }));
    } catch (error) {
      setSessions([]);
      setSelectedSessionId(undefined);
      setSession(current => disconnect(current, error instanceof Error ? error.message : 'Codex App Server could not list sessions.'));
    } finally { setLoading(false); }
  }

  async function chooseWorkspace() {
    const selected = await window.eyroz?.chooseWorkspace();
    if (!selected) return;
    setWorkspacePath(selected);
    setWorkspace(workspaceLabel(selected));
    await loadSessions(selected);
  }

  function selectSession(candidate: CodexSession) {
    setSelectedSessionId(candidate.id);
    setSession(current => ({ ...current, state: 'UNKNOWN', confirmed: false, evidence: 'app-server', connection: 'connected', detail: 'Selected session. Eyroz verified its name and workspace through local Codex state; live IDE event subscription is not verified yet.', receivedAt: Date.now() }));
  }

  function togglePanel() {
    const next = !expanded;
    window.eyroz?.resize(next);
    setExpanded(next);
  }

  const heading = selectedSession ? sessionLabel(selectedSession) : workspace;
  return <main className={expanded ? 'shell shell--expanded' : 'shell'}>
    <section className="widget" onDoubleClick={togglePanel}>
      <div className="drag-region"><span className="session-label" title={heading}>{heading}</span><Eyes state={session.state} compact /></div>
      <button className="chevron" onClick={togglePanel} aria-label={expanded ? 'Collapse Eyroz' : 'Open Eyroz'}>{expanded ? 'x' : '^'}</button>
    </section>
    {expanded && <section className="panel" aria-live="polite">
      <header><div className="brand"><Eyes state={session.state} compact /><div><strong>Eyroz</strong><span>AI Signal</span></div></div><span className={`badge badge--${session.state.toLowerCase().replaceAll('_', '-')}`}>{title(session.state)}</span></header>
      <div className="session-card">
        <div className="ide-icon">&lt;/&gt;</div><div><strong>{heading}</strong><span>Codex · VS Code · {selectedSession ? 'selected session' : 'no session selected'}</span></div>
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
      {sessions.length > 0 && <div className="sessions" aria-label="Codex sessions in this workspace">
        <span>Codex sessions in {workspace}</span>
        {sessions.map(candidate => <button key={candidate.id} className={candidate.id === selectedSessionId ? 'session-choice session-choice--selected' : 'session-choice'} onClick={() => selectSession(candidate)}>{sessionLabel(candidate)}{candidate.id === selectedSessionId ? ' · selected' : ''}</button>)}
      </div>}
      {!loading && workspacePath && sessions.length === 0 && <p className="discovery-hint">No VS Code Codex sessions match this exact workspace path.</p>}
      <div className="actions"><button onClick={chooseWorkspace} disabled={loading}>{loading ? 'Loading sessions...' : 'Choose workspace'}</button><button className="secondary" onClick={() => workspacePath && void loadSessions(workspacePath)} disabled={!workspacePath || loading}>{loading ? 'Loading...' : 'Refresh sessions'}</button></div>
    </section>}
  </main>;
}
