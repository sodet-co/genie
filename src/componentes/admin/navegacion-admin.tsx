"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  ["", "Certificados"],
  ["/plantillas", "Plantillas"],
  ["/bitacora", "Bitácora"],
] as const;

// Navegación del panel. En pantallas grandes va dentro del encabezado; en
// celular, como pestañas a lo ancho debajo de él (en el encabezado no cabe).
export function NavegacionAdmin({ base, variante }: { base: string; variante: "encabezado" | "pestanas" }) {
  const ruta = usePathname();
  const activa = (sufijo: string) =>
    sufijo === "" ? ruta === `${base}/admin` : ruta.startsWith(`${base}/admin${sufijo}`);

  if (variante === "encabezado") {
    return (
      <nav className="hidden items-center gap-3 text-small sm:flex" aria-label="Panel">
        {SECCIONES.map(([sufijo, etiqueta]) => (
          <Link
            key={sufijo}
            href={`${base}/admin${sufijo}`}
            aria-current={activa(sufijo) ? "page" : undefined}
            className={`enlace px-2 py-1 ${activa(sufijo) ? "font-semibold" : ""}`}
          >
            {etiqueta}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="border-b border-border bg-surface-raised sm:hidden" aria-label="Panel">
      <div className="grid grid-cols-3">
        {SECCIONES.map(([sufijo, etiqueta]) => (
          <Link
            key={sufijo}
            href={`${base}/admin${sufijo}`}
            aria-current={activa(sufijo) ? "page" : undefined}
            className={`border-b-2 py-2.5 text-center text-small ${
              activa(sufijo) ? "border-brand font-semibold text-brand" : "border-transparent text-ink-muted"
            }`}
          >
            {etiqueta}
          </Link>
        ))}
      </div>
    </nav>
  );
}
