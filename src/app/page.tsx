import { LogIn } from "lucide-react";
import Link from "next/link";
import { Encabezado } from "@/componentes/encabezado";
import { FormularioDescarga } from "@/componentes/portal/formulario-descarga";
import { ETIQUETA_BUSQUEDA, NOMBRE_EVENTO } from "@/lib/busqueda";

export default function Portal() {
  return (
    <>
      <Encabezado seccion="Certificados">
        <Link href="/ingresar" className="enlace inline-flex items-center gap-1.5 text-small">
          <LogIn aria-hidden size={16} strokeWidth={1.75} />
          Ingresar
        </Link>
      </Encabezado>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-lg border border-border bg-surface-raised p-5 shadow-card sm:p-8">
          <h1 className="text-h1 font-semibold">Descarga tu certificado</h1>
          <p className="mt-2 text-ink-muted">
            {NOMBRE_EVENTO && (
              <>
                Certificado de participación en{" "}
                <strong className="text-ink">{NOMBRE_EVENTO}</strong>.{" "}
              </>
            )}
            Escribe tu {ETIQUETA_BUSQUEDA.toLowerCase()} tal como lo registraste.
          </p>
          <FormularioDescarga etiqueta={ETIQUETA_BUSQUEDA} />
        </div>
      </main>
    </>
  );
}
