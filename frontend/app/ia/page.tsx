"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { perguntarAoNexoIa } from "../../lib/ia";
import { carregarConfiguracaoSaas, planoPermite, PlanoNexo } from "../../lib/saas";

const exemplos = [
  "Tenho custo de R$ 18 por produto e quero margem de 35%. Por quanto devo vender?",
  "Meu aluguel é R$ 2.500 e meus outros custos fixos são R$ 1.800. Quanto preciso faturar para cobrir isso?",
  "Quero contratar alguém por R$ 2.000 por mês. Quais custos eu deveria levantar antes de decidir?",
  "Me ajude a montar uma lista de dados para estimar meu gasto mensal de energia.",
];

export default function IaPage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [carregandoPlano, setCarregandoPlano] = useState(true);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarConfiguracaoSaas()
      .then((dados) => setPlano(dados.plano))
      .catch(() => setPlano("free"))
      .finally(() => setCarregandoPlano(false));
  }, []);

  const liberado = planoPermite(plano, "pro");

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (!pergunta.trim() || enviando) return;

    setErro("");
    setResposta("");
    setEnviando(true);
    try {
      const dados = await perguntarAoNexoIa(pergunta.trim());
      setResposta(dados.resposta);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível consultar a IA.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="saas-shell nexo-ia-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Inteligência operacional</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      {!carregandoPlano && !liberado ? (
        <section className="premium-lock-card">
          <span className="premium-lock-icon">✦</span>
          <p className="eyebrow">Recurso Pro</p>
          <h1>Nexo IA</h1>
          <p>Uma ajudante operacional para cálculos, planejamento, custos e decisões do dia a dia.</p>
          <Link className="primary-button" href="/planos">Conhecer o Pro</Link>
        </section>
      ) : liberado ? (
        <>
          <section className="ia-heading">
            <div>
              <p className="eyebrow">Plano Pro · Beta</p>
              <h1>Nexo IA</h1>
              <p>Use a inteligência como apoio para cálculos e decisões. Quando faltar algum dado, ela vai pedir exatamente o que precisa.</p>
            </div>
            <span className="ia-status"><i /> Gemini conectado</span>
          </section>

          <section className="ia-grid">
            <article className="ia-main-card">
              <div className="ia-card-heading">
                <div><span className="ia-spark">✦</span><div><strong>Como posso ajudar?</strong><small>Explique o cálculo ou a decisão que você quer montar.</small></div></div>
              </div>

              <form onSubmit={enviar} className="ia-form">
                <textarea
                  value={pergunta}
                  onChange={(event) => setPergunta(event.target.value)}
                  placeholder="Ex.: meu produto custa R$ 22 e eu quero ter margem de 30%. Qual seria um preço de venda inicial?"
                  maxLength={3000}
                  rows={6}
                />
                <div className="ia-form-footer">
                  <small>{pergunta.length}/3000</small>
                  <button className="primary-button" type="submit" disabled={enviando || !pergunta.trim()}>{enviando ? "Calculando..." : "Pedir ajuda"}</button>
                </div>
              </form>

              {erro ? <p className="form-error-banner">{erro}</p> : null}

              {resposta ? (
                <div className="ia-response">
                  <div className="ia-response-title"><span className="ia-spark">✦</span><strong>Nexo IA</strong></div>
                  <p>{resposta}</p>
                </div>
              ) : null}
            </article>

            <aside className="ia-side-card">
              <p className="eyebrow">Experimente</p>
              <h2>Ideias de uso</h2>
              <div className="ia-example-list">
                {exemplos.map((exemplo) => (
                  <button key={exemplo} type="button" onClick={() => setPergunta(exemplo)}>{exemplo}<span>→</span></button>
                ))}
              </div>
              <div className="ia-beta-note">
                <strong>Primeira versão</strong>
                <p>A IA já calcula e orienta. Busca automática de tarifas, energia e outros dados externos será adicionada separadamente para manter o uso gratuito e controlado.</p>
              </div>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}
