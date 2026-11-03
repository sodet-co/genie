import { updateSession } from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";

// Renueva la sesión del admin antes de renderizar y redirige al login si no
// hay sesión. Es solo un filtro rápido: cada página y API del panel vuelve a
// validar la sesión contra InsForge.
export async function proxy(request: NextRequest) {
  const escritura = NextResponse.next();
  const { accessToken, refreshed } = await updateSession({
    requestCookies: request.cookies,
    responseCookies: escritura.cookies,
  });

  const { pathname } = request.nextUrl;
  if (!accessToken && pathname.startsWith("/admin")) {
    const respuesta = NextResponse.redirect(new URL("/ingresar", request.url));
    for (const c of escritura.cookies.getAll()) respuesta.cookies.set(c);
    return respuesta;
  }
  if (!refreshed) return escritura;

  // Los tokens nuevos también deben llegar a los Server Components de esta
  // misma petición, no solo al navegador.
  const respuesta = NextResponse.next({ request });
  for (const c of escritura.cookies.getAll()) respuesta.cookies.set(c);
  return respuesta;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
