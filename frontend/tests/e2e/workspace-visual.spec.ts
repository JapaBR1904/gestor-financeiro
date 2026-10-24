import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apresentar } from "./fixtures/apresentacao";

test("workspace visual: painel e tabelas legíveis no desktop e mobile", async ({ page }, info) => {
  test.setTimeout(120_000);
  await apresentar(page);
  for (const width of [1440, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const rota of ["/dashboard", "/produtos", "/vendas"]) {
      await page.goto(rota);
      await expect(page.locator(".content h1").first()).toBeVisible();
      await expect(page.getByText("Carregando movimentações…", { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      const acao = page.locator(".content .primary-button").first();
      if (await acao.count()) { await acao.focus(); await expect(acao).toBeFocused(); await acao.hover(); }
      if (width !== 360) await page.screenshot({ path: info.outputPath(`${rota.slice(1)}-${width}.png`), animations: "disabled" });
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await expect(page.locator(".balance-card")).toBeVisible();
  expect(await page.locator(".app-shell").evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await page.getByRole("button", { name: "Ocultar valores", exact: true }).click();
  await expect(page.locator(".balance-card")).toContainText("••");
});
