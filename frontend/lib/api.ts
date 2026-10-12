export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function lerResposta<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  let mensagem = `Erro ${response.status} ao acessar o backend.`;
  try {
    const corpo = await response.json();
    mensagem = corpo.message ?? corpo.mensagem ?? corpo.detail ?? mensagem;
  } catch {}
  throw new Error(mensagem);
}

export async function apiFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${caminho}`, {
    ...init,
    headers,
    credentials: "include",
    cache: init.cache ?? "no-store",
  });

  return lerResposta<T>(response);
}
