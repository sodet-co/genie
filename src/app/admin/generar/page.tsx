import { Generador } from "@/componentes/generador/generador";

export const metadata = { title: "Generar · Certificados" };

export default async function Generar({ searchParams }: PageProps<"/admin/generar">) {
  const { plantilla } = await searchParams;
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div>
        <h1 className="text-h1 font-semibold">Generar certificados</h1>
        <p className="mt-1 text-ink-muted">
          Elige la plantilla, agrega a las personas y publica: desde ese momento
          cada una puede descargar su certificado en la página pública.
        </p>
      </div>
      <Generador plantillaInicial={typeof plantilla === "string" ? plantilla : undefined} />
    </div>
  );
}
