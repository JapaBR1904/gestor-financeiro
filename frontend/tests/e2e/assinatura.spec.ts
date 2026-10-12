import { test, expect, Page } from "@playwright/test";

const emails = process.env.NEXO_E2E_EMAILS?.split(",") ?? [];
const api = process.env.NEXO_E2E_API_URL;
test.beforeEach(async ({ page }) => {
  if (!api || emails.length < 8) throw new Error("Execute pelo teste AssinaturaBrowserTest, com PostgreSQL exclusivo de teste.");
  // Encaminha o navegador ao servidor Spring isolado, mantendo endpoints e cookies reais.
  await page.route("http://localhost:8080/api/**", async route => {
    const caminho = new URL(route.request().url()).pathname;
    const resposta = await route.fetch({ url: `${api}${caminho}` });
    await route.fulfill({ response: resposta });
  });
});
test.afterEach(async ({ page }) => {
  // Aguarda requisições em andamento antes de fechar o contexto do navegador.
  await page.unrouteAll({ behavior: "wait" });
});
async function login(page: Page, indice: number) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(emails[indice]);
  await page.getByLabel("Senha", { exact: true }).fill("Assinatura-Teste123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/empresa$/);
}
async function atual(page: Page, plano: string) {
  await page.goto("/planos");
  await expect(page.getByRole("article", { name: `Plano ${plano}`, exact: true }).getByRole("button", { name: "Plano atual", exact: true })).toBeDisabled();
}
async function mudar(page: Page, plano: string, downgrade = false) {
  await page.getByRole("article", { name: `Plano ${plano}`, exact: true }).getByRole("link", { name: downgrade ? "Fazer downgrade" : "Fazer upgrade", exact: true }).click();
  await expect(page.getByText("Total simulado:", { exact: false })).toBeVisible();
  if (downgrade) {
    await expect(page.getByText("Seus dados existentes serão mantidos.", { exact: false })).toBeVisible();
    await page.getByRole("checkbox", { name: "Entendi a mudança e quero continuar" }).check();
  }
  if (plano !== "Free") await page.getByRole("radio", { name: "Pix", exact: true }).check();
  await page.getByRole("button", { name: downgrade ? "Confirmar downgrade" : "Confirmar pagamento simulado", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Plano atualizado para ${plano}.`, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao sistema" }).click();
  await expect(page.getByRole("heading", { name: "Minha assinatura", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: plano, exact: true })).toBeVisible();
}
async function semOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("seis transições, persistência após reload e novo login", async ({ page }) => {
  await login(page, 0);
  for (const [origem, destino, downgrade] of [["Free", "Pro", false], ["Pro", "Business", false], ["Business", "Pro", true], ["Pro", "Free", true], ["Free", "Business", false], ["Business", "Free", true]] as const) {
    await atual(page, origem);
    await mudar(page, destino, downgrade);
    await page.reload();
    await expect(page.getByRole("heading", { name: destino, exact: true })).toBeVisible();
  }
  await atual(page, "Free"); await mudar(page, "Pro");
  await page.evaluate(async () => { await fetch("http://localhost:8080/api/auth/logout", { method: "POST", credentials: "include" }); });
  await login(page, 0);
  await atual(page, "Pro");
});

test("recusa, cancelamento, erro e reenvio seguro", async ({ page }) => {
  await login(page, 1); await atual(page, "Free");
  await page.goto("/checkout?plano=pro");
  await page.getByRole("radio", { name: "Cartão", exact: true }).check();
  expect(await page.locator("input[type=password]").count()).toBe(0);
  await page.getByLabel("Resultado da simulação").selectOption("recusado");
  await page.getByRole("button", { name: "Confirmar pagamento simulado" }).click();
  await expect(page.getByRole("heading", { name: "Pagamento simulado recusado. Seu plano não foi alterado." })).toBeVisible();
  await atual(page, "Free");
  await page.goto("/checkout?plano=business");
  await page.getByRole("button", { name: "Cancelar e voltar" }).click();
  await expect(page.getByRole("heading", { name: "Checkout cancelado. Seu plano não foi alterado." })).toBeVisible();
  await atual(page, "Free");
  await page.goto("/checkout?plano=pro");
  await page.getByLabel("Resultado da simulação").selectOption("erro");
  await page.getByRole("button", { name: "Confirmar pagamento simulado" }).click();
  await expect(page.locator('main [role="alert"]')).toContainText("Tente novamente");
  await page.getByLabel("Resultado da simulação").selectOption("aprovado");
  await page.getByRole("radio", { name: "Boleto", exact: true }).check();
  await page.getByRole("button", { name: "Confirmar pagamento simulado" }).click();
  await expect(page.getByRole("heading", { name: "Plano atualizado para Pro." })).toBeVisible();
});

test("limites por plano, cancelamento da assinatura e links essenciais", async ({ page }) => {
  await login(page, 2);
  await page.goto("/metas"); await expect(page.getByRole("link", { name: "Ver planos", exact: true })).toBeVisible();
  await atual(page, "Free"); await mudar(page, "Pro");
  await page.goto("/metas"); await expect(page.getByRole("heading", { name: "Metas e comparativos", exact: true })).toBeVisible();
  await atual(page, "Pro"); await mudar(page, "Business");
  await page.goto("/equipe"); await expect(page.getByText("Pessoa Teste", { exact: true })).toBeVisible();
  await page.goto("/conta/assinatura");
  await page.getByRole("link", { name: "Solicitar cancelamento" }).click();
  await page.getByRole("checkbox", { name: "Entendi a mudança e quero continuar" }).check();
  await page.getByRole("button", { name: "Confirmar cancelamento", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assinatura cancelada. Seu plano agora é Free." })).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao sistema" }).click();
  await expect(page.getByText("Plano atual · Cancelada", { exact: true })).toBeVisible();
  for (const rota of ["/produtos", "/clientes", "/vendas", "/despesas", "/relatorios", "/conta", "/ia", "/fluxo-caixa", "/pessoal", "/empresa"]) {
    const resposta = await page.goto(rota);
    expect(resposta?.status(), rota).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("Application error", { exact: false })).toHaveCount(0);
  }
});

test("destino inválido e clique duplicado não criam promoção indevida", async ({ page }) => {
  await login(page, 3);
  await page.goto("/checkout?plano=premium");
  await expect(page.locator('main [role="alert"]')).toContainText("Escolha um plano válido");
  await atual(page, "Free");
  await page.goto("/checkout?plano=pro");
  const confirmar = page.getByRole("button", { name: "Confirmar pagamento simulado" });
  await expect(confirmar).toBeVisible();
  let envios = 0;
  page.on("request", request => { if (request.url().endsWith("/confirmar")) envios++; });
  await confirmar.evaluate((botao: HTMLButtonElement) => { botao.click(); botao.click(); });
  await expect(page.getByRole("heading", { name: "Plano atualizado para Pro." })).toBeVisible();
  expect(envios).toBe(1);
  await page.getByRole("link", { name: "Voltar ao sistema" }).click();
  await expect(page.locator(".subscription-history li")).toHaveCount(1);
});

for (const [indice, largura, altura, nome] of [[4, 390, 844, "celular"], [5, 768, 1024, "tablet"], [6, 1440, 900, "desktop"]] as const) {
  test(`planos, checkout e assinatura utilizáveis em ${nome}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: largura, height: altura });
    await login(page, indice); await atual(page, "Free"); await semOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("planos.png"), fullPage: true });
    await page.getByRole("article", { name: "Plano Pro", exact: true }).getByRole("link", { name: "Fazer upgrade" }).click();
    await expect(page.getByRole("radio", { name: "Pix", exact: true })).toBeVisible(); await semOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("checkout.png"), fullPage: true });
    await page.getByRole("radio", { name: "Cartão", exact: true }).focus();
    await expect(page.getByRole("radio", { name: "Cartão", exact: true })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Cartão", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Confirmar pagamento simulado" }).click();
    await expect(page.getByRole("heading", { name: "Plano atualizado para Pro." })).toBeVisible(); await semOverflow(page);
    await page.getByRole("link", { name: "Voltar ao sistema" }).click();
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible(); await semOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("assinatura.png"), fullPage: true });
  });
}
