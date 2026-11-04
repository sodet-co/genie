import { domToJpeg, domToPng } from "modern-screenshot";
import { PDFDocument } from "pdf-lib";
import type { Pagina } from "./plantilla";

// 2.5 × 96 = 240 ppp: suficiente para imprimir sin que el archivo pese demasiado.
const ESCALA = 2.5;
const CALIDAD_JPEG = 0.92;

// Renderiza HTML en un iframe oculto y lo convierte en imágenes JPEG.
// El iframe aísla los estilos de la plantilla de los de la app, y el sandbox
// (sin allow-scripts) impide que la plantilla ejecute JavaScript.
export class Renderizador {
  private iframe: HTMLIFrameElement;

  constructor(private pagina: Pagina) {
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("sandbox", "allow-same-origin");
    this.iframe.setAttribute("aria-hidden", "true");
    this.iframe.tabIndex = -1;
    Object.assign(this.iframe.style, {
      position: "fixed",
      left: "-100000px",
      top: "0",
      width: `${pagina.anchoPx}px`,
      height: `${pagina.altoPx}px`,
      border: "0",
    });
    document.body.appendChild(this.iframe);
  }

  // Con `transparente` devuelve un PNG con fondo transparente (solo la capa de
  // texto); si no, un JPEG de la página completa.
  async renderizar(html: string, transparente = false): Promise<Uint8Array> {
    await new Promise<void>((resolve) => {
      this.iframe.onload = () => resolve();
      this.iframe.srcdoc = html;
    });
    const doc = this.iframe.contentDocument;
    if (!doc) throw new Error("No se pudo preparar la plantilla.");

    await doc.fonts.ready;
    await Promise.all(
      Array.from(doc.images).map((img) => img.decode().catch(() => undefined)),
    );

    const medidas = {
      width: this.pagina.anchoPx,
      height: this.pagina.altoPx,
      scale: ESCALA,
    };
    const dataUrl = transparente
      ? await domToPng(doc.documentElement, medidas)
      : await domToJpeg(doc.documentElement, {
          ...medidas,
          quality: CALIDAD_JPEG,
          backgroundColor: "#ffffff",
        });
    return dataUrlABytes(dataUrl);
  }

  destruir() {
    this.iframe.remove();
  }
}

function dataUrlABytes(dataUrl: string) {
  const binario = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// Une una o varias imágenes (una por página) en un PDF.
export async function crearPdf(imagenes: Uint8Array[], pagina: Pagina) {
  const pdf = await PDFDocument.create();
  for (const bytes of imagenes) {
    const imagen = await pdf.embedJpg(bytes);
    const hoja = pdf.addPage([pagina.anchoPt, pagina.altoPt]);
    hoja.drawImage(imagen, {
      x: 0,
      y: 0,
      width: pagina.anchoPt,
      height: pagina.altoPt,
    });
  }
  return pdf.save();
}

// Fondo (JPEG) y encima la capa de texto (PNG transparente), a página completa.
// El fondo no pasa por la captura del HTML: así sale siempre, en cualquier
// navegador.
export async function crearPdfConFondo(
  fondoJpg: Uint8Array,
  capaPng: Uint8Array,
  pagina: Pagina,
) {
  const pdf = await PDFDocument.create();
  const hoja = pdf.addPage([pagina.anchoPt, pagina.altoPt]);
  const caja = { x: 0, y: 0, width: pagina.anchoPt, height: pagina.altoPt };
  hoja.drawImage(await pdf.embedJpg(fondoJpg), caja);
  hoja.drawImage(await pdf.embedPng(capaPng), caja);
  return pdf.save();
}

// Reduce una imagen (p. ej. el PNG de 4538 px del diseño) a la resolución de
// impresión de la página y la devuelve como JPEG.
export async function imagenAJpeg(datos: Blob | ImageBitmap, pagina: Pagina) {
  const bitmap = datos instanceof Blob ? await createImageBitmap(datos) : datos;
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(pagina.anchoPx * ESCALA);
  lienzo.height = Math.round(pagina.altoPx * ESCALA);
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el fondo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    lienzo.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No se pudo preparar el fondo.")),
      "image/jpeg",
      CALIDAD_JPEG,
    ),
  );
  return new Uint8Array(await jpeg.arrayBuffer());
}

export function descargar(
  datos: Uint8Array | Blob,
  nombre: string,
  tipo: string,
) {
  const blob =
    datos instanceof Blob
      ? datos
      : new Blob([datos as Uint8Array<ArrayBuffer>], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
