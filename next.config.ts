import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Antes del multicliente el panel vivía en la raíz: las rutas viejas llevan
  // a la Universidad del Atlántico, el primer cliente.
  async redirects() {
    return [
      { source: "/admin", destination: "/ua/admin", permanent: false },
      { source: "/admin/:ruta*", destination: "/ua/admin/:ruta*", permanent: false },
      { source: "/ingresar", destination: "/ua/ingresar", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
