import Image from "next/image";

export function PieSodet() {
  return (
    <footer className="border-t border-border bg-surface-raised">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-4 text-small text-ink-muted sm:justify-between sm:px-6">
        <span>Certificados de participación</span>
        <a
          href="https://sodet.co"
          target="_blank"
          rel="noopener"
          className="group inline-flex items-center gap-2 rounded-md px-1 py-0.5 hover:text-ink"
        >
          Desarrollado por
          <Image src="/marca/sodet.png" alt="" width={20} height={20} className="rounded-[5px]" />
          <span className="font-semibold text-ink group-hover:underline">Sodet</span>
        </a>
      </div>
    </footer>
  );
}
