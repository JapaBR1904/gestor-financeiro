const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type RespostaIa = {
  resposta: string;
  modelo: string;
};

async function lerResposta(response: Response) {
  if (response.ok) return response.json();

  let mensagem = `Erro ${response.status} ao acessar o backend.`;
  try {
    const corpo = await response.json();
    mensagem = corpo.message ?? corpo.mensagem ?? corpo.detail ?? mensagem;
  } catch {}

  throw new Error(mensagem);
}

export async function perguntarAoNexoIa(pergunta: string): Promise<RespostaIa> {
  return lerResposta(await fetch(`${API_URL}/api/ia/perguntar`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta }),
  })) as Promise<RespostaIa>;
}
