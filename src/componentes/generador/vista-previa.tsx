"use client";

import { useEffect, useRef, useState } from "react";
import { ajustarTextos } from "@/lib/ajustar";
import { rellenar, type Pagina, type Registro } from "@/lib/plantilla";

type Props = {
  html: string;
  marcadores: string[];
  registro?: Registro;
  pagina: Pagina;
};

export function VistaPrevia({ html, marcadores, registro, pagina }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchoDisponible, setAnchoDisponible] = useState(0);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver(([entrada]) =>
      setAnchoDisponible(entrada.contentRect.width),
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  // Sin registros se muestran los propios marcadores para ubicar los campos.
  const datos =
    registro ?? Object.fromEntries(marcadores.map((m) => [m, `{{${m}}}`]));
  const escala = anchoDisponible ? Math.min(1, anchoDisponible / pagina.anchoPx) : 0;

  return (
    <div>
      <p className="mb-2 font-medium text-ink">
        Vista previa {registro ? "" : "(sin datos todavía)"}
      </p>
      <div
        ref={contenedor}
        className="flex w-full justify-center rounded-md border border-border bg-surface-sunken p-3 sm:p-6"
      >
        <div
          className="overflow-hidden bg-white shadow-pop"
          style={{
            width: pagina.anchoPx * escala,
            height: pagina.altoPx * escala,
          }}
        >
          {escala > 0 && (
            <iframe
              title="Vista previa del certificado"
              // Sin allow-scripts la plantilla no ejecuta JavaScript; con
              // allow-same-origin la app puede aplicar el autoajuste de textos.
              sandbox="allow-same-origin"
              srcDoc={rellenar(html, datos)}
              onLoad={async (e) => {
                const doc = e.currentTarget.contentDocument;
                if (!doc) return;
                await doc.fonts.ready;
                ajustarTextos(doc);
              }}
              style={{
                width: pagina.anchoPx,
                height: pagina.altoPx,
                transform: `scale(${escala})`,
                transformOrigin: "0 0",
                border: 0,
                background: "#fff",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
