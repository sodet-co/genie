"use client";

import { createContext, useContext } from "react";
import { buscarOrganizacion, type Organizacion } from "@/lib/organizaciones";

// La organización de la ruta (/ua/...) para los componentes de cliente. Se
// pasa solo el slug: la configuración es estática y se resuelve aquí.
const Contexto = createContext<string | null>(null);

export function ProveedorOrganizacion({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return <Contexto.Provider value={slug}>{children}</Contexto.Provider>;
}

export function useOrganizacion(): Organizacion {
  const org = buscarOrganizacion(useContext(Contexto));
  if (!org) throw new Error("useOrganizacion() fuera de una ruta de organización.");
  return org;
}
