import { respuestaPdf } from "@/lib/servidor/respuesta-pdf";
import { etiquetaTipo } from "@/lib/tipos";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { BUCKET, clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/insforge";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Contexto = RouteContext<"/api/[org]/admin/certificados/[id]">;

// El certificado solo si es de la organización de la ruta y el usuario la
// administra. Devuelve null (404/401 según el caso) en cualquier otro caso.
async function acceso(ctx: Contexto) {
  const { org: slug, id } = await ctx.params;
  const org = buscarOrganizacion(slug);
  if (!org) return { estado: 404 as const };
  if (!(await usuarioAdmin(org.slug))) return { estado: 401 as const };
  const fila = await buscar(org.slug, id);
  return fila ? { fila } : { estado: 404 as const };
}

async function buscar(organizacion: string, id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await clienteAdmin()
    .database.from(TABLA)
    .select("id, nombre, tipo, archivo_key")
    .eq("id", id)
    .eq("organizacion", organizacion)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; nombre: string; tipo: string; archivo_key: string } | null;
}

// Descarga desde el panel: no suma al contador de descargas del público.
export async function GET(_: Request, ctx: Contexto) {
  const r = await acceso(ctx);
  if (!r.fila) return new Response(r.estado === 401 ? "No autorizado" : "No encontrado", { status: r.estado });
  const { fila } = r;

  const { data: pdf, error } = await clienteAdmin().storage.from(BUCKET).download(fila.archivo_key);
  if (error || !pdf) {
    console.error(error);
    return new Response("No se encontró el archivo", { status: 404 });
  }
  return respuestaPdf(pdf, `Certificado ${etiquetaTipo(fila.tipo).toLowerCase()} - ${fila.nombre}`);
}

export async function DELETE(_: Request, ctx: Contexto) {
  const r = await acceso(ctx);
  if (!r.fila) {
    return Response.json(
      { error: r.estado === 401 ? "No autorizado" : "No encontrado" },
      { status: r.estado },
    );
  }
  const { fila } = r;

  const db = clienteAdmin();
  const { error } = await db.database.from(TABLA).delete().eq("id", fila.id);
  if (error) {
    console.error(error);
    return Response.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
  const { error: errorArchivo } = await db.storage.from(BUCKET).remove(fila.archivo_key);
  if (errorArchivo) console.error(errorArchivo);
  return Response.json({ ok: true });
}
