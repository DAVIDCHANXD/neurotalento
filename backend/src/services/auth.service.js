import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { publicUser } from '../middleware/auth.js';
import { ApiError } from '../utils/errors.js';
import { guardianProfile } from '../utils/guardian.js';
export function authService(db, config) {
  const token = user => jwt.sign({}, config.secret, { subject: user.id, expiresIn: config.expiresIn, algorithm: 'HS256', issuer: 'neurotalento', audience: 'neurotalento-api' });
  return {
    async register({ name, email, password, role = 'STUDENT', guardian }) {
      const adult = role === 'STUDENT' ? guardianProfile(guardian) : null;
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await db.user.create({ data: { name, email, passwordHash, role, ...(role === 'CREATOR' ? { creatorProfile: { create: {} } } : { studentProfile: { create: { preferences: { guardian: adult } } } }) }, select: publicUser });
      return { user, token: token(user) };
    },
    async login({ email, password }) {
      const account = await db.user.findUnique({ where: { email } });
      // A dummy comparison keeps unknown accounts on the bcrypt path as well.
      const valid = await bcrypt.compare(password, account?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxPLxK8p0SpxVqEV4xC2Q7YbL9u');
      if (!account?.passwordHash || !valid) throw new ApiError(401, 'Credenciales incorrectas');
      const user = await db.user.findUnique({ where: { id: account.id }, select: publicUser });
      return { user, token: token(user) };
    },
    async saveGuardian(user, values) {
      if (user.role !== 'STUDENT') throw new ApiError(403, 'Este registro corresponde a un tutor.');
      const guardian = guardianProfile(values);
      await db.studentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, preferences: { guardian } }, update: { preferences: { ...(user.studentProfile?.preferences || {}), guardian } } });
      return db.user.findUnique({ where: { id: user.id }, select: publicUser });
    },
  };
}
