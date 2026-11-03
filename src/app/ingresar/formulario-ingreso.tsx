"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { Mensaje } from "@/componentes/generador/mensaje";
import { iniciarSesion } from "./acciones";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, null);
  return (
    <form action={accion} className="mt-6 flex flex-col gap-4">
      <label className="etiqueta">
        Correo
        <input name="correo" type="email" required autoComplete="username" className="campo" />
      </label>
      <label className="etiqueta">
        Contraseña
        <input
          name="contrasena"
          type="password"
          required
          autoComplete="current-password"
          className="campo"
        />
      </label>
      <button type="submit" disabled={enviando} className="boton-primario">
        <LogIn aria-hidden size={16} strokeWidth={1.75} />
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
      {estado?.error && <Mensaje tipo="error">{estado.error}</Mensaje>}
    </form>
  );
}
