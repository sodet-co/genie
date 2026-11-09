"use client";

import Link from "next/link";
import type { ResultadoPublicacion } from "@/lib/generar";
import { useOrganizacion } from "@/componentes/organizacion";
import { Mensaje } from "./mensaje";

const VISIBLES = 10;

export function ListaProblemas({
  titulo,
  problemas,
}: {
  titulo: string;
  problemas: { fila: number; motivo: string }[];
}) {
  if (problemas.length === 0) return null;
  return (
    <div className="alerta-error flex flex-col gap-1" role="alert">
      <p className="font-medium">{titulo}</p>
      <ul className="list-disc pl-5">
        {problemas.slice(0, VISIBLES).map((p) => (
          <li key={p.fila}>
            Fila {p.fila}: {p.motivo}
          </li>
        ))}
        {problemas.length > VISIBLES && <li>y {problemas.length - VISIBLES} más.</li>}
      </ul>
    </div>
  );
}

export function ResumenPublicacion({
  resultado,
  conEnlace = true,
}: {
  resultado: ResultadoPublicacion;
  conEnlace?: boolean;
}) {
  const org = useOrganizacion();
  return (
    <div className="flex flex-col gap-2">
      <Mensaje tipo={resultado.fallidos.length ? "aviso" : "ok"}>
        {resultado.nuevos} nuevo(s) y {resultado.reemplazados} reemplazado(s).
        {conEnlace && (
          <>
            {" "}
            <Link href={`/${org.slug}/admin`} className="enlace">
              Ver certificados
            </Link>
          </>
        )}
      </Mensaje>
      <ListaProblemas
        titulo={`${resultado.fallidos.length} no se publicaron:`}
        problemas={resultado.fallidos}
      />
    </div>
  );
}
