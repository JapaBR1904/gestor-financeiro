"use client";
import { useId, type SVGProps } from "react";

/** Símbolo de conexão: um N contínuo e seus dois pontos de fluxo. */
export function Marca(props: SVGProps<SVGSVGElement>) {
  const gradiente = `nexo-${useId().replaceAll(":", "")}`;
  return (
    <svg width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <defs><linearGradient id={gradiente} x1="7" y1="31" x2="33" y2="9" gradientUnits="userSpaceOnUse"><stop stopColor="#2563EB"/><stop offset=".55" stopColor="#3882F6"/><stop offset="1" stopColor="#22D3EE"/></linearGradient></defs>
      <path className="marca-traco" d="M9 29V11L31 29V11" stroke={`url(#${gradiente})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle className="marca-ponto marca-ponto-inicio" cx="9" cy="29" r="3.8" fill="#3882F6"/>
      <circle className="marca-ponto marca-ponto-fim" cx="31" cy="11" r="3.8" fill="#22D3EE"/>
    </svg>
  );
}
