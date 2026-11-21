import test from 'node:test';
import assert from 'node:assert/strict';
import { activityFor, answerFor, choicesFor, findInvitation, initialState, progressOf, teacherId, transition, tutorId, validateGuardian, validateQuestions, upgradeState } from './model.js';
const tutor = { role: 'TUTOR', id: tutorId };
const teacher = { role: 'TEACHER', id: teacherId };
const guardian = () => validateGuardian({ name: 'Ana demo', age: 35, relationship: 'MOTHER', responsible: true });
function family() { const s = initialState(); s.guardians = [guardian()]; return s; }
function enroll(s = family(), courseId = 'contamos-1-5', childId = 'demo-child') { return transition(s, tutor, { type: 'ENROLL', courseId, childId }); }

test('a tutor must be an adult, accept responsibility, and identify their relationship', () => {
  for (const age of [0, 17, 17.9, '', 'abc', 121]) assert.throws(() => validateGuardian({ name: 'Ana', age, relationship: 'MOTHER', responsible: true }));
  assert.throws(() => validateGuardian({ name: 'Ana', age: 35, relationship: 'MOTHER', responsible: false }));
  assert.throws(() => validateGuardian({ name: 'Ana', age: 35, relationship: 'OTHER', responsible: true }));
  assert.equal(guardian().verification, 'SELF_DECLARED_DEMO');
});
test('an unregistered adult cannot enroll or create a child profile', () => {
  assert.throws(() => enroll(initialState()), /tutor adulto/);
  assert.throws(() => transition(initialState(), tutor, { type: 'SAVE_CHILD', values: {} }), /tutor adulto/);
});
test('child age and profile ownership are mandatory', () => {
  const values = { nickname: 'Leo', age: 8, level: 'PRIMARY', supports: ['visuals'], note: '' };
  for (const age of ['', 2, 13, 6.5]) assert.throws(() => transition(family(), tutor, { type: 'SAVE_CHILD', values: { ...values, age } }));
  const { result } = transition(family(), tutor, { type: 'SAVE_CHILD', values });
  assert.equal(result.tutorId, tutorId); assert.equal(result.age, 8);
  assert.throws(() => transition(family(), { role: 'TUTOR', id: 'other-tutor' }, { type: 'SAVE_CHILD', id: 'demo-child', values }));
});
test('enrollment is unique, level-specific, private and records only a simulated receipt', () => {
  assert.throws(() => enroll(family(), 'sumamos-paso-a-paso'), /nivel/);
  assert.throws(() => transition(family(), teacher, { type: 'ENROLL', courseId: 'contamos-1-5', childId: 'demo-child' }));
  const output = enroll();
  assert.equal(output.state.receipts[0].provider, 'SIMULATED'); assert.equal(output.state.receipts[0].kind, 'ENROLLMENT');
  assert.equal(output.state.receipts[0].recipient, 'Mariana López');
  assert.equal(output.result.tutorId, tutorId);
  assert.throws(() => enroll(output.state), /ya está inscrito/);
});
test('wrong answers do not change progress; correct repeats are idempotent', () => {
  const { state, result: row } = enroll(); const q = row.activity.questions[0];
  assert.throws(() => transition(state, tutor, { type: 'ANSWER', enrollmentId: row.id, questionId: q.id, answer: 90 }));
  assert.equal(state.enrollments[0].completed.length, 0);
  const action = { type: 'ANSWER', enrollmentId: row.id, questionId: q.id, answer: answerFor(row.activity, q) };
  const one = transition(state, tutor, action); const two = transition(one.state, tutor, action);
  assert.equal(two.result.completed.length, 1); assert.equal(progressOf(two.result), 33);
  assert.throws(() => transition(two.state, { role: 'TUTOR', id: 'someone' }, action));
});
test('all activity templates include the right answer and a small set of distinct choices', () => {
  for (const kind of ['count', 'sum', 'read']) for (const q of activityFor(kind).questions) {
    const activity = activityFor(kind); const choices = choicesFor(activity, q);
    assert(choices.includes(answerFor(activity, q))); assert.equal(choices.length, 3); assert.equal(new Set(choices).size, 3);
  }
});
test('publishing requires review and a separate teacher subscription', () => {
  const s = family();
  assert.throws(() => transition(s, teacher, { type: 'PUBLISH', courseId: s.courses[0].id }), /plan/);
  const active = transition(s, teacher, { type: 'SUBSCRIBE' }).state;
  assert.equal(active.receipts[0].kind, 'SUBSCRIPTION'); assert.equal(active.receipts[0].recipient, 'NeuroTalento');
  assert.throws(() => transition(active, teacher, { type: 'SUBSCRIBE' }), /ya está activo/);
  assert.throws(() => transition({ ...active, teacher: { ...active.teacher, review: 'PENDING' } }, teacher, { type: 'PUBLISH', courseId: s.courses[0].id }), /revisión/);
});
test('regenerated and revoked invitations stop resolving without deleting enrollments', () => {
  const s = transition(family(), teacher, { type: 'SUBSCRIBE' }).state;
  const first = transition(s, teacher, { type: 'INVITE', courseId: s.courses[0].id });
  assert.equal(findInvitation(first.state, first.result.code.toLowerCase()).id, s.courses[0].id);
  const second = transition(first.state, teacher, { type: 'INVITE', courseId: s.courses[0].id });
  assert.equal(findInvitation(second.state, first.result.code), undefined);
  const enrolled = enroll(second.state);
  const revoked = transition(enrolled.state, teacher, { type: 'REVOKE', courseId: s.courses[0].id });
  assert.equal(findInvitation(revoked.state, second.result.code), undefined);
  assert.equal(revoked.state.enrollments.length, 1);
  assert.throws(() => transition(s, tutor, { type: 'INVITE', courseId: s.courses[0].id }));
});
test('teacher edits preserve the enrolled activity and its progress', () => {
  const { state, result } = enroll(); const q = result.activity.questions[0];
  const solved = transition(state, tutor, { type: 'ANSWER', enrollmentId: result.id, questionId: q.id, answer: 2 }).state;
  const edited = transition(solved, teacher, { type: 'SAVE_COURSE', id: 'contamos-1-5', values: { title: 'Nuevo título', level: 'PRESCHOOL', objective: 'Contar objetos', description: 'Practicamos con objetos separados.', priceCents: 9900, kind: 'count', numbers: [4, 4, 4], instruction: 'Cuenta con calma.', hint: 'Señala cada objeto.', supports: ['visuals'], pauseEvery: 2 } });
  assert.equal(edited.state.courses[0].status, 'DRAFT');
  assert.equal(edited.state.enrollments[0].activity.questions[0].count, 2);
  assert.equal(edited.state.enrollments[0].completed.length, 1);
});
test('teachers can adjust only their enrolled students; adult roles cannot cross boundaries', () => {
  const { state, result } = enroll(); const action = { type: 'ADJUST', enrollmentId: result.id, values: { supports: ['repeat'], pauseEvery: 3, teacherNote: 'Un paso a la vez' } };
  assert.throws(() => transition(state, tutor, action));
  assert.throws(() => transition(state, { role: 'TEACHER', id: 'other' }, action));
  const updated = transition(state, teacher, action).state;
  assert.equal(updated.enrollments[0].pauseEvery, 3); assert.deepEqual(updated.enrollments[0].supports, ['repeat']);
  assert.throws(() => transition(updated, teacher, { ...action, values: { ...action.values, pauseEvery: 0 } }));
});

