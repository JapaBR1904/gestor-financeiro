"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cancelarVenda, type Venda } from "../lib/vendas";
import { conterFocoNoDialog } from "../lib/foco";

export function CancelarVendaDialog({ venda, fechar, concluido }: { venda: Venda; fechar: () => void; concluido: (venda: Venda) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trava = useRef(false);
  const id = useId();
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { const elemento = dialog.current; elemento?.showModal(); return () => elemento?.close(); }, []);
  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    if ([...motivo.trim()].length < 3) { setErro("Informe um motivo com pelo menos 3 caracteres."); return; }
    trava.current = true; setOcupado(true); setErro("");
    try { concluido(await cancelarVenda(venda.id, motivo.trim())); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível cancelar a venda."); }
    finally { trava.current = false; setOcupado(false); }
  }
  return <dialog className="confirmation-dialog" ref={dialog} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-descricao`} onKeyDown={conterFocoNoDialog} onCancel={e => { e.preventDefault(); if (!ocupado) fechar(); }}>
    <h2 id={`${id}-titulo`}>Cancelar venda #{venda.id}?</h2>
    <p id={`${id}-descricao`}>A venda e seus itens serão preservados no histórico. Ela deixará de compor o faturamento e as análises financeiras.</p>
    <form onSubmit={confirmar} aria-busy={ocupado}>
      <label className="field"><span>Motivo do cancelamento</span><textarea autoFocus aria-label="Motivo do cancelamento" required minLength={3} maxLength={500} value={motivo} onChange={e => { setMotivo(e.target.value); setErro(""); }} disabled={ocupado} rows={3} /></label>
      {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
      <div className="product-form-actions"><button className="secondary-button" type="button" onClick={fechar} disabled={ocupado}>Manter venda</button><button className="primary-button" disabled={ocupado}>{ocupado ? "Cancelando…" : "Confirmar cancelamento"}</button></div>
    </form>
  </dialog>;
}
