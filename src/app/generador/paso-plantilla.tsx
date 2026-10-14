"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import {
  extraerMarcadores,
  incrustarCssExterno,
  incrustarRecursos,
  leerComoDataUrl,
  TAMANOS,
  type Orientacion,
  type Pagina,
  type Tamano,
} from "@/lib/plantilla";
import { Mensaje } from "./mensaje";

export type Plantilla = {
  nombreArchivo: string;
  html: string;
  marcadores: string[];
  recursos: string[];
  faltantes: string[];
  // Hojas de estilo externas (ej. Google Fonts) que no se pudieron descargar.
  externosFallidos: string[];
};

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

  async function cargar(htmlOriginal: string, nombreArchivo: string, otros: File[]) {
    const recursos = new Map<string, string>();
    for (const archivo of otros) {
      recursos.set(archivo.name.toLowerCase(), await leerComoDataUrl(archivo));
    }
    const locales = incrustarRecursos(htmlOriginal, recursos);
    const externos = await incrustarCssExterno(locales.html);
    onCargar({
      nombreArchivo,
      html: externos.html,
      marcadores: extraerMarcadores(htmlOriginal),
      recursos: otros.map((a) => a.name),
      faltantes: locales.faltantes,
      externosFallidos: externos.fallidos,
    });
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
            onChange={(e) => props.onOrientacion(e.target.value as Orientacion)}
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

      {error && (
        <Mensaje tipo="error">
          {error}
        </Mensaje>
      )}

      {plantilla && (
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
