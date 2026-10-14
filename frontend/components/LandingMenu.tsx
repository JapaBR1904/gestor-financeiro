"use client";
import Link from "next/link";
import { useRef } from "react";
import { Icone } from "./Icone";

export function LandingMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details className="landing-mobile-menu" ref={menu} onKeyDown={e => {
    if (e.key === "Escape") { menu.current?.removeAttribute("open"); menu.current?.querySelector("summary")?.focus(); }
  }}>
    <summary aria-label="Menu de navegação"><Icone nome="menu" /></summary>
    <nav aria-label="Navegação mobile" onClick={e => { if ((e.target as HTMLElement).closest("a")) menu.current?.removeAttribute("open"); }}>
      <a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a>
      <Link href="/login">Entrar</Link><Link className="landing-button" href="/cadastro">Criar conta</Link>
    </nav>
  </details>;
}
