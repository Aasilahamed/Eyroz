import test from 'node:test';
import assert from 'node:assert/strict';
import { initialize, inspectResponse } from './protocol.mjs';

test('initialization does not opt into experimental methods or start a turn', () => {
  assert.equal(initialize().method, 'initialize');
  assert.equal(initialize().params.capabilities, undefined);
});
test('handshake cannot imply an active session', () => {
  assert.deepEqual(inspectResponse({ id: 1, result: { userAgent: 'fixture' } }, 1), { handshake: true });
});
test('thread identities are redacted and pagination is not hidden', () => {
  assert.deepEqual(inspectResponse({ id: 2, result: { data: ['private-id'], nextCursor: 'next' } }, 2),
    { loadedThreadsOnPage: 1, hasMore: true });
});
test('unrelated events never satisfy a pending request', () => {
  assert.equal(inspectResponse({ method: 'turn/completed', params: {} }, 2), null);
});
test('malformed and rejected results fail closed', () => {
  for (const input of [null, [], { id: 2 }, { id: 2, error: {} },
    { id: 2, result: { data: [7] } }]) assert.throws(() => inspectResponse(input, 2));
  assert.throws(() => inspectResponse({ id: 1, result: {} }, 1));
});
