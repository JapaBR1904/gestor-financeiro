export type PlanoNexo = "free" | "pro" | "business";
export type TipoMudanca = "upgrade" | "downgrade" | "cancelamento";
const NIVEIS: Record<PlanoNexo, number> = { free: 1, pro: 2, business: 3 };
const NOMES: Record<PlanoNexo, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};
export function nomePlano(plano: PlanoNexo) {
  return NOMES[plano] ?? "Free";
}
export function nivelPlano(plano: PlanoNexo) {
  return NIVEIS[plano] ?? 1;
}
export function planoPermite(atual: PlanoNexo, minimo: PlanoNexo) {
  return nivelPlano(atual) >= nivelPlano(minimo);
}
export function acaoPlano(atual: PlanoNexo, destino: PlanoNexo) {
  return atual === destino
    ? "Plano atual"
    : nivelPlano(destino) > nivelPlano(atual)
      ? "Fazer upgrade"
      : "Fazer downgrade";
}
export function planoValido(plano: string | null): plano is PlanoNexo {
  return plano === "free" || plano === "pro" || plano === "business";
}
export function nomeStatus(status: string) {
  const nomes: Record<string, string> = {
    ativa: "Ativa",
    prototipo: "Protótipo",
    trial: "Em teste",
    cancelada: "Cancelada",
    atrasada: "Atrasada",
    pendente: "Pendente",
    vencida: "Vencida",
    pagamento_falhou: "Pagamento falhou",
  };
  return nomes[status] ?? "Indisponível";
}
export function precoPlano(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
export function disponibilidadeAssinatura(assinatura: {
  podeGerenciar: boolean;
  simulacaoHabilitada: boolean;
  ambienteDesenvolvimento: boolean;
}) {
  if (!assinatura.podeGerenciar)
    return {
      habilitada: false,
      titulo: "Gerenciado pelo proprietário",
      mensagem:
        "Somente o proprietário pode alterar a assinatura. Peça a ele para escolher o novo plano.",
    };
  if (assinatura.simulacaoHabilitada)
    return {
      habilitada: true,
      titulo: "Pagamento simulado",
      mensagem:
        "Explore os planos com um checkout de demonstração. Nenhuma cobrança é realizada e nenhum dado bancário é solicitado.",
    };
  return assinatura.ambienteDesenvolvimento
    ? {
        habilitada: false,
        titulo: "Simulação desabilitada",
        mensagem:
          "No backend local, use SPRING_PROFILES_ACTIVE=dev. A simulação é habilitada por padrão nesse perfil; remova PAGAMENTO_SIMULADO_ENABLED=false ou defina true e reinicie o backend. Perfis prod/production sempre bloqueiam a simulação.",
      }
    : {
        habilitada: false,
        titulo: "Checkout indisponível",
        mensagem:
          "A troca de assinatura ainda não está disponível neste ambiente. Seu plano e seus dados continuam preservados.",
      };
}
