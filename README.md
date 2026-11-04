# Certificados

- **Página pública (`/`)**: la persona escribe su clave de búsqueda (hoy, su nombre completo) y descarga su certificado **ya generado**. Si no existe, recibe un mensaje genérico. Esta página nunca genera PDFs.
- **Panel (`/admin`, con login)**: el encargado sube la plantilla HTML, agrega personas a mano o desde Excel/CSV y pulsa *Generar y publicar*. Cada PDF se crea en su navegador, se sube a InsForge y desde ese momento se puede descargar. En el listado puede buscar, descargar o eliminar cada certificado.

Backend: [InsForge](https://insforge.dev) (Auth, Postgres y Storage). La API key solo se usa en el servidor; el navegador nunca consulta la tabla ni el bucket.

## Puesta en marcha

1. **Enlazar el proyecto de InsForge**: `npx -y @insforge/cli link --project-id <id>`.
2. **Aplicar el esquema**: `npx -y @insforge/cli db migrations up --all` (crea la tabla `certificados`, ver `migrations/`).
3. **Crear un bucket privado**: `npx -y @insforge/cli storage create-bucket certificados --private`.
4. **Crear el usuario administrador** en Authentication (correo y contraseña). Si es posible, desactivar el registro público.
5. **Variables de entorno**: copiar `.env.example` como `.env.local` y completarlo. Todo usuario creado en InsForge (Authentication) puede entrar al panel; el registro público está desactivado en `insforge.toml`.
6. **Arrancar** (PowerShell):

   ```powershell
   npm install
   npm run dev
   ```

   Portal en http://localhost:3000 y panel en http://localhost:3000/admin.

## Clave de búsqueda

En el paso *Publicar* se elige qué marcador de la plantilla usa la persona para encontrar su certificado. Se compara sin tildes, mayúsculas, espacios ni signos: "José Pérez" es igual a "jose perez", y "1.234.567" es igual a "1234567". Si se vuelve a publicar una clave que ya existe, el PDF se reemplaza.

El texto del campo en la página pública se configura con `NEXT_PUBLIC_ETIQUETA_BUSQUEDA`.
