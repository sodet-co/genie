"use client";

import { useState } from "react";
import { GeneradorEvento } from "@/componentes/evento/generador-evento";
import { Generador } from "@/componentes/generador/generador";
import { Pestana } from "@/componentes/generador/paso-datos";
import { EVENTO_ACTUAL } from "@/lib/plantillas-evento";

export function PestanasGenerar() {
  const [modo, setModo] = useState<"evento" | "otra">("evento");
  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        <Pestana activa={modo === "evento"} onClick={() => setModo("evento")}>
          {EVENTO_ACTUAL.nombreCorto}
        </Pestana>
        <Pestana activa={modo === "otra"} onClick={() => setModo("otra")}>
          Otro evento (subir plantilla)
        </Pestana>
      </div>
      {modo === "evento" ? <GeneradorEvento /> : <Generador />}
    </div>
  );
}
