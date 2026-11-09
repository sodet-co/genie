import {
  LARGO_MAXIMO_CLAVE,
  MAXIMO_CORREOS,
  normalizarBusqueda,
  referenciaCertificado,
  separarCorreos,
} from "@/lib/busqueda";
import { buscarOrganizacion, plantillaPorId } from "@/lib/organizaciones";
import { esTipo } from "@/lib/tipos";
import {
  BUCKET,
  clienteAdmin,
  TABLA,
  usuarioAdmin,
} from "@/lib/servidor/insforge";

const TAMANO_MAXIMO = 15 * 1024 * 1024;

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

// Publica (o reemplaza) un certificado de una persona. Lo llama el generador del panel
// después de crear cada PDF en el navegador.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/[org]/admin/certificados">,
) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return error(404, "Organización no encontrada.");
  if (!(await usuarioAdmin(org.slug)))
    return error(401, "Sesión vencida. Vuelve a ingresar.");

  const formulario = await request.formData();
  const archivo = formulario.get("archivo");
  const claveOriginal = String(formulario.get("clave") ?? "").trim();
  const nombre = String(formulario.get("nombre") ?? "").trim() || claveOriginal;
  const clave = normalizarBusqueda(claveOriginal);
  const tipo = formulario.get("tipo");
  const idPlantilla = formulario.get("plantilla");
  // Solo se guardan plantillas del evento conocidas (las que se pueden regenerar).
  const plantilla = plantillaPorId(org, String(idPlantilla ?? ""))?.id ?? null;

  if (!(archivo instanceof Blob)) return error(400, "Falta el PDF.");
  if (!esTipo(tipo)) return error(400, "Tipo de certificado inválido.");
  if (archivo.size > TAMANO_MAXIMO) return error(413, "El PDF supera 15 MB.");
  if (!clave || claveOriginal.length > LARGO_MAXIMO_CLAVE) {
    return error(400, "La clave de búsqueda está vacía o es demasiado larga.");
  }
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return error(400, "El archivo no es un PDF.");
  }

  let datos: Record<string, string> = {};
  try {
    const leido = JSON.parse(String(formulario.get("datos") ?? "{}"));
    if (leido && typeof leido === "object") datos = leido;
  } catch {
    return error(400, "Datos inválidos.");
  }

  // Correos con los que la persona lo descarga en el portal (puede no tener).
  const { validos: correos, invalidos } = separarCorreos(
    String(formulario.get("correos") ?? ""),
  );
  if (invalidos.length) return error(400, `Correo inválido: ${invalidos.join(", ")}`);
  if (correos.length > MAXIMO_CORREOS) return error(400, "Demasiados correos.");

  // Misma persona, tipo y título = mismo certificado: se reemplaza.
  const referencia = referenciaCertificado(tipo, String(datos.titulo ?? ""));

  const db = clienteAdmin();
  const { data: existente, error: errorConsulta } = await db.database
    .from(TABLA)
    .select("id, archivo_key")
    .eq("organizacion", org.slug)
    .eq("clave", clave)
    .eq("referencia", referencia)
    .maybeSingle();
  if (errorConsulta) {
    console.error(errorConsulta);
    return error(500, "No se pudo consultar la base de datos.");
  }

  // Los PDF nuevos van en una carpeta por organización.
  const archivoKey =
    existente?.archivo_key ?? `${org.slug}/${crypto.randomUUID()}.pdf`;
  const { error: errorSubida } = await db.storage
    .from(BUCKET)
    .upload(archivoKey, new Blob([bytes], { type: "application/pdf" }));
  if (errorSubida) {
    console.error(errorSubida);
    return error(500, "No se pudo guardar el PDF.");
  }

  const fila = {
    organizacion: org.slug,
    clave,
    clave_original: claveOriginal,
    nombre,
    tipo,
    referencia,
    correos,
    plantilla,
    datos,
    archivo_key: archivoKey,
  };
  const { error: errorGuardado } = existente
    ? await db.database
        .from(TABLA)
        .update({ ...fila, actualizado_en: new Date().toISOString() })
        .eq("id", existente.id)
    : await db.database.from(TABLA).insert([fila]);
  if (errorGuardado) {
    console.error(errorGuardado);
    if (!existente) await db.storage.from(BUCKET).remove(archivoKey);
    return error(500, "No se pudo registrar el certificado.");
  }

  return Response.json({ reemplazado: Boolean(existente) });
}
