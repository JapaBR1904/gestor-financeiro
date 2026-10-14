import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { observar, registrarObservacoes } from "./observacoes";
test.beforeEach(({ page }) => observar(page));
test.afterEach(async ({ page }, info) => registrarObservacoes(page, info));

test("entrada pública: sete larguras, axe, teclado, movimento reduzido e sem reload", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  let api = 0,
    documentos = 0;
  await page.route("**/api/**", (route) => {
    api++;
    return route.abort();
  });
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) documentos++;
  });
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Suas finanças",
    );
    await expect(page.locator(".sidebar")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const limites = await page.locator(".landing-hero h1, .landing-demo, .landing-feature, .landing-plan, .landing-final").evaluateAll(elementos => elementos.map(elemento => {
      const caixa = elemento.getBoundingClientRect();
      return caixa.left >= -1 && caixa.right <= innerWidth + 1 && elemento.scrollWidth <= elemento.clientWidth + 1;
    }));
    expect(limites.every(Boolean), `Conteúdo essencial íntegro em ${width}px`).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width === 1440 || width === 390) {
      await page.screenshot({
        path: info.outputPath(`landing-${width}.png`),
        fullPage: true,
      });
      await page
        .locator(".landing-hero")
        .screenshot({ path: info.outputPath(`hero-${width}.png`) });
    }
    if (width === 1440) {
      await page
        .locator("#recursos")
        .screenshot({ path: info.outputPath("recursos.png") });
      await page
        .locator("#planos")
        .screenshot({ path: info.outputPath("planos.png") });
    }
  }
  const antes = documentos;
  await page.waitForTimeout(4000);
  expect(documentos).toBe(antes);
  expect(api).toBe(0);
  const menu = page.getByLabel("Menu de navegação", { exact: true });
  await menu.focus();
  await page.keyboard.press("Enter");
  const nav = page.getByRole("navigation", { name: "Navegação mobile" });
  await expect(nav).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(nav).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".demo-insight")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await menu.click();
  await nav.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({
    path: info.outputPath("login-360.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: info.outputPath("login-desktop.png"),
    fullPage: true,
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Começar agora", exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(
    page.getByText("Vamos confirmar seu e-mail", { exact: false }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("cadastro-desktop.png"),
    fullPage: true,
  });
});

test("cadastro direto OFF: sessão real, refresh, módulos, logout público e login existente", async ({
  page,
}, info) => {
  test.skip(
    process.env.NEXO_E2E_VERIFICATION !== "false",
    "Validado na passagem com verificação OFF.",
  );
  const api = process.env.NEXO_E2E_API_URL!;
  const email = `entrada-${crypto.randomUUID()}@example.com`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("link", { name: "Começar agora", exact: true }).click();
  await page
    .getByLabel("Seu nome", { exact: true })
    .fill("Pessoa de demonstração");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("Cadastro-Forte123!@#");
  await page
    .getByLabel("Confirme a senha", { exact: true })
    .fill("Cadastro-Forte123!@#");
  let postagens = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/auth/cadastro") && r.method() === "POST")
      postagens++;
  });
  await page
    .getByRole("button", { name: "Criar conta", exact: true })
    .dblclick();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(postagens).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  expect(
    (await page.context().cookies()).find((c) => c.name === "nexo_session")
      ?.httpOnly,
  ).toBe(true);
  expect((await page.request.get(`${api}/api/auth/me`)).status()).toBe(200);
  await page.screenshot({
    path: info.outputPath("dashboard-cadastro.png"),
    fullPage: true,
  });
  await page.locator(".first-steps > summary").click();
  await expect(
    page.getByRole("link", { name: "Escolher como usar o Nexo", exact: true }),
  ).toHaveAttribute("href", "/onboarding");
  let documentos = 0;
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) documentos++;
  });
  await page.waitForTimeout(4000);
  expect(documentos).toBe(0);
  for (const rota of [
    "/planos",
    "/conta",
    "/pessoal",
    "/relatorios",
    "/empresa",
  ]) {
    await page.goto(rota);
    await expect(page).toHaveURL(new RegExp(rota + "$"));
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get(`${api}/api/auth/me`)).status()).toBe(401);
  await page
    .locator(".landing-header-actions")
    .getByRole("link", { name: "Entrar", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Cadastro-Forte123!@#");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.locator(".sidebar .menu-item[aria-current=page]"),
  ).toHaveText("Visão geral");
});

test("recuperação: transporte desabilitado informa indisponibilidade sem solicitar código", async ({
  page,
}) => {
  let postagens = 0;
  await page.route("**/api/**", (route) => {
    if (route.request().url().endsWith("/api/auth/disponibilidade"))
      return route.fulfill({
        status: 200,
        json: { recuperacaoPorEmailDisponivel: false },
      });
    if (route.request().method() === "POST") postagens++;
    return route.abort();
  });
  await page.goto("/esqueci-senha");
  await expect(page.getByRole("status")).toContainText(
    "A recuperação por e-mail está indisponível",
  );
  await page.getByLabel("E-mail", { exact: true }).fill("pessoa@example.com");
  await expect(
    page.getByRole("button", {
      name: "Enviar código de recuperação",
      exact: true,
    }),
  ).toBeDisabled();
  await page.locator("form").dispatchEvent("submit");
  expect(postagens).toBe(0);
  await expect(page).toHaveURL(/\/esqueci-senha$/);
});
