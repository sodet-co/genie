-- Paneles del seminario: panelistas y moderadores (con su versión femenina,
-- porque la frase del certificado cambia: "Como moderadora del panel…").
alter table certificados drop constraint if exists certificados_tipo_check;

alter table certificados
  add constraint certificados_tipo_check
  check (tipo in (
    'asistente', 'ponente', 'conferencista', 'coordinador_mesa',
    'panelista', 'moderador_panel', 'moderadora_panel'
  ));
