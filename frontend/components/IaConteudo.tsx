"use client";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
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
            <p role="status">Verificando disponibilidade…</p>
          ) : configurada === false ? (
            <section className="product-lock">
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
          ) : configurada ? (
            <div className="product-two-columns">
              <section className="panel">
                <h2>Qual decisão você quer entender?</h2>
                <form onSubmit={perguntar} style={{ marginTop: 18 }}>
                  <label className="field">
                    <span>Sua pergunta</span>
                    <textarea
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
                    >
                      {ocupado ? "Pensando…" : "Perguntar ao assistente"}
                    </button>
                  </div>
                </form>
                {resposta ? (
                  <section style={{ marginTop: 25 }}>
                    <h3>Uma orientação para você</h3>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.8,
                        fontSize: 13,
                        marginTop: 12,
                      }}
                      role="status"
                    >
                      {resposta}
                    </div>
                    <p className="subtitle">
                      Confira as premissas antes de tomar uma decisão. O
                      assistente pode cometer erros.
                    </p>
                  </section>
                ) : null}
              </section>
              <section className="panel">
                <h2>Por onde começar</h2>
                {exemplos.map((exemplo) => (
                  <button
                    className="quick-action"
                    key={exemplo}
                    onClick={() => setPergunta(exemplo)}
                    style={{ marginTop: 12, textAlign: "left", width: "100%" }}
                  >
                    {exemplo}
                  </button>
                ))}
              </section>
            </div>
          ) : null}
        </>
      )}
    </WorkspaceShell>
  );
}
