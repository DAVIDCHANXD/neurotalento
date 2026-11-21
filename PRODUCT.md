# NeuroTalento

## Producto y alcance acordado

Apoyo educativo para niños con TDAH de preescolar y primaria. No es un servicio de diagnóstico, tratamiento ni una garantía de resultados. El mecanismo de apoyo es una instrucción a la vez, objetos visualmente separados, pocas opciones, pistas, reintentos sin castigos, objetivos pequeños y pausas opcionales.

El tutor adulto registra y administra los perfiles infantiles. El docente presenta preparación y experiencia para revisión, prepara actividades con plantillas y ajusta los apoyos por alumno inscrito. La autenticación de Google y la revisión profesional son procesos distintos.

La edad declarada del adulto debe ser al menos 18 años y debe confirmar responsabilidad. Esta declaración no verifica identidad ni parentesco. El prototipo incluye edades infantiles de 3 a 12 años; no solicita fecha de nacimiento, diagnóstico, escuela ni documentos de menores.

## Plataforma

Web adaptable a móvil, React y Vite. La vista infantil tiene su propio entorno sin navegación administrativa, cronómetros obligatorios, sonidos automáticos, clasificaciones ni recompensas invasivas. Las herramientas adultas usan pasos cortos para reducir formularios y desplazamiento.

## Estado de esta entrega

MVP de demostración con datos ficticios en `sessionStorage`, aislado del backend anterior. Solo se ofrecen los niveles preescolar y primaria. El catálogo inicial incluye seis cursos en cinco materias: matemáticas, lenguaje, ciencias, arte e inglés. Las materias son entidades independientes: el docente puede crear una nueva y asignarla a sus cursos.

El editor permite preguntas propias con entre uno y cinco ejercicios, dos o tres opciones, respuesta correcta, apoyo visual y pista. También conserva las plantillas de conteo, suma y lectura inicial. La materia y el nivel no se deducen de la plantilla. El catálogo tiene filtros de materia, nivel y búsqueda, y muestra tres cursos por página. Las portadas usan fotografías relacionadas con la materia; el docente puede añadir una fotografía propia mediante URL HTTPS y un video opcional. YouTube abre en una pestaña aparte; MP4 y WebM usan controles nativos sin reproducción automática. Ver el video no modifica el avance de los ejercicios.

La integración de Google Identity Services y la verificación con `google-auth-library` están implementadas; requieren un ID de cliente OAuth real para activarse. Las cuentas Google se guardan en el backend y reciben un JWT verificado al recargar. Las actividades familiares siguen siendo locales, separadas por cuenta, sin sincronización entre dispositivos. Consulta `docs/google-sign-in.md`. Se retiraron los controles públicos que permitían simular la aprobación profesional; un perfil enviado queda pendiente. Los flujos económicos se identifican como «Sin cobro». Las invitaciones se guardan en PostgreSQL en FamilyInvitation y pueden validarse desde otra cuenta o navegador. Son revocables. Al registrar al alumno, el tutor puede introducir la clave para validar e inscribirlo directamente. Consulta docs/invitations.md. No hay revisión profesional real ni cobros en este recorrido. No usar datos reales de menores.

## Modelo comercial

- Un plan docente de ejemplo: $199 MXN/mes a NeuroTalento. Sin renovación real en demo.
- Una inscripción por curso al docente: $99 MXN preescolar y $129 MXN primaria en los ejemplos.
- No se aplica la comisión del modelo anterior en el nuevo recorrido de demostración.

## Restricciones de producto

No agregar secundaria, preparatoria ni condiciones adicionales al MVP. Las materias pueden ampliarse por el docente dentro de preescolar y primaria. No otorgar insignias de especialista por iniciar sesión. No presentar datos locales como protección de producción o pagos simulados como transferencias reales. Las notas de apoyo y los avances no se muestran en páginas públicas. La edición de un curso no debe alterar la actividad ya entregada a alumnos inscritos.

La paleta usa crema, amarillo suave, naranja y rojo cálido. La interfaz muestra textos cortos y acciones concretas, sin etiquetas de demo ni ilustraciones decorativas en las portadas. El pie explica el almacenamiento local y las integraciones pendientes. Una sola hoja de estilos del producto controla las pantallas adultas y el entorno infantil.

## Validación

En desarrollo (`npm run dev`), publicar cursos y generar invitaciones no requiere activar el plan docente ni esperar la revisión profesional. La excepción no cambia la suscripción ni aprueba el perfil, no genera recibos y no se aplica a la compilación de producción. Se mantienen la propiedad del curso y su publicación como requisitos para generar claves. No se añaden etiquetas de prueba a la interfaz.

El objetivo de la demostración es completar el recorrido docente → curso → invitación → registro obligatorio del tutor → inscripción → actividad infantil → avance. La guía está en `docs/mvp-demo.md`. El despliegue de un servicio real requiere los puntos descritos allí; esta entrega no migra ni elimina la base anterior.
