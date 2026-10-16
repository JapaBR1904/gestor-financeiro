import { apiFetch } from "./api";

export type ProdutoRanking = { produtoId: number; nome: string; quantidadeVendida: number; faturamento: number };
export type FormaPagamentoResumo = { formaPagamento: string; total: number };
export type CategoriaDespesaResumo = { categoria: string; total: number };
export type ClienteRanking = { clienteId: number; nome: string; quantidadeVendas: number; totalComprado: number };

export type RelatorioResumo = {
  quantidadeVendas: number;
  faturamento: number;
  custoVendas: number | null;
  lucroBruto: number | null;
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
