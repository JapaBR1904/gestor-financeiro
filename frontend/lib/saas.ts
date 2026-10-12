import { apiFetch } from "./api";
import type { PlanoNexo } from "./planos";
export type PerfilUso = "pessoal" | "negocio" | "empresa";
export type { PlanoNexo } from "./planos";
export { nomePlano, nivelPlano, planoPermite } from "./planos";

export type ConfiguracaoSaas = {
  perfilUso: PerfilUso | null;
  objetivos: string[];
  onboardingConcluido: boolean;
  plano: PlanoNexo;
  statusAssinatura: string;
};

export const OBJETIVOS_POR_PERFIL: Record<PerfilUso, string[]> = {
  pessoal: ["Controlar gastos", "Acompanhar saldo", "Criar metas", "Entender para onde meu dinheiro vai"],
  negocio: ["Aumentar vendas", "Controlar custos", "Acompanhar lucro", "Organizar clientes", "Melhorar o fluxo de caixa"],
  empresa: ["Acompanhar indicadores", "Gerenciar equipe", "Controlar áreas", "Planejar crescimento", "Padronizar a operação"],
};

export async function carregarConfiguracaoSaas(): Promise<ConfiguracaoSaas> {
  return apiFetch<ConfiguracaoSaas>("/api/saas");
}

export async function salvarOnboardingNoBackend(perfil: PerfilUso, objetivos: string[], concluido: boolean): Promise<ConfiguracaoSaas> {
  return apiFetch<ConfiguracaoSaas>("/api/saas/onboarding", {
    method: "PUT", body: JSON.stringify({ perfilUso: perfil, objetivos, onboardingConcluido: concluido }),
  });
}

export function nomePerfilUso(perfil: PerfilUso | null) {
  if (perfil === "pessoal") return "Finanças pessoais";
  if (perfil === "empresa") return "Empresa e equipe";
  if (perfil === "negocio") return "Meu negócio";
  return "Não definido";
}