test('teachers create subjects independently of level and template; duplicate names are rejected', () => {
  const initial = family();
  assert.throws(() => transition(initial, tutor, { type: 'CREATE_SUBJECT', name: 'Música' }));
  const created = transition(initial, teacher, { type: 'CREATE_SUBJECT', name: 'Música' });
  assert.equal(created.result.name, 'Música');
  assert.equal(created.result.creatorId, teacher.id);
  assert.throws(() => transition(created.state, teacher, { type: 'CREATE_SUBJECT', name: '  MUSICA  ' }), /Ya existe/);
  assert.throws(() => transition(created.state, teacher, { type: 'CREATE_SUBJECT', name: ' ' }));
});

test('custom activities use the teacher subject, questions, choices, visual and correct answer', () => {
  const created = transition(family(), teacher, { type: 'CREATE_SUBJECT', name: 'Música' });
  const values = { title: 'Descubre sonidos', subjectId: created.result.id, level: 'PRESCHOOL', objective: 'Reconocer sonidos cotidianos', description: 'Una pregunta sobre lo que escuchamos.', priceCents: 9900, kind: 'choice', instruction: 'Observa y elige.', hint: 'Piensa con calma.', supports: ['visuals'], pauseEvery: 1, questions: [{ id: 'music-question', prompt: '¿Cuál es un instrumento?', visual: 'none', choices: ['Tambor', 'Mesa', 'Libro'], correctIndex: 0 }] };
  const saved = transition(created.state, teacher, { type: 'SAVE_COURSE', values });
  assert.equal(saved.result.area, 'Música');
  assert.equal(saved.result.activity.questions.length, 1);
  const q = saved.result.activity.questions[0];
  assert.equal(answerFor(saved.result.activity, q), 'Tambor');
  assert.deepEqual(choicesFor(saved.result.activity, q), ['Tambor', 'Mesa', 'Libro']);
  const subscribed = transition(saved.state, teacher, { type: 'SUBSCRIBE' }).state;
  const published = transition(subscribed, teacher, { type: 'PUBLISH', courseId: saved.result.id }).state;
  const enrolled = enroll(published, saved.result.id);
  assert.throws(() => transition(enrolled.state, tutor, { type: 'ANSWER', enrollmentId: enrolled.result.id, questionId: q.id, answer: 'Mesa' }));
  const answered = transition(enrolled.state, tutor, { type: 'ANSWER', enrollmentId: enrolled.result.id, questionId: q.id, answer: 'Tambor' });
  assert.equal(progressOf(answered.result), 100);
  assert.throws(() => transition(created.state, teacher, { type: 'SAVE_COURSE', values: { ...values, subjectId: 'missing' } }), /materia/);
});

