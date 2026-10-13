"use client";

import { useId, useState } from "react";
import { requisitosSenha } from "../lib/politica-senha";

export default function PasswordFields({ senha, setSenha, confirmacao, setConfirmacao }: {
  senha: string;
  setSenha: (valor: string) => void;
  confirmacao?: string;
  setConfirmacao?: (valor: string) => void;
}) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();
  const nova = setConfirmacao !== undefined;
  const requisitos = requisitosSenha(senha);
  const atendidos = requisitos.filter((requisito) => requisito.atendido).length;
  const confirmou = Boolean(confirmacao);
  const diferentes = confirmou && senha !== confirmacao;

  return (
    <>
      <label className="field">
        <span>{nova ? "Nova senha" : "Senha"}</span>
        <input aria-label={nova ? "Nova senha" : "Senha"} type={visivel ? "text" : "password"} autoComplete={nova ? "new-password" : "current-password"}
          value={senha} onChange={(e) => setSenha(e.target.value)} maxLength={72} required
          minLength={nova ? 16 : undefined} aria-describedby={nova ? `${id}-requisitos ${id}-ajuda` : undefined} />
      </label>
      {nova ? (
        <div className="auth-password-policy">
          <p id={`${id}-ajuda`} className="auth-help">Use uma senha exclusiva. Acentos e emojis podem ocupar mais de um byte.</p>
          <ul id={`${id}-requisitos`} className="auth-password-requirements" aria-label="Requisitos da senha">
            {requisitos.map((requisito) => (
              <li key={requisito.id} data-atendido={requisito.atendido}>
                <span aria-hidden="true">{requisito.atendido ? "✓" : "○"}</span>
                <span>{requisito.descricao}</span>
                <span className="auth-requirement-status">{requisito.atendido ? "Atendido" : "Falta"}</span>
              </li>
            ))}
          </ul>
          <p className="auth-help" role="status">{atendidos} de {requisitos.length} requisitos atendidos.</p>
        </div>
      ) : null}
      {setConfirmacao ? (
        <>
          <label className="field"><span>Confirme a senha</span>
            <input aria-label="Confirme a senha" type={visivel ? "text" : "password"} autoComplete="new-password" value={confirmacao ?? ""}
              onChange={(e) => setConfirmacao(e.target.value)} maxLength={72} minLength={16} required
              aria-invalid={diferentes} aria-describedby={confirmou ? `${id}-confirmacao` : undefined} />
          </label>
          {confirmou ? <p id={`${id}-confirmacao`} className={diferentes ? "auth-password-mismatch" : "auth-password-match"} role="status">
            {diferentes ? "As senhas não coincidem." : "As senhas coincidem."}
          </p> : null}
        </>
      ) : null}
      <label className="auth-show-password"><input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} /> Mostrar senha</label>
    </>
  );
}
