// O fragmento fica no navegador; nunca enviar token de convite no GET ou em logs.
export function destinoConvite(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.hash.slice(1)).get(
    "convite",
  );
  return token && /^[A-Za-z0-9_-]{43}$/.test(token)
    ? `/convite#${token}`
    : null;
}
export function fragmentoConvite(): string {
  const destino = destinoConvite();
  return destino ? `#convite=${destino.split("#")[1]}` : "";
}
