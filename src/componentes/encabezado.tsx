import Link from "next/link";

export function Encabezado({
  seccion,
  inicio = "/",
  children,
}: {
  seccion: string;
  // A dónde lleva el logo (en una organización, su portal).
  inicio?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface-raised">
      {/* Franja con los colores de la organización (solo si su tema la define). */}
      <div aria-hidden className="franja" />
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href={inicio} className="shrink-0">
          {/* Las dos versiones: el CSS muestra la que contrasta con el fondo
              (.logo-claro / .logo-oscuro en globals.css). Con <picture> y
              prefers-color-scheme salía el blanco sobre los temas que siempre
              son claros, como el de la UA. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG pequeño: next/image no aporta */}
          <img
            src="/marca/genie-lockup.svg"
            alt="Genie"
            width={89}
            height={28}
            className="logo-claro h-6 w-auto sm:h-7"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG pequeño: next/image no aporta */}
          <img
            src="/marca/genie-lockup-white.svg"
            alt=""
            aria-hidden
            width={89}
            height={28}
            className="logo-oscuro h-6 w-auto sm:h-7"
          />
        </Link>
        <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
        <span className="hidden truncate font-medium text-ink-muted sm:block">{seccion}</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">{children}</div>
      </div>
    </header>
  );
}
