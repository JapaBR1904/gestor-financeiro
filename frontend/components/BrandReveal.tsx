"use client";
import { useEffect, useState } from "react";
import { Marca } from "./Marca";

const CHAVE = "nexo:brand-intro-seen";

export function BrandReveal() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const encerrar = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      setVisivel(false);
      window.removeEventListener("pointerdown", encerrar);
      window.removeEventListener("keydown", encerrar);
      movimento.removeEventListener("change", encerrar);
    };
    // Marcar dentro do frame evita perder a apresentação no Strict Mode do dev.
    frame = requestAnimationFrame(() => {
      try {
        if (sessionStorage.getItem(CHAVE)) return;
        sessionStorage.setItem(CHAVE, "1");
      } catch {
        return;
      } // Sem armazenamento, preferimos não repetir a introdução.
      if (movimento.matches) return;
      setVisivel(true);
      timer = setTimeout(encerrar, 1250);
    });
    window.addEventListener("pointerdown", encerrar);
    window.addEventListener("keydown", encerrar);
    movimento.addEventListener("change", encerrar);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("pointerdown", encerrar);
      window.removeEventListener("keydown", encerrar);
      movimento.removeEventListener("change", encerrar);
    };
  }, []);
  return visivel ? (
    <div className="brand-reveal" data-brand-intro aria-hidden="true">
      <div className="brand-reveal-halo" />
      <div className="brand-reveal-signature">
        <Marca />
        <span>Nexo</span>
      </div>
      <span className="brand-reveal-caption">
        Clareza. Inteligência. Conexão.
      </span>
    </div>
  ) : null;
}
