-- PASO 1 · Crea la columna del buscador maestro (no borra ni cambia datos).
-- Es lo mismo que migrations/20261111032240_texto-busqueda.sql.
-- Opción A (recomendada, desde la carpeta del proyecto):
--   npx -y @insforge/cli db migrations up --all
-- Opción B: pegar esto en el editor SQL del panel de InsForge.

alter table certificados
  add column if not exists busqueda text not null default '';
