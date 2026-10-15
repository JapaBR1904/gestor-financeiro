"use client";
import { useEffect, useRef } from "react";
export function ConfirmarExclusao({ descricao, ocupado, cancelar, confirmar }: { descricao: string; ocupado: boolean; cancelar: () => void; confirmar: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog className="confirmation-dialog" ref={dialog} aria-labelledby="excluir-titulo" aria-describedby="excluir-descricao" onCancel={e => { e.preventDefault(); if (!ocupado) cancelar(); }}>
    <h2 id="excluir-titulo">Excluir movimentação?</h2>
    <p id="excluir-descricao">O lançamento “{descricao}” será removido deste espaço. Vendas, despesas comerciais e outras movimentações serão preservadas.</p>
    <div className="product-form-actions"><button className="secondary-button" autoFocus onClick={cancelar} disabled={ocupado}>Manter lançamento</button><button className="primary-button" onClick={confirmar} disabled={ocupado}>{ocupado ? "Excluindo…" : "Excluir lançamento"}</button></div>
  </dialog>;
}