test('custom question validation prevents incomplete, ambiguous and unsupported content', () => {
  const q = { prompt: '¿Qué ves?', choices: ['Sol', 'Luna'], correctIndex: 0, visual: 'sun' };
  assert.throws(() => validateQuestions([]));
  assert.throws(() => validateQuestions(Array.from({ length: 6 }, () => q)));
  for (const changes of [{ prompt: ' ' }, { choices: ['Sol', 'sol'] }, { choices: ['Sol', ''] }, { choices: ['Sol'] }, { correctIndex: 2 }, { correctIndex: '0' }, { visual: 'https://random.test/image.png' }]) assert.throws(() => validateQuestions([{ ...q, ...changes }]));
  assert.throws(() => validateQuestions([{ ...q, id: 'same' }, { ...q, id: 'same' }]));
  assert.equal(validateQuestions([q])[0].visual, 'sun');
});

test('v1 sessions keep their profiles, enrollment snapshots and progress during subject migration', () => {
  const enrolled = enroll();
  const q = enrolled.result.activity.questions[0];
  const answered = transition(enrolled.state, tutor, { type: 'ANSWER', enrollmentId: enrolled.result.id, questionId: q.id, answer: 2 }).state;
  const legacy = { ...answered, version: 1, subjects: undefined, courses: answered.courses.slice(0, 2).map(({ subjectId, ...course }) => course) };
  const upgraded = upgradeState(legacy);
  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.courses.length, 6);
  assert.equal(upgraded.courses[0].subjectId, 'math');
  assert.deepEqual(upgraded.enrollments, answered.enrollments);
  assert.deepEqual(upgraded.children, answered.children);
  assert.equal(upgradeState(upgraded).courses.length, 6);
});

test('initial catalog spans five subjects with functional content for each', () => {
  const s = initialState();
  assert.equal(new Set(s.courses.map(c => c.subjectId)).size, 5);
  for (const c of s.courses) for (const q of c.activity.questions) assert(choicesFor(c.activity, q).includes(answerFor(c.activity, q)));
});
import { validateMedia, videoSource, courseVideo } from './media.js';

