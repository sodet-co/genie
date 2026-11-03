create table if not exists certificados (
  id uuid primary key default gen_random_uuid(),
  -- Valor de búsqueda normalizado (sin tildes, espacios ni signos, en minúscula).
  clave text not null unique,
  -- El mismo valor tal como venía en el Excel o el formulario.
  clave_original text not null,
  nombre text not null,
  -- Todos los marcadores con los que se generó el PDF.
  datos jsonb not null default '{}'::jsonb,
  -- Ruta del PDF dentro del bucket privado "certificados".
  archivo_key text not null,
  descargas int not null default 0,
  ultima_descarga timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists certificados_nombre_idx on certificados (nombre);

-- Sin políticas: nadie con la anon key ni con sesión de usuario puede leer la
-- tabla. Solo el servidor de la app, con la API key, accede a ella.
alter table certificados enable row level security;

-- Defensa extra: los roles del navegador no tienen ningún permiso sobre la tabla.
revoke all on table certificados from anon, authenticated;
