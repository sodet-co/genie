"use client";

import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BotonEliminar } from "@/componentes/admin/boton-eliminar";
import { BotonDescargarZip, type ItemZip } from "@/componentes/admin/descargar-zip";
import { useOrganizacion } from "@/componentes/organizacion";
import { etiquetaTipo } from "@/lib/tipos";
import { BotonRegenerar, BotonRegenerarTodos } from "@/componentes/admin/regenerar";
import type { CertificadoRegenerable } from "@/lib/regenerar";

export type FilaLista = {
  id: string;
  nombre: string;
  tipo: string;
  // Clave de búsqueda cuando no es el nombre (certificados de "otro evento").
  clave: string;
  // Título y correos en una línea.
  detalle: string;
  descargas: number;
  ultimaDescarga: string;
  generado: string;
  // Solo para quien puede regenerar (ver lib/servidor/permisos).
  regenerable: CertificadoRegenerable | null;
};

type Seleccion = Record<string, ItemZip>;

// La selección sobrevive al cambiar de página o de búsqueda (sessionStorage):
// se pueden marcar certificados de varias páginas y bajarlos juntos.
function useSeleccion(org: string) {
  const clave = `seleccion-certificados:${org}`;
  const [seleccion, setSeleccion] = useState<Seleccion>({});
  const cargada = useRef(false);

  useEffect(() => {
    try {
      const guardada = sessionStorage.getItem(clave);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leer el almacenamiento del navegador solo es posible después de montar
      if (guardada) setSeleccion(JSON.parse(guardada));
    } catch {
      // Sin almacenamiento (modo privado): la selección vive solo en esta página.
    }
    cargada.current = true;
  }, [clave]);

  useEffect(() => {
    if (!cargada.current) return;
    try {
      sessionStorage.setItem(clave, JSON.stringify(seleccion));
    } catch {
      // Ídem.
    }
  }, [clave, seleccion]);

  return [seleccion, setSeleccion] as const;
}

