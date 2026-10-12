import { apiFetch } from "./api";

export type Unidade = "kg" | "g" | "l" | "ml" | "un";

export type IngredienteProduto = {
  id: string | number;
  nome: string;
  precoCompra: number;
  quantidadeCompra: number;
  unidadeCompra: Unidade;
  quantidadeUsada: number;
  unidadeUso: Unidade;
  custoNoProduto?: number;
};

export type Produto = {
  id: string | number;
  nome: string;
  precoVenda: number;
  descricao: string;
  ingredientes: IngredienteProduto[];
  custoEstimado: number;
  lucroEstimado?: number;
  ativo?: boolean;
  criadoEm?: string;
};

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
  ) return 0;

  const compraBase = ingrediente.quantidadeCompra * fatorParaBase(ingrediente.unidadeCompra);
  const usoBase = ingrediente.quantidadeUsada * fatorParaBase(ingrediente.unidadeUso);
  return ingrediente.precoCompra * (usoBase / compraBase);
}

export function calcularCustoProduto(ingredientes: IngredienteProduto[]) {
  return ingredientes.reduce((total, ingrediente) => total + calcularCustoIngrediente(ingrediente), 0);
}

export async function carregarProdutos(): Promise<Produto[]> {
  return apiFetch<Produto[]>("/api/produtos");
}

export async function carregarProduto(produtoId: string | number): Promise<Produto> {
  return apiFetch<Produto>(`/api/produtos/${produtoId}`);
}

export async function alterarStatusProduto(produtoId: string | number, ativo: boolean): Promise<Produto> {
  return apiFetch<Produto>(`/api/produtos/${produtoId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ ativo }),
  });
}

export type NovoProduto = Omit<Produto, "id" | "criadoEm">;

function corpoProduto(produto: NovoProduto) {
  return {
    nome: produto.nome,
    descricao: produto.descricao,
    precoVenda: produto.precoVenda,
    ingredientes: produto.ingredientes.map((ingrediente) => ({
      nome: ingrediente.nome,
      precoCompra: ingrediente.precoCompra,
      quantidadeCompra: ingrediente.quantidadeCompra,
      unidadeCompra: ingrediente.unidadeCompra,
      quantidadeUsada: ingrediente.quantidadeUsada,
      unidadeUso: ingrediente.unidadeUso,
    })),
  };
}

export async function salvarProduto(produto: NovoProduto): Promise<Produto> {
  return apiFetch<Produto>("/api/produtos", {
    method: "POST",
    body: JSON.stringify(corpoProduto(produto)),
  });
}

export async function atualizarProduto(produtoId: string | number, produto: Produto): Promise<Produto> {
  return apiFetch<Produto>(`/api/produtos/${produtoId}`, {
    method: "PUT",
    body: JSON.stringify(corpoProduto(produto)),
  });
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
