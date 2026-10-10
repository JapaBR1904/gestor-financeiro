import Link from "next/link";
import { Sidebar } from "../components/Sidebar";

const resumo = [
  { titulo: "Faturamento no mês", valor: "R$ 0,00", detalhe: "Comece registrando sua primeira venda" },
  { titulo: "Despesas no mês", valor: "R$ 0,00", detalhe: "Nenhuma despesa registrada" },
  { titulo: "Lucro estimado", valor: "R$ 0,00", detalhe: "Será calculado com seus dados" },
  { titulo: "Pedidos em aberto", valor: "0", detalhe: "Tudo em dia por enquanto" },
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <Sidebar ativo="dashboard" />

      <section className="content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Dashboard</h1>
            <p className="subtitle">Acompanhe o que está acontecendo no seu negócio.</p>
          </div>
          <button className="primary-button" type="button" disabled title="Módulo de vendas será criado em breve">
            + Nova venda
          </button>
        </header>

        <section className="summary-grid" aria-label="Resumo financeiro">
          {resumo.map((item) => (
            <article className="summary-card" key={item.titulo}>
              <span>{item.titulo}</span>
              <strong>{item.valor}</strong>
              <small>{item.detalhe}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Comece por aqui</p>
                <h2>Ações rápidas</h2>
              </div>
            </div>

            <div className="quick-actions">
              <button className="quick-action" type="button" disabled>
                <strong>Nova venda</strong>
                <span>Disponível quando o módulo de vendas for criado</span>
              </button>

              <Link className="quick-action" href="/produtos">
                <strong>Novo produto</strong>
                <span>Abra o cadastro de produtos e ingredientes</span>
              </Link>

              <button className="quick-action" type="button" disabled>
                <strong>Nova despesa</strong>
                <span>Disponível quando o módulo de despesas for criado</span>
              </button>
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Hoje</p>
                <h2>Movimentações recentes</h2>
              </div>
            </div>

            <div className="empty-state">
              <span className="empty-icon">N</span>
              <strong>Nenhuma movimentação ainda</strong>
              <p>Vendas, pedidos e despesas recentes vão aparecer aqui.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
