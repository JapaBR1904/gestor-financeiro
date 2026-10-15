import { test, expect } from "@playwright/test";
import { apresentar, fixtures } from "./fixtures/apresentacao";

test.beforeEach(async ({ page }) => { await apresentar(page); });

for (const [perfil, titulo] of [["pessoal", "Seu dinheiro"], ["negocio", "Visão geral"], ["empresa", "Resumo da empresa"]]) {
  test(`adaptativa: ${perfil}, detalhe real e privacidade persistente`, async ({ page }) => {
    await page.route("**/api/saas", route => route.fulfill({ json: { ...(fixtures["/api/saas"] as object), perfilUso: perfil } }));
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: titulo, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Essencial", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Para onde vai o dinheiro" })).toHaveCount(0);
    await page.getByRole("button", { name: "Completo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Para onde vai o dinheiro" })).toBeVisible();
    await page.getByRole("button", { name: "Ocultar valores", exact: true }).click();
    await expect(page.locator(".finance-summary")).toContainText("R$ ••••••");
    await expect(page.locator(".finance-summary")).not.toContainText("6.000");
    await page.reload();
    await expect(page.getByRole("button", { name: "Completo", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Revelar valores", exact: true })).toBeVisible();
    if (perfil === "pessoal") {
      await expect(page.locator(".sidebar .menu").getByRole("link", { name: "Movimentações", exact: true })).toBeVisible();
      await expect(page.locator(".sidebar .menu").getByRole("link", { name: "Vendas", exact: true })).toHaveCount(0);
    }
  });
}

test("adaptativa: perfil pessoal abre primeiro registro e senha vazia é discreta", async ({ page }) => {
  await page.goto("/pessoal?novo=1");
  await expect(page.getByRole("heading", { name: "Novo lançamento", exact: true })).toBeVisible();
  await page.goto("/cadastro");
  await expect(page.getByRole("list", { name: "Requisitos da senha" })).not.toBeVisible();
  await page.getByLabel("Nova senha", { exact: true }).fill("Primeiro");
  await expect(page.getByRole("list", { name: "Requisitos da senha" })).toBeVisible();
});

test("adaptativa: linha de navegação respeita reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard");
  await expect(page.locator(".sidebar")).toBeVisible();
  expect(await page.locator(".sidebar").evaluate(el => getComputedStyle(el, "::after").animationDuration)).toBe("9s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".sidebar").evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
});
