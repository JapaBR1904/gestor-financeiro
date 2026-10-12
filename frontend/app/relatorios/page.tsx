"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { formatarMoeda } from "../../lib/produtos";
import { carregarRelatorioResumo, RelatorioResumo } from "../../lib/relatorios";
import { nomeFormaPagamento } from "../../lib/vendas";

type Secao = "produtos" | "recebimentos" | "despesas" | "clientes";

export default function RelatoriosPage() {
  const [relatorio, setRelatorio] = useState<RelatorioResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [expandidas, setExpandidas] = useState<Record<Secao, boolean>>({ produtos: false, recebimentos: false, despesas: false, clientes: false });

  useEffect(() => {
    carregarRelatorioResumo()
      .then(setRelatorio)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar os relatórios."))
      .finally(() => setCarregando(false));
  }, []);

  const limites = useMemo(() => {
    if (!relatorio) return { produtos: 1, recebimentos: 1, despesas: 1, clientes: 1 };
    return {
      produtos: Math.max(1, ...relatorio.produtosMaisVendidos.map((item) => item.quantidadeVendida)),
      recebimentos: Math.max(1, ...relatorio.formasPagamento.map((item) => item.total)),
      despesas: Math.max(1, ...relatorio.despesasPorCategoria.map((item) => item.total)),
      clientes: Math.max(1, ...relatorio.melhoresClientes.map((item) => item.totalComprado)),
    };
  }, [relatorio]);

  function itensVisiveis<T>(itens: T[], secao: Secao) {
    return expandidas[secao] ? itens : itens.slice(0, 5);
  }

  function toggle(secao: Secao) {
    setExpandidas((atual) => ({ ...atual, [secao]: !atual[secao] }));
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="relatorios" />
      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Análise</p><h1>Relatórios</h1><p className="subtitle">Os principais números e rankings do Nexo, organizados para bater o olho e entender.</p></div>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        {carregando ? (
          <article className="panel"><div className="empty-state"><strong>Carregando relatórios...</strong></div></article>
        ) : !relatorio ? (
          <article className="panel"><div className="empty-state"><strong>Não foi possível gerar o relatório.</strong></div></article>
        ) : (
          <div className="report-page-stack">
            <section className="summary-grid report-summary-grid">
              <article className="summary-card"><span>Faturamento</span><strong>{formatarMoeda(relatorio.faturamento)}</strong><small>{relatorio.quantidadeVendas} venda(s) registrada(s)</small></article>
              <article className="summary-card"><span>Despesas registradas</span><strong>{formatarMoeda(relatorio.totalDespesas)}</strong><small>{relatorio.quantidadeDespesas} lançamento(s)</small></article>
              <article className="summary-card"><span>Saldo financeiro</span><strong>{formatarMoeda(relatorio.saldoFinanceiro)}</strong><small>Faturamento menos despesas</small></article>
              <article className="summary-card"><span>Lucro bruto</span><strong>{formatarMoeda(relatorio.lucroBruto)}</strong><small>Faturamento menos custo dos produtos</small></article>
            </section>

            <section className="report-grid">
              <article className="panel report-card">
                <div className="report-card-header"><div><p className="eyebrow">Produtos</p><h2>Mais vendidos</h2></div><span className="report-card-icon">◇</span></div>
                {relatorio.produtosMaisVendidos.length === 0 ? <div className="empty-state compact-empty-state"><strong>Ainda não há vendas.</strong></div> : (
                  <div className="report-list">
                    {itensVisiveis(relatorio.produtosMaisVendidos, "produtos").map((produto, indice) => (
                      <div className="report-row" key={produto.nome}>
                        <span className="ranking-badge">{indice + 1}</span>
                        <div className="report-row-main"><strong>{produto.nome}</strong><small>{produto.quantidadeVendida} unidade(s)</small><span className="report-progress"><span style={{ width: `${(produto.quantidadeVendida / limites.produtos) * 100}%` }} /></span></div>
                        <strong>{formatarMoeda(produto.faturamento)}</strong>
                      </div>
                    ))}
                    {relatorio.produtosMaisVendidos.length > 5 ? <button className="report-more" onClick={() => toggle("produtos")} type="button">{expandidas.produtos ? "Mostrar menos" : "••• Ver todos"}</button> : null}
                  </div>
                )}
              </article>

              <article className="panel report-card">
                <div className="report-card-header"><div><p className="eyebrow">Recebimentos</p><h2>Formas de pagamento</h2></div><span className="report-card-icon">↗</span></div>
                {relatorio.formasPagamento.length === 0 ? <div className="empty-state compact-empty-state"><strong>Nenhuma venda registrada.</strong></div> : (
                  <div className="report-list">
                    {itensVisiveis(relatorio.formasPagamento, "recebimentos").map((item) => (
                      <div className="report-row" key={item.formaPagamento}>
                        <span className="report-dot" />
                        <div className="report-row-main"><strong>{nomeFormaPagamento(item.formaPagamento as Parameters<typeof nomeFormaPagamento>[0])}</strong><span className="report-progress"><span style={{ width: `${(item.total / limites.recebimentos) * 100}%` }} /></span></div>
                        <strong>{formatarMoeda(item.total)}</strong>
                      </div>
                    ))}
                    {relatorio.formasPagamento.length > 5 ? <button className="report-more" onClick={() => toggle("recebimentos")} type="button">{expandidas.recebimentos ? "Mostrar menos" : "••• Ver todos"}</button> : null}
                  </div>
                )}
              </article>

              <article className="panel report-card">
                <div className="report-card-header"><div><p className="eyebrow">Despesas</p><h2>Gastos por categoria</h2></div><span className="report-card-icon">↓</span></div>
                {relatorio.despesasPorCategoria.length === 0 ? <div className="empty-state compact-empty-state"><strong>Nenhuma despesa registrada.</strong></div> : (
                  <div className="report-list">
                    {itensVisiveis(relatorio.despesasPorCategoria, "despesas").map((item) => (
                      <div className="report-row" key={item.categoria}>
                        <span className="report-dot report-dot-expense" />
                        <div className="report-row-main"><strong>{item.categoria}</strong><span className="report-progress report-progress-expense"><span style={{ width: `${(item.total / limites.despesas) * 100}%` }} /></span></div>
                        <strong>{formatarMoeda(item.total)}</strong>
                      </div>
                    ))}
                    {relatorio.despesasPorCategoria.length > 5 ? <button className="report-more" onClick={() => toggle("despesas")} type="button">{expandidas.despesas ? "Mostrar menos" : "••• Ver todos"}</button> : null}
                  </div>
                )}
              </article>

              <article className="panel report-card">
                <div className="report-card-header"><div><p className="eyebrow">Clientes</p><h2>Maiores compradores</h2></div><span className="report-card-icon">+</span></div>
                {relatorio.melhoresClientes.length === 0 ? <div className="empty-state compact-empty-state"><strong>Ainda não há vendas vinculadas a clientes.</strong></div> : (
                  <div className="report-list">
                    {itensVisiveis(relatorio.melhoresClientes, "clientes").map((cliente, indice) => (
                      <div className="report-row" key={cliente.nome}>
                        <span className="ranking-badge">{indice + 1}</span>
                        <div className="report-row-main"><strong>{cliente.nome}</strong><small>{cliente.quantidadeVendas} compra(s)</small><span className="report-progress"><span style={{ width: `${(cliente.totalComprado / limites.clientes) * 100}%` }} /></span></div>
                        <strong>{formatarMoeda(cliente.totalComprado)}</strong>
                      </div>
                    ))}
                    {relatorio.melhoresClientes.length > 5 ? <button className="report-more" onClick={() => toggle("clientes")} type="button">{expandidas.clientes ? "Mostrar menos" : "••• Ver todos"}</button> : null}
                  </div>
                )}
              </article>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
