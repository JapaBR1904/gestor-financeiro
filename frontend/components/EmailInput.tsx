"use client";

const DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br"];

type EmailInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
};

export function EmailInput({ value, onChange, placeholder = "voce@empresa.com", invalid = false }: EmailInputProps) {
  const arroba = value.indexOf("@");
  const usuario = arroba >= 0 ? value.slice(0, arroba) : value;
  const dominioDigitado = arroba >= 0 ? value.slice(arroba + 1).toLowerCase() : "";

  const sugestoes = arroba >= 0 && usuario.trim()
    ? DOMINIOS.filter((dominio) => !dominioDigitado || dominio.startsWith(dominioDigitado))
    : [];

  function completarDominio(dominio: string) {
    onChange(`${usuario}@${dominio}`);
  }

  return (
    <div className="email-autocomplete">
      <input
        autoComplete="email"
        inputMode="email"
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\s/g, ""))}
        placeholder={placeholder}
        aria-invalid={invalid}
      />

      {sugestoes.length > 0 ? (
        <div className="email-suggestions" aria-label="Sugestões de domínio de e-mail">
          {sugestoes.map((dominio) => (
            <button
              className="email-suggestion"
              key={dominio}
              type="button"
              onClick={() => completarDominio(dominio)}
            >
              @{dominio}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
