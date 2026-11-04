"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Mensaje } from "@/componentes/generador/mensaje";
import { useOrganizacion } from "@/componentes/organizacion";
import { descargar } from "@/lib/pdf";

function nombreDesdeCabecera(cabecera: string | null) {
  const utf8 = cabecera?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      // Cae al nombre ASCII.
    }
  }
  return cabecera?.match(/filename="([^"]+)"/i)?.[1] ?? "certificado.pdf";
}

export function FormularioDescarga({ etiqueta }: { etiqueta: string }) {
  const org = useOrganizacion();
  const [clave, setClave] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!clave.trim()) return;
    setBuscando(true);
    setEstado(null);
    try {
      const respuesta = await fetch(`/api/${org.slug}/descargar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setEstado({
          tipo: "error",
          texto: cuerpo?.error ?? "No se pudo descargar el certificado.",
        });
        return;
      }
      const pdf = await respuesta.blob();
      descargar(
        pdf,
        nombreDesdeCabecera(respuesta.headers.get("Content-Disposition")),
        "application/pdf",
      );
      setEstado({ tipo: "ok", texto: "Listo. Tu certificado se está descargando." });
    } catch {
      setEstado({ tipo: "error", texto: "No hay conexión. Inténtalo de nuevo." });
    } finally {
      setBuscando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 flex flex-col gap-4">
      <label className="etiqueta">
        {etiqueta}
        <input
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          required
          maxLength={200}
          autoComplete="off"
          className="campo"
        />
      </label>
      <button type="submit" disabled={buscando} className="boton-primario">
        {buscando ? (
          <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <Download aria-hidden size={16} strokeWidth={1.75} />
        )}
        {buscando ? "Buscando…" : "Descargar certificado"}
      </button>
      {estado && <Mensaje tipo={estado.tipo}>{estado.texto}</Mensaje>}
    </form>
  );
}
