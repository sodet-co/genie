import type { Organizacion, PlantillaEvento } from "@/lib/organizaciones";
import { BUCKET, clienteAdmin } from "./insforge";

// Plantillas reemplazables desde el panel, sin tocar código: si en el storage
// hay una versión personalizada (subida en Plantillas), se usa esa; si no, la
// original de public/plantillas/. Cada reemplazo guarda la versión anterior en
// el historial para poder volver atrás.
//
//   _plantillas/<org>/<id>.html · _plantillas/<org>/<id>.png
//   _plantillas/<org>/historial/<id>-<fecha>.html|png

export type ArchivoPlantilla = "html" | "fondo";

const EXTENSION: Record<ArchivoPlantilla, string> = { html: "html", fondo: "png" };
const raiz = (org: string) => `_plantillas/${org}`;

export const rutaPersonalizada = (org: string, id: string, archivo: ArchivoPlantilla) =>
  `${raiz(org)}/${id}.${EXTENSION[archivo]}`;

const rutaHistorial = (org: string, id: string, archivo: ArchivoPlantilla) =>
  `${raiz(org)}/historial/${id}-${new Date().toISOString().replace(/[:.]/g, "-")}.${EXTENSION[archivo]}`;

// El archivo personalizado si existe; null si no (se usa el original).
export async function leerPersonalizada(org: string, id: string, archivo: ArchivoPlantilla) {
  const { data, error } = await clienteAdmin().storage.from(BUCKET).download(rutaPersonalizada(org, id, archivo));
  return error || !data ? null : data;
}

// Archivo original de public/plantillas (lo sirve el mismo sitio).
export async function leerOriginal(base: string, p: PlantillaEvento, archivo: ArchivoPlantilla) {
  const ruta = archivo === "html" ? p.html : p.fondo;
  const respuesta = await fetch(new URL(ruta, base), { cache: "no-store" });
  if (!respuesta.ok) throw new Error(`No se encontró ${ruta}`);
  return respuesta.blob();
}

// Guarda una versión nueva; la anterior (si había) pasa al historial.
export async function guardarPersonalizada(org: string, id: string, archivo: ArchivoPlantilla, datos: Blob) {
  const storage = clienteAdmin().storage.from(BUCKET);
  const ruta = rutaPersonalizada(org, id, archivo);
  const anterior = await leerPersonalizada(org, id, archivo);
  if (anterior) {
    const { error } = await storage.upload(rutaHistorial(org, id, archivo), anterior);
    if (error) throw error;
  }
  const { error } = await storage.upload(ruta, datos);
  if (error) throw error;
}

// Vuelve a la original: quita la personalizada (queda copia en el historial).
export async function quitarPersonalizada(org: string, id: string, archivo: ArchivoPlantilla) {
  const storage = clienteAdmin().storage.from(BUCKET);
  const anterior = await leerPersonalizada(org, id, archivo);
  if (!anterior) return false;
  const { error: e1 } = await storage.upload(rutaHistorial(org, id, archivo), anterior);
  if (e1) throw e1;
  const { error } = await storage.remove(rutaPersonalizada(org, id, archivo));
  if (error) throw error;
  return true;
}

// Qué plantillas tienen versión personalizada, y desde cuándo.
export async function estadoPlantillas(org: Organizacion) {
  const { data, error } = await clienteAdmin()
    .storage.from(BUCKET)
    .list({ prefix: `${raiz(org.slug)}/`, limit: 200 });
  if (error) throw error;
  const objetos = (data?.objects ?? []).filter((o) => !o.key.includes("/historial/"));
  return Object.fromEntries(
    org.evento.plantillas.map((p) => {
      const de = (archivo: ArchivoPlantilla) =>
        objetos.find((o) => o.key === rutaPersonalizada(org.slug, p.id, archivo))?.uploadedAt ?? null;
      return [p.id, { html: de("html"), fondo: de("fondo") }];
    }),
  ) as Record<string, { html: string | null; fondo: string | null }>;
}
