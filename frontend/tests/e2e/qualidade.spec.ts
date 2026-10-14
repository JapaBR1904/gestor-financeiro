import { test, expect } from "@playwright/test";
import { apresentar, fixtures } from "./fixtures/apresentacao";
import { observar, registrarObservacoes } from "./observacoes";
import type { ResumoFinanceiro } from "../../lib/financeiro";

test.beforeEach(async ({ page }) => { observar(page); await apresentar(page); });
test.afterEach(async ({ page }, info) => registrarObservacoes(page, info));

test("qualidade: nomes e valores máximos em sete larguras, detalhes, contraste e zoom equivalente 200%", async ({ page }, info) => {
  const resumo = fixtures["/api/financeiro/resumo"] as ResumoFinanceiro;
  await page.route("**/api/auth/me", route => route.fulfill({ status: 200, json: { id: 900001, nome: "Pessoa de apresentação com um nome muito extenso para verificar quebra de texto", email: "apresentacao@example.com", organizacaoId: 900001, organizacaoNome: "Organização de apresentação financeira com nome extenso para testar responsividade e identificação do espaço atual", papel: "proprietario" } }));
  await page.route("**/api/financeiro/resumo?*", route => route.fulfill({ status: 200, json: { ...resumo, receitas: 999999999999.99, despesas: resumo.despesas, saldo: 999999999999.99 - resumo.despesas, movimentacoes: resumo.movimentacoes.filter((m,i) => i === 0 || m.tipo === "despesa").map((m, i) => ({ ...m, descricao: i === 0 ? "Consultoria especializada com descrição extensa para testar a leitura de valores e nomes sem esconder a origem financeira dos registros" : m.descricao, valor: i === 0 ? 999999999999.99 : m.valor })) } }));
  for (const width of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    await expect(page.locator(".income-card > strong")).toContainText("999.999.999.999,99");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const valores = await page.locator(".finance-summary strong").evaluateAll(es => es.map(e => e.scrollWidth <= e.clientWidth));
    expect(valores.every(Boolean)).toBe(true);
    await page.screenshot({ path: info.outputPath(`valores-altos-${width}.png`), fullPage: true });
  }
  // Um desktop de 1440 px a 200% dispõe de 720 CSS px; a densidade de pixels não altera o reflow.
  await page.setViewportSize({ width: 720, height: 450 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Navegação do Nexo" });
  await page.keyboard.press("Shift+Tab");
  expect(await drawer.evaluate(e => e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toBeFocused();
  await page.goto("/planos");
  await page.locator(".plan-comparison > summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".plan-comparison table")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  expect(resultado.violations.map(v => ({ id: v.id, alvos: v.nodes.map(n => n.target) }))).toEqual([]);
});
