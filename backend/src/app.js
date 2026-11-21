import express from 'express';
import cors from 'cors';
import { prisma } from './config/database.js';
import { loadConfig } from './config/env.js';
import { authentication, authorize } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import { validate, rules, uuid } from './middleware/validation.js';
import { authService } from './services/auth.service.js';
import { courseService } from './services/courses.service.js';
import { paymentService } from './services/payments.service.js';
import { enrollmentService } from './services/enrollments.service.js';
import { userService } from './services/users.service.js';
import { reviewService } from './services/reviews.service.js';
import { dashboardService } from './services/dashboard.service.js';
import { authController } from './controllers/auth.controller.js';
import { coursesController } from './controllers/courses.controller.js';
import { paymentsController } from './controllers/payments.controller.js';
import { respond } from './controllers/http.js';
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { coursesRoutes, contentRoutes } from './routes/courses.routes.js';
import { enrollmentsRoutes } from './routes/enrollments.routes.js';
import { paymentsRoutes } from './routes/payments.routes.js';
export function createApp({ db = prisma, config = loadConfig() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json({ limit: '100kb' }));
  const auth = authentication(db, config), optionalAuth = authentication(db, config, true);
  const payments = paymentService(db, config), users = userService(db), dashboard = dashboardService(db, payments);
  const courses = coursesController(courseService(db));
  app.get('/api/health', async (req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ success: true, message: 'NeuroTalento API funcionando', database: 'connected' });
    } catch { res.status(503).json({ success: false, message: 'PostgreSQL no disponible', database: 'disconnected' }); }
  });
  app.use('/api/auth', authRoutes(authController(authService(db, config)), auth));
  app.use('/api/users', usersRoutes(users, auth));
  app.put('/api/creators/profile', auth, authorize('CREATOR'), validate(rules.creator, ['biography', 'specialties', 'avatarUrl']), respond(req => users.updateCreator(req.user.id, req.input)));
  app.get('/api/creators/:id', validate([uuid('id')]), respond(req => users.creator(req.params.id)));
  app.use('/api/courses', coursesRoutes(courses, reviewService(db), auth, optionalAuth));
  app.use('/api/enrollments', enrollmentsRoutes(enrollmentService(db), payments, auth));
  app.use('/api/payments', paymentsRoutes(paymentsController(payments), auth));
  app.get('/api/categories', respond(() => db.category.findMany({ orderBy: { name: 'asc' } })));
  app.get('/api/dashboard/creator', auth, authorize('CREATOR'), respond(req => dashboard.creator(req.user.id)));
  app.get('/api/dashboard/student', auth, authorize('STUDENT'), respond(req => dashboard.student(req.user.id)));
  // Scope authentication to these paths so unknown public paths return 404.
  const contents = contentRoutes(courses, auth);
  app.use('/api', (req, res, next) => /^\/(modules|lessons)(\/|$)/.test(req.path) ? contents(req, res, next) : next());
  app.use((req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada' }));
  app.use(errorHandler);
  return app;
}
