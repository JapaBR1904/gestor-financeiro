"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../lib/workspace";
import { planoPermite } from "../lib/planos";
import { datasDoMes } from "../lib/financeiro";
import { perguntarAoNexoIa, statusIa, type AssuntoIa, type RespostaIa } from "../lib/ia";
import { contextoDaPagina } from "../lib/contexto-copiloto";
import { BloqueioPlano } from "./EstadoProduto";
import { Marca } from "./Marca";
import { usePreferencias } from "./PreferenciasProvider";

type Mensagem = { pergunta: string; dados: RespostaIa; base: string };
const atalhos: { texto: string; assunto: AssuntoIa }[] = [
  { texto: "Analisar meu mês", assunto: "resumo" }, { texto: "Entender despesas", assunto: "despesas" },
  { texto: "Revisar metas", assunto: "metas" }, { texto: "Comparar períodos", assunto: "comparativo" },
  { texto: "Analisar fluxo", assunto: "fluxo" }, { texto: "Resumir minhas finanças", assunto: "resumo" },
];
function sugestoes(assunto: AssuntoIa, perfil: string | null | undefined) {
  if (assunto === "fluxo") return ["Analise meu fluxo", "Existe algum período crítico?", "Explique esta tendência"];
  if (assunto === "metas") return ["Quais metas precisam de atenção?", "Como estou evoluindo?"];
  if (assunto === "despesas") return ["Onde estou gastando mais?", "O que aumentou?", "Compare categorias"];
  if (assunto === "relatorios") return ["Resuma este relatório", "Explique as principais mudanças"];
  if (assunto === "documentos") return ["Como escolher um documento para analisar?"];
  return perfil === "pessoal" ? ["Como está meu mês?", "Em que estou gastando mais?", "Minhas metas estão no caminho?"] : perfil === "empresa" ? ["O que mudou no período?", "Quais pontos merecem atenção?", "Resuma os principais números"] : ["Como estão minhas vendas?", "Qual despesa cresceu mais?", "Como está meu resultado?"];
}
function assuntoDaPergunta(texto: string, padrao: AssuntoIa): AssuntoIa {
  if (/compar|mudou|mudanças|aumentou|cresceu|caiu/i.test(texto)) return "comparativo";
  if (/meta|evoluindo|caminho/i.test(texto)) return "metas";
  if (/gast|despesa|categorias/i.test(texto)) return "despesas";
  return padrao;
}
export function ConversaIa({ pagina = "/ia", periodo, carregandoContexto = false, compacto = false }: { pagina?: string; periodo?: { inicio: string; fim: string }; carregandoContexto?: boolean; compacto?: boolean }) {
  const { config } = useWorkspace();
  const { ocultarValores, alterar } = usePreferencias();
  const pro = config && planoPermite(config.plano, "pro");
  const tela = contextoDaPagina(pagina) ?? contextoDaPagina("/ia")!;
  const [assunto, setAssunto] = useState<AssuntoIa>(tela.assunto);
  const [datas, setDatas] = useState(() => periodo ?? datasDoMes());
  const [configurada, setConfigurada] = useState<boolean | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [pergunta, setPergunta] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const envio = useRef<AbortController | null>(null);
  const datasAtuais = periodo ?? datas;
  const selecionaDatas = !compacto && !["metas", "relatorios", "documentos"].includes(assunto);
  const escopo = assunto === "metas" ? "Progresso atual das metas" : assunto === "relatorios" ? "Todo o histórico comercial" : assunto === "documentos" ? "Nenhum documento é enviado automaticamente" : `${datasAtuais.inicio} a ${datasAtuais.fim}`;
  useEffect(() => () => envio.current?.abort(), []);
  useEffect(() => {
    if (!pro) return;
    const abortar = new AbortController();
    statusIa(abortar.signal).then(dados => setConfigurada(dados.configurada)).catch(e => { if (!abortar.signal.aborted) setErro(e instanceof Error ? e.message : "Assistente temporariamente indisponível."); });
    return () => abortar.abort();
  }, [pro, tentativa]);
  function escolher(texto: string, novoAssunto: AssuntoIa) {
    setPergunta(texto); setAssunto(novoAssunto); setConsentimento(false); campo.current?.focus();
  }
  async function perguntar(event: FormEvent) {
    event.preventDefault();
    if (trava.current || !configurada || !pergunta.trim() || carregandoContexto) return;
    trava.current = true; setOcupado(true); setErro("");
    const controle = new AbortController(); envio.current = controle;
    const texto = pergunta.trim();
    try {
      const dados = await perguntarAoNexoIa(texto, consentimento, { pagina: tela.pagina, assunto, ...datasAtuais }, controle.signal);
      if (!controle.signal.aborted) {
        setMensagens(atuais => [...atuais.slice(-7), { pergunta: texto, dados, base: dados.contexto?.periodo ?? (consentimento ? escopo : "Somente sua pergunta; dados financeiros não enviados") }]);
        setPergunta("");
      }
    } catch (e) { if (!controle.signal.aborted) setErro(e instanceof Error ? e.message : "Assistente temporariamente indisponível."); }
    finally { if (!controle.signal.aborted) { trava.current = false; setOcupado(false); } }
  }
  if (!config) return <p role="status">Carregando seu plano…</p>;
  if (!pro) return <BloqueioPlano plano="Pro" titulo="A IA do Nexo pode analisar seus números" descricao="Entenda seu mês, suas despesas e suas metas com contexto. O Pro inclui IA básica; o Business também oferece o copiloto nas principais telas." />;
  return <div className={`nexo-conversation${compacto ? " compact" : ""}`}>
    <div className="copilot-context"><span>Contexto: <strong>{tela.titulo}</strong></span><small>{escopo}</small></div>
    {!compacto ? <div className="ia-action-grid" aria-label="Análises disponíveis">{atalhos.map(item => <button type="button" key={item.texto} disabled={ocupado} onClick={() => escolher(item.texto, item.assunto)}><span aria-hidden="true">↗</span>{item.texto}</button>)}</div> : null}
    {configurada === null && !erro ? <p role="status">Verificando disponibilidade…</p> : null}
    {configurada === false ? <section className="ia-unavailable"><h2>Assistente temporariamente indisponível.</h2><p>Seu plano inclui a IA. Tente novamente em instantes; suas análises continuam disponíveis.</p><button className="secondary-button" onClick={() => { setConfigurada(null); setErro(""); setTentativa(t => t+1); }}>Verificar novamente</button></section> : null}
    {mensagens.length ? <div className="ia-thread" aria-label="Conversa com o Nexo">{mensagens.map((mensagem, indice) => <div className="ia-exchange" key={indice}>
      <article className="ia-message question"><h3>Você</h3><p>{ocultarValores ? "Pergunta protegida pelo modo de privacidade." : mensagem.pergunta}</p></article>
      <article className="ia-message answer"><h3>Nexo</h3><small>Base: {mensagem.base}</small>{ocultarValores ? <p>Resposta protegida. <button className="text-button" onClick={() => alterar({ ocultarValores: false })}>Revelar valores para ler</button></p> : <div className="ia-response-text">{mensagem.dados.resposta}</div>}</article>
    </div>)}</div> : <div className="ia-welcome"><Marca /><h2>{compacto ? "O que vamos entender?" : "Seus números, com mais clareza"}</h2><p>Escolha uma sugestão e autorize somente os dados que quer analisar. O Nexo explica e sugere próximos passos; nenhuma alteração é feita nos seus registros.</p></div>}
    <div className="ia-context-suggestions" aria-label="Sugestões contextuais">{sugestoes(assunto, config.perfilUso).map(texto => <button className="secondary-button" key={texto} type="button" disabled={ocupado} onClick={() => escolher(texto, assuntoDaPergunta(texto, assunto))}>{texto}</button>)}</div>
    <form className="ia-question-form" onSubmit={perguntar} aria-busy={ocupado}>
      {selecionaDatas ? <div className="ia-period-fields"><label className="field"><span>De</span><input type="date" aria-label="Início da análise da IA" value={datas.inicio} required onChange={e => { setDatas({ ...datas, inicio: e.target.value }); setConsentimento(false); }} /></label><label className="field"><span>Até</span><input type="date" aria-label="Fim da análise da IA" value={datas.fim} required onChange={e => { setDatas({ ...datas, fim: e.target.value }); setConsentimento(false); }} /></label></div> : null}
      <label className="field"><span>Sua pergunta</span><textarea ref={campo} aria-label="Sua pergunta" rows={compacto ? 3 : 4} maxLength={3000} required value={pergunta} onChange={e => setPergunta(e.target.value)} placeholder="Pergunte sobre seus números…" disabled={ocupado} /></label>
      {assunto !== "documentos" ? <label className="checkout-consent"><input type="checkbox" checked={consentimento} disabled={ocupado || carregandoContexto} onChange={e => setConsentimento(e.target.checked)} />Autorizar dados deste contexto e período para análise pelo Gemini, sem dados de clientes.</label> : <p className="permission-note">Selecione um arquivo na área de Documentos para autorizar sua análise. Esta conversa não envia documentos.</p>}
      <p className="ia-data-note">{consentimento ? "Serão enviados somente agregados relevantes; nas metas, até oito títulos e seus progressos." : "Sem autorização, somente a pergunta e o contexto da tela serão enviados."}</p>
      {carregandoContexto ? <p role="status">Aguarde a atualização do período antes de analisar.</p> : null}
      <button className="primary-button" disabled={ocupado || !pergunta.trim() || !configurada || carregandoContexto}>{ocupado ? "Analisando…" : "Perguntar ao assistente"}</button>
    </form>
    {ocupado ? <div className="ia-thinking" role="status"><Marca /><span>Analisando seu contexto…</span><div className="skeleton" aria-hidden="true" /></div> : null}
    {erro ? <div className="form-error-banner" role="alert">{erro}{configurada === null ? <button className="text-button" onClick={() => { setErro(""); setTentativa(t => t+1); }}>Tentar novamente</button> : null}</div> : null}
  </div>;
}
