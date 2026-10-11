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
    const itensVendidos = vendas.reduce(
      (total, venda) => total + venda.itens.reduce((subtotal, item) => subtotal + item.quantidade, 0),
      0,
    );

    return { faturamento, custo, itensVendidos };
  }, [vendas]);

  return (
    <main className="app-shell">
      <Sidebar ativo="vendas" />
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Comercial</p>
            <h1>Vendas</h1>
            <p className="subtitle">Registre vendas e acompanhe os principais dados comerciais do negócio.</p>
          </div>
          <Link className="primary-button" href="/vendas/nova">+ Nova venda</Link>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        <section className="summary-grid" aria-label="Resumo das vendas">
          <article className="summary-card">
            <span>Vendas registradas</span>
            <strong>{carregando ? "—" : vendas.length}</strong>
            <small>{carregando ? "Carregando histórico..." : `${resumo.itensVendidos} item(ns) vendido(s) no total`}</small>
          </article>

          <article className="summary-card">
            <span>Faturamento</span>
            <strong>{carregando ? "—" : formatarMoeda(resumo.faturamento)}</strong>
            <small>Valor total recebido nas vendas</small>
          </article>

          <article className="summary-card">
            <span>Custo das vendas</span>
            <strong>{carregando ? "—" : formatarMoeda(resumo.custo)}</strong>
            <small>Custo histórico dos produtos vendidos</small>
          </article>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Histórico</p>
              <h2>Vendas registradas</h2>
              <p className="subtitle">Clique em uma venda para ver os produtos e os detalhes do registro.</p>
            </div>
          </div>

          {carregando ? (
            <div className="empty-state"><strong>Carregando vendas...</strong></div>
          ) : vendas.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">V</span>
              <strong>Nenhuma venda registrada</strong>
              <p>Cadastre a primeira venda para começar a alimentar o financeiro.</p>
            </div>
          ) : (
            <div className="ingredient-detail-list">
              <div className="ingredient-detail-head" aria-hidden="true">
                <span>Venda e data</span>
                <span>Pagamento</span>
                <span>Itens</span>
                <span>Total</span>
              </div>

              {vendas.map((venda) => {
                const quantidadeItens = venda.itens.reduce((total, item) => total + item.quantidade, 0);
                const dataVenda = new Date(venda.criadoEm);

                return (
                  <Link className="ingredient-detail-row" href={`/vendas/${venda.id}`} key={venda.id}>
                    <div>
                      <strong>Venda #{venda.id}</strong>
                      <small>{dataVenda.toLocaleDateString("pt-BR")} às {dataVenda.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                    </div>
                    <div data-label="Pagamento">
                      <strong>{nomeFormaPagamento(venda.formaPagamento)}</strong>
                    </div>
                    <div data-label="Itens">
                      <strong>{quantidadeItens}</strong>
                      <small>{quantidadeItens === 1 ? "item vendido" : "itens vendidos"}</small>
                    </div>
                    <div data-label="Total">
                      <strong>{formatarMoeda(venda.totalVenda)}</strong>
                      <small>Ver detalhes</small>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
