"use client";
import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { AssuntoIa } from "./ia";
export type TelaFinanceira = { rota: string; inicio?: string; fim?: string; carregando: boolean };
export const ContextoCopiloto = createContext<{ tela: TelaFinanceira | null; publicar: (tela: TelaFinanceira) => void; aberto: boolean; alternar: (gatilho: HTMLButtonElement) => void }>({ tela: null, publicar: () => {}, aberto: false, alternar: () => {} });
export function usePublicarPeriodo(periodo: { inicio: string; fim: string } | null, carregando: boolean) {
  const { publicar } = useContext(ContextoCopiloto);
  const rota = usePathname();
  const inicio = periodo?.inicio, fim = periodo?.fim;
  useEffect(() => { publicar({ rota, inicio, fim, carregando }); }, [publicar, rota, inicio, fim, carregando]);
}
export function contextoDaPagina(rota: string): { pagina: string; titulo: string; assunto: AssuntoIa } | null {
  const base = "/" + rota.split("/")[1];
  const paginas: Record<string, { titulo: string; assunto: AssuntoIa }> = {
    "/dashboard": { titulo: "Visão geral", assunto: "resumo" },
    "/pessoal": { titulo: "Movimentações", assunto: "resumo" },
    "/fluxo-caixa": { titulo: "Fluxo de caixa", assunto: "fluxo" },
    "/metas": { titulo: "Metas", assunto: "metas" },
    "/despesas": { titulo: "Despesas", assunto: "despesas" },
    "/vendas": { titulo: "Vendas", assunto: "resumo" },
    "/relatorios": { titulo: "Relatórios", assunto: "relatorios" },
    "/documentos": { titulo: "Documentos", assunto: "documentos" },
    "/ia": { titulo: "Nexo IA", assunto: "resumo" },
  };
  return paginas[base] ? { pagina: base, ...paginas[base] } : null;
}
