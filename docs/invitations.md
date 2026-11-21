# Invitaciones a cursos

El docente publica el curso y pulsa «Generar invitación». La clave y una copia pública del curso se guardan en PostgreSQL, en la tabla `FamilyInvitation`. El tutor puede validar la clave o el enlace completo desde otra cuenta y otro navegador.

Al registrar un alumno, el tutor puede pegar la invitación en «Clave del docente» y pulsar «Validar clave». Se comprueba que exista, siga activa y corresponda al nivel educativo elegido. «Guardar e inscribir» crea el perfil y su inscripción juntos; una validación fallida no crea un perfil parcial.

También se puede usar «Tengo una clave» en el catálogo. Acepta `NT-XXXXXXXX` y enlaces completos con el parámetro `clave`. La búsqueda por invitación ignora filtros previos de nivel, materia y texto.

Regenerar la clave revoca la anterior. Revocar o editar un curso desactiva sus invitaciones del servidor. Los alumnos que ya estén inscritos conservan su actividad y avance locales.

Cerrar sesión no revoca la invitación. Al volver como docente, `/api/family/invitations/mine` recupera sus claves y cursos activos desde la base de datos, incluso si se perdió el almacenamiento de la pestaña. Al cambiar de cuenta, el catálogo vuelve a validar la clave. Solo se conserva el contenido público de la invitación al pasar por la pantalla de acceso; nunca se copian alumnos, datos del tutor o avances entre cuentas.

`node backend/scripts/check-invitation-roundtrip.js` comprueba el recorrido contra la API local con cuentas temporales: generar clave → descartar la sesión docente → entrar como tutor → consultar la misma clave → volver como docente y recuperar su clave. Las cuentas temporales y sus invitaciones se eliminan al terminar.

Los códigos antiguos que estaban solo en el navegador se sincronizan automáticamente al abrir la cuenta del docente. La sincronización conserva el código y no reactiva claves revocadas ni sustituye una clave nueva que ya esté activa en el servidor. Copiar el enlace se habilita después de guardarlo en el servidor. Las inscripciones y avances del recorrido familiar todavía permanecen en `sessionStorage`; este cambio no sincroniza el progreso entre dispositivos.

La copia compartida contiene solamente curso, actividad, materia y presentación pública del docente. No incluye perfiles infantiles, datos del tutor, notas individuales ni información del plan docente.
