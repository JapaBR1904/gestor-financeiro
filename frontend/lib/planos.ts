export type PlanoNexo = "free" | "pro" | "business";
export type TipoMudanca = "upgrade" | "downgrade" | "cancelamento";
const NIVEIS: Record<PlanoNexo, number> = { free: 1, pro: 2, business: 3 };
const NOMES: Record<PlanoNexo, string> = { free: "Free", pro: "Pro", business: "Business" };
export function nomePlano(plano: PlanoNexo) { return NOMES[plano] ?? "Free"; }
export function nivelPlano(plano: PlanoNexo) { return NIVEIS[plano] ?? 1; }
export function planoPermite(atual: PlanoNexo, minimo: PlanoNexo) { return nivelPlano(atual) >= nivelPlano(minimo); }
export function acaoPlano(atual: PlanoNexo, destino: PlanoNexo) {
  return atual === destino ? "Plano atual" : nivelPlano(destino) > nivelPlano(atual) ? "Fazer upgrade" : "Fazer downgrade";
}
export function planoValido(plano: string | null): plano is PlanoNexo { return plano === "free" || plano === "pro" || plano === "business"; }
export function nomeStatus(status: string) {
  const nomes: Record<string, string> = { ativa: "Ativa", prototipo: "Protótipo", trial: "Em teste", cancelada: "Cancelada", atrasada: "Atrasada", pendente: "Pendente", vencida: "Vencida", pagamento_falhou: "Pagamento falhou" };
  return nomes[status] ?? "Indisponível";
}
export function precoPlano(valor: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor); }
