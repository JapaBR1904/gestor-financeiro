"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "../lib/auth";

type SidebarProps = {
  ativo: "dashboard" | "vendas" | "produtos" | "despesas" | "clientes" | "relatorios";
};

const itens = [
  { chave: "dashboard", nome: "Dashboard", href: "/", icone: "D" },
  { chave: "vendas", nome: "Vendas", href: "/vendas", icone: "V" },
  { chave: "produtos", nome: "Produtos", href: "/produtos", icone: "P" },
  { chave: "despesas", nome: "Despesas", href: "/despesas", icone: "$" },
  { chave: "clientes", nome: "Clientes", href: "/clientes", icone: "C" },
  { chave: "relatorios", nome: "Relatórios", href: "/relatorios", icone: "R" },
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
      // Mesmo se a sessão já tiver expirado, o usuário deve voltar ao login.
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
          <small>Seu espaço financeiro</small>
        </div>
      </Link>

      <nav className="menu" aria-label="Navegação principal">
        {itens.map((item) => (
          <Link
            className={`menu-item${ativo === item.chave ? " active" : ""}`}
            href={item.href}
            key={item.chave}
          >
            <span className="menu-icon" aria-hidden="true">{item.icone}</span>
            <span>{item.nome}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-watermark" aria-hidden="true">
        <span className="sidebar-watermark-line line-one" />
        <span className="sidebar-watermark-line line-two" />
        <span className="sidebar-watermark-line line-three" />
        <span className="sidebar-watermark-n">N</span>
        <span className="sidebar-watermark-name">NEXO</span>
      </div>

      <div className="sidebar-footer">
        <button className="menu-item logout-button" type="button" onClick={handleLogout} disabled={saindo}>
          <span className="menu-icon" aria-hidden="true">↪</span>
          <span>{saindo ? "Saindo..." : "Fazer logout"}</span>
          <span className="logout-arrow" aria-hidden="true">→</span>
        </button>

        <div className="plan-card">
          <span>Plano Free</span>
          <small>Nexo em desenvolvimento</small>
        </div>
      </div>
    </aside>
  );
}
