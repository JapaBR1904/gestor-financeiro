"use client";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Icone } from "./Icone";
import { WorkspaceShell } from "./WorkspaceShell";
import { useWorkspace } from "../lib/workspace";
import { BloqueioPlano } from "./EstadoProduto";
import { perguntarAoNexoIa, statusIa } from "../lib/ia";
import { planoPermite } from "../lib/planos";

export function IaConteudo() {
  const { config } = useWorkspace();
  const pro = config && planoPermite(config.plano, "pro");
  const [configurada, setConfigurada] = useState<boolean | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [resumo, setResumo] = useState(false);
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const campoPergunta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!pro) return;
    let ativo = true;
    statusIa()
      .then((dados) => {
        if (ativo) setConfigurada(dados.configurada);
      })
      .catch((e) => {
        if (ativo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível verificar o assistente.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [pro]);
  async function perguntar(e: FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      const dados = await perguntarAoNexoIa(pergunta, resumo);
      setResposta(dados.resposta);
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível consultar o assistente.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  const exemplos = [
    "Como calcular a margem de um produto?",
    "Como organizar uma reserva para imprevistos?",
    "Que sinais devo acompanhar para melhorar meu fluxo de caixa?",
  ];
  return (
    <WorkspaceShell
      titulo="Assistente financeiro"
      descricao="Um apoio para entender custos, planejar e transformar dúvidas em próximos passos."
    >
      {!config ? (
        <p role="status">Carregando seu plano…</p>
      ) : !pro ? (
        <BloqueioPlano
          plano="Pro"
          titulo="Pense seus próximos passos com mais clareza"
          descricao="Converse sobre margem, custos e planejamento financeiro. Você escolhe quais dados compartilhar."
        />
      ) : (
        <>
          {erro ? (
            <p className="form-error-banner" role="alert">
              {erro}
            </p>
          ) : null}
          {configurada === null && !erro ? (
            <div className="ia-thinking" role="status">
              <p>Verificando disponibilidade…</p>
              <div className="skeleton" aria-hidden="true" />
              <div className="skeleton" aria-hidden="true" />
            </div>
          ) : configurada === false ? (
            <div className="ia-unavailable">
              <section className="product-lock">
                <span className="ia-symbol">
                  <Icone nome="ia" />
                </span>
                <span className="plan-pill">Seu plano inclui o assistente</span>
                <h2>A configuração ainda precisa ser concluída</h2>
                <p>
                  O responsável pelo sistema precisa habilitar o serviço de IA.
                  Suas metas, análises e exportações continuam funcionando
                  normalmente.
                </p>
                <Link className="secondary-button" href="/fluxo-caixa">
                  Abrir análise financeira
                </Link>
              </section>
              <aside
                className="ia-next-steps"
                aria-label="Ferramentas disponíveis"
              >
                <Link className="quick-action" href="/metas">
                  <Icone nome="meta" />
                  <strong>Organize seus objetivos</strong>
                  <span>Defina metas e registre seu progresso.</span>
                </Link>
                <Link className="quick-action" href="/fluxo-caixa">
                  <Icone nome="fluxo" />
                  <strong>Leia seus resultados</strong>
                  <span>Compare períodos e entenda os gastos.</span>
                </Link>
              </aside>
            </div>
          ) : configurada ? (
            <div className="product-two-columns">
              <section className="panel ia-workbench">
                <div className="ia-intro">
                  <span className="ia-symbol">
                    <Icone nome="ia" />
                  </span>
                  <div>
                    <h2>Qual decisão você quer entender?</h2>
                    <p>Uma pergunta clara é um bom ponto de partida.</p>
                  </div>
                </div>
                <form
                  onSubmit={perguntar}
                  className="ia-question-form"
                  aria-busy={ocupado}
                >
                  <label className="field">
                    <span>Sua pergunta</span>
                    <textarea
                      ref={campoPergunta}
                      aria-label="Sua pergunta"
                      rows={6}
                      maxLength={3000}
                      required
                      value={pergunta}
                      onChange={(e) => setPergunta(e.target.value)}
                      placeholder="Explique sua situação e os números que já conhece."
                    />
                  </label>
                  <label className="checkout-consent">
                    <input
                      type="checkbox"
                      checked={resumo}
                      onChange={(e) => setResumo(e.target.checked)}
                    />
                    Autorizar o envio do resumo deste mês, sem dados de
                    clientes.
                  </label>
                  <p className="subtitle">
                    Sua pergunta será enviada ao serviço de IA. Não inclua
                    senhas, códigos ou informações confidenciais.
                  </p>
                  <div className="product-form-actions">
                    <button
                      className="primary-button"
                      disabled={ocupado || !pergunta.trim()}
                      aria-busy={ocupado}
                    >
                      {ocupado ? "Pensando…" : "Perguntar ao assistente"}
                    </button>
                  </div>
                </form>
                {ocupado ? (
                  <div className="ia-thinking" role="status">
                    <p>Preparando uma orientação…</p>
                    <div className="skeleton" aria-hidden="true" />
                    <div className="skeleton" aria-hidden="true" />
                    <div className="skeleton" aria-hidden="true" />
                  </div>
                ) : resposta ? (
                  <section className="ia-answer">
                    <h3>Uma orientação para você</h3>
                    <div role="status">{resposta}</div>
                    <p className="subtitle">
                      Confira as premissas antes de tomar uma decisão. O
                      assistente pode cometer erros.
                    </p>
                  </section>
                ) : null}
              </section>
              <aside className="panel ia-examples">
                <h2>Por onde começar</h2>
                <p className="subtitle">
                  Escolha uma pergunta e ajuste à sua situação.
                </p>
                {exemplos.map((exemplo) => (
                  <button
                    className="quick-action"
                    key={exemplo}
                    onClick={() => {
                      setPergunta(exemplo);
                      campoPergunta.current?.focus();
                    }}
                  >
                    {exemplo}
                  </button>
                ))}
              </aside>
            </div>
          ) : null}
        </>
      )}
    </WorkspaceShell>
  );
}
