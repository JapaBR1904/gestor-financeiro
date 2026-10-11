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
  criadoEm?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

async function lerResposta(response: Response) {
  if (response.ok) return response.json();

  let mensagem = `Erro ${response.status} ao acessar o backend.`;
  try {
    const corpo = await response.json();
    mensagem = corpo.message ?? corpo.mensagem ?? corpo.detail ?? mensagem;
  } catch {
    // Mantém a mensagem padrão quando a resposta não for JSON.
  }
  throw new Error(mensagem);
}

async function obterOrganizacaoId(): Promise<number> {
  const response = await fetch(`${API_URL}/api/organizacoes`, { cache: "no-store" });
  const organizacoes = (await lerResposta(response)) as Array<{ id: number; nome: string }>;

  if (organizacoes.length > 0) return organizacoes[0].id;

  const criacao = await fetch(`${API_URL}/api/organizacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Minha empresa" }),
  });

  const organizacao = (await lerResposta(criacao)) as { id: number; nome: string };
  return organizacao.id;
}

export async function carregarProdutos(): Promise<Produto[]> {
  const organizacaoId = await obterOrganizacaoId();
  const response = await fetch(`${API_URL}/api/produtos?organizacaoId=${organizacaoId}`, {
    cache: "no-store",
  });
  return (await lerResposta(response)) as Produto[];
}

export async function salvarProduto(produto: Produto): Promise<Produto> {
  const organizacaoId = await obterOrganizacaoId();

  const response = await fetch(`${API_URL}/api/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizacaoId,
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
    }),
  });

  return (await lerResposta(response)) as Produto;
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
