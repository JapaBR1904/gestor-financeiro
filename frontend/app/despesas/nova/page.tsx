"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../../components/Sidebar";
import { EdicaoProtegida } from "../../../components/EdicaoProtegida";
import { FormaPagamentoDespesa, salvarDespesa } from "../../../lib/despesas";

export default function NovaDespesaPage() {
  const router = useRouter();
  const envioEmCurso = useRef(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dataDespesa, setDataDespesa] = useState(new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoDespesa>("pix");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

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
      await salvarDespesa({ descricao: descricao.trim(), valor: numeroValor, categoria: categoria.trim(), dataDespesa, formaPagamento, observacao: observacao.trim() });
      router.push("/despesas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a despesa.");
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
          <div><p className="eyebrow">Financeiro</p><h1>Nova despesa</h1><p className="subtitle">Registre uma saída de dinheiro do negócio.</p></div>
          <Link className="secondary-button" href="/despesas">Voltar para despesas</Link>
        </header>

        <EdicaoProtegida><form className="product-form-stack" onSubmit={handleSubmit}>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field field-wide"><span>Descrição *</span><input aria-label="Descrição *" required maxLength={180} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Compra de embalagens" /></label>
              <label className="field"><span>Valor *</span><input aria-label="Valor *" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></label>
              <label className="field"><span>Categoria *</span><input aria-label="Categoria *" required maxLength={80} value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Insumos, aluguel, energia" /></label>
              <label className="field"><span>Data *</span><input aria-label="Data *" required type="date" value={dataDespesa} onChange={(e) => setDataDespesa(e.target.value)} /></label>
              <label className="field"><span>Forma de pagamento *</span><select aria-label="Forma de pagamento *" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamentoDespesa)}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="debito">Cartão de débito</option><option value="credito">Cartão de crédito</option><option value="outro">Outro</option></select></label>
              <label className="field field-wide"><span>Observação</span><textarea aria-label="Observação" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informação adicional sobre a despesa" /></label>
            </div>
          </section>

          {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
          <div className="form-actions standalone-actions"><Link className="secondary-button" href="/despesas">Cancelar</Link><button className="primary-button" disabled={salvando} type="submit">{salvando ? "Registrando..." : "Registrar despesa"}</button></div>
        </form></EdicaoProtegida>
      </section>
    </main>
  );
}
