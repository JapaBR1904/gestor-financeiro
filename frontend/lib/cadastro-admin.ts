import { API_URL } from "./api";
export type CadastroPendente = { usuarioId: number; nome: string; email: string; criadoEm: string };
export async function cadastroAdmin<T>(caminho = "", dados?: unknown): Promise<T> {
  let resposta: Response;
  try { resposta = await fetch(`${API_URL}/api/admin/cadastros${caminho}`, { method: dados === undefined ? "GET" : "POST", credentials: "include", cache: "no-store", headers: dados === undefined ? undefined : { "Content-Type": "application/json" }, body: dados === undefined ? undefined : JSON.stringify(dados) }); }
  catch { throw new Error("Não foi possível conectar. Confira sua conexão e tente novamente."); }
  if (!resposta.ok) {
    let mensagem = resposta.status >= 500 ? "O servidor está indisponível. Tente novamente." : "Não foi possível concluir. Entre novamente se a sessão expirou.";
    if (resposta.status < 500) { try { mensagem = (await resposta.json()).mensagem || mensagem; } catch { /* Mantém mensagem segura. */ } }
    throw new Error(mensagem);
  }
  return resposta.json() as Promise<T>;
}
