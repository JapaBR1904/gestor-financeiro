import Link from "next/link";

type SidebarProps = {
  ativo: "dashboard" | "vendas" | "produtos" | "despesas" | "clientes" | "relatorios";
};

const itens = [
  { chave: "dashboard", nome: "Dashboard", href: "/" },
  { chave: "vendas", nome: "Vendas", href: "/vendas" },
  { chave: "produtos", nome: "Produtos", href: "/produtos" },
  { chave: "despesas", nome: "Despesas", href: "/despesas" },
  { chave: "clientes", nome: "Clientes", href: "/clientes" },
  { chave: "relatorios", nome: "Relatórios", href: "/relatorios" },
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
        {itens.map((item) => (
          <Link
            className={`menu-item${ativo === item.chave ? " active" : ""}`}
            href={item.href}
            key={item.chave}
          >
            {item.nome}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>Plano Free</span>
        <small>Estrutura inicial do Nexo</small>
      </div>
    </aside>
  );
}
