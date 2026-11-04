import { LARGO_MAXIMO_CLAVE, normalizarBusqueda } from "@/lib/busqueda";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { BUCKET, clienteAdmin, TABLA } from "@/lib/servidor/insforge";
import { ipDe, permitir } from "@/lib/servidor/limite";
import { etiquetaTipo } from "@/lib/tipos";
import { respuestaPdf } from "@/lib/servidor/respuesta-pdf";

const NO_ENCONTRADO =
  "No encontramos un certificado con esos datos. Revisa que estén escritos igual que en tu inscripción.";

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

// Portal público: busca un certificado YA generado y lo devuelve. Nunca genera
// uno nuevo. Si no existe, responde siempre el mismo mensaje genérico.
// Solo busca dentro de la organización de la ruta (/api/ua/descargar).
export async function POST(request: Request, ctx: RouteContext<"/api/[org]/descargar">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return error(404, NO_ENCONTRADO);
  if (!permitir(`descarga:${org.slug}:${ipDe(request)}`, 20, 10 * 60_000)) {
    return error(429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
  }

  let original = "";
  try {
    const cuerpo = await request.json();
    original = typeof cuerpo?.clave === "string" ? cuerpo.clave : "";
  } catch {
    return error(400, "Solicitud inválida.");
  }
  const clave = normalizarBusqueda(original);
  if (!clave || original.length > LARGO_MAXIMO_CLAVE) return error(404, NO_ENCONTRADO);

  const db = clienteAdmin();
  const { data: fila, error: errorConsulta } = await db.database
    .from(TABLA)
    .select("id, nombre, tipo, archivo_key, descargas")
    .eq("organizacion", org.slug)
    .eq("clave", clave)
    .maybeSingle();
  if (errorConsulta) {
    console.error(errorConsulta);
    return error(500, "No pudimos consultar el certificado. Inténtalo más tarde.");
  }
  if (!fila) return error(404, NO_ENCONTRADO);

  const { data: pdf, error: errorDescarga } = await db.storage
    .from(BUCKET)
    .download(fila.archivo_key);
  if (errorDescarga || !pdf) {
    console.error(errorDescarga);
    return error(404, NO_ENCONTRADO);
  }

  const { error: errorConteo } = await db.database
    .from(TABLA)
    .update({ descargas: fila.descargas + 1, ultima_descarga: new Date().toISOString() })
    .eq("id", fila.id);
  if (errorConteo) console.error(errorConteo);

  return respuestaPdf(pdf, `Certificado ${etiquetaTipo(fila.tipo).toLowerCase()} - ${fila.nombre}`);
}
