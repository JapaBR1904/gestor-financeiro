"use client";
import { useMoeda } from "../../components/PreferenciasProvider";
import { Icone } from "../../components/Icone";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";

import { carregarDespesas, Despesa, nomeFormaPagamentoDespesa } from "../../lib/despesas";

export default function DespesasPage() {
  const formatarMoeda = useMoeda();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [revisao, setRevisao] = useState(0);

  useEffect(() => {
    let ativo = true;
    queueMicrotask(() => {
      if (!ativo) return;
      setCarregando(true); setErro("");
      carregarDespesas().then(dados => { if (ativo) setDespesas(dados); })
        .catch(error => { if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar as despesas."); })
        .finally(() => { if (ativo) setCarregando(false); });
    });
    return () => { ativo = false; };
  }, [revisao]);

  const total = useMemo(() => despesas.reduce((soma, despesa) => soma + despesa.valor, 0), [despesas]);

  return (
    <main className="app-shell">
      <Sidebar ativo="despesas" />
      <section className="content" id="conteudo" tabIndex={-1}>
        <header className="topbar">
          <div>
            <p className="eyebrow">Financeiro</p>
            <h1>Despesas</h1>
            <p className="subtitle">Registre e acompanhe as saídas de dinheiro do negócio.</p>
          </div>
          <Link className="primary-button" href="/despesas/nova">+ Nova despesa</Link>
        </header>

        <p className="permission-note">Todo o histórico de despesas comerciais deste espaço.</p>
        {erro ? <p className="form-error-banner" role="alert">{erro} <button className="text-button" onClick={() => setRevisao(r => r+1)}>Tentar novamente</button></p> : null}

        <section className="summary-grid">
          <article className="summary-card"><span>Despesas registradas</span><strong>{carregando || erro ? "—" : despesas.length}</strong><small>Total de lançamentos</small></article>
          <article className="summary-card"><span>Total gasto</span><strong>{carregando || erro ? "—" : formatarMoeda(total)}</strong><small>Soma das despesas registradas</small></article>
        </section>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">Histórico</p><h2>Despesas registradas</h2><p className="subtitle">Consulte cada lançamento e abra os detalhes quando precisar.</p></div></div>
          {carregando ? <div className="empty-state" role="status"><strong>Carregando despesas...</strong></div> : erro ? <p className="empty-state">O histórico não pôde ser carregado. Tente novamente.</p> : despesas.length === 0 ? (
            <div className="empty-state"><span className="empty-icon"><Icone nome="despesa" /></span><strong>Nenhuma despesa registrada</strong><p>Cadastre a primeira despesa para começar a acompanhar as saídas.</p></div>
          ) : (
            <div className="sales-history-list">
              <div className="sales-history-head" aria-hidden="true"><span>Despesa</span><span>Data</span><span>Categoria</span><span>Forma de pagamento</span><span>Valor</span><span></span></div>
              {despesas.map((despesa) => (
                <div className="sales-history-row" key={despesa.id}>
                  <div data-label="Despesa"><strong>{despesa.descricao}</strong></div>
                  <div data-label="Data"><strong>{new Date(`${despesa.dataDespesa}T00:00:00`).toLocaleDateString("pt-BR")}</strong></div>
                  <div data-label="Categoria"><strong>{despesa.categoria}</strong></div>
                  <div data-label="Forma de pagamento"><strong>{nomeFormaPagamentoDespesa(despesa.formaPagamento)}</strong></div>
                  <div className="sales-history-total" data-label="Valor"><strong>{formatarMoeda(despesa.valor)}</strong></div>
                  <div className="sales-history-action"><Link className="secondary-button compact-button" href={`/despesas/${despesa.id}`}>Ver detalhes</Link></div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
