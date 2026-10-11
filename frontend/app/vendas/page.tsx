"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { formatarMoeda } from "../../lib/produtos";
import { carregarVendas, nomeFormaPagamento, Venda } from "../../lib/vendas";

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarVendas()
      .then(setVendas)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar as vendas."))
      .finally(() => setCarregando(false));
  }, []);

  const resumo = useMemo(() => {
    const faturamento = vendas.reduce((total, venda) => total + venda.totalVenda, 0);
    const custo = vendas.reduce((total, venda) => total + venda.custoTotal, 0);
    const lucro = vendas.reduce((total, venda) => total + venda.lucroTotal, 0);
    return { faturamento, custo, lucro };
  }, [vendas]);

  return (
    <main className="app-shell">
      <Sidebar ativo="vendas" />
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Comercial</p>
            <h1>Vendas</h1>
            <p className="subtitle">Registre vendas e acompanhe faturamento, custo e lucro realizados.</p>
          </div>
          <Link className="primary-button" href="/vendas/nova">+ Nova venda</Link>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        <section className="summary-grid">
          <article className="summary-card"><span>Vendas registradas</span><strong>{carregando ? "—" : vendas.length}</strong><small>Total de vendas no histórico</small></article>
          <article className="summary-card"><span>Faturamento</span><strong>{carregando ? "—" : formatarMoeda(resumo.faturamento)}</strong><small>Soma do valor vendido</small></article>
          <article className="summary-card"><span>Custo das vendas</span><strong>{carregando ? "—" : formatarMoeda(resumo.custo)}</strong><small>Custo histórico dos produtos vendidos</small></article>
          <article className="summary-card"><span>Lucro estimado</span><strong>{carregando ? "—" : formatarMoeda(resumo.lucro)}</strong><small>Faturamento menos custo</small></article>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div><p className="eyebrow">Histórico</p><h2>Vendas registradas</h2></div>
          </div>

          {carregando ? (
            <div className="empty-state"><strong>Carregando vendas...</strong></div>
          ) : vendas.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">V</span><strong>Nenhuma venda registrada</strong><p>Cadastre a primeira venda para começar a alimentar o financeiro.</p></div>
          ) : (
            <div className="ingredient-detail-list">
              <div className="ingredient-detail-head" aria-hidden="true"><span>Venda</span><span>Pagamento</span><span>Itens</span><span>Resultado</span></div>
              {vendas.map((venda) => (
                <div className="ingredient-detail-row" key={venda.id}>
                  <div><strong>Venda #{venda.id}</strong><small>{new Date(venda.criadoEm).toLocaleString("pt-BR")}</small></div>
                  <div data-label="Pagamento">{nomeFormaPagamento(venda.formaPagamento)}</div>
                  <div data-label="Itens">{venda.itens.reduce((total, item) => total + item.quantidade, 0)} item(ns)</div>
                  <div data-label="Resultado"><strong>{formatarMoeda(venda.totalVenda)}</strong><small> lucro {formatarMoeda(venda.lucroTotal)}</small></div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
