export type PerfilUso = "pessoal" | "negocio" | "empresa";
export type PlanoNexo = "free" | "pro" | "business";

export type PlanoDetalhe = {
  id: PlanoNexo;
  nome: string;
  preco: string;
  periodo: string;
  destaque?: string;
  descricao: string;
  recursos: string[];
};

export const PLANOS_NEXO: PlanoDetalhe[] = [
  {
    id: "free",
    nome: "Free",
    preco: "R$ 0",
    periodo: "/mês",
    descricao: "Para começar a organizar a vida financeira e conhecer o Nexo.",
    recursos: [
      "Dashboard financeiro",
      "Cadastro de produtos e clientes",
      "Vendas e despesas",
      "Relatórios essenciais",
      "1 usuário",
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "R$ 39",
    periodo: "/mês",
    destaque: "Mais escolhido",
    descricao: "Para quem usa o Nexo todos os dias e quer mais controle do negócio.",
    recursos: [
      "Tudo do plano Free",
      "Fluxo de caixa avançado",
      "Metas e comparativos",
      "Exportação de dados",
      "Até 3 usuários",
      "Suporte prioritário",
    ],
  },
  {
    id: "business",
    nome: "Business",
    preco: "R$ 99",
    periodo: "/mês",
    destaque: "Para equipes",
    descricao: "Para empresas com equipe, operação maior e necessidade de gestão compartilhada.",
    recursos: [
      "Tudo do plano Pro",
      "Até 10 usuários",
      "Perfis e permissões",
      "Visão por unidade/equipe",
      "Relatórios gerenciais",
      "Atendimento prioritário",
    ],
  },
];

export const OBJETIVOS_POR_PERFIL: Record<PerfilUso, string[]> = {
  pessoal: ["Controlar gastos", "Acompanhar saldo", "Criar metas", "Entender para onde meu dinheiro vai"],
  negocio: ["Aumentar vendas", "Controlar custos", "Acompanhar lucro", "Organizar clientes", "Melhorar o fluxo de caixa"],
  empresa: ["Acompanhar indicadores", "Gerenciar equipe", "Controlar áreas", "Planejar crescimento", "Padronizar a operação"],
};

const PERFIL_KEY = "nexo.perfilUso";
const PLANO_KEY = "nexo.plano";
const ONBOARDING_KEY = "nexo.onboardingConcluido";
const OBJETIVOS_KEY = "nexo.objetivos";

export function salvarPerfilUso(perfil: PerfilUso) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERFIL_KEY, perfil);
}

export function carregarPerfilUso(): PerfilUso | null {
  if (typeof window === "undefined") return null;
  const valor = window.localStorage.getItem(PERFIL_KEY);
  return valor === "pessoal" || valor === "negocio" || valor === "empresa" ? valor : null;
}

export function salvarObjetivos(objetivos: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OBJETIVOS_KEY, JSON.stringify(objetivos));
}

export function carregarObjetivos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const valor = window.localStorage.getItem(OBJETIVOS_KEY);
    return valor ? JSON.parse(valor) : [];
  } catch {
    return [];
  }
}

export function salvarPlanoLocal(plano: PlanoNexo) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLANO_KEY, plano);
}

export function carregarPlanoLocal(): PlanoNexo {
  if (typeof window === "undefined") return "free";
  const valor = window.localStorage.getItem(PLANO_KEY);
  return valor === "pro" || valor === "business" ? valor : "free";
}

export function concluirOnboarding() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "true");
}

export function onboardingConcluido() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function nomePerfilUso(perfil: PerfilUso | null) {
  if (perfil === "pessoal") return "Finanças pessoais";
  if (perfil === "empresa") return "Empresa e equipe";
  if (perfil === "negocio") return "Meu negócio";
  return "Não definido";
}

export function nomePlano(plano: PlanoNexo) {
  return PLANOS_NEXO.find((item) => item.id === plano)?.nome ?? "Free";
}

export function nivelPlano(plano: PlanoNexo) {
  if (plano === "business") return 3;
  if (plano === "pro") return 2;
  return 1;
}

export function planoPermite(planoAtual: PlanoNexo, minimo: PlanoNexo) {
  return nivelPlano(planoAtual) >= nivelPlano(minimo);
}
