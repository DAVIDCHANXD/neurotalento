import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { fork } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { prisma } from '../src/config/database.js';
import { loadConfig } from '../src/config/env.js';
const config = loadConfig({ JWT_SECRET: randomBytes(48).toString('hex'), PLATFORM_COMMISSION_PERCENT: '15' });
const userIds = [];
const probe = createServer().listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const server = fork(new URL('../src/server.js', import.meta.url), {
  env: { ...process.env, PORT: String(port), JWT_SECRET: config.secret, PLATFORM_COMMISSION_PERCENT: '15' }, silent: true,
});
const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Servidor no inició en 10 segundos')), 10000);
  server.stdout.on('data', data => {
    if (data.toString().includes('NeuroTalento API en puerto')) { clearTimeout(timeout); resolve(); }
  });
  server.once('error', error => { clearTimeout(timeout); reject(error); });
  server.once('exit', () => { clearTimeout(timeout); reject(new Error('Servidor terminó antes de completar la prueba')); });
});
const request = async (path, method = 'GET', body, token, status = 200) => {
  const response = await fetch(`http://127.0.0.1:${port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, ...(body && { body: JSON.stringify(body) }) });
  const json = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${json.message || response.status}`);
  return json.data || json;
};
try {
  await ready;
  assert.equal((await request('/health')).database, 'connected');
  const register = async role => {
    const result = await request('/auth/register', 'POST', { name: `Demo ${role}`, email: `smoke-${randomUUID()}@example.test`, password: randomBytes(24).toString('hex'), role, ...(role === 'STUDENT' && { guardian: { age: 35, relationship: 'GUARDIAN', responsible: true } }) }, undefined, 201);
    userIds.push(result.user.id);
    assert.equal(result.user.passwordHash, undefined);
    return result;
  };
  const creator = await register('CREATOR'), other = await register('CREATOR'), student = await register('STUDENT');
  const categories = await request('/categories');
  assert.ok(categories.length, 'Ejecuta npm run db:seed primero');
  const course = await request('/courses', 'POST', { title: `Smoke ${randomUUID()}`, description: 'Curso temporal para verificar la API', categoryId: categories[0].id, priceCents: 1999, currency: 'MXN' }, creator.token, 201);
  await request(`/courses/${course.id}`, 'PUT', { title: 'No autorizado' }, other.token, 403);
  await request(`/courses/${course.id}`, 'GET', undefined, undefined, 404);
  const module = await request(`/courses/${course.id}/modules`, 'POST', { title: 'Módulo', position: 0 }, creator.token, 201);
  const lesson = await request(`/modules/${module.id}/lessons`, 'POST', { title: 'Lección', position: 0, durationSeconds: 60, videoUrl: 'https://example.com/demo.mp4' }, creator.token, 201);
  await request(`/courses/${course.id}/publish`, 'PATCH', {}, creator.token);
  const detail = await request(`/courses/${course.id}`);
  assert.equal(detail.modules[0].lessons[0].videoUrl, undefined);
  await request('/payments/checkout', 'POST', { courseId: course.id, priceCents: 0 }, student.token, 422);
  await request('/enrollments', 'POST', { courseId: course.id }, student.token, 402);
  const checkout = await request('/payments/checkout', 'POST', { courseId: course.id }, student.token, 201);
  assert.equal(checkout.purchase.amountCents, 1999);
  assert.equal(checkout.purchase.commissionCents, 300);
  assert.equal(checkout.purchase.creatorAmountCents, 1699);
  assert.equal(checkout.purchase.payments[0].status, 'SUCCESS');
  await request('/payments/checkout', 'POST', { courseId: course.id }, student.token, 409);
  const enrolled = await request(`/enrollments/${checkout.enrollment.id}`, 'GET', undefined, student.token);
  assert.ok(enrolled.course.modules[0].lessons[0].videoUrl);
  const progress = await request(`/enrollments/${checkout.enrollment.id}/progress`, 'PATCH', { lessonId: lesson.id, completed: true }, student.token);
  assert.equal(progress.status, 'COMPLETED');
  await request(`/courses/${course.id}/reviews`, 'POST', { rating: 5, comment: 'Prueba automática' }, student.token, 201);
  await request(`/courses/${course.id}/reviews`, 'POST', { rating: 4 }, student.token, 409);
  const dashboard = await request('/dashboard/student', 'GET', undefined, student.token);
  assert.equal(dashboard.completedCourses, 1);
  assert.equal(dashboard.overallProgress, 100);
  const earnings = await request('/payments/creator/earnings', 'GET', undefined, creator.token);
  assert.equal(earnings[0].netCents, 1699);
  const creatorDashboard = await request('/dashboard/creator', 'GET', undefined, creator.token);
  assert.equal(creatorDashboard.totalSales, 1);
  assert.equal(creatorDashboard.totalStudents, 1);
  console.log('Smoke real OK: health, registro, permisos, cursos, publicación, checkout, progreso, opiniones y dashboards.');
} catch (error) {
  console.error('Smoke real falló:', error instanceof assert.AssertionError ? error.message : error.code || error.name);
  process.exitCode = 1;
} finally {
  // Delete only the random demonstration accounts created by this invocation.
  try {
    if (userIds.length) await prisma.$transaction(async tx => {
      const students = { studentId: { in: userIds } };
      await tx.lessonProgress.deleteMany({ where: { enrollment: students } });
      await tx.payment.deleteMany({ where: { purchase: students } });
      await tx.purchase.deleteMany({ where: students });
      await tx.review.deleteMany({ where: students });
      await tx.enrollment.deleteMany({ where: students });
      await tx.course.deleteMany({ where: { creatorId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    console.log('Datos temporales de prueba eliminados.');
  } catch (error) { console.error('No se completó la limpieza:', error.code || error.name); process.exitCode = 1; }
  if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
  await prisma.$disconnect();
}
