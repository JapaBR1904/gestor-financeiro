import { apiFetch } from "./api";
export type RespostaIa = { resposta: string; modelo: string };
export const statusIa = () => apiFetch<{ configurada: boolean }>("/api/ia/status");
export const perguntarAoNexoIa = (pergunta: string, incluirResumo = false) => apiFetch<RespostaIa>("/api/ia/perguntar", { method: "POST", body: JSON.stringify({ pergunta, incluirResumo }) });
export const analisarDocumento = (documentoId: number, pergunta: string, autorizado: boolean) => apiFetch<RespostaIa>("/api/ia/documento", { method: "POST", body: JSON.stringify({ documentoId, pergunta, autorizado }) });
