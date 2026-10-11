"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarCodigo } from "../../lib/auth";
import { capitalizarPalavras, emailValido } from "../../lib/formatacao";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!nome.trim()) return setErro("Informe seu nome.");
    if (!emailValido(email)) return setErro("Informe um e-mail válido.");

    setEnviando(true);
    try {
      await solicitarCodigo(email, "cadastro");
      const params = new URLSearchParams({
        email: email.trim(),
        finalidade: "cadastro",
        nome: nome.trim(),
      });
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
        <Link className="auth-back" href="/login">← Voltar para o login</Link>
        <div className="auth-brand"><span>N</span><div><strong>Nexo</strong><small>Gestão financeira</small></div></div>
        <div className="auth-heading">
          <p className="eyebrow">Primeiro acesso</p>
          <h1>Criar conta</h1>
          <p>Cadastre seus dados básicos. Depois você escolhe como quer usar o Nexo.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Seu nome</span>
            <input value={nome} onChange={(event) => setNome(capitalizarPalavras(event.target.value))} placeholder="Maria Oliveira" />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" />
          </label>
          {erro ? <p className="form-error-banner">{erro}</p> : null}
          <button className="primary-button auth-primary" type="submit" disabled={enviando}>{enviando ? "Enviando código..." : "Continuar"}</button>
        </form>

        <p className="auth-switch">Já tem conta? <Link href="/login">Entrar</Link></p>
      </section>
    </main>
  );
}
