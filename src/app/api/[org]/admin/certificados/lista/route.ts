import { buscarOrganizacion } from "@/lib/organizaciones";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
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
  const slug = (await ctx.params).org;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento: "admin.lista_zip", organizacion: org?.slug ?? slug });
  if (!org) return b.json(404, { error: "No encontrado" });
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return b.json(401, { error: "No autorizado" }, { resultado: "rechazado" });
  b.quien(usuario.email, "panel");
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
    return b.json(
      200,
      { certificados },
      { mensaje: `Lista para ZIP: ${certificados.length} certificados`, detalle: { filtros, cantidad: certificados.length } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error(e);
    return b.json(500, { error: "No se pudo leer la base de datos." }, { detalle: { filtros, error: describirError(e) } });
  }
}
