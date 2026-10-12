"use client";

import { useState } from "react";

export function validarSenha(senha: string, confirmacao: string): string | null {
  if (!senha.trim() || senha.length < 8 || new TextEncoder().encode(senha).length > 72) {
    return "Use uma senha com pelo menos 8 caracteres e no máximo 72 bytes.";
  }
  return senha === confirmacao ? null : "As senhas não coincidem.";
}

export default function PasswordFields({ senha, setSenha, confirmacao, setConfirmacao }: {
  senha: string;
  setSenha: (valor: string) => void;
  confirmacao?: string;
  setConfirmacao?: (valor: string) => void;
}) {
  const [visivel, setVisivel] = useState(false);
  const nova = setConfirmacao !== undefined;
  return (
    <>
      <label className="field">
        <span>{nova ? "Nova senha" : "Senha"}</span>
        <input type={visivel ? "text" : "password"} autoComplete={nova ? "new-password" : "current-password"}
          value={senha} onChange={(e) => setSenha(e.target.value)} maxLength={72} required
          minLength={nova ? 8 : undefined} aria-describedby={nova ? "password-help" : undefined} />
      </label>
      {nova ? <p id="password-help" className="auth-help">Pelo menos 8 caracteres. Use uma senha que você não usa em outros sites.</p> : null}
      {setConfirmacao ? (
        <label className="field"><span>Confirme a senha</span>
          <input type={visivel ? "text" : "password"} autoComplete="new-password" value={confirmacao ?? ""}
            onChange={(e) => setConfirmacao(e.target.value)} maxLength={72} minLength={8} required />
        </label>
      ) : null}
      <label className="auth-show-password"><input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} /> Mostrar senha</label>
    </>
  );
}
