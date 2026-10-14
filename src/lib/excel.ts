import * as XLSX from "xlsx";
import { normalizarClave, type Registro } from "./plantilla";

export type ResultadoExcel = {
  registros: Registro[];
  columnas: string[];
  // Marcadores de la plantilla sin columna en el archivo.
  sinColumna: string[];
  // Columnas del archivo que no corresponden a ningún marcador.
  sobrantes: string[];
};

// Excel en español suele guardar los CSV en ANSI (Windows-1252), no UTF-8.
function decodificarTexto(buffer: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export async function leerExcel(
  archivo: File,
  marcadores: string[],
): Promise<ResultadoExcel> {
  const buffer = await archivo.arrayBuffer();
  const libro = /\.(csv|txt)$/i.test(archivo.name)
    ? XLSX.read(decodificarTexto(buffer).replace(/^﻿/, ""), {
        type: "string",
      })
    : XLSX.read(buffer, { type: "array" });

  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) throw new Error("El archivo no tiene hojas.");

  // raw: false devuelve el texto tal como se ve en Excel (fechas, números).
  const filas = XLSX.utils.sheet_to_json<string[]>(hoja, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (filas.length === 0) throw new Error("El archivo está vacío.");

  const columnas = filas[0].map((c) => String(c).trim());
  const indicePorClave = new Map<string, number>();
  columnas.forEach((columna, i) => {
    const clave = normalizarClave(columna);
    if (clave && !indicePorClave.has(clave)) indicePorClave.set(clave, i);
  });

  const indicePorMarcador = new Map<string, number>();
  for (const marcador of marcadores) {
    const indice = indicePorClave.get(normalizarClave(marcador));
    if (indice !== undefined) indicePorMarcador.set(marcador, indice);
  }

  const usados = new Set(indicePorMarcador.values());
  const registros = filas
    .slice(1)
    .map((fila) => {
      const registro: Registro = {};
      for (const [marcador, indice] of indicePorMarcador) {
        registro[marcador] = String(fila[indice] ?? "").trim();
      }
      return registro;
    })
    .filter((registro) => Object.values(registro).some((v) => v !== ""));

  return {
    registros,
    columnas,
    sinColumna: marcadores.filter((m) => !indicePorMarcador.has(m)),
    sobrantes: columnas.filter((c, i) => c && !usados.has(i)),
  };
}

export function descargarModelo(marcadores: string[]) {
  const hoja = XLSX.utils.aoa_to_sheet([marcadores]);
  hoja["!cols"] = marcadores.map((m) => ({ wch: Math.max(14, m.length + 2) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Registros");
  XLSX.writeFile(libro, "registros-certificados.xlsx");
}
