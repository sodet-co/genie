import { normalizarBusqueda } from "./busqueda";
import { separarFondo, type Capas } from "./capas";
import { crearPdf, crearPdfConFondo, descargar, Renderizador } from "./pdf";
import type { TipoCertificado } from "./tipos";
import {
  nombreSeguro,
  rellenar,
  type Pagina,
  type Registro,
} from "./plantilla";

type Opciones = {
  html: string;
  pagina: Pagina;
  // Marcador cuyo valor da nombre al archivo y a la fila (ej. "nombre").
  campoNombre: string;
};

export class Cancelado extends Error {}
export class SesionVencida extends Error {}

// Separa el fondo una sola vez por plantilla (cada lote puede usar varias).
function separadorConCache(pagina: Pagina) {
  const cache = new Map<string, Promise<Capas | null>>();
  return (html: string) => {
    let capas = cache.get(html);
    if (!capas) {
      capas = separarFondo(html, pagina);
      cache.set(html, capas);
    }
    return capas;
  };
}

// Con fondo detectado: fondo directo en el PDF + capa transparente de texto
// (el fondo sale siempre, en cualquier navegador). Sin él: página completa.
async function generarPdf(
  renderizador: Renderizador,
  html: string,
  capas: Capas | null,
  registro: Registro,
  pagina: Pagina,
) {
  if (capas) {
    const texto = await renderizador.renderizar(
      rellenar(capas.html, registro),
      true,
    );
    return crearPdfConFondo(capas.fondoJpg, texto, pagina);
  }
  return crearPdf(
    [await renderizador.renderizar(rellenar(html, registro))],
    pagina,
  );
}

// Descarga local de un solo PDF, para revisarlo antes de publicar.
export async function generarIndividual(
  registro: Registro,
  opciones: Opciones,
) {
  const renderizador = new Renderizador(opciones.pagina);
  try {
    const capas = await separarFondo(opciones.html, opciones.pagina);
    const pdf = await generarPdf(
      renderizador,
      opciones.html,
      capas,
      registro,
      opciones.pagina,
    );
    const nombre = registro[opciones.campoNombre]?.trim();
    descargar(
      pdf,
      `${nombre ? nombreSeguro(nombre) : "certificado"}.pdf`,
      "application/pdf",
    );
  } finally {
    renderizador.destruir();
  }
}

export type ProblemaRegistro = { fila: number; motivo: string };

// Antes de publicar: toda fila necesita clave y no puede haber dos con la
// misma clave y el mismo título (la segunda reemplazaría a la primera).
export function revisarClaves(registros: Registro[], campoClave: string) {
  const problemas: ProblemaRegistro[] = [];
  const vistas = new Map<string, number>();
  registros.forEach((registro, i) => {
    const clave = normalizarBusqueda(registro[campoClave] ?? "");
    if (!clave) {
      problemas.push({ fila: i + 1, motivo: `"${campoClave}" está vacío` });
      return;
    }
    const identidad = `${clave}|${normalizarBusqueda(registro.titulo ?? "")}`;
    const anterior = vistas.get(identidad);
    if (anterior !== undefined) {
      problemas.push({
        fila: i + 1,
        motivo: `"${registro[campoClave]}" se repite (igual que la fila ${anterior})`,
      });
    } else {
      vistas.set(identidad, i + 1);
    }
  });
  return problemas;
}

export type ResultadoPublicacion = {
  nuevos: number;
  reemplazados: number;
  fallidos: ProblemaRegistro[];
};

export type ItemPublicacion = {
  // Número de fila que se muestra en los mensajes.
  fila: number;
  registro: Registro;
  // Plantilla ya preparada (cada fila puede usar una distinta).
  html: string;
  tipo: TipoCertificado;
  // Id de la plantilla del evento (permite regenerar después); sin él, el
  // certificado queda como de "otro evento".
  plantilla?: string;
  // Al regenerar se usan la clave y el nombre guardados, no los del registro.
  clave?: string;
  nombre?: string;
  // Correos con los que la persona lo descarga en el portal.
  correos?: string[];
};

// Genera cada PDF en el navegador y lo sube al servidor, que lo guarda y lo
// deja disponible en el portal público.
export async function publicarLote(
  items: ItemPublicacion[],
  opciones: {
    organizacion: string;
    pagina: Pagina;
    campoClave: string;
    campoNombre: string;
    onProgreso: (hechos: number) => void;
    estaCancelado: () => boolean;
  },
): Promise<ResultadoPublicacion> {
  const resultado: ResultadoPublicacion = {
    nuevos: 0,
    reemplazados: 0,
    fallidos: [],
  };
  const renderizador = new Renderizador(opciones.pagina);
  const capasDe = separadorConCache(opciones.pagina);
  try {
    for (let i = 0; i < items.length; i++) {
      if (opciones.estaCancelado()) throw new Cancelado();
      const { registro, html, tipo, fila, plantilla, clave, nombre, correos } = items[i];
      try {
        const pdf = await generarPdf(
          renderizador,
          html,
          await capasDe(html),
          registro,
          opciones.pagina,
        );
        const formulario = new FormData();
        formulario.set(
          "archivo",
          new Blob([pdf as Uint8Array<ArrayBuffer>], {
            type: "application/pdf",
          }),
          "certificado.pdf",
        );
        formulario.set("clave", clave ?? registro[opciones.campoClave] ?? "");
        formulario.set(
          "nombre",
          nombre ?? registro[opciones.campoNombre] ?? "",
        );
        formulario.set("tipo", tipo);
        if (plantilla) formulario.set("plantilla", plantilla);
        if (correos?.length) formulario.set("correos", correos.join(";"));
        formulario.set("datos", JSON.stringify(registro));

        const respuesta = await fetch(`/api/${opciones.organizacion}/admin/certificados`, {
          method: "POST",
          body: formulario,
        });
        if (respuesta.status === 401) throw new SesionVencida();
        const cuerpo = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          resultado.fallidos.push({
            fila,
            motivo: cuerpo?.error ?? `error ${respuesta.status}`,
          });
        } else if (cuerpo?.reemplazado) {
          resultado.reemplazados++;
        } else {
          resultado.nuevos++;
        }
      } catch (error) {
        if (error instanceof SesionVencida) throw error;
        console.error(error);
        resultado.fallidos.push({
          fila,
          motivo: "no se pudo generar o subir el PDF",
        });
      }
      opciones.onProgreso(i + 1);
    }
    return resultado;
  } finally {
    renderizador.destruir();
  }
}
