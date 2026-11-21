import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { publicUser } from '../middleware/auth.js';
import { ApiError } from '../utils/errors.js';
export function authService(db, config) {
  const token = user => jwt.sign({}, config.secret, { subject: user.id, expiresIn: config.expiresIn, algorithm: 'HS256', issuer: 'neurotalento', audience: 'neurotalento-api' });
  return {
    async register({ name, email, password, role = 'STUDENT' }) {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await db.user.create({ data: { name, email, passwordHash, role, ...(role === 'CREATOR' ? { creatorProfile: { create: {} } } : { studentProfile: { create: {} } }) }, select: publicUser });
      return { user, token: token(user) };
    },
    async login({ email, password }) {
      const account = await db.user.findUnique({ where: { email } });
      // A dummy comparison keeps unknown accounts on the bcrypt path as well.
      const valid = await bcrypt.compare(password, account?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxPLxK8p0SpxVqEV4xC2Q7YbL9u');
      if (!account || !valid) throw new ApiError(401, 'Credenciales incorrectas');
      const user = await db.user.findUnique({ where: { id: account.id }, select: publicUser });
      return { user, token: token(user) };
    },
  };
}
