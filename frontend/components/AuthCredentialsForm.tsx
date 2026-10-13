"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { cadastrar, login } from "../lib/auth";
import { emailValido } from "../lib/formatacao";
import { carregarConfiguracaoSaas } from "../lib/saas";
import { validarSenha } from "../lib/politica-senha";
import AuthCard from "./AuthCard";
import PasswordFields from "./PasswordFields";
import { destinoConvite, fragmentoConvite } from "../lib/convite";

export default function AuthCredentialsForm({ cadastro = false }: { cadastro?: boolean }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    setErro("");
    if (!email.trim()) return setErro("Informe seu e-mail.");
    if (!emailValido(email)) return setErro("Informe um e-mail válido.");
    if (cadastro) {
      if (!nome.trim()) return setErro("Informe seu nome.");
      const erroSenha = validarSenha(senha, confirmacao);
      if (erroSenha) return setErro(erroSenha);
    }
    if (!senha.trim()) return setErro("Informe sua senha.");
    setEnviando(true);
    try {
      if (cadastro) {
        await cadastrar({ nome, email, senha, confirmacaoSenha: confirmacao });
        setSenha(""); setConfirmacao("");
        router.push(`/verificar-codigo?${new URLSearchParams({ email: email.trim() })}${fragmentoConvite()}`);
      } else {
        await login(email, senha);
        setSenha("");
        const configuracao = await carregarConfiguracaoSaas();
        const destino = configuracao.perfilUso === "pessoal" ? "/pessoal" : configuracao.perfilUso === "empresa" ? "/empresa" : "/";
        router.replace(destinoConvite() ?? (configuracao.onboardingConcluido ? destino : "/onboarding"));
        router.refresh();
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.");
    } finally { setEnviando(false); }
  }

  return (
    <AuthCard titulo={cadastro ? "Criar conta" : "Bem-vindo de volta"}
      descricao={cadastro ? "Comece com seus dados. Vamos confirmar seu e-mail antes de liberar o acesso." : "Entre para acompanhar seu negócio com clareza."}>
      <form className="auth-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        {cadastro ? <label className="field"><span>Seu nome</span><input aria-label="Seu nome" autoComplete="name" value={nome} onChange={(e) => { setNome(e.target.value); setErro(""); }} maxLength={160} required /></label> : null}
        <label className="field"><span>E-mail</span><input aria-label="E-mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); setErro(""); }} maxLength={180} required /></label>
        <PasswordFields senha={senha} setSenha={(valor) => { setSenha(valor); setErro(""); }} confirmacao={cadastro ? confirmacao : undefined} setConfirmacao={cadastro ? (valor) => { setConfirmacao(valor); setErro(""); } : undefined} />
        {!cadastro ? <Link className="auth-back" href="/esqueci-senha">Esqueci minha senha</Link> : null}
        {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
        <button className="primary-button auth-primary" disabled={enviando} type="submit">{enviando ? (cadastro ? "Criando conta..." : "Entrando...") : (cadastro ? "Criar conta" : "Entrar")}</button>
      </form>
      {!cadastro ? <p className="auth-switch">Falta confirmar seu e-mail? <Link href="/verificar-codigo">Verificar e-mail</Link></p> : null}
      <p className="auth-switch">{cadastro ? "Já tem conta?" : "Ainda não tem conta?"} <Link href={cadastro ? "/login" : "/cadastro"} onClick={e => { const fragmento=fragmentoConvite(); if(fragmento){e.preventDefault();router.push((cadastro?"/login":"/cadastro")+fragmento);} }}>{cadastro ? "Entrar" : "Criar conta"}</Link></p>
    </AuthCard>
  );
}
