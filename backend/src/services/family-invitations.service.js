import { ApiError } from '../utils/errors.js';

const check = (valid, message = 'El curso de la invitación no es válido.') => { if (!valid) throw new ApiError(422, message); };
const text = (value, max) => { check(typeof value === 'string' && value.trim().length > 0 && value.length <= max); return value.trim(); };
const visuals = ['none', 'apple', 'sun', 'moon', 'house', 'leaf', 'cat', 'fish', 'book', 'red', 'yellow', 'blue', 'circle', 'triangle', 'square'];
function snapshotFor(user, data) {
  const c = data.course;
  check(c && c.status === 'PUBLISHED');
  check(['PRESCHOOL', 'PRIMARY'].includes(c.level));
  check(Number.isInteger(c.priceCents) && c.priceCents >= 0 && c.priceCents <= 1000000);
  check([1, 2, 3].includes(c.pauseEvery));
  const a = c.activity;
  check(a && ['count', 'sum', 'read', 'choice'].includes(a.kind) && Array.isArray(a.questions) && a.questions.length >= 1 && a.questions.length <= 5);
  const questions = a.questions.map(q => {
    const result = { id: text(q.id, 100) };
    if (a.kind === 'count') { check(Number.isInteger(q.count) && q.count >= 1 && q.count <= 5); return { ...result, count: q.count }; }
    if (a.kind === 'sum') { check([q.left, q.right].every(n => Number.isInteger(n) && n >= 1 && n <= 5)); return { ...result, left: q.left, right: q.right }; }
    check(Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.length <= 3);
    const choices = q.choices.map(v => text(v, 36));
    check(new Set(choices.map(v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).size === choices.length);
    if (a.kind === 'read') { const word = text(q.word, 36); check(choices.includes(word)); return { ...result, word, choices }; }
    check(visuals.includes(q.visual || 'none') && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < choices.length);
    return { ...result, prompt: text(q.prompt, 100), visual: q.visual || 'none', choices, correctIndex: q.correctIndex, hint: String(q.hint || '').slice(0, 180) };
  });
  check(new Set(questions.map(q => q.id)).size === questions.length);
  const optionalUrl = value => { if (!value) return ''; let url; try { url = new URL(text(value, 2048)); } catch { throw new ApiError(422, 'El enlace del material no es válido.'); } check(url.protocol === 'https:' && !url.username && !url.password); return url.href; };
  const subject = { id: text(data.subject?.id, 100), name: text(data.subject?.name, 45), visual: 'book', creatorId: user.id };
  const teacher = { name: user.name, training: String(data.teacher?.training || '').slice(0, 600), experience: String(data.teacher?.experience || '').slice(0, 600), biography: String(data.teacher?.biography || '').slice(0, 400) };
  return { subject, teacher, course: { id: text(c.id, 100), creatorId: user.id, subjectId: subject.id, area: subject.name, title: text(c.title, 100), objective: text(c.objective, 160), description: text(c.description, 500), status: 'PUBLISHED', level: c.level, priceCents: c.priceCents, activity: { kind: a.kind, instruction: text(a.instruction, 120), hint: text(a.hint, 180), questions }, pauseEvery: c.pauseEvery, supports: ['visuals', 'repeat', 'breaks'].filter(s => c.supports?.includes(s)), imageUrl: optionalUrl(c.imageUrl), ...(c.videoUrl !== undefined && { videoUrl: optionalUrl(c.videoUrl) }) } };
}
export function familyInvitationsService(db) {
  const owner = user => { if (user?.role !== 'CREATOR') throw new ApiError(403, 'Solo el docente puede administrar invitaciones.'); };
  return {
    async mine(user) {
      owner(user);
      const rows = await db.familyInvitation.findMany({ where: { creatorId: user.id, active: true }, orderBy: { createdAt: 'asc' } });
      return rows.map(row => ({ ...row.snapshot, invitation: { id: row.id, code: row.code, courseId: row.courseKey, active: true } }));
    },
    async save(user, values) {
      owner(user);
      check(values && typeof values === 'object');
      check(/^NT-[A-F0-9]{8}$/.test(values.code), 'La clave no es válida.');
      const snapshot = snapshotFor(user, values);
      const existing = await db.familyInvitation.findUnique({ where: { code: values.code } });
      if (existing) {
        if (existing.creatorId !== user.id || existing.courseKey !== snapshot.course.id) throw new ApiError(409, 'Esta clave ya está en uso. Genera una nueva.');
        return { id: existing.id, code: existing.code, courseId: existing.courseKey, active: existing.active };
      }
      if (values.migrate === true) {
        const current = await db.familyInvitation.findFirst({ where: { creatorId: user.id, courseKey: snapshot.course.id, active: true } });
        if (current) return { code: values.code, courseId: snapshot.course.id, active: false };
      }
      let record;
      try { record = await db.$transaction(async tx => {
        await tx.familyInvitation.updateMany({ where: { creatorId: user.id, courseKey: snapshot.course.id, active: true }, data: { active: false } });
        return tx.familyInvitation.create({ data: { code: values.code, creatorId: user.id, courseKey: snapshot.course.id, snapshot } });
      }, { isolationLevel: 'Serializable' }); }
      catch (error) {
        if (!['P2002', 'P2034'].includes(error.code)) throw error;
        const concurrent = await db.familyInvitation.findUnique({ where: { code: values.code } });
        if (!concurrent || concurrent.creatorId !== user.id || concurrent.courseKey !== snapshot.course.id) throw error;
        record = concurrent;
      }
      return { id: record.id, code: record.code, courseId: record.courseKey, active: record.active };
    },
    async resolve(code) {
      if (!/^NT-[A-F0-9]{8}$/.test(code)) throw new ApiError(422, 'Introduce una clave NT-XXXXXXXX o el enlace de invitación.');
      const row = await db.familyInvitation.findUnique({ where: { code } });
      if (!row?.active) throw new ApiError(404, 'Esta invitación no está disponible. Pide una nueva a tu docente.');
      const snapshot = row.snapshot;
      const courseId = `shared-${row.creatorId}-${row.courseKey}`;
      return { ...snapshot, course: { ...snapshot.course, id: courseId, teacher: snapshot.teacher }, invitation: { id: row.id, code: row.code, courseId, active: true } };
    },
    async revoke(user, courseId) {
      owner(user);
      await db.familyInvitation.updateMany({ where: { creatorId: user.id, courseKey: text(courseId, 100), active: true }, data: { active: false } });
      return { revoked: true };
    },
  };
}
