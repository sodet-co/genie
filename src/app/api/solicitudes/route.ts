import { clienteAdmin } from "@/lib/servidor/insforge";
import { ipDe, permitir } from "@/lib/servidor/limite";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

const texto = (valor: unknown, maximo: number) =>
  typeof valor === "string" ? valor.trim().slice(0, maximo) : "";

// Solicitudes de demo / contacto desde la landing. Quedan en la tabla
// `solicitudes` de InsForge.
export async function POST(request: Request) {
  if (!permitir(`solicitud:${ipDe(request)}`, 5, 60 * 60_000)) {
    return error(429, "Ya recibimos varias solicitudes desde aquí. Inténtalo más tarde.");
  }
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await request.json();
  } catch {
    return error(400, "Solicitud inválida.");
  }
  // Campo trampa: invisible para personas, los bots lo llenan.
  if (texto(cuerpo.sitio, 200)) return Response.json({ ok: true });

  const fila = {
    nombre: texto(cuerpo.nombre, 120),
    correo: texto(cuerpo.correo, 200),
    institucion: texto(cuerpo.institucion, 200) || null,
    mensaje: texto(cuerpo.mensaje, 2000) || null,
  };
  if (!fila.nombre) return error(400, "Escribe tu nombre.");
  if (!CORREO.test(fila.correo)) return error(400, "Escribe un correo válido.");

  const { error: errorGuardado } = await clienteAdmin()
    .database.from("solicitudes")
    .insert([fila]);
  if (errorGuardado) {
    console.error(errorGuardado);
    return error(500, "No pudimos enviar tu solicitud. Inténtalo de nuevo.");
  }
  return Response.json({ ok: true });
}