test('media accepts supported HTTPS videos and rejects unsafe or arbitrary embeds', () => {
  assert.equal(videoSource('https://youtu.be/-cfbXnv_3CY').kind, 'youtube');
  assert.equal(videoSource('https://www.youtube.com/watch?v=-cfbXnv_3CY').src, 'https://www.youtube-nocookie.com/embed/-cfbXnv_3CY?rel=0');
  assert.equal(videoSource('https://example.com/lesson.mp4?version=2').kind, 'file');
  for (const url of ['javascript:alert(1)', 'http://example.com/movie.mp4', 'https://youtube.com.evil.test/watch?v=-cfbXnv_3CY', 'https://example.com/embed/anything', 'https://name:password@example.com/movie.mp4']) {
    assert.equal(videoSource(url), null);
    assert.throws(() => validateMedia({ videoUrl: url }));
  }
  assert.throws(() => validateMedia({ imageUrl: 'data:image/svg+xml,test' }));
  assert.deepEqual(validateMedia({}), { imageUrl: '', videoUrl: '' });
  assert.equal(courseVideo({ id: 'contamos-1-5', videoUrl: '' }), '');
});

test('enrollment preserves its video when the teacher later changes the course', () => {
  const enrolled = enroll();
  const original = enrolled.result.videoUrl;
  assert.ok(videoSource(original));
  const course = enrolled.state.courses.find(c => c.id === 'contamos-1-5');
  const edited = transition(enrolled.state, teacher, { type: 'SAVE_COURSE', id: course.id, values: { ...course, kind: 'count', numbers: [2, 3, 5], instruction: course.activity.instruction, hint: course.activity.hint, videoUrl: 'https://example.com/new.mp4', imageUrl: 'https://example.com/photo.jpg' } });
  assert.equal(edited.result.videoUrl, 'https://example.com/new.mp4');
  assert.equal(edited.state.enrollments[0].videoUrl, original);
});
test('local teaching tests can publish and invite without activating or charging a plan', () => {
  const state = initialState();
  const courseId = state.courses[0].id;
  const options = { allowUnpaidTeaching: true };
  assert.throws(() => transition(state, teacher, { type: 'INVITE', courseId }), /plan/);
  const published = transition(state, teacher, { type: 'PUBLISH', courseId }, options).state;
  const invited = transition(published, teacher, { type: 'INVITE', courseId }, options);
  assert.ok(findInvitation(invited.state, invited.result.code));
  assert.equal(invited.state.teacher.subscription, false);
  assert.equal(invited.state.receipts.length, 0);
  assert.throws(() => transition(state, tutor, { type: 'INVITE', courseId }, options));
  const pending = { ...state, teacher: { ...state.teacher, review: 'PENDING' } };
  assert.throws(() => transition(pending, teacher, { type: 'INVITE', courseId }, options), /revisión/);
  const draft = { ...state, courses: state.courses.map(c => c.id === courseId ? { ...c, status: 'DRAFT' } : c) };
  assert.throws(() => transition(draft, teacher, { type: 'INVITE', courseId }, options), /Publica/);
});
test('development can publish and invite with a pending profile without granting approval or a plan', () => {
  const initial = initialState();
  const state = { ...initial, teacher: { ...initial.teacher, review: 'PENDING', subscription: false } };
  const courseId = state.courses[0].id;
  const draft = { ...state, courses: state.courses.map(c => c.id === courseId ? { ...c, status: 'DRAFT' } : c) };
  const options = { allowUnpaidTeaching: true, allowUnreviewedTeaching: true };
  assert.throws(() => transition(draft, teacher, { type: 'PUBLISH', courseId }), /revisión/);
  assert.throws(() => transition(state, teacher, { type: 'INVITE', courseId }, { allowUnpaidTeaching: true }), /revisión/);
  const published = transition(draft, teacher, { type: 'PUBLISH', courseId }, options).state;
  const invited = transition(published, teacher, { type: 'INVITE', courseId }, options);
  assert.equal(findInvitation(invited.state, invited.result.code).id, courseId);
  assert.equal(invited.state.teacher.review, 'PENDING');
  assert.equal(invited.state.teacher.subscription, false);
  assert.equal(invited.state.receipts.length, 0);
  assert.throws(() => transition(published, tutor, { type: 'INVITE', courseId }, options));
  assert.throws(() => transition(published, { ...teacher, id: 'another-teacher' }, { type: 'INVITE', courseId }, options));
  const revoked = transition(invited.state, teacher, { type: 'REVOKE', courseId }, options).state;
  assert.equal(findInvitation(revoked, invited.result.code), undefined);
});
import { invitationCode, importInvitation } from './model.js';

