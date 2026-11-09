import * as XLSX from "xlsx";
import { MAXIMO_CORREOS, normalizarBusqueda, separarCorreos } from "./busqueda";
import { decodificarTexto } from "./excel";
import { normalizarClave } from "./plantilla";
import { plantillaPorTipo, type Organizacion } from "./organizaciones";
import { TIPOS, type TipoCertificado } from "./tipos";

export type PersonaEvento = {
  nombre: string;
  tipo: TipoCertificado | "";
  // Texto tal como venía en el Excel, para mostrar el error si no es válido.
  tipoOriginal: string;
  titulo: string;
  // Correos para descargar en el portal (opcional; varios separados por ;).
  correos: string[];
  correosInvalidos: string[];
};

// Columnas aceptadas para el correo (normalizadas con normalizarClave).
const COLUMNAS_CORREO = ["correo", "correos", "correo_electronico", "email", "e_mail"];

export function personaConCorreos(
  persona: Omit<PersonaEvento, "correos" | "correosInvalidos">,
  textoCorreos: string,
): PersonaEvento {
  const { validos, invalidos } = separarCorreos(textoCorreos);
  return { ...persona, correos: validos, correosInvalidos: invalidos };
}

export function tipoDesdeTexto(texto: string): TipoCertificado | "" {
  const n = normalizarBusqueda(texto);
  if (!n) return "";
  return (
    TIPOS.find((t) => normalizarBusqueda(t.etiqueta) === n || normalizarBusqueda(t.id) === n)
      ?.id ?? ""
  );
}

export async function leerExcelEvento(archivo: File) {
  const buffer = await archivo.arrayBuffer();
  const libro = /\.(csv|txt)$/i.test(archivo.name)
    ? XLSX.read(decodificarTexto(buffer).replace(/^﻿/, ""), { type: "string" })
    : XLSX.read(buffer, { type: "array" });
  // La hoja "Personas" del modelo; si no existe, la primera.
  const hoja = libro.Sheets["Personas"] ?? libro.Sheets[libro.SheetNames[0]];
  if (!hoja) throw new Error("El archivo no tiene hojas.");

  const filas = XLSX.utils.sheet_to_json<string[]>(hoja, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (filas.length === 0) throw new Error("El archivo está vacío.");

  const columnas = filas[0].map((c) => normalizarClave(String(c)));
  const indice = (nombre: string) => columnas.indexOf(nombre);
  const [iNombre, iTipo, iTitulo] = [indice("nombre"), indice("tipo"), indice("titulo")];
  const iCorreo = columnas.findIndex((c) => COLUMNAS_CORREO.includes(c));
  const faltan = [
    iNombre < 0 && "Nombre",
    iTipo < 0 && "Tipo",
  ].filter(Boolean) as string[];
  if (faltan.length) return { personas: [], faltan };

  const texto = (fila: string[], i: number) => (i < 0 ? "" : String(fila[i] ?? "").trim());
  const personas: PersonaEvento[] = filas
    .slice(1)
    .map((fila) =>
      personaConCorreos(
        {
          nombre: texto(fila, iNombre).replace(/\s+/g, " "),
          tipoOriginal: texto(fila, iTipo),
          tipo: tipoDesdeTexto(texto(fila, iTipo)),
          titulo: texto(fila, iTitulo).replace(/\s+/g, " "),
        },
        texto(fila, iCorreo),
      ),
    )
    .filter((p) => p.nombre || p.tipoOriginal || p.titulo || p.correos.length);
  return { personas, faltan };
}

export type ProblemaPersona = { fila: number; motivo: string };

// Una fila = un certificado. Una persona puede tener varios (otra ponencia u
// otro tipo), pero no dos con el mismo nombre, tipo y título. Tipo de la lista,
// título cuando la plantilla lo usa y correos con formato válido.
export function revisarPersonas(personas: PersonaEvento[], org: Organizacion) {
  const problemas: ProblemaPersona[] = [];
  const vistos = new Map<string, number>();
  personas.forEach((p, i) => {
    const fila = i + 1;
    const motivos: string[] = [];
    const clave = normalizarBusqueda(p.nombre);
    if (!clave) motivos.push("falta el nombre");
    if (p.correosInvalidos.length) {
      motivos.push(`correo inválido: ${p.correosInvalidos.join(", ")}`);
    } else if (p.correos.length > MAXIMO_CORREOS) {
      motivos.push(`más de ${MAXIMO_CORREOS} correos`);
    }
    if (!p.tipo) {
      motivos.push(p.tipoOriginal ? `el tipo "${p.tipoOriginal}" no es válido` : "falta el tipo");
    } else if (!plantillaPorTipo(org, p.tipo)) {
      motivos.push(`no hay plantilla de ${p.tipoOriginal.toLowerCase()}`);
    } else if (plantillaPorTipo(org, p.tipo)?.marcadores.includes("titulo") && !p.titulo) {
      motivos.push("falta el título");
    }
    if (clave && p.tipo) {
      const identidad = `${clave}|${p.tipo}|${normalizarBusqueda(p.titulo)}`;
      const anterior = vistos.get(identidad);
      if (anterior !== undefined) {
        motivos.push(`repetida: mismo nombre, tipo y título que la fila ${anterior}`);
      } else vistos.set(identidad, fila);
    }
    if (motivos.length) problemas.push({ fila, motivo: motivos.join(", ") });
  });
  return problemas;
}
