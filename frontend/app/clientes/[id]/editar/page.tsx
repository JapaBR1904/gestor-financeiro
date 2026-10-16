"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceShell } from "../../../../components/WorkspaceShell";
import { atualizarCliente, carregarCliente, formatarTelefone } from "../../../../lib/clientes";

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const envioEmCurso = useRef(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarCliente(params.id)
      .then((cliente) => {
        setNome(cliente.nome);
        setTelefone(formatarTelefone(cliente.telefone));
        setObservacao(cliente.observacao ?? "");
      })
      .catch((error) => setErro(error instanceof Error ? error.message : "Não foi possível carregar o cliente."))
      .finally(() => setCarregando(false));
  }, [params.id]);

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
      await atualizarCliente(params.id, { nome: nome.trim(), telefone: telefone.trim(), observacao: observacao.trim() });
      router.push(`/clientes/${params.id}`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar o cliente.");
    } finally {
      envioEmCurso.current = false;
      setSalvando(false);
    }
  }

  return (
    <WorkspaceShell cabecalho={<header className="topbar"><div><p className="eyebrow">Cliente</p><h1>Editar cliente</h1><p className="subtitle">Atualize os dados cadastrais.</p></div><Link className="secondary-button" href={`/clientes/${params.id}`}>Voltar</Link></header>}>

        {carregando ? <article className="panel"><div className="empty-state"><strong>Carregando cliente...</strong></div></article> : (
          <form className="product-form-stack" onSubmit={handleSubmit}>
            <section className="panel product-form"><div className="form-grid">
              <label className="field field-wide"><span>Nome *</span><input aria-label="Nome *" required value={nome} maxLength={160} onChange={(event) => setNome(event.target.value)} /></label>
              <label className="field field-wide"><span>Telefone / WhatsApp</span><input aria-label="Telefone / WhatsApp" inputMode="numeric" value={telefone} maxLength={15} onChange={(event) => setTelefone(formatarTelefone(event.target.value))} placeholder="(11) 99999-9999" /></label>
              <label className="field field-wide"><span>Observação</span><textarea aria-label="Observação" rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} /></label>
            </div></section>
            {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
            <div className="form-actions standalone-actions"><Link className="secondary-button" href={`/clientes/${params.id}`}>Cancelar</Link><button className="primary-button" type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</button></div>
          </form>
        )}
      </WorkspaceShell>
  );
}
