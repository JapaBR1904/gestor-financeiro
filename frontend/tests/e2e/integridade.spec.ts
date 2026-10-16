import { test, expect, type Page } from "@playwright/test";
import { observar, registrarObservacoes } from "./observacoes";
const api = process.env.NEXO_E2E_API_URL!;
const orgA = Number(process.env.NEXO_E2E_ORG_A);
const orgB = Number(process.env.NEXO_E2E_ORG_B);
test.beforeEach(({ page }) => observar(page));
test.afterEach(async ({ page }, info) => registrarObservacoes(page, info));
async function entrar(page: Page) {
  if (!api || !orgA || !orgB) throw new Error("Execute pelo coordenador com nexo_test exclusivo.");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(process.env.NEXO_E2E_INTEGRIDADE_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill("Assinatura-Teste123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".workspace-context")).toContainText("Integridade A");
}
async function abrirFormulario(page: Page, nome: string) {
  await page.getByRole("button", { name: "+ Nova movimentação", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill(nome);
  await page.getByLabel("Valor (R$)", { exact: true }).fill("77");
}
async function trocar(page: Page, nome: "A" | "B") {
  await page.goto("/empresa");
  await page.getByRole("button", { name: new RegExp(`Integridade ${nome} sintético.*Abrir espaço`) }).click();
  await expect(page.locator(".workspace-context")).toContainText(`Integridade ${nome}`);
}

test("integridade contexto: duas abas A/B fecham formulário antigo nas duas direções", async ({ page, context }, info) => {
  await entrar(page);
  const outra = await context.newPage();
  for (const destino of ["B", "A"] as const) {
    await abrirFormulario(page, `Não enviar ao espaço ${destino}`);
    await trocar(outra, destino);
    await expect(page.locator(".workspace-context")).toContainText(`Integridade ${destino}`);
    await expect(page.getByRole("button", { name: "Salvar lançamento", exact: true })).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "O espaço mudou" })).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath("contexto-duas-abas.png"), fullPage: true });
  const resumo = await page.request.get(`${api}/api/financeiro/resumo`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect((await resumo.json()).movimentacoes).toHaveLength(0);
  await outra.close();
});

test("integridade contexto: resposta antiga, CSV e consentimento IA não atravessam a troca", async ({ page, context }, info) => {
  await entrar(page);
  await page.route("**/api/ia/status", route => route.fulfill({ json: { configurada: true } }));
  await page.goto("/ia");
  await page.getByLabel("Sua pergunta", { exact: true }).fill("Analise meus gastos");
  await page.getByRole("checkbox", { name: /Autorizar dados deste contexto/ }).check();
  let liberar!: () => void;
  const pausa = new Promise<void>(resolve => { liberar = resolve; });
  let recebeu!: () => void;
  const chegou = new Promise<void>(resolve => { recebeu = resolve; });
  await page.route("**/api/ia/perguntar", async route => {
    expect(route.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
    recebeu(); await pausa;
    try { await route.fulfill({ json: { resposta: "Resposta antiga do espaço A: R$ 77", modelo: "sintetico" } }); } catch { /* Envio abortado pela troca. */ }
  });
  await page.getByRole("button", { name: "Perguntar ao assistente", exact: true }).click();
  await chegou;
  const outra = await context.newPage();
  await trocar(outra, "B");
  await expect(page.locator(".workspace-context")).toContainText("Integridade B");
  liberar();
  await expect(page.getByRole("checkbox", { name: /Autorizar dados deste contexto/ })).not.toBeChecked();
  await expect(page.getByText("Resposta antiga do espaço A: R$ 77", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Sua pergunta", { exact: true })).toHaveValue("");
  const stale = await page.request.get(`${api}/api/financeiro/exportar`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect(stale.status()).toBe(409);
  const ia = await page.request.post(`${api}/api/ia/perguntar`, { headers: { "X-Nexo-Organizacao": String(orgA) }, data: { pergunta: "Gastos", incluirResumo: true } });
  expect(ia.status()).toBe(409);
  await page.screenshot({ path: info.outputPath("contexto-ia-renovado.png"), fullPage: true });
  await trocar(outra, "A");
  await outra.close();
});

test("integridade custo: ingrediente parcial valida, ficha não cria despesa e zero difere de ausência", async ({ page }, info) => {
  await entrar(page);
  let criacoes = 0;
  page.on("request", r => { if (r.method() === "POST" && new URL(r.url()).pathname === "/api/produtos") criacoes++; });
  await page.goto("/produtos/novo");
  await page.getByLabel("Nome do produto *", { exact: true }).fill("Bolo de integridade");
  await page.getByLabel("Preço de venda *", { exact: true }).fill("50");
  await page.getByLabel("Ingrediente", { exact: true }).fill("Farinha");
  await page.getByLabel("Preço de referência", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  await expect(page.getByLabel("Qtd. referência", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Qtd. usada", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert").filter({ hasText: "Nenhuma linha preenchida será descartada" })).toBeVisible();
  expect(criacoes).toBe(0);
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.locator(".ingredient-row").evaluate(row => {
      const caixa = row.getBoundingClientRect();
      return [...row.querySelectorAll("input, select, button, .field-error")].every(e => {
        const c = e.getBoundingClientRect();
        return c.left >= caixa.left && c.right <= caixa.right && c.right <= innerWidth;
      });
    })).toBe(true);
    if (width === 390) await page.locator(".ingredient-row").screenshot({ path: info.outputPath("ingrediente-parcial-mobile.png"), animations: "disabled" });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath("ingrediente-parcial.png"), fullPage: true, animations: "disabled" });
  await page.getByLabel("Qtd. referência", { exact: true }).fill("1");
  await page.getByLabel("Qtd. usada", { exact: true }).fill("100");
  const gravacao = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/produtos");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  const resposta = await gravacao;
  expect(resposta.request().headers()["x-nexo-organizacao"]).toBe(String(orgA));
  const produto = await resposta.json();
  expect(produto.custoEstimado).toBe(2);
  expect(criacoes).toBe(1);
  const despesas = await page.request.get(`${api}/api/despesas`, { headers: { "X-Nexo-Organizacao": String(orgA) } });
  expect(await despesas.json()).toHaveLength(0);
  await page.goto(`/produtos/${produto.id}/editar`);
  await expect(page.getByLabel("Qtd. usada", { exact: true })).toHaveValue("100");
  await page.getByLabel("Qtd. usada", { exact: true }).fill("");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page.getByLabel("Qtd. usada", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Qtd. usada", { exact: true }).fill("100");
  await page.getByLabel("Preço de referência", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/${produto.id}$`));
  const zero = await (await page.request.get(`${api}/api/produtos/${produto.id}`, { headers: { "X-Nexo-Organizacao": String(orgA) } })).json();
  expect(zero.custoEstimado).toBe(0); expect(zero.lucroEstimado).toBe(50);
  await page.goto("/produtos/novo");
  await page.getByLabel("Nome do produto *", { exact: true }).fill("Sem custo conhecido");
  await page.getByLabel("Preço de venda *", { exact: true }).fill("15");
  const semFicha = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/produtos");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  const desconhecido = await (await semFicha).json();
  expect(desconhecido.custoEstimado).toBeNull(); expect(desconhecido.lucroEstimado).toBeNull();
  await page.goto(`/produtos/${desconhecido.id}`);
  await expect(page.getByText("Custo não informado", { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: info.outputPath("custo-desconhecido-mobile.png"), fullPage: true });
});
