import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/errors.js';
export const publicUser = { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true, creatorProfile: true, studentProfile: true };
export function authentication(db, config, optional = false) {
  return async (req, res, next) => {
    try {
      const header = req.get('authorization');
      if (!header && optional) return next();
      if (!header?.match(/^Bearer \S+$/)) throw new ApiError(401, 'Token requerido');
      let payload;
      try { payload = jwt.verify(header.slice(7), config.secret, { algorithms: ['HS256'], issuer: 'neurotalento', audience: 'neurotalento-api' }); }
      catch { throw new ApiError(401, 'Token inválido o expirado'); }
      if (typeof payload.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.sub)) throw new ApiError(401, 'Token inválido');
      req.user = await db.user.findUnique({ where: { id: payload.sub }, select: publicUser });
      if (!req.user) throw new ApiError(401, 'Usuario no disponible');
      next();
    } catch (error) { next(error); }
  };
}
export const authorize = role => (req, res, next) => req.user?.role === role ? next() : next(new ApiError(403, 'No tienes permisos'));
