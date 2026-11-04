import { Source_Serif_4 } from "next/font/google";
import type { Organizacion } from "@/lib/organizaciones";

// La serif del certificado, solo para las páginas públicas de la UA.
const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif-ua",
});

// Títulos de las tarjetas: serif del certificado en verde institucional.
export const TITULO_UA =
  "font-[family-name:var(--font-serif-ua)] text-[26px] font-bold leading-tight text-brand sm:text-[28px]";

// Tarjeta de las páginas públicas de la UA (descarga e ingreso).
export const TARJETA_UA =
  "w-full rounded-2xl bg-surface-raised p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] sm:p-8";

// Marco de las páginas públicas de la UA: el fondo ilustrado del evento a
// página completa y la tarjeta encima (estilos de .portal-ua en globals.css).
// En vertical (celular) la ilustración va completa abajo y la tarjeta se
// centra en el espacio libre de arriba; en horizontal cubre toda la pantalla.
export function MarcoUA({
  accion,
  children,
}: {
  org: Organizacion;
  // Enlace en la esquina superior derecha (p. ej. "Ingresar" o "Volver").
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${serif.variable} portal-ua relative flex flex-1 flex-col bg-[#f3efe0] bg-[url(/temas/ua/fondo.png)] bg-[length:100%_auto] bg-bottom bg-no-repeat landscape:bg-cover landscape:bg-center`}
    >
      {accion && <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5">{accion}</div>}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-[78vw] pt-16 sm:px-6 landscape:pb-16">
        {children}
      </main>
    </div>
  );
}
