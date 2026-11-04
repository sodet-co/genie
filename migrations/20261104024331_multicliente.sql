-- Multicliente: cada institución (organización) tiene su ruta (/ua), sus
-- certificados y sus administradores. La apariencia y las plantillas de cada
-- una viven en el código (src/lib/organizaciones.ts), keyed por slug.

create table if not exists organizaciones (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  nombre text not null,
  -- Listo para la suscripción: hoy todas son 'manual' (alta a mano).
  plan text not null default 'manual',
  estado text not null default 'activa' check (estado in ('activa', 'suspendida')),
  creado_en timestamptz not null default now()
);

insert into organizaciones (slug, nombre)
values ('ua', 'Universidad del Atlántico')
on conflict (slug) do nothing;

-- Quién administra qué organización. Un usuario puede estar en varias.
create table if not exists miembros (
  user_id uuid not null references auth.users(id) on delete cascade,
  organizacion text not null references organizaciones(slug) on delete cascade,
  rol text not null default 'admin' check (rol in ('admin')),
  creado_en timestamptz not null default now(),
  primary key (user_id, organizacion)
);

-- Los usuarios actuales administran la UA.
insert into miembros (user_id, organizacion)
select id, 'ua' from auth.users
on conflict do nothing;

-- Certificados por organización: la clave es única dentro de cada una.
alter table certificados add column if not exists organizacion text;
update certificados set organizacion = 'ua' where organizacion is null;
alter table certificados alter column organizacion set not null;
alter table certificados
  add constraint certificados_organizacion_fkey
  foreign key (organizacion) references organizaciones(slug);
alter table certificados drop constraint if exists certificados_clave_key;
alter table certificados
  add constraint certificados_organizacion_clave_key unique (organizacion, clave);
create index if not exists certificados_organizacion_nombre_idx
  on certificados (organizacion, nombre);

-- Solicitudes de contacto desde la landing de Genie.
create table if not exists solicitudes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  correo text not null,
  institucion text,
  mensaje text,
  creado_en timestamptz not null default now()
);

-- Como certificados: solo el servidor (API key) accede.
alter table organizaciones enable row level security;
alter table miembros enable row level security;
alter table solicitudes enable row level security;
revoke all on table organizaciones, miembros, solicitudes from anon, authenticated;
