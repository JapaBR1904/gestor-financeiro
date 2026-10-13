import type { SVGProps } from "react";

export function Marca(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M5 18V6l14 12V6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}
