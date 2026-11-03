"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { esCorreoAdmin } from "@/lib/servidor/insforge";

export type EstadoIngreso = { error: string } | null;

const CREDENCIALES = "Correo o contraseña incorrectos.";

export async function iniciarSesion(
  _anterior: EstadoIngreso,
  formulario: FormData,
): Promise<EstadoIngreso> {
  const correo = String(formulario.get("correo") ?? "").trim();
  const contrasena = String(formulario.get("contrasena") ?? "");
  // Un correo fuera de la lista recibe el mismo mensaje que una contraseña mala.
  if (!correo || !contrasena || !esCorreoAdmin(correo)) return { error: CREDENCIALES };

  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) {
    console.error(error);
    return { error: CREDENCIALES };
  }
  redirect("/admin");
}

export async function cerrarSesion() {
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  redirect("/");
}
