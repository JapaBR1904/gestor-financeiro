"use client";
import { useMoeda } from "../../../components/PreferenciasProvider";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "../../../components/Sidebar";

import { carregarDespesa, Despesa, excluirDespesa, nomeFormaPagamentoDespesa } from "../../../lib/despesas";

export default function DespesaDetalhePage() {
  const formatarMoeda = useMoeda();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [despesa, setDespesa] = useState<Despesa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDespesa(params.id)
      .then(setDespesa)
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar a despesa."))
      .finally(() => setCarregando(false));
  }, [params.id]);

  async function excluir() {
    if (!window.confirm("Excluir esta despesa? Essa ação não pode ser desfeita.")) return;
    setExcluindo(true);
    setErro("");
    try {
      await excluirDespesa(params.id);
      router.push("/despesas");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir a despesa.");
      setExcluindo(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="despesas" />
      <section className="content" id="conteudo" tabIndex={-1}>
        <header className="topbar">
          <div><p className="eyebrow">Histórico de despesas</p><h1>{despesa ? despesa.descricao : "Despesa"}</h1><p className="subtitle">Confira e mantenha os dados desse lançamento atualizados.</p></div>
          <div className="form-actions"><Link className="secondary-button" href="/despesas">Voltar</Link>{despesa ? <Link className="secondary-button" href={`/despesas/${params.id}/editar`}>Editar</Link> : null}</div>
        </header>

        {erro ? <p className="form-error-banner">{erro}</p> : null}

        {carregando ? <article className="panel"><div className="empty-state"><strong>Carregando despesa...</strong></div></article> : !despesa ? (
          <article className="panel"><div className="empty-state"><strong>Não foi possível carregar a despesa</strong></div></article>
        ) : (
          <div className="product-form-stack">
            <section className="summary-grid">
              <article className="summary-card"><span>Valor</span><strong>{formatarMoeda(despesa.valor)}</strong><small>Valor registrado</small></article>
              <article className="summary-card"><span>Data</span><strong>{new Date(`${despesa.dataDespesa}T00:00:00`).toLocaleDateString("pt-BR")}</strong><small>Data da despesa</small></article>
              <article className="summary-card"><span>Categoria</span><strong>{despesa.categoria}</strong><small>Classificação da saída</small></article>
              <article className="summary-card"><span>Forma de pagamento</span><strong>{nomeFormaPagamentoDespesa(despesa.formaPagamento)}</strong><small>Como foi pago</small></article>
            </section>

            {despesa.observacao ? <article className="panel"><div className="panel-header"><div><p className="eyebrow">Observação</p><h2>Anotação da despesa</h2></div></div><p>{despesa.observacao}</p></article> : null}

            <article className="panel danger-zone"><div><p className="eyebrow">Atenção</p><h2>Excluir lançamento</h2><p className="subtitle">Use apenas se esta despesa tiver sido registrada por engano.</p></div><button className="secondary-button" type="button" disabled={excluindo} onClick={excluir}>{excluindo ? "Excluindo..." : "Excluir despesa"}</button></article>
          </div>
        )}
      </section>
    </main>
  );
}
