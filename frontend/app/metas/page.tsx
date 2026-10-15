"use client";
import { NavegacaoAnalises } from "../../components/NavegacaoAnalises";
import Link from "next/link";
import { Icone } from "../../components/Icone";
import { FormEvent, useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "../../components/WorkspaceShell";
import { useWorkspace } from "../../lib/workspace";
import { VazioProduto } from "../../components/EstadoProduto";
import {
  arquivarMeta,
  atualizarProgressoMeta,
  criarMeta,
  listarMetas,
  Meta,
  UnidadeMeta,
} from "../../lib/metas";
import { planoPermite } from "../../lib/planos";
import { usePreferencias } from "../../components/PreferenciasProvider";

function formatarValorMeta(meta: Meta, numero: number) {
  return meta.unidade === "moeda"
    ? numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : `${numero.toLocaleString("pt-BR")}${meta.unidade === "percentual" ? "%" : ""}`;
}
export default function MetasPage() {
  const { ocultarValores } = usePreferencias();
  const valor = (meta: Meta, numero: number) => ocultarValores ? "••••••" : formatarValorMeta(meta, numero);
  const { config, usuario } = useWorkspace();
  const liberado = config && planoPermite(config.plano, "pro");
  const gestao =
    usuario?.papel === "proprietario" || usuario?.papel === "administrador";
  const [metas, setMetas] = useState<Meta[] | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [formulario, setFormulario] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const [revisao, setRevisao] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [unidade, setUnidade] = useState<UnidadeMeta>("moeda");
  const [meta, setMeta] = useState("");
  const [atual, setAtual] = useState("0");
  const [prazo, setPrazo] = useState("");
  const [edicoes, setEdicoes] = useState<Record<number, string>>({});
  useEffect(() => {
    if (!liberado) return;
    let ativo = true;
    listarMetas()
      .then((lista) => {
        if (ativo) {
          setMetas(lista);
          setErro("");
        }
      })
      .catch((e) => {
        if (ativo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar as metas.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [liberado, usuario?.organizacaoId, revisao]);
  async function executar(acao: () => Promise<void>) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      await acao();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível salvar a meta.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  function criar(e: FormEvent) {
    e.preventDefault();
    void executar(async () => {
      await criarMeta({
        titulo,
        unidade,
        valorMeta: Number(meta),
        valorAtual: Number(atual),
        prazo,
      });
      setFormulario(false);
      setTitulo("");
      setMeta("");
      setAtual("0");
      setPrazo("");
      setRevisao((r) => r + 1);
      setSucesso("Meta criada.");
    });
  }
  function renderizarMeta(m: Meta) {
              const progresso = Math.max(
                0,
                Math.min(100, (m.valorAtual / m.valorMeta) * 100),
              );
              return (
                <article className={`pro-goal-card${m.status === "concluida" ? " completed" : ""}`} key={m.id}>
                  <div className="pro-goal-top">
                    <div>
                      <span className="tag goal-status"><Icone nome={m.status === "concluida" ? "check" : "meta"} />
                        {m.status === "concluida"
                          ? "Concluída"
                          : "Em andamento"}
                      </span>
                      <h2>{m.titulo}</h2>
                      <p>
                        {valor(m, m.valorAtual)} de {valor(m, m.valorMeta)}
                        {m.prazo
                          ? ` · prazo ${new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR")}`
                          : ""}
                      </p>
                    </div>
                    <strong className="goal-percentage">{Math.round(progresso)}<span>%</span></strong>
                  </div>
                  <div
                    className="premium-progress"
                    role="progressbar"
                    aria-label={`Progresso de ${m.titulo}`}
                    aria-valuenow={Math.round(progresso)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progresso}%` }} />
                  </div>
                  {gestao ? (
                    <form
                      className="pro-goal-actions"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void executar(async () => {
                          await atualizarProgressoMeta(
                            m.id,
                            Number(edicoes[m.id] ?? m.valorAtual),
                          );
                          setRevisao((r) => r + 1);
                          setSucesso("Progresso atualizado.");
                        });
                      }}
                    >
                      <label className="field">
                        <span>Atualizar progresso</span>
                        <input
                          aria-label="Atualizar progresso"
                          type="number"
                          step="0.01"
                          min="0"
                          max="999999999999.99"
                          required
                          value={edicoes[m.id] ?? m.valorAtual}
                          onChange={(e) =>
                            setEdicoes({ ...edicoes, [m.id]: e.target.value })
                          }
                        />
                      </label>
                      <button className="secondary-button" disabled={ocupado}>
                        Salvar progresso
                      </button>
                      <button
                        className="text-button danger-text"
                        type="button"
                        disabled={ocupado}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Arquivar esta meta? Seu histórico será preservado.",
                            )
                          )
                            void executar(async () => {
                              await arquivarMeta(m.id);
                              setRevisao((r) => r + 1);
                              setSucesso("Meta arquivada.");
                            });
                        }}
                      >
                        Arquivar
                      </button>
                    </form>
                  ) : null}
                </article>
              );

  }
  return (
    <WorkspaceShell
      titulo="Metas"
      descricao="Defina objetivos e acompanhe o progresso que você registra."
      acoes={
        liberado && gestao ? (
          <button
            className="primary-button"
            onClick={() => setFormulario(!formulario)}
          >
            {formulario ? "Fechar" : "+ Nova meta"}
          </button>
        ) : null
      }
    >
      <NavegacaoAnalises />
      {!config ? (
        <p role="status">Carregando seu plano…</p>
      ) : !liberado ? (
        <section className="product-empty product-lock">
          <p className="eyebrow">Disponível no Pro</p>
          <h2>Planeje o próximo passo</h2>
          <p>
            Defina metas financeiras e comerciais. Compare os resultados por
            período na análise de fluxo.
          </p>
          <Link className="primary-button" href="/planos">
            Ver planos
          </Link>
        </section>
      ) : (
        <>
          {erro ? (
            <p className="form-error-banner" role="alert">
              {erro}{" "}
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
          <section className="finance-summary goal-summary" aria-label="Resumo das metas não arquivadas">
            {[
              [
                "Em andamento",
                metas?.filter((m) => m.status === "ativa").length,
              ],
              [
                "Concluídas",
                metas?.filter((m) => m.status === "concluida").length,
              ],
              ["Total de metas", metas?.length],
            ].map(([nome, numero]) => (
              <article className="summary-card" key={nome}>
                <span>{nome}</span>
                <strong>{numero ?? "—"}</strong>

              </article>
            ))}
          </section>
          <p className="goal-summary-hint">Metas não arquivadas</p>
          {formulario && gestao ? (
            <section className="product-form-panel">
              <h2>Defina um objetivo</h2>
              <form onSubmit={criar}>
                <div className="form-grid">
                  <label className="field">
                    <span>Título</span>
                    <input
                      aria-label="Título"
                      required
                      maxLength={140}
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <label className="field">
                    <span>Unidade</span>
                    <select
                      aria-label="Unidade"
                      value={unidade}
                      onChange={(e) =>
                        setUnidade(e.target.value as UnidadeMeta)
                      }
                    >
                      <option value="moeda">Dinheiro (R$)</option>
                      <option value="percentual">Percentual (%)</option>
                      <option value="quantidade">Quantidade</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Valor da meta</span>
                    <input
                      aria-label="Valor da meta"
                      type="number"
                      min="0.01"
                      max="999999999999.99"
                      step="0.01"
                      required
                      value={meta}
                      onChange={(e) => setMeta(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Valor atual</span>
                    <input
                      aria-label="Valor atual"
                      type="number"
                      min="0"
                      max="999999999999.99"
                      step="0.01"
                      required
                      value={atual}
                      onChange={(e) => setAtual(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Prazo (opcional)</span>
                    <input
                      aria-label="Prazo (opcional)"
                      type="date"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                    />
                  </label>
                </div>
                <div className="product-form-actions">
                  <button className="primary-button" disabled={ocupado}>
                    {ocupado ? "Salvando…" : "Criar meta"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}
          {!gestao ? (
            <p className="permission-note">
              Seu papel permite acompanhar as metas. A gestão atualiza o
              progresso.
            </p>
          ) : null}
          {metas === null && !erro ? (
            <p role="status">Carregando metas…</p>
          ) : metas?.length === 0 ? (
            <VazioProduto
              titulo="Qual é seu próximo objetivo?"
              texto="Crie uma meta com valor e prazo. Você registra o progresso, e o Nexo marca a conclusão quando o objetivo é atingido."
            />
          ) : (
            <>
              {metas?.filter(m => m.status === "ativa").map(renderizarMeta)}
              {metas?.some(m => m.status === "concluida") ? <details className="completed-goals"><summary>Metas concluídas ({metas.filter(m => m.status === "concluida").length})</summary>{metas.filter(m => m.status === "concluida").map(renderizarMeta)}</details> : null}
            </>
          )}
          <Link className="text-button" href="/fluxo-caixa">
            Ver fluxo e comparativos do período →
          </Link>
        </>
      )}
    </WorkspaceShell>
  );
}
