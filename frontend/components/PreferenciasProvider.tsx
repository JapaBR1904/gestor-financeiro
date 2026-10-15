"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { useWorkspace } from "../lib/workspace";
import { formatarMoeda } from "../lib/produtos";

type Preferencias = { detalhes: "essencial" | "completo"; ocultarValores: boolean };
const padrao: Preferencias = { detalhes: "essencial", ocultarValores: false };
const memoria = new Map<string, string>();
const ContextoPreferencias = createContext<{ detalhes: Preferencias["detalhes"]; ocultarValores: boolean; alterar: (novas: Partial<Preferencias>) => void }>({ ...padrao, alterar: () => {} });
function observar(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener("nexo:preferencias", avisar);
  return () => { window.removeEventListener("storage", avisar); window.removeEventListener("nexo:preferencias", avisar); };
}
export function PreferenciasProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useWorkspace();
  const chave = usuario ? `nexo:visual:${usuario.id}:${usuario.organizacaoId}` : "nexo:visual:visitante";
  const valor = useSyncExternalStore(observar, () => {
    try { return localStorage.getItem(chave) ?? memoria.get(chave) ?? ""; } catch { return memoria.get(chave) ?? ""; }
  }, () => "");
  let preferencias = padrao;
  try {
    const salvo = JSON.parse(valor);
    preferencias = { detalhes: salvo.detalhes === "completo" ? "completo" : "essencial", ocultarValores: salvo.ocultarValores === true };
  } catch { /* Preferências ausentes ou antigas usam a experiência essencial. */ }
  return <ContextoPreferencias.Provider value={{ ...preferencias, alterar: (novas) => {
    const valor = JSON.stringify({ ...preferencias, ...novas });
    memoria.set(chave, valor);
    try { localStorage.setItem(chave, valor); }
    catch { /* Sem armazenamento, a preferência continua válida nesta sessão. */ }
    window.dispatchEvent(new Event("nexo:preferencias"));
  } }}>{children}</ContextoPreferencias.Provider>;
}
export const usePreferencias = () => useContext(ContextoPreferencias);
export function useMoeda() {
  const { ocultarValores } = usePreferencias();
  return (valor: number) => ocultarValores ? "R$ ••••••" : formatarMoeda(valor);
}
export function ControlesVisuais() {
  const { detalhes, ocultarValores, alterar } = usePreferencias();
  return <div className="visual-preferences">
    <div className="detail-switch" role="group" aria-label="Nível de detalhes">
      <button type="button" aria-pressed={detalhes === "essencial"} onClick={() => alterar({ detalhes: "essencial" })}>Essencial</button>
      <button type="button" aria-pressed={detalhes === "completo"} onClick={() => alterar({ detalhes: "completo" })}>Completo</button>
    </div>
    <button type="button" className="text-button privacy-toggle" aria-pressed={ocultarValores} onClick={() => alterar({ ocultarValores: !ocultarValores })}>{ocultarValores ? "Revelar valores" : "Ocultar valores"}</button>
  </div>;
}
