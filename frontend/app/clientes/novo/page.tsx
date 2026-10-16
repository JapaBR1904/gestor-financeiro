"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "../../../components/WorkspaceShell";
import { formatarTelefone, salvarCliente } from "../../../lib/clientes";
import { capitalizarPalavras } from "../../../lib/formatacao";

export default function NovoClientePage() {
  const router = useRouter();
  const envioEmCurso = useRef(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (envioEmCurso.current) return;
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    envioEmCurso.current = true;
    setSalvando(true);
    try {
      await salvarCliente({ nome: nome.trim(), telefone: telefone.trim(), observacao: observacao.trim() });
      router.push("/clientes");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    } finally {
      envioEmCurso.current = false;
      setSalvando(false);
    }
  }

  return (
    <WorkspaceShell cabecalho={<header className="topbar">
          <div><p className="eyebrow">Relacionamento</p><h1>Novo cliente</h1><p className="subtitle">Cadastre os dados básicos do cliente com informações claras e padronizadas.</p></div>
          <Link className="secondary-button" href="/clientes">Voltar para clientes</Link>
        </header>}>


        <form className="product-form-stack" onSubmit={handleSubmit}>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field field-wide"><span>Nome *</span><input aria-label="Nome *" required autoComplete="name" value={nome} maxLength={160} onChange={(event) => setNome(capitalizarPalavras(event.target.value))} placeholder="Ex.: Maria Oliveira" /></label>
              <label className="field field-wide"><span>Telefone / WhatsApp</span><input aria-label="Telefone / WhatsApp" autoComplete="tel" inputMode="numeric" value={telefone} maxLength={15} onChange={(event) => setTelefone(formatarTelefone(event.target.value))} placeholder="(11) 99999-9999" /><small>A formatação é aplicada automaticamente.</small></label>
              <label className="field field-wide"><span>Observação</span><textarea aria-label="Observação" rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Anotações importantes sobre o cliente" /></label>
            </div>
          </section>

          {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
          <div className="form-actions standalone-actions"><Link className="secondary-button" href="/clientes">Cancelar</Link><button className="primary-button" type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar cliente"}</button></div>
        </form>
      </WorkspaceShell>
  );
}
