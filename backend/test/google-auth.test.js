import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { googleAuthService } from '../src/services/google-auth.service.js';

const config = { secret: 'test-google-secret-with-more-than-32-characters', googleClientId: 'test.apps.googleusercontent.com', expiresIn: '1h' };
function setup() {
  const users = [];
  let payload;
  const db = { user: {
    findUnique: async ({ where }) => users.find(u => Object.entries(where).every(([k, v]) => u[k] === v)) || null,
    create: async ({ data }) => { const user = { id: randomUUID(), ...data }; users.push(user); return user; },
  } };
  const verifier = { verifyIdToken: async ({ idToken, audience }) => {
    assert.equal(audience, config.googleClientId);
    if (idToken === 'invalid') throw new Error('bad signature');
    return { getPayload: () => payload };
  } };
  const service = googleAuthService(db, config, verifier);
  const challenge = service.challenge();
  payload = { sub: 'google-subject-123', email: 'tutor@example.test', email_verified: true, name: 'Ana', nonce: challenge.nonce };
  const request = { credential: 'verified-by-test-verifier', challenge: challenge.challenge, role: 'TUTOR', guardian: { age: 35, relationship: 'MOTHER', responsible: true } };
  return { users, service, request, payload };
}

test('Google login creates one account, retains the verified subject and issues an app JWT', async () => {
  const { service, request, users } = setup();
  const first = await service.login(request);
  assert.equal(first.user.role, 'STUDENT');
  assert.equal(users[0].googleSubject, 'google-subject-123');
  assert.equal(users[0].passwordHash, undefined);
  assert.equal(users[0].studentProfile.create.preferences.guardian.verification, 'SELF_DECLARED');
  assert.equal(jwt.verify(first.token, config.secret, { issuer: 'neurotalento', audience: 'neurotalento-api' }).sub, first.user.id);
  assert.equal((await service.login(request)).user.id, first.user.id);
  assert.equal(users.length, 1);
  await assert.rejects(service.login({ ...request, role: 'TEACHER' }), { status: 409 });
});

test('invalid credentials, nonce, expired challenge and unverified email never create an account', async () => {
  const { service, request, payload, users } = setup();
  await assert.rejects(service.login({ ...request, credential: 'invalid' }), { status: 401 });
  await assert.rejects(service.login({ ...request, challenge: 'tampered' }), { status: 401 });
  const expired = jwt.sign({ nonce: payload.nonce }, config.secret, { audience: 'google-login', issuer: 'neurotalento', expiresIn: -1 });
  await assert.rejects(service.login({ ...request, challenge: expired }), { status: 401 });
  payload.nonce = 'different';
  await assert.rejects(service.login(request), { status: 401 });
  payload.nonce = jwt.decode(request.challenge).nonce; payload.email_verified = false;
  await assert.rejects(service.login(request), { status: 401 });
  assert.equal(users.length, 0);
});

test('adult responsibility is required and an email match cannot link an existing account', async () => {
  const { service, request, users } = setup();
  for (const guardian of [undefined, { ...request.guardian, age: 17 }, { ...request.guardian, responsible: false }, { ...request.guardian, age: '35' }]) await assert.rejects(service.login({ ...request, guardian }), { status: 422 });
  users.push({ id: randomUUID(), email: 'tutor@example.test', role: 'STUDENT', passwordHash: 'existing' });
  await assert.rejects(service.login(request), { status: 409 });
  assert.equal(users[0].googleSubject, undefined);
});

test('teacher identity creates a creator profile without professional approval; missing config fails closed', async () => {
  const { service, request } = setup();
  const result = await service.login({ ...request, role: 'TEACHER', guardian: undefined });
  assert.equal(result.user.role, 'CREATOR');
  assert.deepEqual(result.user.creatorProfile, { create: {} });
  assert.throws(() => googleAuthService({}, { ...config, googleClientId: '' }).challenge(), { status: 503 });
});
