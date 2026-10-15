import { test, expect } from "@playwright/test";
import { apresentar, fixtures } from "./fixtures/apresentacao";
test.beforeEach(async ({ page }) => { await apresentar(page); });

test("copiloto: Free vê preview e não consulta IA paga", async ({ page }) => {
  let chamadas = 0;
  await page.route("**/api/saas", route => route.fulfill({ json: { ...(fixtures["/api/saas"] as object), plano: "free" } }));
  await page.route("**/api/ia/**", route => { chamadas++; return route.abort(); });
  await page.goto("/ia");
  await expect(page.getByRole("heading", { name: "A IA do Nexo pode analisar seus números" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Conhecer Pro", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nexo Copiloto", exact: true })).toHaveCount(0);
  expect(chamadas).toBe(0);
});

test("copiloto: Pro mantém IA com contexto, período e consentimento explícito", async ({ page }) => {
  await page.route("**/api/saas", route => route.fulfill({ json: { ...(fixtures["/api/saas"] as object), perfilUso: "pessoal", plano: "pro" } }));
  const pedidos: { incluirResumo: boolean; contexto: { pagina: string; assunto: string; inicio: string; fim: string } }[] = [];
  await page.route("**/api/ia/perguntar", route => {
    const pedido = route.request().postDataJSON(); pedidos.push(pedido);
    return route.fulfill({ json: { resposta: "Resposta sintética para testar o contrato, sem valores fictícios do usuário.", modelo: "nexo-ia", contexto: { periodo: `${pedido.contexto.inicio} a ${pedido.contexto.fim}` } } });
  });
  await page.goto("/ia");
  await page.getByRole("button", { name: "Entender despesas", exact: true }).click();
  await page.getByLabel("Início da análise da IA").fill("2026-09-01");
  await page.getByLabel("Fim da análise da IA").fill("2026-09-30");
  await page.getByRole("button", { name: "Perguntar ao assistente", exact: true }).click();
  await expect(page.locator(".ia-message.answer")).toBeVisible();
  expect(pedidos[0]).toMatchObject({ incluirResumo: false, contexto: { pagina: "/ia", assunto: "despesas", inicio: "2026-09-01", fim: "2026-09-30" } });
  await page.getByLabel("Sua pergunta", { exact: true }).fill("Analise minhas despesas");
  await page.getByRole("checkbox", { name: /Autorizar dados deste contexto/ }).check();
  await page.getByRole("button", { name: "Perguntar ao assistente", exact: true }).click();
  await expect(page.locator(".ia-message.answer")).toHaveCount(2);
  expect(pedidos[1].incluirResumo).toBe(true);
  await page.getByRole("button", { name: "Ocultar valores", exact: true }).click();
  await expect(page.locator(".ia-message.answer").first()).toContainText("Resposta protegida");
  await expect(page.locator(".ia-message.answer").first()).not.toContainText("Resposta sintética");
});

test("copiloto: Business abre por ação, reserva espaço e fecha com Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(page.locator(".copilot-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Nexo Copiloto", exact: true }).click();
  await expect(page.locator(".copilot-panel")).toBeVisible();
  await expect(page.locator(".copilot-context")).toContainText("Visão geral");
  const main = await page.locator(".app-shell").boundingBox();
  const painel = await page.locator(".copilot-panel").boundingBox();
  expect(main!.x + main!.width).toBeLessThanOrEqual(painel!.x + 1);
  await page.getByLabel("Sua pergunta", { exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".copilot-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nexo Copiloto", exact: true })).toBeFocused();
});

test("copiloto: mobile usa diálogo e respeita foco e Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Nexo Copiloto", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nexo Copiloto", exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nexo Copiloto", exact: true })).toBeFocused();
});

test("copiloto: falha do serviço é distinta de restrição do plano", async ({ page }) => {
  await page.route("**/api/ia/status", route => route.fulfill({ json: { configurada: false } }));
  await page.goto("/ia");
  await expect(page.getByRole("heading", { name: "Assistente temporariamente indisponível." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Conhecer Pro", exact: true })).toHaveCount(0);
});
