export type UnidadeMeta = "moeda" | "percentual" | "quantidade";

export type Meta = {
  id: number;
  titulo: string;
  unidade: UnidadeMeta;
  valorMeta: number;
  valorAtual: number;
  prazo: string | null;
  status: "ativa" | "concluida";
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

export async function listarMetas(): Promise<Meta[]> {
  return lerResposta(await fetch(`${API_URL}/api/metas`, {
    credentials: "include",
    cache: "no-store",
  })) as Promise<Meta[]>;
}

export async function criarMeta(dados: {
  titulo: string;
  unidade: UnidadeMeta;
  valorMeta: number;
  valorAtual: number;
  prazo?: string;
}): Promise<Meta> {
  return lerResposta(await fetch(`${API_URL}/api/metas`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: dados.titulo.trim(),
      unidade: dados.unidade,
      valorMeta: dados.valorMeta,
      valorAtual: dados.valorAtual,
      prazo: dados.prazo || null,
    }),
  })) as Promise<Meta>;
}

export async function atualizarProgressoMeta(metaId: number, valorAtual: number): Promise<Meta> {
  return lerResposta(await fetch(`${API_URL}/api/metas/${metaId}/progresso`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valorAtual }),
  })) as Promise<Meta>;
}

export async function arquivarMeta(metaId: number) {
  await lerResposta(await fetch(`${API_URL}/api/metas/${metaId}`, {
    method: "DELETE",
    credentials: "include",
  }));
}
