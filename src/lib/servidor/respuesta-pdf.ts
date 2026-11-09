import { nombreSeguro } from "@/lib/plantilla";

// Respuesta de descarga con el nombre del archivo en ASCII y en UTF-8.
export function respuestaArchivo(datos: Blob, archivo: string, tipo: string) {
  const ascii = archivo.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(datos, {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function respuestaPdf(pdf: Blob, nombre: string) {
  return respuestaArchivo(pdf, `${nombreSeguro(nombre)}.pdf`, "application/pdf");
}
