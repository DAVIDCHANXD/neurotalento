import { Router } from 'express';
import { validate, rules } from '../middleware/validation.js';
export function authRoutes(controller, auth) {
  const router = Router();
  router.post('/register', validate(rules.register, ['name', 'email', 'password', 'role']), controller.register);
  router.post('/login', validate(rules.login, ['email', 'password']), controller.login);
  router.get('/me', auth, controller.me);
  return router;
}
