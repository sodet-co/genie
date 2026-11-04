import { usuarioAdmin } from "@/lib/servidor/insforge";

// Nombre del perfil de InsForge (o el correo si no tiene) con su inicial.
export async function UsuarioActual({ organizacion }: { organizacion: string }) {
  const usuario = await usuarioAdmin(organizacion);
  if (!usuario) return null;
  const nombre = usuario.profile?.name?.trim() || usuario.email;
  return (
    <span className="flex min-w-0 items-center gap-2" title={usuario.email}>
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-small font-semibold uppercase text-brand-soft-ink"
      >
        {nombre.charAt(0)}
      </span>
      <span className="hidden max-w-40 truncate text-small font-medium text-ink sm:block">
        {nombre}
      </span>
      <span className="sr-only sm:hidden">{nombre}</span>
    </span>
  );
}
