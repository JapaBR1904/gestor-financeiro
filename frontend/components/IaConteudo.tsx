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
  const [tentativa, setTentativa] = useState(0);
  const [perguntaRespondida, setPerguntaRespondida] = useState("");
  const [resumoEnviado, setResumoEnviado] = useState(false);
  const [feedback, setFeedback] = useState("");
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
  }, [pro, tentativa]);
  async function perguntar(e: FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    setResposta("");
    setFeedback("");
    try {
      const dados = await perguntarAoNexoIa(pergunta, resumo);
      setResposta(dados.resposta);
      setPerguntaRespondida(pergunta);
      setResumoEnviado(resumo);
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
    <WorkspaceShell titulo="Assistente financeiro" descricao="Pergunte sobre custos, margem ou planejamento. Você decide o que compartilhar.">
      {!config ? <p role="status">Carregando seu plano…</p> : !pro ? <BloqueioPlano plano="Pro" titulo="Entenda seus próximos passos" descricao="Converse sobre margem, custos e planejamento. Resumos financeiros só são compartilhados com sua autorização." /> : <>
        {erro ? <p className="form-error-banner" role="alert">{erro}{configurada === null ? <button className="text-button" onClick={() => { setErro(""); setTentativa(t => t+1); }}>Tentar novamente</button> : null}</p> : null}
        {configurada === null && !erro ? <p role="status">Verificando disponibilidade…</p> : configurada === false ? <section className="panel ia-unavailable">
          <h2>A configuração ainda precisa ser concluída</h2>
          <p>Seu plano inclui o assistente. O responsável pelo sistema precisa habilitar o serviço; análises e metas continuam disponíveis.</p>
          <Link className="secondary-button" href="/fluxo-caixa">Abrir análise financeira</Link>
        </section> : configurada ? <section className="panel ia-workbench">
          <div className="ia-intro"><Icone nome="ia" /><h2>Qual decisão você quer entender?</h2></div>
          <form onSubmit={perguntar} className="ia-question-form" aria-busy={ocupado}>
            <label className="field"><span>Sua pergunta</span><textarea ref={campoPergunta} aria-label="Sua pergunta" rows={4} maxLength={3000} required value={pergunta} onChange={e => setPergunta(e.target.value)} placeholder="Descreva a dúvida e o que você já conhece." /></label>
            <div className="ia-suggestions" aria-label="Sugestões de perguntas">{exemplos.map(exemplo => <button className="text-button" key={exemplo} type="button" onClick={() => { setPergunta(exemplo); campoPergunta.current?.focus(); }}>{exemplo}</button>)}</div>
            <label className="checkout-consent"><input type="checkbox" checked={resumo} onChange={e => setResumo(e.target.checked)} />Autorizar o envio do resumo deste mês, sem dados de clientes.</label>
            <p className="subtitle">A pergunta será enviada ao serviço de IA. Não inclua senhas, códigos ou informações confidenciais.</p>
            <div className="product-form-actions"><button className="primary-button" disabled={ocupado || !pergunta.trim()} aria-busy={ocupado}>{ocupado ? "Pensando…" : "Perguntar ao assistente"}</button></div>
          </form>
          {ocupado ? <div className="ia-thinking" role="status"><p>Preparando uma orientação…</p><div className="skeleton" aria-hidden="true" /></div> : resposta ? <section className="ia-answer">
            <h3>Uma orientação para você</h3><p className="ia-answer-context">Pergunta: {perguntaRespondida}<br />{resumoEnviado ? "Contexto: resumo deste mês autorizado por você." : "Contexto: somente sua pergunta; resumo financeiro não enviado."}</p>
            <div role="status">{resposta}</div><p className="subtitle">Confira as premissas antes de decidir. O assistente pode cometer erros.</p>
            <div className="ia-answer-actions"><button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(resposta); setFeedback("Resposta copiada."); } catch { setFeedback("Não foi possível copiar. Selecione o texto da resposta."); } }}>Copiar resposta</button><button className="text-button" onClick={() => { setResposta(""); setPergunta(""); setFeedback(""); campoPergunta.current?.focus(); }}>Nova pergunta</button></div>
            {feedback ? <p role="status">{feedback}</p> : null}
          </section> : null}
        </section> : null}
      </>}
    </WorkspaceShell>
  );
}
