// Nombres legibles de los eventos y resultados de la bitácora.
export const EVENTOS_BITACORA: Record<string, string> = {
  "portal.buscar": "Portal · búsqueda",
  "portal.descargar": "Portal · descarga de PDF",
  "portal.zip": "Portal · ZIP",
  "portal.error_cliente": "Portal · error en el navegador",
  "admin.ingreso": "Panel · ingreso",
  "admin.salida": "Panel · salida",
  "admin.publicar": "Panel · publicación",
  "admin.eliminar": "Panel · eliminación",
  "admin.descargar_pdf": "Panel · descarga de PDF",
  "admin.lista_zip": "Panel · lista para ZIP",
  "admin.zip": "Panel · ZIP",
  "admin.informe_excel": "Panel · informe Excel",
  "admin.error_cliente": "Panel · error en el navegador",
};

export const RESULTADOS_BITACORA: Record<string, string> = {
  ok: "Correcto",
  no_encontrado: "No encontrado",
  rechazado: "Rechazado",
  limite: "Límite de intentos",
  error: "Error",
};

export const etiquetaEvento = (e: string) => EVENTOS_BITACORA[e] ?? e;
export const etiquetaResultado = (r: string) => RESULTADOS_BITACORA[r] ?? r;
