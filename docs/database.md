# Base de datos NeuroTalento

PostgreSQL en Neon, Prisma 6.19.0. El esquema está en `backend/prisma/schema.prisma` y la migración inicial en `backend/prisma/migrations/20261120000000_init/migration.sql`.

## Relaciones e integridad

- `User` tiene un perfil de estudiante o creador según el rol registrado. Perfiles: relación uno a uno por `userId` único. No existen campos para diagnósticos o información médica.
- `User` creador tiene muchos `Course`; cada curso pertenece a una `Category`.
- `Course` contiene `Module` y cada módulo contiene `Lesson`. Orden único por curso/módulo y posición no negativa.
- `Enrollment` relaciona estudiante y curso con restricción única `(studentId, courseId)`.
- `LessonProgress` usa `(enrollmentId, lessonId)` único. El servicio verifica que la lección pertenezca al curso de la inscripción.
- `Purchase` guarda el importe original, comisión, neto del creador y moneda como fotografía de la compra. Es única por estudiante y curso; actualmente no existe un flujo de reembolsos o recompras.
- `Payment` referencia la compra; `providerReference` es único y el proveedor es `SIMULATED`.
- `Review` tiene unicidad por estudiante y curso y rating entre 1 y 5. El servicio exige inscripción.

Todos los IDs son UUID. Se indexan categorías/estados de cursos, creador, curso en inscripciones y compras, referencias de pagos, lecciones en progreso y curso en opiniones. Las claves foráneas impiden registros huérfanos. Las relaciones financieras usan `Restrict` al eliminar; perfiles y contenido dependiente usan `Cascade`. La API archiva cursos mediante DELETE para preservar el historial.

La migración añade restricciones CHECK para precios, posiciones, duración e importes no negativos, rango de calificación y la igualdad importe = comisión + neto. Estas restricciones SQL no se expresan directamente en Prisma: conserva la migración y usa `migrate deploy`, no `db push`, para reproducirlas.

## Compras y progreso

El checkout usa una transacción de aislamiento `Serializable`: verifica publicación, comprador distinto del creador y ausencia de inscripción, lee el precio de PostgreSQL, calcula la comisión, crea compra y pago exitosos y crea la inscripción. Si falla cualquier escritura PostgreSQL revierte la transacción. Los conflictos de unicidad/concurrencia se traducen en 409.

Importes: `Int` en centavos. La comisión configurable se convierte a puntos básicos (15% = 1500). El cálculo usa `BigInt` y redondeo al centavo más cercano, con mitades hacia arriba: `(importe * puntosBasicos + 5000) / 10000`. El neto es la diferencia exacta. No se realizan multiplicaciones con decimales JavaScript. Los reportes agrupan por moneda.

El progreso también se actualiza mediante transacción serializable. Se marca una inscripción como completada únicamente cuando todas sus lecciones están completas. Al agregar una lección se reabren las inscripciones completadas. Las eliminaciones de contenido se restringen a borradores sin inscritos.

## Configuración y comandos

Desde `backend/`, configura en `.env` `DATABASE_URL` pooled y `DIRECT_URL` directa desde Neon; ambas con SSL. No publiques ese archivo. Prisma 6 usa ambas variables dentro del datasource del esquema.

```powershell
npm ci
npm run db:generate
npm run db:validate
npm run db:deploy
npm run db:seed
npm run db:check
npm test
npm run test:live
```

Para nuevas migraciones de desarrollo: `npm run db:migrate -- --name descripcion`. Si Neon no permite crear una base shadow, configura una base shadow separada según la documentación de Prisma o genera/revisa SQL antes del despliegue. Nunca uses `migrate reset` contra datos que deban conservarse.

El seed inserta categorías mediante `upsert`: Programación, Diseño, Tecnología, Matemáticas, Idiomas, Finanzas y Educación. No modifica categorías ya existentes ni crea usuarios o contraseñas.

`db:deploy:neon` permite derivar la URL directa desde un hostname pooled de Neon exclusivamente en memoria, cuando falta `DIRECT_URL`. No cambia el archivo `.env`. `db:check` consulta `SELECT 1` y no imprime errores que pudieran contener credenciales.

## Validación de la implementación

Se instalaron las dependencias, se validó el esquema con Prisma 6.19.0 y se generó Prisma Client. Se verificó sintaxis JavaScript y pasaron las cinco pruebas de servicios/HTTP con base simulada. La conexión real a Neon respondió a `SELECT 1`; se inspeccionó la base inicialmente vacía, se aplicó la migración por conexión directa y se ejecutó el seed.

La prueba real contra Neon verificó health, registro, propiedad de cursos, publicación, protección de videos, rechazo de manipulación de precio, compra simulada, bloqueo de duplicados, progreso, opiniones y dashboards. Un curso de 1999 centavos produjo 300 de comisión y 1699 de neto. Los datos temporales de la prueba se eliminaron al terminar.

El `.env` existente quedó intacto: falta configurar `JWT_SECRET` para el inicio normal y persistir `DIRECT_URL` para los comandos estándar de migración. La prueba real utiliza un secreto temporal en memoria y el auxiliar de migración deriva la conexión directa sin escribir archivos de credenciales.

`npm audit` reportó seis avisos: cuatro altos en la cadena de Prisma/config (`effect` y `deepmerge-ts`) y dos moderados en nodemon/minimatch. Al omitir desarrollo siguen apareciendo los cuatro de Prisma por su resolución como dependencia peer del cliente. No se aplicó `audit fix --force`, porque propone Prisma 7 y contradice el requisito de Prisma 6; estos avisos quedan pendientes de una actualización compatible o revisión específica de dependencias. La API no importa esas bibliotecas de configuración para procesar solicitudes.
