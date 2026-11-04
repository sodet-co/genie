"use client";

import { Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Dialogo } from "@/componentes/dialogo";
import { Mensaje } from "@/componentes/generador/mensaje";
import { ResumenPublicacion } from "@/componentes/generador/resultado-publicacion";
import {
  Cancelado,
  SesionVencida,
  type ResultadoPublicacion,
} from "@/lib/generar";
import { regenerar, type CertificadoRegenerable } from "@/lib/regenerar";

// Regenera un certificado con la plantilla actual y sus datos guardados.
export function BotonRegenerar({
  certificado,
  comoBoton = false,
}: {
  certificado: CertificadoRegenerable;
  comoBoton?: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<"listo" | "trabajando" | "ok" | "error">(
    "listo",
  );

  async function alHacerClic() {
    setEstado("trabajando");
    try {
      const r = await regenerar([certificado], {
        onProgreso: () => {},
        estaCancelado: () => false,
      });
      setEstado(r.fallidos.length ? "error" : "ok");
      router.refresh();
    } catch (e) {
      console.error(e);
      setEstado("error");
    }
  }

  const Icono =
    estado === "trabajando"
      ? LoaderCircle
      : estado === "ok"
        ? Check
        : estado === "error"
          ? X
          : RefreshCw;
  const texto =
    estado === "trabajando"
      ? "Regenerando…"
      : estado === "ok"
        ? "Regenerado"
        : estado === "error"
          ? "Falló, reintentar"
          : "Regenerar";

  return (
    <button
      type="button"
      onClick={alHacerClic}
      disabled={estado === "trabajando"}
      className={
        comoBoton
          ? "boton-secundario flex-1"
          : `enlace inline-flex items-center gap-1 ${estado === "error" ? "text-danger" : ""}`
      }
    >
      <Icono
        aria-hidden
        size={16}
        strokeWidth={1.75}
        className={estado === "trabajando" ? "animate-spin" : undefined}
      />
      {texto}
    </button>
  );
}

// Regenera en lote todos los certificados hechos con plantillas del evento.
export function BotonRegenerarTodos() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [total, setTotal] = useState(0);
  const [hechos, setHechos] = useState(0);
  const [resultado, setResultado] = useState<ResultadoPublicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelado = useRef(false);

  async function iniciar() {
    cancelado.current = false;
    setOcupado(true);
    setResultado(null);
    setError(null);
    setHechos(0);
    try {
      const respuesta = await fetch("/api/admin/certificados/regenerables");
      if (respuesta.status === 401) throw new SesionVencida();
      if (!respuesta.ok) throw new Error(`error ${respuesta.status}`);
      const { certificados } = (await respuesta.json()) as {
        certificados: CertificadoRegenerable[];
      };
      setTotal(certificados.length);
      setResultado(
        await regenerar(certificados, {
          onProgreso: setHechos,
          estaCancelado: () => cancelado.current,
        }),
      );
    } catch (e) {
      if (e instanceof Cancelado) {
        setError(
          "Regeneración cancelada. Los que ya se regeneraron quedan actualizados.",
        );
      } else if (e instanceof SesionVencida) {
        setError("Tu sesión venció. Vuelve a ingresar.");
      } else {
        console.error(e);
        setError("No se pudieron regenerar los certificados.");
      }
    } finally {
      setOcupado(false);
    }
  }

  const porcentaje = total ? Math.round((hechos / total) * 100) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="boton-secundario w-full sm:w-auto"
      >
        <RefreshCw aria-hidden size={16} strokeWidth={1.75} />
        Regenerar todos
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => {
          setAbierto(false);
          router.refresh();
        }}
        bloquearCierre={ocupado}
        titulo="Regenerar todos los certificados"
        descripcion="Con la plantilla actual y los datos guardados de cada persona."
        ancho="sm:max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <p className="text-ink-muted">
            Cada certificado se vuelve a generar y reemplaza al anterior. Las
            personas lo siguen descargando igual. Los certificados de otro
            evento (plantilla subida a mano) no se incluyen.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={iniciar}
              disabled={ocupado}
              className="boton-primario"
            >
              <RefreshCw aria-hidden size={16} strokeWidth={1.75} />
              {resultado ? "Regenerar de nuevo" : "Regenerar"}
            </button>
            {ocupado && total > 0 && hechos < total && (
              <button
                type="button"
                onClick={() => (cancelado.current = true)}
                className="boton-secundario"
              >
                <X aria-hidden size={16} strokeWidth={1.75} />
                Cancelar
              </button>
            )}
          </div>
          {ocupado && (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-sunken">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <p className="text-ink-muted">
                {total
                  ? `Regenerando ${Math.min(hechos + 1, total)} de ${total}…`
                  : "Preparando…"}
              </p>
            </div>
          )}
          {resultado && (
            <ResumenPublicacion resultado={resultado} conEnlace={false} />
          )}
          {error && <Mensaje tipo="error">{error}</Mensaje>}
        </div>
      </Dialogo>
    </>
  );
}
