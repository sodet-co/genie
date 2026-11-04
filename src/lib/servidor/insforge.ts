import { createAdminClient } from "@insforge/sdk";
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

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

// Devuelve el usuario si la sesión (cookie) es válida. Todo usuario de InsForge
// es admin: el registro público está desactivado y las cuentas se crean a mano.
// La validación la hace InsForge, no solo la presencia de la cookie.
export async function usuarioAdmin() {
  // cookies() queda fuera del try: durante el prerender rechaza a propósito y
  // Next debe ver ese rechazo.
  const almacen = await cookies();
  try {
    const cliente = createServerClient({ cookies: almacen });
    const { data } = await cliente.auth.getCurrentUser();
    const usuario = data.user;
    return usuario ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export type FilaCertificado = {
  id: string;
  clave: string;
  clave_original: string;
  nombre: string;
  tipo: string;
  datos: Record<string, string>;
  archivo_key: string;
  descargas: number;
  ultima_descarga: string | null;
  creado_en: string;
  actualizado_en: string;
};
