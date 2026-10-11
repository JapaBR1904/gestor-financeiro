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
          <div>
            <p className="eyebrow">Histórico de vendas</p>
            <h1>{venda ? `Venda #${venda.id}` : "Venda"}</h1>
            <p className="subtitle">Confira os produtos e as informações registradas nessa venda.</p>
          </div>
          <Link className="secondary-button" href="/vendas">Voltar para vendas</Link>
        </header>

        {carregando ? <article className="panel"><div className="empty-state"><strong>Carregando venda...</strong></div></article> : erro || !venda ? (
          <article className="panel"><div className="empty-state"><strong>Não foi possível carregar a venda</strong><p>{erro}</p></div></article>
        ) : (
          <div className="product-form-stack">
            <section className="summary-grid">
              <article className="summary-card"><span>Total da venda</span><strong>{formatarMoeda(venda.totalVenda)}</strong><small>Valor registrado no momento da venda</small></article>
              <article className="summary-card"><span>Forma de pagamento</span><strong>{nomeFormaPagamento(venda.formaPagamento)}</strong><small>Forma utilizada na venda</small></article>
              <article className="summary-card"><span>Cliente</span><strong>{venda.clienteNome || "Não informado"}</strong><small>{venda.clienteId ? "Cliente vinculado à venda" : "Venda sem cliente identificado"}</small></article>
              <article className="summary-card"><span>Data</span><strong>{new Date(venda.criadoEm).toLocaleDateString("pt-BR")}</strong><small>Data do registro</small></article>
            </section>

            <article className="panel">
              <div className="panel-header"><div><p className="eyebrow">Itens</p><h2>Produtos vendidos</h2></div></div>
              <div className="ingredient-detail-list">
                <div className="ingredient-detail-head" aria-hidden="true"><span>Produto</span><span>Quantidade</span><span>Preço unitário</span><span>Subtotal</span></div>
                {venda.itens.map((item) => (
                  <div className="ingredient-detail-row" key={item.id}>
                    <div><strong>{item.produtoNome}</strong></div>
                    <div data-label="Quantidade">{item.quantidade}</div>
                    <div data-label="Preço unitário">{formatarMoeda(item.precoUnitario)}</div>
                    <div data-label="Subtotal"><strong>{formatarMoeda(item.subtotal)}</strong></div>
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
