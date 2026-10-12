"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { carregarConfiguracaoSaas, ConfiguracaoSaas, nomePerfilUso, nomePlano } from "../../lib/saas";

export default function ContaPage() {
  const [config, setConfig] = useState<ConfiguracaoSaas | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarConfiguracaoSaas()
      .then(setConfig)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar sua conta."));
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
        <p>Perfil, objetivos e assinatura ficam vinculados à sua organização e são carregados do servidor.</p>
      </section>

      {erro ? <p className="form-error-banner">{erro}</p> : null}

      <section className="account-grid">
        <Link className="account-card account-card-primary" href="/conta/assinatura">
          <span className="account-card-icon">◇</span>
          <div><small>Plano atual</small><strong>{config ? nomePlano(config.plano) : "Carregando..."}</strong><p>Veja recursos, compare planos e prepare upgrades.</p></div>
          <span className="account-card-arrow">→</span>
        </Link>

        <Link className="account-card" href="/onboarding">
          <span className="account-card-icon">◎</span>
          <div><small>Perfil de uso</small><strong>{config ? nomePerfilUso(config.perfilUso) : "Carregando..."}</strong><p>Altere como você pretende usar o Nexo e seus objetivos.</p></div>
          <span className="account-card-arrow">→</span>
        </Link>

        <article className="account-card account-objectives-card">
          <span className="account-card-icon">✓</span>
          <div><small>Objetivos escolhidos</small><strong>{config ? config.objetivos.length || "Nenhum" : "—"}</strong><p>{config?.objetivos.length ? config.objetivos.join(" · ") : "Você pode definir objetivos no onboarding."}</p></div>
        </article>
      </section>

      <section className="account-section-card">
        <div><p className="eyebrow">Conta protegida</p><h2>Dados vinculados à organização</h2><p>Plano, perfil e recursos são validados no backend pela sessão autenticada. O navegador não escolhe mais qual organização acessar.</p></div>
        <Link className="primary-button" href="/planos">Comparar planos</Link>
      </section>
    </main>
  );
}
