import { Encabezado } from "@/componentes/encabezado";
import { FormularioIngreso } from "./formulario-ingreso";

export const metadata = { title: "Ingresar · Certificados" };

export default function Ingresar() {
  return (
    <>
      <Encabezado seccion="Administración" />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-border bg-surface-raised p-5 shadow-card sm:p-8">
          <h1 className="text-h1 font-semibold">Ingresar al panel</h1>
          <p className="mt-1 text-ink-muted">
            Solo para el equipo que administra los certificados.
          </p>
          <FormularioIngreso />
        </div>
      </main>
    </>
  );
}
