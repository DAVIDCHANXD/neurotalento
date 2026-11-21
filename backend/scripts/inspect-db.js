import { prisma } from '../src/config/database.js';
try {
  const url = new URL(process.env.DATABASE_URL);
  console.log('Neon:', url.hostname.endsWith('.neon.tech'));
  console.log('Pooled:', url.hostname.includes('-pooler'));
  const rows = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tablas públicas:', JSON.stringify(rows));
} catch (error) {
  console.error('No se pudo inspeccionar:', error.code || error.name);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
