"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarCodigo, disponibilidadeAutenticacao } from "../../lib/auth";
import { emailValido } from "../../lib/formatacao";
import AuthCard from "../../components/AuthCard";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  useEffect(() => {
    let ativo = true;
    disponibilidadeAutenticacao().then(config => { if (ativo) setDisponivel(config.recuperacaoPorEmailDisponivel); })
      .catch(() => { if (ativo) setDisponivel(null); });
    return () => { ativo = false; };
  }, []);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando || disponivel === false) return;
    setErro("");
    if (!email.trim()) return setErro("Informe seu e-mail.");
    if (!emailValido(email)) return setErro("Informe um e-mail válido.");
    setEnviando(true);
    try {
      await solicitarCodigo(email, "recuperacao_senha");
      router.push(`/recuperar-senha?${new URLSearchParams({ email: email.trim() })}`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação.");
    } finally { setEnviando(false); }
  }
  return (
    <AuthCard titulo="Esqueceu sua senha?" descricao="Se existir uma conta com este e-mail, enviaremos um código de recuperação.">
      {disponivel === false ? <p role="status" className="form-error-banner">A recuperação por e-mail está indisponível neste ambiente. Tente novamente quando o envio estiver habilitado.</p> : null}
      <form className="auth-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        <label className="field"><span>E-mail</span><input aria-label="E-mail" type="email" autoComplete="email" required maxLength={180} value={email} onChange={(e) => { setEmail(e.target.value); setErro(""); }} /></label>
        {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
        <button className="primary-button auth-primary" type="submit" disabled={enviando || disponivel === false}>{enviando ? "Solicitando..." : "Enviar código de recuperação"}</button>
      </form>
      <p className="auth-switch"><Link href="/login">← Voltar para o login</Link></p>
    </AuthCard>
  );
}
