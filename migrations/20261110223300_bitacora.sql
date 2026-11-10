-- Bitácora: cada búsqueda, descarga, publicación, eliminación, ingreso y error
-- del portal y del panel, con el mensaje que se mostró, para poder depurar.
-- Contiene datos personales (lo que la persona escribió, su IP): solo la lee
-- el servidor con la API key y el panel de administración.

create table if not exists bitacora (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  organizacion text,
  -- Qué pasó: 'portal.buscar', 'portal.descargar', 'admin.publicar', …
  evento text not null,
  resultado text not null
    check (resultado in ('ok', 'no_encontrado', 'rechazado', 'limite', 'error')),
  estado_http int,
  -- El mensaje que vio la persona (o el error).
  mensaje text,
  -- Quién: el correo del administrador o lo que escribió la persona.
  actor text,
  certificado_id uuid,
  -- De dónde vino: 'pdf', 'zip', 'lista', 'formulario'…
  origen text,
  ip text,
  user_agent text,
  duracion_ms int,
  -- Todo lo demás: ids encontrados, nombre del archivo, tamaño, error técnico…
  detalle jsonb not null default '{}'::jsonb
);

create index if not exists bitacora_organizacion_creado_idx
  on bitacora (organizacion, creado_en desc);
create index if not exists bitacora_evento_idx on bitacora (evento);
create index if not exists bitacora_certificado_idx on bitacora (certificado_id);

alter table bitacora enable row level security;
revoke all on table bitacora from anon, authenticated;
