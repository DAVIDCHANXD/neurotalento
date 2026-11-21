import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { splitAmount } from '../src/utils/money.js';
import { courseService } from '../src/services/courses.service.js';
import { paymentService } from '../src/services/payments.service.js';
import { enrollmentService } from '../src/services/enrollments.service.js';
const config = loadConfig({ JWT_SECRET: 'test-secret-used-only-in-tests-123456789', PLATFORM_COMMISSION_PERCENT: '15' });
const creatorId = randomUUID(), studentId = randomUUID(), courseId = randomUUID(), moduleId = randomUUID(), lessonId = randomUUID();

test('comisión exacta, redondeo y conservación del importe', () => {
  assert.deepEqual(splitAmount(10000, 1500), { amountCents: 10000, commissionCents: 1500, creatorAmountCents: 8500 });
  assert.equal(splitAmount(10, 1500).commissionCents, 2);
  for (const n of [0, 1, 99, 19999, 2147483647]) {
    const amounts = splitAmount(n, 1500);
    assert.equal(amounts.commissionCents + amounts.creatorAmountCents, n);
  }
  assert.throws(() => splitAmount(-1, 1500));
  assert.throws(() => loadConfig({ JWT_SECRET: config.secret, PLATFORM_COMMISSION_PERCENT: '101' }));
});

test('checkout transaccional usa precio persistido y bloquea duplicados, auto compra, borradores y acceso gratuito', async () => {
  let course = { id: courseId, creatorId, priceCents: 999, currency: 'MXN', status: 'PUBLISHED' };
  let enrollment = null, purchase = null, isolation;
  const db = {
    course: { findUnique: async () => course },
    enrollment: { findUnique: async () => enrollment, create: async ({ data }) => (enrollment = { id: randomUUID(), ...data }) },
    purchase: { create: async ({ data }) => (purchase = { id: randomUUID(), ...data }) },
    $transaction: async (fn, options) => { isolation = options.isolationLevel; return fn(db); },
  };
  const service = paymentService(db, config);
  await assert.rejects(service.checkout(creatorId, courseId), { status: 403 });
  await assert.rejects(service.checkout(studentId, courseId, true), { status: 402 });
  course.status = 'DRAFT';
  await assert.rejects(service.checkout(studentId, courseId), { status: 409 });
  course.status = 'PUBLISHED';
  const result = await service.checkout(studentId, courseId);
  assert.equal(isolation, 'Serializable');
  assert.equal(result.purchase.amountCents, 999);
  assert.equal(result.purchase.commissionCents, 150);
  assert.equal(result.purchase.creatorAmountCents, 849);
  assert.equal(purchase.payments.create.provider, 'SIMULATED');
  assert.equal(enrollment.studentId, studentId);
  await assert.rejects(service.checkout(studentId, courseId), { status: 409 });
  enrollment = null; purchase = null; course.priceCents = 0;
  assert.equal((await service.checkout(studentId, courseId, true)).purchase, null);
  assert.equal(purchase, null);
});

test('propiedad, publicación y ocultación de videos privados', async () => {
  const course = { id: courseId, creatorId, status: 'DRAFT', modules: [] };
  const db = { course: { findUnique: async () => structuredClone(course), update: async ({ data }) => Object.assign(course, data) }, enrollment: { findUnique: async () => null } };
  const service = courseService(db);
  await assert.rejects(service.update(courseId, { title: 'Otro' }, { id: studentId }), { status: 403 });
  await assert.rejects(service.publish(courseId, { id: creatorId }), { status: 422 });
  await assert.rejects(service.detail(courseId), { status: 404 });
  course.modules = [{ lessons: [{ videoUrl: 'https://example.com/private', description: 'Privado', isPreview: false }, { videoUrl: 'https://example.com/preview', isPreview: true }] }];
  await service.publish(courseId, { id: creatorId });
  const publicCourse = await service.detail(courseId);
  assert.equal(publicCourse.status, 'PUBLISHED');
  assert.equal(publicCourse.modules[0].lessons[0].videoUrl, undefined);
  assert.ok(publicCourse.modules[0].lessons[1].videoUrl);
  assert.ok((await service.detail(courseId, { id: creatorId })).modules[0].lessons[0].videoUrl);
});

