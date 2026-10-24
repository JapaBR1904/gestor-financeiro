"use client";
import { PrimeirosPassos } from "./PrimeirosPassos";
import { PeriodosRapidos } from "./PeriodosRapidos";
import Link from "next/link";
import { Icone } from "./Icone";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
import { useMoeda, usePreferencias } from "./PreferenciasProvider";
import { ConfirmarExclusao } from "./ConfirmarExclusao";
import { EdicaoProtegida } from "./EdicaoProtegida";
import { usePublicarPeriodo } from "../lib/contexto-copiloto";
import { planoPermite } from "../lib/planos";

export function FinanceiroConteudo({ pessoal = false }: { pessoal?: boolean }) {
  const { config, usuario } = useWorkspace();
  const { detalhes, alterar } = usePreferencias();
  const formatarMoeda = useMoeda();
  const perfil = config?.perfilUso ?? "negocio";
  const completo = detalhes === "completo";
  const [exclusao, setExclusao] = useState<Movimentacao | null>(null);
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
  const podeRegistrar = Boolean(usuario && (podeGerenciar || config?.plano === "business"));
  const pro = config && planoPermite(config.plano, "pro");
  usePublicarPeriodo(dados, carregando || !dados);
  useEffect(() => {
    let ativo = true;
    const escolhido = periodo ?? datasDoMes();
    Promise.resolve().then(async () => {
      if (!ativo) return;
      setCarregando(true);
      setDados(null);
      setErro("");
      setCampos(escolhido);
      try {
        const resumo = await resumoFinanceiro(escolhido.inicio, escolhido.fim);
        if (ativo) { setDados(resumo); setErro(""); }
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar as movimentações.");
      } finally { if (ativo) setCarregando(false); }
    });
    return () => {
      ativo = false;
    };
  }, [periodo, revisao, usuario?.organizacaoId]);
  const novo = useCallback(() => {
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
  }, []);
  const aberturaInicial = useRef(false);
  useEffect(() => {
    if (pessoal && usuario && !carregando && !erro && !aberturaInicial.current && new URLSearchParams(window.location.search).get("novo") === "1") {
      aberturaInicial.current = true;
      queueMicrotask(novo);
    }
  }, [pessoal, usuario, carregando, erro, novo]);
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
    if (ocupado) return;
    setOcupado(true);
    try {
      await removerLancamento(id);
      setExclusao(null);
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
    if (ocupado || carregando || !dados || campos.inicio !== dados.inicio || campos.fim !== dados.fim) return;
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
    : (dados?.movimentacoes ?? []).slice(0, 5);
  const categorias = new Map<string, number>();
  for (const item of dados?.movimentacoes ?? [])
    if (item.tipo === "despesa")
      categorias.set(
        item.categoria,
        (categorias.get(item.categoria) ?? 0) + item.valor,
      );
  return (
    <WorkspaceShell
      titulo={pessoal ? "Movimentações" : perfil === "pessoal" ? "Seu dinheiro" : perfil === "empresa" ? "Resumo da empresa" : "Visão geral"}
      descricao={
        pessoal
          ? "Entradas e saídas organizadas por data, categoria e conta."
          : perfil === "pessoal" ? "Suas entradas, seus gastos e o próximo passo para cuidar do seu dinheiro." : perfil === "empresa" ? "Os números do espaço atual e as responsabilidades da sua equipe." : "Suas vendas e despesas, com clareza para tocar o negócio."
      }
      acoes={
        podeRegistrar && !formulario ? <button
          className="primary-button"
          onClick={novo}
          disabled={!usuario || carregando || ocupado}
        >
          + Nova movimentação
        </button> : null
      }
    >
      {!pessoal ? <section className="profile-guidance" aria-label="Seu próximo passo">
        <div><h2>{perfil === "pessoal" ? "Simples para cuidar do seu mês" : perfil === "empresa" ? "Um espaço, responsabilidades claras" : "O essencial para tocar seu negócio"}</h2>
        <p>{perfil === "pessoal" ? "Registre uma entrada ou gasto. Seu resultado é a diferença entre os dois, sem confundir com dinheiro disponível." : perfil === "empresa" ? "Confira o período e acompanhe quem registra, consulta e administra este espaço." : "Vendas registradas não comprovam recebimento. O resultado abaixo é entradas menos saídas; os custos dos produtos podem ser consultados nos relatórios."}</p></div>
        <nav aria-label="Atalhos do seu perfil">{perfil === "pessoal" ? <Link className="text-button" href="/metas">Suas metas →</Link> : perfil === "empresa" ? <><Link className="text-button" href="/equipe">Ver responsabilidades →</Link><Link className="text-button" href="/documentos">Documentos →</Link></> : <><Link className="text-button" href="/vendas/nova">Nova venda →</Link><Link className="text-button" href="/despesas/nova">Nova despesa →</Link></>}</nav>
      </section> : null}
      {!pessoal ? <PeriodosRapidos atual={dados} desabilitado={carregando || ocupado || formulario}
        selecionar={(escolhido) => { setCarregando(true); setDados(null); setPeriodo(escolhido); }} /> : null}
      <details className="period-details" open={pessoal || undefined}>
        <summary>{periodo ? "Período selecionado" : "Este mês"}{dados ? ` · ${new Date(`${dados.inicio}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${dados.fim}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}<span>Alterar período</span></summary>
      <form
        className="period-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setCarregando(true);
          setDados(null);
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
            disabled={ocupado || carregando || !dados || campos.inicio !== dados.inicio || campos.fim !== dados.fim}
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
      </details>
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
      <section className={`finance-summary${dados && Math.max(Math.abs(dados.saldo), dados.receitas, dados.despesas) >= 1_000_000 ? " long-values" : ""}`} aria-label="Resumo financeiro" aria-busy={carregando}>
        {[
          { nome: perfil === "pessoal" ? "Resultado do período" : "Resultado estimado", valor: dados?.saldo, texto: "Entradas menos saídas; não é saldo disponível", classe: "balance-card" },
          { nome: "Entradas", valor: dados?.receitas, texto: perfil === "pessoal" ? "Suas entradas registradas" : "Receitas e vendas registradas", classe: "income-card" },
          { nome: "Saídas", valor: dados?.despesas, texto: perfil === "pessoal" ? "Seus gastos no período" : "Despesas do período", classe: "expense-card" },
        ].map((item) => (
          <article className={`summary-card ${item.classe}`} key={item.nome}>
            <span className="summary-label">
              {item.nome}
              <Icone
                nome={
                  item.nome === "Entradas"
                    ? "venda"
                    : item.nome === "Saídas"
                      ? "despesa"
                      : "fluxo"
                }
              />
            </span>
            <strong
              className={carregando ? "summary-loading" : ""}
              aria-busy={carregando}
            >
              {carregando || item.valor === undefined
                ? "—"
                : formatarMoeda(item.valor)}
            </strong>
            <small>{item.texto}</small>
          </article>
        ))}
      </section>
      {formulario ? (
        <EdicaoProtegida><section className="product-form-panel">
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
        </section></EdicaoProtegida>
      ) : null}
      {!pessoal && perfil !== "pessoal" && completo && dados ? <p className="permission-note">Vendas registradas no período: <strong>{formatarMoeda(dados.movimentacoes.filter(item => item.origem === "venda").reduce((total, item) => total + item.valor, 0))}</strong>. Não há controle de recebimento nesta etapa. <Link href="/relatorios">Consultar custos registrados</Link>.</p> : null}
      <div className={pessoal || !completo ? "" : "product-two-columns"}>
        <section className="panel">
          <div className="panel-header">
            <h2>
              {pessoal ? "Movimentações do período" : "Últimas movimentações"}
            </h2>
            {!pessoal ? (
              <Link className="text-button" href="/pessoal">
                Ver todos
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
              titulo={periodo ? "Nenhum lançamento neste período" : "Seu primeiro lançamento começa aqui"}
              texto={periodo ? "Experimente outro intervalo para encontrar suas movimentações." : perfil === "pessoal" ? "Registre sua primeira entrada ou gasto. Seus números aparecerão aqui, sem complicação." : "Registre sua primeira venda ou despesa. Movimentações comerciais aparecem aqui sem duplicação."}
              acao={
                periodo ? <button className="secondary-button" onClick={() => { setPeriodo(null); setCarregando(true); }}>Limpar filtros</button> : podeRegistrar ? <button className="text-button" onClick={novo}>Adicionar lançamento</button> : null
              }
            />
          ) : (
            <div className="finance-table-wrap">
              <table className="finance-table movements-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    {pessoal ? <><th className="optional">Data</th><th className="category-column">Categoria</th></> : null}
                    <th className="amount">Valor</th>
                    {pessoal && podeGerenciar ? <th>Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((item) => (
                    <tr key={`${item.origem}-${item.id}`} data-large-value={Math.abs(item.valor) >= 1_000_000}>
                      <td>
                        {item.descricao}
                        <small>
                          {!pessoal ? `${new Date(`${item.data}T12:00:00`).toLocaleDateString("pt-BR")} · ` : `${item.conta} · `}
                          {item.origem === "manual"
                            ? "Lançamento"
                            : item.origem === "venda"
                              ? "Venda"
                              : "Despesa comercial"}
                        </small>
                      </td>
                      {pessoal ? <><td className="optional" data-label="Data">
                        {new Date(`${item.data}T12:00:00`).toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td className="category-column" data-label="Categoria">
                        <span className="tag">{item.categoria}</span>
                      </td></> : null}
                      <td
                        className={`amount ${item.tipo === "receita" ? "positive" : "negative"}`}
                      >
                        {item.tipo === "receita" ? "+" : "−"}{" "}
                        {formatarMoeda(item.valor)}
                      </td>
                      {pessoal && podeGerenciar ? (
                        <td className="actions-cell">
                          <details className="row-actions"><summary aria-label={`Ações de ${item.descricao}`}>Ações</summary><div className="table-actions">
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
                                  onClick={() => setExclusao(item)}
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
                          </div></details>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {!pessoal && completo ? (
          <section className="panel">
            <div className="panel-header">
              <h2>Para onde vai o dinheiro</h2>
            </div>
            {carregando ? <div className="product-empty" role="status">Atualizando categorias…</div> : erro && !dados ? <p className="product-empty">Categorias indisponíveis. Tente carregar o período novamente.</p> : categorias.size ? (
              Array.from(categorias)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
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
            {!carregando && categorias.size > 5 ? <p className="category-other">Outras categorias: <strong>{formatarMoeda(Array.from(categorias).sort((a,b) => b[1]-a[1]).slice(5).reduce((total, [,valor]) => total + valor, 0))}</strong></p> : null}
            {!carregando && dados ? <Link className="text-button" href="/fluxo-caixa">Ver análise por período</Link> : null}
          </section>
        ) : null}
      </div>
      {!pessoal && !completo ? <div className="detail-reveal"><button className="text-button" onClick={() => alterar({ detalhes: "completo" })}>Ver detalhes do período →</button><p className="subtitle">Mais análises visuais, com os recursos do seu plano.</p></div> : null}
      {!pessoal && perfil === "empresa" ? <section className="panel team-responsibilities"><h2>Como a equipe trabalha</h2><p>Membros consultam e registram movimentações, vendas e despesas. Proprietário e administrador também editam e administram os acessos; somente o proprietário gerencia administradores. Documentos exigem Business, e envio e análise de documentos exigem gestão. A exportação depende do Pro ou Business.</p><Link className="text-button" href="/equipe">Consultar acessos da equipe →</Link></section> : null}
      {exclusao ? <ConfirmarExclusao descricao={exclusao.descricao} ocupado={ocupado} cancelar={() => setExclusao(null)} confirmar={() => void excluir(exclusao.id)} /> : null}

      {!pessoal && !carregando && dados ? <PrimeirosPassos temMovimentos={dados.movimentacoes.length > 0} /> : null}
    </WorkspaceShell>
  );
}
