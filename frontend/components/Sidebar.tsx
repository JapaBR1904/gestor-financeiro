"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "../lib/auth";

type SidebarProps = {
  ativo: "dashboard" | "vendas" | "produtos" | "despesas" | "clientes" | "relatorios";
};

const itens = [
  { chave: "dashboard", nome: "Dashboard", href: "/", disponivel: true },
  { chave: "vendas", nome: "Vendas", href: "/vendas", disponivel: true },
  { chave: "produtos", nome: "Produtos", href: "/produtos", disponivel: true },
  { chave: "despesas", nome: "Despesas", href: "/despesas", disponivel: true },
  { chave: "clientes", nome: "Clientes", href: "/clientes", disponivel: true },
  { chave: "relatorios", nome: "Relatórios", href: "/relatorios", disponivel: true },
] as const;

export function Sidebar({ ativo }: SidebarProps) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    if (saindo) return;
    setSaindo(true);
    try {
      await logout();
    } catch {
      // Mesmo se o backend já considerar a sessão encerrada, devolvemos o usuário ao login.
    } finally {
      router.push("/login");
      router.refresh();
      setSaindo(false);
    }
  }

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
        <button className="menu-item" type="button" onClick={handleLogout} disabled={saindo}>
          {saindo ? "Saindo..." : "Sair"}
        </button>
        <span>Plano Free</span>
        <small>Estrutura inicial do Nexo</small>
      </div>
    </aside>
  );
}
