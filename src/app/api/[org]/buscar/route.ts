import { buscarOrganizacion } from "@/lib/organizaciones";
import { ipDe, permitir } from "@/lib/servidor/limite";
import {
  buscarCertificados,
  leerBusqueda,
  NO_ENCONTRADO,
  resumenPublico,
} from "@/lib/servidor/portal";

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

// Portal público: lista los certificados ya generados de la persona (por su
// correo registrado o, si no tiene, por su nombre). Si no hay ninguno responde
// siempre un mensaje genérico.
export async function POST(request: Request, ctx: RouteContext<"/api/[org]/buscar">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return error(404, NO_ENCONTRADO.correo);
  if (!permitir(`buscar:${org.slug}:${ipDe(request)}`, 20, 10 * 60_000)) {
    return error(429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
  }

  const cuerpo = await request.json().catch(() => null);
  const busqueda = leerBusqueda(cuerpo);
  if (!busqueda) {
    return error(404, cuerpo?.correo ? "Escribe un correo válido." : NO_ENCONTRADO.nombre);
  }

  try {
    const certificados = await buscarCertificados(org, busqueda);
    if (certificados.length === 0) return error(404, NO_ENCONTRADO[busqueda.por]);
    return Response.json(
      { certificados: certificados.map(resumenPublico) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error(e);
    return error(500, "No pudimos consultar los certificados. Inténtalo más tarde.");
  }
}
