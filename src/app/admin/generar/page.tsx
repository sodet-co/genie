import { Generador } from "@/componentes/generador/generador";

export const metadata = { title: "Generar · Certificados" };

export default function Generar() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div>
        <h1 className="text-h1 font-semibold">Generar certificados</h1>
        <p className="mt-1 text-ink-muted">
          Los PDF se crean en este navegador y se publican: desde ese momento la
          persona puede descargarlos en la página pública.
        </p>
      </div>
      <Generador />
    </div>
  );
}
