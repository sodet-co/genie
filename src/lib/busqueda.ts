// Clave con la que se identifica a una persona: su nombre normalizado. Se
// guarda y se busca normalizada para que "José Pérez", "jose perez" y
// "JOSE  PEREZ" coincidan, y "1.234.567" sea igual a "1234567".
export function normalizarBusqueda(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export const LARGO_MAXIMO_CLAVE = 200;
export const LARGO_MAXIMO_CORREO = 254;
export const MAXIMO_CORREOS = 10;

// Formato básico: algo@dominio.tld, sin espacios. Solo ASCII: una ñ o una
// tilde en el correo casi siempre es un error de digitación.
const CORREO = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export function normalizarCorreo(texto: string) {
  return texto.trim().toLowerCase();
}

export function esCorreo(texto: string) {
  return texto.length <= LARGO_MAXIMO_CORREO && CORREO.test(texto);
}

// "a@x.co; B@y.co , a@x.co" → válidos ["a@x.co", "b@y.co"] (sin repetir) e
// inválidos tal como venían. Acepta ; , o espacios como separador.
export function separarCorreos(texto: string) {
  const validos: string[] = [];
  const invalidos: string[] = [];
  for (const parte of texto.split(/[;,\s]+/)) {
    const correo = normalizarCorreo(parte);
    if (!correo) continue;
    if (!esCorreo(correo)) invalidos.push(parte.trim());
    else if (!validos.includes(correo)) validos.push(correo);
  }
  return { validos, invalidos };
}

// Qué certificado de la persona es: su tipo y su título. Una misma persona
// puede tener varios (dos ponencias, o coordinadora y ponente); volver a
// publicar la misma combinación reemplaza el anterior.
export function referenciaCertificado(tipo: string, titulo: string | undefined) {
  return `${tipo}:${normalizarBusqueda(titulo ?? "")}`;
}
