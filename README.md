# NeuroTalento

Plataforma para crear y consumir cursos digitales. Backend JavaScript con Express, PostgreSQL en Neon y Prisma **6.19.0**. El frontend no se modifica en esta implementación.

## Documentación del backend

| Documento | Qué explica |
| --- | --- |
| [Guía del backend](docs/backend.md) | Funciones implementadas, arquitectura, archivos, instalación, mantenimiento, pruebas y pendientes |
| [Referencia de la API](docs/backend-api.md) | Endpoints, permisos, cuerpos de petición, respuestas y conexión del frontend |
| [Base de datos](docs/database.md) | Entidades, relaciones, restricciones, migraciones y cálculo de comisiones |

Para entender el proyecto comienza por la guía. Para construir el frontend utiliza la referencia de la API.

## Instalación

Requiere Node.js 22 y npm. Desde la raíz del repositorio, en PowerShell:

```powershell
cd backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copia el secreto generado a `JWT_SECRET` en tu `.env`. No lo publiques ni uses el valor de ejemplo. Si `.env` ya existe, agrega las variables faltantes manualmente; los scripts no sobrescriben ese archivo.

## Neon y variables

Crea un proyecto de PostgreSQL en Neon y copia las conexiones de su panel **Connect**. Con pooling activado, guarda la URL en `DATABASE_URL`; con pooling desactivado, guarda la conexión directa en `DIRECT_URL`. Conserva `sslmode=require` y codifica los caracteres especiales de la contraseña cuando corresponda. No uses Docker para la base de datos.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión pooled de Neon para consultas de la API |
| `DIRECT_URL` | Conexión directa para migraciones |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres |
| `JWT_EXPIRES_IN` | Vigencia del token; por defecto `7d` |
| `PLATFORM_COMMISSION_PERCENT` | Comisión de 0 a 100, hasta dos decimales; por defecto 15 |
| `PORT` | Puerto HTTP; por defecto 3000 |
| `FRONTEND_URL` | Origen autorizado por CORS; por defecto `http://localhost:5173` |
| `NODE_ENV` | Entorno de ejecución |

