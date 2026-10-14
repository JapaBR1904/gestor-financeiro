"use client";
import { Marca } from "./Marca";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Assinatura,
  carregarAssinatura,
  carregarCheckout,
} from "../lib/assinatura";
import {
  disponibilidadeAssinatura,
  nomePlano,
  nomeStatus,
  precoPlano,
} from "../lib/planos";

export default function AssinaturaConteudo() {
  const params = useSearchParams();
  const checkoutId = params.get("checkout");
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const atual = await carregarAssinatura();
        if (ativo) setAssinatura(atual);
        if (checkoutId) {
          const resultado = await carregarCheckout(checkoutId);
          if (ativo && resultado.status === "aprovado")
            setMensagem(
              "Sua alteração foi concluída. O plano atual está salvo na organização.",
            );
        }
      } catch (error) {
        if (ativo)
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar sua assinatura.",
          );
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [checkoutId]);
  return (
    <main id="conteudo" tabIndex={-1} className="saas-shell subscription-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/dashboard">
          <span>
            <Marca />
          </span>
          <div>
            <strong>Nexo</strong>
            <small>Minha assinatura</small>
          </div>
        </Link>
        <Link className="secondary-button compact-button" href="/conta">
          Voltar à conta
        </Link>
      </section>
      <section className="subscription-heading">
        <h1>Minha assinatura</h1>
        <p>Plano, recursos e histórico vinculados à organização.</p>
      </section>
      {erro ? (
        <p className="form-error-banner" role="alert">
          {erro}
        </p>
      ) : null}
      {mensagem ? (
        <p className="auth-success-banner" role="status">
          {mensagem}
        </p>
      ) : null}
      {!assinatura && !erro ? (
        <p role="status">Carregando assinatura...</p>
      ) : null}
      {assinatura ? (
        <>
          <section className="subscription-grid">
            <article className="subscription-current-card">
              <span className="plan-mini-label">
                Plano atual · {nomeStatus(assinatura.status)}
              </span>
              <div className="subscription-plan-title">
                <h2>{assinatura.plano.nome}</h2>
                <div className="pricing-price">
                  <strong>{precoPlano(assinatura.plano.valorMensal)}</strong>
                  <span>/mês</span>
                </div>
              </div>
              <p>{assinatura.plano.descricao}</p>
              <div className="pricing-features">
                {assinatura.plano.beneficios.map((r) => (
                  <span key={r}>✓ {r}</span>
                ))}
              </div>
              <p>
                Última alteração:{" "}
                {assinatura.ultimaAlteracao
                  ? new Date(assinatura.ultimaAlteracao).toLocaleString("pt-BR")
                  : "Nenhuma"}
              </p>
              <Link className="primary-button" href="/planos">
                Ver planos e trocar
              </Link>
            </article>
            <article className="subscription-profile-card">
              <h2>Gerenciamento</h2>
              <p>Status: {nomeStatus(assinatura.status)}</p>
              <p>
                Usuários ativos: {assinatura.usuariosAtivos} de{" "}
                {assinatura.plano.limiteUsuarios}.
              </p>
              {assinatura.usuariosAtivos > assinatura.plano.limiteUsuarios ? (
                <p className="checkout-warning">
                  Seus usuários atuais estão preservados. Novas inclusões acima
                  do limite não estão disponíveis.
                </p>
              ) : null}
              <p>{disponibilidadeAssinatura(assinatura).mensagem}</p>
              {assinatura.plano.id !== "free" &&
              assinatura.podeGerenciar &&
              assinatura.simulacaoHabilitada ? (
                <Link
                  className="secondary-button"
                  href="/checkout?cancelar=assinatura"
                >
                  Solicitar cancelamento
                </Link>
              ) : null}
              <Link href="/conta" className="auth-back">
                Preferências da conta
              </Link>
            </article>
          </section>
          <details className="subscription-current-card subscription-history-details">
            <summary>Histórico de alterações</summary>
            {assinatura.historico.length ? (
              <ul className="subscription-history">
                {assinatura.historico.map((item, indice) => (
                  <li key={`${item.criadoEm}-${indice}`}>
                    <strong>
                      {nomePlano(item.planoAnterior)} →{" "}
                      {nomePlano(item.planoNovo)}
                    </strong>
                    <span>
                      {item.tipo === "cancelamento"
                        ? "Cancelamento"
                        : item.tipo === "upgrade"
                          ? "Upgrade"
                          : "Downgrade"}{" "}
                      · Simulado
                    </span>
                    <time dateTime={item.criadoEm}>
                      {new Date(item.criadoEm).toLocaleString("pt-BR")}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Nenhuma alteração registrada. Mudanças anteriores a este fluxo
                não geram um histórico fictício.
              </p>
            )}
          </details>
          <section className="plan-capability-grid">
            <Link href="/dashboard" className="plan-capability-link">
              <div>
                <strong>Operação essencial</strong>
                <p>Vendas, despesas, produtos, clientes e relatórios.</p>
              </div>
            </Link>
            <Link
              href={
                assinatura.plano.recursos.includes("METAS")
                  ? "/metas"
                  : "/planos"
              }
              className="plan-capability-link"
            >
              <div>
                <strong>Metas Pro</strong>
                <p>
                  {assinatura.plano.recursos.includes("METAS")
                    ? "Disponível"
                    : "Veja os planos para liberar este recurso."}
                </p>
              </div>
            </Link>
            <Link
              href={
                assinatura.plano.recursos.includes("EQUIPE")
                  ? "/equipe"
                  : "/planos"
              }
              className="plan-capability-link"
            >
              <div>
                <strong>Equipe Business</strong>
                <p>
                  {assinatura.plano.recursos.includes("EQUIPE")
                    ? "Disponível"
                    : "Veja os planos para liberar este recurso."}
                </p>
              </div>
            </Link>
          </section>
        </>
      ) : null}
    </main>
  );
}
