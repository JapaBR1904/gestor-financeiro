"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "./WorkspaceShell";
import { useWorkspace } from "../lib/workspace";
import { BloqueioPlano } from "./EstadoProduto";
import {
  alterarPapel,
  carregarEquipe,
  convidarMembro,
  Equipe,
  nomePapel,
  removerMembro,
  revogarConvite,
} from "../lib/equipe";

export function EquipeConteudo() {
  const { config, usuario, atualizar } = useWorkspace();
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("membro");
  const [link, setLink] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const business = config?.plano === "business";
  useEffect(() => {
    if (!business) return;
    let ativo = true;
    carregarEquipe()
      .then((dados) => {
        if (ativo) {
          setEquipe(dados);
          setErro("");
        }
      })
      .catch((e) => {
        if (ativo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar a equipe.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [business, revisao, usuario?.organizacaoId]);
  async function acao(executar: () => Promise<unknown>, mensagem: string) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      await executar();
      setSucesso(mensagem);
      setRevisao((r) => r + 1);
      await atualizar();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível concluir a ação.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  function convidar(e: FormEvent) {
    e.preventDefault();
    void acao(async () => {
      const criado = await convidarMembro(email.trim(), papel);
      setLink(criado.linkAceite);
      setEmail("");
    }, "Convite criado. O destinatário precisa entrar com o e-mail convidado para aceitar.");
  }
  const pendentes =
    equipe?.convites.filter((c) => c.status === "pendente") ?? [];
  const ativos = equipe?.membros.filter((m) => m.ativo).length ?? 0;
  return (
    <WorkspaceShell
      titulo="Equipe e permissões"
      descricao="Um espaço compartilhado, com acesso definido para cada pessoa."
    >
      {!config ? (
        <p role="status">Carregando seu plano…</p>
      ) : !business ? (
        <BloqueioPlano
          plano="Business"
          titulo="Trabalhe com sua equipe"
          descricao="Convide até 10 pessoas, incluindo você. Os membros existentes são preservados quando o plano muda."
        />
      ) : (
        <>
          {erro ? (
            <p className="form-error-banner" role="alert">
              {erro}
              <button
                className="text-button"
                onClick={() => setRevisao((r) => r + 1)}
              >
                Tentar novamente
              </button>
            </p>
          ) : null}
          {sucesso ? (
            <p className="form-success" role="status">
              {sucesso}
            </p>
          ) : null}
          {!equipe && !erro ? (
            <p role="status">Carregando membros…</p>
          ) : equipe ? (
            <>
              <section className="finance-summary">
                <article className="summary-card">
                  <span>Membros ativos</span>
                  <strong>{ativos}</strong>
                  <small>Até {equipe.limite} usuários, com você</small>
                </article>
                <article className="summary-card">
                  <span>Convites pendentes</span>
                  <strong>{pendentes.length}</strong>
                  <small>Reservam uma vaga por 24 horas</small>
                </article>
                <article className="summary-card balance-card">
                  <span>Vagas disponíveis</span>
                  <strong>
                    {Math.max(0, equipe.limite - ativos - pendentes.length)}
                  </strong>
                  <small>Seu papel: {nomePapel(equipe.papelAtual)}</small>
                </article>
              </section>
              <p className="permission-note">
                O proprietário gerencia assinatura e todos os acessos.
                Administradores gerenciam a operação e convidam membros. Membros
                consultam os dados e registram vendas, clientes e gastos;
                alterações de estrutura ficam com a gestão.
              </p>
              {equipe.podeGerenciar ? (
                <section className="product-form-panel">
                  <h2>Convidar pessoa</h2>
                  <form onSubmit={convidar}>
                    <div className="form-grid">
                      <label className="field">
                        <span>E-mail da pessoa</span>
                        <input
                          aria-label="E-mail da pessoa"
                          type="email"
                          required
                          maxLength={180}
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={ocupado}
                        />
                      </label>
                      <label className="field">
                        <span>Papel no espaço</span>
                        <select
                          aria-label="Papel no espaço"
                          value={papel}
                          onChange={(e) => setPapel(e.target.value)}
                          disabled={ocupado}
                        >
                          <option value="membro">Membro</option>
                          {equipe.papelAtual === "proprietario" ? (
                            <option value="administrador">Administrador</option>
                          ) : null}
                        </select>
                      </label>
                    </div>
                    <div className="product-form-actions">
                      <button
                        className="primary-button"
                        disabled={
                          ocupado || ativos + pendentes.length >= equipe.limite
                        }
                      >
                        {ocupado ? "Criando convite…" : "Criar convite"}
                      </button>
                    </div>
                  </form>
                  {link ? (
                    <div className="invite-link-box">
                      <strong>Compartilhe o convite em privado</strong>
                      <p>
                        O envio por e-mail foi agendado. Você também pode
                        compartilhar este link diretamente com a pessoa
                        convidada.
                      </p>
                      <input
                        aria-label="Link do convite"
                        readOnly
                        value={link}
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        className="secondary-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(link);
                            setSucesso("Link copiado.");
                          } catch {
                            setSucesso("Selecione e copie o link acima.");
                          }
                        }}
                      >
                        Copiar link
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setLink("")}
                      >
                        Fechar
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}
              <section className="panel">
                <div className="panel-header">
                  <h2>Pessoas do espaço</h2>
                </div>
                {equipe.membros.map((membro) => {
                  const podeAlterar =
                    equipe.podeGerenciar &&
                    membro.ativo &&
                    membro.papel !== "proprietario" &&
                    membro.id !== usuario?.id &&
                    (equipe.papelAtual === "proprietario" ||
                      membro.papel === "membro");
                  return (
                    <div
                      className={`member-row${!membro.ativo ? " member-inactive" : ""}`}
                      key={membro.id}
                    >
                      <div className="member-info">
                        <span className="user-avatar" aria-hidden="true">
                          {Array.from(membro.nome)[0]}
                        </span>
                        <div>
                          <strong>{membro.nome}</strong>
                          <small>
                            <span className={`role-label role-${membro.papel}`}>
                              {nomePapel(membro.papel)}
                            </span>
                            {membro.id === usuario?.id ? " · Você" : ""}
                            {!membro.ativo ? " · Acesso encerrado" : ""}
                          </small>
                        </div>
                      </div>
                      <div className="member-actions">
                        {podeAlterar && equipe.papelAtual === "proprietario" ? (
                          <label>
                            <span className="sr-only">
                              Papel de {membro.nome}
                            </span>
                            <select
                              aria-label={`Papel de ${membro.nome}`}
                              value={membro.papel}
                              onChange={(e) => {
                                const novo = e.target.value;
                                if (
                                  window.confirm(
                                    `Alterar o papel de ${membro.nome}? A pessoa precisará entrar novamente.`,
                                  )
                                )
                                  void acao(
                                    () => alterarPapel(membro.id, novo),
                                    "Papel atualizado.",
                                  );
                              }}
                              disabled={ocupado}
                            >
                              <option value="membro">Membro</option>
                              <option value="administrador">
                                Administrador
                              </option>
                            </select>
                          </label>
                        ) : (
                          <span className="tag">
                            {membro.ativo ? "Ativo" : "Inativo"}
                          </span>
                        )}
                        {podeAlterar ? (
                          <button
                            className="text-button danger-text"
                            disabled={ocupado}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Encerrar o acesso de ${membro.nome} a este espaço? A conta e os dados pessoais serão preservados.`,
                                )
                              )
                                void acao(
                                  () => removerMembro(membro.id),
                                  "Acesso encerrado.",
                                );
                            }}
                          >
                            Remover
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </section>
              {equipe.podeGerenciar ? (
                <section className="panel" style={{ marginTop: 20 }}>
                  <div className="panel-header">
                    <h2>Convites</h2>
                  </div>
                  {equipe.convites.length ? (
                    equipe.convites.map((convite) => (
                      <div className="member-row" key={convite.id}>
                        <div>
                          <strong>{convite.email}</strong>
                          <small style={{ display: "block", marginTop: 6 }}>
                            {nomePapel(convite.papel)} ·{" "}
                            {convite.status === "pendente"
                              ? `Expira em ${new Date(convite.expiraEm).toLocaleString("pt-BR")}`
                              : convite.status === "aceito"
                                ? "Aceito"
                                : convite.status === "revogado"
                                  ? "Revogado"
                                  : "Expirado"}
                          </small>
                        </div>
                        {convite.status === "pendente" &&
                        (equipe.papelAtual === "proprietario" ||
                          convite.papel === "membro") ? (
                          <button
                            className="text-button danger-text"
                            disabled={ocupado}
                            onClick={() =>
                              void acao(
                                () => revogarConvite(convite.id),
                                "Convite revogado.",
                              )
                            }
                          >
                            Revogar
                          </button>
                        ) : (
                          <span className="tag">{convite.status}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="subtitle">
                      Os convites criados aparecerão aqui.
                    </p>
                  )}
                </section>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </WorkspaceShell>
  );
}
