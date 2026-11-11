import { buscarOrganizacion } from "@/lib/organizaciones";
import { clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/insforge";
import { todasLasFilas } from "@/lib/servidor/paginar";
import { puedeRegenerar } from "@/lib/servidor/permisos";

// Certificados que se pueden regenerar: los hechos con una plantilla del
// evento. Se leen por páginas para traerlos todos.
export async function GET(
  _: Request,
  ctx: RouteContext<"/api/[org]/admin/certificados/regenerables">,
) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return Response.json({ error: "No encontrado" }, { status: 404 });
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeRegenerar(usuario.email)) {
    return Response.json({ error: "Tu cuenta no puede regenerar certificados." }, { status: 403 });
  }
  try {
    const certificados = await todasLasFilas((desde, hasta) =>
      clienteAdmin()
        .database.from(TABLA)
        .select("id, clave_original, nombre, tipo, plantilla, datos, correos")
        .eq("organizacion", org.slug)
        .not("plantilla", "is", null)
        .order("nombre")
        .order("id")
        .range(desde, hasta),
    );
    return Response.json({ certificados });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo leer la base de datos." }, { status: 500 });
  }
}
