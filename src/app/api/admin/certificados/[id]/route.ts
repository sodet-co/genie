import { respuestaPdf } from "@/lib/servidor/respuesta-pdf";
import { etiquetaTipo } from "@/lib/tipos";
import { BUCKET, clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/insforge";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function buscar(id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await clienteAdmin()
    .database.from(TABLA)
    .select("id, nombre, tipo, archivo_key")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; nombre: string; tipo: string; archivo_key: string } | null;
}

// Descarga desde el panel: no suma al contador de descargas del público.
export async function GET(_: Request, ctx: RouteContext<"/api/admin/certificados/[id]">) {
  if (!(await usuarioAdmin())) return new Response("No autorizado", { status: 401 });
  const fila = await buscar((await ctx.params).id);
  if (!fila) return new Response("No encontrado", { status: 404 });

  const { data: pdf, error } = await clienteAdmin().storage.from(BUCKET).download(fila.archivo_key);
  if (error || !pdf) {
    console.error(error);
    return new Response("No se encontró el archivo", { status: 404 });
  }
  return respuestaPdf(pdf, `Certificado ${etiquetaTipo(fila.tipo).toLowerCase()} - ${fila.nombre}`);
}

export async function DELETE(_: Request, ctx: RouteContext<"/api/admin/certificados/[id]">) {
  if (!(await usuarioAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });
  const fila = await buscar((await ctx.params).id);
  if (!fila) return Response.json({ error: "No encontrado" }, { status: 404 });

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
