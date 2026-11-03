"use client";

import { CloudUpload, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Cancelado,
  publicarLote,
  revisarClaves,
  SesionVencida,
  type ResultadoPublicacion,
} from "@/lib/generar";
import type { Pagina, Registro } from "@/lib/plantilla";
import { etiquetaTipo, TIPOS, type TipoCertificado } from "@/lib/tipos";
import { Mensaje } from "./mensaje";

type Props = {
  html: string;
  pagina: Pagina;
  marcadores: string[];
  registros: Registro[];
  campoClave: string;
  onCampoClave: (campo: string) => void;
  campoNombre: string;
  onCampoNombre: (campo: string) => void;
  tipo: TipoCertificado | "";
  onTipo: (tipo: TipoCertificado | "") => void;
  ocupado: boolean;
  onOcupado: (ocupado: boolean) => void;
};

const LIMITE_RECOMENDADO = 300;
const PROBLEMAS_VISIBLES = 10;

export function PasoGenerar(props: Props) {
  const { registros, marcadores, ocupado, onOcupado } = props;
  const [hechos, setHechos] = useState(0);
  const [resultado, setResultado] = useState<ResultadoPublicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelado = useRef(false);

  const problemas = revisarClaves(registros, props.campoClave);

  async function publicar() {
    if (!props.tipo) return;
    const tipo = props.tipo;
    cancelado.current = false;
    setHechos(0);
    setResultado(null);
    setError(null);
    onOcupado(true);
    try {
      setResultado(
        await publicarLote(registros, {
          html: props.html,
          pagina: props.pagina,
          campoClave: props.campoClave,
          campoNombre: props.campoNombre,
          tipo,
          onProgreso: setHechos,
          estaCancelado: () => cancelado.current,
        }),
      );
    } catch (e) {
      if (e instanceof Cancelado) {
        setError("Publicación cancelada. Los certificados ya subidos quedan publicados.");
      } else if (e instanceof SesionVencida) {
        setError("Tu sesión venció. Vuelve a ingresar y publica de nuevo.");
      } else {
        console.error(e);
        setError("Ocurrió un error al publicar los certificados.");
      }
    } finally {
      onOcupado(false);
    }
  }

  const porcentaje = registros.length ? Math.round((hechos / registros.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta sm:col-span-2 sm:max-w-sm">
          Tipo de certificado
          <select
            value={props.tipo}
            onChange={(e) => props.onTipo(e.target.value as TipoCertificado | "")}
            disabled={ocupado}
            required
            className="campo"
          >
            <option value="">Elige el tipo…</option>
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.etiqueta}
              </option>
            ))}
          </select>
          <span className="text-small font-normal text-ink-muted">
            Debe corresponder a la plantilla que subiste.
          </span>
        </label>
        <label className="etiqueta">
          Clave de búsqueda
          <select
            value={props.campoClave}
            onChange={(e) => props.onCampoClave(e.target.value)}
            disabled={ocupado}
            className="campo"
          >
            {marcadores.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-small font-normal text-ink-muted">
            Lo que la persona escribe en la página pública para encontrar su certificado.
          </span>
        </label>
        <label className="etiqueta">
          Nombre de la persona
          <select
            value={props.campoNombre}
            onChange={(e) => props.onCampoNombre(e.target.value)}
            disabled={ocupado}
            className="campo"
          >
            {marcadores.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-small font-normal text-ink-muted">
            Se muestra en el listado y da nombre al archivo.
          </span>
        </label>
      </div>

      <Mensaje tipo="aviso">
        Cada persona tiene un solo certificado: si ya existe uno con la misma clave (de cualquier tipo), se reemplaza por el nuevo.
      </Mensaje>

      {problemas.length > 0 && (
        <div className="alerta-error flex flex-col gap-1" role="alert">
          <p className="font-medium">
            Corrige {problemas.length} registro(s) antes de publicar:
          </p>
          <ul className="list-disc pl-5">
            {problemas.slice(0, PROBLEMAS_VISIBLES).map((p) => (
              <li key={p.fila}>
                Fila {p.fila}: {p.motivo}
              </li>
            ))}
            {problemas.length > PROBLEMAS_VISIBLES && (
              <li>y {problemas.length - PROBLEMAS_VISIBLES} más.</li>
            )}
          </ul>
        </div>
      )}

      {registros.length > LIMITE_RECOMENDADO && (
        <Mensaje tipo="aviso">
          Son {registros.length} registros. Si el navegador se pone lento,
          divide el Excel en lotes de hasta {LIMITE_RECOMENDADO}.
        </Mensaje>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={publicar}
          disabled={ocupado || problemas.length > 0 || !props.tipo}
          className="boton-primario"
        >
          <CloudUpload aria-hidden size={16} strokeWidth={1.75} />
          Generar y publicar {registros.length} certificado(s)
          {props.tipo && ` de ${etiquetaTipo(props.tipo).toLowerCase()}`}
        </button>
        {ocupado && hechos < registros.length && (
          <button
            type="button"
            onClick={() => (cancelado.current = true)}
            className="boton-secundario"
          >
            <X aria-hidden size={16} strokeWidth={1.75} />
            Cancelar
          </button>
        )}
      </div>

      {ocupado && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-sunken">
            <div className="h-full bg-brand transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="text-ink-muted">
            Publicando {Math.min(hechos + 1, registros.length)} de {registros.length}…
          </p>
        </div>
      )}

      {resultado && (
        <div className="flex flex-col gap-2">
          <Mensaje tipo={resultado.fallidos.length ? "aviso" : "ok"}>
            {resultado.nuevos} nuevo(s) y {resultado.reemplazados} reemplazado(s).{" "}
            <Link href="/admin" className="enlace">
              Ver certificados
            </Link>
          </Mensaje>
          {resultado.cambiosTipo.length > 0 && (
            <Mensaje tipo="aviso">
              {resultado.cambiosTipo.length} persona(s) tenían un certificado de otro tipo y
              se reemplazó: {resultado.cambiosTipo
                .slice(0, PROBLEMAS_VISIBLES)
                .map((c) => `fila ${c.fila} (antes ${etiquetaTipo(c.tipoAnterior).toLowerCase()})`)
                .join(", ")}
              {resultado.cambiosTipo.length > PROBLEMAS_VISIBLES && "…"}
            </Mensaje>
          )}
          {resultado.fallidos.length > 0 && (
            <div className="alerta-error flex flex-col gap-1" role="alert">
              <p className="font-medium">{resultado.fallidos.length} no se publicaron:</p>
              <ul className="list-disc pl-5">
                {resultado.fallidos.slice(0, PROBLEMAS_VISIBLES).map((p) => (
                  <li key={p.fila}>
                    Fila {p.fila}: {p.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  );
}
