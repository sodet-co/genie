import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonGenerar } from "@/componentes/admin/boton-generar";
import { BotonDescargarZip } from "@/componentes/admin/descargar-zip";
import { ListaCertificados } from "@/componentes/admin/lista-certificados";
import { Mensaje } from "@/componentes/generador/mensaje";
import { normalizarBusqueda } from "@/lib/busqueda";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { BuscadorCertificados } from "@/componentes/admin/buscador-certificados";
import { aplicarFiltros, leerFiltros } from "@/lib/servidor/filtros";
import { clienteAdmin, TABLA, usuarioAdmin, type FilaCertificado } from "@/lib/servidor/insforge";
import { puedeRegenerar } from "@/lib/servidor/permisos";
import { BotonRegenerarTodos } from "@/componentes/admin/regenerar";

const POR_PAGINA = 20;

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

// Título y correos en una sola línea secundaria (la fila no crece).
function detalle(f: Pick<Fila, "datos" | "correos">) {
  const correos = f.correos?.length ? f.correos.join(", ") : "Sin correo";
  return f.datos?.titulo ? `${f.datos.titulo} · ${correos}` : correos;
}

export default async function Certificados({
  params,
  searchParams,
}: PageProps<"/[org]/admin">) {
  const org = buscarOrganizacion((await params).org);
  if (!org) notFound();
  const parametros = await searchParams;
  const { q, tipo } = leerFiltros(parametros);
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const regenera = puedeRegenerar((await usuarioAdmin(org.slug))?.email);

  const consulta = clienteAdmin()
    .database.from(TABLA)
    .select(
      "id, clave_original, nombre, tipo, plantilla, datos, correos, descargas, ultima_descarga, actualizado_en",
      { count: "exact" },
    )
    .eq("organizacion", org.slug)
    .order("nombre")
    .order("id")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const { data, count, error } = await aplicarFiltros(consulta, { q, tipo });
  const filas = (data ?? []) as Fila[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginacion = { q, tipo, pagina, paginas, total, mostrados: filas.length };

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
          {total > 0 && (
            <a
              href={`/api/${org.slug}/admin/certificados/excel?${new URLSearchParams({ q, tipo })}`}
              className="boton-secundario w-full sm:w-auto"
              title="Una fila por certificado, con los filtros aplicados"
            >
              <FileSpreadsheet aria-hidden size={16} strokeWidth={1.75} />
              Informe Excel
            </a>
          )}
          {total > 0 && <BotonDescargarZip q={q} tipo={tipo} total={total} />}
          {total > 0 && regenera && <BotonRegenerarTodos />}
          <BotonGenerar />
        </div>
      </div>

      <BuscadorCertificados q={q} tipo={tipo} />

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
          <Paginacion {...paginacion} />
          <ListaCertificados
            filas={filas.map((f) => ({
              id: f.id,
              nombre: f.nombre,
              tipo: f.tipo,
              clave:
                normalizarBusqueda(f.clave_original) !== normalizarBusqueda(f.nombre)
                  ? f.clave_original
                  : "",
              detalle: detalle(f),
              descargas: f.descargas,
              ultimaDescarga: f.ultima_descarga ? fecha.format(new Date(f.ultima_descarga)) : "",
              generado: fecha.format(new Date(f.actualizado_en)),
              // Solo para quien puede regenerar, y solo los hechos con una
              // plantilla del evento (los de "otro evento" no se pueden).
              regenerable:
                regenera && f.plantilla
                  ? {
                      id: f.id,
                      clave_original: f.clave_original,
                      nombre: f.nombre,
                      tipo: f.tipo,
                      plantilla: f.plantilla,
                      datos: f.datos ?? {},
                      correos: f.correos ?? [],
                    }
                  : null,
            }))}
          />
          <Paginacion {...paginacion} />
        </>
      )}
    </div>
  );
}

// Arriba y abajo del listado: "21–40 de 253" con Anterior / Siguiente.
function Paginacion({
  q,
  tipo,
  pagina,
  paginas,
  total,
  mostrados,
}: {
  q: string;
  tipo: string;
  pagina: number;
  paginas: number;
  total: number;
  mostrados: number;
}) {
  const desde = (pagina - 1) * POR_PAGINA + 1;
  const hasta = desde + mostrados - 1;
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 text-small"
      aria-label="Paginación"
    >
      <span className="text-ink-muted">
        {mostrados > 0 ? `${desde}–${hasta} de ${total}` : `0 de ${total}`}
      </span>
      {paginas > 1 && (
        <span className="flex items-center gap-4">
          {pagina > 1 ? (
            <Link className="enlace" href={{ query: { q, tipo, pagina: pagina - 1 } }}>
              Anterior
            </Link>
          ) : (
            <span className="text-ink-muted opacity-50">Anterior</span>
          )}
          <span className="text-ink-muted">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link className="enlace" href={{ query: { q, tipo, pagina: pagina + 1 } }}>
              Siguiente
            </Link>
          ) : (
            <span className="text-ink-muted opacity-50">Siguiente</span>
          )}
        </span>
      )}
    </nav>
  );
}
