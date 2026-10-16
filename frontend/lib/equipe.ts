import { apiFetch } from "./api";
import { publicarTrocaOrganizacao } from "./contexto-organizacao";
import type { UsuarioAutenticado } from "./auth";
export type Membro = {
  id: number;
  nome: string;
  papel: string;
  ativo: boolean;
};
export type Convite = {
  id: number;
  email: string;
  papel: string;
  status: string;
  expiraEm: string;
};
export type Equipe = {
  membros: Membro[];
  convites: Convite[];
  limite: number;
  podeGerenciar: boolean;
  papelAtual: string;
};
export type Organizacao = { id: number; nome: string; papel: string };
export type InformacaoConvite = {
  organizacaoId: number;
  organizacaoNome: string;
  papel: string;
  expiraEm: string;
};
export const carregarEquipe = () => apiFetch<Equipe>("/api/equipe");
export const convidarMembro = (email: string, papel: string) =>
  apiFetch<{ id: number; linkAceite: string }>("/api/equipe/convites", {
    method: "POST",
    body: JSON.stringify({ email, papel }),
  });
export const alterarPapel = (id: number, papel: string) =>
  apiFetch<void>(`/api/equipe/membros/${id}`, {
    method: "PUT",
    body: JSON.stringify({ papel }),
  });
export const removerMembro = (id: number) =>
  apiFetch<void>(`/api/equipe/membros/${id}`, { method: "DELETE" });
export const revogarConvite = (id: number) =>
  apiFetch<void>(`/api/equipe/convites/${id}`, { method: "DELETE" });
export const consultarConvite = (token: string) =>
  apiFetch<InformacaoConvite>("/api/equipe/convites/consulta", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
export const aceitarConvite = (token: string) =>
  apiFetch<InformacaoConvite>("/api/equipe/convites/aceitar", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
export const minhasOrganizacoes = () =>
  apiFetch<Organizacao[]>("/api/organizacoes/minhas");
export async function selecionarOrganizacao(organizacaoId: number) {
  const usuario = await apiFetch<UsuarioAutenticado>("/api/organizacoes/selecionar", {
    method: "POST", body: JSON.stringify({ organizacaoId }),
  });
  publicarTrocaOrganizacao();
  return usuario;
}
export const nomePapel = (papel: string) =>
  papel === "proprietario"
    ? "Proprietário"
    : papel === "administrador"
      ? "Administrador"
      : "Membro";

export const renomearOrganizacao = (nome: string) =>
  apiFetch<Organizacao>("/api/organizacoes/atual", {
    method: "PUT",
    body: JSON.stringify({ nome }),
  });

export const criarEspacoPessoal = () =>
  apiFetch<Organizacao>("/api/organizacoes/pessoal", { method: "POST" });
