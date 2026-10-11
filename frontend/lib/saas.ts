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
      "Relatórios avançados",
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

const PERFIL_KEY = "nexo.perfilUso";
const PLANO_KEY = "nexo.plano";
const ONBOARDING_KEY = "nexo.onboardingConcluido";

export function salvarPerfilUso(perfil: PerfilUso) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERFIL_KEY, perfil);
}

export function carregarPerfilUso(): PerfilUso | null {
  if (typeof window === "undefined") return null;
  const valor = window.localStorage.getItem(PERFIL_KEY);
  return valor === "pessoal" || valor === "negocio" || valor === "empresa" ? valor : null;
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
