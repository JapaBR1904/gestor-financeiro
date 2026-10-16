import { baixarArquivo, apiFetch } from "./api";
export type Movimentacao = {
  id: number;
  origem: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  conta: string;
};
export type ResumoFinanceiro = {
  inicio: string;
  fim: string;
  receitas: number;
  despesas: number;
  saldo: number;
  movimentacoes: Movimentacao[];
};
export type AnaliseFinanceira = {
  atual: ResumoFinanceiro;
  anterior: ResumoFinanceiro;
  evolucao: Array<{
    data: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }>;
  categorias: Record<string, number>;
};
export type Lancamento = Omit<Movimentacao, "id" | "origem">;
const periodo = (inicio: string, fim: string) =>
  new URLSearchParams({ inicio, fim }).toString();
export const resumoFinanceiro = (inicio: string, fim: string) =>
  apiFetch<ResumoFinanceiro>(`/api/financeiro/resumo?${periodo(inicio, fim)}`);
export const analiseFinanceira = (inicio: string, fim: string) =>
  apiFetch<AnaliseFinanceira>(
    `/api/financeiro/analise?${periodo(inicio, fim)}`,
  );
export const salvarLancamento = (
  dados: Lancamento,
  id?: number,
  chaveIdempotencia?: string,
) =>
  apiFetch<Movimentacao>(`/api/financeiro/movimentacoes${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    headers: chaveIdempotencia
      ? { "Idempotency-Key": chaveIdempotencia }
      : undefined,
    body: JSON.stringify(dados),
  });
export const removerLancamento = (id: number) =>
  apiFetch<void>(`/api/financeiro/movimentacoes/${id}`, { method: "DELETE" });
export async function exportarFinanceiro(inicio: string, fim: string) {
  return baixarArquivo(`/api/financeiro/exportar?${periodo(inicio, fim)}`, `nexo-movimentacoes-${inicio}-${fim}.csv`);
}
export function datasDoMes() {
  const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find(item => item.type === tipo)!.value;
  const fim = `${parte("year")}-${parte("month")}-${parte("day")}`;
  return { inicio: `${fim.slice(0, 7)}-01`, fim };
}
