import { prisma } from '../src/config/database.js';
// Output deliberately excludes the connection string and Prisma error message.
const timeout = setTimeout(() => {
  console.error('PostgreSQL: sin respuesta en 10 segundos');
  process.exit(1);
}, 10000);
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('PostgreSQL: conexión verificada con SELECT 1');
} catch (error) {
  console.error('PostgreSQL: conexión no verificada:', error.code || error.name);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  clearTimeout(timeout);
}
