import { buscarOrganizacion, plantillaPorId } from "@/lib/organizaciones";
import { leerOriginal, leerPersonalizada, type ArchivoPlantilla } from "@/lib/servidor/plantillas";

const TIPOS: Record<ArchivoPlantilla, string> = {
  html: "text/html; charset=utf-8",
  fondo: "image/png",
};

// Tipo real de la imagen (un JPG puede estar guardado como .png).
function tipoImagen(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  return "image/png";
}

// La plantilla vigente de un tipo de certificado: la personalizada (subida en
// el panel) o, si no hay, la original del sitio. La usan el generador y las
// vistas previas. No es información privada: es el diseño del certificado.
export async function GET(request: Request, ctx: RouteContext<"/api/[org]/plantillas/[id]/[archivo]">) {
  const { org: slug, id, archivo } = await ctx.params;
  const org = buscarOrganizacion(slug);
  const p = org ? plantillaPorId(org, id) : null;
  if (!org || !p || (archivo !== "html" && archivo !== "fondo")) {
    return new Response("No encontrado", { status: 404 });
  }
  try {
    const personalizada = await leerPersonalizada(org.slug, p.id, archivo);
    const datos = personalizada ?? (await leerOriginal(new URL(request.url).origin, p, archivo));
    const bytes = new Uint8Array(await datos.arrayBuffer());
    return new Response(bytes, {
      headers: {
        "Content-Type": archivo === "fondo" ? tipoImagen(bytes) : TIPOS.html,
        "Cache-Control": "no-store",
        "X-Plantilla": personalizada ? "personalizada" : "original",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("No se pudo leer la plantilla", { status: 500 });
  }
}
