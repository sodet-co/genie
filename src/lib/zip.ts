import JSZip from "jszip";
import { nombreSeguro } from "./plantilla";

export type ArchivoZip = {
  // Nombre sin extensión; si se repite se le agrega " (2)", " (3)"…
  nombre: string;
  carpeta?: string;
  obtener: () => Promise<Blob>;
};

export class ZipCancelado extends Error {}

// Arma el ZIP en el navegador, bajando los PDF de a varios a la vez. Se hace
// aquí y no en el servidor porque Vercel limita cada respuesta a ~4,5 MB y
// cada certificado pesa 1–2 MB.
export async function armarZip(
  archivos: ArchivoZip[],
  opciones: {
    simultaneos?: number;
    onProgreso?: (hechos: number) => void;
    estaCancelado?: () => boolean;
  } = {},
) {
  const zip = new JSZip();
  const usados = new Set<string>();
  const rutas = archivos.map((a) => {
    const carpeta = a.carpeta ? `${nombreSeguro(a.carpeta)}/` : "";
    const base = `${carpeta}${nombreSeguro(a.nombre)}`;
    let ruta = base;
    for (let n = 2; usados.has(ruta.toLowerCase()); n++) ruta = `${base} (${n})`;
    usados.add(ruta.toLowerCase());
    return `${ruta}.pdf`;
  });

  let siguiente = 0;
  let hechos = 0;
  const trabajador = async () => {
    while (siguiente < archivos.length) {
      if (opciones.estaCancelado?.()) throw new ZipCancelado();
      const i = siguiente++;
      zip.file(rutas[i], await archivos[i].obtener());
      opciones.onProgreso?.(++hechos);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(opciones.simultaneos ?? 4, archivos.length) }, trabajador),
  );
  if (opciones.estaCancelado?.()) throw new ZipCancelado();
  // Los PDF ya vienen comprimidos: STORE es más rápido y pesa casi lo mismo.
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
