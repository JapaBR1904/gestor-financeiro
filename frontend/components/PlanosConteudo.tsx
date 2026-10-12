"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Assinatura, carregarAssinatura, listarPlanos, PlanoDetalhe } from "../lib/assinatura";
import { acaoPlano, precoPlano } from "../lib/planos";
import { carregarConfiguracaoSaas, salvarOnboardingNoBackend } from "../lib/saas";

export default function PlanosConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const onboarding = params.get("origem") === "onboarding";
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [planos, setPlanos] = useState<PlanoDetalhe[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    let ativo = true;
    Promise.all([carregarAssinatura(), listarPlanos()]).then(([atual, catalogo]) => { if (ativo) { setAssinatura(atual); setPlanos(catalogo); } })
      .catch((error) => { if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar os planos."); });
    return () => { ativo = false; };
  }, []);
  async function continuar() {
    if (salvando) return;
    setSalvando(true); setErro("");
    try {
      const config = await carregarConfiguracaoSaas();
      if (config.perfilUso) await salvarOnboardingNoBackend(config.perfilUso, config.objetivos, true);
      router.replace(config.perfilUso === "pessoal" ? "/pessoal" : config.perfilUso === "empresa" ? "/empresa" : "/");
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível continuar."); }
    finally { setSalvando(false); }
  }
  return (
    <main className="saas-shell pricing-shell">
      <section className="saas-brandbar pricing-brandbar"><Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Planos e assinatura</small></div></Link><Link className="secondary-button compact-button" href={onboarding ? "/onboarding" : "/conta/assinatura"}>Voltar</Link></section>
      <section className="pricing-heading"><p className="eyebrow">Planos Nexo</p><h1>Escolha o plano para o seu momento</h1><p>Compare recursos e gerencie seu plano sem perder os dados da organização.</p></section>
      {erro ? <p className="form-error-banner" role="alert">{erro}</p> : !assinatura ? <p role="status">Carregando planos...</p> : null}
      <section className="pricing-grid">{planos.map((plano) => {
        const atual = assinatura?.plano.id === plano.id;
        const habilitado = assinatura?.podeGerenciar && assinatura.simulacaoHabilitada;
        return <article className={`pricing-card${plano.id === "pro" ? " featured" : ""}`} key={plano.id} aria-label={`Plano ${plano.nome}`}>
          <div className="pricing-card-top"><div><h2>{plano.nome}</h2><p>{plano.descricao}</p></div><div className="pricing-price"><strong>{precoPlano(plano.valorMensal)}</strong><span>/mês</span></div></div>
          <div className="pricing-features">{plano.beneficios.map((recurso) => <span key={recurso}>✓ {recurso}</span>)}</div>
          <p className="subscription-limit">Limite: {plano.limiteUsuarios} usuário(s). Recursos adicionais dependem do plano.</p>
          {atual || !habilitado ? <button className="secondary-button pricing-button" disabled>{atual ? "Plano atual" : "Troca indisponível"}</button> : <Link className={plano.id === "pro" ? "primary-button pricing-button" : "secondary-button pricing-button"} href={`/checkout?plano=${plano.id}${onboarding ? "&origem=onboarding" : ""}`}>{acaoPlano(assinatura!.plano.id, plano.id)}</Link>}
        </article>;
      })}</section>
      {onboarding && assinatura ? <button className="primary-button" onClick={continuar} disabled={salvando}>{salvando ? "Continuando..." : "Continuar com o plano atual"}</button> : null}
      <section className="pricing-note"><strong>{assinatura?.simulacaoHabilitada ? "Pagamento simulado" : "Assinaturas em preparação"}</strong><p>{assinatura?.simulacaoHabilitada ? "O checkout não realiza cobranças e não pede dados de cartão ou banco." : "A troca simulada precisa estar habilitada em desenvolvimento. Nenhuma cobrança real está disponível."}</p>{assinatura && !assinatura.podeGerenciar ? <p>Somente o dono da organização pode trocar o plano.</p> : null}<p>Equipe, convites, exportação, comparativos e recursos gerenciais ainda têm partes em preparação; os limites de usuários são preservados do catálogo existente.</p></section>
    </main>
  );
}
