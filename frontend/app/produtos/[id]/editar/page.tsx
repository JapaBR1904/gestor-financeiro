"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "../../../../components/Sidebar";
import {
  atualizarProduto,
  calcularCustoIngrediente,
  calcularCustoProduto,
  carregarProduto,
  formatarMoeda,
  IngredienteProduto,
  Produto,
  Unidade,
} from "../../../../lib/produtos";

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

function ingredienteVazio(id = `ingrediente-${Date.now()}`): IngredienteEdicao {
  return {
    id,
    nome: "",
    precoCompra: "",
    quantidadeCompra: "",
    unidadeCompra: "kg",
    quantidadeUsada: "",
    unidadeUso: "g",
  };
}

function numeroDoCampo(valor: string) {
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function textoNumero(valor: number) {
  return String(valor).replace(".", ",");
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

export default function EditarProdutoPage() {
  const params = useParams<{ id: string }>();
  const produtoId = params.id;
  const router = useRouter();

  const [produtoOriginal, setProdutoOriginal] = useState<Produto | null>(null);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ingredientes, setIngredientes] = useState<IngredienteEdicao[]>([ingredienteVazio("ingrediente-1")]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const produto = await carregarProduto(produtoId);
        if (!ativo) return;

        setProdutoOriginal(produto);
        setNome(produto.nome);
        setPreco(textoNumero(produto.precoVenda));
        setDescricao(produto.descricao ?? "");
        setIngredientes(
          produto.ingredientes.length > 0
            ? produto.ingredientes.map((ingrediente, index) => ({
                id: String(ingrediente.id ?? `ingrediente-${index}`),
                nome: ingrediente.nome,
                precoCompra: textoNumero(ingrediente.precoCompra),
                quantidadeCompra: textoNumero(ingrediente.quantidadeCompra),
                unidadeCompra: ingrediente.unidadeCompra,
                quantidadeUsada: textoNumero(ingrediente.quantidadeUsada),
                unidadeUso: ingrediente.unidadeUso,
              }))
            : [ingredienteVazio("ingrediente-1")],
        );
      } catch (error) {
        if (ativo) setErroSalvar(error instanceof Error ? error.message : "Não foi possível carregar o produto.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [produtoId]);

  const ingredientesCalculados = useMemo(() => ingredientes.map(paraIngrediente), [ingredientes]);

  const ingredientesValidos = useMemo(
    () =>
      ingredientesCalculados.filter(
        (ingrediente) =>
          ingrediente.nome &&
          ingrediente.precoCompra >= 0 &&
          ingrediente.quantidadeCompra > 0 &&
          ingrediente.quantidadeUsada > 0 &&
          calcularCustoIngrediente(ingrediente) >= 0,
      ),
    [ingredientesCalculados],
  );

  const custoEstimado = useMemo(() => calcularCustoProduto(ingredientesValidos), [ingredientesValidos]);
  const precoVenda = numeroDoCampo(preco);
  const lucroUnitario = precoVenda - custoEstimado;
  const margem = precoVenda > 0 ? (lucroUnitario / precoVenda) * 100 : 0;

  function atualizarIngrediente(id: string, campo: keyof IngredienteEdicao, valor: string) {
    setIngredientes((atuais) =>
      atuais.map((ingrediente) =>
        ingrediente.id === id ? { ...ingrediente, [campo]: valor } : ingrediente,
      ),
    );
  }

  function adicionarIngrediente() {
    setIngredientes((atuais) => [...atuais, ingredienteVazio()]);
  }

  function removerIngrediente(id: string) {
    setIngredientes((atuais) =>
      atuais.length === 1 ? [ingredienteVazio("ingrediente-1")] : atuais.filter((ingrediente) => ingrediente.id !== id),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const novosErros: FormErrors = {};
    if (!nome.trim()) novosErros.nome = "Informe o nome do produto.";
    if (precoVenda <= 0) novosErros.preco = "Informe um preço de venda maior que zero.";

    setErrors(novosErros);
    setErroSalvar("");
    if (Object.keys(novosErros).length > 0 || !produtoOriginal) return;

    setSalvando(true);
    try {
      await atualizarProduto(produtoId, {
        ...produtoOriginal,
        nome: nome.trim(),
        precoVenda,
        descricao: descricao.trim(),
        ingredientes: ingredientesValidos,
        custoEstimado,
        lucroEstimado: lucroUnitario,
      });

      router.push(`/produtos/${produtoId}`);
      router.refresh();
    } catch (error) {
      setErroSalvar(error instanceof Error ? error.message : "Não foi possível atualizar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="app-shell">
        <Sidebar ativo="produtos" />
        <section className="content">
          <article className="panel activity-panel">
            <div className="empty-state">
              <span className="empty-icon">P</span>
              <strong>Carregando produto para edição...</strong>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar ativo="produtos" />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>Editar produto</h1>
            <p className="subtitle">Altere os dados e a ficha de custo. O produto mantém o mesmo ID.</p>
          </div>
          <Link className="secondary-button" href={`/produtos/${produtoId}`}>
            Voltar para ficha
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
                  type="text"
                  value={preco}
                />
                {errors.preco ? <small className="field-error">{errors.preco}</small> : null}
              </label>

              <div className="cost-preview">
                <span>Custo estimado</span>
                <strong>{formatarMoeda(custoEstimado)}</strong>
                <small>Recalculado conforme os ingredientes.</small>
              </div>

              <label className="field field-wide">
                <span>Descrição</span>
                <textarea onChange={(event) => setDescricao(event.target.value)} rows={4} value={descricao} />
              </label>
            </div>
          </section>

          <section className="panel ingredient-panel">
            <div className="panel-header ingredient-header">
              <div>
                <p className="eyebrow">Ficha de custo</p>
                <h2>Ingredientes do produto</h2>
                <p className="ingredient-help">Edite preço de compra, quantidade comprada e quantidade usada para recalcular o custo.</p>
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
                        type="text"
                        value={ingrediente.nome}
                      />
                    </label>

                    <label className="field">
                      <span>Preço pago</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "precoCompra", event.target.value)}
                        type="text"
                        value={ingrediente.precoCompra}
                      />
                    </label>

                    <label className="field">
                      <span>Qtd. comprada</span>
                      <input
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "quantidadeCompra", event.target.value)}
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
            <div>
              <span>Margem estimada</span>
              <strong>{margem.toFixed(1)}%</strong>
            </div>
          </section>

          {erroSalvar ? <p className="field-error">{erroSalvar}</p> : null}

          <div className="form-actions standalone-actions">
            <Link className="secondary-button" href={`/produtos/${produtoId}`}>
              Cancelar
            </Link>
            <button className="primary-button" disabled={salvando} type="submit">
              {salvando ? "Salvando alterações..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
