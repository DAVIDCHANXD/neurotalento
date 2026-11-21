# NeuroTalento: demostración de cinco minutos

## Abrir el proyecto

Desde la raíz: `npm run dev:frontend`. Abre `http://127.0.0.1:5173`.

El nuevo recorrido es una demo local con datos ficticios. No necesita el backend ni se conecta a la base existente. El catálogo anterior y su código permanecen en el repositorio, pero no forman parte del frontend activo. Los proveedores antiguos no se montan ni se leen sus datos locales. Cerrar la pestaña elimina normalmente la sesión; para una nueva demostración abre otra pestaña sin duplicar la existente.

## Guion propuesto

| Tiempo | Acción | Qué demuestra |
| --- | --- | --- |
| 0:00–0:35 | Inicio: probar respuestas y cambiar entre Números, Naturaleza y Colores | Interacción inmediata con pocas opciones y reintentos. |
| 0:35–1:20 | Entrar → Docente → Entrar como docente. Abrir Materias y crear una, por ejemplo Música | El catálogo no está limitado a matemáticas. La preparación docente se revisa aparte de Google. |
| 1:20–2:00 | Crear un curso, elegir su materia y escribir una pregunta con dos opciones y respuesta correcta. Guardar, activar el plan de prueba y publicar | Contenido propio, no una plantilla cerrada. El perfil de ejemplo ya tiene revisión administrativa simulada. |
| 2:00–2:45 | Cambiar desde “Docente” a tutor. Confirmar registro obligatorio del adulto de ejemplo | Edad mínima de 18, relación y responsabilidad; no verificación documental. Sofía, 5 años, ya está precargada. |
| 2:45–3:15 | Cursos → introducir clave → confirmar inscripción de prueba para Sofía | La clave encuentra el curso; no evita el registro del tutor ni la confirmación de inscripción. |
| 3:15–4:20 | Abrir actividad: responder mal, pedir pista, acertar, descansar y continuar | Retroalimentación inmediata, reintentos sin castigo y pausas sin reloj. Respuestas de conteo: 2, 3 y 5. |
| 4:20–5:00 | Volver al tutor y mostrar avance. En docente, abrir Alumnos y apoyos | Avance por niño y ajustes individuales. Explicar suscripción docente versus inscripción al curso. |

Para mostrar primaria, crear un perfil ficticio de 8 años y elegir Primaria. Inscribirlo en “Sumamos paso a paso”. Cada ejercicio presenta primero un grupo, después el otro y por último las respuestas. Resultados: 2, 3 y 5. La plantilla opcional de lectura inicial trabaja sol, casa y luna.

## Revisión profesional de prueba

El perfil inicial es ficticio y tiene estado `APPROVED_DEMO`, visible como revisión de ejemplo. Guardar modificaciones lo pasa a pendiente. En Perfil profesional, desplegar “Controles de presentación” para simular aprobación o solicitud de ajustes. Este control es explícitamente de demostración; un docente nunca debe aprobarse a sí mismo en producción. Publicar o crear invitaciones requiere revisión aprobada y suscripción de prueba activa.

## Operaciones que sí funcionan en la demo

- Registro adulto obligatorio, declaración de edad y responsabilidad.
- Perfiles infantiles con edad y nivel, y preferencias sin exigir diagnósticos.
- Plantillas de conteo, suma y lectura en un editor por pasos.
- Creación de materias por el docente y selección independiente de nivel y tipo de actividad.
- Preguntas personalizadas con uno a cinco ejercicios, dos o tres respuestas, opción correcta, pista y apoyo visual.
- Vista previa interactiva del contenido docente e inicio con ejercicios que se pueden resolver.
- Seis cursos iniciales en cinco materias; búsqueda y filtros de materia y nivel.
- Búsqueda y paginación de cursos docentes para evitar listas extensas.
- Publicación condicionada al plan y revisión de ejemplo.
- Creación, regeneración y revocación de claves; una clave antigua deja de resolver.
- Inscripción por niño y curso, con separación de recibos simulados de suscripción e inscripción.
- Actividades por pasos con pista, error respetuoso, pausa, repetición y progreso persistente en la sesión.
- Ajustes del docente para sus alumnos inscritos.
- Versionado de la actividad por inscripción: editar el curso no cambia las preguntas ni borra el avance anterior.

## Límites explícitos

El frontend valida el recorrido, pero no constituye una frontera de seguridad. Los datos son inspeccionables en el navegador y cambiar de rol es deliberadamente posible en la demo. Solo deben utilizarse datos ficticios. No hay un servicio de registro real ni corroboración documental de edad o parentesco.

Las claves son locales: el docente y el tutor deben usar la misma pestaña cambiando de rol. No funcionan entre dispositivos. Los pagos y la revisión administrativa son simulados. El botón Google está deshabilitado y explicado; no solicita contraseñas ni atribuye identidad verificada. La interfaz no almacena tarjetas.

## Antes de habilitar cuentas y datos reales

1. Configurar Google Identity y verificar los tokens en el servidor, sin asignar roles a partir de datos no confiables del navegador.
2. Migrar el dominio de tutor, niño, matrícula, versión de actividad y avance a tablas de servidor. Autorizar cada consulta y escritura según propiedad y matrícula. No almacenar preferencias de menores en URLs públicas ni respuestas del catálogo.
3. Implementar el registro del adulto y la gestión de responsabilidad/consentimiento según el contexto aplicable. Definir cómo se verifica, sin confundir la edad declarada con una comprobación real.
4. Reservar la revisión profesional a un rol administrativo con registro de decisiones. Retirar los controles de simulación del frontend.
5. Integrar un proveedor de pagos para suscripción docente e inscripción al docente, con comprobación de eventos en servidor, reintentos, devolución y caducidad de suscripciones. Nunca confiar en el navegador para marcar un pago como completado.
6. Resolver invitaciones y revocaciones en servidor para compartir entre dispositivos, con vencimiento, límite de intentos y sin incluir perfiles infantiles.
7. Definir retención, eliminación y acceso de tutores y docentes a datos de menores antes de un piloto real.

El backend de venta de videos anterior no implementa estas entidades. Esta entrega no modifica sus tablas, migraciones ni cuentas existentes y no afirma haber completado esas integraciones.

## Comprobaciones

`npm test --prefix frontend` ejecuta pruebas del dominio con Node. `npm run build --prefix frontend` compila el nuevo recorrido. El proyecto no tiene un comando de lint ni usa TypeScript; no se debe informar que esos controles pasaron.

El modelo de la sesión es versión 2. La actualización desde versión 1 añade materias y los cursos de ejemplo faltantes sin eliminar perfiles, inscripciones ni sus versiones de actividad. Hay pruebas específicas de esta migración, de duplicados de materias y de validación y resolución de preguntas propias.
