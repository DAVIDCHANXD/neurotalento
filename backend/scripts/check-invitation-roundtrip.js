import '../src/config/env.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { prisma } from '../src/config/database.js';
import { initialState } from '../../frontend/src/family/model.js';

const origin = `http://127.0.0.1:${process.env.PORT || 3000}`;
const ids = [];
async function request(path, method = 'GET', body, token) {
  const response = await fetch(`${origin}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, ...(body && { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${result.message}`);
  return result.data;
}
try {
  const stamp = randomUUID();
  const password = randomBytes(24).toString('hex');
  const creatorEmail = `roundtrip-teacher-${stamp}@example.test`;
  const tutorEmail = `roundtrip-tutor-${stamp}@example.test`;
  let creator = await request('/auth/register', 'POST', { name: 'Functional check teacher', email: creatorEmail, password, role: 'CREATOR' });
  ids.push(creator.user.id);
  const tutor = await request('/auth/register', 'POST', { name: 'Functional check tutor', email: tutorEmail, password, role: 'STUDENT', guardian: { age: 35, responsible: true, relationship: 'GUARDIAN' } });
  ids.push(tutor.user.id);
  const state = initialState();
  const code = `NT-${randomBytes(4).toString('hex').toUpperCase()}`;
  await request('/family/invitations', 'POST', { code, course: state.courses[0], subject: state.subjects[0], teacher: state.teacher }, creator.token);
  creator = null; // Teacher signed out: discard its session token.
  const publicCourse = await request(`/family/invitations/${code}`);
  if (publicCourse.course.title !== state.courses[0].title) throw new Error('Public lookup failed');
  const signedTutor = await request('/auth/login', 'POST', { email: tutorEmail, password });
  const found = await request(`/family/invitations/${code}`, 'GET', undefined, signedTutor.token);
  if (found.invitation.code !== code) throw new Error('Tutor lookup failed');
  const signedCreator = await request('/auth/login', 'POST', { email: creatorEmail, password });
  const restored = await request('/family/invitations/mine', 'GET', undefined, signedCreator.token);
  if (!restored.some(row => row.invitation.code === code)) throw new Error('Teacher restoration failed');
  console.log('PASS: create invitation → teacher sign-out → tutor sign-in → validate same code → restore teacher code');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids }, email: { endsWith: '@example.test' } } });
  await prisma.$disconnect();
}
