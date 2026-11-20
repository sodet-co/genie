import { normalizarBusqueda } from "./busqueda";

export const TIPOS = [
  { id: "asistente", etiqueta: "Asistente" },
  { id: "ponente", etiqueta: "Ponente" },
  { id: "conferencista", etiqueta: "Conferencista" },
  { id: "coordinador_mesa", etiqueta: "Coordinador de mesa" },
  { id: "panelista", etiqueta: "Panelista" },
  { id: "moderador_panel", etiqueta: "Moderador de panel" },
  { id: "moderadora_panel", etiqueta: "Moderadora de panel" },
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
  if (n.includes("panelista")) return "panelista";
  if (n.includes("moderadora")) return "moderadora_panel";
  if (n.includes("moderador")) return "moderador_panel";
  return "";
}
