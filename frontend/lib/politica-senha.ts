export function requisitosSenha(senha: string) {
  return [
    { id: "tamanho", descricao: "Pelo menos 16 caracteres", atendido: Array.from(senha).length >= 16, erro: "A senha deve ter pelo menos 16 caracteres." },
    { id: "maiuscula", descricao: "Uma letra maiúscula", atendido: /\p{Lu}/u.test(senha), erro: "Inclua pelo menos uma letra maiúscula na senha." },
    { id: "minuscula", descricao: "Uma letra minúscula", atendido: /\p{Ll}/u.test(senha), erro: "Inclua pelo menos uma letra minúscula na senha." },
    { id: "numero", descricao: "Um número", atendido: /\p{Nd}/u.test(senha), erro: "Inclua pelo menos um número na senha." },
    { id: "especial", descricao: "Um caractere especial (como !, @ ou #)", atendido: /[\p{P}\p{S}]/u.test(senha), erro: "Inclua pelo menos um caractere especial na senha." },
    { id: "limite", descricao: "Dentro do limite de 72 bytes", atendido: new TextEncoder().encode(senha).length <= 72, erro: "A senha ultrapassa o limite de 72 bytes. Use uma senha menor." },
  ];
}

export function validarSenha(senha: string, confirmacao: string): string | null {
  if (!senha.trim()) return "Informe sua senha.";
  const faltante = requisitosSenha(senha).find((requisito) => !requisito.atendido);
  if (faltante) return faltante.erro;
  if (!confirmacao) return "Confirme sua senha.";
  return senha === confirmacao ? null : "As senhas não coincidem.";
}
