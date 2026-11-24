import { usuarioAdmin } from "@/lib/servidor/supabase";

// Nombre del usuario en Supabase (Authentication → Users → Display name, o
// user_metadata.name) o, si no tiene, el correo; con su inicial.
export async function UsuarioActual({ organizacion }: { organizacion: string }) {
  const usuario = await usuarioAdmin(organizacion);
  if (!usuario) return null;
  const meta = usuario.user_metadata ?? {};
  const nombre =
    String(meta.display_name ?? meta.full_name ?? meta.name ?? "").trim() || usuario.email || "Administrador";
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
