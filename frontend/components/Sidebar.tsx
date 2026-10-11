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
        <svg className="nexo-signature" viewBox="0 0 240 170" role="presentation">
          <path className="nexo-signature-path nexo-signature-left" pathLength="1" d="M18 108 C52 108 72 89 101 78 C112 74 118 73 120 73" />
          <path className="nexo-signature-path nexo-signature-right" pathLength="1" d="M222 108 C188 108 168 89 139 78 C128 74 122 73 120 73" />
          <path className="nexo-signature-bridge" pathLength="1" d="M68 104 C91 91 102 88 120 73 C138 88 149 91 172 104" />
        </svg>
        <span className="nexo-signature-n">N</span>
        <span className="nexo-signature-word">NEXO</span>
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
