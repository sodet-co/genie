"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotonEliminar({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    if (!window.confirm(`¿Eliminar el certificado de ${nombre}? Ya no se podrá descargar.`)) return;
    setEliminando(true);
    try {
      const respuesta = await fetch(`/api/admin/certificados/${id}`, { method: "DELETE" });
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
      className="enlace inline-flex items-center gap-1 text-danger"
    >
      <Trash2 aria-hidden size={16} strokeWidth={1.75} />
      Eliminar
    </button>
  );
}
