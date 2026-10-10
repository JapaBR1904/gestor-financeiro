import Link from "next/link";
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
          <Link className="primary-button" href="/produtos/novo">
            + Novo produto
          </Link>
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
            <p>Use o botão “Novo produto” para abrir o formulário e validar os primeiros dados.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
