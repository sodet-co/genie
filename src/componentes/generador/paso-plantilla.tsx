"use client";

import { Check, LoaderCircle, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  TAMANOS,
  type Orientacion,
  type Pagina,
  type Tamano,
} from "@/lib/plantilla";
import {
  EVENTO_ACTUAL,
  PLANTILLAS_EVENTO,
  urlFondo,
  type PlantillaEvento,
} from "@/lib/plantillas-evento";
import {
  cargarPlantillaEvento,
  prepararPlantilla,
  type Plantilla,
} from "@/lib/preparar-plantilla";
import { Mensaje } from "./mensaje";
import { Pestana } from "./paso-datos";

export type { Plantilla };

type Props = {
  plantilla: Plantilla | null;
  onCargar: (plantilla: Plantilla) => void;
  tamano: Tamano;
  orientacion: Orientacion;
  onTamano: (tamano: Tamano) => void;
  onOrientacion: (orientacion: Orientacion) => void;
  pagina: Pagina;
};

const URL_EJEMPLO = "/plantilla-ejemplo.html";

export function PasoPlantilla(props: Props) {
  const { plantilla, onCargar, pagina } = props;
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"evento" | "subir">(
    plantilla && !plantilla.predefinida ? "subir" : "evento",
  );
  const [cargando, setCargando] = useState<string | null>(null);

  async function cargar(
    htmlOriginal: string,
    nombreArchivo: string,
    otros: File[],
  ) {
    onCargar(
      await prepararPlantilla(
        htmlOriginal,
        nombreArchivo,
        otros.map((a) => ({ nombre: a.name, datos: a })),
      ),
    );
  }

  async function elegir(p: PlantillaEvento) {
    setError(null);
    setCargando(p.id);
    try {
      onCargar(await cargarPlantillaEvento(p));
      // Los diseños del evento son carta horizontal.
      props.onTamano("carta");
      props.onOrientacion("horizontal");
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo cargar la plantilla. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setCargando(null);
    }
  }

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length === 0) return;
    setError(null);

    const htmls = archivos.filter((a) => /\.html?$/i.test(a.name));
    if (htmls.length !== 1) {
      setError(
        htmls.length === 0
          ? "Incluye el archivo .html de la plantilla."
          : "Selecciona un solo archivo .html (más sus imágenes o fuentes).",
      );
      return;
    }
    try {
      const otros = archivos.filter((a) => a !== htmls[0]);
      await cargar(await htmls[0].text(), htmls[0].name, otros);
    } catch (err) {
      console.error(err);
      setError("No se pudo leer la plantilla.");
    }
  }

  async function usarEjemplo() {
    setError(null);
    try {
      const respuesta = await fetch(URL_EJEMPLO);
      await cargar(await respuesta.text(), "plantilla-ejemplo.html", []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la plantilla de ejemplo.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="flex gap-1 border-b border-border">
        <Pestana activa={modo === "evento"} onClick={() => setModo("evento")}>
          Plantillas del evento
        </Pestana>
        <Pestana activa={modo === "subir"} onClick={() => setModo("subir")}>
          Subir otra plantilla
        </Pestana>
      </div>

      {modo === "evento" ? (
        <div className="flex flex-col gap-3">
          <p className="text-ink-muted">
            {EVENTO_ACTUAL.nombre}. Elige el tipo de certificado.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANTILLAS_EVENTO.map((p) => {
              const activa = plantilla?.predefinida?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegir(p)}
                  disabled={cargando !== null}
                  aria-pressed={activa}
                  className={`flex items-center gap-3 rounded-md border p-2 text-left transition-colors ${
                    activa
                      ? "border-brand bg-brand-soft"
                      : "border-border bg-surface-raised hover:border-border-strong"
                  }`}
                >
                  <Image
                    src={urlFondo(p)}
                    alt=""
                    width={96}
                    height={74}
                    className="h-[74px] w-24 shrink-0 rounded-sm border border-border object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">
                      {p.nombre}
                    </span>
                    <span className="block text-small text-ink-muted">
                      {p.descripcion}
                    </span>
                    <span className="block text-small text-ink-muted">
                      Datos: {p.marcadores.join(", ")}
                    </span>
                  </span>
                  {cargando === p.id ? (
                    <LoaderCircle
                      aria-hidden
                      size={18}
                      className="shrink-0 animate-spin text-ink-muted"
                    />
                  ) : (
                    activa && (
                      <Check
                        aria-hidden
                        size={18}
                        className="shrink-0 text-brand"
                      />
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="text-ink-muted">
            <p>
              Sube un archivo <strong>.html</strong> con los datos variables
              escritos como <code className="codigo">{"{{nombre}}"}</code>,{" "}
              <code className="codigo">{"{{documento}}"}</code>, etc. Si usa
              imágenes o fuentes (por ejemplo{" "}
              <code className="codigo">{'<img src="fondo.png">'}</code>),
              selecciónalas junto con el HTML.
            </p>
            <p className="mt-2">
              <a href={URL_EJEMPLO} download className="enlace">
                Descargar plantilla de ejemplo
              </a>{" "}
              ·{" "}
              <button type="button" onClick={usarEjemplo} className="enlace">
                Probar con la plantilla de ejemplo
              </button>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-end">
            <label className="etiqueta col-span-2">
              <span className="flex items-center gap-2">
                <Upload aria-hidden size={16} strokeWidth={1.75} />
                Archivos de la plantilla
              </span>
              <input
                type="file"
                multiple
                accept=".html,.htm,image/*,.ttf,.otf,.woff,.woff2,.css"
                onChange={alSeleccionar}
                className="archivo"
              />
            </label>

            <label className="etiqueta">
              Tamaño
              <select
                value={props.tamano}
                onChange={(e) => props.onTamano(e.target.value as Tamano)}
                className="campo"
              >
                {Object.entries(TAMANOS).map(([clave, { etiqueta }]) => (
                  <option key={clave} value={clave}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>

            <label className="etiqueta">
              Orientación
              <select
                value={props.orientacion}
                onChange={(e) =>
                  props.onOrientacion(e.target.value as Orientacion)
                }
                className="campo"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </label>

            <p className="col-span-2 text-ink-muted sm:pb-2">
              Diseña el HTML a{" "}
              <strong>
                {pagina.anchoPx} × {pagina.altoPx} px
              </strong>{" "}
              con <code className="codigo">body {"{ margin: 0 }"}</code>.
            </p>
          </div>
        </>
      )}

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      {plantilla && !plantilla.predefinida && (
        <div className="flex flex-col gap-2">
          <p className="text-ink">
            <strong>{plantilla.nombreArchivo}</strong>
            {plantilla.recursos.length > 0 &&
              ` + ${plantilla.recursos.length} archivo(s): ${plantilla.recursos.join(", ")}`}
          </p>
          {plantilla.marcadores.length > 0 ? (
            <p className="flex flex-wrap items-center gap-2 text-ink">
              Marcadores detectados:
              {plantilla.marcadores.map((m) => (
                <code key={m} className="codigo">
                  {`{{${m}}}`}
                </code>
              ))}
            </p>
          ) : (
            <Mensaje tipo="aviso">
              La plantilla no tiene marcadores. Escribe los datos variables como{" "}
              <code>{"{{nombre}}"}</code>.
            </Mensaje>
          )}
          {plantilla.faltantes.length > 0 && (
            <Mensaje tipo="aviso">
              La plantilla usa estos archivos y no los subiste:{" "}
              <strong>{plantilla.faltantes.join(", ")}</strong>. Vuelve a
              seleccionar el HTML junto con ellos.
            </Mensaje>
          )}
          {plantilla.externosFallidos.length > 0 && (
            <Mensaje tipo="aviso">
              No se pudieron descargar estas hojas de estilo, así que sus
              fuentes no saldrán en el PDF:{" "}
              <strong>{plantilla.externosFallidos.join(", ")}</strong>. Revisa
              tu conexión o sube los archivos de fuente junto con el HTML.
            </Mensaje>
          )}
        </div>
      )}
    </div>
  );
}
