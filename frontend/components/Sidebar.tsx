"use client";
import { Icone, type NomeIcone } from "./Icone";
import { Marca } from "./Marca";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { logout } from "../lib/auth";
import { useWorkspace } from "../lib/workspace";
import { nomePlano, planoPermite } from "../lib/planos";
import { BotaoCopiloto } from "./BotaoCopiloto";

type ItemMenu = {
  href: string;
  nome: string;
  icone: NomeIcone;
  plano?: "pro" | "business";
};
type GrupoMenu = { nome: string; itens: ItemMenu[] };

function gruposDoPerfil(perfil: "pessoal" | "negocio" | "empresa" | null | undefined): GrupoMenu[] {
  if (perfil === "pessoal") {
    return [
      {
        nome: "Seu dinheiro",
        itens: [
          { href: "/dashboard", nome: "Resumo", icone: "painel" },
          { href: "/pessoal", nome: "Movimentações", icone: "movimentos" },
        ],
      },
      {
        nome: "Planejamento",
        itens: [
          { href: "/metas", nome: "Metas", icone: "meta", plano: "pro" },
          { href: "/fluxo-caixa", nome: "Análise do período", icone: "fluxo", plano: "pro" },
        ],
      },
      {
        nome: "",
        itens: [{ href: "/ia", nome: "Nexo IA", icone: "ia", plano: "pro" }],
      },
      {
        nome: "Conta",
        itens: [
          { href: "/conta", nome: "Perfil e privacidade", icone: "conta" },
          { href: "/conta/assinatura", nome: "Assinatura", icone: "relatorio" },
        ],
      },
    ];
  }
  return [
    {
      nome: "Dia a dia",
      itens: [
        { href: "/dashboard", nome: "Resumo", icone: "painel" },
        { href: "/pessoal", nome: "Movimentações", icone: "movimentos" },
        { href: "/vendas", nome: "Vendas", icone: "venda" },
        { href: "/despesas", nome: "Despesas", icone: "despesa" },
      ],
    },
    {
      nome: "Cadastros",
      itens: [
        { href: "/produtos", nome: "Produtos", icone: "produto" },
        { href: "/clientes", nome: "Clientes", icone: "clientes" },
      ],
    },
    {
      nome: "Análises",
      itens: [
        { href: "/fluxo-caixa", nome: "Por período", icone: "fluxo", plano: "pro" },
        { href: "/metas", nome: "Metas", icone: "meta", plano: "pro" },
        { href: "/relatorios", nome: "Histórico comercial", icone: "relatorio" },
      ],
    },
    {
      nome: "Gestão",
      itens: [
        { href: "/empresa", nome: "Espaço", icone: "empresa" },
        { href: "/equipe", nome: "Equipe", icone: "equipe", plano: "business" },
        { href: "/documentos", nome: "Documentos", icone: "documento", plano: "business" },
      ],
    },
    {
      nome: "",
      itens: [{ href: "/ia", nome: "Nexo IA", icone: "ia", plano: "pro" }],
    },
    {
      nome: "Conta",
      itens: [
        { href: "/conta", nome: "Perfil e privacidade", icone: "conta" },
        { href: "/conta/assinatura", nome: "Assinatura", icone: "relatorio" },
      ],
    },
  ];
}

function GrupoNavegacao({ nome, recolhivel, expandido, alternar, children }: {
  nome: string; recolhivel: boolean; expandido: boolean; alternar: () => void; children: ReactNode;
}) {
  const id = useId();
  if (!nome) return <div className="nav-group nav-group-standalone">{children}</div>;
  return <div className="nav-group">
    {recolhivel ? <button className="nav-group-label nav-group-toggle" aria-expanded={expandido} aria-controls={id} onClick={alternar}>{nome}<Icone nome="expandir"/></button> : <span className="nav-group-label">{nome}</span>}
    <div id={id} className="nav-group-items" data-expanded={expandido} aria-hidden={!expandido} inert={!expandido}><div>{children}</div></div>
  </div>;
}

