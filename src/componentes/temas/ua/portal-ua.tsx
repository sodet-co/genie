import { LogIn } from "lucide-react";
import Link from "next/link";
import { FormularioDescarga } from "@/componentes/portal/formulario-descarga";
import type { Organizacion } from "@/lib/organizaciones";
import { MarcoUA, TITULO_UA } from "./marco-ua";

// Portal de la Universidad del Atlántico: la tarjeta de descarga sobre el
// fondo beige del certificado.
export function PortalUA({ org }: { org: Organizacion }) {
  return (
    <MarcoUA
      org={org}
      accion={
        <Link
          href={`/${org.slug}/ingresar`}
          className="enlace inline-flex shrink-0 items-center gap-1.5 text-small"
        >
          <LogIn aria-hidden size={16} strokeWidth={1.75} />
          Ingresar
        </Link>
      }
    >
      <section className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-5 shadow-pop sm:p-7">
        <h1 className={TITULO_UA}>Descarga tu certificado</h1>
        <p className="mt-1.5 text-ink-muted">
          {org.evento.nombre}. Escribe tu {org.etiquetaBusqueda.toLowerCase()} tal como lo
          registraste.
        </p>
        <FormularioDescarga etiqueta={org.etiquetaBusqueda} />
      </section>
    </MarcoUA>
  );
}
