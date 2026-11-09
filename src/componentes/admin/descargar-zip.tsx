"use client";

import { FileArchive, X } from "lucide-react";
import { useRef, useState } from "react";
import { Dialogo } from "@/componentes/dialogo";
import { Mensaje } from "@/componentes/generador/mensaje";
import { useOrganizacion } from "@/componentes/organizacion";
import { descargar } from "@/lib/pdf";
import { etiquetaTipo } from "@/lib/tipos";
import { armarZip, ZipCancelado } from "@/lib/zip";

export type ItemZip = { id: string; nombre: string; tipo: string };

class SinSesion extends Error {}

// Descarga masiva del panel en un ZIP, una carpeta por tipo: los certificados
// marcados ({ seleccion }) o todos los del listado con los filtros aplicados
// ({ q, tipo, total }).
export function BotonDescargarZip(
  props: { seleccion: ItemZip[] } | { q: string; tipo: string; total: number },
) {
  const seleccion = "seleccion" in props ? props.seleccion : null;
  const q = "q" in props ? props.q : "";
  const tipo = "tipo" in props ? props.tipo : "";
  const total = seleccion ? seleccion.length : "total" in props ? props.total : 0;
  const org = useOrganizacion();
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [cantidad, setCantidad] = useState(0);
  const [hechos, setHechos] = useState(0);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const cancelado = useRef(false);
  const filtrado = Boolean(q || tipo);

  async function iniciar() {
    cancelado.current = false;
    setOcupado(true);
    setEstado(null);
    setHechos(0);
    setCantidad(0);
    try {
      let certificados: ItemZip[];
      if (seleccion) {
        certificados = seleccion;
      } else {
        const parametros = new URLSearchParams({ q, tipo });
        const respuesta = await fetch(`/api/${org.slug}/admin/certificados/lista?${parametros}`);
        if (respuesta.status === 401) throw new SinSesion();
        if (!respuesta.ok) throw new Error(`error ${respuesta.status}`);
        ({ certificados } = (await respuesta.json()) as { certificados: ItemZip[] });
      }
      setCantidad(certificados.length);

      const zip = await armarZip(
        certificados.map((c) => ({
          nombre: `Certificado ${etiquetaTipo(c.tipo).toLowerCase()} - ${c.nombre}`,
          carpeta: etiquetaTipo(c.tipo),
          obtener: async () => {
            const pdf = await fetch(`/api/${org.slug}/admin/certificados/${c.id}`);
            if (pdf.status === 401) throw new SinSesion();
            if (!pdf.ok) throw new Error(`No se pudo bajar el certificado de ${c.nombre}`);
            return pdf.blob();
          },
        })),
        { onProgreso: setHechos, estaCancelado: () => cancelado.current },
      );
      const fecha = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      descargar(zip, `Certificados ${org.nombre} ${fecha}.zip`, "application/zip");
      setEstado({ tipo: "ok", texto: `Listo: ${certificados.length} certificado(s) en el ZIP.` });
    } catch (e) {
      if (e instanceof ZipCancelado) {
        setEstado({ tipo: "error", texto: "Descarga cancelada." });
      } else if (e instanceof SinSesion) {
        setEstado({ tipo: "error", texto: "Tu sesión venció. Vuelve a ingresar." });
      } else {
        console.error(e);
        setEstado({
          tipo: "error",
          texto: e instanceof Error && e.message.startsWith("No se pudo")
            ? `${e.message}. Inténtalo de nuevo.`
            : "No se pudo armar el ZIP. Inténtalo de nuevo.",
        });
      }
    } finally {
      setOcupado(false);
    }
  }

  const porcentaje = cantidad ? Math.round((hechos / cantidad) * 100) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="boton-secundario w-full sm:w-auto"
      >
        <FileArchive aria-hidden size={16} strokeWidth={1.75} />
        {seleccion ? `Descargar ${seleccion.length} en ZIP` : "Descargar ZIP"}
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        bloquearCierre={ocupado}
        titulo="Descargar certificados en ZIP"
        descripcion={
          seleccion
            ? `Los ${total} certificado(s) seleccionados.`
            : filtrado
              ? `Los ${total} certificado(s) que coinciden con la búsqueda actual.`
              : `Los ${total} certificado(s) publicados.`
        }
        ancho="sm:max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <p className="text-ink-muted">
            Un archivo ZIP con una carpeta por tipo de certificado. Se arma en
            este navegador: no cierres la pestaña hasta que termine. No suma a
            las descargas de las personas.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={iniciar} disabled={ocupado} className="boton-primario">
              <FileArchive aria-hidden size={16} strokeWidth={1.75} />
              Descargar {total} certificado(s)
            </button>
            {ocupado && (
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
                {!cantidad
                  ? "Preparando…"
                  : hechos < cantidad
                    ? `Descargando ${hechos} de ${cantidad}…`
                    : "Armando el ZIP…"}
              </p>
            </div>
          )}
          {estado && <Mensaje tipo={estado.tipo}>{estado.texto}</Mensaje>}
        </div>
      </Dialogo>
    </>
  );
}
