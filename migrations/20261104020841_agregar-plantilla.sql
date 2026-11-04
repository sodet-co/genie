-- Plantilla del evento con la que se generó el certificado (id de
-- public/plantillas/...). Null si vino de una plantilla subida a mano: esos
-- no se pueden regenerar porque su HTML no se guarda.
alter table certificados add column if not exists plantilla text;

-- Hasta ahora todos salieron de las plantillas del evento: se infiere por tipo.
update certificados
set plantilla = case tipo
  when 'asistente' then 'asistente'
  when 'ponente' then 'ponente'
  when 'conferencista' then 'conferencista'
  when 'coordinador_mesa' then 'coordinador-de-mesa'
end
where plantilla is null;
