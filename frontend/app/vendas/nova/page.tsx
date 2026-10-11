"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../../components/Sidebar";
import { carregarProdutos, formatarMoeda, Produto } from "../../../lib/produtos";
import { FormaPagamento, salvarVenda } from "../../../lib/vendas";

type LinhaVenda = { id: string; produtoId: string; quantidade: string };

function novaLinha(id = `item-${Date.now()}`): LinhaVenda {
  return { id, produtoId: "", quantidade: "1" };
}

export default function NovaVendaPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<LinhaVenda[]>([novaLinha("item-1")]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarProdutos()
      .then((dados) => setProdutos(dados.filter((produto) => produto.ativo !== false)))
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar os produtos."))
      .finally(() => setCarregando(false));
  }, []);

  const calculo = useMemo(() => {
    let total = 0;
    let custo = 0;
    for (const item of itens) {
      const produto = produtos.find((p) => String(p.id) === item.produtoId);
      const quantidade = Math.max(0, Number(item.quantidade) || 0);
      if (!produto || quantidade <= 0) continue;
      total += produto.precoVenda * quantidade;
      custo += produto.custoEstimado * quantidade;
    }
    return { total, custo, lucro: total - custo };
  }, [itens, produtos]);

  function atualizarItem(id: string, campo: keyof LinhaVenda, valor: string) {
    setItens((atuais) => atuais.map((item) => item.id === id ? { ...item, [campo]: valor } : item));
  }

  function adicionarItem() {
    setItens((atuais) => [...atuais, novaLinha()]);
  }

  function removerItem(id: string) {
    setItens((atuais) => atuais.length === 1 ? [novaLinha("item-1")] : atuais.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const itensValidos = itens
      .filter((item) => item.produtoId && Number(item.quantidade) > 0)
      .map((item) => ({ produtoId: item.produtoId, quantidade: Number(item.quantidade) }));

    if (itensValidos.length === 0) {
      setErro("Adicione pelo menos um produto com quantidade válida.");
      return;
    }

    setSalvando(true);
    try {
      await salvarVenda({ formaPagamento, observacao: observacao.trim(), itens: itensValidos });
      router.push("/vendas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a venda.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="vendas" />
      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Comercial</p><h1>Nova venda</h1><p className="subtitle">Selecione os produtos vendidos e registre a forma de pagamento.</p></div>
          <Link className="secondary-button" href="/vendas">Voltar para vendas</Link>
        </header>

        <form className="product-form-stack" onSubmit={handleSubmit}>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field">
                <span>Forma de pagamento *</span>
                <select value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value as FormaPagamento)}>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="credito">Cartão de crédito</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
              <label className="field field-wide"><span>Observação</span><textarea rows={3} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Ex.: encomenda para retirada às 18h" /></label>
            </div>
          </section>

          <section className="panel ingredient-panel">
            <div className="panel-header ingredient-header">
              <div><p className="eyebrow">Itens</p><h2>Produtos vendidos</h2><p className="ingredient-help">Os valores usam o preço e o custo atuais do produto no momento da venda.</p></div>
              <button className="secondary-button compact-button" type="button" onClick={adicionarItem}>+ Produto</button>
            </div>

            {carregando ? <div className="empty-state"><strong>Carregando produtos...</strong></div> : produtos.length === 0 ? <div className="empty-state"><strong>Nenhum produto ativo disponível</strong><p>Ative ou cadastre um produto antes de registrar uma venda.</p></div> : (
              <div className="ingredient-list">
                {itens.map((item) => {
                  const produto = produtos.find((p) => String(p.id) === item.produtoId);
                  const quantidade = Math.max(0, Number(item.quantidade) || 0);
                  return (
                    <div className="ingredient-row" key={item.id}>
                      <label className="field ingredient-name"><span>Produto</span><select value={item.produtoId} onChange={(event) => atualizarItem(item.id, "produtoId", event.target.value)}><option value="">Selecione...</option>{produtos.map((produto) => <option value={String(produto.id)} key={produto.id}>{produto.nome} — {formatarMoeda(produto.precoVenda)}</option>)}</select></label>
                      <label className="field"><span>Quantidade</span><input min="1" step="1" type="number" value={item.quantidade} onChange={(event) => atualizarItem(item.id, "quantidade", event.target.value)} /></label>
                      <div className="ingredient-cost"><span>Subtotal</span><strong>{formatarMoeda(produto ? produto.precoVenda * quantidade : 0)}</strong><small>{produto ? `custo ${formatarMoeda(produto.custoEstimado * quantidade)}` : "Selecione um produto"}</small></div>
                      <button className="remove-button" type="button" onClick={() => removerItem(item.id)}>Remover</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel product-totals">
            <div><span>Total da venda</span><strong>{formatarMoeda(calculo.total)}</strong></div>
            <div><span>Custo estimado</span><strong>{formatarMoeda(calculo.custo)}</strong></div>
            <div><span>Lucro estimado</span><strong>{formatarMoeda(calculo.lucro)}</strong></div>
          </section>

          {erro ? <p className="form-error-banner">{erro}</p> : null}
          <div className="form-actions standalone-actions"><Link className="secondary-button" href="/vendas">Cancelar</Link><button className="primary-button" type="submit" disabled={salvando || carregando || produtos.length === 0}>{salvando ? "Registrando..." : "Registrar venda"}</button></div>
        </form>
      </section>
    </main>
  );
}
