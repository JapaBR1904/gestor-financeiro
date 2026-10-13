import { writeFileSync } from "node:fs";
import { expect, type Page, type TestInfo } from "@playwright/test";

type Observacao = { errosJavascript: string[]; errosConsole: number; rede: Array<{ caminho: string; status: number }> };
const registros = new WeakMap<Page, Observacao>();
const caminhoSeguro = (url: string) => new URL(url).pathname.replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, "[id]");
export function observar(page: Page) {
  const dados: Observacao = { errosJavascript: [], errosConsole: 0, rede: [] };
  registros.set(page, dados);
  page.on("pageerror", erro => dados.errosJavascript.push(erro.name)); // Sem mensagem, stack, corpo ou valores privados.
  page.on("console", mensagem => { if (mensagem.type() === "error") dados.errosConsole++; });
  page.on("response", response => { if (response.status() >= 400) dados.rede.push({ caminho: caminhoSeguro(response.url()), status: response.status() }); });
}
export async function registrarObservacoes(page: Page, info: TestInfo) {
  const dados = registros.get(page);
  if (!dados) return;
  const caminho = info.outputPath("observacoes-seguras.json");
  writeFileSync(caminho, JSON.stringify(dados, null, 2));
  await info.attach("observacoes-seguras", { path: caminho, contentType: "application/json" });
  expect(dados.errosJavascript, "Nenhuma exceção JavaScript no navegador").toEqual([]);
}
