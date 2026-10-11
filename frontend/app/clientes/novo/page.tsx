"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../../components/Sidebar";
import { formatarTelefone, salvarCliente } from "../../../lib/clientes";
import { capitalizarPalavras } from "../../../lib/formatacao";

export default function NovoClientePage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    setSalvando(true);
    try {
      await salvarCliente({ nome: nome.trim(), telefone: telefone.trim(), observacao: observacao.trim() });
      router.push("/clientes");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="clientes" />
      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Relacionamento</p><h1>Novo cliente</h1><p className="subtitle">Cadastre os dados básicos do cliente com informações claras e padronizadas.</p></div>
          <Link className="secondary-button" href="/clientes">Voltar para clientes</Link>
        </header>

        <form className="product-form-stack" onSubmit={handleSubmit}>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field field-wide"><span>Nome *</span><input autoComplete="name" value={nome} maxLength={160} onChange={(event) => setNome(capitalizarPalavras(event.target.value))} placeholder="Ex.: Maria Oliveira" /></label>
              <label className="field field-wide"><span>Telefone / WhatsApp</span><input autoComplete="tel" inputMode="numeric" value={telefone} maxLength={15} onChange={(event) => setTelefone(formatarTelefone(event.target.value))} placeholder="(11) 99999-9999" /><small>A formatação é aplicada automaticamente.</small></label>
              <label className="field field-wide"><span>Observação</span><textarea rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Anotações importantes sobre o cliente" /></label>
            </div>
          </section>

          {erro ? <p className="form-error-banner">{erro}</p> : null}
          <div className="form-actions standalone-actions"><Link className="secondary-button" href="/clientes">Cancelar</Link><button className="primary-button" type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar cliente"}</button></div>
        </form>
      </section>
    </main>
  );
}
