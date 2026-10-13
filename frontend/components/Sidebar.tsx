"use client";
import { Icone } from "./Icone";
import { Marca } from "./Marca";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
export function Sidebar(props: {
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
  const [fechando, setFechando] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  function fechar() {
    if (fechando) return;
    setFechando(true);
    const duracao = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 140;
    fecharTimer.current = setTimeout(() => {
      dialog.current?.close();
      setAberto(false);
      setFechando(false);
      toggle.current?.focus();
    }, duracao);
  }
  useEffect(() => {
    if (!aberto) return;
    const elemento = dialog.current;
    elemento?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 901px)");
    const ajustar = () => {
      if (media.matches) {
        if (fecharTimer.current) clearTimeout(fecharTimer.current);
        elemento?.close();
        setAberto(false);
        setFechando(false);
      }
    };
    media.addEventListener("change", ajustar);
    return () => {
      document.body.style.overflow = overflow;
      media.removeEventListener("change", ajustar);
      if (fecharTimer.current) clearTimeout(fecharTimer.current);
    };
  }, [aberto]);

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    try {
      await logout();
    } catch {
      /* Uma sessão expirada também pode sair. */
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  const marca = (
    <Link
      className="brand"
      href="/"
      onClick={() => {
        if (aberto) fechar();
      }}
    >
      <span className="brand-mark">
        <Marca />
      </span>
      <div>
        <strong>Nexo</strong>
        <small>Clareza para ir além.</small>
      </div>
    </Link>
  );
  const navegacao = (
    <>
      <Link
        href="/empresa"
        className="sidebar-organization"
        aria-label="Trocar organização"
        onClick={() => {
          if (aberto) fechar();
        }}
      >
        <Icone nome="empresa" />
        <div>
          <strong title={usuario?.organizacaoNome}>
            {usuario?.organizacaoNome ?? "Seu espaço financeiro"}
          </strong>
          <small>Trocar organização</small>
        </div>
        <Icone nome="chevrons" />
      </Link>
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
                const preferida =
                  props.ativo === "dashboard"
                    ? "/"
                    : props.ativo
                      ? `/${props.ativo}`
                      : null;
                const ativo =
                  pathname === item.href ||
                  (!pathname && preferida === item.href) ||
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
                    onClick={() => {
                      if (aberto) fechar();
                    }}
                  >
                    <span className="menu-icon">
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
        <Link
          className="plan-card"
          data-plan={config?.plano}
          href="/planos"
          onClick={() => {
            if (aberto) fechar();
          }}
        >
          <div>
            <strong>Plano {config ? nomePlano(config.plano) : "Nexo"}</strong>
            <small>
              {config?.plano === "business"
                ? "Gestão compartilhada"
                : "Conhecer outros planos"}
            </small>
          </div>
          <Icone nome="seta" />
        </Link>
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {usuario?.nome.slice(0, 1).toUpperCase() ?? "N"}
          </span>
          <Link
            href="/conta"
            onClick={() => {
              if (aberto) fechar();
            }}
          >
            <strong>{usuario?.nome ?? "Sua conta"}</strong>
            <small>Conta e assinatura</small>
          </Link>
          <button
            aria-label={saindo ? "Saindo…" : "Sair"}
            className="logout-button"
            onClick={sair}
            disabled={saindo}
          >
            <Icone nome="sair" />
          </button>
        </div>
      </div>
    </>
  );
  return (
    <>
      <div className="mobile-nav-bar">
        {marca}
        <button
          ref={toggle}
          className="menu-toggle"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          aria-controls="nexo-navegacao-mobile"
          onClick={() => setAberto(true)}
        >
          <Icone nome="menu" />
        </button>
      </div>
      <aside className="sidebar">
        <div className="sidebar-brand-row">{marca}</div>
        {navegacao}
      </aside>
      <dialog
        ref={dialog}
        id="nexo-navegacao-mobile"
        className="navigation-drawer"
        aria-label="Navegação do Nexo"
        data-closing={fechando}
        onCancel={(e) => {
          e.preventDefault();
          fechar();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const itens = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not(:disabled), [tabindex="0"]',
            ),
          ).filter((item) => item.getClientRects().length > 0);
          const primeiro = itens[0],
            ultimo = itens[itens.length - 1];
          if (e.shiftKey && document.activeElement === primeiro) {
            e.preventDefault();
            ultimo?.focus();
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primeiro?.focus();
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX > r.right ||
              e.clientX < r.left ||
              e.clientY > r.bottom ||
              e.clientY < r.top
            )
              fechar();
          }
        }}
      >
        <div className="sidebar-brand-row">
          {marca}
          <button
            className="menu-toggle"
            aria-label="Fechar menu"
            onClick={fechar}
          >
            <Icone nome="fechar" />
          </button>
        </div>
        {navegacao}
      </dialog>
    </>
  );
}
