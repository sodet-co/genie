import ExcelJS from "exceljs";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { aplicarFiltros, leerFiltros } from "@/lib/servidor/filtros";
import { bitacoraDe, describirError } from "@/lib/servidor/bitacora";
import { clienteAdmin, TABLA, usuarioAdmin, type FilaCertificado } from "@/lib/servidor/insforge";
import { todasLasFilas } from "@/lib/servidor/paginar";
import { respuestaArchivo } from "@/lib/servidor/respuesta-pdf";
import { etiquetaTipo } from "@/lib/tipos";

type Fila = Pick<
  FilaCertificado,
  "id" | "nombre" | "tipo" | "datos" | "correos" | "descargas" | "ultima_descarga" | "creado_en" | "actualizado_en"
>;

// El servidor (Vercel) corre en UTC: las fechas van en hora de Colombia.
const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

// Informe en Excel de los certificados publicados: una fila por certificado,
// con los mismos filtros del listado (?q=&tipo=). Sirve para validar qué se
// cargó contra los listados de la institución.
export async function GET(request: Request, ctx: RouteContext<"/api/[org]/admin/certificados/excel">) {
  const slug = (await ctx.params).org;
  const org = buscarOrganizacion(slug);
  const b = bitacoraDe(request, { evento: "admin.informe_excel", organizacion: org?.slug ?? slug });
  if (!org) {
    b.registrar({ resultado: "no_encontrado", estadoHttp: 404, mensaje: "No encontrado" });
    return new Response("No encontrado", { status: 404 });
  }
  const usuario = await usuarioAdmin(org.slug);
  if (!usuario) {
    b.registrar({ resultado: "rechazado", estadoHttp: 401, mensaje: "No autorizado" });
    return new Response("No autorizado", { status: 401 });
  }
  b.quien(usuario.email, "panel");
  const filtros = leerFiltros(Object.fromEntries(new URL(request.url).searchParams));

  let filas: Fila[];
  try {
    filas = await todasLasFilas<Fila>((desde, hasta) =>
      aplicarFiltros(
        clienteAdmin()
          .database.from(TABLA)
          .select("id, nombre, tipo, datos, correos, descargas, ultima_descarga, creado_en, actualizado_en")
          .eq("organizacion", org.slug)
          .order("nombre")
          .order("tipo")
          .order("id")
          .range(desde, hasta),
        filtros,
      ),
    );
  } catch (e) {
    console.error(e);
    b.registrar({
      resultado: "error",
      estadoHttp: 500,
      mensaje: "No se pudo leer la base de datos.",
      detalle: { filtros, error: describirError(e) },
    });
    return new Response("No se pudo leer la base de datos.", { status: 500 });
  }

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Certificados", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = [
    { header: "Nombre", key: "nombre", width: 40 },
    { header: "Tipo", key: "tipo", width: 22 },
    { header: "Título", key: "titulo", width: 70 },
    { header: "Correos", key: "correos", width: 44 },
    { header: "Descargas", key: "descargas", width: 11 },
    { header: "Última descarga", key: "ultima", width: 18 },
    { header: "Publicado", key: "creado", width: 18 },
    { header: "Actualizado", key: "actualizado", width: 18 },
    { header: "ID", key: "id", width: 38 },
  ];
  for (const f of filas) {
    hoja.addRow({
      nombre: f.nombre,
      tipo: etiquetaTipo(f.tipo),
      titulo: typeof f.datos?.titulo === "string" ? f.datos.titulo : "",
      correos: f.correos?.length ? f.correos.join("; ") : "Sin correo",
      descargas: f.descargas,
      ultima: f.ultima_descarga ? fecha.format(new Date(f.ultima_descarga)) : "",
      creado: fecha.format(new Date(f.creado_en)),
      actualizado: fecha.format(new Date(f.actualizado_en)),
      id: f.id,
    });
  }
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B6B3A" } };
  hoja.autoFilter = { from: "A1", to: "I1" };

  const datos = await libro.xlsx.writeBuffer();
  b.registrar({
    resultado: "ok",
    estadoHttp: 200,
    mensaje: `Descargó el informe Excel con ${filas.length} certificados`,
    detalle: { filtros, cantidad: filas.length, bytes: datos.byteLength },
  });
  return respuestaArchivo(
    new Blob([datos as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Certificados ${org.nombre} ${hoy()}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
