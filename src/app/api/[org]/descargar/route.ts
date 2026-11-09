import { buscarOrganizacion } from "@/lib/organizaciones";
import { BUCKET, clienteAdmin } from "@/lib/servidor/insforge";
import { ipDe, permitir } from "@/lib/servidor/limite";
import {
  buscarCertificados,
  contarDescargas,
  leerBusqueda,
  NO_ENCONTRADO,
  nombreArchivo,
  type CertificadoPortal,
} from "@/lib/servidor/portal";
import { respuestaPdf } from "@/lib/servidor/respuesta-pdf";

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

// Portal público: entrega un certificado ya generado ({ id }, o el único que
// tenga la persona). Repite la búsqueda en cada petición: solo se descarga lo
// que corresponde al correo (o nombre) enviado. El "descargar todos" arma el
// ZIP en el navegador pidiendo cada PDF aquí (Vercel limita cada respuesta a
// ~4,5 MB y cada certificado pesa 1–2 MB).
export async function POST(request: Request, ctx: RouteContext<"/api/[org]/descargar">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return error(404, NO_ENCONTRADO.correo);
  if (!permitir(`descargar:${org.slug}:${ipDe(request)}`, 60, 10 * 60_000)) {
    return error(429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
  }

  const cuerpo = await request.json().catch(() => null);
  const busqueda = leerBusqueda(cuerpo);
  if (!busqueda) return error(404, NO_ENCONTRADO.nombre);

  let certificados: CertificadoPortal[];
  try {
    certificados = await buscarCertificados(org, busqueda);
  } catch (e) {
    console.error(e);
    return error(500, "No pudimos consultar los certificados. Inténtalo más tarde.");
  }

  const elegido =
    typeof cuerpo?.id === "string"
      ? certificados.find((c) => c.id === cuerpo.id)
      : certificados.length === 1
        ? certificados[0]
        : undefined;
  if (!elegido) return error(404, NO_ENCONTRADO[busqueda.por]);

  try {
    const { data: pdf, error: errorDescarga } = await clienteAdmin()
      .storage.from(BUCKET)
      .download(elegido.archivo_key);
    if (errorDescarga || !pdf) throw errorDescarga ?? new Error("Sin archivo");
    await contarDescargas([elegido]);
    return respuestaPdf(pdf, nombreArchivo(elegido));
  } catch (e) {
    console.error(e);
    return error(500, "No pudimos preparar la descarga. Inténtalo más tarde.");
  }
}
