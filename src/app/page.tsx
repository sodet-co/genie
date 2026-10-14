import { Generador } from "./generador/generador";

export default function Home() {
  return (
    <>
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-3">
          <picture>
            <source
              srcSet="/marca/genie-lockup-white.svg"
              media="(prefers-color-scheme: dark)"
            />
            <img src="/marca/genie-lockup.svg" alt="Genie" width={127} height={40} />
          </picture>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="font-display text-h1 font-semibold">
          Generador de certificados
        </h1>
        <p className="mb-8 mt-2 text-body-lg text-ink-muted">
          Todo se procesa en tu navegador: la plantilla y los datos no se envían
          a ningún servidor.
        </p>
        <Generador />
      </main>
    </>
  );
}
