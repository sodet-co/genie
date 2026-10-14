// Marcadores: {{nombre}}, {{ documento }}, {{fecha_evento}}.
// Letras (con tildes), números y guion bajo; los espacios internos se ignoran.
const MARCADOR = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;

export type Registro = Record<string, string>;

const COMENTARIO = /(<!--[\s\S]*?-->)/;

// Aplica `transformar` solo al HTML fuera de los comentarios <!-- -->, para que
// las instrucciones escritas en la plantilla no cuenten como marcadores.
function fueraDeComentarios(html: string, transformar: (parte: string) => string) {
  return html
    .split(COMENTARIO)
    .map((parte) => (parte.startsWith("<!--") ? parte : transformar(parte)))
    .join("");
}

export function extraerMarcadores(html: string): string[] {
  const vistos = new Set<string>();
  fueraDeComentarios(html, (parte) => {
    for (const [, nombre] of parte.matchAll(MARCADOR)) vistos.add(nombre);
    return parte;
  });
  return [...vistos];
}

export function rellenar(html: string, registro: Registro): string {
  return fueraDeComentarios(html, (parte) =>
    parte.replace(MARCADOR, (_, nombre: string) =>
      escaparHtml(registro[nombre] ?? ""),
    ),
  );
}

function escaparHtml(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// "Nombre Completo", "nombre-completo" y "nombre_completo" se consideran iguales.
export function normalizarClave(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

// ---------------------------------------------------------------------------
// Tamaños de página
// ---------------------------------------------------------------------------

export const TAMANOS = {
  carta: { etiqueta: "Carta", ancho: 612, alto: 792 },
  oficio: { etiqueta: "Oficio", ancho: 612, alto: 1008 },
  a4: { etiqueta: "A4", ancho: 595.28, alto: 841.89 },
} as const;

export type Tamano = keyof typeof TAMANOS;
export type Orientacion = "horizontal" | "vertical";

export type Pagina = {
  // En puntos PDF (1/72 de pulgada).
  anchoPt: number;
  altoPt: number;
  // En píxeles CSS (1/96 de pulgada): el tamaño para el que se diseña el HTML.
  anchoPx: number;
  altoPx: number;
};

export function medidasPagina(tamano: Tamano, orientacion: Orientacion): Pagina {
  const { ancho, alto } = TAMANOS[tamano];
  const [anchoPt, altoPt] =
    orientacion === "horizontal" ? [alto, ancho] : [ancho, alto];
  return {
    anchoPt,
    altoPt,
    anchoPx: Math.round((anchoPt * 96) / 72),
    altoPx: Math.round((altoPt * 96) / 72),
  };
}

// ---------------------------------------------------------------------------
// Recursos de la plantilla (imágenes, fuentes) subidos junto al HTML
// ---------------------------------------------------------------------------

export type Recursos = Map<string, string>; // nombre de archivo -> data URL

const ATRIBUTO = /\b(src|href)\s*=\s*(["'])(.*?)\2/gi;
const URL_CSS = /url\(\s*(["']?)(.*?)\1\s*\)/gi;

function esReferenciaLocal(valor: string) {
  return !!valor && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{\{)/i.test(valor.trim());
}

function nombreArchivo(valor: string) {
  const ruta = valor.trim().split(/[?#]/)[0];
  const ultimo = ruta.split(/[\\/]/).pop() ?? "";
  try {
    return decodeURIComponent(ultimo).toLowerCase();
  } catch {
    return ultimo.toLowerCase();
  }
}

// Reemplaza las referencias relativas (fondo.png, img/logo.png,
// url(fuentes/x.ttf)) por los archivos subidos, emparejando por nombre.
// Devuelve también las referencias que no se encontraron.
export function incrustarRecursos(html: string, recursos: Recursos) {
  const faltantes = new Set<string>();

  const resolver = (valor: string) => {
    if (!esReferenciaLocal(valor)) return null;
    const dataUrl = recursos.get(nombreArchivo(valor));
    if (!dataUrl) faltantes.add(valor.trim());
    return dataUrl ?? null;
  };

  const resultado = fueraDeComentarios(html, (parte) =>
    parte
      .replace(ATRIBUTO, (completo, atributo: string, comilla: string, valor: string) => {
        const dataUrl = resolver(valor);
        return dataUrl ? `${atributo}=${comilla}${dataUrl}${comilla}` : completo;
      })
      .replace(URL_CSS, (completo, _comilla: string, valor: string) => {
        const dataUrl = resolver(valor);
        return dataUrl ? `url("${dataUrl}")` : completo;
      }),
  );

  return { html: resultado, faltantes: [...faltantes] };
}

// Las hojas de estilo externas (ej. Google Fonts) no se pueden leer al
// convertir la página en imagen, y las fuentes no saldrían en el PDF. Se
// descargan una vez y se embeben con sus fuentes como <style> con data URLs.
const LINK = /<link\b[^>]*>/gi;

export async function incrustarCssExterno(html: string) {
  const enlaces: { etiqueta: string; href: string }[] = [];
  fueraDeComentarios(html, (parte) => {
    for (const [etiqueta] of parte.matchAll(LINK)) {
      if (!/\brel\s*=\s*["']?stylesheet/i.test(etiqueta)) continue;
      const href = etiqueta.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
      if (href && /^https?:\/\//i.test(href)) enlaces.push({ etiqueta, href });
    }
    return parte;
  });

  let resultado = html;
  const fallidos: string[] = [];
  for (const { etiqueta, href } of enlaces) {
    try {
      const css = await descargarCss(href.replaceAll("&amp;", "&"));
      resultado = resultado.replace(etiqueta, () => `<style>${css}</style>`);
    } catch (error) {
      console.error(error);
      fallidos.push(href);
    }
  }
  return { html: resultado, fallidos };
}

async function descargarCss(url: string) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`${respuesta.status} al descargar ${url}`);
  let css = await respuesta.text();

  const urls = new Set(
    [...css.matchAll(URL_CSS)].map(([, , valor]) => valor).filter((v) => !v.startsWith("data:")),
  );
  for (const relativa of urls) {
    const absoluta = new URL(relativa, url).href;
    const recurso = await fetch(absoluta);
    if (!recurso.ok) throw new Error(`${recurso.status} al descargar ${absoluta}`);
    const dataUrl = await leerComoDataUrl(await recurso.blob());
    css = css.replaceAll(relativa, dataUrl);
  }
  return css;
}

export function leerComoDataUrl(archivo: Blob) {
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });
}

// Nombre de archivo seguro para Windows/macOS a partir de un valor libre.
export function nombreSeguro(texto: string) {
  return (
    texto
      .normalize("NFC")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "certificado"
  );
}
