import { apiFetch } from "./api";
export type UnidadeMeta = "moeda" | "percentual" | "quantidade";

export type Meta = {
  id: number;
  titulo: string;
  unidade: UnidadeMeta;
  valorMeta: number;
  valorAtual: number;
  prazo: string | null;
  status: "ativa" | "concluida";
};

export const listarMetas = () => apiFetch<Meta[]>("/api/metas");
export function criarMeta(dados: { titulo: string; unidade: UnidadeMeta; valorMeta: number; valorAtual: number; prazo?: string }) {
  return apiFetch<Meta>("/api/metas", { method: "POST", body: JSON.stringify({ ...dados, titulo: dados.titulo.trim(), prazo: dados.prazo || null }) });
}
export const atualizarProgressoMeta = (metaId: number, valorAtual: number) => apiFetch<Meta>(`/api/metas/${metaId}/progresso`, { method: "PATCH", body: JSON.stringify({ valorAtual }) });
export const arquivarMeta = (metaId: number) => apiFetch<void>(`/api/metas/${metaId}`, { method: "DELETE" });
