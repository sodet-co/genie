import {
  esCorreo,
  LARGO_MAXIMO_CLAVE,
  normalizarBusqueda,
  normalizarCorreo,
} from "@/lib/busqueda";
import type { Organizacion } from "@/lib/organizaciones";
import { etiquetaTipo } from "@/lib/tipos";
import { clienteAdmin, TABLA } from "./insforge";

// Cómo se identifica la persona en el portal: con uno de sus correos
// registrados o, si no registró ninguno, con su nombre completo.
export type Busqueda = { por: "correo"; valor: string } | { por: "nombre"; valor: string };

const MAXIMO_RESULTADOS = 50;

export const NO_ENCONTRADO = {
  correo:
    "No encontramos certificados con ese correo. Revisa que sea el mismo que registraste en el evento.",
  nombre:
    "No encontramos certificados con ese nombre. Escríbelo completo, igual que en tu inscripción. Si registraste un correo, busca con él.",
};

// Lee { correo } o { nombre } del cuerpo de la petición. Null si no es válido.
export function leerBusqueda(cuerpo: unknown): Busqueda | null {
  if (!cuerpo || typeof cuerpo !== "object") return null;
  const { correo, nombre } = cuerpo as Record<string, unknown>;
  if (typeof correo === "string" && correo.trim()) {
    const valor = normalizarCorreo(correo);
    return esCorreo(valor) ? { por: "correo", valor } : null;
  }
  if (typeof nombre === "string" && nombre.length <= LARGO_MAXIMO_CLAVE) {
    const valor = normalizarBusqueda(nombre);
    return valor ? { por: "nombre", valor } : null;
  }
  return null;
}

export type CertificadoPortal = {
  id: string;
  nombre: string;
  tipo: string;
  datos: Record<string, string> | null;
  archivo_key: string;
  descargas: number;
};

// Certificados de la persona dentro de la organización. Por nombre solo se
// encuentran los de personas sin correo: quien registró un correo solo los
// descarga escribiéndolo.
export async function buscarCertificados(org: Organizacion, busqueda: Busqueda) {
  let consulta = clienteAdmin()
    .database.from(TABLA)
    .select("id, nombre, tipo, datos, archivo_key, descargas")
    .eq("organizacion", org.slug);
  consulta =
    busqueda.por === "correo"
      ? consulta.contains("correos", [busqueda.valor])
      : consulta.eq("clave", busqueda.valor).eq("correos", "{}");
  const { data, error } = await consulta
    .order("nombre")
    .order("tipo")
    .order("creado_en")
    .range(0, MAXIMO_RESULTADOS - 1);
  if (error) throw error;
  return (data ?? []) as CertificadoPortal[];
}

// Lo que ve la persona en la lista (sin la ruta del archivo).
export function resumenPublico(c: CertificadoPortal) {
  const titulo = typeof c.datos?.titulo === "string" ? c.datos.titulo : "";
  return { id: c.id, nombre: c.nombre, tipo: etiquetaTipo(c.tipo), titulo };
}

export function nombreArchivo(c: Pick<CertificadoPortal, "tipo" | "nombre">) {
  return `Certificado ${etiquetaTipo(c.tipo).toLowerCase()} - ${c.nombre}`;
}

// Suma una descarga a cada certificado. Un fallo aquí no impide la descarga.
export async function contarDescargas(certificados: CertificadoPortal[]) {
  const db = clienteAdmin();
  const ahora = new Date().toISOString();
  await Promise.all(
    certificados.map(async (c) => {
      const { error } = await db.database
        .from(TABLA)
        .update({ descargas: c.descargas + 1, ultima_descarga: ahora })
        .eq("id", c.id);
      if (error) console.error(error);
    }),
  );
}