La configuración `url` / `directUrl` del esquema corresponde a [Prisma ORM 6](https://www.prisma.io/docs/orm/v6/reference/prisma-schema-reference).

```powershell
npm run db:generate
npm run db:validate
npm run db:deploy
npm run db:seed
npm run db:check
npm run dev
```

La migración inicial está incluida. `db:deploy` aplica las migraciones sin necesitar una base shadow. Para desarrollar nuevas migraciones: `npm run db:migrate -- --name nombre_del_cambio`; Prisma Migrate puede requerir permisos para una base shadow. Para desplegar usa siempre `db:deploy`.

Si tu `.env` actual solo tiene la URL pooled de Neon, `npm run db:deploy:neon` deriva el hostname directo en memoria y ejecuta la migración; no escribe credenciales ni cambia `.env`. Para uso normal configura ambas variables explícitamente.

Otros comandos: `npm start`, `npm run db:studio`, `npm test` y `npm run test:live`. Este último requiere la base migrada y el seed: crea cuentas y un curso temporal, ejecuta compras simuladas y elimina únicamente sus propios datos al terminar. No lo ejecutes contra una base ajena al proyecto.

## API

Prefijo `/api`. Respuestas de datos: `{ "success": true, "data": ... }`. Errores: `{ "success": false, "message": "..." }`. Validaciones inválidas devuelven 422, autenticación 401, permisos 403, duplicados 409. Usa `Authorization: Bearer TOKEN` en rutas privadas.

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/health` | Público; comprueba PostgreSQL, devuelve 503 si falla |
| POST | `/auth/register`, `/auth/login` | Público |
| GET | `/auth/me` | Autenticado |
| GET, PUT | `/users/profile` | Autenticado |
| GET | `/creators/:id` | Público; ID de usuario del creador |
| PUT | `/creators/profile` | Creador |
| GET | `/courses`, `/courses/:id` | Catálogo público; autenticación opcional en detalle |
| POST | `/courses` | Creador |
| PUT, DELETE | `/courses/:id` | Creador propietario |
| PATCH | `/courses/:id/publish` | Creador propietario |
| POST | `/courses/:courseId/modules` | Creador propietario |
| PUT, DELETE | `/modules/:id` | Creador propietario |
| POST | `/modules/:moduleId/lessons` | Creador propietario |
| PUT, DELETE | `/lessons/:id` | Creador propietario |
| POST | `/enrollments` | Estudiante; solo cursos gratuitos |
| GET | `/enrollments/my-courses`, `/enrollments/:id` | Estudiante propietario |
| PATCH | `/enrollments/:id/progress` | Estudiante propietario |
| POST | `/payments/checkout` | Estudiante; pago simulado |
| GET | `/payments/history` | Estudiante |
| GET | `/payments/creator/earnings` | Creador |
| GET | `/categories` | Público |
| GET | `/courses/:courseId/reviews` | Público; curso publicado |
| POST | `/courses/:courseId/reviews` | Estudiante inscrito |
| GET | `/dashboard/creator` | Creador |
| GET | `/dashboard/student` | Estudiante |

## Cuerpos y comportamiento

- Registro: `{ "name": "Demo", "email": "demo@example.test", "password": "una-clave-de-prueba-larga", "role": "STUDENT" }`. Roles: `STUDENT` o `CREATOR`; el rol no puede cambiar mediante perfil. Contraseñas: mínimo 10 caracteres y máximo 72 bytes UTF-8 por bcrypt. Login: `email`, `password`. Ambos devuelven `user` y `token`, sin hash.
- Perfil de usuario: `name` y, para estudiantes, `preferences` (objeto JSON). Perfil de creador: `biography`, `specialties` (lista de textos), `avatarUrl`. No se exige diagnóstico ni se definen campos médicos.
- Curso: `title`, `description`, `categoryId` (UUID), `priceCents` (entero no negativo); opcionales `currency` (`MXN`, `USD`, `EUR`, predeterminado MXN) y `thumbnailUrl`. Se crea en `DRAFT`. Actualización parcial mediante PUT; el estado se maneja con publicación o archivo. El slug se genera automáticamente.
- Catálogo: filtros `categoryId`, `creatorId`, `search`; paginación `page=1&limit=20` (máximo 100). Solo devuelve `PUBLISHED`. El dashboard del creador incluye sus borradores y cursos archivados.
- Módulo: `title`, `position` (entero desde 0), `description` opcional. Lección: `title`, `position`, `videoUrl` HTTP(S); opcionales `description`, `durationSeconds` e `isPreview` (booleano). Las posiciones son únicas dentro de cada padre. PUT permite actualizaciones parciales. Para intercambiar posiciones utiliza temporalmente una posición libre.
- Publicación: requiere al menos un módulo y una lección en cada módulo. DELETE de curso lo archiva para conservar compras e inscripciones. Solo se elimina contenido de cursos en borrador sin inscritos. Añadir lecciones reabre los cursos previamente completados para esos estudiantes.
- Detalle público: las lecciones privadas no exponen su video ni descripción. El propietario y los inscritos acceden al contenido completo, incluso si posteriormente se archiva el curso. Los archivos de video deben alojarse en un proveedor adecuado; una URL compartida no equivale a DRM.
- Inscripción gratuita y checkout: `{ "courseId": "UUID" }`. El cliente no puede enviar precio o comisión. El checkout crea compra, pago `SIMULATED` exitoso e inscripción dentro de una transacción serializable, incluso si el importe es cero. La inscripción gratuita directa no genera una compra. Unicidad y transacciones impiden duplicados; un conflicto concurrente devuelve 409 para reintentar.
- Progreso: `{ "lessonId": "UUID", "completed": true }`. Solo admite lecciones del curso inscrito. Completar todas las lecciones marca la inscripción como `COMPLETED`; desmarcar una la reabre.
- Opinión: `{ "rating": 5, "comment": "Comentario" }`; de 1 a 5, una por estudiante inscrito y curso. Listado paginado con `page` y `limit`.
- Ingresos y dashboard de creador: importes en centavos, agrupados por moneda en `earnings` (`grossCents`, `commissionCents`, `netCents`, `totalSales`). No se suman monedas distintas. Incluye cursos, total de estudiantes únicos, inscripciones y cursos más inscritos. Dashboard de estudiante: totales, cursos iniciados, completados y porcentaje global ponderado por lecciones.

## Arquitectura y validación

`config/` inicializa entorno y Prisma; `routes/` declara endpoints y validaciones; `controllers/` adapta HTTP; `services/` contiene permisos de propiedad y lógica de negocio; `middleware/` autentica, autoriza y maneja errores; `utils/` contiene errores y cálculo monetario. `prisma/` incluye esquema, migración SQL y seed idempotente de siete categorías, sin cuentas personales.

`npm test` ejecuta pruebas HTTP y de servicios con una base simulada: autenticación real con bcrypt/JWT, roles, entradas inválidas, cursos, publicación, acceso a videos, checkout, comisión y progreso. `npm run test:live` verifica el flujo contra PostgreSQL real y limpia sus datos temporales. Consulta [docs/database.md](docs/database.md) para detalles de integridad y estado de validación.
