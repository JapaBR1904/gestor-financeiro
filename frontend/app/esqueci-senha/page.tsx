"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarCodigo } from "../../lib/auth";
import AuthCard from "../../components/AuthCard";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    setErro(""); setEnviando(true);
    try {
      await solicitarCodigo(email, "recuperacao_senha");
      router.push(`/recuperar-senha?${new URLSearchParams({ email: email.trim() })}`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação.");
    } finally { setEnviando(false); }
  }
  return (
    <AuthCard titulo="Esqueceu sua senha?" descricao="Se existir uma conta com este e-mail, enviaremos um código de recuperação.">
      <form className="auth-form" onSubmit={enviar} aria-busy={enviando}>
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" required maxLength={180} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
        <button className="primary-button auth-primary" type="submit" disabled={enviando}>{enviando ? "Solicitando..." : "Enviar código de recuperação"}</button>
      </form>
      <p className="auth-switch"><Link href="/login">← Voltar para o login</Link></p>
    </AuthCard>
  );
}
