import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado } from "@/componentes/encabezado";
import { MarcoUA, TITULO_UA } from "@/componentes/temas/ua/marco-ua";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { FormularioIngreso } from "./formulario-ingreso";

export const metadata = { title: "Ingresar · Certificados" };

export default async function Ingresar({ params }: PageProps<"/[org]/ingresar">) {
  const org = buscarOrganizacion((await params).org);
  if (!org) notFound();

  const tarjeta = (titulo: string) => (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-5 shadow-card sm:p-8">
      <h1 className={titulo}>Ingresar al panel</h1>
      <p className="mt-1 text-ink-muted">Solo para el equipo que administra los certificados.</p>
      <FormularioIngreso />
    </div>
  );

  // Para volver al portal de la institución.
  const volver = (
    <Link
      href={`/${org.slug}`}
      className="enlace inline-flex shrink-0 items-center gap-1.5 text-small"
    >
      <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
      Volver
    </Link>
  );

  if (org.diseno === "ua") {
    return (
      <MarcoUA org={org} accion={volver}>
        {tarjeta(TITULO_UA)}
      </MarcoUA>
    );
  }
  return (
    <>
      <Encabezado seccion={org.nombre} inicio={`/${org.slug}`}>
        {volver}
      </Encabezado>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {tarjeta("text-h1 font-semibold")}
      </main>
    </>
  );
}
