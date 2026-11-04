"use client";

import {
  CloudUpload,
  Download,
  Eye,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialogo } from "@/componentes/dialogo";
import { Mensaje } from "@/componentes/generador/mensaje";
import { Pestana } from "@/componentes/generador/paso-datos";
import {
  ListaProblemas,
  ResumenPublicacion,
} from "@/componentes/generador/resultado-publicacion";
import { VistaPrevia } from "@/componentes/generador/vista-previa";
import {
  leerExcelEvento,
  revisarPersonas,
  type PersonaEvento,
} from "@/lib/excel-evento";
import {
  Cancelado,
  publicarLote,
  SesionVencida,
  type ResultadoPublicacion,
} from "@/lib/generar";
import { medidasPagina } from "@/lib/plantilla";
import {
  buscarPlantillaPorTipo,
  PLANTILLAS_EVENTO,
} from "@/lib/plantillas-evento";
import {
  cargarPlantillaEvento,
  type Plantilla,
} from "@/lib/preparar-plantilla";
import { etiquetaTipo, TIPOS, type TipoCertificado } from "@/lib/tipos";

const PAGINA = medidasPagina("carta", "horizontal");
const FILAS_VISIBLES = 100;
const usaTitulo = (tipo: TipoCertificado | "") =>
  buscarPlantillaPorTipo(tipo)?.marcadores.includes("titulo") ?? false;

type Plantillas = Partial<Record<TipoCertificado, Plantilla>>;

