"use client";
import { useMoeda } from "../../../components/PreferenciasProvider";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "../../../components/WorkspaceShell";
import { EdicaoProtegida } from "../../../components/EdicaoProtegida";
import { calcularCustoIngrediente, calcularCustoProduto, salvarProduto, Unidade } from "../../../lib/produtos";

import { validarFicha, numeroDoCampo, numeroValido, paraIngrediente, type IngredienteEdicao } from "../../../lib/ingredientes-form";

type FormErrors = {
  nome?: string;
  preco?: string;
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

export default function NovoProdutoPage() {
  const formatarMoeda = useMoeda();
  const router = useRouter();
  const envioEmCurso = useRef(false);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ingredientes, setIngredientes] = useState<IngredienteEdicao[]>([ingredienteInicial]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [salvando, setSalvando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  const ficha = useMemo(() => validarFicha(ingredientes), [ingredientes]);
  const ingredientesValidos = ficha.itens;
  const custoEstimado = ficha.valida && ingredientesValidos.length ? calcularCustoProduto(ingredientesValidos) : null;
  const precoVenda = numeroDoCampo(preco);
  const lucroUnitario = custoEstimado === null ? null : precoVenda - custoEstimado;

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
    if (envioEmCurso.current) return;

    const novosErros: FormErrors = {};

    if (!nome.trim()) {
      novosErros.nome = "Informe o nome do produto.";
    }

    if (!numeroValido(preco, 2, 12)) {
      novosErros.preco = "Informe um preço maior que zero, até 12 dígitos inteiros e 2 casas decimais.";
    }

    setValidando(true);
    setErrors(novosErros);
    setErroSalvar("");
    if (!ficha.valida) {
      setErroSalvar("Complete os campos indicados na ficha de ingredientes. Nenhuma linha preenchida será descartada.");
      return;
    }

    if (Object.keys(novosErros).length > 0) return;

    envioEmCurso.current = true;
    setSalvando(true);
    try {
      await salvarProduto({
        nome: nome.trim(),
        precoVenda,
        descricao: descricao.trim(),
        ingredientes: ingredientesValidos,
        custoEstimado,
      });

      const origem = new URLSearchParams(window.location.search).get("origem");
      router.push(origem === "onboarding" || origem === "venda" ? "/vendas/nova" : "/produtos");
    } catch (error) {
      setErroSalvar(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    } finally {
      envioEmCurso.current = false;
      setSalvando(false);
    }
  }

  return (
    <WorkspaceShell cabecalho={<header className="topbar">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h1>Novo produto</h1>
            <p className="subtitle">Cadastre o produto e estime o custo pela quantidade usada de cada ingrediente.</p>
          </div>
          <Link className="secondary-button" href="/produtos">
            Voltar para produtos
          </Link>
        </header>}>


        <EdicaoProtegida><form className="product-form-stack cost-sheet-form" onSubmit={handleSubmit} noValidate>
          <section className="panel product-form">
            <div className="form-grid">
              <label className="field field-wide">
                <span>Nome do produto *</span>
                <input aria-label="Nome do produto *"
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
                <input aria-label="Preço de venda *"
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
                <small>Referência de custo e consumo; não registra uma compra.</small>
              </div>

              <label className="field field-wide">
                <span>Descrição</span>
                <textarea aria-label="Descrição"
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
                const falhas = validando ? ficha.erros[ingrediente.id] ?? {} : {};
                const custo = ficha.itens.some(i => i.id === ingrediente.id) ? calcularCustoIngrediente(paraIngrediente(ingrediente)) : null;

                return (
                  <div className="ingredient-row" key={ingrediente.id}>
                    <label className="field ingredient-name">
                      <span>Ingrediente</span>
                      <input aria-invalid={Boolean(falhas.nome)} aria-describedby={falhas.nome ? `ficha-${ingrediente.id}-nome` : undefined} aria-label="Ingrediente"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "nome", event.target.value)}
                        placeholder="Farinha"
                        type="text"
                        value={ingrediente.nome}
                      />
                      {falhas.nome ? <small className="field-error" id={`ficha-${ingrediente.id}-nome`}>{falhas.nome}</small> : null}
                    </label>

                    <label className="field">
                      <span>Preço de referência</span>
                      <input aria-invalid={Boolean(falhas.precoCompra)} aria-describedby={falhas.precoCompra ? `ficha-${ingrediente.id}-precoCompra` : undefined} aria-label="Preço de referência"
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "precoCompra", event.target.value)}
                        placeholder="6,50"
                        type="text"
                        value={ingrediente.precoCompra}
                      />
                      {falhas.precoCompra ? <small className="field-error" id={`ficha-${ingrediente.id}-precoCompra`}>{falhas.precoCompra}</small> : null}
                    </label>

                    <label className="field">
                      <span>Qtd. referência</span>
                      <input aria-invalid={Boolean(falhas.quantidadeCompra)} aria-describedby={falhas.quantidadeCompra ? `ficha-${ingrediente.id}-quantidadeCompra` : undefined} aria-label="Qtd. referência"
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "quantidadeCompra", event.target.value)}
                        placeholder="1"
                        type="text"
                        value={ingrediente.quantidadeCompra}
                      />
                      {falhas.quantidadeCompra ? <small className="field-error" id={`ficha-${ingrediente.id}-quantidadeCompra`}>{falhas.quantidadeCompra}</small> : null}
                    </label>

                    <label className="field field-unit">
                      <span>Unidade</span>
                      <select aria-label="Unidade"
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
                      <input aria-invalid={Boolean(falhas.quantidadeUsada)} aria-describedby={falhas.quantidadeUsada ? `ficha-${ingrediente.id}-quantidadeUsada` : undefined} aria-label="Qtd. usada"
                        inputMode="decimal"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "quantidadeUsada", event.target.value)}
                        placeholder="120"
                        type="text"
                        value={ingrediente.quantidadeUsada}
                      />
                      {falhas.quantidadeUsada ? <small className="field-error" id={`ficha-${ingrediente.id}-quantidadeUsada`}>{falhas.quantidadeUsada}</small> : null}
                    </label>

                    <label className="field field-unit">
                      <span>Unidade</span>
                      <select aria-label="Unidade"
                        onChange={(event) => atualizarIngrediente(ingrediente.id, "unidadeUso", event.target.value as Unidade)}
                        aria-invalid={Boolean(falhas.unidadeUso)}
                        aria-describedby={falhas.unidadeUso ? `ficha-${ingrediente.id}-unidadeUso` : undefined}
                        value={ingrediente.unidadeUso}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">L</option>
                        <option value="ml">ml</option>
                        <option value="un">un.</option>
                      </select>
                      {falhas.unidadeUso ? <small className="field-error" id={`ficha-${ingrediente.id}-unidadeUso`}>{falhas.unidadeUso}</small> : null}
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

          {erroSalvar ? <p className="field-error" role="alert">{erroSalvar}</p> : null}

          <div className="form-actions standalone-actions">
            <Link className="secondary-button" href="/produtos">
              Cancelar
            </Link>
            <button className="primary-button" disabled={salvando} type="submit">
              {salvando ? "Salvando..." : "Salvar produto"}
            </button>
          </div>
        </form></EdicaoProtegida>
      </WorkspaceShell>
  );
}
