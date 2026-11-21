import test from 'node:test';
import assert from 'node:assert/strict';
import { api, tokenStore } from './api.js';

test('a response from a previous session cannot log out the newly signed-in account', async t => {
  const originals = { fetch: globalThis.fetch, window: globalThis.window, sessionStorage: globalThis.sessionStorage };
  const storage = new Map();
  let expired = 0;
  globalThis.sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  globalThis.window = { dispatchEvent: () => { expired += 1; } };
  t.after(() => { Object.assign(globalThis, originals); });
  let reply;
  globalThis.fetch = () => new Promise(resolve => { reply = resolve; });
  tokenStore.set('previous-teacher-token');
  const oldRequest = api('/auth/me');
  tokenStore.set('new-tutor-token');
  reply({ ok: false, status: 401, json: async () => ({ message: 'Expired' }) });
  await assert.rejects(oldRequest, { status: 401 });
  assert.equal(tokenStore.get(), 'new-tutor-token');
  assert.equal(expired, 0);
  const currentRequest = api('/auth/me');
  reply({ ok: false, status: 401, json: async () => ({ message: 'Expired' }) });
  await assert.rejects(currentRequest, { status: 401 });
  assert.equal(tokenStore.get(), null);
  assert.equal(expired, 1);
});
