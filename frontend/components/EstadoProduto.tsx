import Link from "next/link";
import { Icone } from "./Icone";
export function BloqueioPlano({
  plano,
  titulo,
  descricao,
}: {
  plano: "Pro" | "Business";
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="product-lock">
      <span className="plan-pill">{plano}</span>
      <h2>{titulo}</h2>
      <p>{descricao}</p>
      <Link className="primary-button" href="/planos">
        Conhecer {plano}
      </Link>
      <small>Seus dados permanecem seguros ao mudar de plano.</small>
    </section>
  );
}
export function VazioProduto({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="product-empty">
      <span aria-hidden="true">
        <Icone nome="movimentos" />
      </span>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {acao}
    </div>
  );
}
