"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Marca } from "./Marca";
import { WorkspaceShell } from "./WorkspaceShell";
import { Contexto, Workspace } from "../lib/workspace";
import { usePathname } from "next/navigation";
import { carregarUsuarioAtual } from "../lib/auth";
import { carregarConfiguracaoSaas } from "../lib/saas";
import { carregarAssinatura } from "../lib/assinatura";
import { PreferenciasProvider } from "./PreferenciasProvider";
import { CopilotoProvider } from "./CopilotoProvider";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const [estado, setEstado] = useState<Omit<Workspace, "atualizar">>({
    usuario: null,
    config: null,
    assinatura: null,
    erro: "",
  });
  const sequencia = useRef(0);
  const atualizar = useCallback(async () => {
    const pedido = ++sequencia.current;
    try {
      const [usuario, config, assinatura] = await Promise.all([
        carregarUsuarioAtual(),
        carregarConfiguracaoSaas(),
        carregarAssinatura(),
      ]);
      if (pedido === sequencia.current)
        setEstado({ usuario, config, assinatura, erro: "" });
    } catch (error) {
      if (pedido === sequencia.current)
        setEstado({
          usuario: null, config: null, assinatura: null,
          erro:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar seu espaço.",
        });
    }
  }, []);
  const publico = caminho === "/" || /^\/(login|cadastro|verificar-codigo|esqueci-senha|redefinir-senha|recuperar-senha|convite)(\/|$)/.test(caminho);
  useEffect(() => {
    if (publico) {
      const pedido = ++sequencia.current;
      queueMicrotask(() => {
        if (pedido === sequencia.current)
          setEstado({
            usuario: null,
            config: null,
            assinatura: null,
            erro: "",
          });
      });
      return;
    }
    const controle = sequencia;
    let ativo = true;
    queueMicrotask(() => { if (ativo) void atualizar(); });
    const ouvir = () => {
      void atualizar();
    };
    window.addEventListener("nexo:workspace", ouvir);
    return () => {
      window.removeEventListener("nexo:workspace", ouvir);
      ativo = false;
      controle.current++;
    };
  }, [caminho, publico, atualizar]);
  if (!publico && !estado.usuario)
    return (
      <main className="auth-shell">
        <section
          className="auth-card workspace-loading"
          id="conteudo"
          tabIndex={-1}
        >
          <div className="brand-loading"><Marca/><h1>Nexo</h1></div>
          {estado.erro ? (
            <>
              <p className="form-error-banner" role="alert">
                {estado.erro}
              </p>
              <button
                className="primary-button"
                onClick={() => void atualizar()}
              >
                Tentar novamente
              </button>
              <Link className="text-button" href="/login">Entrar novamente</Link>
            </>
          ) : (
            <>
              <p role="status">Carregando seu espaço…</p>
              <div className="skeleton" aria-hidden="true" />
              <div className="skeleton" aria-hidden="true" />
            </>
          )}
        </section>
      </main>
    );
  const compartilhadoSuspenso =
    estado.usuario?.papel !== "proprietario" &&
    estado.config?.plano !== "business" &&
    !/^\/(empresa|conta|planos|checkout)(\/|$)/.test(caminho);
  return (
    <Contexto.Provider value={{ ...estado, atualizar }}>
      <PreferenciasProvider>
      <CopilotoProvider key={estado.usuario ? `${estado.usuario.id}:${estado.usuario.organizacaoId}` : "publico"}>
      <div
        key={
          estado.usuario
            ? `${estado.usuario.id}-${estado.usuario.organizacaoId}`
            : "sem-sessao"
        }
        data-role={estado.usuario?.papel ?? "carregando"}
      >
        {!publico && compartilhadoSuspenso ? (
          <WorkspaceShell
            titulo="Acesso compartilhado suspenso"
            descricao="Este espaço precisa do Business para colaboração."
          >
            <section className="product-lock">
              <h2>Seus dados continuam preservados</h2>
              <p>
                O proprietário pode reativar o Business. Você pode continuar
                usando seu espaço pessoal, com seus próprios dados e plano.
              </p>
              <Link className="primary-button" href="/empresa">
                Abrir meus espaços
              </Link>
            </section>
          </WorkspaceShell>
        ) : (
          children
        )}
      </div>
      </CopilotoProvider>
      </PreferenciasProvider>
    </Contexto.Provider>
  );
}
