import { clienteAdmin, TABLA, usuarioAdmin } from "@/lib/servidor/insforge";

const MAXIMO = 5000;

// Certificados que se pueden regenerar: los hechos con una plantilla del evento.
export async function GET() {
  if (!(await usuarioAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await clienteAdmin()
    .database.from(TABLA)
    .select("id, clave_original, nombre, tipo, plantilla, datos")
    .not("plantilla", "is", null)
    .order("nombre")
    .range(0, MAXIMO - 1);
  if (error) {
    console.error(error);
    return Response.json({ error: "No se pudo leer la base de datos." }, { status: 500 });
  }
  return Response.json({ certificados: data ?? [] });
}
