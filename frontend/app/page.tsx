"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { carregarProdutos, formatarMoeda, Produto } from "../lib/produtos";
import { carregarRelatorioResumo, RelatorioResumo } from "../lib/relatorios";

const relatorioVazio: RelatorioResumo = {
  quantidadeVendas: 0,
  faturamento: 0,
  custoVendas: 0,
  lucroBruto: 0,
  quantidadeDespesas: 0,
  totalDespesas: 0,
  saldoFinanceiro: 0,
  produtosMaisVendidos: [],
  formasPagamento: [],
  despesasPorCategoria: [],
  melhoresClientes: [],
};

export default function HomePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioResumo>(relatorioVazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [dadosProdutos, dadosRelatorio] = await Promise.all([carregarProdutos(), carregarRelatorioResumo()]);
        if (ativo) {
          setProdutos(dadosProdutos);
          setRelatorio(dadosRelatorio);
        }
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar o dashboard.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, []);

  const ativos = useMemo(() => produtos.filter((produto) => produto.ativo !== false), [produtos]);
  const produtosDestaque = relatorio.produtosMaisVendidos.slice(0, 5);

  const resumo = [
    { titulo: "Faturamento", valor: formatarMoeda(relatorio.faturamento), detalhe: `${relatorio.quantidadeVendas} venda(s) registrada(s)` },
    { titulo: "Despesas", valor: formatarMoeda(relatorio.totalDespesas), detalhe: `${relatorio.quantidadeDespesas} despesa(s) registrada(s)` },
    { titulo: "Saldo financeiro", valor: formatarMoeda(relatorio.saldoFinanceiro), detalhe: "Faturamento menos despesas" },
    { titulo: "Produtos ativos", valor: String(ativos.length), detalhe: `${produtos.length} produto(s) no catálogo` },
  ];

  const grafico = [
    { nome: "Faturamento", valor: relatorio.faturamento, classe: "chart-income" },
    { nome: "Despesas", valor: relatorio.totalDespesas, classe: "chart-expense" },
    { nome: "Saldo financeiro", valor: relatorio.saldoFinanceiro, classe: relatorio.saldoFinanceiro >= 0 ? "chart-balance-positive" : "chart-balance-negative" },
    { nome: "Lucro bruto", valor: relatorio.lucroBruto, classe: relatorio.lucroBruto >= 0 ? "chart-profit" : "chart-balance-negative" },
  ];

  const maiorValorGrafico = Math.max(1, ...grafico.map((item) => Math.abs(item.valor)));

  return (
    <main className="app-shell">
      <Sidebar ativo="dashboard" />
      <section className="content" id="dashboard">
        <header className="topbar">
          <div><p className="eyebrow">Visão geral</p><h1>Dashboard</h1><p className="subtitle">Acompanhe rapidamente a situação do negócio e acesse as ações mais usadas.</p></div>
          <Link className="primary-button" href="/vendas/nova">+ Nova venda</Link>
        </header>

        {erro ? <p className="form-error-banner dashboard-error">{erro}</p> : null}

        <section className="summary-grid" aria-label="Resumo do negócio">
          {resumo.map((item) => (
            <article className="summary-card" key={item.titulo}><span>{item.titulo}</span><strong>{carregando ? "—" : item.valor}</strong><small>{carregando ? "Carregando dados..." : item.detalhe}</small></article>
          ))}
        </section>

        <article className="panel dashboard-chart-panel">
          <div className="panel-header">
            <div><p className="eyebrow">Visão financeira</p><h2>Panorama do negócio</h2><p className="subtitle">Comparação geral entre entradas, saídas e resultado acumulado.</p></div>
          </div>

          {carregando ? (
            <div className="empty-state compact-empty-state"><strong>Carregando gráfico...</strong></div>
          ) : (
            <div className="dashboard-chart" aria-label="Gráfico financeiro do negócio">
              {grafico.map((item) => {
                const largura = Math.max(item.valor === 0 ? 0 : 8, (Math.abs(item.valor) / maiorValorGrafico) * 100);
                return (
                  <div className="dashboard-chart-row" key={item.nome}>
                    <div className="dashboard-chart-label">
                      <span>{item.nome}</span>
                      <strong>{formatarMoeda(item.valor)}</strong>
                    </div>
                    <div className="dashboard-chart-track">
                      <div className={`dashboard-chart-bar ${item.classe}`} style={{ width: `${largura}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <section className="dashboard-grid dashboard-lower-grid">
          <article className="panel">
            <div className="panel-header"><div><p className="eyebrow">Ações rápidas</p><h2>Movimente o negócio</h2></div></div>
            <div className="quick-actions">
              <Link className="quick-action" href="/vendas/nova"><strong>Nova venda</strong><span>Registre produtos, cliente e forma de pagamento</span></Link>
              <Link className="quick-action" href="/despesas/nova"><strong>Nova despesa</strong><span>Registre uma saída de dinheiro do negócio</span></Link>
              <Link className="quick-action" href="/produtos/novo"><strong>Novo produto</strong><span>Cadastre um produto e monte a ficha de custo</span></Link>
              <Link className="quick-action" href="/clientes/novo"><strong>Novo cliente</strong><span>Cadastre um cliente para vincular às vendas</span></Link>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-header"><div><p className="eyebrow">Desempenho</p><h2>Produtos mais vendidos</h2></div><Link className="secondary-button compact-button" href="/relatorios">Ver relatório</Link></div>
            {carregando ? <div className="empty-state compact-empty-state"><strong>Carregando dados...</strong></div> : produtosDestaque.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">P</span><strong>Ainda não há vendas</strong><p>Os produtos mais vendidos aparecerão aqui.</p></div>
            ) : (
              <div className="dashboard-product-list">
                {produtosDestaque.map((produto) => (
                  <div className="dashboard-product-row" key={produto.nome}>
                    <div><strong>{produto.nome}</strong><small>{produto.quantidadeVendida} unidade{produto.quantidadeVendida === 1 ? "" : "s"} vendida{produto.quantidadeVendida === 1 ? "" : "s"}</small></div>
                    <div><span>{formatarMoeda(produto.faturamento)}</span><small>faturamento</small></div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
