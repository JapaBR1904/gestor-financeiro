"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "../../../components/Sidebar";
import { alterarStatusCliente, carregarCliente, Cliente, formatarTelefone } from "../../../lib/clientes";

export default function ClienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [alterando, setAlterando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarCliente(params.id)
      .then(setCliente)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar o cliente."))
      .finally(() => setCarregando(false));
  }, [params.id]);

  async function alternarStatus() {
    if (!cliente) return;
    setAlterando(true);
    setErro("");
    try {
      const atualizado = await alterarStatusCliente(cliente.id, !cliente.ativo);
      setCliente(atualizado);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar o status do cliente.");
    } finally {
      setAlterando(false);
    }
  }

  if (carregando) {
    return <main className="app-shell"><Sidebar ativo="clientes" /><section className="content"><article className="panel"><div className="empty-state"><strong>Carregando cliente...</strong></div></article></section></main>;
  }

  if (!cliente) {
    return <main className="app-shell"><Sidebar ativo="clientes" /><section className="content"><article className="panel"><div className="empty-state"><strong>Não foi possível carregar o cliente</strong><p>{erro}</p></div></article></section></main>;
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="clientes" />
      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Cliente</p><h1>{cliente.nome}</h1><p className="subtitle">Dados cadastrais e situação do cliente.</p></div>
          <div className="topbar-actions"><Link className="secondary-button" href="/clientes">Voltar</Link><Link className="secondary-button" href={`/clientes/${cliente.id}/editar`}>Editar</Link><button className="primary-button" type="button" disabled={alterando} onClick={alternarStatus}>{alterando ? "Salvando..." : cliente.ativo ? "Desativar" : "Ativar"}</button></div>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        <section className="summary-grid">
          <article className="summary-card"><span>Status</span><strong>{cliente.ativo ? "Ativo" : "Inativo"}</strong><small>{cliente.ativo ? "Disponível para novas vendas" : "Não aparece para novas vendas"}</small></article>
          <article className="summary-card"><span>Telefone / WhatsApp</span><strong>{formatarTelefone(cliente.telefone) || "—"}</strong><small>Contato principal</small></article>
        </section>

        {cliente.observacao ? <article className="panel"><div className="panel-header"><div><p className="eyebrow">Observação</p><h2>Anotações</h2></div></div><p>{cliente.observacao}</p></article> : null}
      </section>
    </main>
  );
}
