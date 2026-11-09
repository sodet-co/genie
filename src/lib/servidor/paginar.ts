// Trae todas las filas de una consulta por páginas: la API de la base devuelve
// como máximo un número de filas por consulta, y una sola consulta grande
// quedaría cortada sin avisar. `pagina(desde, hasta)` arma la consulta de ese
// rango (con un orden estable, para no repetir ni saltar filas).
const TAMANO_PAGINA = 500;
const MAXIMO_FILAS = 20_000;

export async function todasLasFilas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; desde < MAXIMO_FILAS; desde += TAMANO_PAGINA) {
    const { data, error } = await pagina(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    const lote = data ?? [];
    filas.push(...lote);
    if (lote.length < TAMANO_PAGINA) return filas;
  }
  return filas;
}
