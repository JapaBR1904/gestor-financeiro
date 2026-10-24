import { API_URL } from "./origem-api";
export { API_URL } from "./origem-api";
import { ApiError } from "./api-error";
import { CABECALHO_ORGANIZACAO, contextoDaRequisicao, contextoMudou, requerContexto } from "./contexto-organizacao";
export { ApiError } from "./api-error";

export async function lerResposta<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; }
    catch { throw new Error("O servidor retornou uma resposta inesperada. Tente novamente."); }
  }

  let mensagem = response.status >= 500 ? "O servidor está indisponível no momento. Tente novamente em instantes." : "Não foi possível concluir. Confira os dados e tente novamente.";
  try {
    const corpo = await response.json();
    if (response.status < 500) mensagem = Object.values(corpo.campos ?? {})[0] as string || corpo.mensagem || mensagem;
    if (response.status === 409 && corpo.erro === "contexto_desatualizado" && typeof window !== "undefined") contextoMudou();
  } catch {}

  if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    const login = new URL("/login", window.location.origin);
    const convite = window.location.pathname === "/convite" ? window.location.hash.slice(1) : "";
    if (/^[A-Za-z0-9_-]{43}$/.test(convite)) login.hash = `convite=${convite}`;
    window.location.replace(login.toString());
  }

  throw new ApiError(mensagem, response.status);
}

/** Vincula envio e resposta à mesma geração do espaço. Também cobre arquivo/CSV/multipart. */
export async function apiResposta<T>(caminho: string, init: RequestInit, consumir: (response: Response, validar: () => void) => Promise<T>): Promise<T> {
  const contexto = requerContexto(caminho) ? contextoDaRequisicao() : null;
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (contexto) headers.set(CABECALHO_ORGANIZACAO, String(contexto.id));
  const sinais = [contexto?.signal, init.signal].filter((s): s is AbortSignal => Boolean(s));
  try {
    let response: Response;
    try {
      response = await fetch(`${API_URL}${caminho}`, { ...init, headers, credentials: "include", cache: init.cache ?? "no-store", signal: sinais.length ? AbortSignal.any(sinais) : undefined });
    } catch (e) {
      contexto?.validar();
      if (init.signal?.aborted) throw e;
      throw new Error("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.");
    }
    contexto?.validar();
    const dados = await consumir(response, () => contexto?.validar());
    contexto?.validar();
    return dados;
  } finally { contexto?.encerrar(); }
}
export async function apiFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  return apiResposta(caminho, init, lerResposta<T>);
}

/** O último teste de contexto precede o efeito de download, sem outro await entre eles. */
export async function baixarArquivo(caminho: string, nome: string) {
  return apiResposta(caminho, {}, async (response, validar) => {
    if (!response.ok) await lerResposta(response);
    const arquivo = await response.blob();
    validar();
    const url = URL.createObjectURL(arquivo);
    try {
      const link = document.createElement("a");
      link.href = url; link.download = nome; link.click();
    } finally { URL.revokeObjectURL(url); }
  });
}
