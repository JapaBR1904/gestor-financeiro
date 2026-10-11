"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { carregarClientes, Cliente, formatarTelefone } from "../../lib/clientes";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarClientes()
      .then(setClientes)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar os clientes."))
      .finally(() => setCarregando(false));
  }, []);

  const ativos = useMemo(() => clientes.filter((cliente) => cliente.ativo).length, [clientes]);

  return (
    <main className="app-shell">
      <Sidebar ativo="clientes" />
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Relacionamento</p>
            <h1>Clientes</h1>
            <p className="subtitle">Cadastre clientes e use essas informações nas vendas.</p>
          </div>
          <Link className="primary-button" href="/clientes/novo">+ Novo cliente</Link>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        <section className="summary-grid">
          <article className="summary-card"><span>Clientes cadastrados</span><strong>{carregando ? "—" : clientes.length}</strong><small>Total de clientes</small></article>
          <article className="summary-card"><span>Clientes ativos</span><strong>{carregando ? "—" : ativos}</strong><small>Disponíveis para novas vendas</small></article>
        </section>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">Cadastro</p><h2>Lista de clientes</h2><p className="subtitle">Consulte os contatos e abra os detalhes de cada cliente.</p></div></div>
          {carregando ? <div className="empty-state"><strong>Carregando clientes...</strong></div> : clientes.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">C</span><strong>Nenhum cliente cadastrado</strong><p>Cadastre o primeiro cliente para começar.</p></div>
          ) : (
            <div className="sales-history-list">
              <div className="sales-history-head" aria-hidden="true"><span>Cliente</span><span>Telefone / WhatsApp</span><span>Status</span><span></span><span></span><span></span></div>
              {clientes.map((cliente) => (
                <div className="sales-history-row" key={cliente.id}>
                  <div data-label="Cliente"><strong>{cliente.nome}</strong></div>
                  <div data-label="Telefone / WhatsApp"><strong>{formatarTelefone(cliente.telefone) || "—"}</strong></div>
                  <div data-label="Status"><span className={`status-badge ${cliente.ativo ? "status-active" : "status-inactive"}`}>{cliente.ativo ? "Ativo" : "Inativo"}</span></div>
                  <div></div>
                  <div></div>
                  <div className="sales-history-action"><Link className="secondary-button compact-button" href={`/clientes/${cliente.id}`}>Ver detalhes</Link></div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
