// Genera las imágenes del portal de la UA a partir del diseño del certificado:
// recorta cada zona, la reduce (filtro de caja) y vuelve transparente el fondo
// crema para que funcione sobre cualquier fondo.
//
//   node scripts/recortar-ua.mjs
//
// Coordenadas en píxeles del PNG original (4538 × 3508).
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const ORIGEN = "public/plantillas/ua/seminario-xvii/asistente.png";
const DESTINO = "public/temas/ua";
const CREMA = [244, 239, 224];

const RECORTES = [
  // nombre, x, y, ancho, alto, ancho de salida, [zonas a borrar (x, y, ancho, alto)]
  ["vegetacion", 0, 0, 720, 2270, 380],
  ["garza", 3687, 397, 600, 340, 300],
  ["barranquilla", 3480, 2156, 1058, 1244, 600],
  ["figura-roja", 0, 2768, 800, 640, 400],
];

const fuente = PNG.sync.read(fs.readFileSync(ORIGEN));
fs.mkdirSync(DESTINO, { recursive: true });

function pixel(x, y) {
  const i = (y * fuente.width + x) * 4;
  return fuente.data.subarray(i, i + 4);
}

for (const [nombre, x0, y0, ancho, alto, anchoSalida, borrar = []] of RECORTES) {
  const escala = ancho / anchoSalida;
  const w = anchoSalida;
  const h = Math.round(alto / escala);
  const salida = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Promedio de la caja de origen que cae en este píxel.
      const xa = Math.floor(x0 + x * escala), xb = Math.max(xa + 1, Math.floor(x0 + (x + 1) * escala));
      const ya = Math.floor(y0 + y * escala), yb = Math.max(ya + 1, Math.floor(y0 + (y + 1) * escala));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = ya; yy < yb; yy++) {
        for (let xx = xa; xx < xb; xx++) {
          const p = pixel(Math.min(xx, fuente.width - 1), Math.min(yy, fuente.height - 1));
          r += p[0]; g += p[1]; b += p[2]; n++;
        }
      }
      r /= n; g /= n; b /= n;
      if (borrar.some(([bx, by, bw, bh]) => xa >= bx && xa < bx + bw && ya >= by && ya < by + bh)) {
        [r, g, b] = CREMA;
      }
      // Distancia al crema: cerca → transparente, con borde suave.
      const d = Math.hypot(r - CREMA[0], g - CREMA[1], b - CREMA[2]);
      const alfa = Math.min(1, Math.max(0, (d - 8) / 40));
      // Quita el crema mezclado en los bordes para que no quede un halo claro.
      const des = (c, f) => (alfa > 0 ? Math.min(255, Math.max(0, (c - f * (1 - alfa)) / alfa)) : 0);
      const i = (y * w + x) * 4;
      salida.data[i] = des(r, CREMA[0]);
      salida.data[i + 1] = des(g, CREMA[1]);
      salida.data[i + 2] = des(b, CREMA[2]);
      salida.data[i + 3] = Math.round(alfa * 255);
    }
  }
  const archivo = path.join(DESTINO, `${nombre}.png`);
  fs.writeFileSync(archivo, PNG.sync.write(salida, { colorType: 6 }));
  console.log(archivo, `${w}×${h}`, `${Math.round(fs.statSync(archivo).size / 1024)} KB`);
}
