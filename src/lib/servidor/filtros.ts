import { normalizarTextoBusqueda } from "@/lib/busqueda";
import { esTipo } from "@/lib/tipos";

// Lo que un listado de certificados del panel filtra: texto (buscador maestro:
// nombre, título de la ponencia o mesa, correos y clave) y tipo. Lo usan la
// página, la descarga masiva y el informe Excel, para que traigan exactamente
// lo que se ve en pantalla.
export function leerFiltros(parametros: Record<string, string | string[] | undefined>) {
  const q = String(parametros.q ?? "").trim().slice(0, 200);
  const tipo = esTipo(parametros.tipo) ? parametros.tipo : "";
  return { q, tipo };
}

// Orden del listado (?orden=&dir=): por nombre, tipo, descargas o fecha.
export const ORDENES = {
  nombre: "nombre",
  tipo: "tipo",
  descargas: "descargas",
  generado: "actualizado_en",
} as const;
export type Orden = keyof typeof ORDENES;
export type Direccion = "asc" | "desc";

export function leerOrden(parametros: Record<string, string | string[] | undefined>) {
  const orden: Orden =
    typeof parametros.orden === "string" && Object.hasOwn(ORDENES, parametros.orden)
      ? (parametros.orden as Orden)
      : "nombre";
  const dir: Direccion = parametros.dir === "desc" ? "desc" : "asc";
  return { orden, dir };
}

type Consulta<Q> = {
  ilike(columna: string, patron: string): Q;
  eq(columna: string, valor: string): Q;
};

// Cada palabra del texto debe aparecer en la columna `busqueda` (sin importar
// mayúsculas ni tildes): "moreno bogota" trae a quien tenga las dos.
export function aplicarFiltros<Q extends Consulta<Q>>(
  consulta: Q,
  { q, tipo }: { q: string; tipo: string },
): Q {
  const palabras = normalizarTextoBusqueda(q).split(" ").filter(Boolean).slice(0, 8);
  for (const palabra of palabras) consulta = consulta.ilike("busqueda", `%${palabra}%`);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  return consulta;
}
