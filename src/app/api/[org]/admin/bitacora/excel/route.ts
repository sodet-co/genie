import ExcelJS from "exceljs";
import { etiquetaEvento, etiquetaResultado } from "@/lib/eventos-bitacora";
import { buscarOrganizacion } from "@/lib/organizaciones";
import {
  aplicarFiltrosBitacora,
  COLUMNAS_BITACORA,
  leerFiltrosBitacora,
  type FilaBitacora,
} from "@/lib/servidor/filtros-bitacora";
import { clienteAdmin, usuarioAdmin } from "@/lib/servidor/insforge";
import { todasLasFilas } from "@/lib/servidor/paginar";
import { respuestaArchivo } from "@/lib/servidor/respuesta-pdf";

const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Bogota",
});

// La bitácora en Excel, con los mismos filtros de la página (todas las filas).
export async function GET(request: Request, ctx: RouteContext<"/api/[org]/admin/bitacora/excel">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return new Response("No encontrado", { status: 404 });
  if (!(await usuarioAdmin(org.slug))) return new Response("No autorizado", { status: 401 });
  const filtros = leerFiltrosBitacora(Object.fromEntries(new URL(request.url).searchParams));

  let filas: FilaBitacora[];
  try {
    filas = await todasLasFilas<FilaBitacora>((desde, hasta) =>
      aplicarFiltrosBitacora(
        clienteAdmin()
          .database.from("bitacora")
          .select(COLUMNAS_BITACORA)
          .eq("organizacion", org.slug)
          .order("creado_en", { ascending: false })
          .order("id", { ascending: false })
          .range(desde, hasta),
        filtros,
      ),
    );
  } catch (e) {
    console.error(e);
    return new Response("No se pudo leer la bitácora.", { status: 500 });
  }

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Bitácora", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = [
    { header: "Fecha (Colombia)", key: "fecha", width: 20 },
    { header: "Evento", key: "evento", width: 26 },
    { header: "Resultado", key: "resultado", width: 16 },
    { header: "HTTP", key: "http", width: 7 },
    { header: "Quién", key: "actor", width: 34 },
    { header: "Mensaje", key: "mensaje", width: 60 },
    { header: "Certificado", key: "certificado", width: 38 },
    { header: "Origen", key: "origen", width: 12 },
    { header: "IP", key: "ip", width: 16 },
    { header: "Duración (ms)", key: "duracion", width: 12 },
    { header: "Navegador", key: "ua", width: 40 },
    { header: "Detalle (JSON)", key: "detalle", width: 80 },
    { header: "Registro", key: "id", width: 10 },
  ];
  for (const f of filas) {
    hoja.addRow({
      fecha: fecha.format(new Date(f.creado_en)),
      evento: etiquetaEvento(f.evento),
      resultado: etiquetaResultado(f.resultado),
      http: f.estado_http ?? "",
      actor: f.actor ?? "",
      mensaje: f.mensaje ?? "",
      certificado: f.certificado_id ?? "",
      origen: f.origen ?? "",
      ip: f.ip ?? "",
      duracion: f.duracion_ms ?? "",
      ua: f.user_agent ?? "",
      detalle: JSON.stringify(f.detalle),
      id: f.id,
    });
  }
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B6B3A" } };
  hoja.autoFilter = { from: "A1", to: "M1" };

  const datos = await libro.xlsx.writeBuffer();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return respuestaArchivo(
    new Blob([datos as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Bitácora ${org.nombre} ${hoy}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
