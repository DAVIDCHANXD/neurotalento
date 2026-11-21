import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { prisma } from './config/database.js';
const config = loadConfig();
const server = createApp({ config }).listen(config.port, () => console.log(`NeuroTalento API en puerto ${config.port}`));
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000);
  timeout.unref();
  server.close(async () => {
    try { await prisma.$disconnect(); clearTimeout(timeout); process.exit(0); }
    catch { process.exit(1); }
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('error', async error => { console.error('No se pudo iniciar el servidor:', error.code); await prisma.$disconnect(); process.exit(1); });
