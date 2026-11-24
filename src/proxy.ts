import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renueva la sesión del admin antes de renderizar y redirige al login si no
// hay sesión. Es solo un filtro rápido: cada página y API del panel vuelve a
// validar la sesión contra Supabase (usuarioAdmin).
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // Los tokens renovados van a la petición (para los Server Components
        // de esta misma petición) y a la respuesta (para el navegador).
        setAll: (lista) => {
          for (const { name, value } of lista) request.cookies.set(name, value);
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of lista) respuesta.cookies.set(name, value, options);
        },
      },
    },
  );

  // getClaims valida la firma del token (y lo renueva si venció).
  const { data } = await supabase.auth.getClaims();
  const conSesion = Boolean(data?.claims?.sub);

  // /<org>/admin/... sin sesión → /<org>/ingresar (las API responden 401).
  const [, org, seccion] = request.nextUrl.pathname.split("/");
  if (!conSesion && org !== "api" && seccion === "admin") {
    const redireccion = NextResponse.redirect(new URL(`/${org}/ingresar`, request.url));
    for (const c of respuesta.cookies.getAll()) redireccion.cookies.set(c);
    return redireccion;
  }
  return respuesta;
}

export const config = {
  matcher: ["/:org/admin/:path*", "/api/:org/admin/:path*"],
};
