import { Router } from 'express';
import { validate, rules, uuid, partial } from '../middleware/validation.js';
import { authorize } from '../middleware/auth.js';
import { respond } from '../controllers/http.js';
const courseFields = ['title', 'description', 'categoryId', 'priceCents', 'currency', 'thumbnailUrl'];
export function coursesRoutes(c, reviews, auth, optionalAuth) {
  const router = Router();
  const creator = authorize('CREATOR');
  router.get('/', validate([...rules.catalog, ...rules.paging]), c.list);
  router.post('/', auth, creator, validate(rules.course, courseFields), c.create);
  router.get('/:id', optionalAuth, validate([uuid('id')]), c.detail);
  router.put('/:id', auth, creator, validate([uuid('id'), ...partial(rules.course)], courseFields), c.update);
  router.delete('/:id', auth, creator, validate([uuid('id')]), c.archive);
  router.patch('/:id/publish', auth, creator, validate([uuid('id')], []), c.publish);
  router.post('/:courseId/modules', auth, creator, validate([uuid('courseId'), ...rules.module], ['title', 'description', 'position']), c.addModule);
  router.get('/:courseId/reviews', validate([uuid('courseId'), ...rules.paging]), respond(req => reviews.list(req.params.courseId, req.filters)));
  router.post('/:courseId/reviews', auth, authorize('STUDENT'), validate([uuid('courseId'), ...rules.review], ['rating', 'comment']), respond(req => reviews.create(req.user.id, req.params.courseId, req.input), 201));
  return router;
}
export function contentRoutes(c, auth) {
  const router = Router();
  router.use(auth, authorize('CREATOR'));
  router.post('/modules/:moduleId/lessons', validate([uuid('moduleId'), ...rules.lesson], ['title', 'description', 'videoUrl', 'durationSeconds', 'position', 'isPreview']), c.addLesson);
  for (const [path, kind, validators, fields] of [
    ['modules', 'module', rules.module, ['title', 'description', 'position']],
    ['lessons', 'lesson', rules.lesson, ['title', 'description', 'videoUrl', 'durationSeconds', 'position', 'isPreview']],
  ]) {
    router.put(`/${path}/:id`, validate([uuid('id'), ...partial(validators)], fields), c.edit(kind));
    router.delete(`/${path}/:id`, validate([uuid('id')]), c.edit(kind, true));
  }
  return router;
}
