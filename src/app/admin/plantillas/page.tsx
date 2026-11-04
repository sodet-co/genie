import { BotonGenerar } from "@/componentes/admin/boton-generar";
import { GaleriaPlantillas } from "@/componentes/admin/galeria-plantillas";
import { EVENTO_ACTUAL } from "@/lib/plantillas-evento";

export const metadata = { title: "Plantillas · Certificados" };

export default function Plantillas() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold">Plantillas</h1>
          <p className="mt-1 text-ink-muted">
            {EVENTO_ACTUAL.nombre}. Así se ve cada certificado con datos de ejemplo.
          </p>
        </div>
        <BotonGenerar />
      </div>
      <GaleriaPlantillas />
    </div>
  );
}
