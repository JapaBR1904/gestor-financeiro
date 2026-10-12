import { apiFetch } from "./api";

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

export type DadosDespesa = {
  descricao: string;
  valor: number;
  categoria: string;
  dataDespesa: string;
  formaPagamento: FormaPagamentoDespesa;
  observacao?: string;
};

export async function carregarDespesas(): Promise<Despesa[]> {
  return apiFetch<Despesa[]>("/api/despesas");
}

export async function carregarDespesa(id: string | number): Promise<Despesa> {
  return apiFetch<Despesa>(`/api/despesas/${id}`);
}

export async function carregarResumoDespesas(): Promise<ResumoDespesas> {
  return apiFetch<ResumoDespesas>("/api/despesas/resumo");
}

export async function salvarDespesa(dados: DadosDespesa): Promise<Despesa> {
  return apiFetch<Despesa>("/api/despesas", {
    method: "POST",
    body: JSON.stringify({ ...dados, observacao: dados.observacao ?? "" }),
  });
}

export async function atualizarDespesa(id: string | number, dados: DadosDespesa): Promise<Despesa> {
  return apiFetch<Despesa>(`/api/despesas/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...dados, observacao: dados.observacao ?? "" }),
  });
}

export async function excluirDespesa(id: string | number): Promise<void> {
  await apiFetch<void>(`/api/despesas/${id}`, { method: "DELETE" });
}

export function nomeFormaPagamentoDespesa(forma: FormaPagamentoDespesa) {
  return ({ pix: "Pix", dinheiro: "Dinheiro", debito: "Cartão de débito", credito: "Cartão de crédito", outro: "Outro" } as const)[forma] ?? forma;
}
