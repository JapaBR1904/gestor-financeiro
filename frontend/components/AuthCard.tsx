import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthCard({ titulo, descricao, children }: {
  titulo: string;
  descricao: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-brand" href="/login" aria-label="Nexo — login">
          <span aria-hidden="true">N</span><div><strong>Nexo</strong><small>Gestão financeira</small></div>
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">Seu espaço, com segurança</p>
          <h1 id="auth-title">{titulo}</h1>
          <p>{descricao}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
