import Link from "next/link";

export function Encabezado({
  seccion,
  children,
}: {
  seccion: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <picture>
            <source srcSet="/marca/genie-lockup-white.svg" media="(prefers-color-scheme: dark)" />
            <img src="/marca/genie-lockup.svg" alt="Genie" width={89} height={28} />
          </picture>
        </Link>
        <span aria-hidden className="h-5 w-px bg-border" />
        <span className="truncate font-medium text-ink-muted">{seccion}</span>
        <div className="ml-auto flex items-center gap-3 sm:gap-4">{children}</div>
      </div>
    </header>
  );
}
