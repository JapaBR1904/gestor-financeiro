"use client";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { useWorkspace } from "../lib/workspace";
import { Icone } from "./Icone";
import { ControlesVisuais } from "./PreferenciasProvider";
import { BotaoCopiloto } from "./BotaoCopiloto";
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
      <Sidebar copilotoNoHeader />
      <section className="content" id="conteudo" tabIndex={-1}>
        <div className="workspace-bar">
          <div className="workspace-context" aria-label="Organização atual">
            <Icone nome="empresa" />
            <span title={usuario?.organizacaoNome}>{usuario?.organizacaoNome ?? "Seu espaço"}</span>
          </div>
          <div>
            <BotaoCopiloto />
            <Link
              href="/conta/assinatura"
              className="plan-pill"
              data-plan={config?.plano}
              key={config?.plano}
            >
              {config?.plano === "business"
                ? "Business"
                : config?.plano === "pro"
                  ? "Pro"
                  : config
                    ? "Free"
                    : "…"}
            </Link>
            <Link
              href="/conta"
              className="user-avatar"
              title={usuario?.nome}
              aria-label="Minha conta"
            >
              {usuario?.nome.slice(0, 1).toUpperCase() ?? "N"}
            </Link>
          </div>
        </div>
        <header className="topbar">
          <div>
            <h1>{titulo}</h1>
            {descricao ? <p className="subtitle">{descricao}</p> : null}
          </div>
          {acoes}
        </header>
        <ControlesVisuais />
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
