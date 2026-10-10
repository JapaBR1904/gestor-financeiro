export type Unidade = "kg" | "g" | "l" | "ml" | "un";

export type IngredienteProduto = {
  id: string;
  nome: string;
  precoCompra: number;
  quantidadeCompra: number;
  unidadeCompra: Unidade;
  quantidadeUsada: number;
  unidadeUso: Unidade;
};

export type Produto = {
  id: string;
  nome: string;
  precoVenda: number;
  descricao: string;
  ingredientes: IngredienteProduto[];
  custoEstimado: number;
  criadoEm: string;
};

const STORAGE_KEY = "nexo-produtos";

function fatorParaBase(unidade: Unidade) {
  if (unidade === "kg" || unidade === "l") return 1000;
  return 1;
}

function familia(unidade: Unidade) {
  if (unidade === "kg" || unidade === "g") return "massa";
  if (unidade === "l" || unidade === "ml") return "volume";
  return "unidade";
}

export function calcularCustoIngrediente(ingrediente: IngredienteProduto) {
  if (
    ingrediente.precoCompra <= 0 ||
    ingrediente.quantidadeCompra <= 0 ||
    ingrediente.quantidadeUsada <= 0 ||
    familia(ingrediente.unidadeCompra) !== familia(ingrediente.unidadeUso)
  ) {
    return 0;
  }

  const compraBase = ingrediente.quantidadeCompra * fatorParaBase(ingrediente.unidadeCompra);
  const usoBase = ingrediente.quantidadeUsada * fatorParaBase(ingrediente.unidadeUso);

  return ingrediente.precoCompra * (usoBase / compraBase);
}

export function calcularCustoProduto(ingredientes: IngredienteProduto[]) {
  return ingredientes.reduce((total, ingrediente) => total + calcularCustoIngrediente(ingrediente), 0);
}

export function carregarProdutos(): Produto[] {
  if (typeof window === "undefined") return [];

  const salvo = window.localStorage.getItem(STORAGE_KEY);
  if (!salvo) return [];

  try {
    const produtos = JSON.parse(salvo) as Produto[];
    return Array.isArray(produtos) ? produtos : [];
  } catch {
    return [];
  }
}

export function salvarProduto(produto: Produto) {
  const atuais = carregarProdutos();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([produto, ...atuais]));
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
