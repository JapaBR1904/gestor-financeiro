import { test, expect } from "@playwright/test";
import { observar, registrarObservacoes } from "./observacoes";

test.beforeEach(({ page }) => observar(page));
test.afterEach(async ({ page }, info) => registrarObservacoes(page, info));

test("marca: reveal curto, uma vez por sessão e interação imediata", async ({ page }, info) => {
  let chamadas = 0;
  await page.route("**/api/**", route => { chamadas++; return route.abort(); });
  await page.goto("/");
  const intro = page.locator("[data-brand-intro]");
  await expect(intro).toBeVisible();
  expect(await intro.evaluate(e => getComputedStyle(e).pointerEvents)).toBe("none");
  await page.waitForTimeout(600);
  await page.screenshot({ path: info.outputPath("brand-intro.png") });
  await expect(intro).toHaveCount(0, { timeout: 2000 });
  expect(chamadas).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem("nexo:brand-intro-seen"))).toBe("1");
  await page.reload();
  await expect(page.locator(".landing")).toBeVisible();
  await expect(intro).toHaveCount(0);
  await page.getByRole("link", { name: "Começar agora", exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
});

test("marca: gesto de teclado dispensa sem capturar foco", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-brand-intro]")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-brand-intro]")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
});

test("marca: reduced-motion e armazenamento indisponível mantêm entrada direta", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-brand-intro]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("indisponível", "SecurityError"); } }));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-brand-intro]")).toHaveCount(0);
});

test("marca: sidebar, grupos acessíveis e estados ativos em sete larguras", async ({ page }, info) => {
  test.setTimeout(120_000);
  const { apresentar } = await import("./fixtures/apresentacao");
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await apresentar(page);
  for (const width of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
    const mobile = width < 1024;
    if (mobile) await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    const menu = mobile ? page.getByRole("dialog", { name: "Navegação do Nexo" }) : page.locator(".sidebar");
    const operacao = menu.getByRole("button", { name: "Operação", exact: true });
    await expect(operacao).toHaveAttribute("aria-expanded", "false");
    const id = await operacao.getAttribute("aria-controls");
    expect(await page.locator(`[id="${id}"]`).count()).toBe(1);
    await operacao.click();
    await expect(menu.getByRole("link", { name: "Produtos", exact: true })).toBeVisible();
    await operacao.click();
    await expect(menu.getByRole("link", { name: "Produtos", exact: true })).toBeHidden();
    expect(await page.locator(`[id="${id}"]`).evaluate(e => e.hasAttribute("inert"))).toBe(true);
    await operacao.focus(); await page.keyboard.press("Tab");
    await expect(menu.getByRole("button", { name: "Gestão", exact: true })).toBeFocused();
    await expect(menu.getByRole("link", { name: "Visão geral", exact: true })).toHaveAttribute("aria-current", "page");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440 || width === 390) await page.screenshot({ path: info.outputPath(`sidebar-${width}.png`), fullPage: true });
    if (mobile) {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toBeFocused();
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".content").evaluate(e => getComputedStyle(e).animationName)).toBe("none");
});
