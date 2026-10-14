import { domToJpeg } from "modern-screenshot";
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

  async renderizar(html: string): Promise<Uint8Array> {
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

    const dataUrl = await domToJpeg(doc.documentElement, {
      width: this.pagina.anchoPx,
      height: this.pagina.altoPx,
      scale: ESCALA,
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

export function descargar(datos: Uint8Array | Blob, nombre: string, tipo: string) {
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
