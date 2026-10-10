import { Sidebar } from "../../components/Sidebar";

export default function ProdutosPage() {
  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>Produtos</h1>
            <p className="subtitle">Cadastre o que você vende e, depois, conecte ingredientes e custos.</p>
          </div>
          <button className="primary-button" type="button" disabled title="O formulário será criado na próxima etapa">
            + Novo produto
          </button>
        </header>

        <article className="panel activity-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Seus produtos</p>
              <h2>Catálogo vazio</h2>
            </div>
          </div>

          <div className="empty-state">
            <span className="empty-icon">P</span>
            <strong>Nenhum produto cadastrado</strong>
            <p>Na próxima etapa, este botão vai abrir o formulário de cadastro de produto.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
