// Límite de intentos en memoria por clave (IP). Es por instancia del servidor:
// suficiente para frenar a quien prueba nombres en bucle, no un WAF.
const ventanas = new Map<string, { inicio: number; usados: number }>();

export function permitir(clave: string, maximo: number, ventanaMs: number) {
  const ahora = Date.now();
  const actual = ventanas.get(clave);
  if (!actual || ahora - actual.inicio > ventanaMs) {
    ventanas.set(clave, { inicio: ahora, usados: 1 });
    if (ventanas.size > 10_000) limpiar(ahora, ventanaMs);
    return true;
  }
  actual.usados++;
  return actual.usados <= maximo;
}

function limpiar(ahora: number, ventanaMs: number) {
  for (const [clave, v] of ventanas) {
    if (ahora - v.inicio > ventanaMs) ventanas.delete(clave);
  }
}

export function ipDe(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconocida"
  );
}
