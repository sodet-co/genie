import { zipSync } from "fflate";
import { crearPdf, descargar, Renderizador } from "./pdf";
import { nombreSeguro, rellenar, type Pagina, type Registro } from "./plantilla";

export type ModoSalida = "zip" | "unico";

type Opciones = {
  html: string;
  pagina: Pagina;
  // Marcador cuyo valor da nombre a cada archivo (ej. "nombre").
  campoNombre: string;
};

export class Cancelado extends Error {}

function nombreBase(registro: Registro, campoNombre: string, indice: number) {
  const valor = registro[campoNombre]?.trim();
  return valor ? nombreSeguro(valor) : `certificado-${indice + 1}`;
}

export async function generarIndividual(registro: Registro, opciones: Opciones) {
  const renderizador = new Renderizador(opciones.pagina);
  try {
    const imagen = await renderizador.renderizar(rellenar(opciones.html, registro));
    const pdf = await crearPdf([imagen], opciones.pagina);
    descargar(pdf, `${nombreBase(registro, opciones.campoNombre, 0)}.pdf`, "application/pdf");
  } finally {
    renderizador.destruir();
  }
}

export async function generarLote(
  registros: Registro[],
  modo: ModoSalida,
  opciones: Opciones & {
    onProgreso: (hechos: number) => void;
    estaCancelado: () => boolean;
  },
) {
  const renderizador = new Renderizador(opciones.pagina);
  try {
    const imagenes: Uint8Array[] = [];
    const archivos: Record<string, Uint8Array> = {};
    const usados = new Map<string, number>();

    for (let i = 0; i < registros.length; i++) {
      if (opciones.estaCancelado()) throw new Cancelado();
      const imagen = await renderizador.renderizar(
        rellenar(opciones.html, registros[i]),
      );

      if (modo === "unico") {
        imagenes.push(imagen);
      } else {
        const base = nombreBase(registros[i], opciones.campoNombre, i);
        const clave = base.toLowerCase();
        const repeticiones = (usados.get(clave) ?? 0) + 1;
        usados.set(clave, repeticiones);
        const nombre = repeticiones > 1 ? `${base}-${repeticiones}` : base;
        archivos[`${nombre}.pdf`] = await crearPdf([imagen], opciones.pagina);
      }
      opciones.onProgreso(i + 1);
    }

    if (modo === "unico") {
      const pdf = await crearPdf(imagenes, opciones.pagina);
      descargar(pdf, "certificados.pdf", "application/pdf");
    } else {
      // Los PDF ya van comprimidos por dentro: level 0 evita trabajo inútil.
      const zip = zipSync(archivos, { level: 0 });
      descargar(zip, "certificados.zip", "application/zip");
    }
  } finally {
    renderizador.destruir();
  }
}
