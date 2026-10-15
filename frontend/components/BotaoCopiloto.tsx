"use client";
import { useContext } from "react";
import { usePathname } from "next/navigation";
import { ContextoCopiloto, contextoDaPagina } from "../lib/contexto-copiloto";
import { useWorkspace } from "../lib/workspace";
import { Marca } from "./Marca";
export function BotaoCopiloto() {
  const { config } = useWorkspace();
  const rota = usePathname();
  const { aberto, alternar } = useContext(ContextoCopiloto);
  if (config?.plano !== "business" || !contextoDaPagina(rota) || rota === "/ia") return null;
  return <button className="copilot-trigger" type="button" aria-label="Nexo Copiloto" aria-expanded={aberto} aria-controls="nexo-copilot-panel" onClick={e => alternar(e.currentTarget)}><Marca /><span>Nexo Copiloto</span></button>;
}
