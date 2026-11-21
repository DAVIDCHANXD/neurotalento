import '../src/config/env.js';
import { spawnSync } from 'node:child_process';
// Derive the direct Neon endpoint in memory; never rewrite .env or log its URL.
const env = { ...process.env };
if (!env.DIRECT_URL) {
  const url = new URL(env.DATABASE_URL);
  if (!url.hostname.endsWith('.neon.tech') || !url.hostname.includes('-pooler.')) throw new Error('Configura DIRECT_URL con la conexión directa de Neon.');
  url.hostname = url.hostname.replace('-pooler.', '.');
  env.DIRECT_URL = url.toString();
}
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, encoding: 'utf8' });
if (result.status !== 0) {
  console.error('No se pudieron aplicar las migraciones. Revisa DIRECT_URL y los permisos de la base de datos.');
  process.exitCode = 1;
} else console.log('Migraciones aplicadas mediante conexión directa de Neon.');
