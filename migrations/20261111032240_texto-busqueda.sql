-- Buscador maestro del panel: nombre, clave, título y correos de cada
-- certificado en un solo texto normalizado (minúscula, sin tildes), calculado
-- por la aplicación al publicar (textoBusqueda en src/lib/busqueda.ts). Cada
-- palabra buscada debe aparecer en él (ilike).
alter table certificados
  add column if not exists busqueda text not null default '';
