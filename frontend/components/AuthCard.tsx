import Link from "next/link";
import type { ReactNode } from "react";
import { Marca } from "./Marca";
import { Icone } from "./Icone";

export default function AuthCard({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-story" aria-label="Conheça o Nexo">
          <div className="auth-constellation" aria-hidden="true">
            <span />
            <span />
            <Marca />
          </div>
          <div className="auth-story-label">
            <Marca />
            Seu dinheiro, com clareza
          </div>
          <div>
            <h2>Mais espaço para o que importa.</h2>
            <p>
              Organize o presente e enxergue seus próximos passos com
              tranquilidade.
            </p>
            <ul>
              <li>
                <Icone nome="movimentos" />
                <div>
                  <strong>Uma visão completa</strong>
                  <small>Entradas, gastos e resultado no mesmo lugar.</small>
                </div>
              </li>
              <li>
                <Icone nome="meta" />
                <div>
                  <strong>Objetivos que ganham forma</strong>
                  <small>Metas e análises para seguir em frente.</small>
                </div>
              </li>
              <li>
                <Icone nome="empresa" />
                <div>
                  <strong>Um espaço para cada momento</strong>
                  <small>Finanças pessoais, negócio e equipe.</small>
                </div>
              </li>
            </ul>
          </div>
          <div className="auth-story-footer">Seu espaço. Suas decisões.</div>
        </aside>
        <section
          className="auth-card"
          id="conteudo"
          tabIndex={-1}
          aria-labelledby="auth-title"
        >
          <Link className="auth-brand" href="/" aria-label="Nexo — página inicial">
            <span>
              <Marca />
            </span>
            <div>
              <strong>Nexo</strong>
              <small>Gestão financeira</small>
            </div>
          </Link>
          <div className="auth-heading">
            <p className="eyebrow">Seu espaço, com segurança</p>
            <h1 id="auth-title">{titulo}</h1>
            <p>{descricao}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
