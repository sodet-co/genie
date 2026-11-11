// Acciones reservadas a cuentas puntuales del panel (no a todo administrador).
// Regenerar certificados con la plantilla actual: solo la responsable de la
// plataforma, para corregir plantillas sin que otros reemplacen PDF por error.
const PUEDEN_REGENERAR = new Set(["sofiafg1105@gmail.com"]);

export function puedeRegenerar(correo: string | null | undefined) {
  return Boolean(correo && PUEDEN_REGENERAR.has(correo.trim().toLowerCase()));
}
