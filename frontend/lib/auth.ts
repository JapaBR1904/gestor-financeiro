export type FinalidadeAuth = "verificacao_email" | "recuperacao_senha";

export type UsuarioAutenticado = {
  id: number;
  nome: string;
  email: string;
  organizacaoId: number;
  organizacaoNome: string;
  papel: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

class ErroAutenticacao extends Error {
  constructor(mensagem: string, readonly status: number) { super(mensagem); }
}

async function requisicao<T>(caminho: string, dados?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth${caminho}`, {
      method: dados === undefined ? "GET" : "POST",
      credentials: "include",
      cache: "no-store",
      headers: dados === undefined ? undefined : { "Content-Type": "application/json" },
      body: dados === undefined ? undefined : JSON.stringify(dados),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.");
  }
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; }
    catch { throw new Error("Não foi possível ler a resposta do servidor. Tente novamente em instantes."); }
  }
  let mensagem = response.status >= 500
    ? "O servidor está indisponível no momento. Tente novamente em instantes."
    : "Não foi possível concluir. Confira os dados e tente novamente.";
  try {
    const corpo = await response.json();
    if (response.status < 500) mensagem = Object.values(corpo.campos ?? {})[0] as string || corpo.mensagem || mensagem;
  } catch {}
  throw new ErroAutenticacao(mensagem, response.status);
}

export function cadastrar(dados: { nome: string; email: string; senha: string; confirmacaoSenha: string }) {
  return requisicao<{ verificacaoEmailNecessaria: boolean; aprovacaoManualNecessaria?: boolean; usuario?: UsuarioAutenticado }>("/cadastro", { ...dados, email: dados.email.trim(), nome: dados.nome.trim() });
}

export function login(email: string, senha: string): Promise<UsuarioAutenticado> {
  return requisicao("/login", { email: email.trim(), senha });
}

export function solicitarCodigo(email: string, finalidade: FinalidadeAuth) {
  return finalidade === "recuperacao_senha"
    ? requisicao("/recuperacao", { email: email.trim() })
    : requisicao("/codigo", { email: email.trim(), finalidade });
}

export function verificarCodigo(dados: { email: string; codigo: string; finalidade: FinalidadeAuth }): Promise<UsuarioAutenticado> {
  return requisicao("/verificar", dados);
}

export function verificarRecuperacao(email: string, codigo: string) {
  return requisicao("/recuperacao/verificar", { email, codigo });
}

export function redefinirSenha(senha: string, confirmacaoSenha: string) {
  return requisicao("/recuperacao/redefinir", { senha, confirmacaoSenha });
}

export function carregarUsuarioAtual(): Promise<UsuarioAutenticado> {
  return requisicao("/me");
}

export async function logout() {
  try { await requisicao("/logout", {}); }
  catch (erro) {
    // 401 comprova que a sessão já expirou; falha de rede não comprova logout.
    if (!(erro instanceof ErroAutenticacao && erro.status === 401)) throw erro;
  }
}

export function disponibilidadeAutenticacao() {
  return requisicao<{ recuperacaoPorEmailDisponivel: boolean; cadastroManualDisponivel?: boolean }>("/disponibilidade");
}

export type EstadoAssistido = { protocolo: number | null; estado: "ausente" | "aguardando" | "liberada" | "expirada" };
export function disponibilidadeAssistida() {
  return requisicao<{ disponivel: boolean }>("/recuperacao/assistida/disponibilidade");
}
export function solicitarAssistida(email: string) {
  return requisicao<{ protocolo: number }>("/recuperacao/assistida", { email: email.trim() });
}
export function consultarAssistida() {
  return requisicao<EstadoAssistido>("/recuperacao/assistida");
}