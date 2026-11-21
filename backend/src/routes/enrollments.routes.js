import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { validate, rules, uuid } from '../middleware/validation.js';
import { respond } from '../controllers/http.js';
export function enrollmentsRoutes(service, payments, auth) {
  const router = Router();
  router.use(auth, authorize('STUDENT'));
  router.post('/', validate(rules.checkout, ['courseId']), respond(req => payments.checkout(req.user.id, req.input.courseId, true), 201));
  router.get('/my-courses', respond(req => service.list(req.user.id)));
  router.get('/:id', validate([uuid('id')]), respond(req => service.detail(req.params.id, req.user.id)));
  router.patch('/:id/progress', validate([uuid('id'), ...rules.progress], ['lessonId', 'completed']), respond(req => service.progress(req.params.id, req.user.id, req.input)));
  return router;
}
