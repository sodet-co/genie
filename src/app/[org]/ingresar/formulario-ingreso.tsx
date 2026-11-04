"use client";

import { LogIn } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Mensaje } from "@/componentes/generador/mensaje";
import { useOrganizacion } from "@/componentes/organizacion";
import { iniciarSesion } from "./acciones";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, null);
  const org = useOrganizacion();
  // Controlado: si la contraseña es incorrecta, el correo se conserva y solo
  // hay que volver a escribir la clave.
  const [correo, setCorreo] = useState("");
  const contrasena = useRef<HTMLInputElement>(null);

  // Tras un error, el cursor queda listo en la contraseña.
  useEffect(() => {
    if (estado?.error) contrasena.current?.focus();
  }, [estado]);

  return (
    <form action={accion} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="org" value={org.slug} />
      <label className="etiqueta">
        Correo
        <input
          name="correo"
          type="email"
          required
          autoComplete="username"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="campo"
        />
      </label>
      <label className="etiqueta">
        Contraseña
        <input
          ref={contrasena}
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
