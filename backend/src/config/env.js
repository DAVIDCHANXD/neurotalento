import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
export function loadConfig(env = process.env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.includes('replace_with')) throw new Error('Configura JWT_SECRET con al menos 32 caracteres aleatorios.');
  const percent = env.PLATFORM_COMMISSION_PERCENT ?? '15';
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(percent) || Number(percent) > 100) throw new Error('Comisión inválida (0 a 100, máximo dos decimales).');
  const [whole, fraction = ''] = percent.split('.');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido.');
  return { port, secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN || '7d', googleClientId: env.GOOGLE_CLIENT_ID || '', commissionBps: Number(whole) * 100 + Number(fraction.padEnd(2, '0')), frontendUrl: env.FRONTEND_URL || 'http://localhost:5173' };
}
