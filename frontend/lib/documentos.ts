import { API_URL, apiFetch, lerResposta } from "./api";
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
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}/api/documentos`, {
      method: "POST",
      credentials: "include",
      body: dados,
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor para enviar o arquivo.",
    );
  }
  return lerResposta<Documento>(resposta);
}
export const linkDocumento = (id: number) =>
  `${API_URL}/api/documentos/${id}/arquivo`;

export async function baixarDocumento(id: number, nome: string) {
  let resposta: Response;
  try {
    resposta = await fetch(linkDocumento(id), {
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor para baixar o arquivo.",
    );
  }
  if (!resposta.ok) await lerResposta(resposta);
  const url = URL.createObjectURL(await resposta.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
