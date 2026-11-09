-- Varios certificados por persona (una ponencia por certificado, o coordinador
-- y ponente a la vez) y búsqueda por correo en el portal.
--
-- Un certificado se identifica por la persona (clave = nombre normalizado),
-- su tipo y su título: `referencia` = "<tipo>:<título normalizado>", calculada
-- en el servidor. Volver a publicar la misma combinación lo reemplaza.

-- Correos registrados de la persona (minúscula, sin espacios). Con al menos
-- uno, el portal solo lo entrega a quien escriba uno de ellos; sin correos, se
-- encuentra por el nombre.
alter table certificados
  add column if not exists correos text[] not null default '{}';

alter table certificados
  add column if not exists referencia text not null default '';

alter table certificados
  drop constraint if exists certificados_organizacion_clave_key;
alter table certificados
  drop constraint if exists certificados_organizacion_clave_referencia_key;
alter table certificados
  add constraint certificados_organizacion_clave_referencia_key
  unique (organizacion, clave, referencia);

-- Búsqueda del portal: por correo (contiene) y por nombre.
create index if not exists certificados_correos_idx
  on certificados using gin (correos);
create index if not exists certificados_organizacion_clave_idx
  on certificados (organizacion, clave);
