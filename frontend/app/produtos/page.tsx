"use client";
import { useMoeda } from "../../components/PreferenciasProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { alterarStatusProduto, carregarProdutos, Produto } from "../../lib/produtos";

export default function ProdutosPage() {
  const formatarMoeda = useMoeda();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [alterandoId, setAlterandoId] = useState<string | number | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await carregarProdutos();
        if (ativo) setProdutos(dados);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar os produtos.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  async function alternarStatus(produto: Produto) {
    setErro("");
    setAlterandoId(produto.id);

    try {
      const atualizado = await alterarStatusProduto(produto.id, !produto.ativo);
      setProdutos((atuais) => atuais.map((item) => (item.id === produto.id ? atualizado : item)));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar o status do produto.");
    } finally {
      setAlterandoId(null);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content" id="conteudo" tabIndex={-1}>
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

          {erro && produtos.length > 0 ? <p className="form-error-banner">{erro}</p> : null}

          {carregando ? (
            <div className="empty-state">
              <span className="empty-icon">P</span>
              <strong>Carregando produtos...</strong>
            </div>
          ) : erro && produtos.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">!</span>
              <strong>Não foi possível carregar os produtos</strong>
              <p>{erro}</p>
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
                <span>Status</span>
                <span>Ações</span>
              </div>

              {produtos.map((produto) => {
                const lucro = produto.lucroEstimado ?? produto.precoVenda - produto.custoEstimado;

                return (
                  <div className="product-list-row" key={produto.id}>
                    <div className="product-main-cell">
                      <strong>{produto.nome}</strong>
                      <small>{produto.descricao || "Sem descrição"}</small>
                    </div>
                    <div data-label="Venda">{formatarMoeda(produto.precoVenda)}</div>
                    <div data-label="Custo">{formatarMoeda(produto.custoEstimado)}</div>
                    <div data-label="Lucro estimado">{formatarMoeda(lucro)}</div>
                    <div data-label="Status">
                      <span className={`status-badge ${produto.ativo ? "status-active" : "status-inactive"}`}>
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="product-actions" data-label="Ações">
                      <Link className="secondary-button compact-button" href={`/produtos/${produto.id}`}>
                        Ver ficha
                      </Link>
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        disabled={alterandoId === produto.id}
                        onClick={() => alternarStatus(produto)}
                      >
                        {alterandoId === produto.id ? "Salvando..." : produto.ativo ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
