export type ProdutoRanking = {
  nome: string;
  quantidadeVendida: number;
  faturamento: number;
};

export type FormaPagamentoResumo = {
  formaPagamento: string;
  total: number;
};

export type CategoriaDespesaResumo = {
  categoria: string;
  total: number;
};

export type ClienteRanking = {
  nome: string;
  quantidadeVendas: number;
  totalComprado: number;
};

export type RelatorioResumo = {
  quantidadeVendas: number;
  faturamento: number;
  custoVendas: number;
  lucroBruto: number;
  quantidadeDespesas: number;
  totalDespesas: number;
  saldoFinanceiro: number;
  produtosMaisVendidos: ProdutoRanking[];
  formasPagamento: FormaPagamentoResumo[];
  despesasPorCategoria: CategoriaDespesaResumo[];
  melhoresClientes: ClienteRanking[];
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

export async function carregarRelatorioResumo(): Promise<RelatorioResumo> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/relatorios/resumo?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as RelatorioResumo;
}
