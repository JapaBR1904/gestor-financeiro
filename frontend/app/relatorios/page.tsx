"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { formatarMoeda } from "../../lib/produtos";
import { carregarRelatorioResumo, RelatorioResumo } from "../../lib/relatorios";
import { nomeFormaPagamento } from "../../lib/vendas";

export default function RelatoriosPage() {
  const [relatorio, setRelatorio] = useState<RelatorioResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarRelatorioResumo()
      .then(setRelatorio)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar os relatórios."))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <main className="app-shell">
      <Sidebar ativo="relatorios" />
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Análise</p>
            <h1>Relatórios</h1>
            <p className="subtitle">Visão geral dos dados já registrados no Nexo.</p>
          </div>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        {carregando ? (
          <article className="panel"><div className="empty-state"><strong>Carregando relatórios...</strong></div></article>
        ) : !relatorio ? (
          <article className="panel"><div className="empty-state"><strong>Não foi possível gerar o relatório.</strong></div></article>
        ) : (
          <div className="product-form-stack">
            <section className="summary-grid">
              <article className="summary-card"><span>Faturamento</span><strong>{formatarMoeda(relatorio.faturamento)}</strong><small>{relatorio.quantidadeVendas} venda(s) registrada(s)</small></article>
              <article className="summary-card"><span>Despesas registradas</span><strong>{formatarMoeda(relatorio.totalDespesas)}</strong><small>{relatorio.quantidadeDespesas} lançamento(s)</small></article>
              <article className="summary-card"><span>Saldo financeiro</span><strong>{formatarMoeda(relatorio.saldoFinanceiro)}</strong><small>Faturamento menos despesas registradas</small></article>
              <article className="summary-card"><span>Lucro bruto das vendas</span><strong>{formatarMoeda(relatorio.lucroBruto)}</strong><small>Faturamento menos custo dos produtos vendidos</small></article>
            </section>

            <article className="panel">
              <div className="panel-header"><div><p className="eyebrow">Produtos</p><h2>Mais vendidos</h2><p className="subtitle">Ranking por quantidade de unidades vendidas.</p></div></div>
              {relatorio.produtosMaisVendidos.length === 0 ? <div className="empty-state compact-empty-state"><strong>Ainda não há vendas para analisar.</strong></div> : (
                <div className="dashboard-product-list">
                  {relatorio.produtosMaisVendidos.map((produto, indice) => (
                    <div className="dashboard-product-row" key={produto.nome}>
                      <div><strong>{indice + 1}. {produto.nome}</strong><small>{produto.quantidadeVendida} unidade(s) vendida(s)</small></div>
                      <div><strong>{formatarMoeda(produto.faturamento)}</strong><small>Faturamento</small></div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-header"><div><p className="eyebrow">Recebimentos</p><h2>Vendas por forma de pagamento</h2></div></div>
              {relatorio.formasPagamento.length === 0 ? <div className="empty-state compact-empty-state"><strong>Nenhuma venda registrada.</strong></div> : (
                <div className="dashboard-product-list">
                  {relatorio.formasPagamento.map((item) => (
                    <div className="dashboard-product-row" key={item.formaPagamento}>
                      <div><strong>{nomeFormaPagamento(item.formaPagamento as any)}</strong></div>
                      <div><strong>{formatarMoeda(item.total)}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-header"><div><p className="eyebrow">Despesas</p><h2>Gastos por categoria</h2></div></div>
              {relatorio.despesasPorCategoria.length === 0 ? <div className="empty-state compact-empty-state"><strong>Nenhuma despesa registrada.</strong></div> : (
                <div className="dashboard-product-list">
                  {relatorio.despesasPorCategoria.map((item) => (
                    <div className="dashboard-product-row" key={item.categoria}>
                      <div><strong>{item.categoria}</strong></div>
                      <div><strong>{formatarMoeda(item.total)}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-header"><div><p className="eyebrow">Clientes</p><h2>Clientes com maior volume de compras</h2></div></div>
              {relatorio.melhoresClientes.length === 0 ? <div className="empty-state compact-empty-state"><strong>Ainda não há vendas vinculadas a clientes.</strong></div> : (
                <div className="dashboard-product-list">
                  {relatorio.melhoresClientes.map((cliente, indice) => (
                    <div className="dashboard-product-row" key={cliente.nome}>
                      <div><strong>{indice + 1}. {cliente.nome}</strong><small>{cliente.quantidadeVendas} compra(s)</small></div>
                      <div><strong>{formatarMoeda(cliente.totalComprado)}</strong><small>Total comprado</small></div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        )}
      </section>
    </main>
  );
}
