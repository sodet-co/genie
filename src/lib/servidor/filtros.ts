import { normalizarTextoBusqueda } from "@/lib/busqueda";
import { esTipo } from "@/lib/tipos";

// Lo que un listado de certificados del panel filtra: texto (buscador maestro:
// nombre, título de la ponencia o mesa, correos y clave) y tipo. Lo usan la
// página, la descarga masiva y el informe Excel, para que traigan exactamente
// lo que se ve en pantalla.
export function leerFiltros(parametros: Record<string, string | string[] | undefined>) {
  const q = String(parametros.q ?? "").trim().slice(0, 200);
  const tipo = esTipo(parametros.tipo) ? parametros.tipo : "";
  // "desactualizados": hechos con una versión anterior de su plantilla.
  const estado = parametros.estado === "desactualizados" ? ("desactualizados" as const) : ("" as const);
  return { q, tipo, estado };
}

export type Filtros = ReturnType<typeof leerFiltros>;

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
  or(filtros: string): Q;
  not(columna: string, operador: string, valor: unknown): Q;
};

// Cada palabra del texto debe aparecer en la columna `busqueda` (sin importar
// mayúsculas ni tildes): "moreno bogota" trae a quien tenga las dos. Con
// estado "desactualizados" hacen falta las versiones vigentes de las plantillas.
export function aplicarFiltros<Q extends Consulta<Q>>(
  consulta: Q,
  { q, tipo, estado = "" }: { q: string; tipo: string; estado?: Filtros["estado"] },
  versiones?: Record<string, string>,
): Q {
  const palabras = normalizarTextoBusqueda(q).split(" ").filter(Boolean).slice(0, 8);
  for (const palabra of palabras) consulta = consulta.ilike("busqueda", `%${palabra}%`);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (estado === "desactualizados" && versiones) consulta = soloDesactualizados(consulta, versiones);
  return consulta;
}

// Hechos con una plantilla del evento cuya versión ya no es la vigente (o sin
// versión registrada: los anteriores a este control).
export function soloDesactualizados<Q extends Consulta<Q>>(consulta: Q, versiones: Record<string, string>): Q {
  return consulta.not("plantilla", "is", null).or(condicionDesactualizados(versiones));
}

export function condicionDesactualizados(versiones: Record<string, string>) {
  const distintas = Object.entries(versiones).map(
    ([id, version]) => `and(plantilla.eq.${id},plantilla_version.neq.${version})`,
  );
  return ["plantilla_version.is.null", ...distintas].join(",");
}
