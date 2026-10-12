"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { redefinirSenha } from "../../lib/auth";
import { validarSenha } from "../../lib/politica-senha";
import AuthCard from "../../components/AuthCard";
import PasswordFields from "../../components/PasswordFields";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  useEffect(() => {
    if (!sucesso) return;
    const timer = window.setTimeout(() => router.replace("/login"), 5000);
    return () => window.clearTimeout(timer);
  }, [sucesso, router]);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    setErro("");
    const erroSenha = validarSenha(senha, confirmacao);
    if (erroSenha) return setErro(erroSenha);
    setEnviando(true);
    try {
      await redefinirSenha(senha, confirmacao);
      setSenha(""); setConfirmacao(""); setSucesso(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar sua senha.");
    } finally { setEnviando(false); }
  }
  return (
    <AuthCard titulo={sucesso ? "Senha atualizada" : "Defina sua nova senha"}
      descricao={sucesso ? "Sua senha foi alterada e os acessos anteriores foram encerrados." : "Escolha uma nova senha para proteger seu espaço."}>
      {sucesso ? <><p className="auth-success-banner" role="status">Tudo pronto. Você será redirecionado para o login.</p><Link className="primary-button auth-primary" href="/login">Ir para o login</Link></> : (
        <form className="auth-form" onSubmit={enviar} noValidate aria-busy={enviando}>
          <PasswordFields senha={senha} setSenha={(valor) => { setSenha(valor); setErro(""); }} confirmacao={confirmacao} setConfirmacao={(valor) => { setConfirmacao(valor); setErro(""); }} />
          {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
          <button className="primary-button auth-primary" disabled={enviando} type="submit">{enviando ? "Atualizando..." : "Atualizar senha"}</button>
          <p className="auth-switch"><Link href="/esqueci-senha">Solicitar outro código</Link></p>
        </form>
      )}
    </AuthCard>
  );
}
