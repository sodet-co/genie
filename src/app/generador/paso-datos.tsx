"use client";

import { Download, Eye, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { descargarModelo, leerExcel, type ResultadoExcel } from "@/lib/excel";
import type { Registro } from "@/lib/plantilla";
import { Mensaje } from "./mensaje";

type Props = {
  marcadores: string[];
  registros: Registro[];
  onCambiar: (registros: Registro[]) => void;
  indicePrevia: number;
  onVer: (indice: number) => void;
  onDescargar: (registro: Registro) => void;
  ocupado: boolean;
};

const FILAS_VISIBLES = 50;

export function PasoDatos(props: Props) {
  const { marcadores, registros, onCambiar } = props;
  const [pestana, setPestana] = useState<"manual" | "excel">("manual");

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" className="flex gap-1 border-b border-border">
        <Pestana activa={pestana === "manual"} onClick={() => setPestana("manual")}>
          A mano
        </Pestana>
        <Pestana activa={pestana === "excel"} onClick={() => setPestana("excel")}>
          Desde Excel
        </Pestana>
      </div>

      {pestana === "manual" ? (
        <FormularioManual
          marcadores={marcadores}
          onAgregar={(r) => onCambiar([...registros, r])}
        />
      ) : (
        <CargaExcel
          marcadores={marcadores}
          onImportar={(nuevos) => onCambiar([...registros, ...nuevos])}
        />
      )}

      <TablaRegistros {...props} />
    </div>
  );
}

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={`-mb-px h-11 border-b-2 px-4 font-semibold ${
        activa
          ? "border-brand text-brand"
          : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FormularioManual({
  marcadores,
  onAgregar,
}: {
  marcadores: string[];
  onAgregar: (registro: Registro) => void;
}) {
  const [valores, setValores] = useState<Registro>({});

  if (marcadores.length === 0) {
    return (
      <p className="text-ink-muted">
        La plantilla no tiene marcadores que llenar.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const registro = Object.fromEntries(
          marcadores.map((m) => [m, (valores[m] ?? "").trim()]),
        );
        if (Object.values(registro).every((v) => v === "")) return;
        onAgregar(registro);
        setValores({});
        (e.currentTarget.elements[0] as HTMLElement | undefined)?.focus();
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {marcadores.map((m) => (
          <label
            key={m}
            className="etiqueta"
          >
            {m}
            <input
              value={valores[m] ?? ""}
              onChange={(e) => setValores({ ...valores, [m]: e.target.value })}
              className="campo"
            />
          </label>
        ))}
      </div>
      <div>
        <button type="submit" className="boton-primario">
          <Plus aria-hidden size={20} strokeWidth={1.75} />
          Agregar a la lista
        </button>
      </div>
    </form>
  );
}

function CargaExcel({
  marcadores,
  onImportar,
}: {
  marcadores: string[];
  onImportar: (registros: Registro[]) => void;
}) {
  const [resultado, setResultado] = useState<ResultadoExcel | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    setResultado(null);
    try {
      const leido = await leerExcel(archivo, marcadores);
      if (leido.sinColumna.length === marcadores.length) {
        setError(
          "Ninguna columna del archivo coincide con los marcadores de la plantilla. La primera fila debe tener los nombres de los marcadores.",
        );
        return;
      }
      setResultado(leido);
      onImportar(leido.registros);
    } catch (err) {
      console.error(err);
      setError("No se pudo leer el archivo. Usa .xlsx, .xls o .csv.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-muted">
        La primera fila debe tener una columna por marcador (
        {marcadores.map((m, i) => (
          <span key={m}>
            {i > 0 && ", "}
            <strong>{m}</strong>
          </span>
        ))}
        ). No importan mayúsculas, tildes ni el orden de las columnas.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <button
          type="button"
          onClick={() => descargarModelo(marcadores)}
          className="boton-secundario"
        >
          <Download aria-hidden size={20} strokeWidth={1.75} />
          Descargar Excel modelo
        </button>
        <label className="etiqueta">
          <span className="flex items-center gap-2">
            <Upload aria-hidden size={20} strokeWidth={1.75} />
            Archivo con los registros
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={alSeleccionar}
            className="archivo"
          />
        </label>
      </div>

      {error && (
        <Mensaje tipo="error">
          {error}
        </Mensaje>
      )}

      {resultado && (
        <div className="flex flex-col gap-2">
          <Mensaje tipo="ok">
            Se agregaron {resultado.registros.length} registro(s) a la lista.
          </Mensaje>
          {resultado.sinColumna.length > 0 && (
            <Mensaje tipo="aviso">
              Sin columna en el archivo (quedarán en blanco):{" "}
              <strong>{resultado.sinColumna.join(", ")}</strong>
            </Mensaje>
          )}
          {resultado.sobrantes.length > 0 && (
            <p className="text-ink-muted">
              Columnas ignoradas: {resultado.sobrantes.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TablaRegistros({
  marcadores,
  registros,
  onCambiar,
  indicePrevia,
  onVer,
  onDescargar,
  ocupado,
}: Props) {
  if (registros.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-ink-muted">
        Aún no hay registros.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">
          {registros.length} registro(s)
          {registros.length > FILAS_VISIBLES &&
            ` · se muestran los primeros ${FILAS_VISIBLES}`}
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("¿Quitar todos los registros de la lista?")) {
              onCambiar([]);
            }
          }}
          className="boton-peligro"
        >
          <Trash2 aria-hidden size={20} strokeWidth={1.75} />
          Vaciar lista
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-surface-sunken text-label uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">#</th>
              {marcadores.map((m) => (
                <th key={m} className="px-3 py-3 font-semibold">
                  {m}
                </th>
              ))}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registros.slice(0, FILAS_VISIBLES).map((registro, i) => (
              <tr key={i} className={i === indicePrevia ? "bg-brand-soft" : undefined}>
                <td className="px-3 py-3 text-ink-muted">{i + 1}</td>
                {marcadores.map((m) => (
                  <td key={m} className="max-w-56 truncate px-3 py-3">
                    {registro[m]}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => onVer(i)} className="enlace inline-flex items-center gap-1">
                      <Eye aria-hidden size={16} strokeWidth={1.75} />
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => onDescargar(registro)}
                      disabled={ocupado}
                      className="enlace inline-flex items-center gap-1"
                    >
                      <Download aria-hidden size={16} strokeWidth={1.75} />
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onCambiar(registros.filter((_, j) => j !== i))}
                      disabled={ocupado}
                      className="enlace inline-flex items-center gap-1 text-danger"
                    >
                      <Trash2 aria-hidden size={16} strokeWidth={1.75} />
                      Quitar
                    </button>
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
