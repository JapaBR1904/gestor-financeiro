import { apiFetch, ApiError } from "./api";
async function consultarIa<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  try { return await apiFetch<T>(caminho, opcoes); }
  catch (erro) {
    if (erro instanceof ApiError && erro.status < 500) throw erro;
    throw new Error("Assistente temporariamente indisponível. Tente novamente em instantes.");
  }
}
export type AssuntoIa = "resumo" | "despesas" | "fluxo" | "metas" | "comparativo" | "relatorios" | "documentos";
export type ContextoIa = { pagina: string; assunto: AssuntoIa; inicio?: string; fim?: string };
export type BaseIa = { pagina: string; tela: string; assunto: string; periodo: string; perfil: string; dadosAutorizados: boolean };
export type RespostaIa = { resposta: string; modelo: string; contexto?: BaseIa };
export const statusIa = (signal?: AbortSignal) => consultarIa<{ configurada: boolean }>("/api/ia/status", { signal });
export const perguntarAoNexoIa = (pergunta: string, incluirResumo = false, contexto?: ContextoIa, signal?: AbortSignal) => consultarIa<RespostaIa>("/api/ia/perguntar", { method: "POST", body: JSON.stringify({ pergunta, incluirResumo, contexto }), signal });
export const analisarDocumento = (documentoId: number, pergunta: string, autorizado: boolean) => consultarIa<RespostaIa>("/api/ia/documento", { method: "POST", body: JSON.stringify({ documentoId, pergunta, autorizado }) });
