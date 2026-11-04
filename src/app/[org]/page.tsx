import { LogIn } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado } from "@/componentes/encabezado";
import { FormularioDescarga } from "@/componentes/portal/formulario-descarga";
import { PortalUA } from "@/componentes/temas/ua/portal-ua";
import { buscarOrganizacion } from "@/lib/organizaciones";

export default async function Portal({ params }: PageProps<"/[org]">) {
  const org = buscarOrganizacion((await params).org);
  if (!org) notFound();
  if (org.diseno === "ua") return <PortalUA org={org} />;
  return (
    <>
      <Encabezado seccion={org.nombre} inicio={`/${org.slug}`}>
        <Link
          href={`/${org.slug}/ingresar`}
          className="enlace inline-flex items-center gap-1.5 text-small"
        >
          <LogIn aria-hidden size={16} strokeWidth={1.75} />
          Ingresar
        </Link>
      </Encabezado>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-label uppercase text-brand">{org.nombre}</p>
        <div className="mt-3 rounded-lg border border-border bg-surface-raised p-5 shadow-card sm:p-8">
          <h1 className="text-h1 font-semibold">Descarga tu certificado</h1>
          <p className="mt-2 text-ink-muted">
            Certificado de participación en{" "}
            <strong className="text-ink">{org.evento.nombre}</strong>. Escribe tu{" "}
            {org.etiquetaBusqueda.toLowerCase()} tal como lo registraste.
          </p>
          <FormularioDescarga etiqueta={org.etiquetaBusqueda} />
        </div>
      </main>
    </>
  );
}
