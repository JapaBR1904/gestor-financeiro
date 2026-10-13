"use client";
import { Marca } from "./Marca";
import Link from "next/link";
import { Icone } from "./Icone";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Assinatura,
  carregarAssinatura,
  listarPlanos,
  PlanoDetalhe,
} from "../lib/assinatura";
import {
  acaoPlano,
  disponibilidadeAssinatura,
  precoPlano,
} from "../lib/planos";
import {
  carregarConfiguracaoSaas,
  salvarOnboardingNoBackend,
} from "../lib/saas";

export default function PlanosConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const onboarding = params.get("origem") === "onboarding";
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [planos, setPlanos] = useState<PlanoDetalhe[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const disponibilidade = assinatura
    ? disponibilidadeAssinatura(assinatura)
    : null;
  useEffect(() => {
    let ativo = true;
    Promise.all([carregarAssinatura(), listarPlanos()])
      .then(([atual, catalogo]) => {
        if (ativo) {
          setAssinatura(atual);
          setPlanos(catalogo);
        }
      })
      .catch((error) => {
        if (ativo)
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os planos.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);
  async function continuar() {
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const config = await carregarConfiguracaoSaas();
      if (config.perfilUso)
        await salvarOnboardingNoBackend(
          config.perfilUso,
          config.objetivos,
          true,
        );
      router.replace(
        config.perfilUso === "pessoal"
          ? "/pessoal"
          : config.perfilUso === "empresa"
            ? "/empresa"
            : "/",
      );
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível continuar.",
      );
    } finally {
      setSalvando(false);
    }
  }
  return (
    <main id="conteudo" tabIndex={-1} className="saas-shell pricing-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/">
          <span>
            <Marca />
          </span>
          <div>
            <strong>Nexo</strong>
            <small>Planos e assinatura</small>
          </div>
        </Link>
        <Link
          className="secondary-button compact-button"
          href={onboarding ? "/onboarding" : "/conta/assinatura"}
        >
          Voltar
        </Link>
      </section>
      <section className="pricing-heading">
        <p className="eyebrow">Planos Nexo</p>
        <h1>Escolha o plano para o seu momento</h1>
        <p>
          Compare recursos e gerencie seu plano sem perder os dados da
          organização.
        </p>
      </section>
      {assinatura ? (
        <div className="pricing-current" role="status">
          <span className="plan-pill" data-plan={assinatura.plano.id}>
            {assinatura.plano.nome}
          </span>
          <p>
            Seu plano atual. Os dados da organização acompanham você em qualquer
            mudança.
          </p>
        </div>
      ) : null}
      {erro ? (
        <div className="form-error-banner" role="alert">
          <p>{erro}</p>
          <button
            className="secondary-button"
            onClick={() => {
              setErro("");
              setTentativa((valor) => valor + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : !assinatura ? (
        <div className="pricing-loading" role="status">
          <p>Carregando planos…</p>
          <div className="skeleton" aria-hidden="true" />
        </div>
      ) : null}
      {disponibilidade && !disponibilidade.habilitada ? (
        <section
          className="pricing-note"
          aria-label="Disponibilidade da assinatura"
        >
          <strong>{disponibilidade.titulo}</strong>
          <p>{disponibilidade.mensagem}</p>
        </section>
      ) : null}
      <section className="pricing-grid">
        {planos.map((plano) => {
          const atual = assinatura?.plano.id === plano.id;
          const habilitado = disponibilidade?.habilitada;
          return (
            <article
              className={`pricing-card plan-${plano.id}${plano.id === "pro" ? " featured" : ""}${atual ? " plan-current" : ""}`}
              key={plano.id}
              aria-label={`Plano ${plano.nome}`}
            >
              <div className="pricing-card-kicker">
                <span>
                  {plano.id === "free"
                    ? "O essencial"
                    : plano.id === "pro"
                      ? "Mais autonomia"
                      : "Gestão em equipe"}
                </span>
                {plano.id === "pro" ? (
                  <span className="pricing-badge" title="Para planejamento e análise individual">Planejamento individual</span>
                ) : (
                  <Icone
                    nome={plano.id === "business" ? "equipe" : "movimentos"}
                  />
                )}
              </div>
              <div className="pricing-card-top">
                <div>
                  <h2>{plano.nome}</h2>
                  <p>{plano.descricao}</p>
                </div>
                <div className="pricing-price">
                  <strong>{precoPlano(plano.valorMensal)}</strong>
                  <span>/mês</span>
                </div>
              </div>
              <ul className="pricing-features">
                {plano.beneficios.slice(0, 5).map((recurso) => (
                  <li key={recurso}>
                    <Icone nome="check" />
                    {recurso}
                  </li>
                ))}
              </ul>
              <p className="subscription-limit">
                Limite: {plano.limiteUsuarios} usuário(s). Business inclui os recursos Pro; colaboração exclusiva do Business.
              </p>
              {atual || !habilitado ? (
                <button className="secondary-button pricing-button" disabled>
                  {atual
                    ? "Plano atual"
                    : (disponibilidade?.titulo ?? "Carregando…")}
                </button>
              ) : (
                <Link
                  className={
                    plano.id === "pro"
                      ? "primary-button pricing-button"
                      : "secondary-button pricing-button"
                  }
                  href={`/checkout?plano=${plano.id}${onboarding ? "&origem=onboarding" : ""}`}
                >
                  {acaoPlano(assinatura!.plano.id, plano.id)}
                </Link>
              )}
            </article>
          );
        })}
      </section>
      {planos.length ? (
        <details
          className="plan-comparison"
          aria-labelledby="comparacao-planos"
        >
          <summary id="comparacao-planos">Comparar todos os recursos</summary>
          <div className="plan-benefits-details">{planos.map(plano => <div key={plano.id}><h2>{plano.nome}</h2><ul>{plano.beneficios.map(beneficio => <li key={beneficio}>{beneficio}</li>)}</ul></div>)}</div>
          <div className="plan-comparison-scroll">
            <table>
              <caption className="sr-only">
                Recursos e limites fornecidos pelo catálogo do Nexo
              </caption>
              <thead>
                <tr>
                  <th scope="col">Recurso</th>
                  {planos.map((plano) => (
                    <th scope="col" key={plano.id}>
                      {plano.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Usuários no espaço</th>
                  {planos.map((plano) => (
                    <td key={plano.id}>{plano.limiteUsuarios}</td>
                  ))}
                </tr>
                {[
                  ["METAS", "Metas"],
                  ["FLUXO_CAIXA", "Fluxo de caixa"],
                  ["COMPARATIVOS", "Comparativos"],
                  ["EXPORTACAO", "Exportação CSV"],
                  ["IA_BASICA", "Assistente IA"],
                  ["EQUIPE", "Equipe e convites"],
                  ["PERMISSOES", "Papéis e permissões"],
                  ["DOCUMENTOS", "Documentos"],
                  ["IA_DOCUMENTOS", "IA com documentos"],
                ].map(([recurso, nome]) => (
                  <tr key={recurso}>
                    <th scope="row">{nome}</th>
                    {planos.map((plano) => (
                      <td key={plano.id}>
                        {plano.recursos.includes(recurso) ? (
                          <>
                            <Icone nome="check" />
                            <span className="sr-only">Incluído</span>
                          </>
                        ) : (
                          <span className="comparison-unavailable">
                            Não incluído
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
      {onboarding && assinatura ? (
        <button
          className="primary-button"
          onClick={continuar}
          disabled={salvando}
        >
          {salvando ? "Continuando..." : "Continuar com o plano atual"}
        </button>
      ) : null}
      <section className="pricing-note">
        {disponibilidade?.habilitada ? (
          <>
            <strong>{disponibilidade.titulo}</strong>
            <p>{disponibilidade.mensagem}</p>
          </>
        ) : null}
        <p>
          Free e Pro são para uso individual. Business inclui os recursos Pro e
          a colaboração com até 10 usuários, contando o proprietário.
        </p>
      </section>
    </main>
  );
}
