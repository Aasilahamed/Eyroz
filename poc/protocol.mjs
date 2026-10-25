// Feasibility probe only. Never produces a production session status.
export function initialize() {
  return { id: 1, method: 'initialize', params: {
    clientInfo: { name: 'eyroz_feasibility', version: '0.0.1' },
  } };
}

export function inspectResponse(message, expectedId) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    throw new Error('INVALID_MESSAGE');
  }
  if (message.id !== expectedId) return null;
  if (message.error) throw new Error('RPC_REJECTED');
  if (!message.result || typeof message.result !== 'object') {
    throw new Error('INVALID_RESULT');
  }
  if (expectedId === 1) {
    if (typeof message.result.userAgent !== 'string') throw new Error('INVALID_INITIALIZE');
    return { handshake: true };
  }
  const { data, nextCursor } = message.result;
  if (!Array.isArray(data) || !data.every(id => typeof id === 'string')) {
    throw new Error('INVALID_LOADED_THREADS');
  }
  // Report counts only; do not expose session IDs or conversation content.
  return { loadedThreadsOnPage: data.length, hasMore: Boolean(nextCursor) };
}
