// Reporta a la bitácora algo que pasó en el navegador (el ZIP, un error de
// red, el mensaje que se mostró). No espera respuesta y nunca falla.
export function reportar(
  organizacion: string,
  evento: {
    evento: "portal.zip" | "portal.error_cliente" | "admin.zip" | "admin.error_cliente";
    resultado: "ok" | "no_encontrado" | "rechazado" | "limite" | "error";
    mensaje: string;
    actor?: string | null;
    detalle?: Record<string, unknown>;
  },
) {
  try {
    void fetch(`/api/${organizacion}/bitacora`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evento),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Sin red: no hay nada que hacer.
  }
}

export function textoError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
