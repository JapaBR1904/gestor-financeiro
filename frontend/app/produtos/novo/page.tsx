"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../../components/Sidebar";
import {
  calcularCustoIngrediente,
  calcularCustoProduto,
  formatarMoeda,
  IngredienteProduto,
  salvarProduto,
  Unidade,
} from "../../../lib/produtos";

type FormErrors = {
  nome?: string;
  preco?: string;
};

type IngredienteEdicao = {
  id: string;
  nome: string;
  precoCompra: string;
  quantidadeCompra: string;
  unidadeCompra: Unidade;
  quantidadeUsada: string;
  unidadeUso: Unidade;
};

const ingredienteInicial: IngredienteEdicao = {
  id: "ingrediente-1",
  nome: "",
  precoCompra: "",
  quantidadeCompra: "",
  unidadeCompra: "kg",
  quantidadeUsada: "",
  unidadeUso: "g",
};

function numeroDoCampo(valor: string) {
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function paraIngrediente(ingrediente: IngredienteEdicao): IngredienteProduto {
  return {
    id: ingrediente.id,
    nome: ingrediente.nome.trim(),
    precoCompra: numeroDoCampo(ingrediente.precoCompra),
    quantidadeCompra: numeroDoCampo(ingrediente.quantidadeCompra),
    unidadeCompra: ingrediente.unidadeCompra,
    quantidadeUsada: numeroDoCampo(ingrediente.quantidadeUsada),
    unidadeUso: ingrediente.unidadeUso,
  };
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ingredientes, setIngredientes] = useState<IngredienteEdicao[]>([ingredienteInicial]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const ingredientesCalculados = useMemo(
    () => ingredientes.map(paraIngrediente),
    [ingredientes],
  );

  const ingredientesValidos = useMemo(
    () =>
      ingredientesCalculados.filter(
        (ingrediente) =>
          ingrediente.nome &&
          ingrediente.precoCompra > 0 &&
          ingrediente.quantidadeCompra > 0 &&
          ingrediente.quantidadeUsada > 0 &&
          calcularCustoIngrediente(ingrediente) > 0,
      ),
    [ingredientesCalculados],
  );

  const custoEstimado = useMemo(
    () => calcularCustoProduto(ingredientesValidos),
    [ingredientesValidos],
  );

  const precoVenda = numeroDoCampo(preco);
  const lucroUnitario = precoVenda - custoEstimado;

  function atualizarIngrediente(id: string, campo: keyof IngredienteEdicao, valor: string) {
    setIngredientes((atuais) =>
      atuais.map((ingrediente) =>
        ingrediente.id === id ? { ...ingrediente, [campo]: valor } : ingrediente,
      ),
    );
  }

  function adicionarIngrediente() {
    setIngredientes((atuais) => [
      ...atuais,
      {
        ...ingredienteInicial,
        id: `ingrediente-${Date.now()}`,
      },
    ]);
  }

  function removerIngrediente(id: string) {
    setIngredientes((atuais) =>
      atuais.length === 1
        ? [{ ...ingredienteInicial, id: "ingrediente-1" }]
        : atuais.filter((ingrediente) => ingrediente.id !== id),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const novosErros: FormErrors = {};

    if (!nome.trim()) {
      novosErros.nome = "Informe o nome do produto.";
    }

    if (precoVenda <= 0) {
      novosErros.preco = "Informe um preço de venda maior que zero.";
    }

    setErrors(novosErros);
    setErroSalvar("");

    if (Object.keys(novosErros).length > 0) return;

    setSalvando(true);
    try {
      await salvarProduto({
        id: `produto-${Date.now()}`,
        nome: nome.trim(),
        precoVenda,
        descricao: descricao.trim(),
        ingredientes: ingredientesValidos,
        custoEstimado,
        criadoEm: new Date().toISOString(),
      });

      router.push("/produtos");
    } catch (error) {
      setErroSalvar(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>Novo produto</h1>
            <p className="subtitle">Cadastre o produto e estime o custo pela quantidade usada de cada ingrediente.</p>
          </div>
          <Link className="secondary-button" href="/produtos">
            Voltar para produtos
          </Link>
        </header>

        <form className="product-form-stack" onSubmit={handleSubmit} noValidate>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field field-wide">
                <span>Nome do produto *</span>
                <input
                  aria-invalid={Boolean(errors.nome)}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Ex.: Bolo de pote de morango"
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
                  placeholder="15,00"
                  type="text"
                  value={preco}
                />
                {errors.preco ? <small className="field-error">{errors.preco}</small> : null}
              </label>

              <div className="cost-preview">
                <span>Custo estimado</span>
                <strong>{formatarMoeda(custoEstimado)}</strong>
                <small>Calculado pelos ingredientes válidos abaixo.</small>
              </div>

              <label className="field field-wide">
                <span>Descrição</span>
                <textarea
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Ex.: duas camadas de bolo, ganache de chocolate, chantilly e pedaços de morango."
                  rows={4}
                  value={descricao}
                />
              </label>
            </div>
          </section>

          <section className="panel ingredient-panel">
            <div className="panel-header ingredient-header">
              <div>
                <p className="eyebrow">Ficha de custo</p>
                <h2>Ingredientes do produto</h2>
                <p className="ingredient-help">
                  Exemplo: farinha comprada por quilo e usada em gramas; ovos comprados e usados por unidade.
                </p>
              </div>
              <button className="secondary-button compact-button" onClick={adicionarIngrediente} type="button">
                + Ingrediente
              </button>
            </div>

            <div className="ingredient-list">
              {ingredientes.map((ingrediente) => {
                const custo = calcularCustoIngrediente(paraIngrediente(ingrediente));

                return (
                  <div className="ingredient-row" key={ingrediente.id}>
                    <label className="field ingredient-name">
                      <span>Ingrediente</span>
                      <input
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "nome", event.target.value)}
                        placeholder="Farinha"
                        type="text"
                        value={ingrediente.nome}
                      />
                    </label>

                    <label className="field">
                      <span>Preço pago</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "precoCompra", event.target.value)}
                        placeholder="6,50"
                        type="text"
                        value={ingrediente.precoCompra}
                      />
                    </label>

                    <label className="field">
                      <span>Qtd. comprada</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "quantidadeCompra", event.target.value)}
                        placeholder="1"
                        type="text"
                        value={ingrediente.quantidadeCompra}
                      />
                    </label>

                    <label className="field field-unit">
                      <span>Unidade</span>
                      <select
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "unidadeCompra", event.target.value as Unidade)}
                        value={ingrediente.unidadeCompra}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">L</option>
                        <option value="ml">ml</option>
                        <option value="un">un.</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Qtd. usada</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "quantidadeUsada", event.target.value)}
                        placeholder="120"
                        type="text"
                        value={ingrediente.quantidadeUsada}
                      />
                    </label>

                    <label className="field field-unit">
                      <span>Unidade</span>
                      <select
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "unidadeUso", event.target.value as Unidade)}
                        value={ingrediente.unidadeUso}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">L</option>
                        <option value="ml">ml</option>
                        <option value="un">un.</option>
                      </select>
                    </label>

                    <div className="ingredient-cost">
                      <span>Custo no produto</span>
                      <strong>{formatarMoeda(custo)}</strong>
                    </div>

                    <button
                      aria-label={`Remover ${ingrediente.nome || "ingrediente"}`}
                      className="remove-button"
                      onClick={() => removerIngrediente(ingrediente.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel product-totals">
            <div>
              <span>Preço de venda</span>
              <strong>{formatarMoeda(precoVenda)}</strong>
            </div>
            <div>
              <span>Custo estimado</span>
              <strong>{formatarMoeda(custoEstimado)}</strong>
            </div>
            <div>
              <span>Lucro unitário estimado</span>
              <strong>{formatarMoeda(lucroUnitario)}</strong>
            </div>
          </section>

          {erroSalvar ? <p className="field-error">{erroSalvar}</p> : null}

          <div className="form-actions standalone-actions">
            <Link className="secondary-button" href="/produtos">
              Cancelar
            </Link>
            <button className="primary-button" disabled={salvando} type="submit">
              {salvando ? "Salvando..." : "Salvar produto"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
