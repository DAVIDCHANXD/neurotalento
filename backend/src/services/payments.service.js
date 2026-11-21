import { randomUUID } from 'node:crypto';
import { ApiError, requireValue } from '../utils/errors.js';
import { splitAmount } from '../utils/money.js';
export function paymentService(db, config) {
  return {
    checkout(studentId, courseId, freeOnly = false) {
      return db.$transaction(async tx => {
        const course = requireValue(await tx.course.findUnique({ where: { id: courseId } }));
        if (course.status !== 'PUBLISHED') throw new ApiError(409, 'El curso no está publicado');
        if (course.creatorId === studentId) throw new ApiError(403, 'No puedes comprar tu propio curso');
        if (await tx.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } })) throw new ApiError(409, 'Ya estás inscrito');
        if (freeOnly && course.priceCents !== 0) throw new ApiError(402, 'Este curso requiere checkout');
        if (freeOnly) return { enrollment: await tx.enrollment.create({ data: { studentId, courseId } }), purchase: null };
        const amounts = splitAmount(course.priceCents, config.commissionBps);
        const purchase = await tx.purchase.create({ data: { studentId, courseId, ...amounts, currency: course.currency, status: 'SUCCESS', payments: { create: { provider: 'SIMULATED', providerReference: `sim_${randomUUID()}`, amountCents: course.priceCents, status: 'SUCCESS' } } }, include: { payments: true } });
        const enrollment = await tx.enrollment.create({ data: { studentId, courseId } });
        return { purchase, enrollment };
      }, { isolationLevel: 'Serializable' });
    },
    history(studentId) { return db.purchase.findMany({ where: { studentId }, include: { course: { select: { id: true, title: true } }, payments: true }, orderBy: { createdAt: 'desc' } }); },
    async earnings(creatorId) {
      const rows = await db.purchase.groupBy({ by: ['currency'], where: { course: { creatorId }, status: 'SUCCESS' }, _sum: { amountCents: true, commissionCents: true, creatorAmountCents: true }, _count: true });
      return rows.map(({ currency, _sum, _count }) => ({ currency, totalSales: _count, grossCents: _sum.amountCents || 0, commissionCents: _sum.commissionCents || 0, netCents: _sum.creatorAmountCents || 0 }));
    },
  };
}
