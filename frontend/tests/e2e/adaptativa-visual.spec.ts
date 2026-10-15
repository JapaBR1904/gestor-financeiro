import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { apresentar, fixtures } from "./fixtures/apresentacao";
import type { ResumoFinanceiro } from "../../lib/financeiro";

type Cenario = { perfil: string; plano: string; vazio?: boolean; proibido?: boolean };
async function preparar(page: Page, estado: Cenario) {
  await apresentar(page);
  await page.route("**/api/saas", route => route.fulfill({ json: { ...(fixtures["/api/saas"] as object), perfilUso: estado.perfil, plano: estado.plano } }));
  await page.route("**/api/financeiro/resumo?*", route => {
    if (estado.proibido) return route.fulfill({ status: 403, json: { mensagem: "Você não tem permissão para consultar este recurso." } });
    const q = new URL(route.request().url()).searchParams;
    const base = fixtures["/api/financeiro/resumo"] as ResumoFinanceiro;
    const resumo = estado.perfil === "pessoal" ? { ...base, movimentacoes: base.movimentacoes.map((item, i) => ({ ...item, origem: "manual", descricao: ["Salário", "Supermercado", "Trabalho extra", "Transporte", "Moradia"][i], categoria: ["Renda", "Alimentação", "Renda extra", "Transporte", "Moradia"][i] })) } : base;
    return route.fulfill({ json: { ...resumo, inicio: q.get("inicio"), fim: q.get("fim"), ...(estado.vazio ? { receitas: 0, despesas: 0, saldo: 0, movimentacoes: [] } : {}) } });
  });
  await page.route("**/api/financeiro/analise?*", route => {
    const q = new URL(route.request().url()).searchParams;
    const resumo = { ...(fixtures["/api/financeiro/resumo"] as ResumoFinanceiro), inicio: q.get("inicio"), fim: q.get("fim") };
    return route.fulfill({ json: { atual: resumo, anterior: { ...resumo, inicio: "2026-09-16", fim: "2026-09-30", receitas: 4500, despesas: 1000, saldo: 3500 }, categorias: { Materiais: 350, Transporte: 80, Moradia: 800 }, evolucao: [{ data: resumo.inicio, receitas: 4800, despesas: 0, saldo: 4800 }, { data: resumo.fim, receitas: 1200, despesas: 1230, saldo: 4770 }] } });
  });
  await page.route("**/api/metas", route => route.fulfill({ json: [{ id: 1, titulo: "Reserva para projetos", unidade: "moeda", valorMeta: 10000, valorAtual: 6500, prazo: "2026-12-30", status: "ativa" }] }));
}
async function capturar(page: Page, info: TestInfo, nome: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  await page.waitForTimeout(400);
  const pasta = process.env.NEXO_SCREENSHOT_DIR ?? info.outputDir;
  await mkdir(pasta, { recursive: true });
  await page.screenshot({ path: path.join(pasta, `${nome}.png`), fullPage: await page.locator(".copilot-drawer[open]").count() === 0 });
}
async function semOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("adaptativa visual: capturas obrigatórias dos perfis, planos e estados", async ({ page }, info) => {
  test.setTimeout(120_000);
  const estado: Cenario = { perfil: "pessoal", plano: "pro" };
  await preparar(page, estado);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(page.locator(".income-card")).toContainText("6.000");
  await capturar(page, info, "dashboard-pessoal-essencial");
  await page.getByRole("button", { name: "Completo", exact: true }).click();
  await capturar(page, info, "dashboard-pessoal-completo");
  estado.perfil = "negocio";
  await page.goto("/dashboard");
  await expect(page.locator(".profile-guidance")).toContainText("tocar seu negócio");
  await capturar(page, info, "dashboard-negocio");
  estado.perfil = "empresa"; estado.plano = "business";
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Resumo da empresa", exact: true })).toBeVisible();
  await capturar(page, info, "dashboard-empresa");
  await page.goto("/onboarding");
  await expect(page.getByRole("button", { name: "Finanças pessoais", exact: true })).toBeVisible();
  await capturar(page, info, "onboarding-perfis");
  estado.plano = "pro";
  await page.goto("/ia");
  await expect(page.getByRole("heading", { name: "Seus números, com mais clareza" })).toBeVisible();
  await capturar(page, info, "ia-pro");
  estado.plano = "business";
  for (const [rota, nome] of [["/dashboard", "dashboard"], ["/fluxo-caixa", "fluxo"], ["/metas", "metas"]]) {
    await page.goto(rota);
    const fechar = page.getByRole("button", { name: "Fechar copiloto" });
    if (await fechar.count() === 0) await page.getByRole("button", { name: "Nexo Copiloto", exact: true }).click();
    await expect(page.locator(".copilot-panel")).toBeVisible();
    await capturar(page, info, `copiloto-business-${nome}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Nexo Copiloto", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Nexo Copiloto", exact: true })).toBeVisible();
  await capturar(page, info, "copiloto-mobile");
  await page.keyboard.press("Escape");
  await page.goto("/cadastro");
  await capturar(page, info, "cadastro-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await page.locator(".sidebar").evaluate(el => { for (const animacao of el.getAnimations({ subtree: true })) { if ((animacao as CSSAnimation).animationName === "sidebar-sweep") { animacao.pause(); animacao.currentTime = 6500; } } });
  await capturar(page, info, "sidebar-sweep");
  estado.vazio = true;
  await page.reload();
  await expect(page.getByText("Seu primeiro lançamento começa aqui")).toBeVisible();
  await capturar(page, info, "empty-state");
  estado.vazio = false; estado.proibido = true;
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText("Você não tem permissão");
  await capturar(page, info, "sem-permissao");
  estado.plano = "free";
  await page.goto("/ia");
  await capturar(page, info, "recurso-plano");
  estado.proibido = false; estado.plano = "pro";
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  await page.route("**/api/financeiro/resumo?*", async route => { await espera; await route.fulfill({ json: fixtures["/api/financeiro/resumo"] }); });
  await page.goto("/dashboard");
  await expect(page.getByText("Carregando movimentações…")).toBeVisible();
  await expect(page.locator(".finance-summary")).not.toContainText("R$ 0,00");
  await capturar(page, info, "loading");
  liberar();
});

test("adaptativa visual: sete larguras, teclado reduzido, texto grande e contraste", async ({ page }) => {
  test.setTimeout(180_000);
  const estado: Cenario = { perfil: "pessoal", plano: "business" };
  await preparar(page, estado);
  for (const largura of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({ width: largura, height: 900 });
    for (const perfil of ["pessoal", "negocio", "empresa"]) {
      estado.perfil = perfil;
      await page.goto("/dashboard");
      await expect(page.locator(".income-card")).toContainText("6.000");
      await semOverflow(page);
    }
    await page.getByRole("button", { name: "Nexo Copiloto", exact: true }).click();
    await expect(page.getByLabel("Sua pergunta", { exact: true })).toBeVisible();
    await semOverflow(page);
    await page.getByRole("button", { name: "Fechar copiloto" }).click();
  }
  for (const rota of ["/ia", "/dashboard", "/onboarding", "/cadastro"]) {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    expect(resultado.violations.map(v => ({ id: v.id, alvos: v.nodes.map(n => n.target) }))).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 480 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Nexo Copiloto", exact: true }).click();
  await page.getByLabel("Sua pergunta", { exact: true }).focus();
  await page.getByLabel("Sua pergunta", { exact: true }).fill("Pergunta com espaço reduzido para o teclado virtual");
  await expect(page.getByLabel("Sua pergunta", { exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({ content: "html { font-size: 125%; }" });
  await semOverflow(page);
});
