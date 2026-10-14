"use client";

import { useState } from "react";
import { generarIndividual } from "@/lib/generar";
import {
  medidasPagina,
  type Orientacion,
  type Registro,
  type Tamano,
} from "@/lib/plantilla";
import { Mensaje } from "./mensaje";
import { PasoDatos } from "./paso-datos";
import { PasoGenerar } from "./paso-generar";
import { PasoPlantilla, type Plantilla } from "./paso-plantilla";
import { VistaPrevia } from "./vista-previa";

export function Generador() {
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [tamano, setTamano] = useState<Tamano>("carta");
  const [orientacion, setOrientacion] = useState<Orientacion>("horizontal");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [indicePrevia, setIndicePrevia] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagina = medidasPagina(tamano, orientacion);
  const marcadores = plantilla?.marcadores ?? [];
  const campoNombrePorDefecto =
    marcadores.find((m) => m.toLowerCase() === "nombre") ?? marcadores[0] ?? "";
  const [campoNombre, setCampoNombre] = useState("");
  const campoNombreEfectivo = marcadores.includes(campoNombre)
    ? campoNombre
    : campoNombrePorDefecto;

  const registroPrevia = registros[Math.min(indicePrevia, registros.length - 1)];

  async function descargarUno(registro: Registro) {
    if (!plantilla) return;
    setOcupado(true);
    setError(null);
    try {
      await generarIndividual(registro, {
        html: plantilla.html,
        pagina,
        campoNombre: campoNombreEfectivo,
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el PDF. Revisa la plantilla e inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <Seccion
        numero={1}
        titulo="Plantilla"
        descripcion="Sube el HTML del certificado y define el tamaño de la página."
      >
        <PasoPlantilla
          plantilla={plantilla}
          onCargar={(p) => {
            setPlantilla(p);
            setIndicePrevia(0);
          }}
          tamano={tamano}
          orientacion={orientacion}
          onTamano={setTamano}
          onOrientacion={setOrientacion}
          pagina={pagina}
        />
        {plantilla && (
          <VistaPrevia
            html={plantilla.html}
            marcadores={marcadores}
            registro={registroPrevia}
            pagina={pagina}
          />
        )}
      </Seccion>

      {plantilla && (
        <Seccion
          numero={2}
          titulo="Registros"
          descripcion="Agrega participantes a mano o impórtalos desde un archivo de Excel."
        >
          <PasoDatos
            marcadores={marcadores}
            registros={registros}
            onCambiar={(nuevos) => {
              setRegistros(nuevos);
              setIndicePrevia((i) => Math.min(i, Math.max(nuevos.length - 1, 0)));
            }}
            indicePrevia={indicePrevia}
            onVer={setIndicePrevia}
            onDescargar={descargarUno}
            ocupado={ocupado}
          />
        </Seccion>
      )}

      {plantilla && registros.length > 0 && (
        <Seccion
          numero={3}
          titulo="Generar certificados"
          descripcion="Descarga todos los certificados en un ZIP o en un solo PDF."
        >
          <PasoGenerar
            html={plantilla.html}
            pagina={pagina}
            marcadores={marcadores}
            registros={registros}
            campoNombre={campoNombreEfectivo}
            onCampoNombre={setCampoNombre}
            ocupado={ocupado}
            onOcupado={setOcupado}
          />
        </Seccion>
      )}

      {error && (
        <Mensaje tipo="error">
          {error}
        </Mensaje>
      )}
    </div>
  );
}

function Seccion({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: number;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <header className="lg:pt-1">
        <p className="text-label uppercase text-ink-muted">Paso {numero}</p>
        <h2 className="mt-1 text-h2 font-semibold">{titulo}</h2>
        <p className="mt-1 text-small text-ink-muted">{descripcion}</p>
      </header>
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface-raised p-4 shadow-card sm:p-6">
        {children}
      </div>
    </section>
  );
}
