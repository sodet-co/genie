# Buscador maestro: pasos para activarlo

Correr en **PowerShell**, desde `C:\genie`, en este orden. El orden importa:
si se sube el código (paso 4) sin la columna (paso 1), el listado del panel
falla con "No se pudo leer la base de datos".

1. **Crear la columna** (no borra ni cambia datos):

   ```powershell
   npx -y @insforge/cli db migrations up --all
   ```

   (o pegar `1-crear-columna-busqueda.sql` en el editor SQL de InsForge)

2. **Rellenar los certificados ya publicados**: primero revisa, luego aplica.

   ```powershell
   node scripts/2-rellenar-busqueda.mjs
   node scripts/2-rellenar-busqueda.mjs --aplicar
   ```

3. **Verificar** (`sin_texto` debe dar 0):

   ```powershell
   npx -y @insforge/cli db query "select count(*) as total, count(*) filter (where busqueda = '') as sin_texto from certificados"
   ```

4. **Subir el código** a producción:

   ```powershell
   git add migrations/20261111032240_texto-busqueda.sql src/lib/busqueda.ts src/lib/servidor/filtros.ts "src/app/api/[org]/admin/certificados/route.ts" src/componentes/admin/buscador-certificados.tsx scripts
   git commit -m "Panel: buscador maestro por nombre, título y correos"
   git push origin main
   ```

Los certificados que se publiquen después ya guardan su texto de búsqueda
solos; el paso 2 solo hace falta una vez, para los que ya estaban.
