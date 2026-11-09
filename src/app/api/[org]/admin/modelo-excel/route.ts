import ExcelJS from "exceljs";
import { usuarioAdmin } from "@/lib/servidor/insforge";
import { buscarOrganizacion } from "@/lib/organizaciones";
import { etiquetaTipo } from "@/lib/tipos";

const FILAS_CON_LISTA = 2000;

// Excel modelo para la carga masiva del evento: la columna Tipo es una lista
// desplegable con los tipos de certificado.
export async function GET(_: Request, ctx: RouteContext<"/api/[org]/admin/modelo-excel">) {
  const org = buscarOrganizacion((await ctx.params).org);
  if (!org) return new Response("No encontrado", { status: 404 });
  if (!(await usuarioAdmin(org.slug))) return new Response("No autorizado", { status: 401 });

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Personas", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = [
    { header: "Nombre", key: "nombre", width: 42 },
    { header: "Tipo", key: "tipo", width: 24 },
    { header: "Título", key: "titulo", width: 70 },
    { header: "Correo", key: "correo", width: 36 },
  ];
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B6B3A" } };

  // Solo los tipos para los que la organización tiene plantilla.
  const etiquetas = org.evento.plantillas.map((p) => etiquetaTipo(p.tipo));
  const lista = `"${etiquetas.join(",")}"`;
  hoja.getColumn("correo").numFmt = "@";
  for (let fila = 2; fila <= FILAS_CON_LISTA + 1; fila++) {
    hoja.getCell(`B${fila}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [lista],
      showErrorMessage: true,
      errorTitle: "Tipo no válido",
      error: "Elige un tipo de la lista.",
    };
  }

  const ayuda = libro.addWorksheet("Instrucciones");
  ayuda.getColumn(1).width = 100;
  [
    `${org.nombre} · ${org.evento.nombre}`,
    "",
    "Una fila por certificado. Si una persona tiene varios (dos ponencias, o coordinadora y ponente), va en varias filas con el mismo nombre.",
    "Nombre: tal como debe salir en el certificado.",
    `Tipo: elígelo de la lista (${etiquetas.join(", ")}).`,
    "Título: obligatorio para Ponente, Conferencista y Coordinador de mesa (título de la ponencia, conferencia o mesa). Vacío para Asistente.",
    "Correo: el correo registrado. La persona lo escribe en la página para descargar sus certificados. Si tiene varios, sepáralos con punto y coma (;): cualquiera de ellos sirve.",
    "Si una persona no tiene correo, deja la celda vacía: en ese caso descarga su certificado escribiendo su nombre completo.",
  ].forEach((texto, i) => {
    const celda = ayuda.getCell(`A${i + 1}`);
    celda.value = texto;
    if (i === 0) celda.font = { bold: true, size: 13 };
  });

  const datos = await libro.xlsx.writeBuffer();
  return new Response(datos as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="personas-certificados.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
