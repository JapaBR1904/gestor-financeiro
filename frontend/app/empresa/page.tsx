"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarConfiguracaoSaas, nomePlano, planoPermite, PlanoNexo } from "../../lib/saas";

export default function EmpresaPage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [erro, setErro] = useState("");
  useEffect(() => { carregarConfiguracaoSaas().then(config => setPlano(config.plano)).catch(() => setErro("Não foi possível carregar o plano. Tente novamente.")); }, []);
  const business = planoPermite(plano, "business");

  return (
    <main className="saas-shell executive-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/empresa"><span>N</span><div><strong>Nexo</strong><small>Visão executiva</small></div></Link>
        <div className="personal-top-actions"><span className="plan-mini-label">Plano {nomePlano(plano)}</span><Link className="secondary-button compact-button" href="/conta">Conta</Link></div>
      </section>

      {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
      <section className="executive-hero">
        <div><p className="eyebrow">Gestão para equipes</p><h1>Uma visão mais executiva da operação</h1><p>Indicadores, responsabilidades e equipe organizados para quem precisa enxergar além do dia a dia.</p></div>
        <Link className="primary-button" href={business ? "/equipe" : "/planos"}>{business ? "Gerenciar equipe" : "Conhecer Business"}</Link>
      </section>

      <section className="executive-grid">
        <article className="executive-card"><span>Resultado consolidado</span><strong>—</strong><small>Será alimentado pelos dados reais da organização.</small></article>
        <article className="executive-card"><span>Unidades / áreas</span><strong>1</strong><small>Estrutura preparada para expansão.</small></article>
        <article className="executive-card"><span>Membros ativos</span><strong>{business ? "1" : "—"}</strong><small>{business ? "Gerencie acessos no Business." : "Disponível no Business."}</small></article>
        <article className="executive-card"><span>Metas estratégicas</span><strong>—</strong><small>Conectadas ao plano Pro ou Business.</small></article>
      </section>

      <section className="executive-actions-grid">
        <Link className="executive-action" href="/"><span>↗</span><div><strong>Operação</strong><p>Vendas, produtos, clientes e despesas.</p></div><b>→</b></Link>
        <Link className="executive-action" href="/relatorios"><span>▥</span><div><strong>Relatórios</strong><p>Indicadores atuais da organização.</p></div><b>→</b></Link>
        <Link className="executive-action" href="/metas"><span>◎</span><div><strong>Metas</strong><p>Objetivos e comparativos do período.</p></div><b>→</b></Link>
        <Link className="executive-action" href="/equipe"><span>◇</span><div><strong>Equipe</strong><p>Papéis, permissões e usuários.</p></div><b>→</b></Link>
      </section>

      {!business ? <section className="executive-upgrade-card"><div><p className="eyebrow">Business</p><h2>A experiência empresarial já está desenhada</h2><p>Compare os planos para liberar a área de equipe. Nesta etapa, a troca usa checkout simulado e fica salva na organização.</p></div><Link className="primary-button" href="/planos">Ver planos</Link></section> : null}
    </main>
  );
}
