import { ApiError, requireValue } from '../utils/errors.js';
export function reviewService(db) {
  return {
    async create(studentId, courseId, data) {
      if (!await db.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } })) throw new ApiError(403, 'Debes estar inscrito para opinar');
      return db.review.create({ data: { studentId, courseId, ...data } });
    },
    async list(courseId, { page = 1, limit = 20 }) {
      requireValue(await db.course.findFirst({ where: { id: courseId, status: 'PUBLISHED' }, select: { id: true } }));
      return db.review.findMany({ where: { courseId }, include: { student: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: Number(limit), skip: (page - 1) * limit });
    },
  };
}
