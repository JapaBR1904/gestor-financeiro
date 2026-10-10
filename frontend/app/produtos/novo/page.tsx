"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Sidebar } from "../../../components/Sidebar";

type FormErrors = {
  nome?: string;
  preco?: string;
};

export default function NovoProdutoPage() {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [custo, setCusto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [mensagem, setMensagem] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const novosErros: FormErrors = {};
    const precoNumero = Number(preco.replace(",", "."));

    if (!nome.trim()) {
      novosErros.nome = "Informe o nome do produto.";
    }

    if (!preco.trim() || Number.isNaN(precoNumero) || precoNumero <= 0) {
      novosErros.preco = "Informe um preço de venda maior que zero.";
    }

    setErrors(novosErros);

    if (Object.keys(novosErros).length > 0) {
      setMensagem("");
      return;
    }

    setMensagem("Produto validado. Na próxima etapa, vamos salvar os dados no PostgreSQL.");
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>Novo produto</h1>
            <p className="subtitle">Cadastre as informações principais do item que você vende.</p>
          </div>
          <Link className="secondary-button" href="/produtos">
            Voltar para produtos
          </Link>
        </header>

        <form className="panel product-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Nome do produto *</span>
              <input
                aria-invalid={Boolean(errors.nome)}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Brownie tradicional"
                type="text"
                value={nome}
              />
              {errors.nome ? <small className="field-error">{errors.nome}</small> : null}
            </label>

            <label className="field">
              <span>Preço de venda *</span>
              <input
                aria-invalid={Boolean(errors.preco)}
                inputMode="decimal"
                onChange={(event) => setPreco(event.target.value)}
                placeholder="0,00"
                type="text"
                value={preco}
              />
              {errors.preco ? <small className="field-error">{errors.preco}</small> : null}
            </label>

            <label className="field">
              <span>Custo estimado</span>
              <input
                inputMode="decimal"
                onChange={(event) => setCusto(event.target.value)}
                placeholder="0,00"
                type="text"
                value={custo}
              />
              <small>Opcional por enquanto.</small>
            </label>

            <label className="field field-wide">
              <span>Descrição</span>
              <textarea
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Detalhes do produto, tamanho, sabor ou observações."
                rows={5}
                value={descricao}
              />
            </label>
          </div>

          {mensagem ? <p className="form-success">{mensagem}</p> : null}

          <div className="form-actions">
            <Link className="secondary-button" href="/produtos">
              Cancelar
            </Link>
            <button className="primary-button" type="submit">
              Validar produto
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
