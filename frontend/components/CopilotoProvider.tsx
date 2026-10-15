"use client";
import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ContextoCopiloto, contextoDaPagina, type TelaFinanceira } from "../lib/contexto-copiloto";
import { useWorkspace } from "../lib/workspace";
import { ConversaIa } from "./ConversaIa";
import { Marca } from "./Marca";
import { conterFocoNoDialog } from "../lib/foco";

const mediaDesktop = "(min-width: 1280px)";
function observarDesktop(avisar: () => void) {
  const media = window.matchMedia(mediaDesktop); media.addEventListener("change", avisar);
  return () => media.removeEventListener("change", avisar);
}
export function CopilotoProvider({ children }: { children: React.ReactNode }) {
  const [tela, setTela] = useState<TelaFinanceira | null>(null);
  const [aberto, setAberto] = useState(false);
  const publicar = useCallback((nova: TelaFinanceira) => setTela(nova), []);
  return <ContextoCopiloto.Provider value={{ tela, publicar }}><div className={aberto ? "copilot-open" : undefined}>{children}<CopilotoBusiness aberto={aberto} alternar={() => setAberto(atual => !atual)} fechar={() => setAberto(false)} /></div></ContextoCopiloto.Provider>;
}
function CopilotoBusiness({ aberto, alternar, fechar }: { aberto: boolean; alternar: () => void; fechar: () => void }) {
  const { config } = useWorkspace();
  const caminho = usePathname();
  const contexto = contextoDaPagina(caminho);
  const { tela } = useContext(ContextoCopiloto);
  const desktop = useSyncExternalStore(observarDesktop, () => window.matchMedia(mediaDesktop).matches, () => false);
  const dialog = useRef<HTMLDialogElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const jaAbriu = useRef(false);
  const habilitado = config?.plano === "business" && contexto && caminho !== "/ia";
  useEffect(() => {
    if (!aberto || desktop || !habilitado) return;
    const elemento = dialog.current;
    elemento?.showModal();
    return () => elemento?.close();
  }, [aberto, desktop, habilitado]);
  useEffect(() => {
    if (aberto) jaAbriu.current = true;
    else if (jaAbriu.current) gatilho.current?.focus();
  }, [aberto]);
  if (!habilitado) return null;
  const sincronizar = ["/dashboard", "/pessoal", "/fluxo-caixa"].includes(contexto.pagina);
  const atual = tela?.rota === caminho ? tela : null;
  const periodo = atual?.inicio && atual?.fim ? { inicio: atual.inicio, fim: atual.fim } : undefined;
  const carregando = sincronizar && (!atual || atual.carregando);
  const conteudo = <>
    <header className="copilot-header"><div><Marca /><div><h2 id="copilot-title">Nexo Copiloto</h2><p>Assistente financeiro</p></div></div><button className="secondary-button" type="button" aria-label="Fechar copiloto" autoFocus onClick={fechar}>×</button></header>
    <div className="copilot-body"><ConversaIa key={`${caminho}:${periodo?.inicio}:${periodo?.fim}`} pagina={contexto.pagina} periodo={periodo} carregandoContexto={carregando} compacto /></div>
  </>;
  return <>
    <button ref={gatilho} className="copilot-trigger" aria-expanded={aberto} aria-controls="nexo-copilot-panel" onClick={alternar}><Marca />Nexo Copiloto</button>
    {aberto ? desktop ? <aside id="nexo-copilot-panel" className="copilot-panel" aria-labelledby="copilot-title" onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); fechar(); } }}>{conteudo}</aside> : <dialog ref={dialog} id="nexo-copilot-panel" className="copilot-drawer" aria-labelledby="copilot-title" onKeyDown={conterFocoNoDialog} onCancel={e => { e.preventDefault(); fechar(); }}>{conteudo}</dialog> : null}
  </>;
}
