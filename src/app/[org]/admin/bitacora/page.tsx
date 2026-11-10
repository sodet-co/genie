import { FileSpreadsheet, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mensaje } from "@/componentes/generador/mensaje";
import { EVENTOS_BITACORA, etiquetaEvento, etiquetaResultado, RESULTADOS_BITACORA } from "@/lib/eventos-bitacora";
import { buscarOrganizacion } from "@/lib/organizaciones";
import {
  aplicarFiltrosBitacora,
  COLUMNAS_BITACORA,
  leerFiltrosBitacora,
  type FilaBitacora,
} from "@/lib/servidor/filtros-bitacora";
import { clienteAdmin } from "@/lib/servidor/insforge";

export const metadata = { title: "Bitácora · Certificados" };

const POR_PAGINA = 50;

// El servidor (Vercel) corre en UTC: la hora se muestra en la de Colombia, con segundos.
const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Bogota",
});

const COLOR_RESULTADO: Record<string, string> = {
  ok: "bg-brand-soft text-brand-soft-ink",
  no_encontrado: "bg-surface-sunken text-ink-muted",
  rechazado: "bg-warning-soft text-ink",
  limite: "bg-warning-soft text-ink",
  error: "bg-danger-soft text-danger",
};

// Bitácora: cada búsqueda, descarga, publicación, eliminación, ingreso y
// error del portal y del panel, con el mensaje que se mostró y el detalle
// técnico, para depurar.
export default async function Bitacora({ params, searchParams }: PageProps<"/[org]/admin/bitacora">) {
  const org = buscarOrganizacion((await params).org);
  if (!org) notFound();
  const parametros = await searchParams;
  const filtros = leerFiltrosBitacora(parametros);
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const consulta = clienteAdmin()
    .database.from("bitacora")
    .select(COLUMNAS_BITACORA, { count: "exact" })
    .eq("organizacion", org.slug)
    .order("creado_en", { ascending: false })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const { data, count, error } = await aplicarFiltrosBitacora(consulta, filtros);
  const filas = (data ?? []) as FilaBitacora[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const consultaUrl = (extra: Record<string, string | number>) => ({ query: { ...filtros, ...extra } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold">Bitácora</h1>
          <p className="mt-1 text-ink-muted">
            Todo lo que pasa en el portal y en el panel: búsquedas, descargas, publicaciones,
            ingresos y errores, con el mensaje que se mostró.
          </p>
        </div>
        {total > 0 && (
          <a
            href={`/api/${org.slug}/admin/bitacora/excel?${new URLSearchParams(filtros)}`}
            className="boton-secundario w-full sm:w-auto"
          >
            <FileSpreadsheet aria-hidden size={16} strokeWidth={1.75} />
            Exportar Excel
          </a>
        )}
      </div>

      <form className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end" role="search">
        <input
          name="q"
          defaultValue={filtros.q}
          placeholder="Correo, nombre, mensaje, IP o id de certificado"
          aria-label="Buscar"
          className="campo sm:col-span-2 lg:min-w-72 lg:flex-1"
        />
        <select name="evento" defaultValue={filtros.evento} aria-label="Evento" className="campo lg:w-auto">
          <option value="">Todos los eventos</option>
          {Object.entries(EVENTOS_BITACORA).map(([id, etiqueta]) => (
            <option key={id} value={id}>
              {etiqueta}
            </option>
          ))}
        </select>
        <select name="resultado" defaultValue={filtros.resultado} aria-label="Resultado" className="campo lg:w-auto">
          <option value="">Todos los resultados</option>
          {Object.entries(RESULTADOS_BITACORA).map(([id, etiqueta]) => (
            <option key={id} value={id}>
              {etiqueta}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-small text-ink-muted">
          Desde
          <input type="date" name="desde" defaultValue={filtros.desde} className="campo" />
        </label>
        <label className="flex items-center gap-2 text-small text-ink-muted">
          Hasta
          <input type="date" name="hasta" defaultValue={filtros.hasta} className="campo" />
        </label>
        <button type="submit" className="boton-secundario">
          <Search aria-hidden size={16} strokeWidth={1.75} />
          Filtrar
        </button>
      </form>

      {error && (
        <Mensaje tipo="error">
          No se pudo leer la bitácora. Si es la primera vez, falta aplicar la migración de la bitácora.
        </Mensaje>
      )}

      {!error && filas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong bg-surface-raised p-6 text-center text-ink-muted">
          No hay registros con esos filtros.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
          {filas.map((f) => (
            <li key={f.id} className="flex flex-col gap-1 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
                <span className="tabular-nums text-ink-muted">{fecha.format(new Date(f.creado_en))}</span>
                <span className="font-medium text-ink">{etiquetaEvento(f.evento)}</span>
                <span className={`rounded-sm px-1.5 py-0.5 ${COLOR_RESULTADO[f.resultado] ?? ""}`}>
                  {etiquetaResultado(f.resultado)}
                  {f.estado_http ? ` · ${f.estado_http}` : ""}
                </span>
                {f.actor && (
                  <span className="min-w-0 truncate text-ink-muted" title={f.actor}>
                    {f.actor}
                  </span>
                )}
              </div>
              {f.mensaje && <p className="text-ink [overflow-wrap:anywhere]">{f.mensaje}</p>}
              <details className="text-small text-ink-muted">
                <summary className="cursor-pointer select-none">Detalle técnico</summary>
                <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
                  <dt>Registro</dt>
                  <dd className="tabular-nums">#{f.id}</dd>
                  {f.certificado_id && (
                    <>
                      <dt>Certificado</dt>
                      <dd className="[overflow-wrap:anywhere]">
                        <Link className="enlace" href={consultaUrl({ q: f.certificado_id, pagina: 1 })}>
                          {f.certificado_id}
                        </Link>
                      </dd>
                    </>
                  )}
                  <dt>Origen</dt>
                  <dd>{f.origen ?? "—"}</dd>
                  <dt>IP</dt>
                  <dd>{f.ip ?? "—"}</dd>
                  <dt>Duración</dt>
                  <dd>{f.duracion_ms != null ? `${f.duracion_ms} ms` : "—"}</dd>
                  <dt>Navegador</dt>
                  <dd className="[overflow-wrap:anywhere]">{f.user_agent ?? "—"}</dd>
                </dl>
                <pre className="mt-2 max-h-80 overflow-auto rounded-sm bg-surface-sunken p-2 text-[12px] leading-relaxed text-ink">
                  {JSON.stringify(f.detalle, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-small" aria-label="Paginación">
          <span className="text-ink-muted">
            {(pagina - 1) * POR_PAGINA + 1}–{(pagina - 1) * POR_PAGINA + filas.length} de {total}
          </span>
          <span className="flex items-center gap-4">
            {pagina > 1 ? (
              <Link className="enlace" href={consultaUrl({ pagina: pagina - 1 })}>
                Más recientes
              </Link>
            ) : (
              <span className="text-ink-muted opacity-50">Más recientes</span>
            )}
            <span className="text-ink-muted">
              Página {pagina} de {paginas}
            </span>
            {pagina < paginas ? (
              <Link className="enlace" href={consultaUrl({ pagina: pagina + 1 })}>
                Más antiguos
              </Link>
            ) : (
              <span className="text-ink-muted opacity-50">Más antiguos</span>
            )}
          </span>
        </nav>
      )}
    </div>
  );
}
