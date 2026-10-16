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
