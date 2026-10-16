"use client";
import { useMoeda } from "../../components/PreferenciasProvider";
import { Icone } from "../../components/Icone";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";

import { carregarVendas, nomeFormaPagamento, Venda } from "../../lib/vendas";

export default function VendasPage() {
  const formatarMoeda = useMoeda();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [revisao, setRevisao] = useState(0);

  useEffect(() => {
    let ativo = true;
    queueMicrotask(() => {
      if (!ativo) return;
      setCarregando(true); setErro("");
      carregarVendas().then(dados => { if (ativo) setVendas(dados); })
        .catch(error => { if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar as vendas."); })
        .finally(() => { if (ativo) setCarregando(false); });
    });
    return () => { ativo = false; };
  }, [revisao]);

  const resumo = useMemo(() => {
    const faturamento = vendas.reduce((total, venda) => total + venda.totalVenda, 0);
    const custo = vendas.some(venda => venda.custoTotal === null) ? null : vendas.reduce((total, venda) => total + (venda.custoTotal ?? 0), 0);
    const itensVendidos = vendas.reduce((total, venda) => total + venda.itens.reduce((subtotal, item) => subtotal + item.quantidade, 0), 0);
    return { faturamento, custo, itensVendidos };
  }, [vendas]);

  return (
    <main className="app-shell">
      <Sidebar ativo="vendas" />
      <section className="content" id="conteudo" tabIndex={-1}>
        <header className="topbar">
          <div><p className="eyebrow">Comercial</p><h1>Vendas</h1><p className="subtitle">Registre vendas e acompanhe os principais dados comerciais do negócio.</p></div>
          <Link className="primary-button" href="/vendas/nova">+ Nova venda</Link>
        </header>

        <p className="permission-note">Todo o histórico de vendas deste espaço. A forma de pagamento registrada não comprova recebimento.</p>
        {erro ? <p className="form-error-banner" role="alert">{erro} <button className="text-button" onClick={() => setRevisao(r => r+1)}>Tentar novamente</button></p> : null}

        <section className="summary-grid" aria-label="Resumo das vendas">
          <article className="summary-card"><span>Vendas registradas</span><strong>{carregando || erro ? "—" : vendas.length}</strong><small>{carregando ? "Carregando histórico..." : erro ? "Histórico indisponível" : `${resumo.itensVendidos} item(ns) vendido(s) no total`}</small></article>
          <article className="summary-card"><span>Faturamento</span><strong>{carregando || erro ? "—" : formatarMoeda(resumo.faturamento)}</strong><small>Valor das vendas registradas</small></article>
          <article className="summary-card"><span>Custo das vendas</span><strong>{carregando || erro ? "—" : formatarMoeda(resumo.custo)}</strong><small>Custo histórico dos produtos vendidos</small></article>
        </section>

        <article className="panel history-panel">
          <div className="panel-header"><div><p className="eyebrow">Histórico</p><h2>Vendas registradas</h2><p className="subtitle">Veja valor, pagamento e quantidade vendida sem precisar abrir cada registro.</p></div></div>

          {carregando ? <div className="empty-state" role="status"><strong>Carregando vendas...</strong></div> : erro ? <p className="empty-state">O histórico não pôde ser carregado. Tente novamente.</p> : vendas.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">V</span><strong>Nenhuma venda registrada</strong><p>Cadastre a primeira venda para começar a alimentar o financeiro.</p></div>
          ) : (
            <div className="record-list sale-record-list">
              {vendas.map((venda) => {
                const quantidadeItens = venda.itens.reduce((total, item) => total + item.quantidade, 0);
                const dataVenda = new Date(venda.criadoEm);
                return (
                  <article className="record-card sale-record-card" key={venda.id}>
                    <span className="record-icon record-icon-sale"><Icone nome="venda" /></span>
                    <div className="record-main">
                      <strong>Venda #{venda.id}</strong>
                      <span>{dataVenda.toLocaleDateString("pt-BR")} · {quantidadeItens} item{quantidadeItens === 1 ? "" : "s"}</span>
                    </div>
                    <span className="record-badge">{nomeFormaPagamento(venda.formaPagamento)}</span>
                    <div className="record-value"><strong>{formatarMoeda(venda.totalVenda)}</strong><span>Total da venda</span></div>
                    <div className="record-action-zone">
                      <Link className="record-details-button" href={`/vendas/${venda.id}`}>Ver detalhes <span aria-hidden="true">→</span></Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
