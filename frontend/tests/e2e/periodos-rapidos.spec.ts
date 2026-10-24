import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apresentar, fixtures } from "./fixtures/apresentacao";

for (const caso of [
  { nome: "virada de ano em São Paulo", agora: "2026-01-01T01:30:00Z", hoje: "2025-12-31", inicio: "2025-12-01", anteriorInicio: "2025-11-01", anteriorFim: "2025-11-30" },
  { nome: "fevereiro bissexto", agora: "2028-03-01T03:30:00Z", hoje: "2028-03-01", inicio: "2028-03-01", anteriorInicio: "2028-02-01", anteriorFim: "2028-02-29" },
]) test(`resumo: atalhos de período respeitam ${caso.nome}`, async ({ page }, info) => {
  await page.clock.install({ time: new Date(caso.agora) });
  await apresentar(page);
  let ultima: { inicio: string | null; fim: string | null } | null = null;
  await page.route("**/api/financeiro/resumo?**", route => {
    expect(route.request().method()).toBe("GET");
    const params = new URL(route.request().url()).searchParams;
    ultima = { inicio: params.get("inicio"), fim: params.get("fim") };
    return route.fulfill({ json: { ...(fixtures["/api/financeiro/resumo"] as object), ...ultima } });
  });
  await page.goto("/dashboard");
  const atalhos = page.getByRole("group", { name: "Atalhos de período" });
  await expect(atalhos.getByRole("button", { name: "Este mês", exact: true })).toBeEnabled();
  expect(ultima).toEqual({ inicio: caso.inicio, fim: caso.hoje });
  await atalhos.getByRole("button", { name: "Mês anterior", exact: true }).click();
  await expect(atalhos.getByRole("button", { name: "Mês anterior", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(ultima).toEqual({ inicio: caso.anteriorInicio, fim: caso.anteriorFim });
  await atalhos.getByRole("button", { name: "Hoje", exact: true }).click();
  await expect(atalhos.getByRole("button", { name: "Hoje", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(ultima).toEqual({ inicio: caso.hoje, fim: caso.hoje });
  await expect(atalhos.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Ocultar valores", exact: true }).click();
  await expect(page.getByRole("region", { name: "Resumo financeiro" })).toContainText("R$ ••••••");
  await expect(page.getByRole("region", { name: "Resumo financeiro" })).not.toContainText("4.770");
  for (const width of [1440, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (caso.nome === "fevereiro bissexto") await page.screenshot({ path: info.outputPath("resumo-360.png"), fullPage: true, animations: "disabled" });
});
