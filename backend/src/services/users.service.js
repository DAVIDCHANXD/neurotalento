import { publicUser } from '../middleware/auth.js';
import { requireValue } from '../utils/errors.js';
export function userService(db) {
  return {
    update(user, { name, preferences }) {
      return db.user.update({ where: { id: user.id }, data: { ...(name !== undefined && { name }), ...(preferences !== undefined && user.role === 'STUDENT' && { studentProfile: { upsert: { create: { preferences }, update: { preferences } } } }) }, select: publicUser });
    },
    async creator(id) {
      return requireValue(await db.user.findFirst({ where: { id, role: 'CREATOR' }, select: { id: true, name: true, creatorProfile: true, courses: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } } } }));
    },
    updateCreator(userId, data) { return db.creatorProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data }); },
  };
}
