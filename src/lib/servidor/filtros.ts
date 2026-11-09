import { esTipo } from "@/lib/tipos";

// Lo que un listado de certificados del panel filtra: texto (nombre, clave o
// un correo exacto) y tipo. Lo usan la página y la descarga masiva, para que
// el ZIP traiga exactamente lo que se ve en pantalla.
export function leerFiltros(parametros: Record<string, string | string[] | undefined>) {
  const q = String(parametros.q ?? "").trim();
  const tipo = esTipo(parametros.tipo) ? parametros.tipo : "";
  return { q, tipo };
}

type Consulta<Q> = {
  or(filtros: string): Q;
  contains(columna: string, valor: string[]): Q;
  eq(columna: string, valor: string): Q;
};

export function aplicarFiltros<Q extends Consulta<Q>>(
  consulta: Q,
  { q, tipo }: { q: string; tipo: string },
): Q {
  // Comas, paréntesis, llaves, comillas y comodines romperían el filtro `or`
  // de PostgREST.
  const termino = q.replace(/[,()*%\\{}"]/g, " ").trim();
  if (termino.includes("@")) {
    // Un correo: coincidencia exacta con uno de los registrados.
    consulta = consulta.contains("correos", [termino.toLowerCase()]);
  } else if (termino) {
    consulta = consulta.or(`nombre.ilike.*${termino}*,clave_original.ilike.*${termino}*`);
  }
  if (tipo) consulta = consulta.eq("tipo", tipo);
  return consulta;
}
