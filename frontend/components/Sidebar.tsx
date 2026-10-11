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
          <path
            id="nexo-signature-loop"
            className="nexo-signature-loop"
            pathLength="1"
            d="M22 92 C44 46 90 42 120 74 C149 105 176 126 218 92 C190 55 151 45 120 74 C91 102 57 122 22 92"
          />
          <circle className="nexo-signature-head" r="3.4">
            <animateMotion dur="1.85s" begin="0.08s" fill="freeze" calcMode="linear">
              <mpath href="#nexo-signature-loop" />
            </animateMotion>
          </circle>
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
          <Link className="plan-card-link" href="/conta/assinatura">
            <strong>Plano e assinatura</strong>
            <small>Gerencie seu plano Nexo</small>
          </Link>
        </div>
      </div>
    </aside>
  );
}