export function ListaCertificados({
  filas,
  puedeRegenerar = false,
}: {
  filas: FilaLista[];
  // Solo la cuenta autorizada ve "Regenerar" en la barra de seleccionados.
  puedeRegenerar?: boolean;
}) {
  const org = useOrganizacion();
  const [seleccion, setSeleccion] = useSeleccion(org.slug);
  const marcadas = Object.values(seleccion);
  const enPagina = filas.filter((f) => seleccion[f.id]).length;
  const todasPagina = filas.length > 0 && enPagina === filas.length;

  function alternar(f: FilaLista) {
    setSeleccion((actual) => {
      const nueva = { ...actual };
      if (nueva[f.id]) delete nueva[f.id];
      else nueva[f.id] = { id: f.id, nombre: f.nombre, tipo: f.tipo };
      return nueva;
    });
  }

  function alternarPagina() {
    setSeleccion((actual) => {
      const nueva = { ...actual };
      for (const f of filas) {
        if (todasPagina) delete nueva[f.id];
        else nueva[f.id] = { id: f.id, nombre: f.nombre, tipo: f.tipo };
      }
      return nueva;
    });
  }

  const casillaPagina = (
    <CasillaPagina
      marcada={todasPagina}
      indeterminada={enPagina > 0 && !todasPagina}
      onCambiar={alternarPagina}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {marcadas.length > 0 && (
        <div
          className="sticky top-2 z-10 flex flex-col gap-2 rounded-md border border-brand bg-surface-raised p-3 shadow-card sm:flex-row sm:items-center sm:justify-between"
          role="region"
          aria-label="Certificados seleccionados"
        >
          <p className="font-medium text-ink">
            {marcadas.length} seleccionado(s)
            {marcadas.length > enPagina && (
              <span className="font-normal text-ink-muted">
                {" "}
                · {marcadas.length - enPagina} de otras páginas
              </span>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <BotonDescargarZip seleccion={marcadas} />
            {puedeRegenerar && <BotonRegenerarTodos ids={marcadas.map((m) => m.id)} />}
            <button
              type="button"
              onClick={() => setSeleccion({})}
              className="boton-secundario"
            >
              <X aria-hidden size={16} strokeWidth={1.75} />
              Quitar selección
            </button>
          </div>
        </div>
      )}

      {/* Celular: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        <label className="flex items-center gap-2 text-small text-ink-muted">
          {casillaPagina}
          Seleccionar los de esta página
        </label>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
          {filas.map((f) => (
            <li key={f.id} className="flex gap-3 p-3">
              <input
                type="checkbox"
                checked={Boolean(seleccion[f.id])}
                onChange={() => alternar(f)}
                aria-label={`Seleccionar ${f.nombre}`}
                className="mt-1 size-4 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium [overflow-wrap:anywhere]">{f.nombre}</p>
                  <span className="shrink-0 rounded-sm bg-surface-sunken px-2 py-0.5 text-small text-ink-muted">
                    {etiquetaTipo(f.tipo)}
                  </span>
                </div>
                <p className="truncate text-small text-ink-muted" title={f.detalle}>
                  {f.detalle}
                </p>
                <p className="text-small text-ink-muted">
                  {f.descargas} descarga(s) · generado {f.generado}
                </p>
                <div className="mt-1 flex gap-2">
                  <a
                    href={`/api/${org.slug}/admin/certificados/${f.id}`}
                    className="boton-secundario flex-1"
                  >
                    <Download aria-hidden size={16} strokeWidth={1.75} />
                    PDF
                  </a>
                  {f.regenerable && <BotonRegenerar certificado={f.regenerable} comoBoton />}
                  <BotonEliminar id={f.id} nombre={f.nombre} comoBoton />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pantallas grandes: tabla */}
      <div className="hidden overflow-hidden rounded-md border border-border bg-surface-raised md:block">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-surface-sunken text-label uppercase text-ink-muted">
            <tr>
              <th className="w-10 py-2.5 pl-3 pr-0">{casillaPagina}</th>
              <th className="px-3 py-2.5 font-medium">Nombre</th>
              <th className="px-3 py-2.5 font-medium">Tipo</th>
              <th className="px-3 py-2.5 text-right font-medium">Descargas</th>
              <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Generado</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.map((f) => (
              <tr key={f.id} className={seleccion[f.id] ? "bg-brand-soft/40" : undefined}>
                <td className="py-2.5 pl-3 pr-0 align-top">
                  <input
                    type="checkbox"
                    checked={Boolean(seleccion[f.id])}
                    onChange={() => alternar(f)}
                    aria-label={`Seleccionar ${f.nombre}`}
                    className="mt-0.5 size-4"
                  />
                </td>
                {/* w-full + max-w-0: el nombre usa el espacio que sobra y se
                    corta con "…" en vez de ensanchar la tabla. */}
                <td className="w-full max-w-0 px-3 py-2.5">
                  <span className="block truncate font-medium" title={f.nombre}>
                    {f.nombre}
                  </span>
                  {f.clave && (
                    <span className="block truncate text-small text-ink-muted">
                      Clave: {f.clave}
                    </span>
                  )}
                  <span className="block truncate text-small text-ink-muted" title={f.detalle}>
                    {f.detalle}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{etiquetaTipo(f.tipo)}</td>
                <td
                  className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums"
                  title={f.ultimaDescarga ? `Última descarga: ${f.ultimaDescarga}` : "Aún no se ha descargado"}
                >
                  {f.descargas}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2.5 text-ink-muted lg:table-cell">
                  {f.generado}
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
                    {f.regenerable && <BotonRegenerar certificado={f.regenerable} />}
                    <BotonEliminar id={f.id} nombre={f.nombre} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CasillaPagina({
  marcada,
  indeterminada,
  onCambiar,
}: {
  marcada: boolean;
  indeterminada: boolean;
  onCambiar: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminada;
  }, [indeterminada]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={marcada}
      onChange={onCambiar}
      aria-label="Seleccionar todos los de esta página"
      className="size-4 align-middle"
    />
  );
}
