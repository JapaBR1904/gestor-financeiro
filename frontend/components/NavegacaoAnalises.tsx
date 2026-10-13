"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "../lib/workspace";
import { planoPermite } from "../lib/planos";

export function NavegacaoAnalises() {
  const caminho = usePathname();
  const { config } = useWorkspace();
  return <nav className="analysis-navigation" aria-label="Análises financeiras">
    {[["/fluxo-caixa", "Fluxo de caixa"], ["/metas", "Metas"], ["/relatorios", "Relatórios comerciais"]].map(([href, nome]) => <Link key={href} href={href} aria-current={caminho === href ? "page" : undefined}>{nome}{href !== "/relatorios" && config && !planoPermite(config.plano, "pro") ? <span className="nav-lock">Pro</span> : null}</Link>)}
  </nav>;
}
