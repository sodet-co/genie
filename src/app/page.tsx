import { ShieldCheck } from "lucide-react";
import { Generador } from "./generador/generador";

export default function Home() {
  return (
    <>
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <picture>
            <source
              srcSet="/marca/genie-lockup-white.svg"
              media="(prefers-color-scheme: dark)"
            />
            <img src="/marca/genie-lockup.svg" alt="Genie" width={89} height={28} />
          </picture>
          <span aria-hidden className="h-5 w-px bg-border" />
          <span className="font-medium text-ink-muted">Certificados</span>
        </div>
      </header>

      <div className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <h1 className="text-h1 font-semibold">Generador de certificados</h1>
            <p className="mt-1 text-ink-muted">
              Crea certificados en PDF a partir de una plantilla HTML y una lista
              de participantes.
            </p>
          </div>
          <p className="flex items-start gap-1.5 text-small text-ink-muted">
            <ShieldCheck aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            Los datos se procesan en tu navegador y no se envían a ningún servidor.
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Generador />
      </main>
    </>
  );
}
