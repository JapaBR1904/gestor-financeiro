import type { KeyboardEvent } from "react";
export function conterFocoNoDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const itens = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])'))
    .filter(item => item.getClientRects().length > 0 && !item.closest("[inert]"));
  const primeiro = itens[0], ultimo = itens[itens.length - 1];
  if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo?.focus(); }
  else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro?.focus(); }
}
