import Link from "next/link";

type SidebarProps = {
  ativo: "dashboard" | "produtos";
};

const itens = [
  { chave: "dashboard", nome: "Dashboard", href: "/", disponivel: true },
  { chave: "vendas", nome: "Vendas", href: "/vendas", disponivel: false },
  { chave: "produtos", nome: "Produtos", href: "/produtos", disponivel: true },
  { chave: "despesas", nome: "Despesas", href: "/despesas", disponivel: false },
  { chave: "clientes", nome: "Clientes", href: "/clientes", disponivel: false },
  { chave: "relatorios", nome: "Relatórios", href: "/relatorios", disponivel: false },
] as const;

export function Sidebar({ ativo }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/">
        <span className="brand-mark">N</span>
        <div>
          <strong>Nexo</strong>
          <small>Gestão do negócio</small>
        </div>
      </Link>

      <nav className="menu" aria-label="Navegação principal">
        {itens.map((item) =>
          item.disponivel ? (
            <Link
              className={`menu-item${ativo === item.chave ? " active" : ""}`}
              href={item.href}
              key={item.chave}
            >
              {item.nome}
            </Link>
          ) : (
            <span className="menu-item menu-item-disabled" key={item.chave}>
              {item.nome}
              <small>Em breve</small>
            </span>
          ),
        )}
      </nav>

      <div className="sidebar-footer">
        <span>Plano Free</span>
        <small>Estrutura inicial do Nexo</small>
      </div>
    </aside>
  );
}
