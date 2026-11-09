import { createAdminClient } from "@insforge/sdk";
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export const TABLA = "certificados";
export const BUCKET = "certificados";

function variable(nombre: string) {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return valor;
}

// Cliente con la API key del proyecto: solo en el servidor. Lee y escribe la
// tabla y el bucket privados sin pasar por las políticas de acceso.
export function clienteAdmin() {
  return createAdminClient({
    baseUrl: variable("NEXT_PUBLIC_INSFORGE_URL"),
    apiKey: variable("INSFORGE_API_KEY"),
  });
}

// Usuario de la sesión (cookie), validado contra InsForge, no solo por la
// presencia de la cookie. Con cache(): una sola consulta por petición.
const usuarioSesion = cache(async () => {
  // cookies() queda fuera del try: durante el prerender rechaza a propósito y
  // Next debe ver ese rechazo.
  const almacen = await cookies();
  try {
    const cliente = createServerClient({ cookies: almacen });
    const { data } = await cliente.auth.getCurrentUser();
    return data.user ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
});

// ¿El usuario administra esta organización? (tabla miembros)
export async function esMiembro(userId: string, organizacion: string) {
  const { data, error } = await clienteAdmin()
    .database.from("miembros")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organizacion", organizacion)
    .maybeSingle();
  if (error) console.error(error);
  return Boolean(data);
}

// El usuario si tiene sesión y es miembro de la organización; si no, null.
// Las cuentas se crean a mano (el registro público está desactivado) y se
// asignan a su institución en la tabla miembros.
export const usuarioAdmin = cache(async (organizacion: string) => {
  const usuario = await usuarioSesion();
  if (!usuario) return null;
  return (await esMiembro(usuario.id, organizacion)) ? usuario : null;
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
  datos: Record<string, string>;
  archivo_key: string;
  descargas: number;
  ultima_descarga: string | null;
  creado_en: string;
  actualizado_en: string;
};
