"use client";
import { WorkspaceShell } from "./WorkspaceShell";
import { Marca } from "./Marca";
import { ConversaIa } from "./ConversaIa";
export function IaConteudo() {
  return <WorkspaceShell titulo="Nexo IA" descricao="Entenda seus números sem precisar interpretar tudo sozinho.">
    <section className="ia-premium-intro"><div className="ia-signature"><Marca /><span>Clareza para decidir</span></div><h2>Um assistente conectado ao seu Nexo.</h2><p>Seu mês, suas despesas e suas metas viram uma conversa com contexto. Você escolhe o período e decide o que compartilhar.</p></section>
    <section className="panel ia-workbench"><ConversaIa /></section>
  </WorkspaceShell>;
}
