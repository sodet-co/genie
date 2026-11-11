"use client";

import { Download, FileCode, Image as ImagenIcono, LoaderCircle, RotateCcw } from "lucide-react";
import JSZip from "jszip";
import { useCallback, useEffect, useState } from "react";
import { Mensaje } from "@/componentes/generador/mensaje";
import { VistaPrevia } from "@/componentes/generador/vista-previa";
import { useOrganizacion } from "@/componentes/organizacion";
import { DATOS_EJEMPLO, type PlantillaEvento } from "@/lib/organizaciones";
import { descargar } from "@/lib/pdf";
import { medidasPagina } from "@/lib/plantilla";
import { cargarPlantillaEvento, type Plantilla } from "@/lib/preparar-plantilla";

const PAGINA = medidasPagina("carta", "horizontal");

type Estado = Record<string, { html: string | null; fondo: string | null }>;

const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

// Plantillas del evento: vista previa con datos de ejemplo y, para la cuenta
// autorizada, exportar (ZIP con HTML y fondo) y reemplazar el HTML o el fondo
// sin tocar código. El cambio aplica de inmediato a lo que se genere; lo ya
// publicado se actualiza con "Regenerar" en Certificados.
export function GaleriaPlantillas() {
  const org = useOrganizacion();
  const [cargadas, setCargadas] = useState<Record<string, Plantilla | "error">>({});
  const [estado, setEstado] = useState<Estado>({});
  const [puedeReemplazar, setPuedeReemplazar] = useState(false);

  const cargarEstado = useCallback(async () => {
    const r = await fetch(`/api/${org.slug}/admin/plantillas`, { cache: "no-store" });
    if (!r.ok) return;
    const cuerpo = (await r.json()) as { plantillas: Estado; puedeReemplazar: boolean };
    setEstado(cuerpo.plantillas);
    setPuedeReemplazar(cuerpo.puedeReemplazar);
  }, [org.slug]);

  const cargar = useCallback(
    (p: PlantillaEvento) =>
      cargarPlantillaEvento(p, org.slug)
        .then((plantilla) => setCargadas((c) => ({ ...c, [p.id]: plantilla })))
        .catch((e) => {
          console.error(e);
          setCargadas((c) => ({ ...c, [p.id]: "error" }));
        }),
    [org.slug],
  );

  // Carga inicial: las plantillas y su estado llegan por red (setState al responder).
  useEffect(() => {
    const espera = setTimeout(() => {
      org.evento.plantillas.forEach(cargar);
      void cargarEstado();
    }, 0);
    return () => clearTimeout(espera);
  }, [org, cargar, cargarEstado]);

  return (
    <div className="flex flex-col gap-6">
      {puedeReemplazar && (
        <Mensaje tipo="aviso">
          Para cambiar el diseño: descarga la plantilla, cambia el fondo (PNG o JPG del mismo
          tamaño y proporción) o edita el HTML conservando los datos entre llaves, como{" "}
          <code>{"{{nombre}}"}</code>, y súbelo con &quot;Cambiar&quot;. Se usa de inmediato
          para lo que se genere. Los certificados ya publicados se actualizan con
          &quot;Regenerar&quot; en Certificados.
        </Mensaje>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {org.evento.plantillas.map((p) => (
          <TarjetaPlantilla
            key={p.id}
            plantilla={p}
            cargada={cargadas[p.id]}
            estado={estado[p.id]}
            puedeReemplazar={puedeReemplazar}
            onCambio={() => {
              setCargadas((c) => {
                const nuevo = { ...c };
                delete nuevo[p.id];
                return nuevo;
              });
              void cargar(p);
              void cargarEstado();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaPlantilla({
  plantilla: p,
  cargada,
  estado,
  puedeReemplazar,
  onCambio,
}: {
  plantilla: PlantillaEvento;
  cargada: Plantilla | "error" | undefined;
  estado: { html: string | null; fondo: string | null } | undefined;
  puedeReemplazar: boolean;
  onCambio: () => void;
}) {
  const org = useOrganizacion();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function exportar() {
    setOcupado("exportar");
    setMensaje(null);
    try {
      const base = `/api/${org.slug}/plantillas/${p.id}`;
      const [html, fondo] = await Promise.all([
        fetch(`${base}/html`, { cache: "no-store" }).then((r) => r.text()),
        fetch(`${base}/fondo`, { cache: "no-store" }).then((r) => r.blob()),
      ]);
      const zip = new JSZip();
      // El HTML busca el fondo con este nombre exacto: hay que conservarlo.
      zip.file(`${p.id}.html`, html);
      zip.file(`${p.id}.png`, fondo);
      descargar(await zip.generateAsync({ type: "blob" }), `Plantilla ${p.nombre}.zip`, "application/zip");
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "No se pudo descargar la plantilla." });
    } finally {
      setOcupado(null);
    }
  }

  async function subir(archivo: "html" | "fondo", datos: File) {
    setOcupado(archivo);
    setMensaje(null);
    try {
      const formulario = new FormData();
      formulario.set("archivo", archivo);
      formulario.set("datos", datos);
      const r = await fetch(`/api/${org.slug}/admin/plantillas/${p.id}`, { method: "POST", body: formulario });
      const cuerpo = await r.json().catch(() => null);
      if (!r.ok) throw new Error(cuerpo?.error ?? `error ${r.status}`);
      setMensaje({
        tipo: "ok",
        texto: `Listo: ${archivo === "html" ? "HTML" : "fondo"} actualizado. Revisa la vista previa.`,
      });
      onCambio();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo subir." });
    } finally {
      setOcupado(null);
    }
  }

  async function restaurar(archivo: "html" | "fondo") {
    setOcupado(`restaurar-${archivo}`);
    setMensaje(null);
    try {
      const r = await fetch(`/api/${org.slug}/admin/plantillas/${p.id}?archivo=${archivo}`, { method: "DELETE" });
      const cuerpo = await r.json().catch(() => null);
      if (!r.ok) throw new Error(cuerpo?.error ?? `error ${r.status}`);
      setMensaje({ tipo: "ok", texto: `Volvió ${archivo === "html" ? "el HTML" : "el fondo"} original.` });
      onCambio();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo restaurar." });
    } finally {
      setOcupado(null);
    }
  }

  const personalizada = estado && (estado.html || estado.fondo);
  const icono = (clave: string, Icono: typeof Download) =>
    ocupado === clave ? (
      <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
    ) : (
      <Icono aria-hidden size={16} strokeWidth={1.75} />
    );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-h2 font-semibold">{p.nombre}</h2>
          <p className="text-small text-ink-muted">
            {p.descripcion} Datos: {p.marcadores.join(", ")}.
          </p>
        </div>
        <span
          className={`rounded-sm px-2 py-0.5 text-small ${personalizada ? "bg-brand-soft text-brand-soft-ink" : "bg-surface-sunken text-ink-muted"}`}
        >
          {personalizada ? "Personalizada" : "Original"}
        </span>
      </div>
      {personalizada && (
        <p className="text-small text-ink-muted">
          {estado.fondo && <>Fondo cambiado el {fecha.format(new Date(estado.fondo))}. </>}
          {estado.html && <>HTML cambiado el {fecha.format(new Date(estado.html))}.</>}
        </p>
      )}

      {cargada === "error" ? (
        <p className="text-danger">No se pudo cargar la plantilla.</p>
      ) : cargada ? (
        <VistaPrevia html={cargada.html} marcadores={cargada.marcadores} registro={DATOS_EJEMPLO} pagina={PAGINA} />
      ) : (
        <p className="text-ink-muted">Cargando vista previa…</p>
      )}

      {puedeReemplazar && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportar} disabled={ocupado !== null} className="boton-secundario">
            {icono("exportar", Download)}
            Descargar
          </button>
          <label className={`boton-secundario cursor-pointer ${ocupado ? "pointer-events-none opacity-60" : ""}`}>
            {icono("fondo", ImagenIcono)}
            Cambiar fondo
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void subir("fondo", f);
              }}
            />
          </label>
          <label className={`boton-secundario cursor-pointer ${ocupado ? "pointer-events-none opacity-60" : ""}`}>
            {icono("html", FileCode)}
            Cambiar HTML
            <input
              type="file"
              accept=".html,.htm,text/html"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void subir("html", f);
              }}
            />
          </label>
          {estado?.fondo && (
            <button type="button" onClick={() => restaurar("fondo")} disabled={ocupado !== null} className="boton-secundario">
              {icono("restaurar-fondo", RotateCcw)}
              Fondo original
            </button>
          )}
          {estado?.html && (
            <button type="button" onClick={() => restaurar("html")} disabled={ocupado !== null} className="boton-secundario">
              {icono("restaurar-html", RotateCcw)}
              HTML original
            </button>
          )}
        </div>
      )}
      {mensaje && <Mensaje tipo={mensaje.tipo}>{mensaje.texto}</Mensaje>}
    </section>
  );
}
