import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../utils/errors.js';
import { publicUser } from '../middleware/auth.js';

export function googleAuthService(db, config, verifier = new OAuth2Client()) {
  function configured() {
    if (!config.googleClientId) throw new ApiError(503, 'El acceso con Google todavía no está configurado.');
  }
  return {
    challenge() {
      configured();
      const nonce = randomUUID();
      return { nonce, challenge: jwt.sign({ nonce }, config.secret, { algorithm: 'HS256', issuer: 'neurotalento', audience: 'google-login', expiresIn: '5m' }) };
    },
    async login({ credential, challenge, role, guardian }) {
      configured();
      if (!['TUTOR', 'TEACHER'].includes(role)) throw new ApiError(422, 'Elige tu espacio.');
      if (role === 'TUTOR' && (!guardian || !Number.isInteger(guardian.age) || guardian.age < 18 || guardian.age > 120 || guardian.responsible !== true || !['MOTHER', 'FATHER', 'GUARDIAN'].includes(guardian.relationship))) throw new ApiError(422, 'El registro requiere un tutor adulto responsable.');
      let payload, expected;
      try {
        expected = jwt.verify(challenge, config.secret, { algorithms: ['HS256'], issuer: 'neurotalento', audience: 'google-login' });
        const ticket = await verifier.verifyIdToken({ idToken: credential, audience: config.googleClientId });
        payload = ticket.getPayload();
        if (!expected.nonce || payload?.nonce !== expected.nonce || !payload.sub || !payload.email || payload.email_verified !== true) throw new Error('Invalid identity');
      } catch { throw new ApiError(401, 'No pudimos verificar la cuenta de Google. Intenta de nuevo.'); }
      const dbRole = role === 'TEACHER' ? 'CREATOR' : 'STUDENT';
      let user = await db.user.findUnique({ where: { googleSubject: payload.sub }, select: publicUser });
      if (user && user.role !== dbRole) throw new ApiError(409, 'Esta cuenta está registrada en otro espacio. Elige el rol con el que te registraste.');
      if (!user) {
        // An email match alone must never attach a Google identity to a password account.
        if (await db.user.findUnique({ where: { email: payload.email.toLowerCase() }, select: { id: true } })) throw new ApiError(409, 'Este correo ya tiene una cuenta. Debes vincular Google desde esa cuenta antes de usar este acceso.');
        user = await db.user.create({ data: {
          googleSubject: payload.sub, email: payload.email.toLowerCase(), name: String(payload.name || payload.email).slice(0, 100), role: dbRole,
          ...(dbRole === 'CREATOR' ? { creatorProfile: { create: {} } } : { studentProfile: { create: { preferences: { guardian: { age: guardian.age, relationship: guardian.relationship, responsible: true, verification: 'SELF_DECLARED' } } } } }),
        }, select: publicUser });
      }
      const token = jwt.sign({}, config.secret, { subject: user.id, expiresIn: config.expiresIn, algorithm: 'HS256', issuer: 'neurotalento', audience: 'neurotalento-api' });
      return { user, token };
    },
  };
}
