// Clave con la que una persona encuentra su certificado (hoy el nombre, más
// adelante puede ser el documento). Se guarda y se busca normalizada para que
// "José Pérez", "jose perez" y "JOSE  PEREZ" coincidan, y "1.234.567" sea
// igual a "1234567".
export function normalizarBusqueda(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export const LARGO_MAXIMO_CLAVE = 200;

