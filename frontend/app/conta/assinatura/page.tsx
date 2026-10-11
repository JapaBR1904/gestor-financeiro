"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { carregarPerfilUso, carregarPlanoLocal, nomePerfilUso, PLANOS_NEXO, PlanoNexo } from "../../../lib/saas";

export default function AssinaturaPage() {
  const searchParams = useSearchParams();
  const planoDesejado = searchParams.get("plano") as PlanoNexo | null;
  const [planoAtual, setPlanoAtual] = useState<PlanoNexo>("free");
  const [perfil, setPerfil] = useState<ReturnType<typeof carregarPerfilUso>>(null);

  useEffect(() => {
    setPlanoAtual(carregarPlanoLocal());
    setPerfil(carregarPerfilUso());
  }, []);

  const atual = useMemo(() => PLANOS_NEXO.find((plano) => plano.id === planoAtual) ?? PLANOS_NEXO[0], [planoAtual]);
  const desejado = PLANOS_NEXO.find((plano) => plano.id === planoDesejado);

  return (
    <main className="saas-shell subscription-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Seu espaço financeiro</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      <section className="subscription-heading">
        <div>
          <p className="eyebrow">Conta e assinatura</p>
          <h1>Seu plano Nexo</h1>
          <p>Veja o plano atual, o perfil de uso escolhido e os próximos recursos disponíveis.</p>
        </div>
      </section>

      {desejado && desejado.id !== "free" ? (
        <section className="subscription-alert">
          <div><strong>{desejado.nome} está preparado para ser contratado.</strong><p>A interface e os recursos do plano já estão mapeados. Falta conectar o provedor de pagamento para ativar cobranças reais.</p></div>
          <Link className="secondary-button compact-button" href="/planos">Comparar planos</Link>
        </section>
      ) : null}

      <section className="subscription-grid">
        <article className="subscription-current-card">
          <span className="plan-mini-label">Plano atual</span>
          <div className="subscription-plan-title"><h2>{atual.nome}</h2><div className="pricing-price"><strong>{atual.preco}</strong><span>{atual.periodo}</span></div></div>
          <p>{atual.descricao}</p>
          <div className="pricing-features compact-features">{atual.recursos.map((recurso) => <span key={recurso}>✓ {recurso}</span>)}</div>
          <Link className="primary-button subscription-upgrade" href="/planos">Ver opções de upgrade</Link>
        </article>

        <article className="subscription-profile-card">
          <p className="eyebrow">Perfil de uso</p>
          <h2>{nomePerfilUso(perfil)}</h2>
          <p>Essa escolha ajuda o Nexo a organizar a experiência de entrada. Depois vamos usar esse perfil para personalizar indicadores e sugestões.</p>
          <Link className="secondary-button compact-button" href="/onboarding">Alterar perfil</Link>
        </article>
      </section>

      <section className="plan-capability-grid">
        <article><span className="capability-icon">F</span><div><strong>Free</strong><p>Operação essencial para começar: vendas, despesas, produtos, clientes e relatórios.</p></div></article>
        <article><span className="capability-icon">P</span><div><strong>Pro</strong><p>Mais análise, exportações, metas, comparativos e até 3 usuários.</p></div></article>
        <article><span className="capability-icon">B</span><div><strong>Business</strong><p>Equipe maior, permissões, visão gerencial e estrutura preparada para empresas.</p></div></article>
      </section>
    </main>
  );
}
