// PASO 2 · Rellena la columna `busqueda` de los certificados ya publicados,
// con la misma regla que usa la plataforma al publicar (textoBusqueda en
// src/lib/busqueda.ts): nombre, clave, título y correos, en minúscula y sin
// tildes. Solo escribe esa columna.
//
// Desde la carpeta del proyecto (C:\genie):
//   node scripts/2-rellenar-busqueda.mjs            → solo muestra cuántos cambiaría
//   node scripts/2-rellenar-busqueda.mjs --aplicar  → los actualiza
//
// Lee las credenciales de .env.local (NEXT_PUBLIC_INSFORGE_URL e INSFORGE_API_KEY).
import fs from "node:fs";
import { createAdminClient } from "@insforge/sdk";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);
const db = createAdminClient({
  baseUrl: env.NEXT_PUBLIC_INSFORGE_URL,
  apiKey: env.INSFORGE_API_KEY,
});
const aplicar = process.argv.includes("--aplicar");

const normalizar = (t) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@.-]+/gu, " ")
    .trim();
const texto = (f) =>
  normalizar([f.nombre, f.clave_original ?? "", f.datos?.titulo ?? "", ...(f.correos ?? [])].join(" "));

const filas = [];
for (let desde = 0; ; desde += 500) {
  const { data, error } = await db.database
    .from("certificados")
    .select("id, nombre, clave_original, datos, correos, busqueda")
    .order("id")
    .range(desde, desde + 499);
  if (error) {
    console.error("No se pudo leer la tabla. ¿Ya corriste el paso 1?", error.message ?? error);
    process.exit(1);
  }
  filas.push(...data);
  if (data.length < 500) break;
}

const cambian = filas.filter((f) => f.busqueda !== texto(f));
console.log(`Certificados: ${filas.length} · por rellenar: ${cambian.length}`);
if (cambian[0]) console.log(`Ejemplo: ${cambian[0].nombre} → "${texto(cambian[0]).slice(0, 100)}…"`);
if (!aplicar) {
  console.log("Nada se cambió. Para aplicarlo: node scripts/2-rellenar-busqueda.mjs --aplicar");
  process.exit(0);
}

let ok = 0;
for (const f of cambian) {
  const { error } = await db.database.from("certificados").update({ busqueda: texto(f) }).eq("id", f.id);
  if (error) console.error(`Error en ${f.nombre} (${f.id}):`, error.message ?? error);
  else ok++;
}
console.log(`Listo: ${ok} de ${cambian.length} rellenados.`);
