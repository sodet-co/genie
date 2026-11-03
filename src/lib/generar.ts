import { normalizarBusqueda } from "./busqueda";
import { crearPdf, descargar, Renderizador } from "./pdf";
import type { TipoCertificado } from "./tipos";
import { nombreSeguro, rellenar, type Pagina, type Registro } from "./plantilla";

type Opciones = {
  html: string;
  pagina: Pagina;
  // Marcador cuyo valor da nombre al archivo y a la fila (ej. "nombre").
  campoNombre: string;
};

export class Cancelado extends Error {}
export class SesionVencida extends Error {}

// Descarga local de un solo PDF, para revisarlo antes de publicar.
export async function generarIndividual(registro: Registro, opciones: Opciones) {
  const renderizador = new Renderizador(opciones.pagina);
  try {
    const imagen = await renderizador.renderizar(rellenar(opciones.html, registro));
    const pdf = await crearPdf([imagen], opciones.pagina);
    const nombre = registro[opciones.campoNombre]?.trim();
    descargar(pdf, `${nombre ? nombreSeguro(nombre) : "certificado"}.pdf`, "application/pdf");
  } finally {
    renderizador.destruir();
  }
}

export type ProblemaRegistro = { fila: number; motivo: string };

// Antes de publicar: toda fila necesita clave y no puede haber dos con la
// misma clave (la segunda reemplazaría a la primera).
export function revisarClaves(registros: Registro[], campoClave: string) {
  const problemas: ProblemaRegistro[] = [];
  const vistas = new Map<string, number>();
  registros.forEach((registro, i) => {
    const clave = normalizarBusqueda(registro[campoClave] ?? "");
    if (!clave) {
      problemas.push({ fila: i + 1, motivo: `"${campoClave}" está vacío` });
      return;
    }
    const anterior = vistas.get(clave);
    if (anterior !== undefined) {
      problemas.push({
        fila: i + 1,
        motivo: `"${registro[campoClave]}" se repite (igual que la fila ${anterior})`,
      });
    } else {
      vistas.set(clave, i + 1);
    }
  });
  return problemas;
}

export type ResultadoPublicacion = {
  nuevos: number;
  reemplazados: number;
  // Personas que ya tenían un certificado de otro tipo (se reemplazó).
  cambiosTipo: { fila: number; tipoAnterior: string }[];
  fallidos: ProblemaRegistro[];
};

// Genera cada PDF en el navegador y lo sube al servidor, que lo guarda y lo
// deja disponible en el portal público.
export async function publicarLote(
  registros: Registro[],
  opciones: Opciones & {
    campoClave: string;
    tipo: TipoCertificado;
    onProgreso: (hechos: number) => void;
    estaCancelado: () => boolean;
  },
): Promise<ResultadoPublicacion> {
  const resultado: ResultadoPublicacion = {
    nuevos: 0,
    reemplazados: 0,
    cambiosTipo: [],
    fallidos: [],
  };
  const renderizador = new Renderizador(opciones.pagina);
  try {
    for (let i = 0; i < registros.length; i++) {
      if (opciones.estaCancelado()) throw new Cancelado();
      const registro = registros[i];
      try {
        const imagen = await renderizador.renderizar(rellenar(opciones.html, registro));
        const pdf = await crearPdf([imagen], opciones.pagina);

        const formulario = new FormData();
        formulario.set("archivo", new Blob([pdf as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), "certificado.pdf");
        formulario.set("clave", registro[opciones.campoClave] ?? "");
        formulario.set("nombre", registro[opciones.campoNombre] ?? "");
        formulario.set("tipo", opciones.tipo);
        formulario.set("datos", JSON.stringify(registro));

        const respuesta = await fetch("/api/admin/certificados", {
          method: "POST",
          body: formulario,
        });
        if (respuesta.status === 401) throw new SesionVencida();
        const cuerpo = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          resultado.fallidos.push({ fila: i + 1, motivo: cuerpo?.error ?? `error ${respuesta.status}` });
        } else if (cuerpo?.reemplazado) {
          resultado.reemplazados++;
          if (cuerpo.tipoAnterior) {
            resultado.cambiosTipo.push({ fila: i + 1, tipoAnterior: cuerpo.tipoAnterior });
          }
        } else {
          resultado.nuevos++;
        }
      } catch (error) {
        if (error instanceof SesionVencida) throw error;
        console.error(error);
        resultado.fallidos.push({ fila: i + 1, motivo: "no se pudo generar o subir el PDF" });
      }
      opciones.onProgreso(i + 1);
    }
    return resultado;
  } finally {
    renderizador.destruir();
  }
}
