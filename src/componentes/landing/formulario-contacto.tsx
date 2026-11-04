"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { Mensaje } from "@/componentes/generador/mensaje";

export function FormularioContacto() {
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    setEnviando(true);
    setEstado(null);
    try {
      const respuesta = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(formulario))),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        setEstado({ tipo: "error", texto: cuerpo?.error ?? "No pudimos enviar tu solicitud." });
        return;
      }
      formulario.reset();
      setEstado({ tipo: "ok", texto: "¡Gracias! Te escribiremos pronto." });
    } catch {
      setEstado({ tipo: "error", texto: "No hay conexión. Inténtalo de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="etiqueta">
          Nombre
          <input name="nombre" required maxLength={120} autoComplete="name" className="campo" />
        </label>
        <label className="etiqueta">
          Correo
          <input
            name="correo"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className="campo"
          />
        </label>
        <label className="etiqueta sm:col-span-2">
          Institución
          <input name="institucion" maxLength={200} autoComplete="organization" className="campo" />
        </label>
        <label className="etiqueta sm:col-span-2">
          ¿Qué necesitas?
          <textarea
            name="mensaje"
            rows={4}
            maxLength={2000}
            placeholder="Por ejemplo: certificados para un congreso de 300 asistentes."
            className="campo h-auto py-2"
          />
        </label>
        {/* Trampa para bots: oculta para personas y lectores de pantalla. */}
        <input
          name="sitio"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
      </div>
      <div>
        <button type="submit" disabled={enviando} className="boton-primario w-full sm:w-auto">
          <Send aria-hidden size={16} strokeWidth={1.75} />
          {enviando ? "Enviando…" : "Solicitar una demo"}
        </button>
      </div>
      {estado && <Mensaje tipo={estado.tipo}>{estado.texto}</Mensaje>}
    </form>
  );
}
