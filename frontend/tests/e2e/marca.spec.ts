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
