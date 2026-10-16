import { test, expect, type Page } from "@playwright/test";
import { apresentar, fixtures } from "./fixtures/apresentacao";

test.beforeEach(async ({ page }) => { await apresentar(page); });

async function primeiroAcesso(page: Page, perfil: "pessoal" | "negocio" | "empresa") {
  let concluido = false;
  await page.route("**/api/saas", route => route.fulfill({
    status: 200,
    json: { ...(fixtures["/api/saas"] as object), perfilUso: "negocio", objetivos: [], onboardingConcluido: concluido },
  }));
  await page.route("**/api/saas/onboarding", async route => {
    const corpo = route.request().postDataJSON() as { perfilUso: string; onboardingConcluido: boolean };
    expect(corpo.perfilUso).toBe(perfil);
    expect(corpo.onboardingConcluido).toBe(true);
    concluido = true;
    await route.fulfill({ status: 200, json: { ...(fixtures["/api/saas"] as object), perfilUso: perfil, objetivos: [], onboardingConcluido: true } });
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Como você quer usar este espaço?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: perfil === "pessoal" ? "Pessoal" : perfil === "negocio" ? "Negócio" : "Empresa", exact: true }).click();
}

test("organização UX: primeiro acesso pessoal vai ao primeiro lançamento", async ({ page }) => {
  await primeiroAcesso(page, "pessoal");
  await expect(page).toHaveURL(/\/pessoal\?novo=1$/);
  await expect(page.getByRole("heading", { name: "Novo lançamento", exact: true })).toBeVisible();
});

test("organização UX: primeiro acesso negócio começa pelo primeiro produto", async ({ page }) => {
  await primeiroAcesso(page, "negocio");
  await expect(page).toHaveURL(/\/produtos\/novo\?origem=onboarding$/);
  await expect(page.getByRole("heading", { name: "Novo produto", exact: true })).toBeVisible();
});

test("organização UX: primeiro acesso empresa abre o espaço", async ({ page }) => {
  await primeiroAcesso(page, "empresa");
  await expect(page).toHaveURL(/\/empresa$/);
});

test("organização UX: usuário existente não recebe escolha inicial", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como você quer usar este espaço?", exact: true })).toHaveCount(0);
});

test("organização UX: venda vazia conduz ao catálogo e produto retorna à venda", async ({ page }) => {
  const produto = { id: 99, nome: "Produto sintético", precoVenda: 25, descricao: "", ingredientes: [], custoEstimado: null, ativo: true };
  let criado = false;
  await page.route("**/api/produtos", async route => {
    if (route.request().method() === "POST") {
      criado = true;
      return route.fulfill({ status: 201, json: produto });
    }
    return route.fulfill({ status: 200, json: criado ? [produto] : [] });
  });
  await page.route("**/api/clientes", route => route.fulfill({ status: 200, json: [] }));
  await page.goto("/vendas/nova");
  const cadastrar = page.getByRole("link", { name: "Cadastrar primeiro produto", exact: true });
  await expect(cadastrar).toHaveAttribute("href", "/produtos/novo?origem=venda");
  await cadastrar.click();
  await page.getByLabel("Nome do produto *", { exact: true }).fill("Produto sintético");
  await page.getByLabel("Preço de venda *", { exact: true }).fill("25,00");
  await page.getByRole("button", { name: "Salvar produto", exact: true }).click();
  await expect(page).toHaveURL(/\/vendas\/nova$/);
  await expect(page.getByRole("heading", { name: "Produtos vendidos", exact: true })).toBeVisible();
  await expect(page.getByLabel("Produto", { exact: true }).first()).toContainText("Produto sintético");
});

test("organização UX: navegação negócio separa dia a dia, cadastros, análises e gestão", async ({ page }) => {
  await page.goto("/dashboard");
  const menu = page.locator(".sidebar .menu");
  await expect(menu.getByRole("link", { name: "Movimentações", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Nexo IA", exact: true })).toBeVisible();
  await expect(menu.getByText("Ferramentas", { exact: true })).toHaveCount(0);
  const cadastros = menu.getByRole("button", { name: "Cadastros", exact: true });
  await cadastros.click();
  await expect(menu.getByRole("link", { name: "Produtos", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Clientes", exact: true })).toBeVisible();
  const analises = menu.getByRole("button", { name: "Análises", exact: true });
  await analises.click();
  await expect(menu.getByRole("link", { name: "Por período", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Histórico comercial", exact: true })).toBeVisible();
});

test("organização UX: navegação pessoal prioriza dinheiro e planejamento", async ({ page }) => {
  await page.route("**/api/saas", route => route.fulfill({ json: { ...(fixtures["/api/saas"] as object), perfilUso: "pessoal" } }));
  await page.goto("/dashboard");
  const menu = page.locator(".sidebar .menu");
  await expect(menu.getByRole("link", { name: "Resumo", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Movimentações", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Vendas", exact: true })).toHaveCount(0);
  const planejamento = menu.getByRole("button", { name: "Planejamento", exact: true });
  await planejamento.click();
  await expect(menu.getByRole("link", { name: "Metas", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Análise do período", exact: true })).toBeVisible();
});

test("organização UX: seletor explica escopo do resumo e privacidade segue separada", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Detalhes do resumo", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Detalhes do resumo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ocultar valores", exact: true })).toBeVisible();
});

for (const width of [430, 390, 360]) {
  test(`organização UX: mobile ${width}px prioriza período e números sem overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/dashboard");
    await expect(page.locator(".profile-guidance")).not.toBeVisible();
    await expect(page.locator(".period-details")).toBeVisible();
    await expect(page.locator(".finance-summary")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const topoResumo = await page.locator(".finance-summary").evaluate(el => el.getBoundingClientRect().top);
    expect(topoResumo).toBeLessThan(844);
  });
}
