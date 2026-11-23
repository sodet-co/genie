"use client";

import { LoaderCircle, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialogo } from "@/componentes/dialogo";
import { Mensaje } from "@/componentes/generador/mensaje";
import { VistaPrevia } from "@/componentes/generador/vista-previa";
import { useOrganizacion } from "@/componentes/organizacion";
import { DATOS_EJEMPLO, type PlantillaEvento } from "@/lib/organizaciones";
import { extraerMarcadores, medidasPagina } from "@/lib/plantilla";
import { prepararPlantilla, type Plantilla } from "@/lib/preparar-plantilla";

const PAGINA = medidasPagina("carta", "horizontal");

// Editor del HTML de una plantilla con vista previa en vivo. Guarda con el
// mismo endpoint de "Cambiar HTML": la versión anterior queda en el historial.
export function EditorHtml({
  plantilla: p,
  abierto,
  onCerrar,
  onGuardado,
}: {
  plantilla: PlantillaEvento;
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const org = useOrganizacion();
  const [original, setOriginal] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [fondo, setFondo] = useState<Blob | null>(null);
  const [preparada, setPreparada] = useState<Plantilla | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Al abrir se lee la versión vigente (personalizada u original).
  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    const base = `/api/${org.slug}/plantillas/${p.id}`;
    Promise.all([
      fetch(`${base}/html`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      }),
      fetch(`${base}/fondo`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      }),
    ])
      .then(([html, imagen]) => {
        if (!vigente) return;
        setOriginal(html);
        setTexto(html);
        setFondo(imagen);
        setError(null);
      })
      .catch(() => vigente && setError("No se pudo cargar la plantilla."));
    return () => {
      vigente = false;
    };
  }, [abierto, org.slug, p.id]);

  // Vista previa: se rearma medio segundo después de la última tecla.
  useEffect(() => {
    if (!fondo || !texto) return;
    let vigente = true;
    const espera = setTimeout(() => {
      prepararPlantilla(texto, `${p.id}.html`, [{ nombre: `${p.id}.png`, datos: fondo }])
        .then((lista) => vigente && setPreparada(lista))
        .catch(console.error);
    }, 500);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto, fondo, p.id]);

  const cambiado = original !== null && texto !== original;
  const presentes = extraerMarcadores(texto);
  const faltan = p.marcadores.filter((m) => !presentes.includes(m));

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const formulario = new FormData();
      formulario.set("archivo", "html");
      formulario.set("datos", new File([texto], `${p.id}.html`, { type: "text/html" }));
      const r = await fetch(`/api/${org.slug}/admin/plantillas/${p.id}`, { method: "POST", body: formulario });
      const cuerpo = await r.json().catch(() => null);
      if (!r.ok) throw new Error(cuerpo?.error ?? `error ${r.status}`);
      setOriginal(texto);
      onGuardado();
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={() => {
        // Cerrar sin guardar descarta lo escrito: la próxima vez se abre la vigente.
        setTexto(original ?? "");
        setError(null);
        onCerrar();
      }}
      bloquearCierre={guardando}
      ancho="sm:max-w-7xl"
      titulo={`Editar HTML · ${p.nombre}`}
      descripcion="Los cambios se ven a la derecha. Al guardar se usan para lo que se genere; lo ya publicado se actualiza con Regenerar."
    >
      {original === null ? (
        error ? (
          <Mensaje tipo="error">{error}</Mensaje>
        ) : (
          <p className="text-ink-muted">Cargando plantilla…</p>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="font-medium text-ink">HTML</span>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                className="h-[45dvh] w-full resize-y rounded-md border border-border-strong bg-surface p-3 font-mono text-[13px] leading-relaxed text-ink focus:outline-2 focus:outline-brand lg:h-[62vh]"
              />
            </label>
            <div className="min-w-0">
              {preparada ? (
                <VistaPrevia html={preparada.html} marcadores={preparada.marcadores} registro={DATOS_EJEMPLO} pagina={PAGINA} />
              ) : (
                <p className="text-ink-muted">Preparando vista previa…</p>
              )}
            </div>
          </div>

          {faltan.length > 0 && (
            <Mensaje tipo="error">
              Falta {faltan.map((m) => `{{${m}}}`).join(" y ")} en el HTML: sin eso el certificado saldría sin ese
              dato. No se puede guardar así.
            </Mensaje>
          )}
          {error && <Mensaje tipo="error">{error}</Mensaje>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={!cambiado || faltan.length > 0 || guardando}
              className="boton-primario"
            >
              {guardando ? (
                <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <Save aria-hidden size={16} strokeWidth={1.75} />
              )}
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => setTexto(original)}
              disabled={!cambiado || guardando}
              className="boton-secundario"
            >
              <RotateCcw aria-hidden size={16} strokeWidth={1.75} />
              Deshacer cambios
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
