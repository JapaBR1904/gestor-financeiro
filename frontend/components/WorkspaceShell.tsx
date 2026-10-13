"use client";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { useWorkspace } from "../lib/workspace";
export function WorkspaceShell({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { usuario, config, erro } = useWorkspace();
  return (
    <main className="app-shell">
      <Sidebar />
      <section className="content">
        <div className="workspace-bar">
          <span>{usuario?.organizacaoNome ?? "Seu espaço"}</span>
          <div>
            <Link href="/conta/assinatura" className="plan-pill">
              {config?.plano === "business"
                ? "Business"
                : config?.plano === "pro"
                  ? "Pro"
                  : config
                    ? "Free"
                    : "…"}
            </Link>
            <span className="user-avatar" title={usuario?.nome}>
              {usuario?.nome.slice(0, 1).toUpperCase() ?? "N"}
            </span>
          </div>
        </div>
        <header className="topbar">
          <div>
            <p className="eyebrow">Seu dinheiro, com clareza</p>
            <h1>{titulo}</h1>
            {descricao ? <p className="subtitle">{descricao}</p> : null}
          </div>
          {acoes}
        </header>
        {erro ? (
          <p className="form-error-banner" role="alert">
            {erro}{" "}
            <button
              className="text-button"
              onClick={() => window.dispatchEvent(new Event("nexo:workspace"))}
            >
              Tentar novamente
            </button>
          </p>
        ) : null}
        {children}
      </section>
    </main>
  );
}
