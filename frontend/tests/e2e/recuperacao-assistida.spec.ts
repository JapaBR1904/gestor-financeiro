import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("suporte: recuperação depende do administrador e continua no navegador sem código ou email", async ({ page, context }, info) => {
  let solicitada = false, liberada = false, consumida = false, admin = false, emails = 0;
  await context.route("**/api/**", async route => {
    const caminho = new URL(route.request().url()).pathname;
    const metodo = route.request().method();
    const ok = (json: unknown, status = 200) => route.fulfill({ status, json });
    if (caminho === "/api/auth/disponibilidade") return ok({ recuperacaoPorEmailDisponivel: false });
    if (caminho.endsWith("/disponibilidade")) return ok({ disponivel: true });
    if (caminho === "/api/auth/recuperacao/assistida") {
      if (metodo === "POST") { expect(route.request().postDataJSON()).toEqual({ email: "pessoa@example.com" }); solicitada = true; return ok({ protocolo: 41 }); }
      return ok({ protocolo: solicitada && !consumida ? 41 : null, estado: consumida ? "expirada" : liberada ? "liberada" : solicitada ? "aguardando" : "ausente" });
    }
    if (caminho === "/api/admin/local/login") { const body = route.request().postDataJSON(); admin = body.usuario === "admin" && body.senha === "admin"; return ok({ mensagem: "Resultado" }, admin ? 200 : 403); }
    if (caminho === "/api/admin/local/recuperacoes") return ok(admin ? liberada || consumida ? [] : [{ protocolo: 41, email: "pessoa@example.com", criadoEm: new Date().toISOString() }] : { mensagem: "Entre novamente." }, admin ? 200 : 403);
    if (caminho === "/api/admin/local/recuperacoes/41") {
      const body = route.request().postDataJSON();
      if (!admin || !body.identidadeConfirmada) return ok({ mensagem: "Confirme a identidade." }, 403);
      liberada = body.aprovar; return ok({ mensagem: "Decisão registrada." });
    }
    if (caminho === "/api/auth/recuperacao/redefinir") {
      if (!liberada || consumida) return ok({ mensagem: "Recuperação inválida ou expirada." }, 400);
      const body = route.request().postDataJSON(); expect(body.senha).toBe(body.confirmacaoSenha); consumida = true; return ok({ mensagem: "Senha atualizada." });
    }
    if (caminho === "/api/auth/recuperacao" || caminho === "/api/auth/codigo") emails++;
    return route.abort();
  });
  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail", { exact: true }).fill("pessoa@example.com");
  await page.getByRole("button", { name: "Solicitar recuperação assistida", exact: true }).click();
  await expect(page.getByRole("region", { name: "Acompanhamento da recuperação" })).toContainText("#41");
  await expect(page.getByLabel("Código de 6 dígitos", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Verificar liberação", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("aguarda a confirmação");
  await expect(page).toHaveURL(/\/esqueci-senha$/);
  await page.reload();
  await expect(page.getByRole("region", { name: "Acompanhamento da recuperação" })).toContainText("#41");
  const painel = await context.newPage(); await painel.goto("/admin");
  await painel.getByLabel("Usuário administrativo").fill("admin");
  await painel.getByLabel("Senha administrativa").fill("admin");
  await painel.getByRole("button", { name: "Entrar na administração", exact: true }).click();
  const pedido = painel.getByRole("article", { name: "Solicitação 41" });
  await expect(pedido.getByRole("button", { name: "Liberar troca", exact: true })).toBeDisabled();
  await painel.setViewportSize({ width: 390, height: 900 });
  expect((await new AxeBuilder({ page: painel }).analyze()).violations).toEqual([]);
  await painel.screenshot({ path: info.outputPath("admin-pendente-390.png"), fullPage: true });
  await page.screenshot({ path: info.outputPath("recuperacao-pendente.png"), fullPage: true });
  await pedido.getByRole("checkbox").check();
  await pedido.getByRole("button", { name: "Liberar troca", exact: true }).click();
  await expect(painel.getByRole("status").first()).toContainText("Troca liberada");
  await page.getByRole("button", { name: "Verificar liberação", exact: true }).click();
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  await page.getByLabel("Nova senha", { exact: true }).fill("Senha-Segura-Teste123!");
  await page.getByLabel("Confirme a senha", { exact: true }).fill("Senha-Segura-Teste123!");
  await page.getByRole("button", { name: "Atualizar senha", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Senha atualizada", exact: true })).toBeVisible();
  expect(emails).toBe(0);
  for (const alvo of [page, painel]) {
    await alvo.setViewportSize({ width: 390, height: 900 });
    expect(await alvo.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page: alvo }).analyze()).violations).toEqual([]);
  }
  await painel.screenshot({ path: info.outputPath("admin-local-390.png"), fullPage: true });
});

test("suporte: painel e recuperação não oferecem acesso temporário fora do ambiente permitido", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ json: { disponivel: false, recuperacaoPorEmailDisponivel: false } }));
  await page.goto("/admin");
  await expect(page.getByRole("status")).toContainText("não está habilitado");
  await expect(page.getByLabel("Senha administrativa")).toHaveCount(0);
  await page.goto("/esqueci-senha");
  await expect(page.getByRole("button", { name: "Enviar código de recuperação", exact: true })).toBeDisabled();
});
