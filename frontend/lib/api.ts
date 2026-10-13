export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function lerResposta<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; }
    catch { throw new Error("O servidor retornou uma resposta inesperada. Tente novamente."); }
  }

  let mensagem = response.status >= 500 ? "O servidor está indisponível no momento. Tente novamente em instantes." : "Não foi possível concluir. Confira os dados e tente novamente.";
  try {
    const corpo = await response.json();
    if (response.status < 500) mensagem = corpo.mensagem ?? mensagem;
  } catch {}

  if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    const login = new URL("/login", window.location.origin);
    const convite = window.location.pathname === "/convite" ? window.location.hash.slice(1) : "";
    if (/^[A-Za-z0-9_-]{43}$/.test(convite)) login.hash = `convite=${convite}`;
    window.location.replace(login.toString());
  }

  throw new Error(mensagem);
}

export async function apiFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${caminho}`, {
      ...init,
      headers,
      credentials: "include",
      cache: init.cache ?? "no-store",
    });
  } catch { throw new Error("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."); }
  return lerResposta<T>(response);
}
