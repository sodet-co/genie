import {
  LARGO_MAXIMO_CLAVE,
  MAXIMO_CORREOS,
  normalizarBusqueda,
  referenciaCertificado,
  separarCorreos,
} from "@/lib/busqueda";
import { buscarOrganizacion, plantillaPorId } from "@/lib/organizaciones";
import { esTipo } from "@/lib/tipos";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
import {
  BUCKET,
  clienteAdmin,
  TABLA,
  usuarioAdmin,
} from "@/lib/servidor/insforge";

const TAMANO_MAXIMO = 15 * 1024 * 1024;

// Publica (o reemplaza) un certificado de una persona. Lo llama el generador del panel
// después de crear cada PDF en el navegador. Cada intento queda en la bitácora.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/[org]/admin/certificados">,
) {
  const slug = (await ctx.params).org;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento: "admin.publicar", organizacion: org?.slug ?? slug });
  if (!org) return b.json(404, { error: "Organización no encontrada." });
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return b.json(401, { error: "Sesión vencida. Vuelve a ingresar." }, { resultado: "rechazado" });
  b.quien(usuario.email, "panel");

  const formulario = await request.formData();
  const archivo = formulario.get("archivo");
  const claveOriginal = String(formulario.get("clave") ?? "").trim();
  const nombre = String(formulario.get("nombre") ?? "").trim() || claveOriginal;
  const clave = normalizarBusqueda(claveOriginal);
  const tipo = formulario.get("tipo");
  const idPlantilla = formulario.get("plantilla");
  // Solo se guardan plantillas del evento conocidas (las que se pueden regenerar).
  const plantilla = plantillaPorId(org, String(idPlantilla ?? ""))?.id ?? null;
  const contexto = { nombre, tipo: String(tipo ?? ""), plantilla, correos_enviados: String(formulario.get("correos") ?? "") };

  if (!(archivo instanceof Blob)) return b.json(400, { error: "Falta el PDF." }, { detalle: contexto });
  if (!esTipo(tipo)) return b.json(400, { error: "Tipo de certificado inválido." }, { detalle: contexto });
  if (archivo.size > TAMANO_MAXIMO) {
    return b.json(413, { error: "El PDF supera 15 MB." }, { detalle: { ...contexto, bytes: archivo.size } });
  }
  if (!clave || claveOriginal.length > LARGO_MAXIMO_CLAVE) {
    return b.json(400, { error: "La clave de búsqueda está vacía o es demasiado larga." }, { detalle: contexto });
  }
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return b.json(400, { error: "El archivo no es un PDF." }, { detalle: { ...contexto, bytes: bytes.length } });
  }

  let datos: Record<string, string> = {};
  try {
    const leido = JSON.parse(String(formulario.get("datos") ?? "{}"));
    if (leido && typeof leido === "object") datos = leido;
  } catch {
    return b.json(400, { error: "Datos inválidos." }, { detalle: contexto });
  }

  // Correos con los que la persona lo descarga en el portal (puede no tener).
  const { validos: correos, invalidos } = separarCorreos(
    String(formulario.get("correos") ?? ""),
  );
  if (invalidos.length) {
    return b.json(400, { error: `Correo inválido: ${invalidos.join(", ")}` }, { detalle: { ...contexto, datos } });
  }
  if (correos.length > MAXIMO_CORREOS) {
    return b.json(400, { error: "Demasiados correos." }, { detalle: { ...contexto, datos } });
  }

  // Misma persona, tipo y título = mismo certificado: se reemplaza.
  const referencia = referenciaCertificado(tipo, String(datos.titulo ?? ""));
  const detalle = { ...contexto, datos, correos, referencia, bytes: bytes.length };

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
    return b.json(500, { error: "No se pudo consultar la base de datos." }, {
      detalle: { ...detalle, error: describirError(errorConsulta) },
    });
  }

  // Los PDF nuevos van en una carpeta por organización.
  const archivoKey =
    existente?.archivo_key ?? `${org.slug}/${crypto.randomUUID()}.pdf`;
  const { error: errorSubida } = await db.storage
    .from(BUCKET)
    .upload(archivoKey, new Blob([bytes], { type: "application/pdf" }));
  if (errorSubida) {
    console.error(errorSubida);
    return b.json(500, { error: "No se pudo guardar el PDF." }, {
      certificadoId: existente?.id ?? null,
      detalle: { ...detalle, archivo_key: archivoKey, error: describirError(errorSubida) },
    });
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
  const { data: guardado, error: errorGuardado } = existente
    ? await db.database
        .from(TABLA)
        .update({ ...fila, actualizado_en: new Date().toISOString() })
        .eq("id", existente.id)
        .select("id")
        .maybeSingle()
    : await db.database.from(TABLA).insert([fila]).select("id").maybeSingle();
  if (errorGuardado) {
    console.error(errorGuardado);
    if (!existente) await db.storage.from(BUCKET).remove(archivoKey);
    return b.json(500, { error: "No se pudo registrar el certificado." }, {
      certificadoId: existente?.id ?? null,
      detalle: { ...detalle, archivo_key: archivoKey, error: describirError(errorGuardado) },
    });
  }

  return b.json(
    200,
    { reemplazado: Boolean(existente) },
    {
      mensaje: `${existente ? "Reemplazó" : "Publicó"} el certificado de ${nombre}`,
      certificadoId: (guardado as { id?: string } | null)?.id ?? existente?.id ?? null,
      detalle: { ...detalle, archivo_key: archivoKey, reemplazado: Boolean(existente) },
    },
  );
}
