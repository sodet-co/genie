import { Source_Serif_4 } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { Organizacion } from "@/lib/organizaciones";

// La serif del certificado, solo para las páginas públicas de la UA.
const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif-ua",
});

const ARTE = "/temas/ua";

// Clase para títulos con la serif del certificado.
export const TITULO_UA =
  "font-[family-name:var(--font-serif-ua)] text-[26px] font-bold leading-tight text-ink";

// Marco de las páginas públicas de la UA (portal e ingreso): encabezado verde,
// fondo crema y las ilustraciones del certificado alrededor del contenido.
// Las imágenes salen de scripts/recortar-ua.mjs.
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
      <header className="bg-brand text-on-brand">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link
            href={`/${org.slug}`}
            className="truncate font-[family-name:var(--font-serif-ua)] text-[19px] font-bold sm:text-[22px]"
          >
            {org.nombre}
          </Link>
          {accion}
        </div>
        <div aria-hidden className="franja" />
      </header>

      <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#f4efe0] px-4 py-12 sm:px-6 sm:py-16">
        <Image
          src={`${ARTE}/vegetacion.png`}
          alt=""
          width={380}
          height={1198}
          priority
          className="pointer-events-none absolute -top-6 left-0 -z-10 h-[420px] w-auto opacity-60 [mask-image:linear-gradient(to_right,black_70%,transparent)] sm:opacity-100 md:h-[640px]"
        />
        <Image
          src={`${ARTE}/garza.png`}
          alt=""
          width={300}
          height={170}
          className="pointer-events-none absolute right-[6%] top-8 -z-10 hidden w-36 sm:block lg:w-44"
        />
        <Image
          src={`${ARTE}/barranquilla.png`}
          alt=""
          width={600}
          height={705}
          className="pointer-events-none absolute bottom-0 right-0 -z-10 w-[180px] opacity-60 sm:w-[260px] sm:opacity-100 lg:w-[340px]"
        />
        <Image
          src={`${ARTE}/figura-roja.png`}
          alt=""
          width={400}
          height={320}
          className="pointer-events-none absolute bottom-0 left-0 -z-10 hidden w-[200px] lg:block"
        />
        {children}
      </main>
    </div>
  );
}
