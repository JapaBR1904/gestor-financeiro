export function capitalizarPalavras(valor: string) {
  return valor.replace(/(^|\s)([\p{L}])/gu, (_, espaco: string, letra: string) => `${espaco}${letra.toLocaleUpperCase("pt-BR")}`);
}

export function emailValido(valor: string) {
  const email = valor.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}
