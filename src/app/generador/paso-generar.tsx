"use client";

import { Download, X } from "lucide-react";
import { useRef, useState } from "react";
import { Cancelado, generarLote, type ModoSalida } from "@/lib/generar";
import type { Pagina, Registro } from "@/lib/plantilla";
import { Mensaje } from "./mensaje";

type Props = {
  html: string;
  pagina: Pagina;
  marcadores: string[];
  registros: Registro[];
  campoNombre: string;
  onCampoNombre: (campo: string) => void;
  ocupado: boolean;
  onOcupado: (ocupado: boolean) => void;
};

// Cada página pesa ~0,5 MB en memoria; más allá de esto el navegador puede
// quedarse corto, sobre todo en equipos modestos.
const LIMITE_RECOMENDADO = 300;

export function PasoGenerar(props: Props) {
  const { registros, ocupado, onOcupado } = props;
  const [modo, setModo] = useState<ModoSalida>("zip");
  const [hechos, setHechos] = useState(0);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(
    null,
  );
  const cancelado = useRef(false);

  async function generar() {
    cancelado.current = false;
    setHechos(0);
    setMensaje(null);
    onOcupado(true);
    try {
      await generarLote(registros, modo, {
        html: props.html,
        pagina: props.pagina,
        campoNombre: props.campoNombre,
        onProgreso: setHechos,
        estaCancelado: () => cancelado.current,
      });
      setMensaje({
        tipo: "ok",
        texto: `Listo: ${registros.length} certificado(s) generados.`,
      });
    } catch (e) {
      if (e instanceof Cancelado) {
        setMensaje({ tipo: "error", texto: "Generación cancelada." });
      } else {
        console.error(e);
        setMensaje({
          tipo: "error",
          texto: "Ocurrió un error al generar los PDF. Revisa la plantilla e inténtalo de nuevo.",
        });
      }
    } finally {
      onOcupado(false);
    }
  }

  const porcentaje = registros.length ? Math.round((hechos / registros.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-6">
        {props.marcadores.length > 0 && (
          <label className="etiqueta">
            Nombrar cada archivo con
            <select
              value={props.campoNombre}
              onChange={(e) => props.onCampoNombre(e.target.value)}
              disabled={ocupado}
              className="campo"
            >
              {props.marcadores.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 font-semibold text-ink">Formato</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="modo"
              checked={modo === "zip"}
              onChange={() => setModo("zip")}
              disabled={ocupado}
            />
            ZIP con un PDF por registro
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="modo"
              checked={modo === "unico"}
              onChange={() => setModo("unico")}
              disabled={ocupado}
            />
            Un solo PDF con todos
          </label>
        </fieldset>
      </div>

      {registros.length > LIMITE_RECOMENDADO && (
        <Mensaje tipo="aviso">
          Son {registros.length} registros. Si el navegador se pone lento,
          divide el Excel en lotes de hasta {LIMITE_RECOMENDADO}.
        </Mensaje>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={generar}
          disabled={ocupado}
          className="boton-primario"
        >
          <Download aria-hidden size={20} strokeWidth={1.75} />
          Generar {registros.length} certificado(s)
        </button>
        {ocupado && hechos < registros.length && (
          <button
            type="button"
            onClick={() => (cancelado.current = true)}
            className="boton-secundario"
          >
            <X aria-hidden size={20} strokeWidth={1.75} />
            Cancelar
          </button>
        )}
      </div>

      {ocupado && (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-ink-muted">
            Generando {Math.min(hechos + 1, registros.length)} de {registros.length}…
          </p>
        </div>
      )}

      {mensaje && (
        <Mensaje tipo={mensaje.tipo}>{mensaje.texto}</Mensaje>
      )}
    </div>
  );
}
