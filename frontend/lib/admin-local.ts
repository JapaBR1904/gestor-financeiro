export type PedidoAssistido = { protocolo: number; email: string; criadoEm: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
async function requisicao<T>(caminho: string, dados?: unknown): Promise<T> {
  let resposta: Response;
  try { resposta = await fetch(`${API_URL}/api/admin/local${caminho}`, {
    method: dados === undefined ? "GET" : "POST", credentials: "include", cache: "no-store",
    headers: dados === undefined ? undefined : { "Content-Type": "application/json" },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  }); } catch { throw new Error("Não foi possível conectar à administração local."); }
  if (!resposta.ok) {
    let mensagem = "Não foi possível concluir. Entre novamente ou confira o ambiente local.";
    try { const dados = await resposta.json(); if (resposta.status < 500 && typeof dados.mensagem === "string") mensagem = dados.mensagem; } catch { /* Erro sem JSON mantém a mensagem neutra. */ }
    throw new Error(mensagem);
  }
  return resposta.json() as Promise<T>;
}
export const adminDisponivel = () => requisicao<{ disponivel: boolean }>("/disponibilidade");
export const entrarAdmin = (usuario: string, senha: string) => requisicao("/login", { usuario, senha });
export const sairAdmin = () => requisicao("/logout", {});
export const listarRecuperacoes = () => requisicao<PedidoAssistido[]>("/recuperacoes");
export const decidirRecuperacao = (protocolo: number, aprovar: boolean, identidadeConfirmada: boolean) => requisicao(`/recuperacoes/${protocolo}`, { aprovar, identidadeConfirmada });
