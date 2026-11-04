import { LogIn } from "lucide-react";
import Link from "next/link";
import { FormularioDescarga } from "@/componentes/portal/formulario-descarga";
import type { Organizacion } from "@/lib/organizaciones";
import { MarcoUA, TARJETA_UA, TITULO_UA } from "./marco-ua";

// Portal de la Universidad del Atlántico: la tarjeta de descarga sobre el
// fondo ilustrado del evento.
export function PortalUA({ org }: { org: Organizacion }) {
  return (
    <MarcoUA
      org={org}
      accion={
        <Link
          href={`/${org.slug}/ingresar`}
          className="enlace inline-flex items-center gap-1.5 text-small"
        >
          <LogIn aria-hidden size={16} strokeWidth={1.75} />
          Ingresar
        </Link>
      }
    >
      <section className={`${TARJETA_UA} max-w-md`}>
        <h1 className={TITULO_UA}>Descargar tu certificado</h1>
        <p className="mt-2 text-ink">
          {org.evento.nombre}. Escribe tu {org.etiquetaBusqueda.toLowerCase()} tal como lo
          registraste.
        </p>
        <FormularioDescarga etiqueta={org.etiquetaBusqueda} />
      </section>
    </MarcoUA>
  );
}
