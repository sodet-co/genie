import JSZip from "jszip";
import { nombreSeguro } from "@/lib/plantilla";
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
import { respuestaArchivo, respuestaPdf } from "@/lib/servidor/respuesta-pdf";

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

async function leerPdf(c: CertificadoPortal) {
  const { data, error } = await clienteAdmin().storage.from(BUCKET).download(c.archivo_key);
  if (error || !data) throw error ?? new Error(`Sin archivo: ${c.archivo_key}`);
  return data;
}

// Portal público: entrega un certificado ya generado ({ id }) o todos los de
// la persona en un ZIP ({ todos: true }). Repite la búsqueda en cada petición:
// solo se descarga lo que corresponde al correo (o nombre) enviado.
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

  try {
    if (cuerpo?.todos === true) {
      if (certificados.length === 0) return error(404, NO_ENCONTRADO[busqueda.por]);
      const zip = new JSZip();
      const usados = new Set<string>();
      for (const c of certificados) {
        // Dos certificados del mismo tipo (dos ponencias): "(2)", "(3)"…
        const base = nombreSeguro(nombreArchivo(c));
        let nombre = base;
        for (let n = 2; usados.has(nombre); n++) nombre = `${base} (${n})`;
        usados.add(nombre);
        zip.file(`${nombre}.pdf`, await (await leerPdf(c)).arrayBuffer());
      }
      const datos = await zip.generateAsync({ type: "uint8array" });
      await contarDescargas(certificados);
      return respuestaArchivo(
        new Blob([datos as Uint8Array<ArrayBuffer>], { type: "application/zip" }),
        // Un correo compartido puede traer certificados de dos personas.
        `${nombreSeguro(
          new Set(certificados.map((c) => c.nombre)).size === 1
            ? `Certificados - ${certificados[0].nombre}`
            : "Certificados",
        )}.zip`,
        "application/zip",
      );
    }

    const elegido =
      typeof cuerpo?.id === "string"
        ? certificados.find((c) => c.id === cuerpo.id)
        : certificados.length === 1
          ? certificados[0]
          : undefined;
    if (!elegido) return error(404, NO_ENCONTRADO[busqueda.por]);
    const pdf = await leerPdf(elegido);
    await contarDescargas([elegido]);
    return respuestaPdf(pdf, nombreArchivo(elegido));
  } catch (e) {
    console.error(e);
    return error(500, "No pudimos preparar la descarga. Inténtalo más tarde.");
  }
}
