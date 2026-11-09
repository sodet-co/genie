import { buscarOrganizacion } from "@/lib/organizaciones";
import { aplicarFiltros, leerFiltros } from "@/lib/servidor/filtros";
import { clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/insforge";
import { todasLasFilas } from "@/lib/servidor/paginar";

// Certificados para la descarga masiva del panel, con los mismos filtros del
// listado (?q=&tipo=). Se leen por páginas para traerlos todos. El navegador
// baja cada PDF y arma el ZIP.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/[org]/admin/certificados/lista">,
) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(await usuarioAdmin(org.slug))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const filtros = leerFiltros(Object.fromEntries(new URL(request.url).searchParams));
  try {
    const certificados = await todasLasFilas((desde, hasta) =>
      aplicarFiltros(
        clienteAdmin()
          .database.from(TABLA)
          .select("id, nombre, tipo")
          .eq("organizacion", org.slug)
          .order("tipo")
          .order("nombre")
          .order("id")
          .range(desde, hasta),
        filtros,
      ),
    );
    return Response.json({ certificados }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudo leer la base de datos." }, { status: 500 });
  }
}
