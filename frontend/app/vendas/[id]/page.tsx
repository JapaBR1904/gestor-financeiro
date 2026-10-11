"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "../../../components/Sidebar";
import { formatarMoeda } from "../../../lib/produtos";
import { carregarVenda, nomeFormaPagamento, Venda } from "../../../lib/vendas";

export default function VendaDetalhePage() {
  const params = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarVenda(params.id)
      .then(setVenda)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar a venda."))
      .finally(() => setCarregando(false));
  }, [params.id]);

  return (
    <main className="app-shell">
      <Sidebar ativo="vendas" />
      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Histórico de vendas</p><h1>{venda ? `Venda #${venda.id}` : "Venda"}</h1><p className="subtitle">Confira os itens e os valores registrados no momento da venda.</p></div>
          <Link className="secondary-button" href="/vendas">Voltar para vendas</Link>
        </header>

        {carregando ? <article className="panel"><div className="empty-state"><strong>Carregando venda...</strong></div></article> : erro || !venda ? (
          <article className="panel"><div className="empty-state"><strong>Não foi possível carregar a venda</strong><p>{erro}</p></div></article>
        ) : (
          <div className="product-form-stack">
            <section className="summary-grid">
              <article className="summary-card"><span>Total vendido</span><strong>{formatarMoeda(venda.totalVenda)}</strong><small>{nomeFormaPagamento(venda.formaPagamento)}</small></article>
              <article className="summary-card"><span>Custo</span><strong>{formatarMoeda(venda.custoTotal)}</strong><small>Custo histórico dos itens</small></article>
              <article className="summary-card"><span>Lucro estimado</span><strong>{formatarMoeda(venda.lucroTotal)}</strong><small>Total menos custo</small></article>
              <article className="summary-card"><span>Data</span><strong>{new Date(venda.criadoEm).toLocaleDateString("pt-BR")}</strong><small>{new Date(venda.criadoEm).toLocaleTimeString("pt-BR")}</small></article>
            </section>

            <article className="panel">
              <div className="panel-header"><div><p className="eyebrow">Itens</p><h2>Produtos vendidos</h2></div></div>
              <div className="ingredient-detail-list">
                <div className="ingredient-detail-head" aria-hidden="true"><span>Produto</span><span>Quantidade</span><span>Preço unitário</span><span>Subtotal</span></div>
                {venda.itens.map((item) => (
                  <div className="ingredient-detail-row" key={item.id}>
                    <div><strong>{item.produtoNome}</strong><small>custo unitário {formatarMoeda(item.custoUnitario)}</small></div>
                    <div data-label="Quantidade">{item.quantidade}</div>
                    <div data-label="Preço unitário">{formatarMoeda(item.precoUnitario)}</div>
                    <div data-label="Subtotal"><strong>{formatarMoeda(item.subtotal)}</strong><small> lucro {formatarMoeda(item.lucroSubtotal)}</small></div>
                  </div>
                ))}
              </div>
            </article>

            {venda.observacao ? <article className="panel"><div className="panel-header"><div><p className="eyebrow">Observação</p><h2>Anotação da venda</h2></div></div><p>{venda.observacao}</p></article> : null}
          </div>
        )}
      </section>
    </main>
  );
}
