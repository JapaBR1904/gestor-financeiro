"use client";
import { useEffect, useRef } from "react";

/** Observa poucos grupos; o conteúdo continua visível mesmo sem JS ou animação. */
export function LandingMotion() {
  const topo = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const raiz = topo.current?.closest(".landing");
    if (!raiz || typeof IntersectionObserver === "undefined") return;
    const header = raiz.querySelector(".landing-header");
    header?.classList.add("header-ready");
    const cabecalho = new IntersectionObserver(([entrada]) =>
      header?.classList.toggle("is-scrolled", !entrada.isIntersecting),
    );
    if (topo.current) cabecalho.observe(topo.current);
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const secoes = Array.from(raiz.querySelectorAll("[data-reveal]"));
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          if (!movimento.matches)
            entrada.target.classList.add("section-revealed");
          observador.unobserve(entrada.target);
        }
      },
      { threshold: 0.08 },
    );
    if (!movimento.matches)
      secoes.forEach((secao) => observador.observe(secao));
    const reduzir = () => {
      if (!movimento.matches) return;
      observador.disconnect();
      secoes.forEach((secao) => secao.classList.remove("section-revealed"));
    };
    movimento.addEventListener("change", reduzir);
    return () => {
      header?.classList.remove("header-ready", "is-scrolled");
      cabecalho.disconnect();
      observador.disconnect();
      movimento.removeEventListener("change", reduzir);
      secoes.forEach((secao) => secao.classList.remove("section-revealed"));
    };
  }, []);
  return (
    <span className="landing-top-sentinel" ref={topo} aria-hidden="true" />
  );
}
