"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialogo } from "@/componentes/dialogo";
import { GeneradorEvento } from "@/componentes/evento/generador-evento";
import { EVENTO_ACTUAL } from "@/lib/plantillas-evento";

export function BotonGenerar() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  // Se monta al abrir por primera vez y se conserva: cerrar el popup no borra
  // la lista cargada.
  const [montado, setMontado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMontado(true);
          setAbierto(true);
        }}
        className="boton-primario w-full sm:w-auto"
      >
        <Plus aria-hidden size={16} strokeWidth={1.75} />
        Generar certificados
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => {
          setAbierto(false);
          router.refresh();
        }}
        bloquearCierre={ocupado}
        titulo="Generar certificados"
        descripcion={
          <>
            {EVENTO_ACTUAL.nombre} ·{" "}
            <Link href="/admin/otro-evento" className="enlace">
              ¿Otro evento? Sube su plantilla
            </Link>
          </>
        }
      >
        {montado && <GeneradorEvento onOcupado={setOcupado} />}
      </Dialogo>
    </>
  );
}
