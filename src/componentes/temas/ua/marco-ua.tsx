import { Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import type { Organizacion } from "@/lib/organizaciones";

// La serif del certificado, solo para las páginas públicas de la UA.
const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif-ua",
});

// Clase para títulos con la serif del certificado.
export const TITULO_UA =
  "font-[family-name:var(--font-serif-ua)] text-[26px] font-bold leading-tight text-ink";

// Marco de las páginas públicas de la UA (portal e ingreso): encabezado como
// el pie, fondo beige del certificado y títulos en su serif.
export function MarcoUA({
  org,
  accion,
  children,
}: {
  org: Organizacion;
  // Enlace a la derecha del encabezado (p. ej. "Ingresar").
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`${serif.variable} flex flex-1 flex-col`}>
      {/* Mismo estilo del pie: fondo claro y borde fino. */}
      <header className="border-b border-border bg-surface-raised">
        <div aria-hidden className="franja" />
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link
            href={`/${org.slug}`}
            className="truncate font-[family-name:var(--font-serif-ua)] text-[19px] font-bold text-ink sm:text-[22px]"
          >
            {org.nombre}
          </Link>
          {accion}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center bg-[#f4efe0] px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </main>
    </div>
  );
}
