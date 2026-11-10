import { after } from "next/server";
import { clienteAdmin } from "./insforge";
import { ipDeCabeceras } from "./limite";

export type Resultado = "ok" | "no_encontrado" | "rechazado" | "limite" | "error";

export type Evento = {
  evento: string;
  resultado: Resultado;
  organizacion?: string | null;
  estadoHttp?: number;
  // Lo que vio la persona (o el error).
  mensaje?: string | null;
  // El correo del administrador o lo que escribió la persona.
  actor?: string | null;
  certificadoId?: string | null;
  origen?: string | null;
  detalle?: Record<string, unknown>;
};

const corto = (texto: unknown, maximo: number) =>
  texto == null ? null : String(texto).slice(0, maximo);

// El detalle se guarda completo salvo que sea enorme (~16 KB).
function detalleSeguro(detalle: Record<string, unknown> | undefined) {
  if (!detalle) return {};
  try {
    const json = JSON.stringify(detalle);
    return json.length > 16_000 ? { recortado: json.slice(0, 16_000) } : JSON.parse(json);
  } catch {
    return { error: "detalle no serializable" };
  }
}

// Describe un error técnico para el detalle (mensaje, código, pila corta).
export function describirError(error: unknown) {
  if (error instanceof Error) {
    return { nombre: error.name, mensaje: error.message, pila: error.stack?.split("\n").slice(0, 6).join("\n") };
  }
  if (error && typeof error === "object") return JSON.parse(JSON.stringify(error));
  return { valor: String(error) };
}

// Escribe en la bitácora después de enviar la respuesta (no la demora). Si la
// escritura falla, solo queda en el log del servidor: nunca rompe la petición.
export function registrar(
  e: Evento & { inicio?: number },
  origenPeticion?: { request?: Request; cabeceras?: Headers },
) {
  const cabeceras = origenPeticion?.request?.headers ?? origenPeticion?.cabeceras;
  const fila = {
    organizacion: corto(e.organizacion, 60),
    evento: corto(e.evento, 80),
    resultado: e.resultado,
    estado_http: e.estadoHttp ?? null,
    mensaje: corto(e.mensaje, 2000),
    actor: corto(e.actor, 300),
    certificado_id: e.certificadoId ?? null,
    origen: corto(e.origen ?? cabeceras?.get("x-origen"), 60),
    ip: cabeceras ? corto(ipDeCabeceras(cabeceras), 100) : null,
    user_agent: corto(cabeceras?.get("user-agent"), 500),
    duracion_ms: e.inicio ? Date.now() - e.inicio : null,
    detalle: detalleSeguro(e.detalle),
  };
  const escribir = async () => {
    const { error } = await clienteAdmin().database.from("bitacora").insert([fila]);
    if (error) console.error("[bitacora] no se pudo registrar", fila.evento, error);
  };
  try {
    after(escribir);
  } catch {
    // Fuera de una petición (no debería pasar): se escribe directo.
    void escribir();
  }
}

// Para una ruta: registra y responde JSON en un paso, con el mensaje que se
// devuelve a la persona como `mensaje` de la bitácora.
export function bitacoraDe(request: Request, base: Pick<Evento, "evento" | "organizacion">) {
  const inicio = Date.now();
  const contexto: { actor?: string | null; origen?: string | null } = {};
  return {
    inicio,
    // Lo que se sepa de quién hace la petición (se usa en todos los registros).
    quien(actor: string | null | undefined, origen?: string | null) {
      contexto.actor = actor ?? null;
      if (origen !== undefined) contexto.origen = origen;
    },
    registrar(e: Omit<Evento, "evento" | "organizacion"> & Partial<Pick<Evento, "evento">>) {
      registrar({ ...base, ...contexto, ...e, inicio }, { request });
    },
    json(
      estado: number,
      cuerpo: Record<string, unknown>,
      e: Omit<Evento, "evento" | "organizacion" | "estadoHttp" | "resultado"> & { resultado?: Resultado } = {},
      init?: ResponseInit,
    ) {
      const resultado: Resultado =
        e.resultado ??
        (estado < 300 ? "ok" : estado === 429 ? "limite" : estado === 404 ? "no_encontrado" : estado < 500 ? "rechazado" : "error");
      registrar(
        {
          ...base,
          ...contexto,
          ...e,
          resultado,
          estadoHttp: estado,
          mensaje: e.mensaje ?? (typeof cuerpo.error === "string" ? cuerpo.error : null),
          inicio,
        },
        { request },
      );
      return Response.json(cuerpo, { ...init, status: estado });
    },
  };
}
