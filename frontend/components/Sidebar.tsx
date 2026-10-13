"use client";
import { Icone } from "./Icone";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "../lib/auth";
import { useWorkspace } from "../lib/workspace";
import { nomePlano, planoPermite } from "../lib/planos";

const grupos = [
  {
    nome: "Visão financeira",
    itens: [
      { href: "/", nome: "Visão geral", icone: "painel" },
      { href: "/pessoal", nome: "Lançamentos", icone: "movimentos" },
      { href: "/relatorios", nome: "Relatórios", icone: "relatorio" },
    ],
  },
  {
    nome: "Operação",
    itens: [
      { href: "/vendas", nome: "Vendas", icone: "venda" },
      { href: "/despesas", nome: "Despesas", icone: "despesa" },
      { href: "/produtos", nome: "Produtos", icone: "produto" },
      { href: "/clientes", nome: "Clientes", icone: "clientes" },
    ],
  },
  {
    nome: "Planejamento",
    itens: [
      { href: "/metas", nome: "Metas", icone: "meta", plano: "pro" },
      {
        href: "/fluxo-caixa",
        nome: "Fluxo e comparativos",
        icone: "fluxo",
        plano: "pro",
      },
      { href: "/ia", nome: "Assistente IA", icone: "ia", plano: "pro" },
    ],
  },
  {
    nome: "Empresa",
    itens: [
      { href: "/empresa", nome: "Organização", icone: "empresa" },
      { href: "/equipe", nome: "Equipe", icone: "equipe", plano: "business" },
      {
        href: "/documentos",
        nome: "Documentos",
        icone: "documento",
        plano: "business",
      },
    ],
  },
] as const;
export function Sidebar(_props: {
  ativo?:
    | "dashboard"
    | "vendas"
    | "produtos"
    | "despesas"
    | "clientes"
    | "relatorios";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { config, usuario } = useWorkspace();
  const [saindo, setSaindo] = useState(false);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, []);
  async function sair() {
    if (saindo) return;
    setSaindo(true);
    try {
      await logout();
    } catch {
      /* Sessão expirada também permite voltar ao login. */
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  return (
    <aside className={`sidebar${aberto ? " sidebar-open" : ""}`}>
      <div className="sidebar-brand-row">
        <Link className="brand" href="/">
          <span className="brand-mark">N</span>
          <div>
            <strong>Nexo</strong>
            <small title={usuario?.organizacaoNome}>
              {usuario?.organizacaoNome ?? "Seu espaço financeiro"}
            </small>
          </div>
        </Link>
        <button
          className="menu-toggle"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
        >
          <Icone nome="menu" />
        </button>
      </div>
      <nav className="menu" aria-label="Navegação principal">
        {grupos
          .filter(
            (grupo) =>
              config?.perfilUso !== "pessoal" || grupo.nome !== "Operação",
          )
          .map((grupo) => (
            <div className="nav-group" key={grupo.nome}>
              <span className="nav-group-label">{grupo.nome}</span>
              {grupo.itens.map((item) => {
                const rotaPreferida =
                  _props.ativo === "dashboard"
                    ? "/"
                    : _props.ativo
                      ? `/${_props.ativo}`
                      : null;
                const ativo =
                  pathname === item.href ||
                  (!pathname && rotaPreferida === item.href) ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/"));
                const minimo = "plano" in item ? item.plano : null;
                const bloqueado =
                  minimo && config && !planoPermite(config.plano, minimo);
                return (
                  <Link
                    className={`menu-item${ativo ? " active" : ""}`}
                    href={item.href}
                    key={item.href}
                    aria-current={ativo ? "page" : undefined}
                    onClick={() => setAberto(false)}
                  >
                    <span className="menu-icon" aria-hidden="true">
                      <Icone nome={item.icone} />
                    </span>
                    <span>{item.nome}</span>
                    {bloqueado ? (
                      <span
                        className="nav-lock"
                        title={`Disponível no ${nomePlano(minimo)}`}
                      >
                        {nomePlano(minimo)}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
      </nav>
      <div className="sidebar-footer">
        <Link className="menu-item" href="/conta">
          <span className="menu-icon">
            <Icone nome="conta" />
          </span>
          <span>Conta e assinatura</span>
        </Link>
        <Link className="plan-card" href="/planos">
          <strong>{config ? nomePlano(config.plano) : "Seu plano"}</strong>
          <small>
            {config?.plano === "business"
              ? "Gestão compartilhada"
              : "Conhecer outros planos"}{" "}
            →
          </small>
        </Link>
        <button
          aria-label={saindo ? "Saindo…" : "Sair"}
          className="menu-item logout-button"
          onClick={sair}
          disabled={saindo}
        >
          <span className="menu-icon">
            <Icone nome="sair" />
          </span>
          {saindo ? "Saindo…" : "Sair"}
        </button>
      </div>
    </aside>
  );
}
