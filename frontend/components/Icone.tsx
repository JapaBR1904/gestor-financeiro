import type { SVGProps } from "react";
const desenhos = {
  circulo: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  mais: "M12 5v14 M5 12h14",
  chevrons: "m9 8 3-3 3 3 M9 16l3 3 3-3",
  seta: "M4 12h16 M14 6l6 6-6 6",
  fechar: "m6 6 12 12 M6 18 18 6",
  check: "m5 12 4 4L19 6",
  cadeado: "M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3",
  upload: "M12 16V3m-5 5 5-5 5 5 M4 16v5h16v-5",
  painel: "M3 3h7v7H3z M14 3h7v4h-7z M14 11h7v10h-7z M3 14h7v7H3z",
  movimentos: "M8 3v16m-4-4 4 4 4-4 M16 21V5m-4 4 4-4 4 4",
  relatorio: "M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h3",
  venda: "M4 17 10 11 14 15 20 5 M14 5h6v6",
  despesa: "M4 7 10 13 14 9 20 19 M14 19h6v-6",
  produto: "m12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9",
  clientes:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3a4 4 0 0 1 0 8",
  meta: "M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9 M17 3h4v4",
  fluxo: "M3 3v18h18 M7 14l4-4 4 3 6-8",
  ia: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z",
  empresa:
    "M3 21h18 M5 21V7l7-4 7 4v14 M9 10h1 M14 10h1 M9 14h1 M14 14h1 M10 21v-3h4v3",
  equipe:
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M2 21v-2a5 5 0 0 1 10 0v2 M14 15a5 5 0 0 1 8 4v2",
  documento: "M14 2H5v20h14V7l-5-5z M14 2v5h5 M8 12h8 M8 16h6",
  conta:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3z",
  sair: "M9 3H3v18h6 M9 12h12 M17 8l4 4-4 4",
  menu: "M4 6h16 M4 12h16 M4 18h16",
} as const;
export type NomeIcone = keyof typeof desenhos;
export function Icone({
  nome,
  ...props
}: SVGProps<SVGSVGElement> & { nome: NomeIcone }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={desenhos[nome]} />
    </svg>
  );
}
