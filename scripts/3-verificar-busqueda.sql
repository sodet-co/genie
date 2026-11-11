-- PASO 3 · Verifica que todos los certificados tengan su texto de búsqueda.
-- Desde la carpeta del proyecto:
--   npx -y @insforge/cli db query "select count(*) as total, count(*) filter (where busqueda = '') as sin_texto from certificados"
-- O pegar esto en el editor SQL de InsForge. "sin_texto" debe dar 0.

select count(*) as total,
       count(*) filter (where busqueda = '') as sin_texto
from certificados;

-- Prueba del buscador: debe traer los 6 de la Mesa 1.
select nombre, left(busqueda, 80) as busqueda
from certificados
where busqueda ilike '%caminar solos%';
