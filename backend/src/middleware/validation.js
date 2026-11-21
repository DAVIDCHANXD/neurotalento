import { body, param, query, validationResult, matchedData } from 'express-validator';
export const uuid = name => param(name).isUUID().withMessage('UUID inválido');
const text = (name, max, optional = false) => {
  const rule = body(name);
  if (optional) rule.optional();
  return rule.isString().bail().trim().isLength({ min: 1, max });
};
const integer = (name, max = 2147483647) => body(name).isInt({ min: 0, max }).toInt();
const url = name => body(name).isURL({ protocols: ['https', 'http'], require_protocol: true }).isLength({ max: 2048 });
export const rules = {
  guardian: [body('age').isInt({ min: 18, max: 120 }).toInt(), body('relationship').isIn(['MOTHER', 'FATHER', 'GUARDIAN']), body('responsible').custom(value => value === true)],
  google: [body('credential').isString().isLength({ min: 20, max: 10000 }), body('challenge').isString().isLength({ min: 20, max: 2000 }), body('role').isIn(['TUTOR', 'TEACHER']), body('guardian').optional().isObject({ strict: true }), body('guardian.age').optional().isInt({ min: 18, max: 120 }).toInt(), body('guardian.relationship').optional().isIn(['MOTHER', 'FATHER', 'GUARDIAN']), body('guardian.responsible').optional().isBoolean({ strict: true })],
  register: [text('name', 100), body('email').isString().bail().trim().isEmail().isLength({ max: 254 }).toLowerCase(), body('password').isString().bail().isLength({ min: 10 }).custom(v => Buffer.byteLength(v, 'utf8') <= 72), body('role').optional().isIn(['STUDENT', 'CREATOR']), body('guardian').optional().isObject({ strict: true })],
  login: [body('email').isString().bail().trim().isEmail().toLowerCase(), body('password').isString().bail().isLength({ min: 1 }).custom(v => Buffer.byteLength(v, 'utf8') <= 72)],
  profile: [text('name', 100, true), body('preferences').optional().isObject({ strict: true })],
  creator: [body('biography').optional().isString().isLength({ max: 5000 }), body('specialties').optional().isArray({ max: 30 }), body('specialties.*').isString().isLength({ min: 1, max: 100 }), url('avatarUrl').optional({ values: 'null' })],
  get course() { return [text('title', 200), text('description', 20000), body('categoryId').isUUID(), integer('priceCents'), body('currency').optional().isIn(['MXN', 'USD', 'EUR']), url('thumbnailUrl').optional({ values: 'null' })]; },
  get module() { return [text('title', 200), body('description').optional().isString().isLength({ max: 10000 }), integer('position')]; },
  get lesson() { return [text('title', 200), body('description').optional().isString().isLength({ max: 10000 }), url('videoUrl'), integer('position'), integer('durationSeconds').optional(), body('isPreview').optional().isBoolean({ strict: true })]; },
  checkout: [body('courseId').isUUID()],
  progress: [body('lessonId').isUUID(), body('completed').isBoolean({ strict: true })],
  review: [body('rating').isInt({ min: 1, max: 5 }).toInt(), body('comment').optional().isString().trim().isLength({ max: 5000 })],
  catalog: [query('categoryId').optional().isUUID(), query('creatorId').optional().isUUID(), query('search').optional().isString().trim().isLength({ min: 1, max: 200 })],
  paging: [query('page').optional().isInt({ min: 1, max: 100000 }).toInt(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()],
};
export const partial = validators => validators.map(v => v.optional());
export function validate(validators, allowedBody = null) {
  return [...validators, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, message: 'Datos inválidos', errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })) });
    if (allowedBody && Object.keys(req.body || {}).some(key => !allowedBody.includes(key))) return res.status(422).json({ success: false, message: 'Campos no permitidos' });
    req.input = matchedData(req, { locations: ['body'] });
    req.filters = matchedData(req, { locations: ['query'] });
    next();
  }];
}
