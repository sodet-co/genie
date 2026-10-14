# Generador de Certificados

Especificación completa del proyecto en [CLAUDE.md](CLAUDE.md).

## Puesta en marcha

1. **Crear el proyecto en Supabase** y ejecutar `supabase/migrations/0001_esquema.sql` completo en el SQL Editor.
2. **Desactivar el registro público**: Authentication > Sign In / Providers > desactivar "Allow new users to sign up".
3. **Crear el usuario administrador**: Authentication > Users > Add user (correo y contraseña, con "Auto Confirm User"). Luego darle el rol en el SQL Editor:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"rol":"admin"}'::jsonb
   where email = 'admin@universidad.edu.co';
   ```

   Sin ese rol la cuenta no puede entrar al panel ni leer ninguna tabla.
4. **Variables de entorno**: copiar `.env.example` como `.env.local` y completar los valores.
5. **Arrancar** (PowerShell):

   ```powershell
   npm install
   npm run dev
   ```

   Panel en http://localhost:3000/admin
