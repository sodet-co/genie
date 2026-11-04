import { notFound } from "next/navigation";
import { ProveedorOrganizacion } from "@/componentes/organizacion";
import { PieSodet } from "@/componentes/pie-sodet";
import { buscarOrganizacion, ORGANIZACIONES } from "@/lib/organizaciones";

// Cada organización se prerenderiza; un slug que no existe da 404.
export function generateStaticParams() {
  return Object.keys(ORGANIZACIONES).map((org) => ({ org }));
}

export async function generateMetadata({ params }: LayoutProps<"/[org]">) {
  const org = buscarOrganizacion((await params).org);
  return org ? { title: `Certificados · ${org.nombre}` } : {};
}

// data-org activa el tema de la organización (globals.css): mismos componentes
// y estructura de Genie, con los colores de la institución.
export default async function LayoutOrganizacion({ children, params }: LayoutProps<"/[org]">) {
  const org = buscarOrganizacion((await params).org);
  if (!org) notFound();
  return (
    <div data-org={org.slug} className="flex min-h-full flex-1 flex-col bg-surface text-ink">
      <ProveedorOrganizacion slug={org.slug}>{children}</ProveedorOrganizacion>
      <PieSodet />
    </div>
  );
}
