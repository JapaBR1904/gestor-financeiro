"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cadastrar, login } from "../lib/auth";
import { emailValido } from "../lib/formatacao";
import { validarSenha } from "../lib/politica-senha";
import AuthCard from "./AuthCard";
import { Marca } from "./Marca";
import PasswordFields from "./PasswordFields";
import { destinoConvite, fragmentoConvite } from "../lib/convite";

export default function AuthCredentialsForm({
  cadastro = false,
}: {
  cadastro?: boolean;
}) {
  const router = useRouter();
  const trava = useRef(false);
  const [preparando, setPreparando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;
    setErro("");
    if (!email.trim()) return setErro("Informe seu e-mail.");
    if (!emailValido(email)) return setErro("Informe um e-mail válido.");
    if (cadastro) {
      if (!nome.trim()) return setErro("Informe seu nome.");
      const erroSenha = validarSenha(senha, confirmacao);
      if (erroSenha) return setErro(erroSenha);
    }
    if (!senha.trim()) return setErro("Informe sua senha.");
    trava.current = true;
    setEnviando(true);
    let redirecionando = false;
    try {
      if (cadastro) {
        const resultado = await cadastrar({ nome, email, senha, confirmacaoSenha: confirmacao });
        setSenha("");
        setConfirmacao("");
        if (resultado.verificacaoEmailNecessaria !== false) {
          router.replace(`/verificar-codigo?${new URLSearchParams({ email: email.trim() })}${fragmentoConvite()}`);
        } else {
          setPreparando(true);
          router.replace(destinoConvite() ?? "/dashboard");
        }
      } else {
        await login(email, senha);
        setSenha("");
        router.replace(destinoConvite() ?? "/dashboard");
      }
      redirecionando = true;
    } catch (error) {
      setPreparando(false);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      if (!redirecionando) {
        trava.current = false;
        setEnviando(false);
      }
    }
  }

  return (
    <AuthCard
      titulo={cadastro ? "Criar conta" : "Bem-vindo de volta"}
      descricao={
        cadastro
          ? "Seu primeiro passo para organizar as finanças. Comece com uma conta Free."
          : "Entre para acompanhar seu negócio com clareza."
      }
    >
      {preparando ? <p className="auth-success-banner brand-busy" role="status"><Marca/>Preparando seu espaço…</p> : null}
      <form
        className="auth-form"
        onSubmit={enviar}
        noValidate
        aria-busy={enviando}
      >
        {cadastro ? (
          <label className="field">
            <span>Seu nome</span>
            <input
              aria-label="Seu nome"
              autoComplete="name"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setErro("");
              }}
              maxLength={160}
              required
            />
          </label>
        ) : null}
        <label className="field">
          <span>E-mail</span>
          <input
            aria-label="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro("");
            }}
            maxLength={180}
            required
          />
        </label>
        <PasswordFields
          senha={senha}
          setSenha={(valor) => {
            setSenha(valor);
            setErro("");
          }}
          confirmacao={cadastro ? confirmacao : undefined}
          setConfirmacao={
            cadastro
              ? (valor) => {
                  setConfirmacao(valor);
                  setErro("");
                }
              : undefined
          }
        />
        {!cadastro ? (
          <Link className="auth-back" href="/esqueci-senha">
            Esqueci minha senha
          </Link>
        ) : null}
        {erro ? (
          <p className="form-error-banner" role="alert">
            {erro}
          </p>
        ) : null}
        <button
          className="primary-button auth-primary"
          disabled={enviando}
          type="submit"
        >
          {enviando
            ? cadastro
              ? "Criando conta..."
              : "Entrando..."
            : cadastro
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>
      {!cadastro ? (
        <p className="auth-switch">
          Falta confirmar seu e-mail?{" "}
          <Link href="/verificar-codigo">Verificar e-mail</Link>
        </p>
      ) : null}
      <p className="auth-switch">
        {cadastro ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
        <Link
          href={cadastro ? "/login" : "/cadastro"}
          onClick={(e) => {
            const fragmento = fragmentoConvite();
            if (fragmento) {
              e.preventDefault();
              router.push((cadastro ? "/login" : "/cadastro") + fragmento);
            }
          }}
        >
          {cadastro ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </AuthCard>
  );
}
