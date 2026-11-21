# Acceso con Google

La pantalla también ofrece **Iniciar sesión** y **Crear cuenta** con correo y contraseña, utilizando los endpoints existentes `/auth/login` y `/auth/register`. Las contraseñas se almacenan con bcrypt y el registro de tutores requiere los datos del adulto en el servidor. Las cuentas antiguas que no tengan esos datos deben completarlos antes de acceder al espacio familiar; `/auth/guardian` los guarda bajo la cuenta autenticada.

Se utiliza Google Identity Services en el navegador y `google-auth-library` para verificar el ID token en el servidor. No se necesita un secreto de cliente en este flujo. No se solicitan permisos de Gmail, Drive u otras APIs.

## Configuración

1. En Google Cloud / Google Auth Platform configura la marca y el público del proyecto. Crea un cliente OAuth de tipo **Aplicación web**. Si está en modo de pruebas, agrega las cuentas de prueba permitidas.
2. Registra los orígenes JavaScript del frontend, por ejemplo `http://127.0.0.1:5173` y `http://localhost:5173`. Para producción registra el origen HTTPS exacto. Este flujo usa ventana emergente y callback JavaScript, sin URL de redirección de la aplicación.
3. Coloca el mismo ID público que termina en `.apps.googleusercontent.com` en `GOOGLE_CLIENT_ID` de `backend/.env` y `VITE_GOOGLE_CLIENT_ID` de `frontend/.env.local`.
4. `FRONTEND_URL` del backend debe coincidir con el origen desde el cual abres el navegador. El servidor rechaza otros orígenes en los endpoints de Google.
5. Aplica la migración aditiva con `npm run db:deploy --prefix backend`, genera Prisma con `npm run db:generate --prefix backend` y reinicia ambos servidores. En Windows, detén primero el backend si su DLL de Prisma impide generar el cliente.

## Flujo y alcance

- El botón de Google aparece desde el inicio para ambos roles. Tras elegir su cuenta, los tutores completan su edad, relación y confirmación de responsabilidad antes de crear la sesión de NeuroTalento. Las credenciales pendientes solo permanecen en memoria hasta completar ese paso. El servidor también exige un adulto de 18 años o más. Es una declaración; Google no verifica edad ni parentesco.
- El servidor emite un desafío de cinco minutos; verifica el ID token mediante la librería oficial, su audiencia y el nonce del desafío. La librería valida firma, emisor y caducidad.
- Se identifica a cada cuenta por el `sub` de Google, no por un correo enviado por el navegador. Una coincidencia de correo con una cuenta de contraseña no la vincula automáticamente.
- El rol se fija al crear la cuenta. Acceder como docente no acredita experiencia profesional ni permite cambiar de rol a una cuenta existente.
- El JWT de la aplicación se verifica de nuevo mediante `/auth/me` al recargar. Con Google configurado se deshabilita la entrada local sin credenciales.
- Los datos de actividades del recorrido familiar aún usan `sessionStorage`, separados por el ID de cuenta. No están sincronizados entre dispositivos. La conexión a Google no migra este recorrido al backend de cursos anterior.
- La salida cierra la sesión de NeuroTalento, no la sesión global de Google.

Sin un ID de cliente real y la configuración del proyecto de Google no se puede probar una cuenta real. Las pruebas automatizadas utilizan un verificador inyectado y cubren tokens rechazados, nonce incorrecto, desafíos caducados, tutores menores y conflictos de cuentas.

La revisión de dependencias detectó avisos altos existentes en la cadena de Prisma 6 (`@prisma/config`, `effect`, `deepmerge-ts`). La corrección que propone npm cambia a Prisma 7 y requiere una migración aparte; no se aplicó una actualización mayor automática como parte del acceso con Google.

Documentación oficial: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid y https://developers.google.com/identity/gsi/web/guides/verify-google-id-token.
