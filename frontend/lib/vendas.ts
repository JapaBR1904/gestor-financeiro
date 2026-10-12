import { apiFetch } from "./api";

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
  clienteId?: number | null;
  clienteNome?: string | null;
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

export async function carregarVendas(): Promise<Venda[]> {
  return apiFetch<Venda[]>("/api/vendas");
}

export async function carregarVenda(vendaId: string | number): Promise<Venda> {
  return apiFetch<Venda>(`/api/vendas/${vendaId}`);
}

export async function carregarResumoVendas(): Promise<ResumoVendas> {
  return apiFetch<ResumoVendas>("/api/vendas/resumo");
}

export async function salvarVenda(dados: { clienteId?: number | string | null; formaPagamento: FormaPagamento; observacao?: string; itens: Array<{ produtoId: number | string; quantidade: number }> }): Promise<Venda> {
  return apiFetch<Venda>("/api/vendas", {
    method: "POST",
    body: JSON.stringify({
      clienteId: dados.clienteId ? Number(dados.clienteId) : null,
      formaPagamento: dados.formaPagamento,
      observacao: dados.observacao ?? "",
      itens: dados.itens.map((item) => ({ produtoId: Number(item.produtoId), quantidade: item.quantidade })),
    }),
  });
}

export function nomeFormaPagamento(forma: FormaPagamento) {
  return ({ pix: "Pix", dinheiro: "Dinheiro", debito: "Cartão de débito", credito: "Cartão de crédito", outro: "Outro" } as const)[forma] ?? forma;
}
