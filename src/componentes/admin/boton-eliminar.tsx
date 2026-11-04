"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOrganizacion } from "@/componentes/organizacion";

export function BotonEliminar({
  id,
  nombre,
  comoBoton = false,
}: {
  id: string;
  nombre: string;
  comoBoton?: boolean;
}) {
  const router = useRouter();
  const org = useOrganizacion();
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    if (!window.confirm(`¿Eliminar el certificado de ${nombre}? Ya no se podrá descargar.`)) return;
    setEliminando(true);
    try {
      const respuesta = await fetch(`/api/${org.slug}/admin/certificados/${id}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) window.alert("No se pudo eliminar el certificado.");
      router.refresh();
    } finally {
      setEliminando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={eliminando}
      aria-label={comoBoton ? undefined : "Eliminar"}
      data-tooltip={comoBoton ? undefined : "Eliminar"}
      className={comoBoton ? "boton-peligro flex-1" : "boton-icono con-tooltip tooltip-fin hover:text-danger"}
    >
      <Trash2 aria-hidden size={16} strokeWidth={1.75} />
      {comoBoton && "Eliminar"}
    </button>
  );
}
