import { Download, Search } from "lucide-react";
import Link from "next/link";
import { BotonGenerar } from "@/componentes/admin/boton-generar";
import {
  BotonRegenerar,
  BotonRegenerarTodos,
} from "@/componentes/admin/regenerar";
import { BotonEliminar } from "@/componentes/admin/boton-eliminar";
import { Mensaje } from "@/componentes/generador/mensaje";
import { notFound } from "next/navigation";
import { normalizarBusqueda } from "@/lib/busqueda";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { esTipo, etiquetaTipo, TIPOS } from "@/lib/tipos";
import {
  clienteAdmin,
  TABLA,
  type FilaCertificado,
} from "@/lib/servidor/insforge";

const POR_PAGINA = 50;

type Fila = Pick<
  FilaCertificado,
  | "id"
  | "clave_original"
  | "nombre"
  | "tipo"
  | "plantilla"
  | "datos"
  | "correos"
  | "descargas"
  | "ultima_descarga"
  | "actualizado_en"
>;

// El servidor (Vercel) corre en UTC: la hora se muestra en la de Colombia.
const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export default async function Certificados({
  params,
  searchParams,
}: PageProps<"/[org]/admin">) {
  const org = buscarOrganizacion((await params).org);
  if (!org) notFound();
  const parametros = await searchParams;
  const q = String(parametros.q ?? "").trim();
  const tipo = esTipo(parametros.tipo) ? parametros.tipo : "";
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  let consulta = clienteAdmin()
    .database.from(TABLA)
    .select(
      "id, clave_original, nombre, tipo, plantilla, datos, correos, descargas, ultima_descarga, actualizado_en",
      {
        count: "exact",
      },
    )
    .eq("organizacion", org.slug)
    .order("nombre")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  // Comas, paréntesis, llaves, comillas y comodines romperían el filtro `or`
  // de PostgREST.
  const termino = q.replace(/[,()*%\\{}"]/g, " ").trim();
  if (termino.includes("@")) {
    // Un correo: coincidencia exacta con uno de los registrados.
    consulta = consulta.contains("correos", [termino.toLowerCase()]);
  } else if (termino) {
    consulta = consulta.or(
      `nombre.ilike.*${termino}*,clave_original.ilike.*${termino}*`,
    );
  }
  if (tipo) consulta = consulta.eq("tipo", tipo);
  const { data, count, error } = await consulta;
  const filas = (data ?? []) as Fila[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold">Certificados generados</h1>
          <p className="mt-1 text-ink-muted">
            {total} certificado(s) disponibles para descargar en la página
            pública.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {total > 0 && <BotonRegenerarTodos />}
          <BotonGenerar />
        </div>
      </div>

      <form
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap"
        role="search"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar"
          className="campo col-span-2 sm:max-w-sm sm:flex-1"
        />
        <select
          name="tipo"
          defaultValue={tipo}
          aria-label="Tipo"
          className="campo sm:w-auto"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.etiqueta}
            </option>
          ))}
        </select>
        <button type="submit" className="boton-secundario">
          <Search aria-hidden size={16} strokeWidth={1.75} />
          Buscar
        </button>
      </form>

      {error && (
        <Mensaje tipo="error">
          No se pudo leer la base de datos. Revisa la configuración de InsForge.
        </Mensaje>
      )}

      {!error && filas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong bg-surface-raised p-6 text-center text-ink-muted">
          {q || tipo
            ? "Ningún certificado coincide con la búsqueda."
            : "Todavía no se ha generado ningún certificado."}
        </p>
      ) : (
        <>
          {/* Celular: tarjetas */}
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised md:hidden">
            {filas.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium [overflow-wrap:anywhere]">
                    {f.nombre}
                  </p>
                  <span className="shrink-0 rounded-sm bg-surface-sunken px-2 py-0.5 text-small text-ink-muted">
                    {etiquetaTipo(f.tipo)}
                  </span>
                </div>
                {f.datos?.titulo && (
                  <p className="line-clamp-2 text-small text-ink-muted">{f.datos.titulo}</p>
                )}
                <p className="text-small text-ink-muted [overflow-wrap:anywhere]">
                  {f.correos?.length ? f.correos.join(", ") : "Sin correo"}
                </p>
                <p className="text-small text-ink-muted">
                  {f.descargas} descarga(s) · generado{" "}
                  {fecha.format(new Date(f.actualizado_en))}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/api/${org.slug}/admin/certificados/${f.id}`}
                    className="boton-secundario flex-1"
                  >
                    <Download aria-hidden size={16} strokeWidth={1.75} />
                    PDF
                  </a>
                  {f.plantilla && <BotonRegenerar certificado={f} comoBoton />}
                  <BotonEliminar id={f.id} nombre={f.nombre} comoBoton />
                </div>
              </li>
            ))}
          </ul>
          {/* Pantallas grandes: tabla */}
          <div className="hidden overflow-hidden rounded-md border border-border bg-surface-raised md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-surface-sunken text-label uppercase text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Nombre</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Descargas
                  </th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
                    Generado
                  </th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((f) => (
                  <tr key={f.id}>
                    {/* w-full + max-w-0: el nombre usa el espacio que sobra y se
                        corta con "…" en vez de ensanchar la tabla. */}
                    <td className="w-full max-w-0 px-3 py-2.5">
                      <span
                        className="block truncate font-medium"
                        title={f.nombre}
                      >
                        {f.nombre}
                      </span>
                      {normalizarBusqueda(f.clave_original) !==
                        normalizarBusqueda(f.nombre) && (
                        <span className="block truncate text-small text-ink-muted">
                          Clave: {f.clave_original}
                        </span>
                      )}
                      {f.datos?.titulo && (
                        <span
                          className="block truncate text-small text-ink-muted"
                          title={f.datos.titulo}
                        >
                          {f.datos.titulo}
                        </span>
                      )}
                      <span className="block truncate text-small text-ink-muted">
                        {f.correos?.length ? f.correos.join(", ") : "Sin correo"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {etiquetaTipo(f.tipo)}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums"
                      title={
                        f.ultima_descarga
                          ? `Última descarga: ${fecha.format(new Date(f.ultima_descarga))}`
                          : "Aún no se ha descargado"
                      }
                    >
                      {f.descargas}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-ink-muted lg:table-cell">
                      {fecha.format(new Date(f.actualizado_en))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <a
                          href={`/api/${org.slug}/admin/certificados/${f.id}`}
                          aria-label="Descargar PDF"
                          data-tooltip="Descargar PDF"
                          className="boton-icono con-tooltip"
                        >
                          <Download aria-hidden size={16} strokeWidth={1.75} />
                        </a>
                        {f.plantilla && <BotonRegenerar certificado={f} />}
                        <BotonEliminar id={f.id} nombre={f.nombre} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {paginas > 1 && (
        <nav
          className="flex items-center gap-4 text-small"
          aria-label="Paginación"
        >
          {pagina > 1 && (
            <Link
              className="enlace"
              href={{ query: { q, tipo, pagina: pagina - 1 } }}
            >
              Anterior
            </Link>
          )}
          <span className="text-ink-muted">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link
              className="enlace"
              href={{ query: { q, tipo, pagina: pagina + 1 } }}
            >
              Siguiente
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
