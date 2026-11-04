# Genie · Certificados

Plataforma multicliente: cada institución tiene su propia ruta, con sus colores, su evento y sus administradores.

- **`/`**: landing de Genie con formulario de contacto (las solicitudes quedan en la tabla `solicitudes`).
- **`/<org>`** (p. ej. `/ua`): portal público de la institución. La persona escribe su nombre y descarga su certificado **ya generado**; si no existe, recibe un mensaje genérico. Nunca genera PDFs.
- **`/<org>/admin`** (con login): el equipo de la institución carga personas desde Excel o una por una, publica, regenera y elimina. Solo entran los usuarios asignados a esa institución en la tabla `miembros`.

Backend: [InsForge](https://insforge.dev) (Auth, Postgres y Storage). La API key solo se usa en el servidor; el navegador nunca consulta la tabla ni el bucket.

## Puesta en marcha

1. **Enlazar el proyecto de InsForge**: `npx -y @insforge/cli link --project-id <id>`.
2. **Aplicar el esquema**: `npx -y @insforge/cli db migrations up --all` (tablas `organizaciones`, `miembros`, `certificados` y `solicitudes`; ver `migrations/`).
3. **Crear un bucket privado**: `npx -y @insforge/cli storage create-bucket certificados --private`.
4. **Crear los usuarios** en Authentication (correo y contraseña) y asignarlos a su institución en `miembros` (ver abajo).
5. **Variables de entorno**: copiar `.env.example` como `.env.local` y completarlo. El registro público está desactivado en `insforge.toml`.
6. **Arrancar** (PowerShell):

   ```powershell
   npm install
   npm run dev
   ```

   Landing en http://localhost:3000, portal de la UA en http://localhost:3000/ua y su panel en http://localhost:3000/ua/admin.


## Agregar una institución

1. **Configuración** en `src/lib/organizaciones.ts`: slug (la ruta), nombre, evento y sus plantillas.
2. **Plantillas** en `public/plantillas/<slug>/<evento>/`: un `.html` y su fondo `.png` por tipo de certificado. Las cajas con `data-ajustar` reducen el texto si no cabe.
3. **Tema** (opcional) en `src/app/globals.css`, bloque `[data-org="<slug>"]`: solo tokens de color (claro y oscuro) y `--franja`.
4. **Base de datos**:

   ```sql
   insert into organizaciones (slug, nombre) values ('<slug>', '<Nombre>');
   insert into miembros (user_id, organizacion) values ('<id del usuario>', '<slug>');
   ```

   El usuario se crea antes en InsForge (Authentication); el registro público está desactivado.

La tabla `organizaciones` ya tiene `plan` y `estado` para cuando haya suscripción.

