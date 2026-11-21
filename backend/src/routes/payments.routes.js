import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { validate, rules } from '../middleware/validation.js';
export function paymentsRoutes(c, auth) {
  const router = Router();
  router.use(auth);
  router.post('/checkout', authorize('STUDENT'), validate(rules.checkout, ['courseId']), c.checkout);
  router.get('/history', authorize('STUDENT'), c.history);
  router.get('/creator/earnings', authorize('CREATOR'), c.earnings);
  return router;
}
