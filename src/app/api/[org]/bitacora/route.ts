import { buscarOrganizacion } from "@/lib/organizaciones";
import { registrar, type Resultado } from "@/lib/servidor/bitacora";
import { usuarioAdmin } from "@/lib/servidor/insforge";
import { ipDe, permitir } from "@/lib/servidor/limite";

// Eventos que pasan en el navegador (el ZIP se arma allá; los errores de red
// solo los ve el navegador). Solo se aceptan estos; los "admin." exigen sesión.
const EVENTOS = new Set(["portal.zip", "portal.error_cliente", "admin.zip", "admin.error_cliente"]);
const RESULTADOS = new Set<Resultado>(["ok", "no_encontrado", "rechazado", "limite", "error"]);

export async function POST(request: Request, ctx: RouteContext<"/api/[org]/bitacora">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return new Response(null, { status: 404 });
  if (!permitir(`bitacora:${org.slug}:${ipDe(request)}`, 120, 10 * 60_000)) {
    return new Response(null, { status: 429 });
  }
  const texto = await request.text();
  if (texto.length > 20_000) return new Response(null, { status: 413 });
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const evento = String(cuerpo.evento ?? "");
  const resultado = String(cuerpo.resultado ?? "") as Resultado;
  if (!EVENTOS.has(evento) || !RESULTADOS.has(resultado)) return new Response(null, { status: 400 });

  let actor = typeof cuerpo.actor === "string" ? cuerpo.actor : null;
  if (evento.startsWith("admin.")) {
    const usuario = await usuarioAdmin(org.slug);
    if (!usuario) return new Response(null, { status: 401 });
    actor = usuario.email;
  }

  registrar(
    {
      evento,
      resultado,
      organizacion: org.slug,
      mensaje: typeof cuerpo.mensaje === "string" ? cuerpo.mensaje : null,
      actor,
      origen: "navegador",
      detalle:
        cuerpo.detalle && typeof cuerpo.detalle === "object"
          ? { ...(cuerpo.detalle as Record<string, unknown>), url: request.headers.get("referer") }
          : { url: request.headers.get("referer") },
    },
    { request },
  );
  return new Response(null, { status: 204 });
}
