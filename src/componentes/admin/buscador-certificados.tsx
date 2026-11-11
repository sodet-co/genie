"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { TIPOS } from "@/lib/tipos";

const ESPERA_MS = 300;

// Búsqueda del listado en tiempo real: al escribir (con una pausa corta) o al
// cambiar el tipo, actualiza la URL sin recargar la página; el servidor vuelve
// a traer solo el listado. La URL sigue siendo compartible (?q=&tipo=).
// En celular no hay encabezados de tabla: el orden se elige aquí.
const ORDENES_CELULAR = [
  ["nombre:asc", "Nombre (A–Z)"],
  ["nombre:desc", "Nombre (Z–A)"],
  ["generado:desc", "Más recientes"],
  ["generado:asc", "Más antiguos"],
  ["descargas:desc", "Más descargados"],
  ["descargas:asc", "Menos descargados"],
  ["tipo:asc", "Tipo"],
] as const;

export function BuscadorCertificados({
  q,
  tipo,
  orden = "nombre",
  dir = "asc",
}: {
  q: string;
  tipo: string;
  orden?: string;
  dir?: string;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [texto, setTexto] = useState(q);
  const [cargando, iniciar] = useTransition();
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si la URL cambia por fuera (atrás/adelante), el campo la sigue.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el campo con la URL
    setTexto(q);
  }, [q]);

  function ir(nuevoTexto: string, nuevoTipo: string, nuevoOrden = `${orden}:${dir}`) {
    const parametros = new URLSearchParams();
    if (nuevoTexto.trim()) parametros.set("q", nuevoTexto.trim());
    if (nuevoTipo) parametros.set("tipo", nuevoTipo);
    // El orden se conserva al buscar (y se omite si es el de siempre).
    const [o, d] = nuevoOrden.split(":");
    if (`${o}:${d}` !== "nombre:asc") {
      parametros.set("orden", o);
      parametros.set("dir", d);
    }
    const destino = parametros.size ? `${ruta}?${parametros}` : ruta;
    // Siempre a la página 1: con otro filtro la página actual puede no existir.
    iniciar(() => router.replace(destino, { scroll: false }));
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => ir(valor, tipo), ESPERA_MS);
  }

  useEffect(() => () => {
    if (espera.current) clearTimeout(espera.current);
  }, []);

  return (
    <form
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (espera.current) clearTimeout(espera.current);
        ir(texto, tipo);
      }}
    >
      <div className="relative col-span-2 sm:max-w-sm sm:flex-1">
        <Search
          aria-hidden
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          name="q"
          value={texto}
          onChange={(e) => alEscribir(e.target.value)}
          placeholder="Buscar por nombre, título o correo"
          aria-label="Buscar"
          autoComplete="off"
          className="campo w-full pl-9 pr-9"
        />
        {texto && (
          <button
            type="button"
            onClick={() => {
              if (espera.current) clearTimeout(espera.current);
              setTexto("");
              ir("", tipo);
            }}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-muted hover:text-ink"
          >
            <X aria-hidden size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>
      <select
        name="tipo"
        value={tipo}
        onChange={(e) => ir(texto, e.target.value)}
        aria-label="Tipo"
        className="campo min-w-0 sm:w-auto"
      >
        <option value="">Todos los tipos</option>
        {TIPOS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.etiqueta}
          </option>
        ))}
      </select>
      <select
        value={`${orden}:${dir}`}
        onChange={(e) => ir(texto, tipo, e.target.value)}
        aria-label="Ordenar por"
        className="campo md:hidden"
      >
        {ORDENES_CELULAR.map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="col-span-2 flex items-center gap-1.5 text-small text-ink-muted empty:hidden sm:col-span-1">
        {cargando && (
          <>
            <LoaderCircle aria-hidden size={14} strokeWidth={1.75} className="animate-spin" />
            Buscando…
          </>
        )}
      </span>
    </form>
  );
}
