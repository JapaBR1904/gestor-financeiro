"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AuthCard from "../../../components/AuthCard";
import { cadastroAdmin, type CadastroPendente } from "../../../lib/cadastro-admin";

export default function CadastrosPage() {
  const [disponivel,setDisponivel]=useState<boolean | null>(null);
  const [autenticado,setAutenticado]=useState(false);
  const [usuario,setUsuario]=useState(""); const [senha,setSenha]=useState("");
  const [pedidos,setPedidos]=useState<CadastroPendente[]>([]);
  const [confirmados,setConfirmados]=useState<Record<number,boolean>>({});
  const [ocupado,setOcupado]=useState(false); const [erro,setErro]=useState(""); const [mensagem,setMensagem]=useState("");
  const [tentativa,setTentativa]=useState(0);
  useEffect(() => {
    let ativo=true;
    cadastroAdmin<{disponivel:boolean}>("/disponibilidade").then(async config => {
      if (!ativo) return; setDisponivel(config.disponivel);
      if (config.disponivel) {
        try { const lista=await cadastroAdmin<CadastroPendente[]>(); if (ativo) { setPedidos(lista); setAutenticado(true); } }
        catch { /* Sessão ausente: o formulário administrativo continua disponível. */ }
      }
    }).catch(() => { if (ativo) setErro("Não foi possível consultar a administração. Confira a conexão e tente novamente."); });
    return () => { ativo=false; };
  },[tentativa]);
  async function entrar(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (ocupado) return; setOcupado(true); setErro("");
    try { await cadastroAdmin("/login",{usuario,senha}); setSenha(""); setPedidos(await cadastroAdmin<CadastroPendente[]>()); setAutenticado(true); }
    catch(error) { setSenha(""); setErro(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setOcupado(false); }
  }
  async function decidir(id:number,aprovar:boolean) {
    if (ocupado) return; setOcupado(true); setErro(""); setMensagem("");
    try { const resultado=await cadastroAdmin<{mensagem:string}>(`/${id}`,{aprovar,identidadeConfirmada:confirmados[id]===true}); setMensagem(resultado.mensagem); setPedidos(await cadastroAdmin<CadastroPendente[]>()); setConfirmados({}); }
    catch(error) { setErro(error instanceof Error ? error.message : "Não foi possível decidir."); }
    finally { setOcupado(false); }
  }
  return <AuthCard titulo="Aprovar cadastros" descricao="Libere o acesso somente depois de conferir quem solicitou a conta. Aprovação manual não significa e-mail verificado.">
    {erro ? <div className="form-error-banner"><p role="alert">{erro}</p><button className="secondary-button" disabled={ocupado} onClick={() => { setErro(""); setTentativa(valor=>valor+1); }}>Tentar novamente</button></div> : null}
    {mensagem ? <p className="auth-success-banner" role="status">{mensagem}</p> : null}
    {disponivel===null ? <p role="status">Consultando disponibilidade…</p> : !disponivel ? <p role="status">A administração de cadastros não está habilitada neste ambiente.</p> : !autenticado ? <form className="auth-form" onSubmit={entrar} aria-busy={ocupado}>
      <label className="field"><span>Usuário administrativo</span><input autoComplete="username" required maxLength={100} value={usuario} onChange={e=>setUsuario(e.target.value)} /></label>
      <label className="field"><span>Senha administrativa</span><input type="password" autoComplete="current-password" required maxLength={72} value={senha} onChange={e=>setSenha(e.target.value)} /></label>
      <button className="primary-button auth-primary" disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar na administração"}</button>
    </form> : <section className="admin-recovery" aria-label="Cadastros pendentes">
      <div className="admin-local-actions"><button className="secondary-button" disabled={ocupado} onClick={async()=>{ setOcupado(true);setErro(""); try { setPedidos(await cadastroAdmin<CadastroPendente[]>());setConfirmados({}); } catch(error) {setErro(error instanceof Error ? error.message : "Não foi possível atualizar.");} finally {setOcupado(false);} }}>Atualizar cadastros</button>
      <button className="text-button" disabled={ocupado} onClick={async()=>{setOcupado(true);try {await cadastroAdmin("/logout",{});setAutenticado(false);setPedidos([]);setConfirmados({});setMensagem("");} catch {setErro("Não foi possível encerrar a sessão.");} finally {setOcupado(false);} }}>Sair da administração</button></div>
      {pedidos.length===0 ? <p role="status">Nenhum cadastro pendente.</p> : pedidos.map(pedido=><article className="admin-local-request" key={pedido.usuarioId} aria-label={`Cadastro de ${pedido.nome}`}>
        <h2>{pedido.nome}</h2><p className="admin-request-email">{pedido.email}</p><p className="subtitle">E-mail não verificado · solicitado em {new Date(pedido.criadoEm).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</p>
        <label className="admin-identity-check"><input type="checkbox" checked={confirmados[pedido.usuarioId]===true} disabled={ocupado} onChange={e=>setConfirmados({...confirmados,[pedido.usuarioId]:e.target.checked})} /><span>Conferi a identidade da pessoa por um canal conhecido e autorizo o cadastro.</span></label>
        <div className="admin-local-actions"><button className="primary-button" disabled={ocupado || !confirmados[pedido.usuarioId]} onClick={()=>void decidir(pedido.usuarioId,true)}>Aprovar cadastro</button><button className="secondary-button" disabled={ocupado} onClick={()=>void decidir(pedido.usuarioId,false)}>Recusar cadastro</button></div>
      </article>)}
    </section>}
    <p className="auth-switch"><Link href="/login">Voltar ao login</Link></p>
  </AuthCard>;
}
