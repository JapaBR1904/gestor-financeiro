"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarCodigo, disponibilidadeAutenticacao, disponibilidadeAssistida, solicitarAssistida, consultarAssistida } from "../../lib/auth";
import { emailValido } from "../../lib/formatacao";
import AuthCard from "../../components/AuthCard";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [assistida, setAssistida] = useState<boolean | null>(null);
  const [protocolo, setProtocolo] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [falhaConsulta, setFalhaConsulta] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  function tentarNovamente() {
    setFalhaConsulta(false); setDisponivel(null); setAssistida(null); setErro("");
    setTentativa(valor => valor + 1);
  }
  useEffect(() => {
    let ativo = true;
    disponibilidadeAutenticacao().then(config => { if (ativo) setDisponivel(config.recuperacaoPorEmailDisponivel); }).catch(() => { if (ativo) setFalhaConsulta(true); });
    disponibilidadeAssistida().then(async config => {
      if (!ativo) return; setAssistida(config.disponivel);
      if (config.disponivel) {
        try { const estado = await consultarAssistida(); if (!ativo) return; if (estado.estado === "liberada") router.replace("/redefinir-senha"); else if (estado.estado === "aguardando") setProtocolo(estado.protocolo); }
        catch { if (ativo) setFalhaConsulta(true); }
      }
    }).catch(() => { if (ativo) setFalhaConsulta(true); });
    return () => { ativo = false; };
  }, [router, tentativa]);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando || assistida === null || (!assistida && disponivel !== true)) return;
    setErro(""); if (!email.trim()) return setErro("Informe seu e-mail.");
    if (!emailValido(email)) return setErro("Informe um e-mail válido.");
    setEnviando(true);
    try {
      if (assistida) { const pedido = await solicitarAssistida(email); setProtocolo(pedido.protocolo); }
      else { await solicitarCodigo(email, "recuperacao_senha"); router.push(`/recuperar-senha?${new URLSearchParams({ email: email.trim() })}`); }
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação."); }
    finally { setEnviando(false); }
  }
  async function verificarLiberacao() {
    if (enviando) return; setEnviando(true); setErro(""); setMensagem("");
    try {
      const estado = await consultarAssistida();
      if (estado.estado === "liberada") router.replace("/redefinir-senha");
      else if (estado.estado === "aguardando") setMensagem("Sua solicitação ainda aguarda a confirmação de identidade pelo responsável.");
      else { setProtocolo(null); setErro("A solicitação expirou ou foi encerrada. Você pode solicitar novamente."); }
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível verificar a liberação."); }
    finally { setEnviando(false); }
  }
  return <AuthCard titulo={protocolo ? "Solicitação de recuperação" : "Esqueceu sua senha?"}
    descricao={assistida ? "Peça ao responsável a confirmação da sua identidade para liberar a troca neste navegador, sem código ou e-mail." : falhaConsulta ? "Confira a conexão e tente consultar as opções novamente." : disponivel === true ? "Se existir uma conta com este e-mail, enviaremos um código de recuperação." : assistida === false && disponivel === false ? "A recuperação está indisponível neste ambiente. Tente novamente mais tarde." : "Consultando as opções de recuperação disponíveis…"}>
    {disponivel === false && assistida === false ? <p role="status" className="form-error-banner">A recuperação por e-mail está indisponível neste ambiente. A recuperação assistida também precisa de um ambiente autorizado.</p> : null}
    {falhaConsulta ? <div className="form-error-banner">
      <p role="alert">Não foi possível verificar as opções de recuperação. Confira sua conexão e tente novamente.</p>
      <button type="button" className="secondary-button" disabled={enviando} onClick={tentarNovamente}>Tentar novamente</button>
    </div> : null}
    {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
    {mensagem ? <p className="permission-note" role="status">{mensagem}</p> : null}
    {protocolo ? <section className="assisted-request" aria-label="Acompanhamento da recuperação">
      <p className="assisted-protocol">Protocolo <strong>#{protocolo}</strong></p>
      <ol><li>Procure o responsável pelo Nexo e informe o protocolo.</li><li>Confirme sua identidade por um canal já conhecido.</li><li>Depois da liberação, continue aqui no mesmo navegador.</li></ol>
      <p className="subtitle">A solicitação expira em até 10 minutos. O protocolo sozinho não autoriza a troca de senha. Nunca informe sua senha ao responsável.</p>
      <button className="primary-button auth-primary" disabled={enviando} onClick={() => void verificarLiberacao()}>{enviando ? "Verificando…" : "Verificar liberação"}</button>
    </section> : <form className="auth-form" onSubmit={enviar} noValidate aria-busy={enviando}>
      <label className="field"><span>E-mail</span><input aria-label="E-mail" type="email" autoComplete="email" required maxLength={180} value={email} onChange={e => { setEmail(e.target.value); setErro(""); }} /></label>
      <button className="primary-button auth-primary" type="submit" disabled={enviando || assistida === null || (!assistida && disponivel !== true)}>{enviando ? "Solicitando..." : assistida ? "Solicitar recuperação assistida" : assistida === false && disponivel === true ? "Enviar código de recuperação" : assistida === false && disponivel === false ? "Recuperação indisponível" : "Aguardando disponibilidade"}</button>
    </form>}
    <p className="auth-switch"><Link href="/login">← Voltar para o login</Link></p>
  </AuthCard>;
}
