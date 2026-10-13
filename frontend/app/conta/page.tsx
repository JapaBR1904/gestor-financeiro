"use client";
import Link from "next/link";
import { WorkspaceShell } from "../../components/WorkspaceShell";
import { useWorkspace } from "../../lib/workspace";
import { nomePapel } from "../../lib/equipe";
import { nomePerfilUso, nomePlano } from "../../lib/saas";

export default function ContaPage() {
  const { usuario, config, assinatura } = useWorkspace();
  const gestao = usuario?.papel === "proprietario" || (usuario?.papel === "administrador" && config?.plano === "business");
  return <WorkspaceShell titulo="Conta e preferências" descricao="Seus dados de acesso e as configurações do espaço atual.">
    {!usuario || !config ? <p role="status">Carregando sua conta…</p> : <>
      <section className="panel"><div className="panel-header"><h2>Seu acesso</h2><span className="tag">{nomePapel(usuario.papel)}</span></div><dl className="account-details"><div><dt>Nome</dt><dd>{usuario.nome}</dd></div><div><dt>E-mail verificado</dt><dd>{usuario.email}</dd></div><div><dt>Espaço atual</dt><dd>{usuario.organizacaoNome}</dd></div></dl><Link className="text-button" href="/esqueci-senha">Redefinir minha senha →</Link></section>
      <div className="product-two-columns" style={{ marginTop: 20 }}><section className="panel"><div className="panel-header"><h2>Plano {nomePlano(config.plano)}</h2></div><p className="subtitle">{assinatura?.podeGerenciar ? "Gerencie o plano e acompanhe o histórico de mudanças." : "Você pode consultar a assinatura. O proprietário gerencia as mudanças de plano."}</p><div className="product-form-actions"><Link className="primary-button" href="/conta/assinatura">Minha assinatura</Link><Link className="secondary-button" href="/planos">Comparar planos</Link></div></section>
      <section className="panel"><div className="panel-header"><h2>Como você usa este espaço</h2></div><strong>{nomePerfilUso(config.perfilUso)}</strong><p className="subtitle">{config.objetivos.length ? config.objetivos.join(" · ") : "Nenhum objetivo definido ainda."}</p>{gestao ? <Link className="text-button" href="/onboarding">Editar perfil e objetivos →</Link> : <p className="permission-note">As preferências do espaço são definidas pela gestão.</p>}</section></div>
      <section className="panel" style={{ marginTop: 20 }}><div className="panel-header"><h2>Organizações e equipe</h2></div><p className="subtitle">Seu espaço pessoal e as organizações das quais participa mantêm dados e assinaturas separados.</p><div className="product-form-actions"><Link className="secondary-button" href="/empresa">Gerenciar espaços</Link><Link className="secondary-button" href="/equipe">Consultar equipe</Link></div></section>
    </>}
  </WorkspaceShell>;
}
