"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

// Ventana modal sobre <dialog>: foco atrapado, Esc para cerrar y fondo oscuro
// nativos. Con `bloquearCierre` (p. ej. mientras se publica) no se cierra.
export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  ancho = "sm:max-w-5xl",
  bloquearCierre = false,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: React.ReactNode;
  ancho?: string;
  bloquearCierre?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!bloquearCierre) onCerrar();
      }}
      // h-fit, no h-auto: un <dialog> modal está anclado arriba y abajo
      // (inset: 0), y con altura "auto" se estira a toda la pantalla aunque
      // tenga poco contenido. En celular sale como hoja desde abajo, del alto
      // de su contenido; en pantallas grandes, centrado. Si no cabe, el cuerpo
      // tiene su propio scroll.
      className={`m-0 mt-auto h-fit max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-xl bg-surface-raised p-0 text-ink open:flex backdrop:bg-black/50 sm:m-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:rounded-lg sm:border sm:border-border sm:shadow-pop ${ancho}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-h2 font-semibold">{titulo}</h2>
          {descripcion && <p className="text-small text-ink-muted">{descripcion}</p>}
        </div>
        <button
          type="button"
          onClick={onCerrar}
          disabled={bloquearCierre}
          aria-label="Cerrar"
          className="-mr-2 rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
        >
          <X aria-hidden size={20} strokeWidth={1.75} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </dialog>
  );
}
