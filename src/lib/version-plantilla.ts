// Versión de una plantilla: huella (SHA-256 abreviado) de su HTML y su fondo,
// tal como los sirve /api/<org>/plantillas/<id>/<archivo>. Cambia si cambia
// cualquiera de los dos, y es la misma en el navegador (al generar) y en el
// servidor (al mostrar qué certificados quedaron con una versión anterior).
export async function versionPlantilla(html: BufferSource, fondo: BufferSource) {
  const huella = async (datos: BufferSource) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
  const [a, b] = await Promise.all([huella(html), huella(fondo)]);
  const juntas = new Uint8Array(a.length + b.length);
  juntas.set(a);
  juntas.set(b, a.length);
  const final = await huella(juntas);
  return Array.from(final.slice(0, 6), (x) => x.toString(16).padStart(2, "0")).join("");
}

export const FORMATO_VERSION = /^[0-9a-f]{12}$/;
