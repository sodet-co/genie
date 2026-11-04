import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UsuarioActual } from "@/componentes/admin/usuario-actual";
import { Encabezado } from "@/componentes/encabezado";
import { usuarioAdmin } from "@/lib/servidor/insforge";
import { cerrarSesion } from "../ingresar/acciones";

export const metadata = { title: "Panel · Certificados" };

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Encabezado seccion="Administración">
        <nav className="flex items-center gap-1 text-small sm:gap-3">
          <Link href="/admin" className="enlace px-1.5 py-1 sm:px-2">
            Certificados
          </Link>
          <Link href="/admin/plantillas" className="enlace px-1.5 py-1 sm:px-2">
            Plantillas
          </Link>
        </nav>
        <span aria-hidden className="h-5 w-px bg-border" />
        <Suspense fallback={<span className="size-7 rounded-full bg-surface-sunken" />}>
          <UsuarioActual />
        </Suspense>
        <form action={cerrarSesion}>
          <button
            type="submit"
            aria-label="Salir"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-small text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <LogOut aria-hidden size={16} strokeWidth={1.75} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </Encabezado>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Suspense fallback={<p className="text-ink-muted">Cargando…</p>}>
          <Guardia>{children}</Guardia>
        </Suspense>
      </main>
    </>
  );
}

// La sesión se valida contra InsForge en cada carga del panel.
async function Guardia({ children }: { children: React.ReactNode }) {
  if (!(await usuarioAdmin())) redirect("/ingresar");
  return children;
}
