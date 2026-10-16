import type { IngredienteProduto, Unidade } from "./produtos";
export type IngredienteEdicao = {
  id: string; nome: string; precoCompra: string; quantidadeCompra: string;
  unidadeCompra: Unidade; quantidadeUsada: string; unidadeUso: Unidade;
};
export type CampoIngrediente = "nome" | "precoCompra" | "quantidadeCompra" | "quantidadeUsada" | "unidadeUso";
export function numeroDoCampo(valor: string) {
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}
export function numeroValido(valor: string, casas: number, inteiros: number, zero = false) {
  const texto = valor.trim();
  if (!new RegExp(`^\\d{1,${inteiros}}(?:[.,]\\d{1,${casas}})?$`).test(texto)) return false;
  const numero = numeroDoCampo(texto);
  return zero ? numero >= 0 : numero > 0;
}
export function paraIngrediente(i: IngredienteEdicao): IngredienteProduto {
  return { ...i, nome: i.nome.trim(), precoCompra: numeroDoCampo(i.precoCompra), quantidadeCompra: numeroDoCampo(i.quantidadeCompra), quantidadeUsada: numeroDoCampo(i.quantidadeUsada) };
}
const familia = (u: Unidade) => ["kg", "g"].includes(u) ? "massa" : ["l", "ml"].includes(u) ? "volume" : "unidade";
/** Não confunde ausência de linha, custo explicitamente zero e dados incompletos. */
export function validarFicha(ingredientes: IngredienteEdicao[]) {
  const erros: Record<string, Partial<Record<CampoIngrediente, string>>> = {};
  const itens: IngredienteProduto[] = [];
  for (const i of ingredientes) {
    if (![i.nome, i.precoCompra, i.quantidadeCompra, i.quantidadeUsada].some(v => v.trim())) continue;
    const campos: Partial<Record<CampoIngrediente, string>> = {};
    if (!i.nome.trim()) campos.nome = "Informe o nome do ingrediente.";
    if (!numeroValido(i.precoCompra, 2, 12, true)) campos.precoCompra = "Informe o preço de referência, até 2 casas decimais; zero é permitido.";
    if (!numeroValido(i.quantidadeCompra, 4, 10)) campos.quantidadeCompra = "Informe a quantidade de referência, maior que zero e até 4 casas decimais.";
    if (!numeroValido(i.quantidadeUsada, 4, 10)) campos.quantidadeUsada = "Informe a quantidade usada, maior que zero e até 4 casas decimais.";
    if (familia(i.unidadeCompra) !== familia(i.unidadeUso)) campos.unidadeUso = "Use unidades da mesma família (massa, volume ou unidade).";
    if (Object.keys(campos).length) erros[i.id] = campos;
    else itens.push(paraIngrediente(i));
  }
  return { itens, erros, valida: Object.keys(erros).length === 0 };
}