test('progreso verifica inscripción y pertenencia de la lección, completa y reabre', async () => {
  const enrollment = { id: randomUUID(), studentId, courseId, status: 'ACTIVE', completedAt: null };
  let done = 0, lessonCourseId = courseId;
  const db = {
    enrollment: { findUnique: async () => enrollment, update: async ({ data }) => Object.assign(enrollment, data) },
    lesson: { findUnique: async () => ({ id: lessonId, module: { courseId: lessonCourseId } }), count: async () => 1 },
    lessonProgress: { upsert: async ({ update }) => { done = update.completed ? 1 : 0; }, count: async () => done },
    $transaction: async fn => fn(db),
  };
  const service = enrollmentService(db);
  await assert.rejects(service.progress(enrollment.id, creatorId, { lessonId, completed: true }), { status: 403 });
  lessonCourseId = randomUUID();
  await assert.rejects(service.progress(enrollment.id, studentId, { lessonId, completed: true }), { status: 422 });
  lessonCourseId = courseId;
  assert.equal((await service.progress(enrollment.id, studentId, { lessonId, completed: true })).status, 'COMPLETED');
  assert.equal((await service.progress(enrollment.id, studentId, { lessonId, completed: false })).completedAt, null);
});

test('HTTP: registro, login, JWT, roles, validaciones, catálogo y health', async t => {
  const accounts = new Map();
  let healthy = true;
  const safe = account => { const { passwordHash, ...user } = account; return user; };
  const db = {
    user: {
      create: async ({ data }) => { const account = { id: randomUUID(), ...data }; accounts.set(account.id, account); return safe(account); },
      findUnique: async ({ where, select }) => { const account = [...accounts.values()].find(a => a.id === where.id || a.email === where.email); return account ? (select ? safe(account) : account) : null; },
    },
    course: { findMany: async ({ where }) => { assert.equal(where.status, 'PUBLISHED'); return []; }, create: async ({ data }) => ({ id: courseId, ...data }) },
    $queryRaw: async () => { if (!healthy) throw new Error('offline'); return [{ '?column?': 1 }]; },
  };
  const server = createApp({ db, config }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = async (path, { method = 'GET', body, token } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, ...(body && { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await request('/health')).status, 200);
  healthy = false;
  assert.equal((await request('/health')).status, 503);
  assert.equal((await request('/auth/me')).status, 401);
  assert.equal((await request('/auth/me', { token: 'bad' })).status, 401);
  assert.equal((await request('/auth/register', { method: 'POST', body: { email: 'bad' } })).status, 422);
  const registered = await request('/auth/register', { method: 'POST', body: { name: 'Demo', email: 'demo@example.test', password: 'test-only-password-123' } });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.data.user.passwordHash, undefined);
  assert.ok([...accounts.values()][0].passwordHash.startsWith('$2'));
  const token = registered.body.data.token;
  assert.equal((await request('/auth/me', { token })).status, 200);
  assert.equal((await request('/users/profile', { method: 'PUT', token, body: { role: 'CREATOR' } })).status, 422);
  assert.equal((await request('/courses', { method: 'POST', token, body: {} })).status, 403);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'demo@example.test', password: 'wrong' } })).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'demo@example.test', password: 'test-only-password-123' } })).status, 200);
  assert.equal((await request('/courses')).status, 200);
  const creator = await request('/auth/register', { method: 'POST', body: { name: 'Creator', email: 'creator@example.test', password: 'test-only-password-123', role: 'CREATOR' } });
  const creatorToken = creator.body.data.token;
  assert.equal((await request('/courses', { method: 'POST', token: creatorToken, body: {} })).status, 422);
  assert.equal((await request('/courses', { method: 'POST', token: creatorToken, body: { title: 'Curso', description: 'Descripción', categoryId: randomUUID(), priceCents: 100 } })).status, 201);
  assert.equal((await request('/payments/checkout', { method: 'POST', token, body: { courseId, priceCents: 0 } })).status, 422);
  assert.equal((await request('/courses/not-a-uuid')).status, 422);
  assert.equal((await request('/missing')).status, 404);
});
