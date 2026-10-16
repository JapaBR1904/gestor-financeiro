import { API_URL, apiResposta, apiFetch, lerResposta, baixarArquivo } from "./api";
export type Documento = {
  id: number;
  nome: string;
  descricao: string;
  tipo: string;
  tamanho: number;
  criadoEm: string;
};
export const listarDocumentos = () => apiFetch<Documento[]>("/api/documentos");
export const removerDocumento = (id: number) =>
  apiFetch<void>(`/api/documentos/${id}`, { method: "DELETE" });
export async function enviarDocumento(
  arquivo: File,
  descricao: string,
): Promise<Documento> {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  dados.append("descricao", descricao);
  return apiResposta("/api/documentos", { method: "POST", body: dados }, lerResposta<Documento>);
}
export const linkDocumento = (id: number) =>
  `${API_URL}/api/documentos/${id}/arquivo`;

export async function baixarDocumento(id: number, nome: string) {
  return baixarArquivo(`/api/documentos/${id}/arquivo`, nome);
}
