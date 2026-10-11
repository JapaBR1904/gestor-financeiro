"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "../../../components/Sidebar";
import { formatarMoeda } from "../../../lib/produtos";
import { carregarDespesa, Despesa, nomeFormaPagamentoDespesa } from "../../../lib/despesas";

export default function DespesaDetalhePage() {
  const params = useParams<{ id: string }>();
  const [despesa, setDespesa] = useState<Despesa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDespesa(params.id)
      .then(setDespesa)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar a despesa."))
      .finally(() => setCarregando(false));
  }, [params.id]);

  return (
    <main className="app-shell">
      <Sidebar ativo="despesas" />
      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Histórico de despesas</p><h1>{despesa ? despesa.descricao : "Despesa"}</h1><p className="subtitle">Confira os dados registrados para esta despesa.</p></div>
          <Link className="secondary-button" href="/despesas">Voltar para despesas</Link>
        </header>

        {carregando ? <article className="panel"><div className="empty-state"><strong>Carregando despesa...</strong></div></article> : erro || !despesa ? (
          <article className="panel"><div className="empty-state"><strong>Não foi possível carregar a despesa</strong><p>{erro}</p></div></article>
        ) : (
          <div className="product-form-stack">
            <section className="summary-grid">
              <article className="summary-card"><span>Valor</span><strong>{formatarMoeda(despesa.valor)}</strong><small>Valor registrado</small></article>
              <article className="summary-card"><span>Data</span><strong>{new Date(`${despesa.dataDespesa}T00:00:00`).toLocaleDateString("pt-BR")}</strong><small>Data da despesa</small></article>
              <article className="summary-card"><span>Categoria</span><strong>{despesa.categoria}</strong><small>Classificação da saída</small></article>
              <article className="summary-card"><span>Forma de pagamento</span><strong>{nomeFormaPagamentoDespesa(despesa.formaPagamento)}</strong><small>Como foi pago</small></article>
            </section>

            {despesa.observacao ? <article className="panel"><div className="panel-header"><div><p className="eyebrow">Observação</p><h2>Anotação da despesa</h2></div></div><p>{despesa.observacao}</p></article> : null}
          </div>
        )}
      </section>
    </main>
  );
}
