import { EVENTOS_BITACORA, RESULTADOS_BITACORA } from "@/lib/eventos-bitacora";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

// Filtros de la bitácora (página y exportación): evento, resultado, texto
// (correo/nombre escrito, mensaje o IP; un id de certificado busca ese
// certificado) y rango de días en hora de Colombia.
export function leerFiltrosBitacora(p: Record<string, string | string[] | undefined>) {
  const evento = typeof p.evento === "string" && Object.hasOwn(EVENTOS_BITACORA, p.evento) ? p.evento : "";
  const resultado =
    typeof p.resultado === "string" && Object.hasOwn(RESULTADOS_BITACORA, p.resultado) ? p.resultado : "";
  const q = String(p.q ?? "").trim().slice(0, 200);
  const desde = typeof p.desde === "string" && DIA.test(p.desde) ? p.desde : "";
  const hasta = typeof p.hasta === "string" && DIA.test(p.hasta) ? p.hasta : "";
  return { evento, resultado, q, desde, hasta };
}

type Consulta<Q> = {
  or(filtros: string): Q;
  eq(columna: string, valor: string): Q;
  gte(columna: string, valor: string): Q;
  lt(columna: string, valor: string): Q;
};

export function aplicarFiltrosBitacora<Q extends Consulta<Q>>(
  consulta: Q,
  f: ReturnType<typeof leerFiltrosBitacora>,
): Q {
  if (f.evento) consulta = consulta.eq("evento", f.evento);
  if (f.resultado) consulta = consulta.eq("resultado", f.resultado);
  if (UUID.test(f.q)) {
    consulta = consulta.eq("certificado_id", f.q);
  } else {
    // Comas, paréntesis, llaves, comillas y comodines romperían el `or`.
    const t = f.q.replace(/[,()*%\\{}"]/g, " ").trim();
    if (t) consulta = consulta.or(`actor.ilike.*${t}*,mensaje.ilike.*${t}*,ip.ilike.*${t}*`);
  }
  // Días completos en hora de Colombia (UTC-5).
  if (f.desde) consulta = consulta.gte("creado_en", `${f.desde}T05:00:00Z`);
  if (f.hasta) {
    const siguiente = new Date(`${f.hasta}T05:00:00Z`);
    siguiente.setUTCDate(siguiente.getUTCDate() + 1);
    consulta = consulta.lt("creado_en", siguiente.toISOString());
  }
  return consulta;
}

export const COLUMNAS_BITACORA =
  "id, creado_en, evento, resultado, estado_http, mensaje, actor, certificado_id, origen, ip, user_agent, duracion_ms, detalle";

export type FilaBitacora = {
  id: number;
  creado_en: string;
  evento: string;
  resultado: string;
  estado_http: number | null;
  mensaje: string | null;
  actor: string | null;
  certificado_id: string | null;
  origen: string | null;
  ip: string | null;
  user_agent: string | null;
  duracion_ms: number | null;
  detalle: Record<string, unknown>;
};