export function Sidebar(props: {
  copilotoNoHeader?: boolean;
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
  const grupos = gruposDoPerfil(config?.perfilUso);
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState("");
  const travaSaida = useRef(false);
  const [aberto, setAberto] = useState(false);
  const [fechando, setFechando] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const desktop = useRef<HTMLElement>(null);
  const fecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  function fechar() {
    if (fechando) return;
    setFechando(true);
    const duracao = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 120;
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
    const media = window.matchMedia("(min-width: 1024px)");
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

  useEffect(() => {
    const menus = [desktop.current, aberto ? dialog.current : null]
      .map((raiz) => raiz?.querySelector<HTMLElement>(".menu"))
      .filter((menu): menu is HTMLElement => Boolean(menu));
    const ajustar = () => {
      for (const menu of menus) {
        const atual = menu.querySelector<HTMLElement>('[aria-current="page"]');
        if (!atual || !menu.clientHeight) continue;
        const inicio =
          atual.getBoundingClientRect().top -
          menu.getBoundingClientRect().top +
          menu.scrollTop;
        const fim = inicio + atual.offsetHeight;
        if (inicio < menu.scrollTop) menu.scrollTop = inicio;
        else if (fim > menu.scrollTop + menu.clientHeight)
          menu.scrollTop = fim - menu.clientHeight;
      }
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    menus.forEach((menu) => observador.observe(menu));
    return () => observador.disconnect();
  }, [pathname, aberto]);

  async function sair() {
    if (travaSaida.current) return;
    travaSaida.current = true;
    setSaindo(true);
    setErroSaida("");
    try {
      await logout();
      router.replace("/");
    } catch (erro) {
      setErroSaida(erro instanceof Error ? erro.message : "Não foi possível encerrar a sessão. Tente novamente.");
    } finally {
      travaSaida.current = false;
      setSaindo(false);
    }
  }
  const marca = (
    <Link
      className="brand"
      href="/dashboard"
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
        {grupos.map((grupo) => {
          const estaAtiva = (href: string) => pathname === href || (
            !["/dashboard", "/conta"].includes(href) && pathname.startsWith(`${href}/`)
          );
          const grupoAtivo = grupo.itens.some(item => estaAtiva(item.href));
          const recolhivel = ["Planejamento", "Cadastros", "Análises", "Gestão", "Conta"].includes(grupo.nome);
          const expandido = grupoAtivo || !recolhivel || Boolean(gruposAbertos[grupo.nome]);
          return <GrupoNavegacao key={grupo.nome || "nexo-ia"} nome={grupo.nome} recolhivel={recolhivel} expandido={expandido} alternar={() => setGruposAbertos(atual => ({ ...atual, [grupo.nome]: !expandido }))}>
            {grupo.itens.map((item) => {
              const ativo = estaAtiva(item.href) || (!pathname && props.ativo === "dashboard" && item.href === "/dashboard");
              const minimo = item.plano ?? null;
              const bloqueado = minimo && config && !planoPermite(config.plano, minimo);
              return <Link className={`menu-item${ativo ? " active" : ""}`} href={item.href} key={item.href} aria-current={ativo ? "page" : undefined} onClick={() => { if (aberto) fechar(); }}>
                <span className="menu-icon"><Icone nome={item.icone} /></span><span>{item.nome}</span>
                {bloqueado ? <span className="nav-lock" title={`Disponível no ${nomePlano(minimo)}`}>{nomePlano(minimo)}</span> : null}
              </Link>;
            })}
          </GrupoNavegacao>;
        })}
      </nav>
      <div className="sidebar-footer">
      {!props.copilotoNoHeader ? <BotaoCopiloto /> : null}
      {erroSaida ? <p className="sidebar-feedback" role="alert">{erroSaida} A saída não foi confirmada. Use Sair para tentar novamente.</p> : null}
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
        {!props.copilotoNoHeader ? <BotaoCopiloto /> : null}
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
      <aside className="sidebar" ref={desktop}>
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
