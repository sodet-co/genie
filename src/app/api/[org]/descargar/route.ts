import { buscarOrganizacion } from "@/lib/organizaciones";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
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

// Portal público: entrega un certificado ya generado ({ id }, o el único que
// tenga la persona). Repite la búsqueda en cada petición: solo se descarga lo
// que corresponde al correo (o nombre) enviado. El "descargar todos" arma el
// ZIP en el navegador pidiendo cada PDF aquí (Vercel limita cada respuesta a
// ~4,5 MB y cada certificado pesa 1–2 MB); esas peticiones llegan con la
// cabecera X-Origen: zip. Cada descarga (o intento) queda en la bitácora.
export async function POST(request: Request, ctx: RouteContext<"/api/[org]/descargar">) {
  const slug = (await ctx.params).org;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento: "portal.descargar", organizacion: org?.slug ?? slug });
  if (!org) return b.json(404, { error: NO_ENCONTRADO.correo }, { detalle: { motivo: "organización desconocida" } });

  const cuerpo = await request.json().catch(() => null);
  const escrito = typeof cuerpo?.correo === "string" ? cuerpo.correo : typeof cuerpo?.nombre === "string" ? cuerpo.nombre : null;
  b.quien(escrito, request.headers.get("x-origen") ?? "pdf");
  const pedido = typeof cuerpo?.id === "string" ? cuerpo.id : null;

  if (!permitir(`descargar:${org.slug}:${ipDe(request)}`, 60, 10 * 60_000)) {
    return b.json(429, { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, {
      certificadoId: pedido,
      detalle: { limite: "60 descargas por IP cada 10 minutos" },
    });
  }

  const busqueda = leerBusqueda(cuerpo);
  if (!busqueda) {
    return b.json(404, { error: NO_ENCONTRADO.nombre }, {
      resultado: "rechazado",
      detalle: { motivo: "correo o nombre no válido", cuerpo },
    });
  }

  let certificados: CertificadoPortal[];
  try {
    certificados = await buscarCertificados(org, busqueda);
  } catch (e) {
    console.error(e);
    return b.json(500, { error: "No pudimos consultar los certificados. Inténtalo más tarde." }, {
      detalle: { ...busqueda, error: describirError(e) },
    });
  }

  const elegido = pedido
    ? certificados.find((c) => c.id === pedido)
    : certificados.length === 1
      ? certificados[0]
      : undefined;
  if (!elegido) {
    return b.json(404, { error: NO_ENCONTRADO[busqueda.por] }, {
      certificadoId: null,
      detalle: {
        ...busqueda,
        pedido,
        motivo: pedido
          ? "el certificado pedido no corresponde a este correo o nombre"
          : certificados.length === 0
            ? "no tiene certificados"
            : "tiene varios y no indicó cuál",
        encontrados: certificados.map((c) => c.id),
      },
    });
  }

  try {
    const { data: pdf, error: errorDescarga } = await clienteAdmin()
      .storage.from(BUCKET)
      .download(elegido.archivo_key);
    if (errorDescarga || !pdf) throw errorDescarga ?? new Error("El archivo no existe en el storage");
    await contarDescargas([elegido]);
    const archivo = nombreArchivo(elegido);
    b.registrar({
      resultado: "ok",
      estadoHttp: 200,
      mensaje: `Descargó "${archivo}.pdf"`,
      certificadoId: elegido.id,
      detalle: {
        ...busqueda,
        nombre: elegido.nombre,
        tipo: elegido.tipo,
        titulo: elegido.datos?.titulo ?? "",
        archivo_key: elegido.archivo_key,
        bytes: pdf.size,
        descargas_antes: elegido.descargas,
      },
    });
    return respuestaPdf(pdf, archivo);
  } catch (e) {
    console.error(e);
    return b.json(500, { error: "No pudimos preparar la descarga. Inténtalo más tarde." }, {
      certificadoId: elegido.id,
      detalle: { ...busqueda, archivo_key: elegido.archivo_key, error: describirError(e) },
    });
  }
}
