import { imagenAJpeg } from "./pdf";
import type { Pagina } from "./plantilla";

export type Capas = { html: string; fondoJpg: Uint8Array };

// Tamaños de fondo que, con la misma proporción que la página, equivalen a
// estirar la imagen a página completa.
const TAMANOS_ESTIRADOS = new Set(["100% 100%", "cover", "contain"]);

// Busca la imagen de fondo de la plantilla (fondo CSS de html/body a página
// completa, o un <img> que la cubra) para ponerla directo en el PDF. Devuelve
// el HTML sin ese fondo (capa de texto) y el fondo en JPEG, o null si la
// plantilla no tiene un fondo así (entonces se captura la página entera).
export async function separarFondo(html: string, pagina: Pagina): Promise<Capas | null> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${pagina.anchoPx}px`,
    height: `${pagina.altoPx}px`,
    border: "0",
  });
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
    });
    const doc = iframe.contentDocument;
    if (!doc?.body) return null;
    const vista = doc.defaultView!;
    const area = pagina.anchoPx * pagina.altoPx;
    const cubre = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.left <= 1 && r.top <= 1 && r.width * r.height >= area * 0.95;
    };

    let fuente: string | null = null;
    let quitar = () => {};
    for (const el of [doc.body, doc.documentElement]) {
      const estilo = vista.getComputedStyle(el);
      const url = estilo.backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1];
      if (url && cubre(el) && TAMANOS_ESTIRADOS.has(estilo.backgroundSize)) {
        fuente = url;
        quitar = () => el.style.setProperty("background-image", "none", "important");
        break;
      }
    }
    if (!fuente) {
      const img = Array.from(doc.images).find(cubre);
      if (img) {
        fuente = img.currentSrc || img.src;
        quitar = () => img.style.setProperty("visibility", "hidden", "important");
      }
    }
    if (!fuente) return null;

    const imagen = await (await fetch(fuente)).blob();
    // Se decodifica una sola vez: sirve para medirla y para pasarla a JPEG.
    const bitmap = await createImageBitmap(imagen);
    const proporcion = bitmap.width / bitmap.height / (pagina.anchoPx / pagina.altoPx);
    // Con otra proporción, estirarla deformaría el diseño.
    if (Math.abs(proporcion - 1) > 0.02) {
      bitmap.close();
      return null;
    }

    quitar();
    for (const el of [doc.documentElement, doc.body]) {
      el.style.setProperty("background-color", "transparent", "important");
    }
    return {
      html: `<!doctype html>\n${doc.documentElement.outerHTML}`,
      fondoJpg: await imagenAJpeg(bitmap, pagina),
    };
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    iframe.remove();
  }
}
