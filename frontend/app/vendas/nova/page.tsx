"use client";
import { useMoeda } from "../../../components/PreferenciasProvider";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "../../../components/WorkspaceShell";
import { carregarClientes, Cliente } from "../../../lib/clientes";
import { carregarProdutos, Produto } from "../../../lib/produtos";
import { FormaPagamento, salvarVenda } from "../../../lib/vendas";

type LinhaVenda = { id: string; produtoId: string; quantidade: string };

function novaLinha(id = `item-${Date.now()}`): LinhaVenda {
  return { id, produtoId: "", quantidade: "1" };
}

export default function NovaVendaPage() {
  const formatarMoeda = useMoeda();
  const router = useRouter();
  const envioEmCurso = useRef(false);
  const chaveIdempotencia = useRef<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<LinhaVenda[]>([novaLinha("item-1")]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([carregarProdutos(), carregarClientes()])
      .then(([produtosDados, clientesDados]) => {
        setProdutos(produtosDados.filter((produto) => produto.ativo !== false));
        setClientes(clientesDados.filter((cliente) => cliente.ativo));
      })
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar os dados da venda."))
      .finally(() => setCarregando(false));
  }, []);

  const totalVenda = useMemo(() => {
    return itens.reduce((total, item) => {
      const produto = produtos.find((p) => String(p.id) === item.produtoId);
      const quantidade = Math.max(0, Number(item.quantidade) || 0);
      return total + (produto ? produto.precoVenda * quantidade : 0);
    }, 0);
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
    if (envioEmCurso.current) return;
    setErro("");

    const itensValidos = itens
      .filter((item) => item.produtoId && Number(item.quantidade) > 0)
      .map((item) => ({ produtoId: item.produtoId, quantidade: Number(item.quantidade) }));

    if (itensValidos.length === 0) {
      setErro("Adicione pelo menos um produto com quantidade válida.");
      return;
    }

    envioEmCurso.current = true;
    setSalvando(true);
    try {
      chaveIdempotencia.current ??= crypto.randomUUID();
      await salvarVenda({ clienteId: clienteId || null, formaPagamento, observacao: observacao.trim(), itens: itensValidos }, chaveIdempotencia.current);
      router.push("/vendas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a venda.");
    } finally {
      envioEmCurso.current = false;
      setSalvando(false);
    }
  }

  return (
    <WorkspaceShell cabecalho={<header className="topbar">
          <div>
            <p className="eyebrow">Comercial</p>
            <h1>Nova venda</h1>
            <p className="subtitle">Selecione os produtos vendidos e registre a forma de pagamento.</p>
          </div>
          <Link className="secondary-button" href="/vendas">Voltar para vendas</Link>
        </header>}>


        <form className="product-form-stack" onSubmit={handleSubmit}>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field">
                <span>Forma de pagamento *</span>
                <select aria-label="Forma de pagamento *" value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value as FormaPagamento)}>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="credito">Cartão de crédito</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
            </div>
            <details className="sale-more-options"><summary>Mais opções · cliente e observação</summary><div className="form-grid">
              <label className="field"><span>Cliente (opcional)</span><select aria-label="Cliente" value={clienteId} onChange={event => setClienteId(event.target.value)}><option value="">Venda sem cliente identificado</option>{clientes.map(cliente => <option key={cliente.id} value={String(cliente.id)}>{cliente.nome}</option>)}</select></label>
              <label className="field"><span>Observação (opcional)</span><textarea aria-label="Observação" rows={2} value={observacao} onChange={event => setObservacao(event.target.value)} placeholder="Ex.: retirada às 18h" /></label>
            </div></details>
            <p className="subtitle">A venda registra a forma de pagamento. A situação de recebimento ainda não é controlada.</p>
          </section>

          <section className="panel ingredient-panel">
            <div className="panel-header ingredient-header">
              <div>
                <p className="eyebrow">Itens</p>
                <h2>Produtos vendidos</h2>
                <p className="ingredient-help">Selecione os produtos e informe a quantidade vendida.</p>
              </div>
              <button className="secondary-button compact-button" type="button" onClick={adicionarItem}>+ Produto</button>
            </div>

            {carregando ? <div className="empty-state"><strong>Carregando dados...</strong></div> : produtos.length === 0 ? <div className="empty-state"><strong>Nenhum produto ativo disponível</strong><p>Cadastre seu primeiro produto antes de registrar a venda. Depois você volta direto para esta tela.</p><Link className="primary-button" href="/produtos/novo?origem=venda">Cadastrar primeiro produto</Link></div> : (
              <div className="ingredient-list">
                {itens.map((item) => {
                  const produto = produtos.find((p) => String(p.id) === item.produtoId);
                  const quantidade = Math.max(0, Number(item.quantidade) || 0);
                  return (
                    <div className="ingredient-row" key={item.id}>
                      <label className="field ingredient-name">
                        <span>Produto</span>
                        <select aria-label="Produto" value={item.produtoId} onChange={(event) => atualizarItem(item.id, "produtoId", event.target.value)}>
                          <option value="">Selecione...</option>
                          {produtos.map((produto) => <option value={String(produto.id)} key={produto.id}>{produto.nome} — {formatarMoeda(produto.precoVenda)}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Quantidade</span>
                        <input aria-label="Quantidade" min="1" step="1" type="number" value={item.quantidade} onChange={(event) => atualizarItem(item.id, "quantidade", event.target.value)} />
                      </label>
                      <div className="ingredient-cost">
                        <span>Subtotal</span>
                        <strong>{formatarMoeda(produto ? produto.precoVenda * quantidade : 0)}</strong>
                        <small>{produto ? `${formatarMoeda(produto.precoVenda)} por unidade` : "Selecione um produto"}</small>
                      </div>
                      <button className="remove-button" type="button" onClick={() => removerItem(item.id)}>Remover</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel product-totals"><div><span>Total da venda</span><strong>{carregando ? "—" : formatarMoeda(totalVenda)}</strong></div></section>

          {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
          <div className="form-actions standalone-actions">
            <Link className="secondary-button" href="/vendas">Cancelar</Link>
            <button className="primary-button" type="submit" disabled={salvando || carregando || produtos.length === 0}>{salvando ? "Registrando..." : "Registrar venda"}</button>
          </div>
        </form>
      </WorkspaceShell>
  );
}
