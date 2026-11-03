import { normalizarBusqueda } from "./busqueda";

export const TIPOS = [
  { id: "asistente", etiqueta: "Asistente" },
  { id: "ponente", etiqueta: "Ponente" },
  { id: "conferencista", etiqueta: "Conferencista" },
  { id: "coordinador_mesa", etiqueta: "Coordinador de mesa" },
] as const;

export type TipoCertificado = (typeof TIPOS)[number]["id"];

export function esTipo(valor: unknown): valor is TipoCertificado {
  return TIPOS.some((t) => t.id === valor);
}

export function etiquetaTipo(id: string) {
  return TIPOS.find((t) => t.id === id)?.etiqueta ?? id;
}

// "ponente.html" o "Certificado coordinador de mesa.html" → tipo sugerido.
export function adivinarTipo(nombreArchivo: string): TipoCertificado | "" {
  const n = normalizarBusqueda(nombreArchivo);
  if (n.includes("asistente")) return "asistente";
  if (n.includes("ponente") || n.includes("ponencia")) return "ponente";
  if (n.includes("conferencis") || n.includes("conferencia")) return "conferencista";
  if (n.includes("coordinador")) return "coordinador_mesa";
  return "";
}
