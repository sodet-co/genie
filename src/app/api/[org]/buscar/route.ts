import { buscarOrganizacion } from "@/lib/organizaciones";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
import { ipDe, permitir } from "@/lib/servidor/limite";
import {
  buscarCertificados,
  leerBusqueda,
  NO_ENCONTRADO,
  resumenPublico,
} from "@/lib/servidor/portal";

// Portal público: lista los certificados ya generados de la persona (por su
// correo registrado o, si no tiene, por su nombre). Si no hay ninguno responde
// siempre un mensaje genérico. Cada búsqueda queda en la bitácora.
export async function POST(request: Request, ctx: RouteContext<"/api/[org]/buscar">) {
  const slug = (await ctx.params).org;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento: "portal.buscar", organizacion: org?.slug ?? slug });
  if (!org) return b.json(404, { error: NO_ENCONTRADO.correo }, { detalle: { motivo: "organización desconocida" } });

  const cuerpo = await request.json().catch(() => null);
  const escrito = typeof cuerpo?.correo === "string" ? cuerpo.correo : typeof cuerpo?.nombre === "string" ? cuerpo.nombre : null;
  b.quien(escrito, typeof cuerpo?.correo === "string" ? "correo" : typeof cuerpo?.nombre === "string" ? "nombre" : null);

  if (!permitir(`buscar:${org.slug}:${ipDe(request)}`, 20, 10 * 60_000)) {
    return b.json(429, { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, {
      detalle: { limite: "20 búsquedas por IP cada 10 minutos" },
    });
  }

  const busqueda = leerBusqueda(cuerpo);
  if (!busqueda) {
    return b.json(404, { error: cuerpo?.correo ? "Escribe un correo válido." : NO_ENCONTRADO.nombre }, {
      resultado: "rechazado",
      detalle: { motivo: cuerpo ? "correo o nombre no válido" : "cuerpo de la petición no es JSON", cuerpo },
    });
  }

  try {
    const certificados = await buscarCertificados(org, busqueda);
    const detalle = { por: busqueda.por, normalizado: busqueda.valor, encontrados: certificados.length };
    if (certificados.length === 0) {
      return b.json(404, { error: NO_ENCONTRADO[busqueda.por] }, { detalle });
    }
    return b.json(
      200,
      { certificados: certificados.map(resumenPublico) },
      {
        mensaje: certificados.length === 1 ? "1 certificado: se descarga directo" : `${certificados.length} certificados: se muestra la lista`,
        detalle: {
          ...detalle,
          certificados: certificados.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, titulo: c.datos?.titulo ?? "" })),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error(e);
    return b.json(500, { error: "No pudimos consultar los certificados. Inténtalo más tarde." }, {
      detalle: { ...busqueda, error: describirError(e) },
    });
  }
}
