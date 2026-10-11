export type FormaPagamento = "pix" | "dinheiro" | "debito" | "credito" | "outro";

export type VendaItem = {
  id: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  custoUnitario: number;
  subtotal: number;
  custoSubtotal: number;
  lucroSubtotal: number;
};

export type Venda = {
  id: number;
  formaPagamento: FormaPagamento;
  observacao?: string | null;
  totalVenda: number;
  custoTotal: number;
  lucroTotal: number;
  criadoEm: string;
  itens: VendaItem[];
};

export type ResumoVendas = {
  quantidadeVendas: number;
  faturamento: number;
  custo: number;
  lucro: number;
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

export async function carregarVendas(): Promise<Venda[]> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/vendas?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as Venda[];
}

export async function carregarVenda(vendaId: string | number): Promise<Venda> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/vendas/${vendaId}?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as Venda;
}

export async function carregarResumoVendas(): Promise<ResumoVendas> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/vendas/resumo?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as ResumoVendas;
}

export async function salvarVenda(dados: { formaPagamento: FormaPagamento; observacao?: string; itens: Array<{ produtoId: number | string; quantidade: number }> }): Promise<Venda> {
  const organizacaoId = await obterOrganizacaoId();
  const response = await fetch(`${API_URL}/api/vendas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizacaoId,
      formaPagamento: dados.formaPagamento,
      observacao: dados.observacao ?? "",
      itens: dados.itens.map((item) => ({ produtoId: Number(item.produtoId), quantidade: item.quantidade })),
    }),
  });
  return (await lerResposta(response)) as Venda;
}

export function nomeFormaPagamento(forma: FormaPagamento) {
  return ({ pix: "Pix", dinheiro: "Dinheiro", debito: "Cartão de débito", credito: "Cartão de crédito", outro: "Outro" } as const)[forma] ?? forma;
}
