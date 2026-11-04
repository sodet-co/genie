"use client";

import { CloudUpload, X } from "lucide-react";
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
import { useOrganizacion } from "@/componentes/organizacion";
import { Mensaje } from "./mensaje";
import { ListaProblemas, ResumenPublicacion } from "./resultado-publicacion";

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

export function PasoGenerar(props: Props) {
  const { registros, marcadores, ocupado, onOcupado } = props;
  const [hechos, setHechos] = useState(0);
  const [resultado, setResultado] = useState<ResultadoPublicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelado = useRef(false);
  const org = useOrganizacion();

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
        await publicarLote(
          registros.map((registro, i) => ({
            fila: i + 1,
            registro,
            html: props.html,
            tipo,
          })),
          {
            organizacion: org.slug,
            pagina: props.pagina,
            campoClave: props.campoClave,
            campoNombre: props.campoNombre,
            onProgreso: setHechos,
            estaCancelado: () => cancelado.current,
          },
        ),
      );
    } catch (e) {
      if (e instanceof Cancelado) {
        setError(
          "Publicación cancelada. Los certificados ya subidos quedan publicados.",
        );
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

  const porcentaje = registros.length
    ? Math.round((hechos / registros.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta sm:col-span-2 sm:max-w-sm">
          Tipo de certificado
          <select
            value={props.tipo}
            onChange={(e) =>
              props.onTipo(e.target.value as TipoCertificado | "")
            }
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
            Lo que la persona escribe en la página pública para encontrar su
            certificado.
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
        Cada persona tiene un solo certificado: si ya existe uno con la misma
        clave (de cualquier tipo), se reemplaza por el nuevo.
      </Mensaje>

      <ListaProblemas
        titulo={`Corrige ${problemas.length} registro(s) antes de publicar:`}
        problemas={problemas}
      />

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
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-ink-muted">
            Publicando {Math.min(hechos + 1, registros.length)} de{" "}
            {registros.length}…
          </p>
        </div>
      )}

      {resultado && <ResumenPublicacion resultado={resultado} />}

      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  );
}
