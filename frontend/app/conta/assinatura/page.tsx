"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { carregarPerfilUso, carregarPlanoLocal, nomePerfilUso, PLANOS_NEXO, planoPermite, PlanoNexo } from "../../../lib/saas";

export default function AssinaturaPage() {
  const [planoAtual, setPlanoAtual] = useState<PlanoNexo>("free");
  const [perfil, setPerfil] = useState<ReturnType<typeof carregarPerfilUso>>(null);

  useEffect(() => {
    setPlanoAtual(carregarPlanoLocal());
    setPerfil(carregarPerfilUso());
  }, []);

  const atual = useMemo(() => PLANOS_NEXO.find((plano) => plano.id === planoAtual) ?? PLANOS_NEXO[0], [planoAtual]);
  const pro = planoPermite(planoAtual, "pro");
  const business = planoPermite(planoAtual, "business");

  return (
    <main className="saas-shell subscription-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Seu espaço financeiro</small></div></Link>
        <Link className="secondary-button compact-button" href="/conta">Voltar à conta</Link>
      </section>

      <section className="subscription-heading"><div><p className="eyebrow">Conta e assinatura</p><h1>Seu plano Nexo</h1><p>Teste a experiência de cada plano agora. Pagamento e persistência real entram quando ligarmos esta etapa ao banco.</p></div></section>

      <section className="subscription-grid">
        <article className="subscription-current-card">
          <span className="plan-mini-label">Plano atual no protótipo</span>
          <div className="subscription-plan-title"><h2>{atual.nome}</h2><div className="pricing-price"><strong>{atual.preco}</strong><span>{atual.periodo}</span></div></div>
          <p>{atual.descricao}</p>
          <div className="pricing-features compact-features">{atual.recursos.map((recurso) => <span key={recurso}>✓ {recurso}</span>)}</div>
          <Link className="primary-button subscription-upgrade" href="/planos">Trocar plano de teste</Link>
        </article>

        <article className="subscription-profile-card">
          <p className="eyebrow">Perfil de uso</p>
          <h2>{nomePerfilUso(perfil)}</h2>
          <p>Esse perfil define qual experiência inicial faz mais sentido para você.</p>
          <Link className="secondary-button compact-button" href="/onboarding">Alterar perfil</Link>
        </article>
      </section>

      <section className="plan-capability-grid">
        <Link href="/" className="plan-capability-link"><span className="capability-icon">F</span><div><strong>Operação Free</strong><p>Vendas, despesas, produtos, clientes e relatórios.</p></div></Link>
        <Link href={pro ? "/metas" : "/planos"} className={`plan-capability-link${pro ? " unlocked" : ""}`}><span className="capability-icon">P</span><div><strong>Área Pro</strong><p>{pro ? "Metas e fluxo de caixa já estão liberados." : "Ative o Pro para abrir metas e fluxo de caixa."}</p></div></Link>
        <Link href={business ? "/equipe" : "/planos"} className={`plan-capability-link${business ? " unlocked" : ""}`}><span className="capability-icon">B</span><div><strong>Área Business</strong><p>{business ? "Equipe e permissões já estão liberadas." : "Ative o Business para testar equipe e permissões."}</p></div></Link>
      </section>
    </main>
  );
}
