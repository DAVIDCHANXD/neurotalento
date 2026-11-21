import { validateMedia, courseVideo } from './media.js';

export const DEMO_KEY = 'neurotalento-family-demo-v1';
export const LEVELS = { PRESCHOOL: 'Preescolar', PRIMARY: 'Primaria' };
export const SUPPORTS = { visuals: 'Apoyos visuales', repeat: 'Repetir instrucciones', breaks: 'Pausas frecuentes' };
export const PLAN_CENTS = 19900;
export const teacherId = 'demo-teacher';
export const tutorId = 'demo-tutor';
export const VISUAL_KEYS = ['none', 'apple', 'sun', 'moon', 'house', 'leaf', 'cat', 'fish', 'book', 'red', 'yellow', 'blue', 'circle', 'triangle', 'square'];
const subjectForKind = kind => kind === 'read' ? 'spanish' : 'math';
const normalized = value => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export function validateQuestions(questions) {
  requireThat(Array.isArray(questions) && questions.length >= 1 && questions.length <= 5, 'Agrega entre uno y cinco ejercicios.');
  const result = questions.map((q, i) => {
    const prompt = text(q.prompt, 100);
    const choices = Array.isArray(q.choices) ? q.choices.map(v => text(v, 36)) : [];
    requireThat(prompt.length >= 3, `Escribe la pregunta del ejercicio ${i + 1}.`);
    requireThat(choices.length >= 2 && choices.length <= 3 && choices.every(v => v.length > 0), `Completa dos o tres respuestas en el ejercicio ${i + 1}.`);
    requireThat(new Set(choices.map(normalized)).size === choices.length, `Las respuestas del ejercicio ${i + 1} deben ser diferentes.`);
    requireThat(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < choices.length, `Elige la respuesta correcta del ejercicio ${i + 1}.`);
    requireThat(VISUAL_KEYS.includes(q.visual || 'none'), 'El apoyo visual no está disponible.');
    return { id: q.id || uid(), prompt, choices, correctIndex: q.correctIndex, visual: q.visual || 'none', hint: text(q.hint, 180) };
  });
  requireThat(new Set(result.map(q => q.id)).size === result.length, 'Cada ejercicio debe tener un identificador diferente.');
  return result;
}
export function validateGuardian(values) {
  const age = Number(values.age);
  requireThat(Number.isInteger(age) && age >= 18 && age <= 120, 'El registro requiere un tutor de 18 años o más.');
  requireThat(text(values.name, 60).length >= 2, 'Escribe el nombre del tutor.');
  requireThat(['MOTHER', 'FATHER', 'GUARDIAN'].includes(values.relationship), 'Indica tu relación con el niño.');
  requireThat(values.responsible === true, 'Confirma que eres el adulto responsable de este perfil.');
  return { tutorId, name: text(values.name, 60), age, relationship: values.relationship, responsible: true, verification: 'SELF_DECLARED_DEMO' };
}
export const money = cents => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(cents / 100);
const uid = () => crypto.randomUUID();
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value, max = 160) => String(value || '').trim().slice(0, max);
const levelOK = level => Object.hasOwn(LEVELS, level);
export function activityFor(kind = 'count', numbers = [2, 3, 5]) {
  if (kind === 'sum') return { kind, instruction: 'Junta los dos grupos de manzanas.', questions: numbers.map((n, i) => ({ id: `sum-${i}`, left: n, right: i === 2 ? 2 : 1 })), hint: 'Cuenta un grupo. Después sigue contando con el otro.' };
  if (kind === 'read') return { kind, instruction: 'Elige la palabra que corresponde al dibujo.', questions: [{ id: 'read-0', word: 'sol', choices: ['sol', 'casa', 'luna'] }, { id: 'read-1', word: 'casa', choices: ['luna', 'casa', 'sol'] }, { id: 'read-2', word: 'luna', choices: ['casa', 'sol', 'luna'] }], hint: 'Mira el dibujo y di su nombre despacio.' };
  return { kind: 'count', instruction: 'Cuenta las manzanas.', questions: numbers.map((n, i) => ({ id: `count-${i}`, count: n })), hint: 'Señala cada manzana y cuenta una sola vez.' };
}
export function answerFor(activity, question) { return activity.kind === 'choice' ? question.choices[question.correctIndex] : activity.kind === 'sum' ? question.left + question.right : activity.kind === 'read' ? question.word : question.count; }
export function choicesFor(activity, question, count = 3) {
  if (activity.kind === 'choice') return question.choices.slice();
  if (activity.kind === 'read') return [question.word, ...question.choices.filter(c => c !== question.word)].slice(0, count).sort();
  const answer = answerFor(activity, question);
  return [...new Set([answer, Math.max(1, answer - 1), answer + 1, answer + 2])].slice(0, count).sort((a, b) => a - b);
}
export function initialState() {
  return {
    version: 2,
    subjects: [
      { id: 'math', name: 'Matemáticas', creatorId: teacherId, visual: 'apple' },
      { id: 'spanish', name: 'Lenguaje', creatorId: teacherId, visual: 'book' },
      { id: 'science', name: 'Ciencias', creatorId: teacherId, visual: 'leaf' },
      { id: 'art', name: 'Arte y creatividad', creatorId: teacherId, visual: 'red' },
      { id: 'english', name: 'Inglés', creatorId: teacherId, visual: 'cat' },
    ],
    guardians: [],
    children: [{ id: 'demo-child', tutorId, nickname: 'Sofía', age: 5, level: 'PRESCHOOL', supports: ['visuals', 'repeat', 'breaks'], note: 'Le ayuda recibir una instrucción a la vez.' }],
    teacher: { id: teacherId, name: 'Mariana López', training: 'Licenciatura en Educación y formación complementaria en apoyos educativos para TDAH.', experience: '6 años acompañando a familias de preescolar y primaria.', biography: 'Trabajo con instrucciones breves, materiales visuales y tiempo para volver a intentar.', review: 'APPROVED_DEMO', subscription: false },
    courses: [
      { id: 'contamos-1-5', subjectId: 'math', creatorId: teacherId, title: 'Contamos del 1 al 5', level: 'PRESCHOOL', area: 'Matemáticas', objective: 'Relacionar cantidades con números.', description: 'Cuenta objetos y elige una respuesta, a tu ritmo.', priceCents: 9900, status: 'PUBLISHED', activity: activityFor('count'), supports: ['visuals', 'repeat', 'breaks'], pauseEvery: 2 },
      { id: 'sumamos-paso-a-paso', subjectId: 'math', creatorId: teacherId, title: 'Sumamos paso a paso', level: 'PRIMARY', area: 'Matemáticas', objective: 'Sumar dos grupos con apoyo visual.', description: 'Cuenta cada grupo y descubre cuánto suman juntos.', priceCents: 12900, status: 'PUBLISHED', activity: activityFor('sum', [1, 2, 3]), supports: ['visuals', 'repeat', 'breaks'], pauseEvery: 2 },
      { id: 'palabras-con-imagenes', subjectId: 'spanish', creatorId: teacherId, title: 'Palabras con imágenes', level: 'PRIMARY', area: 'Lenguaje', objective: 'Reconocer palabras de todos los días.', description: 'Mira una imagen y encuentra su palabra.', priceCents: 9900, status: 'PUBLISHED', activity: activityFor('read'), supports: ['visuals', 'repeat', 'breaks'], pauseEvery: 2 },
      { id: 'pequenos-exploradores', subjectId: 'science', creatorId: teacherId, title: 'Pequeños exploradores', level: 'PRESCHOOL', area: 'Ciencias', objective: 'Descubrir la naturaleza que nos rodea.', description: 'Explora plantas y el cielo con preguntas pequeñas.', priceCents: 9900, status: 'PUBLISHED', activity: { kind: 'choice', instruction: 'Observa y elige.', hint: 'Piensa en lo que ves a tu alrededor.', questions: [
        { id: 'science-1', prompt: '¿Qué necesita una planta para crecer?', visual: 'leaf', choices: ['Agua', 'Zapatos', 'Juguetes'], correctIndex: 0, hint: 'La regamos con ella.' },
        { id: 'science-2', prompt: '¿Qué ilumina el cielo durante el día?', visual: 'sun', choices: ['La luna', 'El sol', 'Un libro'], correctIndex: 1, hint: 'Nos da luz y calor.' },
      ] }, supports: ['visuals', 'repeat', 'breaks'], pauseEvery: 1 },
      { id: 'colores-y-formas', subjectId: 'art', creatorId: teacherId, title: 'Colores y formas', level: 'PRESCHOOL', area: 'Arte y creatividad', objective: 'Reconocer colores y formas.', description: 'Observa un color o una figura y encuentra su nombre.', priceCents: 9900, status: 'PUBLISHED', activity: { kind: 'choice', instruction: 'Observa y elige.', hint: 'Mira con calma el color o la forma.', questions: [
        { id: 'art-1', prompt: '¿Qué color ves?', visual: 'red', choices: ['Azul', 'Rojo', 'Amarillo'], correctIndex: 1, hint: 'Es el color de muchas fresas.' },
        { id: 'art-2', prompt: '¿Qué figura tiene tres lados?', visual: 'triangle', choices: ['Círculo', 'Cuadrado', 'Triángulo'], correctIndex: 2, hint: 'Cuenta sus tres esquinas.' },
      ] }, supports: ['visuals', 'repeat', 'breaks'], pauseEvery: 1 },
      { id: 'my-first-words', subjectId: 'english', creatorId: teacherId, title: 'My first words', level: 'PRIMARY', area: 'Inglés', objective: 'Aprender palabras en inglés con imágenes.', description: 'Descubre cómo se dicen nombres conocidos en inglés.', priceCents: 12900, status: 'PUBLISHED', activity: { kind: 'choice', instruction: 'Mira la imagen y elige.', hint: 'Piensa en el nombre en inglés.', questions: [
        { id: 'english-1', prompt: '¿Cómo se dice gato en inglés?', visual: 'cat', choices: ['Dog', 'Cat', 'Fish'], correctIndex: 1, hint: 'Empieza con C.' },
        { id: 'english-2', prompt: '¿Cómo se dice sol en inglés?', visual: 'sun', choices: ['Sun', 'Moon', 'Book'], correctIndex: 0, hint: 'Empieza con S.' },
      ] }, supports: ['visuals', 'repeat', 'breaks'], pauseEvery: 1 },
    ],
    invitations: [], enrollments: [], receipts: [],
  };
}
export function upgradeState(saved) {
  const seed = initialState();
  if (!saved || ![1, 2].includes(saved.version) || !['courses', 'children', 'enrollments', 'receipts', 'invitations'].every(key => Array.isArray(saved[key]))) return seed;
  const subjects = Array.isArray(saved.subjects) && saved.subjects.length ? saved.subjects : seed.subjects;
  const existing = saved.courses.map(c => { const subjectId = c.subjectId || subjectForKind(c.activity.kind); return { ...c, subjectId, area: subjects.find(s => s.id === subjectId)?.name || c.area }; });
  return { ...seed, ...saved, version: 2, subjects, courses: saved.version === 1 ? [...existing, ...seed.courses.filter(c => !existing.some(v => v.id === c.id))] : existing };
}
export function progressOf(enrollment) { return Math.round(enrollment.completed.length / enrollment.activity.questions.length * 100); }
export function invitationCode(value) {
  const input = String(value || '').trim();
  if (/^NT-[A-F0-9]{8}$/i.test(input)) return input.toUpperCase();
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const code = url.searchParams.get('clave')?.trim().toUpperCase();
    return /^NT-[A-F0-9]{8}$/.test(code || '') ? code : '';
  } catch { return ''; }
}
export function importInvitation(state, bundle) {
  return { ...state,
    courses: [...state.courses.filter(c => c.id !== bundle.course.id), bundle.course],
    subjects: state.subjects.some(s => s.id === bundle.subject.id) ? state.subjects : [...state.subjects, bundle.subject],
    invitations: [...state.invitations.filter(i => i.code !== bundle.invitation.code), bundle.invitation],
  };
}
export function restoreTeacherInvitations(state, bundles, ownerId) {
  let next = { ...state, invitations: state.invitations.filter(i => !i.active || !i.persisted) };
  for (const bundle of bundles) {
    next = importInvitation(next, { ...bundle, course: { ...bundle.course, creatorId: ownerId }, invitation: { ...bundle.invitation, persisted: true } });
  }
  return next;
}
export function carryInvitationCourses(state, previous) {
  let next = state;
  for (const invitation of previous.invitations.filter(i => i.active)) {
    const course = previous.courses.find(c => c.id === invitation.courseId && c.id.startsWith('shared-'));
    const subject = course && previous.subjects.find(s => s.id === course.subjectId);
    if (course && subject) next = importInvitation(next, { course, subject, invitation });
  }
  return next;
}
export function findInvitation(state, code) {
  const invite = state.invitations.find(v => v.active && v.code === invitationCode(code));
  return invite && state.courses.find(c => c.id === invite.courseId && c.status === 'PUBLISHED');
}
export function transition(state, session, action, { allowUnpaidTeaching = false, allowUnreviewedTeaching = false } = {}) {
  const role = expected => {
    requireThat(session?.role === expected, expected === 'TUTOR' ? 'Esta acción corresponde al tutor.' : 'Esta acción corresponde al docente.');
    if (expected === 'TUTOR') requireThat(state.guardians?.some(g => g.tutorId === session.id && g.age >= 18 && g.responsible), 'Primero debe registrarse un tutor adulto.');
  };
  const courseOf = id => state.courses.find(c => c.id === id);
  const ownedCourse = id => { role('TEACHER'); const course = courseOf(id); requireThat(course?.creatorId === session.id, 'No puedes administrar este curso.'); return course; };
  switch (action.type) {
    case 'REGISTER_CHILD_WITH_INVITATION': {
      const saved = transition(state, session, { type: 'SAVE_CHILD', id: action.id, values: action.values });
      const enrolled = transition(saved.state, session, { type: 'ENROLL', courseId: action.courseId, childId: saved.result.id });
      return { state: enrolled.state, result: { child: saved.result, enrollment: enrolled.result } };
    }
    case 'CREATE_SUBJECT': {
      role('TEACHER'); const name = text(action.name, 45);
      requireThat(name.length >= 2, 'Escribe un nombre de al menos dos letras.');
      requireThat(!state.subjects.some(s => normalized(s.name) === normalized(name)), 'Ya existe una materia con ese nombre.');
      const subject = { id: uid(), creatorId: session.id, name, visual: 'book' };
      return { state: { ...state, subjects: [...state.subjects, subject] }, result: subject };
    }
    case 'SAVE_CHILD': {
      role('TUTOR'); const values = action.values;
      requireThat(text(values.nickname, 40).length > 0 && levelOK(values.level), 'Indica un nombre y un nivel educativo.');
      requireThat(Number.isInteger(Number(values.age)) && Number(values.age) >= 3 && Number(values.age) <= 12, 'Esta versión está preparada para niños de 3 a 12 años.');
      const old = state.children.find(c => c.id === action.id);
      requireThat(!action.id || old?.tutorId === session.id, 'No puedes modificar este perfil.');
      const child = { id: action.id || uid(), tutorId: session.id, nickname: text(values.nickname, 40), age: Number(values.age), level: values.level, supports: values.supports.filter(s => Object.hasOwn(SUPPORTS, s)), note: text(values.note, 250) };
      return { state: { ...state, children: old ? state.children.map(c => c.id === old.id ? child : c) : [...state.children, child] }, result: child };
    }
    case 'SAVE_TEACHER': {
      role('TEACHER'); const v = action.values;
      requireThat(text(v.name).length > 1 && text(v.training, 600).length >= 10 && text(v.experience, 600).length >= 10, 'Completa tu nombre, formación y experiencia.');
      return { state: { ...state, teacher: { ...state.teacher, name: text(v.name, 80), training: text(v.training, 600), experience: text(v.experience, 600), biography: text(v.biography, 400), review: 'PENDING' } } };
    }
    case 'REVIEW_TEACHER':
      role('TEACHER'); requireThat(state.teacher.review === 'PENDING', 'Primero envía tu perfil a revisión.');
      return { state: { ...state, teacher: { ...state.teacher, review: action.approve ? 'APPROVED_DEMO' : 'CHANGES_REQUESTED' } } };
    case 'SUBSCRIBE': {
      role('TEACHER'); requireThat(!state.teacher.subscription, 'El plan docente ya está activo.');
      return { state: { ...state, teacher: { ...state.teacher, subscription: true }, receipts: [...state.receipts, { id: uid(), kind: 'SUBSCRIPTION', ownerId: session.id, amountCents: PLAN_CENTS, recipient: 'NeuroTalento', provider: 'SIMULATED', createdAt: new Date().toISOString() }] } };
    }
    case 'SAVE_COURSE': {
      role('TEACHER'); const v = action.values; const old = action.id ? ownedCourse(action.id) : null;
      requireThat(text(v.title).length >= 3 && text(v.objective).length >= 5 && text(v.description, 500).length >= 5 && levelOK(v.level), 'Completa el título, objetivo, descripción y nivel.');
      requireThat(Number.isInteger(v.priceCents) && v.priceCents >= 0 && v.priceCents <= 1000000, 'El precio debe estar entre $0 y $10,000 MXN.');
      requireThat(['count', 'sum', 'read', 'choice'].includes(v.kind), 'Elige un tipo de actividad.');
      if (v.kind === 'count' || v.kind === 'sum') requireThat(Array.isArray(v.numbers) && v.numbers.length === 3 && v.numbers.every(n => Number.isInteger(n) && n >= 1 && n <= 5), 'Define tres cantidades enteras del 1 al 5.');
      const subject = state.subjects.find(s => s.id === (v.subjectId || subjectForKind(v.kind)));
      requireThat(subject, 'Elige una materia existente o crea una nueva.');
      requireThat([1, 2, 3].includes(v.pauseEvery), 'Elige una frecuencia de pausa válida.');
      const activity = { ...(v.kind === 'choice' ? { kind: 'choice', questions: validateQuestions(v.questions) } : activityFor(v.kind, v.numbers)), instruction: text(v.instruction, 120), hint: text(v.hint, 180) };
      requireThat(activity.instruction.length >= 5 && activity.hint.length >= 5, 'Escribe una instrucción breve y una pista.');
      const course = { ...validateMedia(v), id: old?.id || uid(), subjectId: subject.id, creatorId: session.id, title: text(v.title, 100), level: v.level, area: subject.name, objective: text(v.objective), description: text(v.description, 500), priceCents: v.priceCents, status: 'DRAFT', activity, supports: v.supports.filter(s => Object.hasOwn(SUPPORTS, s)), pauseEvery: v.pauseEvery };
      return { state: { ...state, courses: old ? state.courses.map(c => c.id === old.id ? course : c) : [...state.courses, course], invitations: state.invitations.map(i => i.courseId === course.id ? { ...i, active: false } : i) }, result: course };
    }
    case 'PUBLISH': {
      const c = ownedCourse(action.courseId);
      requireThat(state.teacher.review === 'APPROVED_DEMO' || allowUnreviewedTeaching, 'Tu perfil necesita una revisión aprobada.');
      requireThat(state.teacher.subscription || allowUnpaidTeaching, 'Activa el plan docente antes de publicar.');
      requireThat(c.activity.questions.length > 0, 'Agrega una actividad.');
      return { state: { ...state, courses: state.courses.map(v => v.id === c.id ? { ...v, status: 'PUBLISHED' } : v) } };
    }
    case 'INVITE': {
      const c = ownedCourse(action.courseId); requireThat(c.status === 'PUBLISHED', 'Publica el curso antes de generar una invitación.');
      requireThat(state.teacher.subscription || allowUnpaidTeaching, 'Activa el plan docente antes de generar una invitación.');
      requireThat(state.teacher.review === 'APPROVED_DEMO' || allowUnreviewedTeaching, 'Completa la revisión del perfil antes de generar una invitación.');
      const invite = { id: uid(), courseId: c.id, code: `NT-${uid().replaceAll('-', '').slice(0, 8).toUpperCase()}`, active: true };
      return { state: { ...state, invitations: [...state.invitations.map(i => i.courseId === c.id ? { ...i, active: false } : i), invite] }, result: invite };
    }
    case 'REVOKE': {
      ownedCourse(action.courseId);
      return { state: { ...state, invitations: state.invitations.map(i => i.courseId === action.courseId ? { ...i, active: false } : i) } };
    }
    case 'ENROLL': {
      role('TUTOR'); const c = courseOf(action.courseId); const child = state.children.find(v => v.id === action.childId && v.tutorId === session.id);
      requireThat(c?.status === 'PUBLISHED', 'Este curso no está disponible.');
      requireThat(child, 'Elige un perfil infantil de tu cuenta.');
      requireThat(Number.isInteger(child.age) && child.age >= 3 && child.age <= 12, 'Completa la edad del niño desde el perfil antes de inscribirlo.');
      requireThat(child.level === c.level, 'El curso debe corresponder al nivel del perfil seleccionado.');
      requireThat(!state.enrollments.some(e => e.childId === child.id && e.courseId === c.id), 'Este perfil ya está inscrito.');
      const enrollment = { id: uid(), courseId: c.id, tutorId: session.id, childId: child.id, creatorId: c.creatorId, courseTitle: c.title, videoUrl: courseVideo(c), activity: structuredClone(c.activity), supports: [...child.supports], pauseEvery: child.supports.includes('breaks') ? 1 : c.pauseEvery, teacherNote: '', completed: [], createdAt: new Date().toISOString() };
      const receipt = { id: uid(), kind: 'ENROLLMENT', ownerId: session.id, courseId: c.id, childId: child.id, amountCents: c.priceCents, recipient: c.teacher?.name || state.teacher.name, provider: 'SIMULATED', createdAt: new Date().toISOString() };
      return { state: { ...state, enrollments: [...state.enrollments, enrollment], receipts: [...state.receipts, receipt] }, result: enrollment };
    }
    case 'ANSWER': {
      role('TUTOR'); const e = state.enrollments.find(v => v.id === action.enrollmentId && v.tutorId === session.id);
      requireThat(e, 'Esta actividad no pertenece a tu familia.');
      const question = e.activity.questions.find(q => q.id === action.questionId);
      requireThat(question, 'Esta pregunta no pertenece a la actividad.');
      requireThat(answerFor(e.activity, question) === action.answer, 'Vamos a intentarlo otra vez.');
      const enrollment = { ...e, completed: [...new Set([...e.completed, question.id])] };
      return { state: { ...state, enrollments: state.enrollments.map(v => v.id === e.id ? enrollment : v) }, result: enrollment };
    }
    case 'ADJUST': {
      role('TEACHER'); const e = state.enrollments.find(v => v.id === action.enrollmentId && v.creatorId === session.id);
      requireThat(e, 'Solo puedes ajustar actividades de tus alumnos inscritos.');
      requireThat([1, 2, 3].includes(action.values.pauseEvery), 'Elige una frecuencia de pausa válida.');
      const enrollment = { ...e, supports: action.values.supports.filter(s => Object.hasOwn(SUPPORTS, s)), pauseEvery: action.values.pauseEvery, teacherNote: text(action.values.teacherNote, 250) };
      return { state: { ...state, enrollments: state.enrollments.map(v => v.id === e.id ? enrollment : v) } };
    }
    default: throw new Error('Acción no disponible.');
  }
}
