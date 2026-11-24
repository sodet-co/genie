import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

export const TABLA = "certificados";
export const BUCKET = "certificados";

function variable(nombre: string) {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return valor;
}

// Cliente con la clave service_role: solo en el servidor. Lee y escribe las
// tablas y el bucket privados sin pasar por RLS. Uno por proceso.
let admin: SupabaseClient | null = null;
export function clienteAdmin() {
  admin ??= createClient(variable("NEXT_PUBLIC_SUPABASE_URL"), variable("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

// Cliente con la sesión del administrador (cookies). Solo para el login.
// En Server Components no se pueden escribir cookies: el proxy las renueva.
export async function clienteSesion() {
  const almacen = await cookies();
  return createServerClient(variable("NEXT_PUBLIC_SUPABASE_URL"), variable("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // Server Component: lo hace el proxy (src/proxy.ts).
        }
      },
    },
  });
}

// Usuario de la sesión, validado contra Supabase (getUser consulta el
// servidor de auth, no solo lee la cookie). Una consulta por petición.
const usuarioSesion = cache(async () => {
  // clienteSesion() (cookies) queda fuera del try: durante el prerender
  // rechaza a propósito y Next debe ver ese rechazo.
  const cliente = await clienteSesion();
  try {
    const { data, error } = await cliente.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
});

// ¿El usuario administra esta organización? (tabla miembros)
export async function esMiembro(userId: string, organizacion: string) {
  const { data, error } = await clienteAdmin()
    .from("miembros")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organizacion", organizacion)
    .maybeSingle();
  if (error) console.error(error);
  return Boolean(data);
}

// El usuario si tiene sesión; si no, null. Por decisión de la dueña del
// proyecto (2026-11-09), con una sola institución toda cuenta con sesión
// administra el panel: las cuentas solo se crean a mano en Supabase
// (Authentication → Users; el registro público está desactivado). Cuando haya
// otra institución con administradores distintos, volver a exigir
// esMiembro(usuario.id, organizacion).
export const usuarioAdmin = cache(async (organizacion: string) => {
  void organizacion;
  return usuarioSesion();
});

export type FilaCertificado = {
  id: string;
  clave: string;
  clave_original: string;
  nombre: string;
  tipo: string;
  referencia: string;
  correos: string[];
  organizacion: string;
  plantilla: string | null;
  // Versión de la plantilla con que se generó (lib/version-plantilla); null
  // en los anteriores al 2026-11-23.
  plantilla_version: string | null;
  datos: Record<string, string>;
  archivo_key: string;
  descargas: number;
  ultima_descarga: string | null;
  creado_en: string;
  actualizado_en: string;
};
