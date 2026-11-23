-- Con qué versión de su plantilla se generó cada certificado (huella del HTML
-- y el fondo, ver src/lib/version-plantilla.ts). El panel compara con la
-- versión vigente para marcar los desactualizados. Null en los anteriores.
alter table certificados add column if not exists plantilla_version text;
