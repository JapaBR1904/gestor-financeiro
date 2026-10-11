"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "../../../components/Sidebar";
import { alterarStatusProduto, carregarProduto, formatarMoeda, Produto } from "../../../lib/produtos";

export default function ProdutoDetalhePage() {
  const params = useParams<{ id: string }>();
  const produtoId = params.id;
  const [produto, setProduto] = useState<Produto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await carregarProduto(produtoId);
        if (ativo) setProduto(dados);
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar o produto.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [produtoId]);

  async function alternarStatus() {
    if (!produto) return;

    setErro("");
    setSalvandoStatus(true);
    try {
      const atualizado = await alterarStatusProduto(produto.id, !produto.ativo);
      setProduto(atualizado);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar o status do produto.");
    } finally {
      setSalvandoStatus(false);
    }
  }

  const lucro = produto ? produto.lucroEstimado ?? produto.precoVenda - produto.custoEstimado : 0;
  const margem = produto && produto.precoVenda > 0 ? (lucro / produto.precoVenda) * 100 : 0;

  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Ficha de custo</p>
            <h1>{produto?.nome ?? "Produto"}</h1>
            <p className="subtitle">Confira os ingredientes, o custo unitário e a margem estimada deste produto.</p>
          </div>
          <div className="topbar-actions">
            <Link className="secondary-button" href="/produtos">
              Voltar
            </Link>
            {produto ? (
              <>
                <Link className="secondary-button" href={`/produtos/${produto.id}/editar`}>
                  Editar produto
                </Link>
                <button className="primary-button" type="button" disabled={salvandoStatus} onClick={alternarStatus}>
                  {salvandoStatus ? "Salvando..." : produto.ativo ? "Desativar produto" : "Reativar produto"}
                </button>
              </>
            ) : null}
          </div>
        </header>

        {carregando ? (
          <article className="panel activity-panel">
            <div className="empty-state">
              <span className="empty-icon">P</span>
              <strong>Carregando ficha do produto...</strong>
            </div>
          </article>
        ) : erro && !produto ? (
          <article className="panel activity-panel">
            <div className="empty-state">
              <span className="empty-icon">!</span>
              <strong>Não foi possível carregar o produto</strong>
              <p>{erro}</p>
            </div>
          </article>
        ) : produto ? (
          <div className="product-form-stack">
            {erro ? <p className="form-error-banner">{erro}</p> : null}

            <section className="summary-grid" aria-label="Resumo do produto">
              <article className="summary-card">
                <span>Preço de venda</span>
                <strong>{formatarMoeda(produto.precoVenda)}</strong>
                <small>Valor informado no cadastro</small>
              </article>
              <article className="summary-card">
                <span>Custo estimado</span>
                <strong>{formatarMoeda(produto.custoEstimado)}</strong>
                <small>Soma do custo dos ingredientes</small>
              </article>
              <article className="summary-card">
                <span>Lucro unitário estimado</span>
                <strong>{formatarMoeda(lucro)}</strong>
                <small>Venda menos custo dos ingredientes</small>
              </article>
              <article className="summary-card">
                <span>Margem estimada</span>
                <strong>{margem.toFixed(1)}%</strong>
                <small>{produto.ativo ? "Produto ativo no catálogo" : "Produto inativo no catálogo"}</small>
              </article>
            </section>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Informações</p>
                  <h2>Dados do produto</h2>
                </div>
              </div>
              <div className="product-info-grid">
                <div>
                  <span>Nome</span>
                  <strong>{produto.nome}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{produto.ativo ? "Ativo" : "Inativo"}</strong>
                </div>
                <div className="product-info-wide">
                  <span>Descrição</span>
                  <strong>{produto.descricao || "Sem descrição"}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Composição</p>
                  <h2>{produto.ingredientes.length} ingrediente{produto.ingredientes.length === 1 ? "" : "s"}</h2>
                </div>
              </div>

              {produto.ingredientes.length === 0 ? (
                <div className="empty-state compact-empty-state">
                  <strong>Nenhum ingrediente cadastrado</strong>
                </div>
              ) : (
                <div className="ingredient-detail-list">
                  <div className="ingredient-detail-head" aria-hidden="true">
                    <span>Ingrediente</span>
                    <span>Compra</span>
                    <span>Uso no produto</span>
                    <span>Custo no produto</span>
                  </div>
                  {produto.ingredientes.map((ingrediente) => (
                    <div className="ingredient-detail-row" key={ingrediente.id}>
                      <div>
                        <strong>{ingrediente.nome}</strong>
                      </div>
                      <div data-label="Compra">
                        {formatarMoeda(ingrediente.precoCompra)} por {ingrediente.quantidadeCompra} {ingrediente.unidadeCompra}
                      </div>
                      <div data-label="Uso no produto">
                        {ingrediente.quantidadeUsada} {ingrediente.unidadeUso}
                      </div>
                      <div data-label="Custo no produto">
                        <strong>{formatarMoeda(ingrediente.custoNoProduto ?? 0)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
