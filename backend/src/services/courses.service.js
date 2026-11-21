import { randomUUID } from 'node:crypto';
import { ApiError, requireValue } from '../utils/errors.js';
export const content = { modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } } };
export const creatorSelect = { id: true, name: true, creatorProfile: true };
export async function ownedCourse(db, id, userId) {
  const course = requireValue(await db.course.findUnique({ where: { id } }));
  if (course.creatorId !== userId) throw new ApiError(403, 'Solo el propietario puede modificar este curso');
  return course;
}
export async function ownedContent(db, kind, id, userId) {
  const row = requireValue(await db[kind].findUnique({ where: { id }, ...(kind === 'lesson' ? { include: { module: true } } : {}) }));
  const course = await ownedCourse(db, kind === 'lesson' ? row.module.courseId : row.courseId, userId);
  return { row, course };
}
export function courseService(db) {
  return {
    list(query) {
      const { categoryId, creatorId, search, page = 1, limit = 20 } = query;
      return db.course.findMany({ where: { status: 'PUBLISHED', ...(categoryId && { categoryId }), ...(creatorId && { creatorId }), ...(search && { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }) }, include: { category: true, creator: { select: creatorSelect }, _count: { select: { enrollments: true, reviews: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: Number(limit) });
    },
    async detail(id, user) {
      const course = requireValue(await db.course.findUnique({ where: { id }, include: { ...content, category: true, creator: { select: creatorSelect } } }));
      const owner = course.creatorId === user?.id;
      const enrolled = user ? await db.enrollment.findUnique({ where: { studentId_courseId: { studentId: user.id, courseId: id } } }) : null;
      if (course.status !== 'PUBLISHED' && !owner && !enrolled) throw new ApiError(404, 'Curso no encontrado');
      if (!owner && !enrolled) for (const module of course.modules) for (const lesson of module.lessons) {
        if (!lesson.isPreview) { delete lesson.videoUrl; delete lesson.description; }
      }
      return course;
    },
    create(data, user) {
      const slug = data.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'curso';
      return db.course.create({ data: { ...data, creatorId: user.id, slug: `${slug}-${randomUUID()}` } });
    },
    async update(id, data, user) {
      await ownedCourse(db, id, user.id);
      return db.course.update({ where: { id }, data });
    },
    async publish(id, user) {
      await ownedCourse(db, id, user.id);
      const course = await db.course.findUnique({ where: { id }, include: content });
      if (!course.modules.length || course.modules.some(m => !m.lessons.length)) throw new ApiError(422, 'Cada módulo debe tener al menos una lección para publicar');
      return db.course.update({ where: { id }, data: { status: 'PUBLISHED' } });
    },
    async archive(id, user) {
      await ownedCourse(db, id, user.id);
      // Keep purchases, enrollments and learning history intact.
      return db.course.update({ where: { id }, data: { status: 'ARCHIVED' } });
    },
    async addModule(courseId, data, user) {
      await ownedCourse(db, courseId, user.id);
      return db.module.create({ data: { ...data, courseId } });
    },
    async addLesson(moduleId, data, user) {
      const { course } = await ownedContent(db, 'module', moduleId, user.id);
      return db.$transaction(async tx => {
        const lesson = await tx.lesson.create({ data: { ...data, moduleId } });
        await tx.enrollment.updateMany({ where: { courseId: course.id, status: 'COMPLETED' }, data: { status: 'ACTIVE', completedAt: null } });
        return lesson;
      }, { isolationLevel: 'Serializable' });
    },
    async editContent(kind, id, data, user, remove = false) {
      const { course } = await ownedContent(db, kind, id, user.id);
      if (remove) {
        if (course.status !== 'DRAFT' || await db.enrollment.count({ where: { courseId: course.id } })) throw new ApiError(409, 'Solo puedes eliminar contenido de borradores sin inscripciones');
        return db[kind].delete({ where: { id } });
      }
      return db[kind].update({ where: { id }, data });
    },
  };
}
