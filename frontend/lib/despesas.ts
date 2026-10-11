export type FormaPagamentoDespesa = "pix" | "dinheiro" | "debito" | "credito" | "outro";

export type Despesa = {
  id: number;
  descricao: string;
  valor: number;
  categoria: string;
  dataDespesa: string;
  formaPagamento: FormaPagamentoDespesa;
  observacao?: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ResumoDespesas = {
  quantidadeDespesas: number;
  totalDespesas: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function lerResposta(response: Response) {
  if (response.ok) return response.json();
  let mensagem = `Erro ${response.status} ao acessar o backend.`;
  try {
    const corpo = await response.json();
    mensagem = corpo.message ?? corpo.mensagem ?? corpo.detail ?? mensagem;
  } catch {}
  throw new Error(mensagem);
}

async function obterOrganizacaoId(): Promise<number> {
  const response = await fetch(`${API_URL}/api/organizacoes`, { cache: "no-store" });
  const organizacoes = (await lerResposta(response)) as Array<{ id: number }>;
  if (organizacoes.length > 0) return organizacoes[0].id;
  const criacao = await fetch(`${API_URL}/api/organizacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Minha empresa" }),
  });
  const organizacao = (await lerResposta(criacao)) as { id: number };
  return organizacao.id;
}

export async function carregarDespesas(): Promise<Despesa[]> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/despesas?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as Despesa[];
}

export async function carregarDespesa(id: string | number): Promise<Despesa> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/despesas/${id}?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as Despesa;
}

export async function carregarResumoDespesas(): Promise<ResumoDespesas> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/despesas/resumo?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as ResumoDespesas;
}

export async function salvarDespesa(dados: { descricao: string; valor: number; categoria: string; dataDespesa: string; formaPagamento: FormaPagamentoDespesa; observacao?: string }): Promise<Despesa> {
  const organizacaoId = await obterOrganizacaoId();
  const response = await fetch(`${API_URL}/api/despesas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizacaoId, ...dados, observacao: dados.observacao ?? "" }),
  });
  return (await lerResposta(response)) as Despesa;
}

export function nomeFormaPagamentoDespesa(forma: FormaPagamentoDespesa) {
  return ({ pix: "Pix", dinheiro: "Dinheiro", debito: "Cartão de débito", credito: "Cartão de crédito", outro: "Outro" } as const)[forma] ?? forma;
}
