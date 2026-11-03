-- Tipo de certificado. Sigue siendo uno por persona (clave única): el tipo
-- solo indica qué plantilla se usó.
alter table certificados
  add column if not exists tipo text not null default 'asistente'
  check (tipo in ('asistente', 'ponente', 'conferencista', 'coordinador_mesa'));

alter table certificados alter column tipo drop default;

create index if not exists certificados_tipo_idx on certificados (tipo);
