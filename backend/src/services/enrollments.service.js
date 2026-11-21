import { ApiError, requireValue } from '../utils/errors.js';
import { content } from './courses.service.js';
export async function ownEnrollment(db, id, studentId) {
  const enrollment = requireValue(await db.enrollment.findUnique({ where: { id } }));
  if (enrollment.studentId !== studentId) throw new ApiError(403, 'Inscripción privada');
  return enrollment;
}
export function enrollmentService(db) {
  return {
    list(studentId) { return db.enrollment.findMany({ where: { studentId }, include: { course: { select: { id: true, title: true, thumbnailUrl: true, status: true } }, progress: true }, orderBy: { enrolledAt: 'desc' } }); },
    async detail(id, studentId) {
      await ownEnrollment(db, id, studentId);
      return db.enrollment.findUnique({ where: { id }, include: { course: { include: content }, progress: true } });
    },
    progress(id, studentId, { lessonId, completed }) {
      return db.$transaction(async tx => {
        const enrollment = await ownEnrollment(tx, id, studentId);
        const lesson = requireValue(await tx.lesson.findUnique({ where: { id: lessonId }, include: { module: true } }));
        if (lesson.module.courseId !== enrollment.courseId) throw new ApiError(422, 'La lección no pertenece al curso');
        const data = { completed, completedAt: completed ? new Date() : null };
        await tx.lessonProgress.upsert({ where: { enrollmentId_lessonId: { enrollmentId: id, lessonId } }, create: { enrollmentId: id, lessonId, ...data }, update: data });
        const total = await tx.lesson.count({ where: { module: { courseId: enrollment.courseId } } });
        const done = await tx.lessonProgress.count({ where: { enrollmentId: id, completed: true } });
        const finished = total > 0 && done === total;
        return tx.enrollment.update({ where: { id }, data: { status: finished ? 'COMPLETED' : 'ACTIVE', completedAt: finished ? enrollment.completedAt || new Date() : null }, include: { progress: true } });
      }, { isolationLevel: 'Serializable' });
    },
  };
}
