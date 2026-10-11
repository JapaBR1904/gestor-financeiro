"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FinalidadeAuth, verificarCodigo } from "../../lib/auth";

export default function VerificarCodigoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const finalidade = (searchParams.get("finalidade") === "cadastro" ? "cadastro" : "login") as FinalidadeAuth;
  const nome = searchParams.get("nome") ?? "";
  const organizacaoNome = searchParams.get("organizacaoNome") ?? "";

  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [validando, setValidando] = useState(false);

  const emailMascarado = useMemo(() => {
    const [usuario, dominio] = email.split("@");
    if (!usuario || !dominio) return email;
    const visivel = usuario.slice(0, Math.min(2, usuario.length));
    return `${visivel}${"•".repeat(Math.max(2, usuario.length - visivel.length))}@${dominio}`;
  }, [email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    const codigoLimpo = codigo.replace(/\D/g, "").slice(0, 6);
    if (codigoLimpo.length !== 6) {
      setErro("Digite os 6 dígitos do código.");
      return;
    }

    setValidando(true);
    try {
      await verificarCodigo({ email, codigo: codigoLimpo, finalidade, nome, organizacaoNome });
      router.push(finalidade === "cadastro" ? "/onboarding" : "/");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível validar o código.");
    } finally {
      setValidando(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="auth-back" href="/login">← Voltar para o login</Link>
        <div className="auth-brand"><span>N</span><div><strong>Nexo</strong><small>Gestão financeira</small></div></div>
        <div className="auth-heading">
          <p className="eyebrow">Confirmação</p>
          <h1>Digite o código</h1>
          <p>Enviamos um código de 6 dígitos para <strong>{emailMascarado || "seu e-mail"}</strong>. Ele expira em 10 minutos.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Código de acesso</span>
            <input
              className="auth-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </label>
          {erro ? <p className="form-error-banner">{erro}</p> : null}
          <button className="primary-button auth-primary" type="submit" disabled={validando}>{validando ? "Validando..." : "Confirmar código"}</button>
        </form>

        <p className="auth-switch">Usou o e-mail errado? <Link href="/login">Voltar e corrigir</Link></p>
      </section>
    </main>
  );
}
