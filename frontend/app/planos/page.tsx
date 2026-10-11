"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  alterarPlanoNoBackend,
  carregarObjetivos,
  carregarPerfilUso,
  PLANOS_NEXO,
  PlanoNexo,
  salvarOnboardingNoBackend,
} from "../../lib/saas";

export default function PlanosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const veioDoOnboarding = searchParams.get("origem") === "onboarding";
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState<PlanoNexo | null>(null);

  function destinoDoPerfil() {
    const perfil = carregarPerfilUso();
    if (perfil === "pessoal") return "/pessoal";
    if (perfil === "empresa") return "/empresa";
    return "/";
  }

  async function escolherPlano(plano: PlanoNexo) {
    setErro("");
    setSalvando(plano);
    try {
      await alterarPlanoNoBackend(plano);

      if (veioDoOnboarding) {
        const perfil = carregarPerfilUso();
        if (perfil) await salvarOnboardingNoBackend(perfil, carregarObjetivos(), true);
        router.push(destinoDoPerfil());
      } else {
        router.push(`/conta/assinatura?plano=${plano}&modo=prototipo`);
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar o plano.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <main className="saas-shell pricing-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href={veioDoOnboarding ? "/onboarding" : "/"}>
          <span>N</span><div><strong>Nexo</strong><small>Seu espaço financeiro</small></div>
        </Link>
        <Link className="secondary-button compact-button" href={veioDoOnboarding ? "/onboarding" : "/"}>Voltar</Link>
      </section>

      <section className="pricing-heading">
        <p className="eyebrow">Planos Nexo</p>
        <h1>Comece simples. Evolua quando fizer sentido.</h1>
        <p>Os planos foram organizados para acompanhar o crescimento do uso, sem complicar o começo.</p>
      </section>

      <section className="pricing-grid">
        {PLANOS_NEXO.map((plano) => (
          <article className={`pricing-card${plano.id === "pro" ? " featured" : ""}`} key={plano.id}>
            <div className="pricing-card-top">
              <div>
                {plano.destaque ? <span className="pricing-badge">{plano.destaque}</span> : null}
                <h2>{plano.nome}</h2>
                <p>{plano.descricao}</p>
              </div>
              <div className="pricing-price"><strong>{plano.preco}</strong><span>{plano.periodo}</span></div>
            </div>

            <div className="pricing-features">
              {plano.recursos.map((recurso) => <span key={recurso}>✓ {recurso}</span>)}
            </div>

            <button className={plano.id === "pro" ? "primary-button pricing-button" : "secondary-button pricing-button"} type="button" disabled={salvando !== null} onClick={() => escolherPlano(plano.id)}>
              {salvando === plano.id ? "Salvando..." : plano.id === "free" ? "Usar plano Free" : `Testar experiência ${plano.nome}`}
            </button>
          </article>
        ))}
      </section>

      {erro ? <p className="form-error-banner">{erro}</p> : null}

      <section className="pricing-note">
        <strong>Modo de protótipo:</strong>
        <p>A escolha do plano agora já fica salva no banco da organização. A cobrança financeira real ainda será conectada quando definirmos o provedor de pagamento.</p>
      </section>
    </main>
  );
}
