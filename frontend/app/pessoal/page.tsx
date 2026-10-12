"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarConfiguracaoSaas, nomePlano, PlanoNexo } from "../../lib/saas";

export default function PessoalPage() {
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [plano, setPlano] = useState<PlanoNexo>("free");

  const [erro, setErro] = useState("");
  useEffect(() => {
    carregarConfiguracaoSaas().then(config => { setObjetivos(config.objetivos); setPlano(config.plano); })
      .catch(() => setErro("Não foi possível carregar sua configuração. Tente novamente."));
  }, []);

  return (
    <main className="saas-shell personal-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/pessoal"><span>N</span><div><strong>Nexo</strong><small>Finanças pessoais</small></div></Link>
        <div className="personal-top-actions"><span className="plan-mini-label">Plano {nomePlano(plano)}</span><Link className="secondary-button compact-button" href="/conta">Conta</Link></div>
      </section>

      {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
      <section className="personal-hero">
        <div><p className="eyebrow">Seu dinheiro, com clareza</p><h1>Uma visão simples da sua vida financeira</h1><p>Aqui o Nexo deixa de parecer uma ferramenta de empresa e prioriza saldo, gastos, metas e organização pessoal.</p></div>
        <button className="primary-button" type="button" disabled>+ Novo lançamento</button>
      </section>

      <section className="personal-summary-grid">
        <article><span>Saldo do mês</span><strong>R$ 0,00</strong><small>Entradas menos gastos</small></article>
        <article><span>Entradas</span><strong>R$ 0,00</strong><small>Nenhuma entrada registrada</small></article>
        <article><span>Gastos</span><strong>R$ 0,00</strong><small>Nenhum gasto registrado</small></article>
        <article><span>Meta mensal</span><strong>—</strong><small>Defina quando quiser</small></article>
      </section>

      <section className="personal-layout">
        <article className="personal-panel"><div className="personal-panel-header"><div><p className="eyebrow">Movimentações</p><h2>Últimos lançamentos</h2></div></div><div className="personal-empty"><span>◎</span><strong>Comece pelo primeiro lançamento</strong><p>Quando o banco desta etapa estiver conectado, suas entradas e gastos pessoais aparecerão aqui.</p></div></article>
        <article className="personal-panel"><p className="eyebrow">Seus objetivos</p><h2>O que você quer melhorar</h2><div className="personal-goals">{objetivos.length ? objetivos.map((objetivo) => <span key={objetivo}>✓ {objetivo}</span>) : <p>Você ainda não escolheu objetivos.</p>}</div><Link className="secondary-button compact-button" href="/onboarding">Editar objetivos</Link></article>
      </section>

      <section className="personal-footer-actions"><Link href="/planos">Conhecer planos</Link><Link href="/conta/assinatura">Gerenciar assinatura</Link><Link href="/">Ir para visão de negócio</Link></section>
    </main>
  );
}
