import assert from 'node:assert/strict';
import test from 'node:test';
import { disconnect, freshness, receiveConfirmed, unknownSession } from './model.js';

test('starts unknown and never treats CLI presence as an active session', () => {
  const session = unknownSession(1);
  assert.equal(session.state, 'UNKNOWN');
  assert.equal(session.confirmed, false);
});

test('only authoritative events can establish an active state', () => {
  const running = receiveConfirmed(unknownSession(1), 'RUNNING', 'app-server', 2, 'Turn is active.');
  assert.equal(running.state, 'RUNNING');
  assert.equal(running.confirmed, true);
});

test('silence becomes stale, never completed', () => {
  const running = receiveConfirmed(unknownSession(1), 'RUNNING', 'app-server', 2, 'Turn is active.');
  assert.equal(freshness(running, 30_003).state, 'STALE');
});

test('disconnect is distinct from completion', () => {
  const disconnected = disconnect(unknownSession(1), 'Bridge closed.', 2);
  assert.equal(disconnected.state, 'DISCONNECTED');
  assert.equal(disconnected.confirmed, false);
});
