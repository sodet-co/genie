import type { TipoCertificado } from "./tipos";

// Cada institución cliente vive en /<slug> con su evento, sus plantillas y su
// tema (colores en globals.css bajo [data-org="<slug>"]). Sus datos (qué
// usuarios la administran, sus certificados, su plan) están en InsForge, en
// las tablas organizaciones, miembros y certificados.
//
// Para agregar una institución: una entrada aquí, su fila en `organizaciones`,
// sus miembros, sus plantillas en public/plantillas/<slug>/ y, si se quiere,
// su tema en globals.css.

export type PlantillaEvento = {
  id: string;
  tipo: TipoCertificado;
  nombre: string;
  descripcion: string;
  marcadores: string[];
  // Rutas públicas del HTML y su fondo.
  html: string;
  fondo: string;
};

export type Organizacion = {
  slug: string;
  nombre: string;
  // Lo que la persona escribe en el portal para encontrar su certificado.
  etiquetaBusqueda: string;
  // Portal con diseño propio (src/componentes/temas/<diseno>); sin él, el
  // portal estándar de Genie con los colores de la organización.
  diseno?: "ua";
  evento: {
    nombre: string;
    plantillas: PlantillaEvento[];
  };
};

function plantillas(
  carpeta: string,
  lista: Omit<PlantillaEvento, "html" | "fondo">[],
): PlantillaEvento[] {
  return lista.map((p) => ({
    ...p,
    html: `${carpeta}/${p.id}.html`,
    fondo: `${carpeta}/${p.id}.png`,
  }));
}

export const ORGANIZACIONES: Record<string, Organizacion> = {
  ua: {
    slug: "ua",
    nombre: "Universidad del Atlántico",
    etiquetaBusqueda: "Nombre completo",
    diseno: "ua",
    evento: {
      nombre: "XVII Seminario Internacional Investigación Urbano Regional",
      plantillas: plantillas("/plantillas/ua/seminario-xvii", [
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
      ]),
    },
  },
};

export function buscarOrganizacion(slug: string | null | undefined): Organizacion | null {
  return (slug && Object.hasOwn(ORGANIZACIONES, slug) && ORGANIZACIONES[slug]) || null;
}

export function plantillaPorTipo(org: Organizacion, tipo: TipoCertificado | "") {
  return org.evento.plantillas.find((p) => p.tipo === tipo) ?? null;
}

export function plantillaPorId(org: Organizacion, id: string | null | undefined) {
  return org.evento.plantillas.find((p) => p.id === id) ?? null;
}

// Rutas de una organización (páginas y API).
export const rutaOrg = (slug: string, ruta = "") => `/${slug}${ruta}`;
export const rutaApi = (slug: string, ruta: string) => `/api/${slug}${ruta}`;

export const DATOS_EJEMPLO = {
  nombre: "María Fernanda Rodríguez de la Hoz",
  titulo: "Turismo comunitario y sostenibilidad territorial en el Caribe colombiano",
};