test('invitation input accepts a code or a full link without executing or truncating the URL', () => {
  assert.equal(invitationCode(' nt-abcdef12 '), 'NT-ABCDEF12');
  assert.equal(invitationCode('http://127.0.0.1:5173/catalogo?clave=nt-abcdef12'), 'NT-ABCDEF12');
  assert.equal(invitationCode('https://example.com/catalogo?other=value&clave=NT-ABCDEF12'), 'NT-ABCDEF12');
  for (const bad of ['', 'NT-ABC', 'javascript:alert(1)', 'https://example.com/?clave=invalid']) assert.equal(invitationCode(bad), '');
});

test('tutor imports a shared course, validates level and registers and enrolls the child atomically', () => {
  const state = family();
  const course = { ...state.courses[0], id: 'shared-teacher-course', teacher: { name: 'Otra docente' } };
  const bundle = { course, subject: state.subjects[0], invitation: { id: 'remote', code: 'NT-ABCDEF12', courseId: course.id, active: true } };
  const imported = importInvitation(state, bundle);
  assert.equal(imported.guardians, state.guardians);
  assert.equal(imported.children, state.children);
  assert.equal(imported.teacher, state.teacher);
  assert.equal(findInvitation(imported, 'https://example.com/?clave=NT-ABCDEF12').id, course.id);
  const values = { nickname: 'Leo', age: 5, level: 'PRESCHOOL', supports: ['visuals'], note: '' };
  const saved = transition(imported, tutor, { type: 'REGISTER_CHILD_WITH_INVITATION', values, courseId: course.id });
  assert.equal(saved.result.enrollment.childId, saved.result.child.id);
  assert.equal(saved.result.enrollment.courseId, course.id);
  assert.equal(saved.state.receipts.at(-1).recipient, 'Otra docente');
  assert.throws(() => transition(imported, tutor, { type: 'REGISTER_CHILD_WITH_INVITATION', values: { ...values, level: 'PRIMARY' }, courseId: course.id }), /nivel/);
  assert.equal(imported.children.length, state.children.length);
});
import { restoreTeacherInvitations } from './model.js';

test('teacher codes and courses restore after losing browser storage without copying family data', () => {
  const local = initialState();
  const original = local.courses[0];
  const bundles = [{ course: { ...original, id: 'saved-course', creatorId: 'database-owner', title: 'Curso recuperado' }, subject: local.subjects[0], invitation: { id: 'db-invite', courseId: 'saved-course', code: 'NT-1234ABCD', active: true } }];
  const restored = restoreTeacherInvitations(local, bundles, teacher.id);
  assert.equal(findInvitation(restored, 'NT-1234ABCD').title, 'Curso recuperado');
  assert.equal(restored.courses.find(c => c.id === 'saved-course').creatorId, teacher.id);
  assert.equal(restored.invitations.at(-1).persisted, true);
  assert.equal(restored.children, local.children);
  assert.equal(restored.guardians, local.guardians);
  assert.equal(restored.enrollments, local.enrollments);
  const afterRevoke = restoreTeacherInvitations(restored, [], teacher.id);
  assert.equal(findInvitation(afterRevoke, 'NT-1234ABCD'), undefined);
});
import { carryInvitationCourses } from './model.js';

test('sign-out carries only public invitation content and never another account family data', () => {
  const previous = family();
  const course = { ...previous.courses[0], id: 'shared-example-course' };
  previous.courses.push(course);
  previous.invitations.push({ id: 'public-invite', code: 'NT-AABBCCDD', courseId: course.id, active: true });
  const anonymous = { ...initialState(), children: [], guardians: [], enrollments: [] };
  const signedOut = carryInvitationCourses(anonymous, previous);
  assert.ok(findInvitation(signedOut, 'NT-AABBCCDD'));
  assert.equal(signedOut.children.length, 0);
  assert.equal(signedOut.guardians.length, 0);
  assert.equal(signedOut.enrollments.length, 0);
  assert.equal(signedOut.teacher, anonymous.teacher);
});
