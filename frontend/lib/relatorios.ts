import { apiFetch } from "./api";

export type ProdutoRanking = { nome: string; quantidadeVendida: number; faturamento: number };
export type FormaPagamentoResumo = { formaPagamento: string; total: number };
export type CategoriaDespesaResumo = { categoria: string; total: number };
export type ClienteRanking = { nome: string; quantidadeVendas: number; totalComprado: number };

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

export async function carregarRelatorioResumo(): Promise<RelatorioResumo> {
  return apiFetch<RelatorioResumo>("/api/relatorios/resumo");
}
