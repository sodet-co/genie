import { respuestaPdf } from "@/lib/servidor/respuesta-pdf";
import { etiquetaTipo } from "@/lib/tipos";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
import { BUCKET, clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/insforge";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Contexto = RouteContext<"/api/[org]/admin/certificados/[id]">;
type Fila = { id: string; nombre: string; tipo: string; archivo_key: string; datos: Record<string, string> | null; correos: string[] };

async function buscar(organizacion: string, id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await clienteAdmin()
    .database.from(TABLA)
    .select("id, nombre, tipo, archivo_key, datos, correos")
    .eq("id", id)
    .eq("organizacion", organizacion)
    .maybeSingle();
  if (error) throw error;
  return data as Fila | null;
}

// El certificado si es de la organización de la ruta y el usuario la
// administra; si no, el estado (404/401). Todo queda en la bitácora.
async function acceso(request: Request, ctx: Contexto, evento: string) {
  const { org: slug, id } = await ctx.params;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento, organizacion: org?.slug ?? slug });
  if (!org) return { b, estado: 404 as const, id };
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return { b, estado: 401 as const, id };
  b.quien(usuario.email, request.headers.get("x-origen") ?? "panel");
  const fila = await buscar(org.slug, id);
  return fila ? { b, fila, id } : { b, estado: 404 as const, id };
}

// Descarga desde el panel: no suma al contador de descargas del público.
export async function GET(request: Request, ctx: Contexto) {
  const r = await acceso(request, ctx, "admin.descargar_pdf");
  const { b } = r;
  if (!r.fila) {
    const texto = r.estado === 401 ? "No autorizado" : "No encontrado";
    b.registrar({ resultado: r.estado === 401 ? "rechazado" : "no_encontrado", estadoHttp: r.estado, mensaje: texto, certificadoId: UUID.test(r.id) ? r.id : null });
    return new Response(texto, { status: r.estado });
  }
  const { fila } = r;

  const { data: pdf, error } = await clienteAdmin().storage.from(BUCKET).download(fila.archivo_key);
  if (error || !pdf) {
    console.error(error);
    b.registrar({
      resultado: "error",
      estadoHttp: 404,
      mensaje: "No se encontró el archivo",
      certificadoId: fila.id,
      detalle: { nombre: fila.nombre, archivo_key: fila.archivo_key, error: describirError(error) },
    });
    return new Response("No se encontró el archivo", { status: 404 });
  }
  const archivo = `Certificado ${etiquetaTipo(fila.tipo).toLowerCase()} - ${fila.nombre}`;
  b.registrar({
    resultado: "ok",
    estadoHttp: 200,
    mensaje: `Descargó "${archivo}.pdf"`,
    certificadoId: fila.id,
    detalle: { nombre: fila.nombre, tipo: fila.tipo, titulo: fila.datos?.titulo ?? "", bytes: pdf.size },
  });
  return respuestaPdf(pdf, archivo);
}

export async function DELETE(request: Request, ctx: Contexto) {
  const r = await acceso(request, ctx, "admin.eliminar");
  const { b } = r;
  if (!r.fila) {
    return b.json(r.estado, { error: r.estado === 401 ? "No autorizado" : "No encontrado" }, {
      certificadoId: UUID.test(r.id) ? r.id : null,
    });
  }
  const { fila } = r;
  // Lo que se elimina, para poder reconstruirlo si fue un error.
  const respaldo = { nombre: fila.nombre, tipo: fila.tipo, datos: fila.datos, correos: fila.correos, archivo_key: fila.archivo_key };

  const db = clienteAdmin();
  const { error } = await db.database.from(TABLA).delete().eq("id", fila.id);
  if (error) {
    console.error(error);
    return b.json(500, { error: "No se pudo eliminar." }, {
      certificadoId: fila.id,
      detalle: { ...respaldo, error: describirError(error) },
    });
  }
  const { error: errorArchivo } = await db.storage.from(BUCKET).remove(fila.archivo_key);
  if (errorArchivo) console.error(errorArchivo);
  return b.json(200, { ok: true }, {
    mensaje: `Eliminó el certificado de ${fila.nombre}`,
    certificadoId: fila.id,
    detalle: { ...respaldo, archivo_borrado: !errorArchivo, error_archivo: errorArchivo ? describirError(errorArchivo) : null },
  });
}
