"use client";

import { useEffect, useState } from "react";
import { VistaPrevia } from "@/componentes/generador/vista-previa";
import { medidasPagina } from "@/lib/plantilla";
import { DATOS_EJEMPLO, PLANTILLAS_EVENTO } from "@/lib/plantillas-evento";
import {
  cargarPlantillaEvento,
  type Plantilla,
} from "@/lib/preparar-plantilla";

const PAGINA = medidasPagina("carta", "horizontal");

export function GaleriaPlantillas() {
  const [cargadas, setCargadas] = useState<Record<string, Plantilla | "error">>(
    {},
  );

  useEffect(() => {
    let vigente = true;
    for (const p of PLANTILLAS_EVENTO) {
      cargarPlantillaEvento(p)
        .then(
          (plantilla) =>
            vigente && setCargadas((c) => ({ ...c, [p.id]: plantilla })),
        )
        .catch((e) => {
          console.error(e);
          if (vigente) setCargadas((c) => ({ ...c, [p.id]: "error" }));
        });
    }
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {PLANTILLAS_EVENTO.map((p) => {
        const plantilla = cargadas[p.id];
        return (
          <section
            key={p.id}
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card sm:p-5"
          >
            <div>
              <h2 className="text-h2 font-semibold">{p.nombre}</h2>
              <p className="text-small text-ink-muted">
                {p.descripcion} Datos: {p.marcadores.join(", ")}.
              </p>
            </div>
            {plantilla === "error" ? (
              <p className="text-danger">No se pudo cargar la plantilla.</p>
            ) : plantilla ? (
              <VistaPrevia
                html={plantilla.html}
                marcadores={plantilla.marcadores}
                registro={DATOS_EJEMPLO}
                pagina={PAGINA}
              />
            ) : (
              <p className="text-ink-muted">Cargando vista previa…</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