// Carga del evento actual dentro del popup de "Generar certificados": un Excel
// con Nombre, Tipo (lista desplegable) y Título, o personas una por una. Cada
// fila sale con la plantilla de su tipo.
export function GeneradorEvento({
  onOcupado,
}: {
  onOcupado: (ocupado: boolean) => void;
}) {
  const [plantillas, setPlantillas] = useState<Plantillas>({});
  const [errorPlantillas, setErrorPlantillas] = useState(false);
  const [personas, setPersonas] = useState<PersonaEvento[]>([]);
  const [pestana, setPestana] = useState<"excel" | "manual">("excel");
  const [previa, setPrevia] = useState<PersonaEvento | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all(
      PLANTILLAS_EVENTO.map(
        async (p) => [p.tipo, await cargarPlantillaEvento(p)] as const,
      ),
    )
      .then(
        (cargadas) => vigente && setPlantillas(Object.fromEntries(cargadas)),
      )
      .catch((e) => {
        console.error(e);
        if (vigente) setErrorPlantillas(true);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const problemas = useMemo(() => revisarPersonas(personas), [personas]);
  const problemaPorFila = useMemo(
    () => new Map(problemas.map((p) => [p.fila, p.motivo])),
    [problemas],
  );

  return (
    <div className="flex flex-col gap-5">
      {errorPlantillas && (
        <Mensaje tipo="error">
          No se pudieron cargar las plantillas. Recarga la página.
        </Mensaje>
      )}

      <div role="tablist" className="flex gap-1 border-b border-border">
        <Pestana
          activa={pestana === "excel"}
          onClick={() => setPestana("excel")}
        >
          Desde Excel
        </Pestana>
        <Pestana
          activa={pestana === "manual"}
          onClick={() => setPestana("manual")}
        >
          Una persona
        </Pestana>
      </div>
      {pestana === "excel" ? (
        <CargaExcel
          onImportar={(nuevas) => setPersonas([...personas, ...nuevas])}
        />
      ) : (
        <FormularioPersona
          onAgregar={(p) => setPersonas([...personas, p])}
          onPrevisualizar={setPrevia}
        />
      )}

      <TablaPersonas
        personas={personas}
        problemaPorFila={problemaPorFila}
        onPrevisualizar={setPrevia}
        onCambiar={setPersonas}
      />

      {personas.length > 0 && (
        <Publicar
          personas={personas}
          plantillas={plantillas}
          problemas={problemas}
          onOcupado={onOcupado}
        />
      )}

      <Dialogo
        abierto={previa !== null}
        onCerrar={() => setPrevia(null)}
        titulo="Vista previa"
        descripcion={
          previa &&
          `${previa.nombre || "Sin nombre"} · ${previa.tipo ? etiquetaTipo(previa.tipo) : "sin tipo"}`
        }
        ancho="sm:max-w-4xl"
      >
        {previa && <ContenidoPrevia persona={previa} plantillas={plantillas} />}
      </Dialogo>
    </div>
  );
}

function ContenidoPrevia({
  persona,
  plantillas,
}: {
  persona: PersonaEvento;
  plantillas: Plantillas;
}) {
  if (!persona.tipo)
    return <Mensaje tipo="aviso">Elige un tipo de certificado válido.</Mensaje>;
  const plantilla = plantillas[persona.tipo];
  if (!plantilla) return <p className="text-ink-muted">Cargando plantilla…</p>;
  return (
    <VistaPrevia
      html={plantilla.html}
      marcadores={plantilla.marcadores}
      registro={{ nombre: persona.nombre, titulo: persona.titulo }}
      pagina={PAGINA}
    />
  );
}

function CargaExcel({
  onImportar,
}: {
  onImportar: (personas: PersonaEvento[]) => void;
}) {
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setMensaje(null);
    try {
      const { personas, faltan } = await leerExcelEvento(archivo);
      if (faltan.length) {
        setMensaje({
          tipo: "error",
          texto: `Al archivo le faltan las columnas: ${faltan.join(", ")}. Usa el Excel modelo.`,
        });
        return;
      }
      onImportar(personas);
      setMensaje({
        tipo: "ok",
        texto: `Se agregaron ${personas.length} persona(s) a la lista.`,
      });
    } catch (err) {
      console.error(err);
      setMensaje({
        tipo: "error",
        texto: "No se pudo leer el archivo. Usa .xlsx, .xls o .csv.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-muted">
        El modelo tiene tres columnas: <strong>Nombre</strong>,{" "}
        <strong>Tipo</strong> (lista desplegable) y <strong>Título</strong>{" "}
        (solo para ponente, conferencista y coordinador de mesa).
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <a
          href="/api/admin/modelo-excel"
          className="boton-secundario self-start"
        >
          <Download aria-hidden size={16} strokeWidth={1.75} />
          Descargar Excel modelo
        </a>
        <label className="etiqueta">
          <span className="flex items-center gap-2">
            <Upload aria-hidden size={16} strokeWidth={1.75} />
            Excel con las personas
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={alSeleccionar}
            className="archivo"
          />
        </label>
      </div>
      {mensaje && <Mensaje tipo={mensaje.tipo}>{mensaje.texto}</Mensaje>}
    </div>
  );
}

function FormularioPersona({
  onAgregar,
  onPrevisualizar,
}: {
  onAgregar: (persona: PersonaEvento) => void;
  onPrevisualizar: (persona: PersonaEvento) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCertificado | "">("");
  const [titulo, setTitulo] = useState("");
  const conTitulo = usaTitulo(tipo);

  const persona = (): PersonaEvento => ({
    nombre: nombre.trim().replace(/\s+/g, " "),
    tipo,
    tipoOriginal: tipo ? etiquetaTipo(tipo) : "",
    titulo: conTitulo ? titulo.trim().replace(/\s+/g, " ") : "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAgregar(persona());
        setNombre("");
        setTitulo("");
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="campo"
          />
        </label>
        <label className="etiqueta">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCertificado | "")}
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
        </label>
        {conTitulo && (
          <label className="etiqueta sm:col-span-2">
            Título
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="campo"
            />
          </label>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="boton-primario">
          <Plus aria-hidden size={16} strokeWidth={1.75} />
          Agregar a la lista
        </button>
        <button
          type="button"
          onClick={() => onPrevisualizar(persona())}
          disabled={!tipo}
          className="boton-secundario"
        >
          <Eye aria-hidden size={16} strokeWidth={1.75} />
          Previsualizar
        </button>
      </div>
    </form>
  );
}

function TablaPersonas({
  personas,
  problemaPorFila,
  onPrevisualizar,
  onCambiar,
}: {
  personas: PersonaEvento[];
  problemaPorFila: Map<number, string>;
  onPrevisualizar: (persona: PersonaEvento) => void;
  onCambiar: (personas: PersonaEvento[]) => void;
}) {
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);

  if (personas.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border-strong bg-surface p-6 text-center text-ink-muted">
        Aún no hay personas en la lista.
      </p>
    );
  }

  const porTipo = TIPOS.map((t) => ({
    ...t,
    total: personas.filter((p) => p.tipo === t.id).length,
  })).filter((t) => t.total > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-ink">
          {personas.length} persona(s)
          {porTipo.length > 0 && (
            <span className="font-normal text-ink-muted">
              {" · "}
              {porTipo
                .map((t) => `${t.total} ${t.etiqueta.toLowerCase()}`)
                .join(", ")}
            </span>
          )}
        </p>
        {confirmarVaciar ? (
          <span className="flex items-center gap-3 text-small">
            ¿Quitar a todas?
            <button
              type="button"
              onClick={() => {
                onCambiar([]);
                setConfirmarVaciar(false);
              }}
              className="enlace text-danger"
            >
              Sí, vaciar
            </button>
            <button
              type="button"
              onClick={() => setConfirmarVaciar(false)}
              className="enlace"
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarVaciar(true)}
            className="boton-peligro"
          >
            <Trash2 aria-hidden size={16} strokeWidth={1.75} />
            Vaciar lista
          </button>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised sm:hidden">
        {personas.slice(0, FILAS_VISIBLES).map((p, i) => {
          const problema = problemaPorFila.get(i + 1);
          return (
            <li key={i} className="flex flex-col gap-1.5 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium [overflow-wrap:anywhere]">
                  <span className="mr-1.5 font-normal text-ink-muted">
                    {i + 1}.
                  </span>
                  {p.nombre || "—"}
                </p>
                <span
                  className={`shrink-0 rounded-sm bg-surface-sunken px-2 py-0.5 text-small ${p.tipo ? "text-ink-muted" : "text-danger"}`}
                >
                  {p.tipo ? etiquetaTipo(p.tipo) : p.tipoOriginal || "Sin tipo"}
                </span>
              </div>
              {p.titulo && (
                <p className="text-small text-ink-muted">{p.titulo}</p>
              )}
              {problema && <p className="text-small text-danger">{problema}</p>}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => onPrevisualizar(p)}
                  className="boton-secundario flex-1"
                >
                  <Eye aria-hidden size={16} strokeWidth={1.75} />
                  Previsualizar
                </button>
                <button
                  type="button"
                  onClick={() => onCambiar(personas.filter((_, j) => j !== i))}
                  aria-label={`Quitar a ${p.nombre || "esta persona"}`}
                  className="boton-peligro"
                >
                  <Trash2 aria-hidden size={16} strokeWidth={1.75} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto rounded-md border border-border bg-surface-raised sm:block">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-surface-sunken text-label uppercase text-ink-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Nombre</th>
              <th className="px-3 py-2.5 font-medium">Tipo</th>
              <th className="px-3 py-2.5 font-medium">Título</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {personas.slice(0, FILAS_VISIBLES).map((p, i) => {
              const problema = problemaPorFila.get(i + 1);
              return (
                <tr key={i}>
                  <td className="px-3 py-2.5 align-top text-ink-muted">
                    {i + 1}
                  </td>
                  <td className="max-w-64 px-3 py-2.5 align-top">
                    <span className="block truncate">{p.nombre || "—"}</span>
                    {problema && (
                      <span className="block text-small text-danger">
                        {problema}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top">
                    {p.tipo ? (
                      etiquetaTipo(p.tipo)
                    ) : (
                      <span className="text-danger">
                        {p.tipoOriginal || "—"}
                      </span>
                    )}
                  </td>
                  <td className="max-w-72 truncate px-3 py-2.5 align-top text-ink-muted">
                    {p.titulo}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top">
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => onPrevisualizar(p)}
                        className="enlace inline-flex items-center gap-1"
                      >
                        <Eye aria-hidden size={16} strokeWidth={1.75} />
                        Previsualizar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onCambiar(personas.filter((_, j) => j !== i))
                        }
                        className="enlace inline-flex items-center gap-1 text-danger"
                      >
                        <Trash2 aria-hidden size={16} strokeWidth={1.75} />
                        Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {personas.length > FILAS_VISIBLES && (
        <p className="text-small text-ink-muted">
          Se muestran las primeras {FILAS_VISIBLES}; se publican todas.
        </p>
      )}
    </div>
  );
}

function Publicar({
  personas,
  plantillas,
  problemas,
  onOcupado,
}: {
  personas: PersonaEvento[];
  plantillas: Plantillas;
  problemas: { fila: number; motivo: string }[];
  onOcupado: (ocupado: boolean) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [hechos, setHechos] = useState(0);
  const [resultado, setResultado] = useState<ResultadoPublicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelado = useRef(false);
  const listas = PLANTILLAS_EVENTO.every((p) => plantillas[p.tipo]);

  function marcarOcupado(valor: boolean) {
    setOcupado(valor);
    onOcupado(valor);
  }

  async function publicar() {
    cancelado.current = false;
    setHechos(0);
    setResultado(null);
    setError(null);
    marcarOcupado(true);
    try {
      const items = personas.map((p, i) => {
        const tipo = p.tipo as TipoCertificado;
        return {
          fila: i + 1,
          registro: { nombre: p.nombre, titulo: p.titulo },
          html: plantillas[tipo]!.html,
          tipo,
        };
      });
      setResultado(
        await publicarLote(items, {
          pagina: PAGINA,
          campoClave: "nombre",
          campoNombre: "nombre",
          onProgreso: setHechos,
          estaCancelado: () => cancelado.current,
        }),
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
      marcarOcupado(false);
    }
  }

  const porcentaje = Math.round((hechos / personas.length) * 100);

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5">
      <p className="text-small text-ink-muted">
        La persona descarga su certificado escribiendo su nombre. Cada persona
        tiene un solo certificado: si ya existía uno con el mismo nombre, se
        reemplaza.
      </p>

      <ListaProblemas
        titulo={`Corrige ${problemas.length} fila(s) antes de publicar:`}
        problemas={problemas}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={publicar}
          disabled={ocupado || problemas.length > 0 || !listas}
          className="boton-primario"
        >
          <CloudUpload aria-hidden size={16} strokeWidth={1.75} />
          Generar y publicar {personas.length} certificado(s)
        </button>
        {ocupado && hechos < personas.length && (
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
            Publicando {Math.min(hechos + 1, personas.length)} de{" "}
            {personas.length}…
          </p>
        </div>
      )}

      {resultado && (
        <ResumenPublicacion resultado={resultado} conEnlace={false} />
      )}
      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  );
}
