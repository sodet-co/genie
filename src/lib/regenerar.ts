import { publicarLote, type ItemPublicacion } from "./generar";
import { medidasPagina } from "./plantilla";
import { PLANTILLAS_EVENTO } from "./plantillas-evento";
import { cargarPlantillaEvento } from "./preparar-plantilla";
import { esTipo } from "./tipos";

export type CertificadoRegenerable = {
  id: string;
  clave_original: string;
  nombre: string;
  tipo: string;
  plantilla: string | null;
  datos: Record<string, string>;
};

// Vuelve a generar certificados ya publicados con la plantilla actual y los
// datos guardados. Cada uno reemplaza al anterior (misma clave).
export async function regenerar(
  certificados: CertificadoRegenerable[],
  opciones: { onProgreso: (hechos: number) => void; estaCancelado: () => boolean },
) {
  const ids = new Set(certificados.map((c) => c.plantilla));
  const plantillas = new Map(
    await Promise.all(
      PLANTILLAS_EVENTO.filter((p) => ids.has(p.id)).map(
        async (p) => [p.id, await cargarPlantillaEvento(p)] as const,
      ),
    ),
  );

  const items: ItemPublicacion[] = [];
  certificados.forEach((c, i) => {
    const plantilla = c.plantilla ? plantillas.get(c.plantilla) : undefined;
    if (!plantilla || !esTipo(c.tipo)) return;
    items.push({
      fila: i + 1,
      registro: c.datos ?? {},
      html: plantilla.html,
      tipo: c.tipo,
      plantilla: c.plantilla!,
      clave: c.clave_original,
      nombre: c.nombre,
    });
  });

  return publicarLote(items, {
    pagina: medidasPagina("carta", "horizontal"),
    campoClave: "nombre",
    campoNombre: "nombre",
    ...opciones,
  });
}
