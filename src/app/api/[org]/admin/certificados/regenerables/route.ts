import { buscarOrganizacion } from "@/lib/organizaciones";
import { clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/supabase";
import { todasLasFilas } from "@/lib/servidor/paginar";
import { puedeRegenerar } from "@/lib/servidor/permisos";
import { condicionDesactualizados } from "@/lib/servidor/filtros";
import { versionesPlantillas } from "@/lib/servidor/plantillas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAXIMO_IDS = 2000;

type Contexto = RouteContext<"/api/[org]/admin/certificados/regenerables">;

// Solo para las cuentas que pueden regenerar (lib/servidor/permisos).
async function acceso(ctx: Contexto) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return { respuesta: Response.json({ error: "No encontrado" }, { status: 404 }) };
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return { respuesta: Response.json({ error: "No autorizado" }, { status: 401 }) };
  if (!puedeRegenerar(usuario.email)) {
    return {
      respuesta: Response.json({ error: "Tu cuenta no puede regenerar certificados." }, { status: 403 }),
    };
  }
  return { org };
}

// Certificados que se pueden regenerar (hechos con una plantilla del evento),
// leídos por páginas. Con `ids`, solo esos; con `versiones`, solo los
// hechos con una versión anterior de su plantilla.
async function leer(organizacion: string, ids?: string[], versiones?: Record<string, string>) {
  return todasLasFilas((desde, hasta) => {
    // Una sola cadena (sin reasignar la consulta): los tipos de supabase-js
    // no soportan bien las consultas armadas por partes.
    const consulta = clienteAdmin()
      .from(TABLA)
      .select("id, clave_original, nombre, tipo, plantilla, datos, correos")
      .eq("organizacion", organizacion)
      .not("plantilla", "is", null)
      .or(versiones ? condicionDesactualizados(versiones) : "plantilla.not.is.null");
    return (ids ? consulta.in("id", ids) : consulta).order("nombre").order("id").range(desde, hasta);
  });
}

// Todos, o con ?estado=desactualizados solo los que no están al día.
export async function GET(request: Request, ctx: Contexto) {
  const { org, respuesta } = await acceso(ctx);
  if (!org) return respuesta;
  try {
    const url = new URL(request.url);
    const versiones =
      url.searchParams.get("estado") === "desactualizados"
        ? await versionesPlantillas(org, url.origin)
        : undefined;
    return Response.json({ certificados: await leer(org.slug, undefined, versiones) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo leer la base de datos." }, { status: 500 });
  }
}

// Los seleccionados en el listado: { ids: [...] }.
export async function POST(request: Request, ctx: Contexto) {
  const { org, respuesta } = await acceso(ctx);
  if (!org) return respuesta;
  const cuerpo = await request.json().catch(() => null);
  const ids = Array.isArray(cuerpo?.ids)
    ? [...new Set(cuerpo.ids.filter((x: unknown): x is string => typeof x === "string" && UUID.test(x)))]
    : [];
  if (ids.length === 0 || ids.length > MAXIMO_IDS) {
    return Response.json({ error: "Selección inválida." }, { status: 400 });
  }
  try {
    // En lotes: una lista muy larga de ids no cabe en una sola consulta.
    const certificados = [];
    for (let i = 0; i < ids.length; i += 100) {
      certificados.push(...(await leer(org.slug, ids.slice(i, i + 100) as string[])));
    }
    return Response.json({ certificados });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo leer la base de datos." }, { status: 500 });
  }
}
