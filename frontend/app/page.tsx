const resumo = [
  { titulo: "Faturamento no mês", valor: "R$ 0,00", detalhe: "Comece registrando sua primeira venda" },
  { titulo: "Despesas no mês", valor: "R$ 0,00", detalhe: "Nenhuma despesa registrada" },
  { titulo: "Lucro estimado", valor: "R$ 0,00", detalhe: "Será calculado com seus dados" },
  { titulo: "Pedidos em aberto", valor: "0", detalhe: "Tudo em dia por enquanto" },
];

const atalhos = [
  { titulo: "Nova venda", descricao: "Registre uma venda ou pedido" },
  { titulo: "Novo produto", descricao: "Cadastre produtos e ingredientes" },
  { titulo: "Nova despesa", descricao: "Anote um gasto do negócio" },
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>Nexo</strong>
            <small>Gestão do negócio</small>
          </div>
        </div>

        <nav className="menu" aria-label="Navegação principal">
          <a className="menu-item active" href="#dashboard">Dashboard</a>
          <a className="menu-item" href="#vendas">Vendas</a>
          <a className="menu-item" href="#produtos">Produtos</a>
          <a className="menu-item" href="#despesas">Despesas</a>
          <a className="menu-item" href="#clientes">Clientes</a>
          <a className="menu-item" href="#relatorios">Relatórios</a>
        </nav>

        <div className="sidebar-footer">
          <span>Plano Free</span>
          <small>Estrutura inicial do Nexo</small>
        </div>
      </aside>

      <section className="content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Dashboard</h1>
            <p className="subtitle">Acompanhe o que está acontecendo no seu negócio.</p>
          </div>
          <button className="primary-button" type="button">+ Nova venda</button>
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
              {atalhos.map((atalho) => (
                <button className="quick-action" type="button" key={atalho.titulo}>
                  <strong>{atalho.titulo}</strong>
                  <span>{atalho.descricao}</span>
                </button>
              ))}
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
