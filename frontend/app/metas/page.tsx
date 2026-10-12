"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { arquivarMeta, atualizarProgressoMeta, criarMeta, listarMetas, Meta, UnidadeMeta } from "../../lib/metas";
import { carregarConfiguracaoSaas, planoPermite, PlanoNexo } from "../../lib/saas";

function formatarValor(meta: Meta, valor: number) {
  if (meta.unidade === "moeda") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  }
  if (meta.unidade === "percentual") return `${valor.toLocaleString("pt-BR")}%`;
  return valor.toLocaleString("pt-BR");
}

export default function MetasPage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [carregandoPlano, setCarregandoPlano] = useState(true);
  const [carregandoMetas, setCarregandoMetas] = useState(false);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [erro, setErro] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [unidade, setUnidade] = useState<UnidadeMeta>("moeda");
  const [valorMeta, setValorMeta] = useState("");
  const [valorAtual, setValorAtual] = useState("0");
  const [prazo, setPrazo] = useState("");
  const [edicoes, setEdicoes] = useState<Record<number, string>>({});

  const liberado = planoPermite(plano, "pro");

  useEffect(() => {
    carregarConfiguracaoSaas()
      .then(async (dados) => {
        setPlano(dados.plano);
        if (planoPermite(dados.plano, "pro")) {
          setCarregandoMetas(true);
          try {
            setMetas(await listarMetas());
          } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível carregar as metas.");
          } finally {
            setCarregandoMetas(false);
          }
        }
      })
      .catch(() => setPlano("free"))
      .finally(() => setCarregandoPlano(false));
  }, []);

  const resumo = useMemo(() => {
    const concluidas = metas.filter((meta) => meta.status === "concluida").length;
    const ativas = metas.filter((meta) => meta.status === "ativa").length;
    return { concluidas, ativas, total: metas.length };
  }, [metas]);

  async function handleCriarMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const metaNumero = Number(valorMeta.replace(",", "."));
    const atualNumero = Number(valorAtual.replace(",", "."));
    if (!titulo.trim()) return setErro("Informe o título da meta.");
    if (!Number.isFinite(metaNumero) || metaNumero <= 0) return setErro("Informe um valor de meta maior que zero.");
    if (!Number.isFinite(atualNumero) || atualNumero < 0) return setErro("O valor atual não pode ser negativo.");

    setSalvando(true);
    try {
      const criada = await criarMeta({ titulo, unidade, valorMeta: metaNumero, valorAtual: atualNumero, prazo });
      setMetas((atuais) => [criada, ...atuais]);
      setTitulo("");
      setValorMeta("");
      setValorAtual("0");
      setPrazo("");
      setMostrarFormulario(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar a meta.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizar(meta: Meta) {
    const texto = edicoes[meta.id] ?? String(meta.valorAtual);
    const valor = Number(texto.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) return setErro("Informe um progresso válido.");

    setErro("");
    try {
      const atualizada = await atualizarProgressoMeta(meta.id, valor);
      setMetas((atuais) => atuais.map((item) => item.id === meta.id ? atualizada : item));
      setEdicoes((atuais) => ({ ...atuais, [meta.id]: String(atualizada.valorAtual) }));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a meta.");
    }
  }

  async function arquivar(metaId: number) {
    setErro("");
    try {
      await arquivarMeta(metaId);
      setMetas((atuais) => atuais.filter((meta) => meta.id !== metaId));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível arquivar a meta.");
    }
  }

  return (
    <main className="saas-shell premium-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Metas e crescimento</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      {!carregandoPlano && !liberado ? (
        <section className="premium-lock-card"><span className="premium-lock-icon">◇</span><p className="eyebrow">Recurso Pro</p><h1>Metas e comparativos</h1><p>Defina objetivos financeiros e comerciais e acompanhe a evolução ao longo do mês.</p><Link className="primary-button" href="/planos">Ver planos</Link></section>
      ) : liberado ? (
        <>
          <section className="premium-heading pro-heading-row">
            <div><p className="eyebrow">Plano Pro</p><h1>Metas e comparativos</h1><p>Crie metas reais, acompanhe o progresso e marque automaticamente quando atingir o objetivo.</p></div>
            <button className="primary-button" type="button" onClick={() => setMostrarFormulario((valor) => !valor)}>{mostrarFormulario ? "Fechar" : "+ Nova meta"}</button>
          </section>

          <section className="pro-summary-grid">
            <article><span>Metas ativas</span><strong>{resumo.ativas}</strong><small>em andamento</small></article>
            <article><span>Concluídas</span><strong>{resumo.concluidas}</strong><small>objetivos alcançados</small></article>
            <article><span>Total</span><strong>{resumo.total}</strong><small>metas visíveis</small></article>
          </section>

          {mostrarFormulario ? (
            <section className="pro-form-card">
              <div><p className="eyebrow">Nova meta</p><h2>Defina um objetivo</h2><p>Você pode usar dinheiro, percentual ou quantidade.</p></div>
              <form className="pro-form-grid" onSubmit={handleCriarMeta}>
                <label><span>Título</span><input value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ex.: Faturar R$ 15.000" /></label>
                <label><span>Unidade</span><select value={unidade} onChange={(event) => setUnidade(event.target.value as UnidadeMeta)}><option value="moeda">Dinheiro (R$)</option><option value="percentual">Percentual (%)</option><option value="quantidade">Quantidade</option></select></label>
                <label><span>Valor da meta</span><input inputMode="decimal" value={valorMeta} onChange={(event) => setValorMeta(event.target.value)} placeholder="15000" /></label>
                <label><span>Valor atual</span><input inputMode="decimal" value={valorAtual} onChange={(event) => setValorAtual(event.target.value)} placeholder="0" /></label>
                <label><span>Prazo</span><input type="date" value={prazo} onChange={(event) => setPrazo(event.target.value)} /></label>
                <div className="pro-form-actions"><button className="primary-button" type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Criar meta"}</button></div>
              </form>
            </section>
          ) : null}

          {erro ? <p className="form-error-banner pro-error">{erro}</p> : null}

          <section className="pro-goals-list">
            {carregandoMetas ? <div className="pro-empty-card">Carregando metas...</div> : null}
            {!carregandoMetas && metas.length === 0 ? <div className="pro-empty-card"><strong>Nenhuma meta criada ainda.</strong><span>Crie sua primeira meta para começar a acompanhar a evolução.</span></div> : null}
            {metas.map((meta) => {
              const progresso = Math.max(0, Math.min(100, (meta.valorAtual / meta.valorMeta) * 100));
              return (
                <article className={`pro-goal-card${meta.status === "concluida" ? " completed" : ""}`} key={meta.id}>
                  <div className="pro-goal-top"><div><span className="pro-goal-status">{meta.status === "concluida" ? "Concluída" : "Em andamento"}</span><h2>{meta.titulo}</h2><p>{formatarValor(meta, meta.valorAtual)} de {formatarValor(meta, meta.valorMeta)}{meta.prazo ? ` · prazo ${new Date(`${meta.prazo}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p></div><strong className="pro-goal-percent">{Math.round(progresso)}%</strong></div>
                  <div className="premium-progress pro-goal-progress"><span style={{ width: `${progresso}%` }} /></div>
                  <div className="pro-goal-actions"><label><span>Atualizar progresso</span><input inputMode="decimal" value={edicoes[meta.id] ?? String(meta.valorAtual)} onChange={(event) => setEdicoes((atuais) => ({ ...atuais, [meta.id]: event.target.value }))} /></label><button className="secondary-button compact-button" type="button" onClick={() => atualizar(meta)}>Salvar progresso</button><button className="pro-archive-button" type="button" onClick={() => arquivar(meta.id)}>Arquivar</button></div>
                </article>
              );
            })}
          </section>
        </>
      ) : null}
    </main>
  );
}
