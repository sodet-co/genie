import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Generador } from "@/componentes/generador/generador";

export const metadata = { title: "Otro evento · Certificados" };

export default function OtroEvento() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div>
        <Link href="/admin" className="enlace inline-flex items-center gap-1 text-small">
          <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
          Certificados
        </Link>
        <h1 className="mt-2 text-h1 font-semibold">Certificados de otro evento</h1>
        <p className="mt-1 text-ink-muted">
          Sube la plantilla HTML del evento, agrega a las personas y publica.
        </p>
      </div>
      <Generador />
    </div>
  );
}
