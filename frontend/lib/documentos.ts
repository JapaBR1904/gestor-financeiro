import { API_URL, apiResposta, apiFetch, lerResposta } from "./api";
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
  const arquivo = await apiResposta(`/api/documentos/${id}/arquivo`, {}, async resposta => {
    if (!resposta.ok) await lerResposta(resposta);
    return resposta.blob();
  });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
