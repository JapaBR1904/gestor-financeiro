"use client";
import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "./WorkspaceShell";
import { useWorkspace } from "../lib/workspace";
import { BloqueioPlano, VazioProduto } from "./EstadoProduto";
import {
  AnaliseFinanceira,
  analiseFinanceira,
  datasDoMes,
  exportarFinanceiro,
} from "../lib/financeiro";
import { formatarMoeda } from "../lib/produtos";
import { planoPermite } from "../lib/planos";

export function AnaliseConteudo() {
  const { config, usuario } = useWorkspace();
  const [dados, setDados] = useState<AnaliseFinanceira | null>(null);
  const [erro, setErro] = useState("");
  const [periodo, setPeriodo] = useState<{
    inicio: string;
    fim: string;
  } | null>(null);
  const [campos, setCampos] = useState({ inicio: "", fim: "" });
  const [exportando, setExportando] = useState(false);
  const pro = config && planoPermite(config.plano, "pro");
  useEffect(() => {
    if (!pro) return;
    let ativo = true;
    const escolhido = periodo ?? datasDoMes();
    analiseFinanceira(escolhido.inicio, escolhido.fim)
      .then((resumo) => {
        if (ativo) {
          setDados(resumo);
          setCampos({ inicio: resumo.atual.inicio, fim: resumo.atual.fim });
          setErro("");
        }
      })
      .catch((error) => {
        if (ativo)
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a análise.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [pro, periodo, usuario?.organizacaoId]);
  function filtrar(e: FormEvent) {
    e.preventDefault();
    setPeriodo({ ...campos });
  }
  async function exportar() {
    if (!dados || exportando) return;
    setExportando(true);
    try {
      await exportarFinanceiro(dados.atual.inicio, dados.atual.fim);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      setExportando(false);
    }
  }
  const saldos = dados?.evolucao.map((d) => d.saldo) ?? [];
  const minimo = Math.min(0, ...saldos);
  const maximo = Math.max(1, ...saldos);
  const amplitude = maximo - minimo;
  const pontos = saldos
    .map(
      (saldo, i) =>
        `${15 + (i / Math.max(1, saldos.length - 1)) * 610},${140 - ((saldo - minimo) / amplitude) * 115}`,
    )
    .join(" ");
  return (
    <WorkspaceShell
      titulo="Fluxo de caixa"
      descricao="Compare períodos, acompanhe o saldo acumulado e identifique os gastos que mais pesam."
    >
      {!config ? (
        <p role="status">Carregando seu plano…</p>
      ) : !pro ? (
        <BloqueioPlano
          plano="Pro"
          titulo="Veja a evolução do seu dinheiro"
          descricao="A análise por período reúne entradas, saídas, categorias e comparação com o intervalo anterior."
        />
      ) : (
        <>
          <form className="period-toolbar" onSubmit={filtrar}>
            <label className="field">
              <span>De</span>
              <input
                aria-label="De"
                type="date"
                required
                value={campos.inicio}
                onChange={(e) =>
                  setCampos({ ...campos, inicio: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Até</span>
              <input
                aria-label="Até"
                type="date"
                required
                value={campos.fim}
                onChange={(e) => setCampos({ ...campos, fim: e.target.value })}
              />
            </label>
            <button className="secondary-button">Comparar período</button>
            <button
              className="secondary-button"
              type="button"
              disabled={exportando || !dados}
              onClick={exportar}
            >
              {exportando ? "Exportando…" : "Exportar CSV"}
            </button>
          </form>
          {erro ? (
            <p className="form-error-banner" role="alert">
              {erro}
              <button
                className="text-button"
                onClick={() =>
                  setPeriodo(periodo ? { ...periodo } : datasDoMes())
                }
              >
                Tentar novamente
              </button>
            </p>
          ) : null}
          {!dados && !erro ? (
            <p role="status">Carregando a análise…</p>
          ) : dados ? (
            <>
              <section className="finance-summary">
                {[
                  {
                    nome: "Entradas",
                    valor: dados.atual.receitas,
                    anterior: dados.anterior.receitas,
                  },
                  {
                    nome: "Saídas",
                    valor: dados.atual.despesas,
                    anterior: dados.anterior.despesas,
                  },
                  {
                    nome: "Saldo",
                    valor: dados.atual.saldo,
                    anterior: dados.anterior.saldo,
                  },
                ].map((item) => (
                  <article className="summary-card" key={item.nome}>
                    <span>{item.nome}</span>
                    <strong>{formatarMoeda(item.valor)}</strong>
                    <small>Anterior: {formatarMoeda(item.anterior)}</small>
                  </article>
                ))}
              </section>
              <div className="product-two-columns">
                <section className="panel">
                  <div className="panel-header">
                    <h2>Saldo acumulado no período</h2>
                  </div>
                  {dados.atual.movimentacoes.length === 0 ? (
                    <VazioProduto
                      titulo="Ainda não há movimentações"
                      texto="Adicione lançamentos ou escolha outro período para analisar a evolução."
                    />
                  ) : (
                    <>
                      <svg
                        className="financial-chart"
                        viewBox="0 0 640 160"
                        role="img"
                        aria-label="Evolução diária do saldo acumulado"
                      >
                        {[25, 60, 100, 140].map((y) => (
                          <line
                            key={y}
                            className="chart-grid"
                            x1="15"
                            x2="625"
                            y1={y}
                            y2={y}
                          />
                        ))}
                        <polygon
                          className="chart-area"
                          points={`15,145 ${pontos} 625,145`}
                        />
                        <polyline className="chart-line" points={pontos} />
                      </svg>
                      <div className="chart-caption">
                        <span>{dados.atual.inicio}</span>
                        <span>{dados.atual.fim}</span>
                      </div>
                    </>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-header">
                    <h2>Comparativo</h2>
                  </div>
                  <p className="subtitle">
                    Intervalo anterior de mesma duração: {dados.anterior.inicio}{" "}
                    a {dados.anterior.fim}.
                  </p>
                  <div className="comparison-list">
                    {[
                      {
                        nome: "Receitas",
                        atual: dados.atual.receitas,
                        anterior: dados.anterior.receitas,
                      },
                      {
                        nome: "Despesas",
                        atual: dados.atual.despesas,
                        anterior: dados.anterior.despesas,
                      },
                      {
                        nome: "Resultado",
                        atual: dados.atual.saldo,
                        anterior: dados.anterior.saldo,
                      },
                    ].map((item) => (
                      <div className="comparison-row" key={item.nome}>
                        <span>{item.nome}</span>
                        <strong>
                          {item.atual - item.anterior >= 0 ? "+" : ""}
                          {formatarMoeda(item.atual - item.anterior)}
                        </strong>
                        <small>Variação em relação ao período anterior</small>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <section className="panel" style={{ marginTop: 20 }}>
                <div className="panel-header">
                  <h2>Despesas por categoria</h2>
                </div>
                {Object.keys(dados.categorias).length ? (
                  Object.entries(dados.categorias)
                    .sort((a, b) => b[1] - a[1])
                    .map(([nome, valor]) => (
                      <div className="category-row" key={nome}>
                        <span>{nome}</span>
                        <strong>{formatarMoeda(valor)}</strong>
                        <div className="category-track">
                          <span
                            style={{
                              width: `${dados.atual.despesas ? (valor / dados.atual.despesas) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <VazioProduto
                    titulo="Nenhuma saída no período"
                    texto="As categorias serão calculadas a partir dos gastos registrados."
                  />
                )}
              </section>
            </>
          ) : null}
        </>
      )}
    </WorkspaceShell>
  );
}
