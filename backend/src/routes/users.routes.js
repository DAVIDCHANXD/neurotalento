import { Router } from 'express';
import { validate, rules } from '../middleware/validation.js';
import { respond } from '../controllers/http.js';
export function usersRoutes(service, auth) {
  const router = Router();
  router.use(auth);
  router.get('/profile', respond(req => req.user));
  router.put('/profile', validate(rules.profile, ['name', 'preferences']), respond(req => service.update(req.user, req.input)));
  return router;
}
