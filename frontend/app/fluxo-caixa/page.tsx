"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { carregarConfiguracaoSaas, planoPermite, PlanoNexo } from "../../lib/saas";
import { carregarRelatorioResumo, RelatorioResumo } from "../../lib/relatorios";
import { formatarMoeda } from "../../lib/produtos";

const vazio: RelatorioResumo = {
  quantidadeVendas: 0,
  faturamento: 0,
  custoVendas: 0,
  lucroBruto: 0,
  quantidadeDespesas: 0,
  totalDespesas: 0,
  saldoFinanceiro: 0,
  produtosMaisVendidos: [],
  formasPagamento: [],
  despesasPorCategoria: [],
  melhoresClientes: [],
};

export default function FluxoCaixaPage() {
  const [plano, setPlano] = useState<PlanoNexo>("free");
  const [dados, setDados] = useState<RelatorioResumo>(vazio);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      carregarConfiguracaoSaas().then((config) => setPlano(config.plano)),
      carregarRelatorioResumo().then(setDados).catch(() => setDados(vazio)),
    ]).finally(() => setCarregando(false));
  }, []);

  const liberado = planoPermite(plano, "pro");
  const movimentos = useMemo(() => [
    { titulo: "Entradas", valor: dados.faturamento, detalhe: `${dados.quantidadeVendas} venda(s)` },
    { titulo: "Saídas", valor: dados.totalDespesas, detalhe: `${dados.quantidadeDespesas} despesa(s)` },
    { titulo: "Saldo", valor: dados.saldoFinanceiro, detalhe: "Resultado financeiro" },
  ], [dados]);

  return (
    <main className="saas-shell premium-shell">
      <section className="saas-brandbar pricing-brandbar">
        <Link className="saas-brand" href="/"><span>N</span><div><strong>Nexo</strong><small>Fluxo de caixa</small></div></Link>
        <Link className="secondary-button compact-button" href="/">Voltar ao Nexo</Link>
      </section>

      {!carregando && !liberado ? (
        <section className="premium-lock-card"><span className="premium-lock-icon">↗</span><p className="eyebrow">Recurso Pro</p><h1>Fluxo de caixa avançado</h1><p>Transforme vendas e despesas já registradas em uma visão de entradas, saídas e saldo.</p><Link className="primary-button" href="/planos">Conhecer o Pro</Link></section>
      ) : liberado ? (
        <>
          <section className="premium-heading"><p className="eyebrow">Plano Pro</p><h1>Fluxo de caixa</h1><p>Uma leitura financeira baseada nos lançamentos que já existem no Nexo.</p></section>
          <section className="premium-kpi-grid">
            {movimentos.map((item) => <article className="premium-kpi-card" key={item.titulo}><span>{item.titulo}</span><strong>{carregando ? "—" : formatarMoeda(item.valor)}</strong><small>{item.detalhe}</small></article>)}
          </section>
          <section className="cashflow-visual-card">
            <div className="cashflow-visual-heading"><div><p className="eyebrow">Leitura rápida</p><h2>Entradas x saídas</h2></div><span>Atual</span></div>
            <div className="cashflow-comparison">
              <div><span>Entradas</span><div className="cashflow-track"><i style={{ width: `${Math.min(100, dados.faturamento > 0 ? 100 : 4)}%` }} /></div><strong>{formatarMoeda(dados.faturamento)}</strong></div>
              <div><span>Saídas</span><div className="cashflow-track expense"><i style={{ width: `${Math.min(100, dados.faturamento > 0 ? (dados.totalDespesas / dados.faturamento) * 100 : dados.totalDespesas > 0 ? 100 : 4)}%` }} /></div><strong>{formatarMoeda(dados.totalDespesas)}</strong></div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
