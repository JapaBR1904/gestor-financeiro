"use client";
import { usePreferencias } from "./PreferenciasProvider";

export function EdicaoProtegida({ children }: { children: React.ReactNode }) {
  const { ocultarValores, alterar } = usePreferencias();
  return ocultarValores ? <section className="panel">
    <h2>Valores ocultos</h2>
    <p className="subtitle">Revele os valores para preencher ou editar este registro.</p>
    <button type="button" className="secondary-button" onClick={() => alterar({ ocultarValores: false })}>Revelar valores para editar</button>
  </section> : children;
}
