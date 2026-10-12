"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { solicitarCodigo, verificarCodigo, verificarRecuperacao } from "../lib/auth";
import AuthCard from "./AuthCard";

export default function AuthCodeForm({ recuperacao = false }: { recuperacao?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(params.get("email") ? 45 : 0);
  const finalidade = recuperacao ? "recuperacao_senha" : "verificacao_email";

  useEffect(() => {
    const timer = window.setInterval(() => setEspera((valor) => Math.max(0, valor - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ocupado) return;
    setErro(""); setMensagem("");
    if (codigo.length !== 6) return setErro("Digite os 6 dígitos do código.");
    setOcupado(true);
    try {
      if (recuperacao) {
        await verificarRecuperacao(email.trim(), codigo);
        router.replace("/redefinir-senha");
      } else {
        await verificarCodigo({ email: email.trim(), codigo, finalidade });
        router.replace("/onboarding");
        router.refresh();
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível validar o código.");
    } finally { setOcupado(false); }
  }

  async function reenviar() {
    if (espera > 0 || ocupado || !email.trim()) return;
    setErro(""); setMensagem(""); setOcupado(true);
    try {
      await solicitarCodigo(email, finalidade);
      setCodigo("");
      setEspera(45);
      setMensagem(recuperacao ? "Se existir uma conta com este e-mail, enviaremos um código de recuperação." : "Novo código enviado. Confira seu e-mail.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível reenviar o código.");
    } finally { setOcupado(false); }
  }

  return (
    <AuthCard titulo={recuperacao ? "Confirme a recuperação" : "Confirme seu e-mail"}
      descricao="Informe o código recebido por e-mail. Ele vale por 10 minutos e só pode ser usado uma vez.">
      <form className="auth-form" onSubmit={confirmar} aria-busy={ocupado}>
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" required maxLength={180} value={email}
          onChange={(e) => { setEmail(e.target.value); setCodigo(""); }} /></label>
        <label className="field"><span>Código de 6 dígitos</span>
          <input className="auth-code-input" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6}
            value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
        </label>
        {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
        {mensagem ? <p className="auth-success-banner" role="status">{mensagem}</p> : null}
        <button className="primary-button auth-primary" disabled={ocupado} type="submit">{ocupado ? "Aguarde..." : "Confirmar código"}</button>
        <button className="secondary-button auth-primary" type="button" onClick={reenviar} disabled={ocupado || espera > 0 || !email.trim()}>
          {espera > 0 ? `Reenviar em ${espera}s` : "Enviar novo código"}
        </button>
      </form>
      <p className="auth-switch"><Link href={recuperacao ? "/esqueci-senha" : "/login"}>← Voltar</Link></p>
    </AuthCard>
  );
}
