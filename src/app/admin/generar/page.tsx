import { PestanasGenerar } from "@/componentes/admin/pestanas-generar";

export const metadata = { title: "Generar · Certificados" };

export default function Generar() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 font-semibold">Generar certificados</h1>
        <p className="mt-1 text-ink-muted">
          Carga a las personas y publica: desde ese momento cada una puede
          descargar su certificado en la página pública.
        </p>
      </div>
      <PestanasGenerar />
    </div>
  );
}
