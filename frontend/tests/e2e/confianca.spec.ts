import { test, expect } from "@playwright/test";
import { apresentar } from "./fixtures/apresentacao";

test.beforeEach(async ({ page }) => { await apresentar(page); });

test("confiança: logout offline, 503, clique repetido e retry confirmado", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  let chamadas = 0;
  let liberar: (() => void) | undefined;
  await page.route("**/api/auth/logout", async route => {
    chamadas++;
    if (chamadas === 1) return route.abort("internetdisconnected");
    if (chamadas === 2) return route.fulfill({ status: 503, json: { mensagem: "indisponível" } });
    await new Promise<void>(resolve => { liberar = resolve; });
    await route.fulfill({ status: 200, json: { mensagem: "Sessão encerrada." } });
  });
  const sair = page.getByRole("button", { name: "Sair", exact: true });
  await sair.click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Você continua nesta sessão");
  await expect(page).not.toHaveURL(/\/login$/);
  await sair.click();
  await expect(page.locator("main").getByRole("alert")).toContainText("indisponível");
  await expect(page).not.toHaveURL(/\/login$/);
  await sair.click();
  await expect(page.getByRole("button", { name: "Saindo…" })).toBeDisabled();
  await page.getByRole("button", { name: "Saindo…" }).dispatchEvent("click");
  await expect.poll(() => chamadas).toBe(3);
  liberar!();
  await expect(page).toHaveURL(/\/login$/);
});

test("confiança: logout aceita sessão comprovadamente expirada", async ({ page }) => {
  await page.route("**/api/auth/logout", route => route.fulfill({ status: 401, json: { mensagem: "Sessão expirada." } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("confiança: relatório recupera de 503 sem alerta antigo", async ({ page }) => {
  let chamadas = 0;
  await page.route("**/api/relatorios/resumo", route => {
    chamadas++;
    return route.fulfill(chamadas === 1 ? { status: 503, json: {} } : { status: 200, json: { quantidadeVendas: 2, faturamento: 123.45, custoVendas: 20, lucroBruto: 103.45, quantidadeDespesas: 1, totalDespesas: 10, saldoFinanceiro: 113.45, produtosMaisVendidos: [], formasPagamento: [], despesasPorCategoria: [], melhoresClientes: [] } });
  });
  await page.goto("/relatorios");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("R$ 123,45", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  expect(chamadas).toBe(2);
});

test("confiança: análise lenta, resposta fora de ordem, 503 e CSV sem ambiguidade", async ({ page }) => {
  const retidas: Array<{ responder: () => Promise<void> }> = [];
  let chamadas = 0;
  await page.route("**/api/financeiro/analise?*", async route => {
    const p = new URL(route.request().url()).searchParams;
    const inicio = p.get("inicio"), fim = p.get("fim");
    chamadas++;
    const atual = { inicio, fim, receitas: chamadas * 100, despesas: 0, saldo: chamadas * 100, movimentacoes: [] };
    const json = { atual, anterior: { ...atual, receitas: 0, saldo: 0 }, evolucao: [], categorias: {} };
    if (chamadas === 4) return route.fulfill({ status: 503, json: {} });
    if (chamadas === 2 || chamadas === 3) {
      let liberar!: () => void;
      const aguardo = new Promise<void>(resolve => { liberar = resolve; });
      retidas.push({ responder: async () => { liberar(); } });
      await aguardo;
    }
    await route.fulfill({ status: 200, json });
  });
  let exportacao = "";
  await page.route("**/api/financeiro/exportar?*", async route => {
    exportacao = new URL(route.request().url()).search;
    await route.fulfill({ status: 200, contentType: "text/csv", body: "Data;Valor\n" });
  });
  await page.goto("/fluxo-caixa");
  await expect(page.locator(".finance-summary")).toContainText("R$ 100,00");
  const csv = page.getByRole("button", { name: "Exportar CSV" });
  await page.getByLabel("De", { exact: true }).fill("2026-01-01");
  await page.getByLabel("Até", { exact: true }).fill("2026-01-15");
  await expect(csv).toBeDisabled();
  await page.getByRole("button", { name: "Comparar período" }).click();
  await expect(page.getByRole("status")).toContainText("Atualizando");
  await expect(page.locator(".finance-summary")).toHaveCount(0);
  await expect.poll(() => retidas.length).toBe(1);
  await page.getByLabel("De", { exact: true }).fill("2026-02-01");
  await page.getByLabel("Até", { exact: true }).fill("2026-02-15");
  await page.getByRole("button", { name: "Comparar período" }).click();
  await expect.poll(() => retidas.length).toBe(2);
  await retidas[1].responder();
  await expect(page.locator(".finance-summary")).toContainText("R$ 300,00");
  await retidas[0].responder();
  await expect(page.locator(".finance-summary")).not.toContainText("R$ 200,00");
  await expect(csv).toBeEnabled();
  await csv.click();
  await expect.poll(() => exportacao).toBe("?inicio=2026-02-01&fim=2026-02-15");
  await page.getByRole("button", { name: "Comparar período" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(csv).toBeDisabled();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".finance-summary")).toContainText("R$ 500,00");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("confiança: onboarding bloqueia sobrescrita até preferências carregarem", async ({ page }) => {
  let chamadas = 0, gravacoes = 0;
  await page.route("**/api/saas", route => {
    chamadas++;
    return route.fulfill(chamadas === 2 ? { status: 503, json: {} } : { status: 200, json: { perfilUso: "pessoal", objetivos: ["Controlar gastos"], onboardingConcluido: true, plano: "business", statusAssinatura: "ativa" } });
  });
  await page.route("**/api/saas/onboarding", async route => { gravacoes++; await route.fulfill({ status: 200, json: {} }); });
  await page.goto("/onboarding");
  await expect(page.locator("main").getByRole("alert")).toContainText("Suas preferências não foram alteradas");
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeDisabled();
  expect(gravacoes).toBe(0);
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("button", { name: /Quero cuidar das minhas/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Controlar gastos", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  expect(gravacoes).toBe(0);
});

test("navegação: sete larguras, drawer com grupos recolhidos, foco e redução de movimento", async ({ page }) => {
  for (const width of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const menu = width < 1024 ? page.getByRole("dialog", { name: "Navegação do Nexo" }) : page.locator(".sidebar");
    const abrir = page.getByRole("button", { name: "Abrir menu" });
    if (width < 1024) await abrir.click();
    const operacao = menu.getByRole("button", { name: "Operação", exact: true });
    await expect(operacao).toHaveAttribute("aria-expanded", "false");
    await expect(menu.getByRole("link", { name: "Vendas", exact: true })).not.toBeVisible();
    await operacao.click();
    await expect(menu.getByRole("link", { name: "Vendas", exact: true })).toBeVisible();
    await operacao.click();
    if (width < 1024) {
      for (let i=0;i<18;i++) { await page.keyboard.press("Tab"); expect(await menu.evaluate(e => e.contains(document.activeElement))).toBe(true); }
      await page.keyboard.press("Escape");
      await expect(menu).not.toBeVisible();
      await expect(abrir).toBeFocused();
      await expect(page.locator("body")).not.toHaveCSS("overflow","hidden");
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".content")).toHaveCSS("animation-name", "none");
});
