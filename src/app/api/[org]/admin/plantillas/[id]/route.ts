import { buscarOrganizacion, plantillaPorId } from "@/lib/organizaciones";
import { extraerMarcadores } from "@/lib/plantilla";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
import { usuarioAdmin } from "@/lib/servidor/insforge";
import { puedeRegenerar } from "@/lib/servidor/permisos";
import { guardarPersonalizada, quitarPersonalizada, type ArchivoPlantilla } from "@/lib/servidor/plantillas";

const MAXIMO_HTML = 2 * 1024 * 1024;
const MAXIMO_FONDO = 15 * 1024 * 1024;

type Contexto = RouteContext<"/api/[org]/admin/plantillas/[id]">;

async function acceso(request: Request, ctx: Contexto, evento: string) {
  const { org: slug, id } = await ctx.params;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento, organizacion: org?.slug ?? slug });
  const p = org ? plantillaPorId(org, id) : null;
  if (!org || !p) return { b, error: b.json(404, { error: "Plantilla no encontrada." }) };
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) return { b, error: b.json(401, { error: "Sesión vencida. Vuelve a ingresar." }, { resultado: "rechazado" }) };
  b.quien(usuario.email, "panel");
  if (!puedeRegenerar(usuario.email)) {
    return { b, error: b.json(403, { error: "Tu cuenta no puede cambiar plantillas." }, { resultado: "rechazado" }) };
  }
  return { b, org, p };
}

const esPng = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const esJpg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

// Reemplaza el HTML o el fondo de una plantilla: { archivo: "html"|"fondo", datos: File }.
// El HTML debe traer los mismos datos ({{nombre}}, {{titulo}}…) que usa la plantilla.
export async function POST(request: Request, ctx: Contexto) {
  const r = await acceso(request, ctx, "admin.plantilla");
  if (r.error) return r.error;
  const { b, org, p } = r;

  const formulario = await request.formData();
  const archivo = String(formulario.get("archivo") ?? "") as ArchivoPlantilla;
  const datos = formulario.get("datos");
  if ((archivo !== "html" && archivo !== "fondo") || !(datos instanceof Blob)) {
    return b.json(400, { error: "Falta el archivo." });
  }
  const bytes = new Uint8Array(await datos.arrayBuffer());
  const detalle = { plantilla: p.id, archivo, bytes: bytes.length, nombreArchivo: (datos as File).name ?? "" };

  if (archivo === "fondo") {
    if (bytes.length > MAXIMO_FONDO) return b.json(413, { error: "La imagen supera 15 MB." }, { detalle });
    if (!esPng(bytes) && !esJpg(bytes)) return b.json(400, { error: "El fondo debe ser una imagen PNG o JPG." }, { detalle });
  } else {
    if (bytes.length > MAXIMO_HTML) return b.json(413, { error: "El HTML supera 2 MB." }, { detalle });
    const html = new TextDecoder().decode(bytes);
    if (!/<html[\s>]/i.test(html)) return b.json(400, { error: "El archivo no parece un HTML." }, { detalle });
    const marcadores = extraerMarcadores(html);
    const faltan = p.marcadores.filter((m) => !marcadores.includes(m));
    if (faltan.length) {
      return b.json(
        400,
        { error: `Al HTML le falta ${faltan.map((m) => `{{${m}}}`).join(" y ")}: sin eso el certificado saldría sin esos datos.` },
        { detalle: { ...detalle, marcadores } },
      );
    }
  }

  try {
    await guardarPersonalizada(org.slug, p.id, archivo, new Blob([bytes], { type: archivo === "html" ? "text/html" : esJpg(bytes) ? "image/jpeg" : "image/png" }));
  } catch (e) {
    console.error(e);
    return b.json(500, { error: "No se pudo guardar la plantilla." }, { detalle: { ...detalle, error: describirError(e) } });
  }
  return b.json(200, { ok: true }, {
    mensaje: `Cambió ${archivo === "html" ? "el HTML" : "el fondo"} de la plantilla ${p.nombre}`,
    detalle,
  });
}

// Vuelve a la plantilla original: ?archivo=html|fondo (la personalizada queda en el historial).
export async function DELETE(request: Request, ctx: Contexto) {
  const r = await acceso(request, ctx, "admin.plantilla");
  if (r.error) return r.error;
  const { b, org, p } = r;
  const archivo = new URL(request.url).searchParams.get("archivo") as ArchivoPlantilla;
  if (archivo !== "html" && archivo !== "fondo") return b.json(400, { error: "Indica html o fondo." });
  try {
    const habia = await quitarPersonalizada(org.slug, p.id, archivo);
    return b.json(200, { ok: true, habia }, {
      mensaje: `Volvió ${archivo === "html" ? "el HTML" : "el fondo"} de la plantilla ${p.nombre} al original`,
      detalle: { plantilla: p.id, archivo, habia },
    });
  } catch (e) {
    console.error(e);
    return b.json(500, { error: "No se pudo restaurar la plantilla." }, { detalle: { plantilla: p.id, archivo, error: describirError(e) } });
  }
}
