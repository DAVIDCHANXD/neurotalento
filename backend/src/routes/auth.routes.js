import { Router } from 'express';
import { validate, rules } from '../middleware/validation.js';
import { ApiError } from '../utils/errors.js';
export function authRoutes(controller, auth, config) {
  const router = Router();
  const googleOrigin = (req, res, next) => {
    if (req.get('origin') !== new URL(config.frontendUrl).origin) return next(new ApiError(403, 'Origen no permitido.'));
    res.set('Cache-Control', 'no-store');
    next();
  };
  router.post('/google/challenge', googleOrigin, controller.googleChallenge);
  router.post('/google', googleOrigin, validate(rules.google, ['credential', 'challenge', 'role', 'guardian']), controller.google);
  router.post('/register', validate(rules.register, ['name', 'email', 'password', 'role', 'guardian']), controller.register);
  router.put('/guardian', auth, validate(rules.guardian, ['age', 'relationship', 'responsible']), controller.guardian);
  router.post('/login', validate(rules.login, ['email', 'password']), controller.login);
  router.get('/me', auth, controller.me);
  return router;
}
