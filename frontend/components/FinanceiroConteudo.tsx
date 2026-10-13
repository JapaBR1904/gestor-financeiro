"use client";
import Link from "next/link";
import { Icone } from "./Icone";
import { FormEvent, useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "./WorkspaceShell";
import { useWorkspace } from "../lib/workspace";
import { VazioProduto } from "./EstadoProduto";
import {
  datasDoMes,
  exportarFinanceiro,
  Lancamento,
  Movimentacao,
  removerLancamento,
  ResumoFinanceiro,
  resumoFinanceiro,
  salvarLancamento,
} from "../lib/financeiro";
import { formatarMoeda } from "../lib/produtos";
import { planoPermite } from "../lib/planos";

export function FinanceiroConteudo({ pessoal = false }: { pessoal?: boolean }) {
  const { config, usuario } = useWorkspace();
  const trava = useRef(false);
  const chaveEnvio = useRef<string | undefined>(undefined);
  const [dados, setDados] = useState<ResumoFinanceiro | null>(null);
  const [periodo, setPeriodo] = useState<{
    inicio: string;
    fim: string;
  } | null>(null);
  const [campos, setCampos] = useState({ inicio: "", fim: "" });
  const [revisao, setRevisao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [formulario, setFormulario] = useState(false);
  const [editar, setEditar] = useState<number | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [lancamento, setLancamento] = useState<Lancamento>({
    tipo: "receita",
    descricao: "",
    valor: 0,
    data: "",
    categoria: "Outros",
    conta: "Principal",
  });
  const podeGerenciar =
    usuario?.papel === "proprietario" || usuario?.papel === "administrador";
  const pro = config && planoPermite(config.plano, "pro");
  useEffect(() => {
    let ativo = true;
    const escolhido = periodo ?? datasDoMes();
    resumoFinanceiro(escolhido.inicio, escolhido.fim)
      .then((resumo) => {
        if (ativo) {
          setDados(resumo);
          setCampos({ inicio: resumo.inicio, fim: resumo.fim });
          setErro("");
        }
      })
      .catch((error) => {
        if (ativo)
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as movimentações.",
          );
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [periodo, revisao, usuario?.organizacaoId]);
  function novo() {
    chaveEnvio.current = crypto.randomUUID();
    setEditar(undefined);
    setLancamento({
      tipo: "receita",
      descricao: "",
      valor: 0,
      data: datasDoMes().fim,
      categoria: "Outros",
      conta: "Principal",
    });
    setFormulario(true);
    setSucesso("");
  }
  function editarItem(item: Movimentacao) {
    setEditar(item.id);
    setLancamento({
      tipo: item.tipo,
      descricao: item.descricao,
      valor: item.valor,
      data: item.data,
      categoria: item.categoria,
      conta: item.conta,
    });
    setFormulario(true);
  }
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      await salvarLancamento(
        lancamento,
        editar,
        editar ? undefined : chaveEnvio.current,
      );
      setFormulario(false);
      setSucesso("Lançamento salvo.");
      setRevisao((r) => r + 1);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o lançamento.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  async function excluir(id: number) {
    if (
      ocupado ||
      !window.confirm(
        "Excluir este lançamento? Esta ação não altera vendas ou despesas comerciais.",
      )
    )
      return;
    setOcupado(true);
    try {
      await removerLancamento(id);
      setRevisao((r) => r + 1);
      setSucesso("Lançamento excluído.");
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível excluir.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  async function exportar() {
    if (ocupado || !dados) return;
    setOcupado(true);
    try {
      await exportarFinanceiro(dados.inicio, dados.fim);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível exportar.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  const movimentos = pessoal
    ? (dados?.movimentacoes ?? [])
    : (dados?.movimentacoes ?? []).slice(0, 7);
  const categorias = new Map<string, number>();
  for (const item of dados?.movimentacoes ?? [])
    if (item.tipo === "despesa")
      categorias.set(
        item.categoria,
        (categorias.get(item.categoria) ?? 0) + item.valor,
      );
  return (
    <WorkspaceShell
      titulo={pessoal ? "Lançamentos" : "Visão geral"}
      descricao={
        pessoal
          ? "Entradas e saídas organizadas por data, categoria e conta."
          : "O que entrou, o que saiu e o resultado do seu período."
      }
      acoes={
        <button
          className="primary-button"
          onClick={novo}
          disabled={!usuario || carregando || ocupado}
        >
          + Novo lançamento
        </button>
      }
    >
      <form
        className="period-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setCarregando(true);
          setPeriodo({ ...campos });
        }}
      >
        <label className="field">
          <span>De</span>
          <input
            aria-label="De"
            type="date"
            value={campos.inicio}
            required
            onChange={(e) => setCampos({ ...campos, inicio: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Até</span>
          <input
            aria-label="Até"
            type="date"
            value={campos.fim}
            required
            onChange={(e) => setCampos({ ...campos, fim: e.target.value })}
          />
        </label>
        <button className="secondary-button" disabled={carregando}>
          Aplicar período
        </button>
        {pro ? (
          <button
            type="button"
            className="secondary-button"
            disabled={ocupado || carregando}
            onClick={exportar}
          >
            Exportar CSV
          </button>
        ) : (
          <Link className="text-button" href="/planos">
            Exportação no Pro
          </Link>
        )}
      </form>
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
      <section className="finance-summary" aria-label="Resumo financeiro">
        {[
          {
            nome: "Entradas",
            valor: dados?.receitas,
            texto: "Receitas e vendas",
            classe: "",
          },
          {
            nome: "Saídas",
            valor: dados?.despesas,
            texto: "Gastos do período",
            classe: "",
          },
          {
            nome: "Saldo do período",
            valor: dados?.saldo,
            texto: "Entradas menos saídas",
            classe: "balance-card",
          },
        ].map((item) => (
          <article className={`summary-card ${item.classe}`} key={item.nome}>
            <span className="summary-label">{item.nome}<Icone nome={item.nome === "Entradas" ? "venda" : item.nome === "Saídas" ? "despesa" : "fluxo"} /></span>
            <strong className={carregando ? "summary-loading" : ""} aria-busy={carregando}>
              {carregando || item.valor === undefined
                ? "—"
                : formatarMoeda(item.valor)}
            </strong>
            <small>{item.texto}</small>
          </article>
        ))}
      </section>
      {formulario ? (
        <section className="product-form-panel">
          <h2>{editar ? "Editar lançamento" : "Novo lançamento"}</h2>
          <form onSubmit={salvar}>
            <div className="form-grid">
              <label className="field">
                <span>Tipo</span>
                <select
                  aria-label="Tipo"
                  value={lancamento.tipo}
                  onChange={(e) =>
                    setLancamento({
                      ...lancamento,
                      tipo: e.target.value as "receita" | "despesa",
                    })
                  }
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </label>
              <label className="field">
                <span>Descrição</span>
                <input
                  aria-label="Descrição"
                  required
                  maxLength={180}
                  value={lancamento.descricao}
                  onChange={(e) =>
                    setLancamento({ ...lancamento, descricao: e.target.value })
                  }
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Valor (R$)</span>
                <input
                  aria-label="Valor (R$)"
                  type="number"
                  min="0.01"
                  max="999999999999.99"
                  step="0.01"
                  required
                  value={lancamento.valor || ""}
                  onChange={(e) =>
                    setLancamento({
                      ...lancamento,
                      valor: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Data</span>
                <input
                  aria-label="Data"
                  type="date"
                  required
                  value={lancamento.data}
                  onChange={(e) =>
                    setLancamento({ ...lancamento, data: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Categoria</span>
                <input
                  aria-label="Categoria"
                  required
                  maxLength={80}
                  list="categorias-financeiras"
                  value={lancamento.categoria}
                  onChange={(e) =>
                    setLancamento({ ...lancamento, categoria: e.target.value })
                  }
                />
                <datalist id="categorias-financeiras">
                  {[
                    "Salário",
                    "Vendas",
                    "Alimentação",
                    "Moradia",
                    "Transporte",
                    "Serviços",
                    "Outros",
                  ].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Conta</span>
                <input
                  aria-label="Conta"
                  required
                  maxLength={80}
                  value={lancamento.conta}
                  onChange={(e) =>
                    setLancamento({ ...lancamento, conta: e.target.value })
                  }
                  placeholder="Ex.: Principal, carteira ou banco"
                />
              </label>
            </div>
            <div className="product-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFormulario(false)}
                disabled={ocupado}
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={ocupado}>
                {ocupado ? "Salvando…" : "Salvar lançamento"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <div className={pessoal ? "" : "product-two-columns"}>
        <section className="panel">
          <div className="panel-header">
            <h2>
              {pessoal ? "Movimentações do período" : "Últimas movimentações"}
            </h2>
            {!pessoal ? (
              <Link className="text-button" href="/pessoal">
                Ver todas →
              </Link>
            ) : null}
          </div>
          {carregando ? (
            <div className="product-empty" role="status">
              Carregando movimentações…
            </div>
          ) : erro && !dados ? (
            <p className="product-empty">
              As movimentações não puderam ser carregadas.
            </p>
          ) : movimentos.length === 0 ? (
            <VazioProduto
              titulo="Um bom começo é registrar o primeiro movimento"
              texto="Adicione receitas e gastos. Vendas e despesas comerciais também aparecerão aqui, sem duplicação."
              acao={
                <button className="secondary-button" onClick={novo}>
                  Adicionar lançamento
                </button>
              }
            />
          ) : (
            <div className="finance-table-wrap">
              <table className="finance-table movements-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th className="optional">Data</th>
                    <th className="category-column">Categoria</th>
                    <th>Valor</th>
                    {pessoal && podeGerenciar ? <th>Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((item) => (
                    <tr key={`${item.origem}-${item.id}`}>
                      <td>
                        {item.descricao}
                        <small>
                          {item.conta} ·{" "}
                          {item.origem === "manual"
                            ? "Lançamento"
                            : item.origem === "venda"
                              ? "Venda"
                              : "Despesa comercial"}
                        </small>
                      </td>
                      <td className="optional" data-label="Data">
                        {new Date(`${item.data}T12:00:00`).toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td className="category-column" data-label="Categoria">
                        <span className="tag">{item.categoria}</span>
                      </td>
                      <td
                        className={`amount ${item.tipo === "receita" ? "positive" : "negative"}`}
                      >
                        {item.tipo === "receita" ? "+" : "−"}{" "}
                        {formatarMoeda(item.valor)}
                      </td>
                      {pessoal && podeGerenciar ? (
                        <td className="actions-cell">
                          <div className="table-actions">
                            {item.origem === "manual" ? (
                              <>
                                <button
                                  className="text-button"
                                  onClick={() => editarItem(item)}
                                  disabled={ocupado}
                                >
                                  Editar
                                </button>
                                <button
                                  className="text-button danger-text"
                                  onClick={() => excluir(item.id)}
                                  disabled={ocupado}
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <Link
                                className="text-button"
                                href={
                                  item.origem === "venda"
                                    ? `/vendas/${item.id}`
                                    : `/despesas/${item.id}`
                                }
                              >
                                Abrir
                              </Link>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {!pessoal ? (
          <section className="panel">
            <div className="panel-header">
              <h2>Para onde vai o dinheiro</h2>
            </div>
            {categorias.size ? (
              Array.from(categorias)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([nome, valor]) => (
                  <div className="category-row" key={nome}>
                    <span>{nome}</span>
                    <strong>{formatarMoeda(valor)}</strong>
                    <div className="category-track">
                      <span
                        style={{
                          width: `${dados?.despesas ? (valor / dados.despesas) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
            ) : (
              <VazioProduto
                titulo="Nenhum gasto neste período"
                texto="Suas principais categorias aparecerão conforme registrar saídas."
              />
            )}
          </section>
        ) : null}
      </div>
      {!pessoal ? (
        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Próximos passos</p>
              <h2>Transforme números em decisões</h2>
            </div>
          </div>
          <div className="quick-actions">
            <Link className="quick-action" href="/metas">
              <Icone nome="meta" /><strong>Definir metas</strong>
              <span>Acompanhe o progresso dos seus objetivos.</span>
            </Link>
            <Link className="quick-action" href="/fluxo-caixa">
              <Icone nome="fluxo" /><strong>Comparar períodos</strong>
              <span>Entenda a evolução de entradas e gastos.</span>
            </Link>
            <Link className="quick-action" href="/planos">
              <Icone nome="painel" /><strong>
                {config?.plano === "business"
                  ? "Seu Business"
                  : "Conhecer os planos"}
              </strong>
              <span>Veja os recursos disponíveis para seu momento.</span>
            </Link>
          </div>
        </section>
      ) : null}
    </WorkspaceShell>
  );
}
