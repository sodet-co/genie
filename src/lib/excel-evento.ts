import * as XLSX from "xlsx";
import { normalizarBusqueda } from "./busqueda";
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
};

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
  const faltan = [
    iNombre < 0 && "Nombre",
    iTipo < 0 && "Tipo",
  ].filter(Boolean) as string[];
  if (faltan.length) return { personas: [], faltan };

  const texto = (fila: string[], i: number) => (i < 0 ? "" : String(fila[i] ?? "").trim());
  const personas: PersonaEvento[] = filas
    .slice(1)
    .map((fila) => ({
      nombre: texto(fila, iNombre).replace(/\s+/g, " "),
      tipoOriginal: texto(fila, iTipo),
      tipo: tipoDesdeTexto(texto(fila, iTipo)),
      titulo: texto(fila, iTitulo).replace(/\s+/g, " "),
    }))
    .filter((p) => p.nombre || p.tipoOriginal || p.titulo);
  return { personas, faltan };
}

export type ProblemaPersona = { fila: number; motivo: string };

// Una persona = un certificado: nombre obligatorio y sin repetir, tipo de la
// lista y título cuando la plantilla lo usa.
export function revisarPersonas(personas: PersonaEvento[], org: Organizacion) {
  const problemas: ProblemaPersona[] = [];
  const vistos = new Map<string, number>();
  personas.forEach((p, i) => {
    const fila = i + 1;
    const motivos: string[] = [];
    const clave = normalizarBusqueda(p.nombre);
    if (!clave) motivos.push("falta el nombre");
    if (!p.tipo) {
      motivos.push(p.tipoOriginal ? `el tipo "${p.tipoOriginal}" no es válido` : "falta el tipo");
    } else if (!plantillaPorTipo(org, p.tipo)) {
      motivos.push(`no hay plantilla de ${p.tipoOriginal.toLowerCase()}`);
    } else if (plantillaPorTipo(org, p.tipo)?.marcadores.includes("titulo") && !p.titulo) {
      motivos.push("falta el título");
    }
    if (clave) {
      const anterior = vistos.get(clave);
      if (anterior !== undefined) motivos.push(`el nombre se repite (igual que la fila ${anterior})`);
      else vistos.set(clave, fila);
    }
    if (motivos.length) problemas.push({ fila, motivo: motivos.join(", ") });
  });
  return problemas;
}
