"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarCodigo } from "../../lib/auth";
import { emailValido } from "../../lib/formatacao";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!emailValido(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }

    setEnviando(true);
    try {
      await solicitarCodigo(email, "login");
      const params = new URLSearchParams({ email: email.trim(), finalidade: "login" });
      router.push(`/verificar-codigo?${params.toString()}`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar o código.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span>N</span><div><strong>Nexo</strong><small>Gestão financeira</small></div></div>
        <div className="auth-heading">
          <p className="eyebrow">Acesso seguro</p>
          <h1>Entrar</h1>
          <p>Digite seu e-mail. Vamos enviar um código de 6 dígitos para confirmar seu acesso.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              aria-invalid={Boolean(erro)}
            />
          </label>
          {erro ? <p className="form-error-banner">{erro}</p> : null}
          <button className="primary-button auth-primary" type="submit" disabled={enviando}>
            {enviando ? "Enviando código..." : "Receber código"}
          </button>
        </form>

        <p className="auth-switch">Ainda não tem conta? <Link href="/cadastro">Criar conta</Link></p>
      </section>
    </main>
  );
}
