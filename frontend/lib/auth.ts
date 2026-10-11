export type FinalidadeAuth = "cadastro" | "login";

export type UsuarioAutenticado = {
  id: number;
  nome: string;
  email: string;
  organizacaoId: number;
  organizacaoNome: string;
  papel: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function lerResposta(response: Response) {
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }

  let mensagem = `Erro ${response.status} ao acessar o backend.`;
  try {
    const corpo = await response.json();
    mensagem = corpo.message ?? corpo.mensagem ?? corpo.detail ?? mensagem;
  } catch {}
  throw new Error(mensagem);
}

export async function solicitarCodigo(email: string, finalidade: FinalidadeAuth) {
  return lerResposta(await fetch(`${API_URL}/api/auth/codigo`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), finalidade }),
  }));
}

export async function verificarCodigo(dados: {
  email: string;
  codigo: string;
  finalidade: FinalidadeAuth;
  nome?: string;
  organizacaoNome?: string;
}): Promise<UsuarioAutenticado> {
  return lerResposta(await fetch(`${API_URL}/api/auth/verificar`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: dados.email.trim(),
      codigo: dados.codigo.trim(),
      finalidade: dados.finalidade,
      nome: dados.nome?.trim() || null,
      organizacaoNome: dados.organizacaoNome?.trim() || null,
    }),
  })) as Promise<UsuarioAutenticado>;
}

export async function carregarUsuarioAtual(): Promise<UsuarioAutenticado> {
  return lerResposta(await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
    cache: "no-store",
  })) as Promise<UsuarioAutenticado>;
}

export async function logout() {
  return lerResposta(await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }));
}
