import { apiFetch } from "./api";
import type { PlanoNexo, TipoMudanca } from "./planos";
export type PlanoDetalhe = {
  id: PlanoNexo; nome: string; valorMensal: number; moeda: string; periodicidade: string;
  descricao: string; beneficios: string[]; limiteUsuarios: number; recursos: string[];
};
export type HistoricoAssinatura = { planoAnterior: PlanoNexo; planoNovo: PlanoNexo; tipo: TipoMudanca; origem: string; criadoEm: string };
export type Assinatura = {
  plano: PlanoDetalhe; status: string; ultimaAlteracao: string | null; usuariosAtivos: number;
  podeGerenciar: boolean; simulacaoHabilitada: boolean; historico: HistoricoAssinatura[];
};
export type MetodoPagamento = "cartao" | "pix" | "boleto";
export type CenarioPagamento = "aprovado" | "recusado" | "erro";
export type Checkout = {
  id: string; planoAnterior: PlanoNexo; plano: PlanoDetalhe; tipo: TipoMudanca; total: number;
  status: "pendente" | "aprovado" | "recusado" | "cancelado" | "expirado" | "desatualizado";
  metodo: MetodoPagamento | null; expiraEm: string;
};
export const carregarAssinatura = () => apiFetch<Assinatura>("/api/assinatura");
export const listarPlanos = () => apiFetch<PlanoDetalhe[]>("/api/assinatura/planos");
export const abrirCheckout = (plano: PlanoNexo, chaveIdempotencia: string) => apiFetch<Checkout>("/api/assinatura/checkout", { method: "POST", body: JSON.stringify({ plano, chaveIdempotencia }) });
export const solicitarCancelamento = (chaveIdempotencia: string) => apiFetch<Checkout>("/api/assinatura/cancelamento", { method: "POST", body: JSON.stringify({ chaveIdempotencia }) });
export const carregarCheckout = (id: string) => apiFetch<Checkout>(`/api/assinatura/checkout/${encodeURIComponent(id)}`);
export const confirmarCheckout = (id: string, metodo: MetodoPagamento, cenario: CenarioPagamento) => apiFetch<Checkout>(`/api/assinatura/checkout/${encodeURIComponent(id)}/confirmar`, { method: "POST", body: JSON.stringify({ metodo, cenario }) });
export const cancelarCheckout = (id: string) => apiFetch<Checkout>(`/api/assinatura/checkout/${encodeURIComponent(id)}/cancelar`, { method: "POST" });
export const listarEquipe = () => apiFetch<Array<{ id: number; nome: string; papel: string; ativo: boolean }>>("/api/saas/equipe");
