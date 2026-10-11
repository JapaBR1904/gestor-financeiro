"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { carregarProdutos, formatarMoeda, Produto } from "../lib/produtos";
import { carregarResumoVendas, ResumoVendas } from "../lib/vendas";

const resumoVazio: ResumoVendas = { quantidadeVendas: 0, faturamento: 0, custo: 0, lucro: 0 };

export default function HomePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<ResumoVendas>(resumoVazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [dadosProdutos, dadosVendas] = await Promise.all([carregarProdutos(), carregarResumoVendas()]);
        if (ativo) {
          setProdutos(dadosProdutos);
          setVendas(dadosVendas);
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
  const produtosDestaque = ativos.slice(0, 5);

  const resumo = [
    { titulo: "Faturamento", valor: formatarMoeda(vendas.faturamento), detalhe: `${vendas.quantidadeVendas} venda(s) registrada(s)` },
    { titulo: "Lucro estimado", valor: formatarMoeda(vendas.lucro), detalhe: "Faturamento menos custo das vendas" },
    { titulo: "Custo das vendas", valor: formatarMoeda(vendas.custo), detalhe: "Custos históricos dos produtos vendidos" },
    { titulo: "Produtos ativos", valor: String(ativos.length), detalhe: `${produtos.length} produto(s) no catálogo` },
  ];

  return (
    <main className="app-shell">
      <Sidebar ativo="dashboard" />
      <section className="content" id="dashboard">
        <header className="topbar">
          <div><p className="eyebrow">Visão geral</p><h1>Dashboard</h1><p className="subtitle">Acompanhe catálogo, faturamento, custos e lucro do negócio.</p></div>
          <Link className="primary-button" href="/vendas/nova">+ Nova venda</Link>
        </header>

        {erro ? <p className="form-error-banner dashboard-error">{erro}</p> : null}

        <section className="summary-grid" aria-label="Resumo do negócio">
          {resumo.map((item) => (
            <article className="summary-card" key={item.titulo}><span>{item.titulo}</span><strong>{carregando ? "—" : item.valor}</strong><small>{carregando ? "Carregando dados..." : item.detalhe}</small></article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header"><div><p className="eyebrow">Ações rápidas</p><h2>Movimente o negócio</h2></div></div>
            <div className="quick-actions">
              <Link className="quick-action" href="/vendas/nova"><strong>Nova venda</strong><span>Registre produtos, quantidade e forma de pagamento</span></Link>
              <Link className="quick-action" href="/produtos/novo"><strong>Novo produto</strong><span>Cadastre um produto e monte a ficha de custo</span></Link>
              <Link className="quick-action" href="/vendas"><strong>Histórico de vendas</strong><span>Acompanhe faturamento, custo e lucro realizados</span></Link>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-header"><div><p className="eyebrow">Catálogo</p><h2>Produtos ativos</h2></div><Link className="secondary-button compact-button" href="/produtos">Ver todos</Link></div>
            {carregando ? <div className="empty-state compact-empty-state"><strong>Carregando produtos...</strong></div> : produtosDestaque.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">P</span><strong>Nenhum produto ativo</strong><p>Cadastre um produto para começar.</p></div>
            ) : (
              <div className="dashboard-product-list">
                {produtosDestaque.map((produto) => (
                  <Link className="dashboard-product-row" href={`/produtos/${produto.id}`} key={produto.id}>
                    <div><strong>{produto.nome}</strong><small>{produto.ingredientes.length} ingrediente{produto.ingredientes.length === 1 ? "" : "s"}</small></div>
                    <div><span>{formatarMoeda(produto.precoVenda)}</span><small>custo {formatarMoeda(produto.custoEstimado)}</small></div>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
