import { LARGO_MAXIMO_CLAVE, normalizarBusqueda } from "@/lib/busqueda";
import { PLANTILLAS_EVENTO } from "@/lib/plantillas-evento";
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

// Publica (o reemplaza) el PDF de una persona. Lo llama el generador del panel
// después de crear cada PDF en el navegador.
export async function POST(request: Request) {
  if (!(await usuarioAdmin()))
    return error(401, "Sesión vencida. Vuelve a ingresar.");

  const formulario = await request.formData();
  const archivo = formulario.get("archivo");
  const claveOriginal = String(formulario.get("clave") ?? "").trim();
  const nombre = String(formulario.get("nombre") ?? "").trim() || claveOriginal;
  const clave = normalizarBusqueda(claveOriginal);
  const tipo = formulario.get("tipo");
  const idPlantilla = formulario.get("plantilla");
  // Solo se guardan plantillas del evento conocidas (las que se pueden regenerar).
  const plantilla = PLANTILLAS_EVENTO.some((p) => p.id === idPlantilla)
    ? String(idPlantilla)
    : null;

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

  const db = clienteAdmin();
  const { data: existente, error: errorConsulta } = await db.database
    .from(TABLA)
    .select("id, archivo_key, tipo")
    .eq("clave", clave)
    .maybeSingle();
  if (errorConsulta) {
    console.error(errorConsulta);
    return error(500, "No se pudo consultar la base de datos.");
  }

  const archivoKey = existente?.archivo_key ?? `${crypto.randomUUID()}.pdf`;
  const { error: errorSubida } = await db.storage
    .from(BUCKET)
    .upload(archivoKey, new Blob([bytes], { type: "application/pdf" }));
  if (errorSubida) {
    console.error(errorSubida);
    return error(500, "No se pudo guardar el PDF.");
  }

  const fila = {
    clave,
    clave_original: claveOriginal,
    nombre,
    tipo,
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

  // Un certificado por persona: si ya tenía uno (de cualquier tipo), se reemplaza.
  return Response.json({
    reemplazado: Boolean(existente),
    tipoAnterior: existente && existente.tipo !== tipo ? existente.tipo : null,
  });
}
