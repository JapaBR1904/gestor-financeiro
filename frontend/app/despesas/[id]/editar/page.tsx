"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "../../../../components/Sidebar";
import { EdicaoProtegida } from "../../../../components/EdicaoProtegida";
import { atualizarDespesa, carregarDespesa, FormaPagamentoDespesa } from "../../../../lib/despesas";

export default function EditarDespesaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const envioEmCurso = useRef(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dataDespesa, setDataDespesa] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoDespesa>("pix");
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDespesa(params.id)
      .then((despesa) => {
        setDescricao(despesa.descricao);
        setValor(String(despesa.valor).replace(".", ","));
        setCategoria(despesa.categoria);
        setDataDespesa(despesa.dataDespesa);
        setFormaPagamento(despesa.formaPagamento);
        setObservacao(despesa.observacao ?? "");
      })
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar a despesa."))
      .finally(() => setCarregando(false));
  }, [params.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (envioEmCurso.current) return;
    setErro("");
    const numeroValor = Number(valor.replace(",", "."));
    if (!descricao.trim() || !categoria.trim() || !dataDespesa || !Number.isFinite(numeroValor) || numeroValor <= 0) {
      setErro("Preencha descrição, valor, categoria e data corretamente.");
      return;
    }

    envioEmCurso.current = true;
    setSalvando(true);
    try {
      await atualizarDespesa(params.id, {
        descricao: descricao.trim(),
        valor: numeroValor,
        categoria: categoria.trim(),
        dataDespesa,
        formaPagamento,
        observacao: observacao.trim(),
      });
      router.push(`/despesas/${params.id}`);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a despesa.");
    } finally {
      envioEmCurso.current = false;
      setSalvando(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="despesas" />
      <section className="content" id="conteudo" tabIndex={-1}>
        <header className="topbar">
          <div><p className="eyebrow">Financeiro</p><h1>Editar despesa</h1><p className="subtitle">Corrija os dados do lançamento sem criar uma nova despesa.</p></div>
          <Link className="secondary-button" href={`/despesas/${params.id}`}>Cancelar</Link>
        </header>

        {carregando ? <article className="panel"><div className="empty-state"><strong>Carregando despesa...</strong></div></article> : (
          <EdicaoProtegida><form className="product-form-stack" onSubmit={handleSubmit}>
            <section className="panel product-form">
              <div className="form-grid">
                <label className="field field-wide"><span>Descrição *</span><input aria-label="Descrição *" maxLength={180} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></label>
                <label className="field"><span>Valor *</span><input aria-label="Valor *" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
                <label className="field"><span>Categoria *</span><input aria-label="Categoria *" maxLength={80} value={categoria} onChange={(e) => setCategoria(e.target.value)} /></label>
                <label className="field"><span>Data *</span><input aria-label="Data *" required type="date" value={dataDespesa} onChange={(e) => setDataDespesa(e.target.value)} /></label>
                <label className="field"><span>Forma de pagamento *</span><select aria-label="Forma de pagamento *" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamentoDespesa)}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="debito">Cartão de débito</option><option value="credito">Cartão de crédito</option><option value="outro">Outro</option></select></label>
                <label className="field field-wide"><span>Observação</span><textarea aria-label="Observação" maxLength={2000} rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></label>
              </div>
            </section>
            {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
            <div className="form-actions standalone-actions"><Link className="secondary-button" href={`/despesas/${params.id}`}>Cancelar</Link><button className="primary-button" disabled={salvando} type="submit">{salvando ? "Salvando..." : "Salvar alterações"}</button></div>
          </form></EdicaoProtegida>
        )}
      </section>
    </main>
  );
}
