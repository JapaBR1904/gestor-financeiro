"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthCard from "../../components/AuthCard";
import { adminDisponivel, entrarAdmin, sairAdmin, listarRecuperacoes, decidirRecuperacao, type PedidoAssistido } from "../../lib/admin-local";

export default function AdminPage() {
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [pedidos, setPedidos] = useState<PedidoAssistido[]>([]);
  const [confirmados, setConfirmados] = useState<Record<number, boolean>>({});
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    const lista = await listarRecuperacoes(); setPedidos(lista); setAutenticado(true);
  }, []);
  useEffect(() => {
    let ativo = true;
    adminDisponivel().then(async resultado => {
      if (!ativo) return;
      setDisponivel(resultado.disponivel);
      if (resultado.disponivel) {
        try { const lista = await listarRecuperacoes(); if (ativo) { setPedidos(lista); setAutenticado(true); } }
        catch { /* Sem sessão administrativa, mostrar somente o login. */ }
      }
    }).catch(() => { if (ativo) { setDisponivel(false); setErro("Não foi possível verificar a disponibilidade da administração."); } });
    return () => { ativo = false; };
  }, []);
  async function entrar(event: FormEvent) {
    event.preventDefault(); if (ocupado) return; setOcupado(true); setErro("");
    try { await entrarAdmin(usuario, senha); setSenha(""); await carregar(); }
    catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setOcupado(false); }
  }
  async function decidir(protocolo: number, aprovar: boolean) {
    if (ocupado || (aprovar && !confirmados[protocolo])) return;
    setOcupado(true); setErro(""); setMensagem("");
    try {
      await decidirRecuperacao(protocolo, aprovar, confirmados[protocolo] === true);
      setMensagem(aprovar ? "Troca liberada. A pessoa deve continuar no mesmo navegador em que solicitou ajuda." : "Solicitação recusada.");
      setConfirmados({}); await carregar();
    } catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível tratar a solicitação."); }
    finally { setOcupado(false); }
  }
  return <AuthCard titulo={autenticado ? "Central de administração" : "Administração do Nexo"}
    descricao="Área temporária para recuperação assistida em ambiente local de testes. Sem acesso a contas ou dados de produção.">
    {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
    {mensagem ? <p className="auth-success-banner" role="status">{mensagem}</p> : null}
    {disponivel === null ? <p role="status">Verificando disponibilidade…</p> : disponivel === false ? <p role="status" className="permission-note">Este painel não está habilitado neste ambiente. O acesso temporário não funciona em produção nem com o banco principal.</p> : !autenticado ?
      <form className="auth-form" onSubmit={entrar} aria-busy={ocupado}>
        <label className="field"><span>Usuário administrativo</span><input required maxLength={100} autoComplete="username" value={usuario} onChange={e => setUsuario(e.target.value)} /></label>
        <label className="field"><span>Senha administrativa</span><input type="password" required maxLength={100} autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} /></label>
        <button className="primary-button auth-primary" disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar na administração"}</button>
      </form> : <div className="admin-recovery">
        <div className="admin-local-warning"><strong>Confirme a identidade antes de liberar.</strong><p>Use um canal já conhecido e evidências independentes. O e-mail informado e o número do protocolo, sozinhos, não comprovam que a conta pertence à pessoa.</p></div>
        <div className="admin-local-actions">
          <button className="secondary-button" disabled={ocupado} onClick={async () => { setOcupado(true); setErro(""); try { await carregar(); } catch { setErro("Não foi possível atualizar. Entre novamente se a sessão expirou."); } finally { setOcupado(false); } }}>Atualizar solicitações</button>
          <button className="text-button" disabled={ocupado} onClick={async () => { setOcupado(true); try { await sairAdmin(); setAutenticado(false); setPedidos([]); setConfirmados({}); setMensagem(""); } catch { setErro("Não foi possível encerrar a sessão. Tente novamente."); } finally { setOcupado(false); } }}>Sair da administração</button>
        </div>
        {pedidos.length === 0 ? <p role="status" className="permission-note">Nenhuma solicitação pendente.</p> : <div className="admin-local-list">{pedidos.map(pedido => <article className="admin-local-request" key={pedido.protocolo} aria-label={`Solicitação ${pedido.protocolo}`}>
          <h2>Protocolo #{pedido.protocolo}</h2><p className="admin-request-email">{pedido.email}</p>
          <p className="subtitle">Solicitado em {new Date(pedido.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. A autorização expira junto com a solicitação.</p>
          <label className="admin-identity-check"><input type="checkbox" checked={confirmados[pedido.protocolo] === true} onChange={e => setConfirmados({ ...confirmados, [pedido.protocolo]: e.target.checked })} disabled={ocupado} /><span>Confirmei a identidade da pessoa por um canal conhecido.</span></label>
          <div className="admin-local-actions"><button className="primary-button" disabled={ocupado || !confirmados[pedido.protocolo]} onClick={() => void decidir(pedido.protocolo, true)}>Liberar troca</button><button className="secondary-button" disabled={ocupado} onClick={() => void decidir(pedido.protocolo, false)}>Recusar solicitação</button></div>
        </article>)}</div>}
      </div>}
    <p className="auth-switch"><Link href="/login">Voltar ao login do Nexo</Link></p>
  </AuthCard>;
}
