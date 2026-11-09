"use client";

import { ArrowLeft, Download, FileArchive, LoaderCircle, Search } from "lucide-react";
import { useState } from "react";
import { Mensaje } from "@/componentes/generador/mensaje";
import { useOrganizacion } from "@/componentes/organizacion";
import { descargar } from "@/lib/pdf";

type Modo = "correo" | "nombre";
type Resultado = { id: string; nombre: string; tipo: string; titulo: string };
type Estado = { tipo: "ok" | "error"; texto: string } | null;

function nombreDesdeCabecera(cabecera: string | null, porDefecto: string) {
  const utf8 = cabecera?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      // Cae al nombre ASCII.
    }
  }
  return cabecera?.match(/filename="([^"]+)"/i)?.[1] ?? porDefecto;
}

async function mensajeDeError(respuesta: Response, porDefecto: string) {
  const cuerpo = await respuesta.json().catch(() => null);
  return typeof cuerpo?.error === "string" ? cuerpo.error : porDefecto;
}

// Portal público: la persona escribe su correo registrado (o su nombre, si no
// registró correo). Con un certificado se descarga de una vez; con varios ve
// la lista, puede bajar cada uno o todos juntos en un ZIP.
export function FormularioDescarga() {
  const org = useOrganizacion();
  const [modo, setModo] = useState<Modo>("correo");
  const [valor, setValor] = useState("");
  // Búsqueda con la que se obtuvo la lista (las descargas la repiten).
  const [busqueda, setBusqueda] = useState<Record<string, string> | null>(null);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>(null);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setValor("");
    setEstado(null);
  }

  function reiniciar() {
    setResultados(null);
    setBusqueda(null);
    setEstado(null);
  }

  async function bajar(cuerpo: Record<string, unknown>, porDefecto: string) {
    const respuesta = await fetch(`/api/${org.slug}/descargar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (!respuesta.ok) {
      throw new Error(await mensajeDeError(respuesta, "No se pudo descargar."));
    }
    const datos = await respuesta.blob();
    descargar(
      datos,
      nombreDesdeCabecera(respuesta.headers.get("Content-Disposition"), porDefecto),
      datos.type,
    );
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!valor.trim()) return;
    const datos = { [modo]: valor.trim() };
    setOcupado("buscar");
    setEstado(null);
    try {
      const respuesta = await fetch(`/api/${org.slug}/buscar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!respuesta.ok) {
        setEstado({
          tipo: "error",
          texto: await mensajeDeError(respuesta, "No se pudo buscar el certificado."),
        });
        return;
      }
      const { certificados } = (await respuesta.json()) as { certificados: Resultado[] };
      if (certificados.length === 1) {
        await bajar({ ...datos, id: certificados[0].id }, "certificado.pdf");
        setEstado({ tipo: "ok", texto: "Listo. Tu certificado se está descargando." });
        return;
      }
      setBusqueda(datos);
      setResultados(certificados);
    } catch (err) {
      setEstado({
        tipo: "error",
        texto: err instanceof TypeError ? "No hay conexión. Inténtalo de nuevo." : String((err as Error).message),
      });
    } finally {
      setOcupado(null);
    }
  }

  async function bajarDeLista(cuerpo: Record<string, unknown>, clave: string, porDefecto: string) {
    setOcupado(clave);
    setEstado(null);
    try {
      await bajar({ ...busqueda, ...cuerpo }, porDefecto);
    } catch (err) {
      setEstado({
        tipo: "error",
        texto: err instanceof TypeError ? "No hay conexión. Inténtalo de nuevo." : String((err as Error).message),
      });
    } finally {
      setOcupado(null);
    }
  }

  if (resultados) {
    const variasPersonas = new Set(resultados.map((r) => r.nombre)).size > 1;
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p className="font-medium text-ink">
          Tienes {resultados.length} certificados.
        </p>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {resultados.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {r.tipo}
                  {variasPersonas && (
                    <span className="font-normal text-ink-muted"> · {r.nombre}</span>
                  )}
                </p>
                {r.titulo && (
                  <p className="line-clamp-2 text-small text-ink-muted" title={r.titulo}>
                    {r.titulo}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => bajarDeLista({ id: r.id }, r.id, "certificado.pdf")}
                disabled={ocupado !== null}
                aria-label={`Descargar certificado de ${r.tipo.toLowerCase()}${r.titulo ? `: ${r.titulo}` : ""}`}
                className="boton-secundario shrink-0"
              >
                {ocupado === r.id ? (
                  <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
                ) : (
                  <Download aria-hidden size={16} strokeWidth={1.75} />
                )}
                PDF
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => bajarDeLista({ todos: true }, "todos", "certificados.zip")}
          disabled={ocupado !== null}
          className="boton-primario"
        >
          {ocupado === "todos" ? (
            <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <FileArchive aria-hidden size={16} strokeWidth={1.75} />
          )}
          {ocupado === "todos" ? "Preparando…" : "Descargar todos (ZIP)"}
        </button>
        {estado && <Mensaje tipo={estado.tipo}>{estado.texto}</Mensaje>}
        <button
          type="button"
          onClick={reiniciar}
          className="enlace inline-flex items-center gap-1.5 self-start text-small"
        >
          <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
          Buscar otra vez
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={buscar} className="mt-6 flex flex-col gap-4">
      <label className="etiqueta">
        {modo === "correo" ? "Correo registrado" : "Nombre completo"}
        <input
          key={modo}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          maxLength={modo === "correo" ? 254 : 200}
          type={modo === "correo" ? "email" : "text"}
          inputMode={modo === "correo" ? "email" : "text"}
          autoComplete={modo === "correo" ? "email" : "name"}
          className="campo"
        />
      </label>
      <button type="submit" disabled={ocupado !== null} className="boton-primario">
        {ocupado === "buscar" ? (
          <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <Search aria-hidden size={16} strokeWidth={1.75} />
        )}
        {ocupado === "buscar" ? "Buscando…" : "Buscar mis certificados"}
      </button>
      {estado && <Mensaje tipo={estado.tipo}>{estado.texto}</Mensaje>}
      <button
        type="button"
        onClick={() => cambiarModo(modo === "correo" ? "nombre" : "correo")}
        className="enlace self-start text-small"
      >
        {modo === "correo"
          ? "¿No registraste correo? Busca con tu nombre completo"
          : "Buscar con mi correo registrado"}
      </button>
    </form>
  );
}
