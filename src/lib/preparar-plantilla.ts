import {
  extraerMarcadores,
  incrustarCssExterno,
  incrustarRecursos,
  leerComoDataUrl,
} from "./plantilla";
import type { PlantillaEvento } from "./organizaciones";
import { versionPlantilla } from "./version-plantilla";

export type Plantilla = {
  nombreArchivo: string;
  html: string;
  marcadores: string[];
  recursos: string[];
  faltantes: string[];
  // Hojas de estilo externas (ej. Google Fonts) que no se pudieron descargar.
  externosFallidos: string[];
  // Solo en las plantillas del evento (ver version-plantilla).
  version?: string;
};

// Deja la plantilla autocontenida: imágenes, fuentes y CSS externo embebidos,
// para que se vea igual en la vista previa y en el PDF.
export async function prepararPlantilla(
  htmlOriginal: string,
  nombreArchivo: string,
  archivos: { nombre: string; datos: Blob }[],
): Promise<Plantilla> {
  const recursos = new Map<string, string>();
  for (const a of archivos) {
    recursos.set(a.nombre.toLowerCase(), await leerComoDataUrl(a.datos));
  }
  const locales = incrustarRecursos(htmlOriginal, recursos);
  const externos = await incrustarCssExterno(locales.html);
  return {
    nombreArchivo,
    html: externos.html,
    marcadores: extraerMarcadores(htmlOriginal),
    recursos: archivos.map((a) => a.nombre),
    faltantes: locales.faltantes,
    externosFallidos: externos.fallidos,
  };
}

// La plantilla vigente de la institución: la personalizada desde el panel
// (Plantillas → Cambiar) o, si no hay, la original del sitio. Sin caché, para
// que un cambio se use de inmediato al generar.
export async function cargarPlantillaEvento(
  p: PlantillaEvento,
  organizacion: string,
): Promise<Plantilla> {
  const url = (archivo: "html" | "fondo") => `/api/${organizacion}/plantillas/${p.id}/${archivo}`;
  const [bytesHtml, fondo] = await Promise.all([
    fetch(url("html"), { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`No se encontró la plantilla ${p.id} (html)`);
      return r.arrayBuffer();
    }),
    fetch(url("fondo"), { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`No se encontró la plantilla ${p.id} (fondo)`);
      return r.blob();
    }),
  ]);
  // La versión sale de los bytes tal como llegaron (igual que en el servidor).
  const version = await versionPlantilla(bytesHtml, await fondo.arrayBuffer());
  const plantilla = await prepararPlantilla(new TextDecoder().decode(bytesHtml), `${p.id}.html`, [
    { nombre: `${p.id}.png`, datos: fondo },
  ]);
  return { ...plantilla, version };
}
