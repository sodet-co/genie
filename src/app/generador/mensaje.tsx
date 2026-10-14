import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";

const TIPOS = {
  error: { Icono: CircleX, clase: "alerta-error", rol: "alert" },
  ok: { Icono: CircleCheck, clase: "alerta-ok", rol: "status" },
  aviso: { Icono: TriangleAlert, clase: "aviso", rol: undefined },
} as const;

// Todo estado lleva ícono y palabra, nunca solo color.
export function Mensaje({
  tipo,
  children,
}: {
  tipo: keyof typeof TIPOS;
  children: React.ReactNode;
}) {
  const { Icono, clase, rol } = TIPOS[tipo];
  return (
    <div role={rol} className={`${clase} flex items-start gap-2`}>
      <Icono aria-hidden size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
