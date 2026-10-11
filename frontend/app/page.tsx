"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { carregarProdutos, formatarMoeda, Produto } from "../lib/produtos";

export default function HomePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await carregarProdutos();
        if (ativo) setProdutos(dados);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar o resumo do catálogo.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const resumo = useMemo(() => {
    const ativos = produtos.filter((produto) => produto.ativo !== false);
    const divisor = ativos.length || 1;
    const precoMedio = ativos.reduce((total, produto) => total + produto.precoVenda, 0) / divisor;
    const custoMedio = ativos.reduce((total, produto) => total + produto.custoEstimado, 0) / divisor;
    const lucroMedio = ativos.reduce(
      (total, produto) => total + (produto.lucroEstimado ?? produto.precoVenda - produto.custoEstimado),
      0,
    ) / divisor;

    return [
      {
        titulo: "Produtos ativos",
        valor: String(ativos.length),
        detalhe: produtos.length === ativos.length ? "Todos os produtos estão ativos" : `${produtos.length - ativos.length} inativo(s)`,
      },
      {
        titulo: "Preço médio",
        valor: formatarMoeda(ativos.length ? precoMedio : 0),
        detalhe: "Média dos preços de venda ativos",
      },
      {
        titulo: "Custo médio",
        valor: formatarMoeda(ativos.length ? custoMedio : 0),
        detalhe: "Média da ficha de custo dos ativos",
      },
      {
        titulo: "Lucro unitário médio",
        valor: formatarMoeda(ativos.length ? lucroMedio : 0),
        detalhe: "Preço menos custo dos ingredientes",
      },
    ];
  }, [produtos]);

  const produtosDestaque = produtos.filter((produto) => produto.ativo !== false).slice(0, 5);

  return (
    <main className="app-shell">
      <Sidebar ativo="dashboard" />

      <section className="content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Dashboard</h1>
            <p className="subtitle">Acompanhe os dados que já estão disponíveis no seu negócio.</p>
          </div>
          <Link className="primary-button" href="/produtos/novo">
            + Novo produto
          </Link>
        </header>

        {erro ? <p className="form-error-banner dashboard-error">{erro}</p> : null}

        <section className="summary-grid" aria-label="Resumo do catálogo">
          {resumo.map((item) => (
            <article className="summary-card" key={item.titulo}>
              <span>{item.titulo}</span>
              <strong>{carregando ? "—" : item.valor}</strong>
              <small>{carregando ? "Carregando dados..." : item.detalhe}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Ações rápidas</p>
                <h2>Continue o cadastro</h2>
              </div>
            </div>

            <div className="quick-actions">
              <Link className="quick-action" href="/produtos/novo">
                <strong>Novo produto</strong>
                <span>Cadastre um produto e monte a ficha de custo por ingredientes</span>
              </Link>

              <Link className="quick-action" href="/produtos">
                <strong>Gerenciar produtos</strong>
                <span>Consulte fichas de custo e ative ou desative itens do catálogo</span>
              </Link>

              <button className="quick-action" type="button" disabled>
                <strong>Nova venda</strong>
                <span>Será habilitada quando o módulo de vendas estiver conectado ao banco</span>
              </button>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Catálogo</p>
                <h2>Produtos ativos</h2>
              </div>
              <Link className="secondary-button compact-button" href="/produtos">
                Ver todos
              </Link>
            </div>

            {carregando ? (
              <div className="empty-state compact-empty-state">
                <strong>Carregando produtos...</strong>
              </div>
            ) : produtosDestaque.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">P</span>
                <strong>Nenhum produto ativo</strong>
                <p>Cadastre um produto para começar a montar o catálogo.</p>
              </div>
            ) : (
              <div className="dashboard-product-list">
                {produtosDestaque.map((produto) => (
                  <Link className="dashboard-product-row" href={`/produtos/${produto.id}`} key={produto.id}>
                    <div>
                      <strong>{produto.nome}</strong>
                      <small>{produto.ingredientes.length} ingrediente{produto.ingredientes.length === 1 ? "" : "s"}</small>
                    </div>
                    <div>
                      <span>{formatarMoeda(produto.precoVenda)}</span>
                      <small>custo {formatarMoeda(produto.custoEstimado)}</small>
                    </div>
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
