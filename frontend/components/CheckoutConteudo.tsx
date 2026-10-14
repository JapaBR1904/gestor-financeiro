"use client";
import { Marca } from "./Marca";
import { avisarWorkspace } from "../lib/workspace";
import Link from "next/link";
import { Icone } from "./Icone";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  abrirCheckout,
  Assinatura,
  cancelarCheckout,
  carregarAssinatura,
  Checkout,
  confirmarCheckout,
  MetodoPagamento,
  CenarioPagamento,
  solicitarCancelamento,
} from "../lib/assinatura";
import { planoValido, precoPlano, nomePlano } from "../lib/planos";
import {
  carregarConfiguracaoSaas,
  salvarOnboardingNoBackend,
} from "../lib/saas";

export default function CheckoutRota() {
  const params = useSearchParams();
  const plano = params.get("plano");
  const cancelar = params.get("cancelar") === "assinatura";
  const onboarding = params.get("origem") === "onboarding";
  return (
    <CheckoutConteudo
      key={`${plano}-${cancelar}-${onboarding}`}
      plano={plano}
      cancelar={cancelar}
      onboarding={onboarding}
    />
  );
}
function CheckoutConteudo({
  plano,
  cancelar,
  onboarding,
}: {
  plano: string | null;
  cancelar: boolean;
  onboarding: boolean;
}) {
  const chave = useRef<string | null>(null);
  const ocupado = useRef(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [cenario, setCenario] = useState<CenarioPagamento>("aprovado");
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const atual = await carregarAssinatura();
        if (!cancelar && !planoValido(plano))
          throw new Error("Escolha um plano válido na página de planos.");
        if (!chave.current) chave.current = crypto.randomUUID();
        const novo = cancelar
          ? await solicitarCancelamento(chave.current)
          : await abrirCheckout(
              plano as "free" | "pro" | "business",
              chave.current,
            );
        if (ativo) {
          setAssinatura(atual);
          setCheckout(novo);
        }
      } catch (error) {
        if (ativo)
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o checkout.",
          );
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [plano, cancelar]);
  async function confirmar() {
    if (!checkout || ocupado.current) return;
    if (checkout.tipo !== "upgrade" && !consentimento)
      return setErro(
        "Confirme que você entendeu a mudança de recursos e limites.",
      );
    ocupado.current = true;
    setProcessando(true);
    setErro("");
    try {
      const resultado = await confirmarCheckout(checkout.id, metodo, cenario);
      setCheckout(resultado);
      if (resultado.status === "aprovado") avisarWorkspace();
      if (resultado.status === "aprovado" && onboarding) {
        try {
          const config = await carregarConfiguracaoSaas();
          if (config.perfilUso)
            await salvarOnboardingNoBackend(
              config.perfilUso,
              config.objetivos,
              true,
            );
        } catch {
          setErro(
            "Seu plano foi atualizado, mas não foi possível concluir as preferências. Confira sua conta.",
          );
        }
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível processar a solicitação.",
      );
    } finally {
      ocupado.current = false;
      setProcessando(false);
    }
  }
  async function desistir() {
    if (!checkout || ocupado.current) return;
    ocupado.current = true;
    setProcessando(true);
    setErro("");
    try {
      setCheckout(await cancelarCheckout(checkout.id));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar o checkout.",
      );
    } finally {
      ocupado.current = false;
      setProcessando(false);
    }
  }
  const mensagens = {
    aprovado: cancelar
      ? "Assinatura cancelada. Seu plano agora é Free."
      : `Plano atualizado para ${checkout?.plano.nome}.`,
    recusado: "Pagamento simulado recusado. Seu plano não foi alterado.",
    cancelado: "Checkout cancelado. Seu plano não foi alterado.",
    expirado: "Este checkout expirou. Abra uma nova solicitação.",
    desatualizado:
      "Sua assinatura mudou. Abra um novo checkout para continuar.",
  };
  return (
    <main id="conteudo" tabIndex={-1} className="saas-shell subscription-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/dashboard">
          <span>
            <Marca />
          </span>
          <div>
            <strong>Nexo</strong>
            <small>Checkout simulado</small>
          </div>
        </Link>
        <Link href="/planos" className="secondary-button compact-button">
          Ver planos
        </Link>
      </section>
      <section className="subscription-heading">
        <h1>
          {cancelar
            ? "Cancelar assinatura"
            : checkout?.tipo === "downgrade"
              ? "Confirmar downgrade"
              : "Checkout"}
        </h1>
        <p>
          Nenhuma cobrança real. Não informe dados de cartão, banco ou chave
          Pix.
        </p>
      </section>
      {erro ? (
        <p className="form-error-banner" role="alert">
          {erro}
        </p>
      ) : null}
      {!checkout && !erro ? <p role="status">Carregando checkout...</p> : null}
      {checkout && checkout.status !== "pendente" ? (
        <section
          className="subscription-current-card checkout-result"
          data-status={checkout.status}
          data-plan={checkout.plano.id}
          role="status"
        >
          <span
            className="checkout-result-icon"
            data-success={checkout.status === "aprovado"}
          >
            <Icone
              nome={checkout.status === "aprovado" ? "check" : "relatorio"}
            />
          </span>
          <h2>{mensagens[checkout.status]}</h2>
          {checkout.status === "aprovado" ? (
            <p>Redirecionando para sua assinatura...</p>
          ) : null}
          <Link
            className="primary-button"
            href={
              checkout.status === "aprovado"
                ? `/conta/assinatura?checkout=${checkout.id}`
                : "/planos"
            }
          >
            {checkout.status === "aprovado"
              ? "Voltar ao sistema"
              : "Voltar aos planos"}
          </Link>
        </section>
      ) : checkout ? (
        <div className="checkout-grid">
          <section
            className="subscription-current-card checkout-plan-summary"
            data-plan={checkout.plano.id}
          >
            <p className="eyebrow">Resumo do plano</p>
            <h2>{checkout.plano.nome}</h2>
            <p>
              {nomePlano(checkout.planoAnterior)} → {checkout.plano.nome}
            </p>
            <div className="pricing-price">
              <strong>{precoPlano(checkout.plano.valorMensal)}</strong>
              <span>/mês</span>
            </div>
            <details className="checkout-benefits"><summary>O que está incluído</summary><ul className="pricing-features">
              {checkout.plano.beneficios.map((r) => (
                <li key={r}>
                  <Icone nome="check" />
                  {r}
                </li>
              ))}
            </ul></details>
            <div className="checkout-total">
              <span>Total simulado:</span>
              <strong>{precoPlano(checkout.total)}</strong>
            </div>
            <p>
              Periodicidade mensal. Sem fatura, cobrança, rateio ou renovação
              real.
            </p>
          </section>
          <section className="subscription-profile-card">
            {checkout.tipo !== "upgrade" ? (
              <div className="checkout-warning">
                <h2>O que muda</h2>
                <p>
                  Recursos e limites do plano {checkout.plano.nome} passarão a
                  valer imediatamente. Seus dados existentes serão mantidos.
                </p>
                <p>
                  Limite: {checkout.plano.limiteUsuarios} usuário(s). Inclusões
                  acima do limite ficam indisponíveis; não excluiremos usuários
                  ou informações financeiras.
                </p>
                {assinatura &&
                assinatura.usuariosAtivos > checkout.plano.limiteUsuarios ? (
                  <p>
                    Há {assinatura.usuariosAtivos} usuários ativos na
                    organização, acima do novo limite.
                  </p>
                ) : null}
                <label className="checkout-consent">
                  <input
                    type="checkbox"
                    checked={consentimento}
                    onChange={(e) => setConsentimento(e.target.checked)}
                    disabled={processando}
                  />
                  Entendi a mudança e quero continuar
                </label>
              </div>
            ) : null}
            {checkout.total > 0 ? (
              <fieldset className="checkout-methods" disabled={processando}>
                <legend>Método de pagamento simulado</legend>
                {(
                  [
                    ["pix", "Pix"],
                    ["cartao", "Cartão"],
                    ["boleto", "Boleto"],
                  ] as const
                ).map(([id, nome]) => (
                  <label key={id}>
                    <input
                      type="radio"
                      name="metodo"
                      value={id}
                      checked={metodo === id}
                      onChange={() => setMetodo(id)}
                    />
                    {nome}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p>Esta alteração não envolve pagamento.</p>
            )}
            <div className="checkout-simulation">
              <span>Ambiente de desenvolvimento</span>
              <label className="field">
                <span>Resultado da simulação</span>
                <select
                  aria-label="Resultado da simulação"
                  value={cenario}
                  onChange={(e) =>
                    setCenario(e.target.value as CenarioPagamento)
                  }
                  disabled={processando}
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="recusado">Recusado</option>
                  <option value="erro">Erro inesperado</option>
                </select>
              </label>
            </div>
            <button
              className="primary-button auth-primary"
              onClick={confirmar}
              disabled={processando}
              aria-busy={processando}
            >
              {processando
                ? "Processando..."
                : cancelar
                  ? "Confirmar cancelamento"
                  : checkout.tipo === "downgrade"
                    ? "Confirmar downgrade"
                    : "Confirmar pagamento simulado"}
            </button>
            <button
              className="secondary-button auth-primary"
              onClick={desistir}
              disabled={processando}
            >
              Cancelar e voltar
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
