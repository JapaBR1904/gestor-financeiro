"use client";
import { usePreferencias } from "./PreferenciasProvider";

/** Proteção somente visual; o conteúdo continua no estado e não é revogado no provedor. */
export function TextoProtegidoIa({ tipo, revelar, children }: { tipo: "pergunta" | "resposta"; revelar?: string; children: React.ReactNode }) {
  const { ocultarValores, alterar } = usePreferencias();
  if (!ocultarValores) return <>{children}</>;
  return <p>{tipo === "pergunta" ? "Pergunta protegida pelo modo de privacidade." : "Resposta protegida."}{revelar ? <> <button type="button" className="text-button" onClick={() => alterar({ ocultarValores: false })}>{revelar}</button></> : null}</p>;
}
