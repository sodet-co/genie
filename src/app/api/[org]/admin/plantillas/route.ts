import { buscarOrganizacion } from "@/lib/organizaciones";
import { usuarioAdmin } from "@/lib/servidor/insforge";
import { puedeRegenerar } from "@/lib/servidor/permisos";
import { estadoPlantillas } from "@/lib/servidor/plantillas";

// Qué plantillas tienen versión personalizada (y desde cuándo), y si la
// cuenta puede reemplazarlas.
export async function GET(_: Request, ctx: RouteContext<"/api/[org]/admin/plantillas">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return Response.json({ error: "No encontrado" }, { status: 404 });
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    return Response.json(
      { plantillas: await estadoPlantillas(org), puedeReemplazar: puedeRegenerar(usuario.email) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo leer el estado de las plantillas." }, { status: 500 });
  }
}
