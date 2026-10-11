"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  carregarPerfilUso,
  concluirOnboarding,
  PLANOS_NEXO,
  PlanoNexo,
  salvarPlanoLocal,
} from "../../lib/saas";

export default function PlanosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const veioDoOnboarding = searchParams.get("origem") === "onboarding";

  function destinoDoPerfil() {
    const perfil = carregarPerfilUso();
    if (perfil === "pessoal") return "/pessoal";
    if (perfil === "empresa") return "/empresa";
    return "/";
  }

  function escolherPlano(plano: PlanoNexo) {
    salvarPlanoLocal(plano);
    if (veioDoOnboarding) concluirOnboarding();

    if (veioDoOnboarding) {
      router.push(destinoDoPerfil());
    } else {
      router.push(`/conta/assinatura?plano=${plano}&modo=prototipo`);
    }
    router.refresh();
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

            <button className={plano.id === "pro" ? "primary-button pricing-button" : "secondary-button pricing-button"} type="button" onClick={() => escolherPlano(plano.id)}>
              {plano.id === "free" ? "Usar plano Free" : `Testar experiência ${plano.nome}`}
            </button>
          </article>
        ))}
      </section>

      <section className="pricing-note">
        <strong>Modo de protótipo:</strong>
        <p>Você já pode alternar entre Free, Pro e Business para testar as páginas. A cobrança real e a assinatura persistida serão conectadas ao banco na próxima etapa.</p>
      </section>
    </main>
  );
}
