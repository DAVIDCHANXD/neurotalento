import { prisma } from '../src/config/database.js';
const categories = ['Programación', 'Diseño', 'Tecnología', 'Matemáticas', 'Idiomas', 'Finanzas', 'Educación'];
try {
  for (const name of categories) await prisma.category.upsert({ where: { name }, create: { name }, update: {} });
  console.log('Categorías inicializadas');
} catch (error) {
  console.error('No se pudo ejecutar el seed:', error.code || error.name);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
