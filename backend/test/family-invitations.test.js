import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { familyInvitationsService } from '../src/services/family-invitations.service.js';

function setup() {
  const rows = [];
  const db = { familyInvitation: {
    findUnique: async ({ where }) => rows.find(r => r.code === where.code) || null,
    findFirst: async ({ where }) => rows.find(r => Object.entries(where).every(([k, v]) => r[k] === v)) || null,
    findMany: async ({ where }) => rows.filter(r => Object.entries(where).every(([k, v]) => r[k] === v)),
    updateMany: async ({ where, data }) => { for (const r of rows) if (Object.entries(where).every(([k, v]) => r[k] === v)) Object.assign(r, data); },
    create: async ({ data }) => { const row = { id: randomUUID(), active: true, ...data }; rows.push(row); return row; },
  }, $transaction: fn => fn(db) };
  const teacher = { id: randomUUID(), role: 'CREATOR', name: 'Docente' };
  const course = { id: 'count-course', status: 'PUBLISHED', title: 'Contamos', objective: 'Aprender cantidades', description: 'Cuenta y encuentra la cantidad.', level: 'PRESCHOOL', priceCents: 9900, pauseEvery: 1, supports: ['visuals'], activity: { kind: 'count', instruction: 'Cuenta las manzanas.', hint: 'Señala cada objeto.', questions: [{ id: 'q1', count: 2 }] } };
  const body = { code: 'NT-ABCDEF12', course, subject: { id: 'math', name: 'Matemáticas' }, teacher: { training: 'Educación', guardian: 'PRIVATE' }, children: [{ name: 'PRIVATE' }] };
  return { db, teacher, body, rows, service: familyInvitationsService(db) };
}
test('invitation persists across service instances and only exposes the public course', async () => {
  const { db, teacher, body, rows, service } = setup();
  await service.save(teacher, body);
  const fromOtherAccount = await familyInvitationsService(db).resolve(body.code);
  assert.equal(fromOtherAccount.course.title, body.course.title);
  assert.equal(fromOtherAccount.course.creatorId, teacher.id);
  assert.equal(fromOtherAccount.invitation.courseId, fromOtherAccount.course.id);
  assert.equal(fromOtherAccount.teacher.name, teacher.name);
  assert.ok(!JSON.stringify(rows).includes('PRIVATE'));
});
test('regeneration and revocation invalidate codes and cannot affect another teacher', async () => {
  const { teacher, body, service } = setup();
  await service.save(teacher, body);
  await service.save(teacher, { ...body, code: 'NT-ABCDEF13' });
  await assert.rejects(service.resolve(body.code), { status: 404 });
  assert.equal((await service.save(teacher, body)).active, false);
  await assert.rejects(service.save({ ...teacher, id: randomUUID() }, body), { status: 409 });
  await service.revoke({ ...teacher, id: randomUUID() }, body.course.id);
  assert.ok(await service.resolve('NT-ABCDEF13'));
  await service.revoke(teacher, body.course.id);
  await assert.rejects(service.resolve('NT-ABCDEF13'), { status: 404 });
});
test('only creators can save published and structurally valid course snapshots', async () => {
  const { teacher, body, service } = setup();
  await assert.rejects(service.save({ ...teacher, role: 'STUDENT' }, body), { status: 403 });
  await assert.rejects(service.save(teacher, { ...body, course: { ...body.course, status: 'DRAFT' } }), { status: 422 });
  await assert.rejects(service.save(teacher, { ...body, course: { ...body.course, imageUrl: 'javascript:alert(1)' } }), { status: 422 });
  await assert.rejects(service.save(teacher, { ...body, course: { ...body.course, activity: { ...body.course.activity, questions: [{ id: 'q', count: 100 }] } } }), { status: 422 });
});
test('legacy local codes migrate once without reviving revoked or replacing newer codes', async () => {
  const { teacher, body, service } = setup();
  const migrated = await service.save(teacher, { ...body, migrate: true });
  assert.equal(migrated.active, true);
  assert.equal((await service.resolve(body.code)).course.title, body.course.title);
  await service.revoke(teacher, body.course.id);
  assert.equal((await service.save(teacher, { ...body, migrate: true })).active, false);
  await service.save(teacher, { ...body, code: 'NT-AAAABBBB' });
  assert.equal((await service.save(teacher, { ...body, code: 'NT-CCCCDDDD', migrate: true })).active, false);
  assert.ok(await service.resolve('NT-AAAABBBB'));
});
test('concurrent retries of the same key return the saved record without creating a new code', async () => {
  const { db, rows, teacher, body, service } = setup();
  db.$transaction = async () => {
    rows.push({ id: randomUUID(), code: body.code, courseKey: body.course.id, creatorId: teacher.id, active: true });
    throw Object.assign(new Error('Concurrent insert'), { code: 'P2002' });
  };
  const result = await service.save(teacher, body);
  assert.equal(result.code, body.code);
  assert.equal(result.active, true);
  assert.equal(rows.length, 1);
});
test('saved codes survive closing the teacher session and can be restored only by their owner', async () => {
  const { db, teacher, body, service } = setup();
  await service.save(teacher, body);
  // A fresh service has no browser session or teacher window to depend on.
  const fresh = familyInvitationsService(db);
  assert.equal((await fresh.resolve(body.code)).course.title, body.course.title);
  const restored = await fresh.mine(teacher);
  assert.equal(restored[0].invitation.code, body.code);
  assert.equal(restored[0].course.id, body.course.id);
  assert.deepEqual(await fresh.mine({ ...teacher, id: randomUUID() }), []);
  await assert.rejects(fresh.mine({ ...teacher, role: 'STUDENT' }), { status: 403 });
});
