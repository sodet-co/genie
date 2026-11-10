"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { registrar } from "@/lib/servidor/bitacora";
import { usuarioAdmin } from "@/lib/servidor/insforge";

export type EstadoIngreso = { error: string } | null;

const CREDENCIALES = "Correo o contraseña incorrectos.";

// Cada intento de ingreso (correcto o no) queda en la bitácora con el motivo
// técnico de InsForge. Nunca se registra la contraseña.
export async function iniciarSesion(
  _anterior: EstadoIngreso,
  formulario: FormData,
): Promise<EstadoIngreso> {
  const inicio = Date.now();
  const cabeceras = await headers();
  const slug = String(formulario.get("org") ?? "");
  const org = buscarOrganizacion(slug);
  const correo = String(formulario.get("correo") ?? "").trim();
  const contrasena = String(formulario.get("contrasena") ?? "");
  const base = { evento: "admin.ingreso", organizacion: org?.slug ?? slug, actor: correo || null, origen: "formulario", inicio };
  if (!org) {
    registrar({ ...base, resultado: "no_encontrado", mensaje: "Institución no encontrada." }, { cabeceras });
    return { error: "Institución no encontrada." };
  }
  if (!correo || !contrasena) {
    registrar({ ...base, resultado: "rechazado", mensaje: CREDENCIALES, detalle: { motivo: !correo ? "sin correo" : "sin contraseña" } }, { cabeceras });
    return { error: CREDENCIALES };
  }

  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signInWithPassword({ email: correo, password: contrasena });
  if (error || !data?.user) {
    console.error(
      `[ingreso] InsForge rechazó el inicio de sesión (${error?.statusCode ?? "?"}): ${error?.message}`,
    );
    registrar(
      {
        ...base,
        resultado: "rechazado",
        estadoHttp: error?.statusCode,
        mensaje: CREDENCIALES,
        detalle: { insforge: { codigo: error?.statusCode ?? null, mensaje: error?.message ?? "sin usuario" } },
      },
      { cabeceras },
    );
    return { error: CREDENCIALES };
  }

  // Toda cuenta existente entra (ver usuarioAdmin en lib/servidor/insforge).
  registrar({ ...base, resultado: "ok", mensaje: "Ingresó al panel", detalle: { usuario_id: data.user.id } }, { cabeceras });
  redirect(`/${org.slug}/admin`);
}

export async function cerrarSesion(formulario: FormData) {
  const cabeceras = await headers();
  const org = buscarOrganizacion(String(formulario.get("org") ?? ""));
  const usuario = org ? await usuarioAdmin(org.slug) : null;
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  registrar(
    { evento: "admin.salida", organizacion: org?.slug ?? null, resultado: "ok", actor: usuario?.email ?? null, mensaje: "Salió del panel" },
    { cabeceras },
  );
  redirect(org ? `/${org.slug}` : "/");
}
