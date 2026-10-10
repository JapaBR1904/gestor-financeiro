"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { carregarProdutos, formatarMoeda, Produto } from "../../lib/produtos";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setProdutos(carregarProdutos());
    setCarregando(false);
  }, []);

  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>Produtos</h1>
            <p className="subtitle">Cadastre o que você vende e acompanhe preço, custo estimado e margem unitária.</p>
          </div>
          <Link className="primary-button" href="/produtos/novo">
            + Novo produto
          </Link>
        </header>

        <article className="panel activity-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Seus produtos</p>
              <h2>{produtos.length ? `${produtos.length} produto${produtos.length > 1 ? "s" : ""}` : "Catálogo vazio"}</h2>
            </div>
          </div>

          {carregando ? (
            <div className="empty-state">
              <span className="empty-icon">P</span>
              <strong>Carregando produtos...</strong>
            </div>
          ) : produtos.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">P</span>
              <strong>Nenhum produto cadastrado</strong>
              <p>Use o botão “Novo produto” para cadastrar o primeiro item e montar a ficha de custo.</p>
            </div>
          ) : (
            <div className="product-list">
              <div className="product-list-head" aria-hidden="true">
                <span>Produto</span>
                <span>Venda</span>
                <span>Custo</span>
                <span>Lucro estimado</span>
                <span>Ingredientes</span>
              </div>

              {produtos.map((produto) => {
                const lucro = produto.precoVenda - produto.custoEstimado;

                return (
                  <div className="product-list-row" key={produto.id}>
                    <div className="product-main-cell">
                      <strong>{produto.nome}</strong>
                      <small>{produto.descricao || "Sem descrição"}</small>
                    </div>
                    <div data-label="Venda">{formatarMoeda(produto.precoVenda)}</div>
                    <div data-label="Custo">{formatarMoeda(produto.custoEstimado)}</div>
                    <div data-label="Lucro estimado">{formatarMoeda(lucro)}</div>
                    <div data-label="Ingredientes">{produto.ingredientes.length}</div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <p className="temporary-note catalog-note">
          Os produtos desta etapa ficam salvos somente neste navegador. A próxima integração de persistência será feita no Spring Boot com PostgreSQL.
        </p>
      </section>
    </main>
  );
}
