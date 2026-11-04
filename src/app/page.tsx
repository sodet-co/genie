import {
  FileSpreadsheet,
  Palette,
  RefreshCw,
  ShieldCheck,
  Download,
  ArrowRight,
} from "lucide-react";
import { Encabezado } from "@/componentes/encabezado";
import { FormularioContacto } from "@/componentes/landing/formulario-contacto";
import { PieSodet } from "@/componentes/pie-sodet";

const FUNCIONES = [
  {
    Icono: FileSpreadsheet,
    titulo: "Carga masiva desde Excel",
    texto:
      "Descarga el modelo, llénalo con nombre, tipo y título, y publica cientos de certificados en una sola tanda.",
  },
  {
    Icono: Palette,
    titulo: "Con la identidad de tu institución",
    texto:
      "Tus diseños de certificado tal cual, y un portal con los colores de tu institución en su propia dirección.",
  },
  {
    Icono: Download,
    titulo: "Portal de descarga",
    texto:
      "Cada participante escribe su nombre y descarga su certificado. Nada de enviar correos uno por uno.",
  },
  {
    Icono: RefreshCw,
    titulo: "Correcciones sin dolor",
    texto:
      "¿Un nombre mal escrito o un ajuste al diseño? Corriges y regeneras: el participante siempre baja la versión vigente.",
  },
  {
    Icono: ShieldCheck,
    titulo: "Tú decides cuándo",
    texto:
      "Solo se descargan los certificados que tu equipo publicó. Sin publicar, no hay certificado.",
  },
];

const PASOS = [
  "Nos envías los diseños de tus certificados y los preparamos.",
  "Tu equipo carga a los participantes desde Excel y publica.",
  "Compartes el enlace del portal y cada persona descarga el suyo.",
];

export default function Inicio() {
  return (
    <>
      <Encabezado seccion="Certificados">
        <a href="#contacto" className="enlace text-small">
          Solicitar demo
        </a>
      </Encabezado>

      <main className="flex-1">
        <section className="border-b border-border bg-surface-raised">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
            <p className="text-label uppercase text-brand">Genie · Certificados</p>
            <h1 className="max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              Los certificados de tus eventos, listos para descargar.
            </h1>
            <p className="max-w-xl text-body-lg text-ink-muted">
              Congresos, diplomados, cursos y seminarios: genera los certificados de participación
              con tus diseños, publícalos en un clic y deja que cada participante descargue el suyo.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#contacto" className="boton-primario">
                Solicitar una demo
                <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
              </a>
              <a href="#como-funciona" className="boton-secundario">
                Cómo funciona
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-h1 font-semibold">Todo lo que necesita tu equipo</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map(({ Icono, titulo, texto }) => (
              <li
                key={titulo}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-5 shadow-card"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand-soft-ink">
                  <Icono aria-hidden size={18} strokeWidth={1.75} />
                </span>
                <h3 className="text-h2 font-semibold">{titulo}</h3>
                <p className="text-ink-muted">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="border-y border-border bg-surface-raised">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-h1 font-semibold">Cómo funciona</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {PASOS.map((paso, i) => (
                <li key={paso} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-on-brand">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-ink">{paso}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contacto" className="mx-auto w-full max-w-3xl scroll-mt-6 px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-h1 font-semibold">Hablemos de tu próximo evento</h2>
          <p className="mt-2 text-ink-muted">
            Cuéntanos qué necesitas y te mostramos cómo quedaría con los diseños de tu institución.
          </p>
          <div className="mt-6 rounded-lg border border-border bg-surface-raised p-5 shadow-card sm:p-8">
            <FormularioContacto />
          </div>
        </section>
      </main>

      <PieSodet />
    </>
  );
}
