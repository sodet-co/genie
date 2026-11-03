import { nombreSeguro } from "@/lib/plantilla";

export function respuestaPdf(pdf: Blob, nombre: string) {
  const archivo = `${nombreSeguro(nombre)}.pdf`;
  const ascii = archivo.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
