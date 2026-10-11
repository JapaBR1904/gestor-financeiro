"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarObjetivos, carregarPerfilUso, carregarPlanoLocal, nomePerfilUso, nomePlano, PlanoNexo } from "../../lib/saas";

export default function ContaPage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [perfil, setPerfil] = useState<ReturnType<typeof carregarPerfilUso>>(null);
  const [objetivos, setObjetivos] = useState<string[]>([]);

  useEffect(() => {
    setPlano(carregarPlanoLocal());
    setPerfil(carregarPerfilUso());
    setObjetivos(carregarObjetivos());
  }, []);

  return (
    <main className="saas-shell account-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Conta e preferências</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      <section className="account-heading">
        <p className="eyebrow">Sua conta</p>
        <h1>Configurações do Nexo</h1>
        <p>Gerencie perfil de uso, assinatura e a forma como o Nexo prepara sua experiência.</p>
      </section>

      <section className="account-grid">
        <Link className="account-card account-card-primary" href="/conta/assinatura">
          <span className="account-card-icon">◇</span>
          <div><small>Plano atual</small><strong>{nomePlano(plano)}</strong><p>Veja recursos, compare planos e prepare upgrades.</p></div>
          <span className="account-card-arrow">→</span>
        </Link>

        <Link className="account-card" href="/onboarding">
          <span className="account-card-icon">◎</span>
          <div><small>Perfil de uso</small><strong>{nomePerfilUso(perfil)}</strong><p>Altere como você pretende usar o Nexo e seus objetivos.</p></div>
          <span className="account-card-arrow">→</span>
        </Link>

        <article className="account-card account-objectives-card">
          <span className="account-card-icon">✓</span>
          <div><small>Objetivos escolhidos</small><strong>{objetivos.length || "Nenhum"}</strong><p>{objetivos.length ? objetivos.join(" · ") : "Você pode definir objetivos no onboarding."}</p></div>
        </article>
      </section>

      <section className="account-section-card">
        <div><p className="eyebrow">SaaS</p><h2>Estrutura preparada para crescer</h2><p>Quando conectarmos o banco dessa etapa, perfil, plano, assinatura e equipe deixam de ser locais e passam a pertencer à conta de verdade.</p></div>
        <Link className="primary-button" href="/planos">Comparar planos</Link>
      </section>
    </main>
  );
}
