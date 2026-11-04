"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { esMiembro } from "@/lib/servidor/insforge";

export type EstadoIngreso = { error: string } | null;

const CREDENCIALES = "Correo o contraseña incorrectos.";

export async function iniciarSesion(
  _anterior: EstadoIngreso,
  formulario: FormData,
): Promise<EstadoIngreso> {
  const org = buscarOrganizacion(String(formulario.get("org") ?? ""));
  const correo = String(formulario.get("correo") ?? "").trim();
  const contrasena = String(formulario.get("contrasena") ?? "");
  if (!org) return { error: "Institución no encontrada." };
  if (!correo || !contrasena) return { error: CREDENCIALES };

  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signInWithPassword({ email: correo, password: contrasena });
  if (error || !data?.user) {
    console.error(
      `[ingreso] InsForge rechazó el inicio de sesión (${error?.statusCode ?? "?"}): ${error?.message}`,
    );
    return { error: CREDENCIALES };
  }

  // La cuenta existe, pero debe administrar esta institución (tabla miembros).
  if (!(await esMiembro(data.user.id, org.slug))) {
    console.warn(`[ingreso] ${data.user.id} no es miembro de ${org.slug}`);
    await auth.signOut();
    return { error: "Tu cuenta no tiene acceso al panel de esta institución." };
  }
  redirect(`/${org.slug}/admin`);
}

export async function cerrarSesion(formulario: FormData) {
  const org = buscarOrganizacion(String(formulario.get("org") ?? ""));
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  redirect(org ? `/${org.slug}` : "/");
}
