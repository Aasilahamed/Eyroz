import type { SessionState } from '../status/model';

export function Eyes({ state, compact = false }: { state: SessionState; compact?: boolean }) {
  const expression = state.toLowerCase().replaceAll('_', '-');
  return <div className={`eyes eyes--${expression} ${compact ? 'eyes--compact' : ''}`} aria-label={`Eyroz is ${state.toLowerCase().replaceAll('_', ' ')}`}>
    <i /><i />
  </div>;
}
