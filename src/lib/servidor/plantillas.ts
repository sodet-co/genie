import type { Organizacion, PlantillaEvento } from "@/lib/organizaciones";
import { versionPlantilla } from "@/lib/version-plantilla";
import { BUCKET, clienteAdmin } from "./supabase";

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

// Sube (o reemplaza) un archivo del storage con su tipo.
async function subir(ruta: string, datos: Blob) {
  const { error } = await clienteAdmin()
    .storage.from(BUCKET)
    .upload(ruta, datos, { upsert: true, contentType: datos.type || "application/octet-stream" });
  if (error) throw error;
}

// Guarda una versión nueva; la anterior (si había) pasa al historial.
export async function guardarPersonalizada(org: string, id: string, archivo: ArchivoPlantilla, datos: Blob) {
  const anterior = await leerPersonalizada(org, id, archivo);
  if (anterior) await subir(rutaHistorial(org, id, archivo), anterior);
  await subir(rutaPersonalizada(org, id, archivo), datos);
}

// Vuelve a la original: quita la personalizada (queda copia en el historial).
export async function quitarPersonalizada(org: string, id: string, archivo: ArchivoPlantilla) {
  const anterior = await leerPersonalizada(org, id, archivo);
  if (!anterior) return false;
  await subir(rutaHistorial(org, id, archivo), anterior);
  const { error } = await clienteAdmin().storage.from(BUCKET).remove([rutaPersonalizada(org, id, archivo)]);
  if (error) throw error;
  return true;
}

// Qué plantillas tienen versión personalizada, y desde cuándo.
export async function estadoPlantillas(org: Organizacion) {
  // Solo el nivel de la carpeta (la subcarpeta historial/ sale como entrada
  // sin id y se ignora).
  const { data, error } = await clienteAdmin()
    .storage.from(BUCKET)
    .list(raiz(org.slug), { limit: 1000 });
  if (error) throw error;
  const objetos = (data ?? [])
    .filter((o) => o.id)
    .map((o) => ({ key: `${raiz(org.slug)}/${o.name}`, uploadedAt: o.updated_at ?? o.created_at }));
  return Object.fromEntries(
    org.evento.plantillas.map((p) => {
      const de = (archivo: ArchivoPlantilla) =>
        objetos.find((o) => o.key === rutaPersonalizada(org.slug, p.id, archivo))?.uploadedAt ?? null;
      return [p.id, { html: de("html"), fondo: de("fondo") }];
    }),
  ) as Record<string, { html: string | null; fondo: string | null }>;
}

// Versión vigente de cada plantilla (lib/version-plantilla), calculada con los
// mismos archivos que sirve /api/<org>/plantillas/<id>/<archivo>. Se guarda en
// memoria por fecha de cambio: solo se vuelve a leer si alguien la cambia.
const versionesEnMemoria = new Map<string, string>();

export async function versionesPlantillas(org: Organizacion, base: string) {
  const estado = await estadoPlantillas(org);
  const pares = await Promise.all(
    org.evento.plantillas.map(async (p) => {
      const cambio = estado[p.id] ?? { html: null, fondo: null };
      const clave = `${org.slug}|${p.id}|${cambio.html ?? "original"}|${cambio.fondo ?? "original"}`;
      let version = versionesEnMemoria.get(clave);
      if (!version) {
        const leer = async (archivo: ArchivoPlantilla) =>
          (await leerPersonalizada(org.slug, p.id, archivo)) ?? (await leerOriginal(base, p, archivo));
        const [html, fondo] = await Promise.all([leer("html"), leer("fondo")]);
        version = await versionPlantilla(await html.arrayBuffer(), await fondo.arrayBuffer());
        versionesEnMemoria.set(clave, version);
      }
      return [p.id, version] as const;
    }),
  );
  return Object.fromEntries(pares) as Record<string, string>;
}
