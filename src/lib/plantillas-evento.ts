import type { TipoCertificado } from "./tipos";

// Plantillas ya cargadas del evento actual. Viven en public/plantillas/<carpeta>/
// (un HTML y su fondo PNG por tipo). Para otro evento se puede seguir subiendo
// un HTML a mano desde "Generar".
export const EVENTO_ACTUAL = {
  nombre: "XVII Seminario Internacional Investigación Urbano Regional",
  carpeta: "/plantillas/seminario-xvii",
};

export type PlantillaEvento = {
  id: string;
  tipo: TipoCertificado;
  nombre: string;
  descripcion: string;
  marcadores: string[];
};

export const PLANTILLAS_EVENTO: PlantillaEvento[] = [
  {
    id: "asistente",
    tipo: "asistente",
    nombre: "Asistente",
    descripcion: "Asistió al seminario.",
    marcadores: ["nombre"],
  },
  {
    id: "ponente",
    tipo: "ponente",
    nombre: "Ponente",
    descripcion: "Participó con una ponencia.",
    marcadores: ["nombre", "titulo"],
  },
  {
    id: "conferencista",
    tipo: "conferencista",
    nombre: "Conferencista",
    descripcion: "Participó con una conferencia.",
    marcadores: ["nombre", "titulo"],
  },
  {
    id: "coordinador-de-mesa",
    tipo: "coordinador_mesa",
    nombre: "Coordinador de mesa",
    descripcion: "Coordinó una mesa temática.",
    marcadores: ["nombre", "titulo"],
  },
];

export const urlHtml = (p: PlantillaEvento) => `${EVENTO_ACTUAL.carpeta}/${p.id}.html`;
export const urlFondo = (p: PlantillaEvento) => `${EVENTO_ACTUAL.carpeta}/${p.id}.png`;

export function buscarPlantillaEvento(id: string | undefined | null) {
  return PLANTILLAS_EVENTO.find((p) => p.id === id) ?? null;
}

export const DATOS_EJEMPLO = {
  nombre: "María Fernanda Rodríguez de la Hoz",
  titulo:
    "Turismo comunitario y sostenibilidad territorial en el Caribe colombiano",
};
